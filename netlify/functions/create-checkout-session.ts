import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { assertEnv } from '../lib/assertEnv';
import { supabaseAdmin } from '../lib/supabaseServer';

const { STRIPE_SECRET_KEY, PRICE_ID_FOUNDING_MEMBER } = assertEnv([
  'STRIPE_SECRET_KEY',
  'PRICE_ID_FOUNDING_MEMBER'
] as const);

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const planPriceMap: Record<string, string> = {
  'founding-member': PRICE_ID_FOUNDING_MEMBER,
  'founding_member': PRICE_ID_FOUNDING_MEMBER,
  foundingMember: PRICE_ID_FOUNDING_MEMBER
};

const resolveOrigin = (event: Parameters<Handler>[0]): string => {
  try {
    if (event.rawUrl) {
      return new URL(event.rawUrl).origin;
    }
  } catch {
    // ignore
  }

  const forwardedProto = event.headers?.['x-forwarded-proto'] ?? event.headers?.['x-forwarded-protocol'];
  const host = event.headers?.['x-forwarded-host'] ?? event.headers?.host;

  if (host) {
    const proto = typeof forwardedProto === 'string' && forwardedProto.length > 0 ? forwardedProto : 'https';
    return `${proto}://${host}`;
  }

  const fallback =
    process.env.DEPLOY_URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.URL ||
    process.env.SITE_URL;

  if (!fallback) {
    throw new Error('Unable to determine site origin');
  }

  return String(fallback).replace(/\/+$/, '');
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return json(200, { ok: true });
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    if (!event.body) {
      return json(400, { error: 'EMPTY_BODY' });
    }

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return json(400, { error: 'INVALID_JSON' });
    }

    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!email) {
      return json(400, { error: 'MISSING_REQUIRED_FIELDS', details: ['email'] });
    }

    const requestedPriceId = typeof payload.priceId === 'string' ? payload.priceId.trim() : '';
    const planKey = typeof payload.plan === 'string' ? payload.plan.trim() : '';
    const priceId = requestedPriceId || (planKey ? planPriceMap[planKey] : undefined) || PRICE_ID_FOUNDING_MEMBER;

    if (!priceId) {
      return json(400, { error: 'MISSING_REQUIRED_FIELDS', details: ['priceId'] });
    }

    let profileId: string | null = null;
    let stripeCustomerId: string | null = null;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_customer_id')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile) {
      profileId = profile.id ?? null;
      stripeCustomerId = profile.stripe_customer_id ?? null;
    } else {
      const { data: insertedProfile, error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({ email })
        .select('id')
        .single();

      if (insertProfileError) {
        throw insertProfileError;
      }

      profileId = insertedProfile.id;
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email });
      stripeCustomerId = customer.id;

      if (profileId) {
        await supabaseAdmin.from('profiles').update({ stripe_customer_id: stripeCustomerId }).eq('id', profileId);
      }
    }

    const origin = resolveOrigin(event);

    const metadata: Record<string, string> = {};
    if (typeof payload.assessment_id === 'string') {
      metadata.assessment_id = payload.assessment_id;
    }
    if (typeof payload.profile_id === 'string') {
      metadata.profile_id = payload.profile_id;
    }
    if (planKey) {
      metadata.plan = planKey;
    }
    if (payload.metadata && typeof payload.metadata === 'object') {
      for (const [key, value] of Object.entries(payload.metadata)) {
        if (typeof value === 'string') {
          metadata[key] = value;
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId ?? undefined,
      customer_email: stripeCustomerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        typeof payload.successUrl === 'string' && payload.successUrl.length > 0
          ? payload.successUrl
          : `${origin}/results?checkout=success`,
      cancel_url:
        typeof payload.cancelUrl === 'string' && payload.cancelUrl.length > 0
          ? payload.cancelUrl
          : `${origin}/results?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    });

    return json(200, { url: session.url });
  } catch (error: any) {
    console.error('[create-checkout-session] error', error);
    return json(500, { error: 'CHECKOUT_SESSION_FAILED', message: error?.message ?? 'Unknown error' });
  }
};
