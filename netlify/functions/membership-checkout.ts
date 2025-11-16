import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { assertEnv } from '../lib/assertEnv';
import { supabase } from '../lib/supabaseServer';
import {
  getPriceIdForTier,
  isPaidMembershipTier,
  type PaidMembershipTier,
} from '../lib/membershipPlans';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

const resolveOrigin = (event: Parameters<Handler>[0]): string => {
  try {
    if (event.rawUrl) {
      return new URL(event.rawUrl).origin;
    }
  } catch {
    // ignore URL parsing errors and fall back to headers/env below
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

const getAccessToken = (event: Parameters<Handler>[0]): string | null => {
  const authHeader = event.headers?.authorization ?? event.headers?.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
  }

  return null;
};

let cachedStripe: Stripe | null = null;
const getStripe = (): Stripe => {
  if (!cachedStripe) {
    const { STRIPE_SECRET_KEY } = assertEnv();
    cachedStripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }

  return cachedStripe;
};

interface ChangePlanPayload {
  tier?: string;
}

export const handler: Handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'METHOD_NOT_ALLOWED' });
  }

  try {
    const accessToken = getAccessToken(event);
    if (!accessToken) {
      return json(401, { error: 'NOT_AUTHENTICATED' });
    }

    if (!event.body) {
      return json(400, { error: 'INVALID_REQUEST' });
    }

    let payload: ChangePlanPayload;
    try {
      payload = JSON.parse(event.body) as ChangePlanPayload;
    } catch {
      return json(400, { error: 'INVALID_JSON' });
    }

    const requestedTierRaw = typeof payload.tier === 'string' ? payload.tier.trim().toLowerCase() : '';
    if (!isPaidMembershipTier(requestedTierRaw)) {
      return json(400, { error: 'INVALID_TIER' });
    }

    const requestedTier = requestedTierRaw as PaidMembershipTier;
    const priceId = getPriceIdForTier(requestedTier);
    if (!priceId) {
      return json(400, { error: 'PLAN_NOT_AVAILABLE', message: 'Plan not available yet' });
    }

    const { data: userResult, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userResult?.user) {
      console.error('[membership-checkout] unable to resolve Supabase user', userError);
      return json(401, { error: 'NOT_AUTHENTICATED' });
    }

    const profileId = userResult.user.id;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, stripe_customer_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError) {
      console.error('[membership-checkout] failed to load profile', profileError);
      return json(500, { error: 'PROFILE_LOOKUP_FAILED' });
    }

    const email = profile?.email ?? userResult.user.email ?? userResult.user.user_metadata?.email;
    if (!email) {
      return json(400, { error: 'MISSING_EMAIL' });
    }

    const stripe = getStripe();
    let stripeCustomerId = profile?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { supabase_profile_id: profileId },
      });
      stripeCustomerId = customer.id;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', profileId);

      if (updateError) {
        console.error('[membership-checkout] failed to persist stripe_customer_id', updateError);
      }
    }

    if (!stripeCustomerId) {
      return json(500, { error: 'CUSTOMER_CREATION_FAILED' });
    }

    const origin = resolveOrigin(event);
    const tierQuery = encodeURIComponent(requestedTier);
    const successUrl = `${origin}/success/founding-member?checkout=success&session_id={CHECKOUT_SESSION_ID}&newTier=${tierQuery}`;
    const cancelUrl = `${origin}/member/dashboard?checkout=cancelled&newTier=${tierQuery}`;

    // TODO: Support proration / scheduled downgrades when requirements are finalized.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        supabase_profile_id: profileId,
        requested_membership_tier: requestedTier,
      },
      subscription_data: {
        metadata: {
          supabase_profile_id: profileId,
          requested_membership_tier: requestedTier,
        },
      },
    });

    if (!session?.url) {
      console.error('[membership-checkout] session missing URL', { sessionId: session?.id });
      return json(500, { error: 'SESSION_CREATION_FAILED' });
    }

    return json(200, { url: session.url, id: session.id });
  } catch (error) {
    console.error('[membership-checkout] unexpected error', error);
    return json(500, { error: 'INTERNAL_SERVER_ERROR' });
  }
};
