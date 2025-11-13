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
  // Wrap entire function in try/catch to prevent 502 errors
  try {
    console.log('[get-success-summary] Function invoked');
    console.log('[get-success-summary] Event method:', event.httpMethod);
    console.log('[get-success-summary] Query params:', event.queryStringParameters);

    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('[get-success-summary] Handling OPTIONS request');
      return json(200, {});
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      console.log('[get-success-summary] Invalid method:', event.httpMethod);
      return json(200, { 
        success: false, 
        error: 'Method not allowed',
        email: 'Pending Sync',
        business: 'Pending Sync', 
        name: 'Pending Sync',
        plan: 'Founding Member'
      });
    }

    // Validate session_id from query parameters
    const sessionId = event.queryStringParameters?.session_id;
    console.log('[get-success-summary] Session ID from params:', sessionId);

    if (!sessionId) {
      console.log('[get-success-summary] Missing session_id parameter');
      return json(200, { 
        success: false, 
        error: 'Missing session_id parameter',
        email: 'Pending Sync',
        business: 'Pending Sync', 
        name: 'Pending Sync',
        plan: 'Founding Member'
      });
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      console.log('[get-success-summary] Invalid session_id format');
      return json(200, { 
        success: false, 
        error: 'Invalid session_id format',
        email: 'Pending Sync',
        business: 'Pending Sync', 
        name: 'Pending Sync',
        plan: 'Founding Member'
      });
    }

    // Check if Stripe is properly initialized
    if (!stripe) {
      console.error('[get-success-summary] Stripe not initialized - missing STRIPE_SECRET_KEY');
      return json(200, { 
        success: false, 
        error: 'Stripe configuration error',
        email: 'Pending Sync',
        business: 'Pending Sync', 
        name: 'Pending Sync',
        plan: 'Founding Member'
      });
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
      return json(200, { 
        success: false, 
        error: 'Checkout session not found',
        email: 'Pending Sync',
        business: 'Pending Sync', 
        name: 'Pending Sync',
        plan: 'Founding Member'
      });
    }

    if (!session) {
      console.log('[get-success-summary] Session is null/undefined');
      return json(200, { 
        success: false, 
        error: 'Session not found',
        email: 'Pending Sync',
        business: 'Pending Sync', 
        name: 'Pending Sync',
        plan: 'Founding Member'
      });
    }

    // Extract and validate metadata
    const metadata = session.metadata || {};
    const profileId = metadata.profile_id;
    const assessmentId = metadata.assessment_id;
    const emailEntered = metadata.email_entered;
    const plan = metadata.plan || 'Founding Member';

    console.log('[get-success-summary] Extracted metadata:', {
      profileId,
      assessmentId,
      emailEntered,
      plan
    });

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

    // Check Supabase availability - continue with fallbacks if unavailable
    if (!supabase) {
      console.error('[get-success-summary] Supabase not available - using fallbacks');
      return json(200, {
        success: true,
        email: email || 'Pending Sync',
        business: 'Pending Sync',
        name: 'Pending Sync',
        plan: plan
      });
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
    }

    // If profile_id is null but we have email, try to match by email
    if (!profileId && email) {
      console.log('[get-success-summary] No profile_id, attempting to match by email:', email);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('company_name, full_name, email')
          .eq('email', email)
          .single();

        if (profileError) {
          console.error('[get-success-summary] Profile email lookup error:', profileError);
        } else if (profileData) {
          businessName = profileData.company_name;
          fullName = profileData.full_name;
          console.log('[get-success-summary] Found profile by email:', {
            company_name: businessName,
            full_name: fullName
          });
        }
      } catch (error) {
        console.error('[get-success-summary] Error querying profiles by email:', error);
      }
    }

    // Fallback to assessment data if needed and assessment_id exists
    if ((!businessName || !fullName || !email) && assessmentId) {
      console.log('[get-success-summary] Querying assessments table with ID:', assessmentId);
      try {
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('answers, full_name_entered, email_entered')
          .eq('id', assessmentId)
          .single();

        if (assessmentError) {
          console.error('[get-success-summary] Assessment query error:', assessmentError);
        } else if (assessmentData) {
          console.log('[get-success-summary] Raw assessment data:', assessmentData);
          
          // Try multiple possible business name fields
          if (!businessName) {
            const answers = assessmentData.answers || {};
            businessName = answers.businessName || answers.business_name || answers.companyName || answers.company_name;
            if (businessName) {
              console.log('[get-success-summary] Got business name from assessment:', businessName);
            }
          }
          
          if (!fullName && assessmentData.full_name_entered) {
            fullName = assessmentData.full_name_entered;
            console.log('[get-success-summary] Got full name from assessment:', fullName);
          }
          
          if (!email && assessmentData.email_entered) {
            email = assessmentData.email_entered;
            console.log('[get-success-summary] Got email from assessment:', email);
          }
          
          console.log('[get-success-summary] Final assessment extraction:', {
            businessName,
            fullName,
            email,
            rawAnswers: assessmentData.answers
          });
        } else {
          console.log('[get-success-summary] No assessment data returned');
        }
      } catch (error) {
        console.error('[get-success-summary] Error querying assessments:', error);
      }
    }

    // Create the clean JSON response with fallbacks for missing data
    const response = {
      success: true,
      email: email || 'Pending Sync',
      business: businessName || 'Pending Sync',
      name: fullName || 'Pending Sync',
      plan: plan
    };

    console.log('[get-success-summary] ===== FINAL RESPONSE =====');
    console.log('[get-success-summary] email:', email);
    console.log('[get-success-summary] business:', businessName);
    console.log('[get-success-summary] name:', fullName);
    console.log('[get-success-summary] plan:', plan);
    console.log('[get-success-summary] Final response object:', response);
    console.log('[get-success-summary] ===========================');

    return json(200, response);

  } catch (error) {
    console.error('[get-success-summary] Unhandled error:', error);
    console.error('[get-success-summary] Error stack:', error?.stack);
    
    // Always return 200 with fallback data to prevent frontend crashes
    return json(200, { 
      success: false, 
      error: error?.message || 'Internal server error',
      email: 'Pending Sync',
      business: 'Pending Sync',
      name: 'Pending Sync',
      plan: 'Founding Member'
    });
  }
};