const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
let supabase: any = null;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[get-success-summary] Missing Supabase environment variables');
  } else {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[get-success-summary] Supabase client initialized');
  }
} catch (error) {
  console.error('[get-success-summary] Failed to initialize Supabase:', error);
}

// JSON response helper
function json(statusCode: number, data: any) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

export const handler = async (event: any) => {
  console.log('[get-success-summary] Function invoked');
  console.log('[get-success-summary] Event method:', event.httpMethod);
  console.log('[get-success-summary] Query params:', event.queryStringParameters);

  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('[get-success-summary] Handling OPTIONS request');
      return json(200, {});
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      console.log('[get-success-summary] Invalid method:', event.httpMethod);
      return json(405, { success: false, error: 'Method not allowed' });
    }

    // Validate session_id from query parameters
    const sessionId = event.queryStringParameters?.session_id;
    console.log('[get-success-summary] Session ID from params:', sessionId);

    if (!sessionId) {
      console.log('[get-success-summary] Missing session_id parameter');
      return json(400, { success: false, error: 'Missing session_id parameter' });
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      console.log('[get-success-summary] Invalid session_id format');
      return json(400, { success: false, error: 'Invalid session_id format' });
    }

    // Check if Stripe is properly initialized
    if (!stripe) {
      console.error('[get-success-summary] Stripe not initialized - missing STRIPE_SECRET_KEY');
      return json(500, { success: false, error: 'Stripe configuration error' });
    }

    console.log('[get-success-summary] Fetching Stripe session:', sessionId);

    // Retrieve the Stripe checkout session
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer']
      });
      console.log('[get-success-summary] Stripe session retrieved successfully');
      console.log('[get-success-summary] Session status:', session.status);
      console.log('[get-success-summary] Session metadata:', session.metadata);
    } catch (stripeError) {
      console.error('[get-success-summary] Stripe error:', stripeError);
      return json(404, { success: false, error: 'Checkout session not found' });
    }

    if (!session) {
      console.log('[get-success-summary] Session is null/undefined');
      return json(404, { success: false, error: 'Session not found' });
    }

    // Extract and validate metadata
    const metadata = session.metadata || {};
    const profileId = metadata.profile_id;
    const assessmentId = metadata.assessment_id;
    const emailEntered = metadata.email_entered;
    const plan = metadata.plan;

    console.log('[get-success-summary] Extracted metadata:', {
      profileId,
      assessmentId,
      emailEntered,
      plan
    });

    // Verify required metadata exists
    if (!assessmentId) {
      console.warn('[get-success-summary] Missing assessment_id in metadata');
    }
    if (!emailEntered) {
      console.warn('[get-success-summary] Missing email_entered in metadata');
    }

    // Extract email with priority: customer_details.email > customer.email > metadata.email_entered
    let email = null;
    if (session.customer_details?.email) {
      email = session.customer_details.email;
      console.log('[get-success-summary] Using email from customer_details');
    } else if (session.customer?.email) {
      email = session.customer.email;
      console.log('[get-success-summary] Using email from customer');
    } else if (emailEntered) {
      email = emailEntered;
      console.log('[get-success-summary] Using email from metadata');
    } else {
      console.warn('[get-success-summary] No email found in session');
    }

    let businessName = null;
    let fullName = null;

    // Check Supabase availability
    if (!supabase) {
      console.error('[get-success-summary] Supabase not available');
      return json(500, { success: false, error: 'Database configuration error' });
    }

    // Query Supabase for profile data if profile_id exists
    if (profileId) {
      console.log('[get-success-summary] Querying profiles table with ID:', profileId);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('company_name, full_name, email')
          .eq('id', profileId)
          .single();

        if (profileError) {
          console.error('[get-success-summary] Profile query error:', profileError);
        } else if (profileData) {
          businessName = profileData.company_name;
          fullName = profileData.full_name;
          // Use profile email if no Stripe email found
          if (!email && profileData.email) {
            email = profileData.email;
          }
          console.log('[get-success-summary] Found profile data:', {
            company_name: businessName,
            full_name: fullName,
            email: profileData.email
          });
        } else {
          console.log('[get-success-summary] No profile data returned');
        }
      } catch (error) {
        console.error('[get-success-summary] Error querying profiles:', error);
      }
    } else {
      console.log('[get-success-summary] No profile_id provided, skipping profile query');
    }

    // Fallback to assessment data if needed and assessment_id exists
    if ((!businessName || !fullName) && assessmentId) {
      console.log('[get-success-summary] Querying assessments table with ID:', assessmentId);
      try {
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('answers, full_name_entered')
          .eq('id', assessmentId)
          .single();

        if (assessmentError) {
          console.error('[get-success-summary] Assessment query error:', assessmentError);
        } else if (assessmentData) {
          if (!businessName && assessmentData.answers?.businessName) {
            businessName = assessmentData.answers.businessName;
            console.log('[get-success-summary] Got business name from assessment');
          }
          if (!fullName && assessmentData.full_name_entered) {
            fullName = assessmentData.full_name_entered;
            console.log('[get-success-summary] Got full name from assessment');
          }
          console.log('[get-success-summary] Found assessment data:', {
            businessName: assessmentData.answers?.businessName,
            full_name_entered: assessmentData.full_name_entered
          });
        } else {
          console.log('[get-success-summary] No assessment data returned');
        }
      } catch (error) {
        console.error('[get-success-summary] Error querying assessments:', error);
      }
    } else {
      console.log('[get-success-summary] Skipping assessment query - either data complete or no assessment_id');
    }

    // Create the clean JSON response as requested
    const response = {
      success: true,
      email: email || null,
      business: businessName || null,
      name: fullName || null,
      plan: plan || null
    };

    console.log('[get-success-summary] Final response:', response);

    return json(200, response);

  } catch (error) {
    console.error('[get-success-summary] Unhandled error:', error);
    console.error('[get-success-summary] Error stack:', error.stack);
    return json(500, { 
      success: false, 
      error: error.message || 'Internal server error'
    });
  }
};