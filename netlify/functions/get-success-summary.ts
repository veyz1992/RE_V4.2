import Stripe from 'stripe';
import { assertEnv, serverEnv } from './_utils/env.js';
import { serverClient } from '../lib/supabaseServer.js';

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
    // Assert required environment variables
    try {
      assertEnv(['STRIPE_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    } catch (envError) {
      console.error('[get-success-summary] step:env_validation', {
        error: envError.message,
        context: process.env.CONTEXT,
        deployUrl: process.env.DEPLOY_PRIME_URL
      });
      return json(500, { success: false, error: 'Missing server configuration: ' + envError.message });
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

    // Read session_id from query
    const sessionId = event.queryStringParameters?.session_id;
    if (!sessionId) {
      return json(400, { 
        success: false, 
        error: 'NO_SESSION_ID'
      });
    }

    console.log('[get-success-summary] step:session_retrieval', { 
      sessionId, 
      context: process.env.CONTEXT 
    });

    // Fetch Stripe Checkout Session
    let session;
    let stripeEmail;
    let metadataAssessmentId;
    let metadataProfileId;
    
    try {
      const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
        apiVersion: '2024-06-20'
      });

      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer']
      });

      stripeEmail = session.customer_details?.email || null;
      metadataAssessmentId = session.metadata?.assessment_id || null;
      metadataProfileId = session.metadata?.profile_id || null;

      console.log('[get-success-summary] step:stripe_success', {
        hasEmail: !!stripeEmail,
        hasAssessmentId: !!metadataAssessmentId,
        hasProfileId: !!metadataProfileId,
        context: process.env.CONTEXT
      });

    } catch (stripeError) {
      console.error('[get-success-summary] step:stripe_error', { error: stripeError });
      return json(500, { success: false, error: 'db' });
    }

    if (!stripeEmail) {
      console.error('[get-success-summary] step:no_email', { sessionId });
      return json(500, { success: false, error: 'db' });
    }

    // Query Supabase - prefer metadata ids, otherwise fall back to email lookup
    let profileData = null;
    let assessmentData = null;

    try {
      // Try to get profile by metadata profile_id first
      if (metadataProfileId) {
        const { data, error } = await serverClient
          .from('profiles')
          .select('company_name, full_name')
          .eq('id', metadataProfileId)
          .maybeSingle();

        if (!error && data) {
          profileData = data;
          console.log('[get-success-summary] step:profile_by_id', { profileId: metadataProfileId });
        }
      }

      // Fallback to email lookup
      if (!profileData) {
        const { data, error } = await serverClient
          .from('profiles')
          .select('company_name, full_name')
          .eq('email', stripeEmail)
          .maybeSingle();

        if (!error && data) {
          profileData = data;
          console.log('[get-success-summary] step:profile_by_email', { email: stripeEmail });
        }
      }

      // Try to get most recent assessment by metadata assessment_id first
      if (metadataAssessmentId) {
        const { data, error } = await serverClient
          .from('assessments')
          .select('full_name_entered, answers')
          .eq('id', metadataAssessmentId)
          .maybeSingle();

        if (!error && data) {
          assessmentData = data;
          console.log('[get-success-summary] step:assessment_by_id', { assessmentId: metadataAssessmentId });
        }
      }

      // Fallback to most recent assessment by email
      if (!assessmentData) {
        const { data, error } = await serverClient
          .from('assessments')
          .select('full_name_entered, answers')
          .eq('email_entered', stripeEmail)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          assessmentData = data;
          console.log('[get-success-summary] step:assessment_by_email', { email: stripeEmail });
        }
      }

    } catch (dbError) {
      console.error('[get-success-summary] step:db_error', { error: dbError });
      return json(500, { success: false, error: 'db' });
    }

    // Return JSON response
    const business = profileData?.company_name || (assessmentData?.answers?.businessName) || null;
    const name = profileData?.full_name || assessmentData?.full_name_entered || null;

    const response = {
      success: true,
      email: stripeEmail,
      plan: 'founding-member',
      rating: 'A+ Founding Elite - Restoration Pioneer',
      business: business || null,
      name: name || null
    };

    console.log('[get-success-summary] step:success', { 
      response,
      context: process.env.CONTEXT 
    });

    return json(200, response);

  } catch (error) {
    console.error('[get-success-summary] step:unhandled_error', { 
      error: error,
      context: process.env.CONTEXT 
    });
    return json(500, { success: false, error: 'db' });
  }
};