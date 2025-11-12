import Stripe from 'stripe';
import { TIER_CONFIG } from '../../constants';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2022-11-15',
});

// Build price mapping from centralized config
const PRICE_IDS: Record<string, string | undefined> = {};
const priceConfigLog: Record<string, boolean> = {};

Object.entries(TIER_CONFIG).forEach(([tierName, config]) => {
  const envValue = process.env[config.stripeEnvKey];
  PRICE_IDS[tierName] = envValue;
  priceConfigLog[tierName] = !!envValue;
});

// Log the price configuration for debugging
console.log('Price configuration:', priceConfigLog);

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
  body: string | null;
  isBase64Encoded?: boolean;
};

type Context = unknown;

type HandlerResult = Promise<{
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
}>;

const getOriginFromHeaders = (headers: Record<string, string | undefined>): string => {
  if (headers.origin) {
    return headers.origin;
  }

  const referer = headers.referer ?? headers.referrer;
  if (referer) {
    try {
      const url = new URL(referer);
      return url.origin;
    } catch (error) {
      console.warn('Failed to parse referer header', error);
    }
  }

  if (headers.host) {
    return `https://${headers.host}`;
  }

  return 'http://localhost:8888';
};

export const handler = async (event: Event, _context: Context): HandlerResult => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  if (!event.body) {
    return jsonResponse(400, { error: 'Missing request body' });
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let payload: { 
    assessmentId?: string | number;
    intendedTier: string;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { assessmentId, intendedTier } = payload;
  
  // Log incoming payload for debugging (sanitized)
  console.log('Checkout session request:', { 
    intendedTier,
    assessmentId
  });

  if (!intendedTier || typeof intendedTier !== 'string') {
    console.error('Invalid tier provided:', intendedTier);
    return jsonResponse(400, { error: 'Invalid or missing membership tier' });
  }

  // Guard: Only allow Founding Member tier while others are "coming soon"
  if (intendedTier !== 'Founding Member') {
    console.error(`Tier "${intendedTier}" is not yet available. Only Founding Member is active.`);
    return jsonResponse(400, {
      error: `${intendedTier} membership is coming soon. Only Founding Member is currently available.`,
    });
  }

  // Use environment variable for Founding Member price
  const priceId = process.env.STRIPE_PRICE_FOUNDING_MEMBER;

  if (!priceId) {
    console.error('Missing STRIPE_PRICE_FOUNDING_MEMBER environment variable');
    return jsonResponse(400, {
      error: 'Founding Member price not configured. Please contact support.',
    });
  }
  
  console.log(`Selected tier: ${intendedTier} -> Price ID: ${priceId}`);

  const origin = getOriginFromHeaders(event.headers ?? {});

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        assessment_id: assessmentId ? String(assessmentId) : '',
        intended_tier: 'Founding Member',
      },
      success_url: 'https://dev3--resonant-sprite-4fa0fe.netlify.app/success/founding-member?checkout=success',
      cancel_url: 'https://dev3--resonant-sprite-4fa0fe.netlify.app/pricing?checkout=cancelled',
    });

    if (!session.url) {
      throw new Error('Stripe session did not include a redirect URL.');
    }

    console.log(`Stripe checkout session created successfully: ${session.id}`);
    return jsonResponse(200, { url: session.url });
  } catch (error) {
    console.error('Failed to create Stripe Checkout Session', error);
    return jsonResponse(500, { error: 'Failed to create checkout session' });
  }
};
