import Stripe from 'stripe';
import { serverEnv } from './_utils/env.js';
import { supabaseServer } from './_utils/supabase.js';

const json = (status: number, body: unknown) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: any) => {
  try {
    // Validate environment variables
    try {
      const envCheck = serverEnv;
    } catch (envError) {
      console.error('[get-success-summary] Environment validation failed:', envError);
      return json(400, { 
        success: false, 
        error: 'CONFIG_ERROR'
      });
    }

    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return json(200, {});
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      return json(405, { 
        success: false, 
        error: 'Method not allowed'
      });
    }

    // Get session_id from query parameters
    const sessionId = event.queryStringParameters?.session_id;
    if (!sessionId) {
      return json(400, { 
        success: false, 
        error: 'NO_SESSION_ID'
      });
    }

    console.log('[get-success-summary] Processing session:', sessionId);

    // Initialize Stripe client
    const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20'
    });

    // Retrieve Stripe checkout session
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer']
      });
      console.log('[get-success-summary] Retrieved Stripe session');
    } catch (stripeError) {
      console.error('[get-success-summary] Stripe error:', stripeError);
      return json(400, {
        success: false,
        error: 'DB_OR_STRIPE_UNAVAILABLE'
      });
    }

    // Extract customer email from session
    const customerEmail = session.customer_details?.email || session.customer?.email || null;
    
    if (!customerEmail) {
      console.error('[get-success-summary] No customer email found in session');
      return json(400, {
        success: false,
        error: 'DB_OR_STRIPE_UNAVAILABLE'
      });
    }

    console.log('[get-success-summary] Customer email:', customerEmail);

    let email = customerEmail;
    let business = null;
    let name = null;

    // Query profiles by email first
    try {
      const { data: profileData, error: profileError } = await supabaseServer
        .from('profiles')
        .select('email, company_name, full_name, last_assessment_id')
        .eq('email', customerEmail)
        .single();

      if (!profileError && profileData) {
        business = profileData.company_name;
        name = profileData.full_name;
        console.log('[get-success-summary] Found profile data:', {
          company_name: business,
          full_name: name
        });
      } else {
        console.log('[get-success-summary] No profile found, falling back to assessments');
        
        // Fallback to latest assessment by email
        const { data: assessmentData, error: assessmentError } = await supabaseServer
          .from('assessments')
          .select('full_name_entered, city, state, answers')
          .eq('email_entered', customerEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!assessmentError && assessmentData) {
          name = assessmentData.full_name_entered;
          // Extract business from answers JSON
          if (assessmentData.answers?.businessName) {
            business = assessmentData.answers.businessName;
          }
          console.log('[get-success-summary] Found assessment data:', {
            full_name_entered: name,
            business_from_answers: business
          });
        }
      }
    } catch (supabaseError) {
      console.error('[get-success-summary] Supabase error:', supabaseError);
      return json(400, {
        success: false,
        error: 'DB_OR_STRIPE_UNAVAILABLE'
      });
    }

    // Compose final response
    const response = {
      success: true,
      email,
      business: business || null,
      name: name || null,
      plan: 'founding-member',
      rating: 'A+ Founding Elite - Restoration Pioneer'
    };

    console.log('[get-success-summary] Final response:', response);
    return json(200, response);

  } catch (error) {
    console.error('[get-success-summary] Unhandled error:', error);
    return json(400, {
      success: false,
      error: 'DB_OR_STRIPE_UNAVAILABLE'
    });
  }
};