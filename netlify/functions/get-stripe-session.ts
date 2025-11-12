import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18',
});

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify(body),
});

type Event = {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  queryStringParameters: Record<string, string | undefined> | null;
};

type Context = unknown;

type HandlerResult = Promise<{
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
}>;

export const handler = async (event: Event, _context: Context): HandlerResult => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  const sessionId = event.queryStringParameters?.session_id;

  if (!sessionId) {
    return jsonResponse(400, { error: 'Missing session_id parameter' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    const email = session.customer_details?.email || session.customer_email;
    
    if (!email) {
      return jsonResponse(404, { error: 'No email found in session' });
    }

    console.log(`Retrieved email from session ${sessionId}: ${email}`);

    return jsonResponse(200, { email });
  } catch (error) {
    console.error('Failed to retrieve Stripe session:', error);
    return jsonResponse(500, { error: 'Failed to retrieve session' });
  }
};