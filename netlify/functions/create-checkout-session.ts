// netlify/functions/create-checkout-session.ts
import Stripe from 'stripe';

const json = (status: number, body: unknown) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // keep if we need CORS from app
  },
  body: JSON.stringify(body),
});

const TIER_TO_ENV: Record<string, string> = {
  'founding-member': 'STRIPE_PRICE_FOUNDING_MEMBER',
  'bronze': 'STRIPE_PRICE_BRONZE',
  'silver': 'STRIPE_PRICE_SILVER',
  'gold': 'STRIPE_PRICE_GOLD',
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
    // Debug mode - GET request with debug=1 query parameter
    if (event.httpMethod === 'GET' && event.queryStringParameters?.debug === '1') {
      const baseUrl = resolveBaseUrl(event);
      return json(200, { baseUrl });
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

    // Validate environment variables upfront
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      console.error('Missing STRIPE_SECRET_KEY in this deploy context');
      return json(500, { error: 'MISSING_ENV', key: 'STRIPE_SECRET_KEY' });
    }

    // Get email from assessment if not provided directly
    let customerEmail = email;
    if (!customerEmail && assessmentId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseServiceRoleKey) {
          console.error('Missing Supabase environment variables');
          return json(500, { error: 'MISSING_SUPABASE_CONFIG' });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
        });
        
        const { data: assessment, error } = await supabase
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
    const priceId = priceEnvKey ? process.env[priceEnvKey] : undefined;

    if (!priceId) {
      console.error('Missing price ID for tier:', tierName, 'slug:', tierSlug, 'envKey:', priceEnvKey);
      return json(500, { 
        error: 'MISSING_PRICE_ID', 
        tier: tierName, 
        tierSlug, 
        envKey: priceEnvKey,
        availableEnvKeys: Object.keys(TIER_TO_ENV)
      });
    }

    console.log(`Processing checkout: ${tierName} -> ${priceEnvKey} -> ${priceId}`);

    // Resolve the correct base URL for this deployment context
    const baseUrl = resolveBaseUrl(event);
    const success_url = `${baseUrl}/success/${tierSlug}?checkout=success`;
    const cancel_url = `${baseUrl}/results?checkout=cancelled`;

    // Safe logging without exposing secrets
    console.log('[checkout] baseUrl', { baseUrl, tierSlug });

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail,
      metadata: { tier: tierName, email: customerEmail, assessmentId: assessmentId ?? '' },
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
      raw: err?.raw?.message,
      context: process.env.DEPLOYMENT_CONTEXT,
    });
    return json(500, {
      error: 'CHECKOUT_CREATE_FAILED',
      message: err?.message || 'Unknown error',
      code: err?.code || null,
    });
  }
};
