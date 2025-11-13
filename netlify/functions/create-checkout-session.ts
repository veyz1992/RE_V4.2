// netlify/functions/create-checkout-session.ts
import Stripe from 'stripe';
import { assertEnv, serverEnv } from './_utils/env.js';

const json = (status: number, body: unknown) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // keep if we need CORS from app
  },
  body: JSON.stringify(body),
});

const TIER_TO_ENV: Record<string, string> = {
  'founding-member': 'PRICE_FOUNDING_MEMBER',
};

// helper: choose the correct origin for this deploy
function resolveBaseUrl(event: any): string {
  // Prefer the live request origin first
  const fromRaw = (() => {
    try {
      if (event?.rawUrl) return new URL(event.rawUrl).origin;
      const proto =
        event?.headers?.["x-forwarded-proto"] ||
        event?.headers?.["x-forwarded-protocol"] ||
        "https";
      const host =
        event?.headers?.["x-forwarded-host"] ||
        event?.headers?.host;
      if (host) return `${proto}://${host}`;
      return null;
    } catch { return null; }
  })();

  const raw =
    fromRaw ||
    process.env.DEPLOY_URL ||        // branch/preview exact URL
    process.env.DEPLOY_PRIME_URL ||  // preview URL
    process.env.URL ||               // may be primary custom domain
    process.env.SITE_URL;            // usually primary custom domain

  if (!raw) throw new Error("MISSING_BASE_URL");
  return String(raw).replace(/\/+$/, "");
}

export const handler = async (event: any) => {
  try {
    // Assert required environment variables
    try {
      assertEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'PRICE_FOUNDING_MEMBER', 'SITE_BASE_URL']);
    } catch (envError) {
      console.error('[create-checkout-session] step:env_validation', {
        error: envError.message,
        context: process.env.CONTEXT,
        deployUrl: process.env.DEPLOY_PRIME_URL
      });
      return json(500, { success: false, error: `Missing server configuration: ${envError.message}` });
    }

    // Debug mode - GET request with debug=1 query parameter
    if (event.httpMethod === 'GET' && event.queryStringParameters?.debug === '1') {
      const baseUrl = resolveBaseUrl(event);
      return json(200, { 
        ok: true, 
        baseUrl,
        hasStripe: true
      });
    }
    
    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return json(400, { error: 'INVALID_JSON', message: 'Request body must be valid JSON' });
    }

    // Validate body: assessment_id, profile_id, email
    const { 
      assessment_id,
      assessmentId,
      profile_id,
      profileId,
      email
    } = requestBody;

    const finalAssessmentId = assessment_id || assessmentId;
    const finalProfileId = profile_id || profileId;

    if (!finalAssessmentId || !finalProfileId || !email) {
      console.error('[create-checkout-session] step:validation_failed', {
        hasAssessmentId: !!finalAssessmentId,
        hasProfileId: !!finalProfileId,
        hasEmail: !!email,
        context: process.env.CONTEXT
      });
      return json(400, { error: 'MISSING_REQUIRED_FIELDS', details: 'assessment_id, profile_id, and email are required' });
    }

    // Use PRICE_FOUNDING_MEMBER from env, not hardcoded
    const priceId = serverEnv.PRICE_FOUNDING_MEMBER;

    console.log('[create-checkout-session] step:checkout_creation', {
      assessmentId: finalAssessmentId,
      profileId: finalProfileId,
      email,
      context: process.env.CONTEXT
    });

    // Create Stripe Checkout Session
    const success_url = `${serverEnv.SITE_BASE_URL}/success/founding-member?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${serverEnv.SITE_BASE_URL}/pricing?checkout=cancel`;

    const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { 
        assessment_id: finalAssessmentId,
        profile_id: finalProfileId,
        plan: 'founding-member'
      },
      success_url,
      cancel_url
    });

    console.log('[create-checkout-session] step:stripe_success', {
      sessionId: session.id,
      context: process.env.CONTEXT
    });

    return json(200, { url: session.url });
  } catch (err: any) {
    console.error('[create-checkout-session] step:stripe_error', {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      stripe_error_code: err?.code,
      context: process.env.CONTEXT
    });
    return json(500, {
      success: false,
      error: 'stripe'
    });
  }
};
