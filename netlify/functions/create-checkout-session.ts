// netlify/functions/create-checkout-session.ts
import Stripe from 'stripe';
import { assertEnv } from '../lib/env.js';

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
    console.debug('[Checkout] Request received');

    // Assert required environment variables
    try {
      assertEnv(['STRIPE_SECRET_KEY', 'PRICE_ID_FOUNDING_MEMBER']);
    } catch (envError) {
      console.error('[create-checkout-session] Missing env vars:', envError.message);
      return json(500, { error: 'STRIPE_SESSION_FAILED' });
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    // Parse and validate JSON body
    let body;
    try {
      body = JSON.parse(event.body);
      console.debug('[Checkout] Body parsed:', { hasAssessmentId: !!body.assessment_id, hasProfileId: !!body.profile_id, hasEmail: !!body.email });
    } catch (err) {
      console.error('[create-checkout-session] Invalid JSON:', err);
      return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
    }

    // Validate required fields: assessment_id (uuid), profile_id (uuid), email (string)
    const { assessment_id, profile_id, email, tier, billing_cycle } = body;

    if (!assessment_id || !profile_id || !email) {
      console.error('[create-checkout-session] Missing required fields:', { 
        hasAssessmentId: !!assessment_id, 
        hasProfileId: !!profile_id, 
        hasEmail: !!email 
      });
      return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
    }

    // Validate email format
    if (typeof email !== 'string' || !email.includes('@')) {
      console.error('[create-checkout-session] Invalid email format:', email);
      return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
    }

    // Read PRICE_ID_FOUNDING_MEMBER from env
    const priceId = process.env.PRICE_ID_FOUNDING_MEMBER;

    console.debug('[Checkout] Creating Stripe session for:', { assessment_id, profile_id, email, tier, billing_cycle });

    // Get origin for URLs
    const origin = resolveBaseUrl(event);
    const success_url = `${origin}/success/founding-member?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${origin}/results`;

    // Create Stripe session
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: { 
        assessment_id,
        profile_id,
        plan: 'founding-member'
      },
      success_url,
      cancel_url
    });

    console.debug('[Checkout] Stripe session created:', session.id);

    return json(200, { url: session.url });

  } catch (err: any) {
    console.error('[create-checkout-session] Error:', err.stack || err);
    return json(500, { error: 'STRIPE_SESSION_FAILED' });
  }
};
