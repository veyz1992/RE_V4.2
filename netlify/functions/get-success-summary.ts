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
    console.log('[get-success-summary] Supabase client initialized with service role key:', supabaseServiceKey.substring(0, 20) + '...' + supabaseServiceKey.slice(-4));
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
        email: null,
        business: null,
        name: null,
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
        email: null,
        business: null,
        name: null,
        plan: 'Founding Member'
      });
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      console.log('[get-success-summary] Invalid session_id format');
      return json(200, { 
        success: false, 
        error: 'Invalid session_id format',
        email: null,
        business: null,
        name: null,
        plan: 'Founding Member'
      });
    }

    // Check if Stripe is properly initialized
    if (!stripe) {
      console.error('[get-success-summary] Stripe not initialized - missing STRIPE_SECRET_KEY');
      return json(200, { 
        success: false, 
        error: 'Stripe configuration error',
        email: null,
        business: null,
        name: null,
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
        email: null,
        business: null,
        name: null,
        plan: 'Founding Member'
      });
    }

    if (!session) {
      console.log('[get-success-summary] Session is null/undefined');
      return json(200, { 
        success: false, 
        error: 'Session not found',
        email: null,
        business: null,
        name: null,
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
        success: false,
        error: 'Database not available',
        email: email || null,
        business: null,
        name: null,
        plan: plan
      });
    }

    // Step 1: If profile_id present, fetch from profiles first
    if (profileId) {
      console.log('[get-success-summary] Querying profiles table with ID:', profileId);
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, company_name, email')
          .eq('id', profileId)
          .single();

        if (profileError) {
          console.error('[get-success-summary] Profile query error:', profileError);
        } else if (profileData) {
          fullName = profileData.full_name;
          businessName = profileData.company_name;
          if (!email && profileData.email) {
            email = profileData.email;
          }
          console.log('[get-success-summary] Found profile data:', {
            full_name: fullName,
            company_name: businessName,
            email: profileData.email
          });
        }
      } catch (error) {
        console.error('[get-success-summary] Error querying profiles:', error);
      }
    }

    // Step 2: If profiles empty OR profile_id null, fetch from assessments
    if ((!fullName || !businessName || !email) && assessmentId) {
      console.log('[get-success-summary] Querying assessments table with ID:', assessmentId);
      try {
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('full_name_entered, email_entered, answers')
          .eq('id', assessmentId)
          .single();

        if (assessmentError) {
          console.error('[get-success-summary] Assessment query error:', assessmentError);
        } else if (assessmentData) {
          console.log('[get-success-summary] Raw assessment data:', assessmentData);
          
          // Extract name from full_name_entered
          if (!fullName && assessmentData.full_name_entered) {
            fullName = assessmentData.full_name_entered;
            console.log('[get-success-summary] Got name from assessment.full_name_entered:', fullName);
          }
          
          // Extract email from email_entered  
          if (!email && assessmentData.email_entered) {
            email = assessmentData.email_entered;
            console.log('[get-success-summary] Got email from assessment.email_entered:', email);
          }
          
          // Extract business from answers.businessName JSON field
          if (!businessName && assessmentData.answers) {
            console.log('[get-success-summary] Checking answers for businessName:', assessmentData.answers);
            businessName = assessmentData.answers?.businessName ?? null;
            if (businessName) {
              console.log('[get-success-summary] Got business from assessment.answers.businessName:', businessName);
            } else {
              console.log('[get-success-summary] No businessName found in answers JSON');
            }
          }
          
          console.log('[get-success-summary] Assessment data extracted:', {
            fullName,
            businessName,
            email,
            rawAnswers: assessmentData.answers
          });
        }
      } catch (error) {
        console.error('[get-success-summary] Error querying assessments:', error);
      }
    }

    // Step 3: If assessment_id missing, fallback by email
    if ((!fullName || !businessName) && !assessmentId && email) {
      console.log('[get-success-summary] No assessment_id, trying email fallback:', email);
      try {
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('full_name_entered, email_entered, answers')
          .eq('email_entered', email)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (assessmentError) {
          console.error('[get-success-summary] Email fallback assessment query error:', assessmentError);
        } else if (assessmentData) {
          if (!fullName && assessmentData.full_name_entered) {
            fullName = assessmentData.full_name_entered;
            console.log('[get-success-summary] Got name from email fallback assessment:', fullName);
          }
          
          if (!businessName && assessmentData.answers) {
            businessName = assessmentData.answers?.businessName ?? null;
            if (businessName) {
              console.log('[get-success-summary] Got business from email fallback assessment:', businessName);
            }
          }
        }
      } catch (error) {
        console.error('[get-success-summary] Error in email fallback query:', error);
      }
    }

    // Compose stable response as specified
    const finalEmail = email || emailEntered || null;
    const finalName = fullName || null;
    const finalBusiness = businessName || null;
    const finalPlan = plan || 'Founding Member';

    const response = {
      success: true,
      email: finalEmail,
      business: finalBusiness,
      name: finalName,
      plan: finalPlan
    };

    console.log('[get-success-summary] ===== FINAL RESPONSE =====');
    console.log('[get-success-summary] email sources: profiles.email =', (profileId ? 'checked' : 'skipped'), '| assessments.email_entered =', email, '| metadata.email_entered =', emailEntered);
    console.log('[get-success-summary] name sources: profiles.full_name =', (profileId ? 'checked' : 'skipped'), '| assessments.full_name_entered =', fullName);
    console.log('[get-success-summary] business sources: profiles.company_name =', (profileId ? 'checked' : 'skipped'), '| assessments.answers.businessName =', businessName);
    console.log('[get-success-summary] Final composed response:', response);
    console.log('[get-success-summary] ===========================');

    return json(200, response);

  } catch (error) {
    console.error('[get-success-summary] Unhandled error:', error);
    console.error('[get-success-summary] Error stack:', error?.stack);
    
    // Always return 200 with fallback data to prevent frontend crashes
    return json(200, { 
      success: false, 
      error: error?.message || 'Internal server error',
      email: null,
      business: null,
      name: null,
      plan: 'Founding Member'
    });
  }
};