// netlify/functions/create-checkout-session.ts
import Stripe from 'stripe';
import { serverEnv } from './_utils/env.js';

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
    // Validate required environment variables at the top
    try {
      // Import validates envs, will throw if missing
      const envCheck = serverEnv;
    } catch (envError) {
      console.error('[create-checkout-session] Environment validation failed:', envError);
      return json(400, { 
        error: 'CONFIG_ERROR', 
        missing: ['Required environment variables not configured']
      });
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

    // Support both legacy (intendedTier) and new (tier) parameter names
    const { 
      tier, 
      intendedTier, 
      email, 
      assessmentId, 
      mode = 'subscription' 
    } = requestBody;

    const tierName = tier || intendedTier;
    
    if (!tierName) {
      return json(400, { error: 'MISSING_TIER', details: { tier, intendedTier } });
    }

    // Use validated environment from serverEnv
    const secret = serverEnv.STRIPE_SECRET_KEY;

    // Get email from assessment if not provided directly
    let customerEmail = email;
    if (!customerEmail && assessmentId) {
      try {
        const { supabaseServer } = await import('./_utils/supabase.js');
        
        const { data: assessment, error } = await supabaseServer
          .from('assessments')
          .select('email_entered')
          .eq('id', assessmentId)
          .maybeSingle();
          
        if (error) {
          console.error('Assessment lookup error:', error);
          return json(400, { error: 'ASSESSMENT_LOOKUP_FAILED', assessmentId });
        }

        if (!assessment?.email_entered) {
          return json(400, { error: 'ASSESSMENT_NOT_FOUND', assessmentId });
        }

        customerEmail = assessment.email_entered;
        console.log(`Email from assessment ${assessmentId}: ${customerEmail}`);
      } catch (supabaseError) {
        console.error('Supabase connection error:', supabaseError);
        return json(500, { error: 'DATABASE_CONNECTION_FAILED' });
      }
    }

    if (!customerEmail) {
      return json(400, { error: 'MISSING_EMAIL', message: 'Email required either directly or via assessmentId' });
    }

    // Convert tier name to env key format
    const tierSlug = tierName.toLowerCase().replace(/\s+/g, '-');
    const priceEnvKey = TIER_TO_ENV[tierSlug];
    const priceId = priceEnvKey === 'PRICE_FOUNDING_MEMBER' ? serverEnv.PRICE_FOUNDING_MEMBER : undefined;

    if (!priceId) {
      console.error('Missing price ID for tier:', tierName, 'slug:', tierSlug, 'envKey:', priceEnvKey);
      return json(400, { 
        error: 'CHECKOUT_CREATE_FAILED', 
        detail: `Invalid tier: ${tierName}`
      });
    }

    console.log(`Processing checkout: ${tierName} -> ${priceEnvKey} -> ${priceId}`);

    // Resolve the correct base URL for this deployment context
    const baseUrl = resolveBaseUrl(event);
    const success_url = `${baseUrl}/success/${tierSlug}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${baseUrl}/results?checkout=cancelled`;

    // Safe logging without exposing secrets
    console.log('[checkout] baseUrl', { baseUrl, tierSlug });

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    // Get additional metadata from request body
    const { profileId } = requestBody;

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail,
      metadata: { 
        email_entered: customerEmail,
        plan: tierSlug,
        profile_id: profileId || '',
        assessment_id: assessmentId || ''
      },
      success_url,
      cancel_url,
      // Optional: allow_promotion_codes: true,
    });

    return json(200, { url: session.url });
  } catch (err: any) {
    console.error('create-checkout-session error:', {
      message: err?.message,
      type: err?.type,
      code: err?.code,
    });
    return json(400, {
      error: 'CHECKOUT_CREATE_FAILED',
      detail: err?.message || 'Unknown error'
    });
  }
};
