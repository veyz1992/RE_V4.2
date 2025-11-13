import Stripe from 'stripe';
import { checkRequiredEnv } from '../lib/assertEnv.js';

const json = (status: number, body: unknown) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const resolveBaseUrl = (event: any): string => {
  const fromRaw = (() => {
    try {
      if (event?.rawUrl) return new URL(event.rawUrl).origin;
      const proto =
        event?.headers?.['x-forwarded-proto'] ||
        event?.headers?.['x-forwarded-protocol'] ||
        'https';
      const host = event?.headers?.['x-forwarded-host'] || event?.headers?.host;
      if (host) return `${proto}://${host}`;
      return null;
    } catch {
      return null;
    }
  })();

  const raw =
    fromRaw ||
    process.env.DEPLOY_URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    process.env.SITE_URL;

  if (!raw) throw new Error('MISSING_BASE_URL');
  return String(raw).replace(/\/+$/, '');
};

export const handler = async (event: any) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return json(200, {});
    }

    const envCheck = checkRequiredEnv(['STRIPE_SECRET_KEY', 'PRICE_ID_FOUNDING_MEMBER']);
    if (!envCheck.ok) {
      return json(500, { error: 'SERVER_ERROR', message: envCheck.message });
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    let body: any;
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch (parseError) {
      return json(400, { error: 'INVALID_JSON' });
    }

    const { email, assessment_id, plan, profile_id, metadata: rawMetadata } = body ?? {};

    if (!email || !assessment_id || !plan) {
      return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
    }

    let origin: string;
    try {
      origin = resolveBaseUrl(event);
    } catch (resolveError: any) {
      console.error('[create-checkout-session] Failed to resolve base URL:', resolveError?.message || resolveError);
      return json(500, { error: 'SERVER_ERROR', message: 'Unable to determine site URL for checkout redirects.' });
    }
    const priceId = process.env.PRICE_ID_FOUNDING_MEMBER as string;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });

    const metadata: Record<string, string> = {
      assessment_id,
      profile_id: typeof profile_id === 'string' && profile_id.trim().length > 0 ? profile_id : '',
    };

    if (typeof plan === 'string' && plan.trim()) {
      metadata.plan = plan;
    }

    if (isRecord(rawMetadata)) {
      for (const [key, value] of Object.entries(rawMetadata)) {
        if (typeof value === 'string' && value.trim().length > 0) {
          metadata[key] = value.trim();
        }
      }
    }

    const success_url = `${origin}/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${origin}/results`;

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email,
        metadata,
        client_reference_id: assessment_id,
        success_url,
        cancel_url,
      });

      return json(200, { url: session.url, id: session.id });
    } catch (stripeError: any) {
      console.error('[create-checkout-session] Stripe error:', stripeError?.message || stripeError);
      return json(500, { error: 'STRIPE_ERROR' });
    }
  } catch (unhandledError: any) {
    console.error('[create-checkout-session] Unhandled error:', unhandledError?.message || unhandledError);
    return json(500, { error: 'STRIPE_ERROR' });
  }
};
