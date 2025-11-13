const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  try {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return json(200, {});
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    // Get session_id from query parameters
    const sessionId = event.queryStringParameters?.session_id;
    if (!sessionId) {
      return json(400, { error: 'MISSING_SESSION_ID' });
    }

    console.log('[get-success-summary] Fetching session:', sessionId);

    // Retrieve the Stripe checkout session with customer expansion
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer']
    });

    if (!session) {
      return json(404, { error: 'SESSION_NOT_FOUND' });
    }

    // Extract metadata
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

    // Extract email with priority: customer_details.email > customer.email > metadata.email_entered
    let email = null;
    if (session.customer_details?.email) {
      email = session.customer_details.email;
    } else if (session.customer?.email) {
      email = session.customer.email;
    } else if (emailEntered) {
      email = emailEntered;
    }

    let businessName = null;
    let contactName = null;

    // Query Supabase for profile data if profile_id exists
    if (profileId) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('company_name, full_name, email')
          .eq('id', profileId)
          .single();

        if (!profileError && profileData) {
          businessName = profileData.company_name;
          contactName = profileData.full_name;
          // Use profile email if no Stripe email found
          if (!email) {
            email = profileData.email;
          }
          console.log('[get-success-summary] Found profile data:', {
            company_name: businessName,
            full_name: contactName,
            email: profileData.email
          });
        } else {
          console.log('[get-success-summary] Profile not found or error:', profileError);
        }
      } catch (error) {
        console.warn('[get-success-summary] Error querying profiles:', error);
      }
    }

    // Fallback to assessment data if profile data missing and assessment_id exists
    if ((!businessName || !contactName) && assessmentId) {
      try {
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('answers, full_name_entered')
          .eq('id', assessmentId)
          .single();

        if (!assessmentError && assessmentData) {
          if (!businessName && assessmentData.answers?.businessName) {
            businessName = assessmentData.answers.businessName;
          }
          if (!contactName && assessmentData.full_name_entered) {
            contactName = assessmentData.full_name_entered;
          }
          console.log('[get-success-summary] Found assessment data:', {
            businessName: assessmentData.answers?.businessName,
            full_name_entered: assessmentData.full_name_entered
          });
        } else {
          console.log('[get-success-summary] Assessment not found or error:', assessmentError);
        }
      } catch (error) {
        console.warn('[get-success-summary] Error querying assessments:', error);
      }
    }

    // Final response
    const response = {
      email: email || null,
      plan: plan || null,
      business_name: businessName || null,
      contact_name: contactName || null,
      profile_id: profileId || null,
      assessment_id: assessmentId || null
    };

    console.log('[get-success-summary] Final response:', response);

    return json(200, response);

  } catch (error) {
    console.error('Get success summary error:', error);
    return json(500, { 
      error: 'INTERNAL_SERVER_ERROR',
      details: error.message
    });
  }
};