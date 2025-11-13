import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Initialize Supabase with service role key
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
let supabase: any = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('[get-success-debug] Supabase client initialized with service role key:', supabaseServiceKey.substring(0, 20) + '...' + supabaseServiceKey.slice(-4));
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(status: number, body: any) {
  return {
    statusCode: status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

export const handler = async (event: any) => {
  try {
    console.log('[get-success-debug] Function invoked');
    
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return json(200, {});
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      return json(200, { 
        success: false, 
        error: 'Method not allowed'
      });
    }

    // Get session_id from query parameters
    const sessionId = event.queryStringParameters?.session_id;
    if (!sessionId) {
      return json(200, { 
        success: false, 
        error: 'Missing session_id parameter'
      });
    }

    console.log('[get-success-debug] Debug session_id:', sessionId);

    // Initialize debug response
    const debugData: any = {
      session_id: sessionId,
      stripe_session: null,
      metadata: null,
      raw_assessment: null,
      raw_profile: null,
      supabase_available: !!supabase,
      stripe_available: !!stripe
    };

    // Fetch Stripe session
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['customer']
        });
        
        debugData.stripe_session = {
          id: session.id,
          status: session.status,
          customer_details: session.customer_details,
          metadata: session.metadata,
          payment_status: session.payment_status
        };
        debugData.metadata = session.metadata || {};
        
        console.log('[get-success-debug] Stripe session metadata:', session.metadata);
      } catch (stripeError) {
        console.error('[get-success-debug] Stripe error:', stripeError);
        debugData.stripe_error = stripeError.message;
      }
    }

    // Fetch raw assessment data if we have assessment_id
    if (supabase && debugData.metadata?.assessment_id) {
      try {
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('id, full_name_entered, email_entered, answers, profile_id, created_at')
          .eq('id', debugData.metadata.assessment_id)
          .single();

        if (assessmentError) {
          console.error('[get-success-debug] Assessment query error:', assessmentError);
          debugData.assessment_error = assessmentError.message;
        } else {
          debugData.raw_assessment = assessmentData;
          console.log('[get-success-debug] Raw assessment data:', assessmentData);
        }
      } catch (error) {
        console.error('[get-success-debug] Assessment fetch error:', error);
        debugData.assessment_fetch_error = error.message;
      }
    }

    // Fetch raw profile data if we have profile_id
    if (supabase && debugData.metadata?.profile_id) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, company_name, email, created_at')
          .eq('id', debugData.metadata.profile_id)
          .single();

        if (profileError) {
          console.error('[get-success-debug] Profile query error:', profileError);
          debugData.profile_error = profileError.message;
        } else {
          debugData.raw_profile = profileData;
          console.log('[get-success-debug] Raw profile data:', profileData);
        }
      } catch (error) {
        console.error('[get-success-debug] Profile fetch error:', error);
        debugData.profile_fetch_error = error.message;
      }
    }

    // Log the complete debug data on server
    console.log('[get-success-debug] ===== COMPLETE DEBUG DATA =====');
    console.log(JSON.stringify(debugData, null, 2));
    console.log('[get-success-debug] ===============================');

    return json(200, {
      success: true,
      debug_data: debugData
    });

  } catch (error) {
    console.error('[get-success-debug] Unhandled error:', error);
    return json(200, {
      success: false,
      error: error?.message || 'Internal server error',
      debug_data: null
    });
  }
};