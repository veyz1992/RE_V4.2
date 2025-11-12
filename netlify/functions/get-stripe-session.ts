const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Base URL resolver with request-origin priority  
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
    // Debug probe
    if (event.httpMethod === 'GET' && event.queryStringParameters?.debug === '1') {
      const baseUrl = resolveBaseUrl(event);
      return json(200, { baseUrl });
    }

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

    console.log('[get-stripe-session] Fetching session:', sessionId);

    // Retrieve the Stripe checkout session with customer expansion
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer']
    });

    if (!session) {
      return json(404, { error: 'SESSION_NOT_FOUND' });
    }

    // Extract email with priority: customer_details.email > customer.email > metadata.email_entered
    let email = null;
    if (session.customer_details?.email) {
      email = session.customer_details.email;
    } else if (session.customer?.email) {
      email = session.customer.email;
    } else if (session.metadata?.email_entered) {
      email = session.metadata.email_entered;
    }

    // Extract plan from metadata or URL pattern
    let plan = null;
    if (session.metadata?.plan) {
      plan = session.metadata.plan;
    } else {
      const successUrl = session.success_url || '';
      const planMatch = successUrl.match(/\/success\/([^?]+)/);
      if (planMatch) {
        plan = planMatch[1];
      }
    }

    // Extract metadata
    const metadata = session.metadata || {};

    console.log('[get-stripe-session] Session data:', {
      sessionId,
      email,
      plan,
      metadata: Object.keys(metadata),
      payment_status: session.payment_status
    });

    return json(200, {
      email: email,
      plan: plan || null,
      assessment_id: metadata.assessment_id || null,
      profile_id: metadata.profile_id || null,
      session_id: sessionId,
      payment_status: session.payment_status
    });

  } catch (error) {
    console.error('Get stripe session error:', error);
    return json(500, { 
      error: 'INTERNAL_SERVER_ERROR',
      details: error.message
    });
  }
};