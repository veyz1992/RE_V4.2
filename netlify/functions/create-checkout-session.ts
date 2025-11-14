import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { assertEnv } from '../lib/assertEnv';
import { supabase } from '../lib/supabaseServer';

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const parseId = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const parseEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
};

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

let stripeClient: Stripe | null = null;
let cachedPriceId: string | null = null;

const getStripe = () => {
  if (!stripeClient) {
    const { STRIPE_SECRET_KEY, PRICE_ID_FOUNDING_MEMBER } = assertEnv();
    stripeClient = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    cachedPriceId = PRICE_ID_FOUNDING_MEMBER;
  }

  if (!cachedPriceId) {
    const { PRICE_ID_FOUNDING_MEMBER } = assertEnv();
    cachedPriceId = PRICE_ID_FOUNDING_MEMBER;
  }

  return { stripe: stripeClient as Stripe, priceId: cachedPriceId as string };
};

export const handler: Handler = async event => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return json(200, { ok: true });
    }

    if (event.httpMethod !== 'POST') {
      return json(405, { error: 'METHOD_NOT_ALLOWED' });
    }

    if (!event.body) {
      return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(event.body);
    } catch {
      return json(400, { error: 'INVALID_JSON' });
    }

    const { stripe, priceId } = getStripe();

    let assessmentId = parseId(payload.assessment_id ?? payload.assessmentId);
    let profileId = parseId(payload.profile_id ?? payload.profileId);
    let email = parseEmail(payload.email);

    let profileRecord: { id: string; email: string | null; stripe_customer_id: string | null } | null = null;
    let assessmentRecord: { id: string; profile_id: string | null; email_entered: string | null } | null = null;

    if (profileId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, stripe_customer_id')
        .eq('id', profileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        profileRecord = data;
        email = email ?? parseEmail(data.email);
      }
    }

    if (assessmentId) {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, profile_id, email_entered')
        .eq('id', assessmentId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        assessmentRecord = data;
        profileId = profileId ?? parseId(data.profile_id);
        email = email ?? parseEmail(data.email_entered);
      }
    }

    if (!profileRecord && profileId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, stripe_customer_id')
        .eq('id', profileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        profileRecord = data;
        email = email ?? parseEmail(data.email);
      }
    }

    if (!assessmentRecord && profileId) {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, profile_id, email_entered')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        assessmentRecord = data;
        assessmentId = assessmentId ?? parseId(data.id);
        email = email ?? parseEmail(data.email_entered);
      }
    }

    if (!profileRecord && email) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, stripe_customer_id')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        profileRecord = data;
        profileId = parseId(data.id);
      }
    }

    if (!assessmentRecord && email) {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, profile_id, email_entered')
        .eq('email_entered', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        assessmentRecord = data;
        assessmentId = assessmentId ?? parseId(data.id);
        profileId = profileId ?? parseId(data.profile_id);
        email = email ?? parseEmail(data.email_entered);
      }
    }

    if (!assessmentId || !profileId || !email) {
      return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
    }

    if (!profileRecord) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, stripe_customer_id')
        .eq('id', profileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        profileRecord = data;
      }
    }

    if (!profileRecord) {
      return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
    }

    const normalizedEmail = parseEmail(email);
    if (!normalizedEmail) {
      return json(400, { error: 'MISSING_REQUIRED_FIELDS' });
    }

    let stripeCustomerId = profileRecord.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: normalizedEmail });
      stripeCustomerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', profileId);
    }

    const origin = resolveOrigin(event);

    const defaultSuccessUrl = `${origin}/success/founding-member?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const successUrlPayload =
      typeof payload.success_url === 'string' && payload.success_url.trim().length > 0
        ? payload.success_url.trim()
        : typeof payload.successUrl === 'string' && payload.successUrl.trim().length > 0
          ? payload.successUrl.trim()
          : defaultSuccessUrl;

    const defaultCancelUrl = `${origin}/results?checkout=cancelled`;
    const cancelUrlPayload =
      typeof payload.cancel_url === 'string' && payload.cancel_url.trim().length > 0
        ? payload.cancel_url.trim()
        : typeof payload.cancelUrl === 'string' && payload.cancelUrl.trim().length > 0
          ? payload.cancelUrl.trim()
          : defaultCancelUrl;

    console.log('[create-checkout-session] resolved redirect URLs', {
      successUrl: successUrlPayload,
      cancelUrl: cancelUrlPayload,
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrlPayload,
      cancel_url: cancelUrlPayload,
      metadata: {
        profile_id: profileId,
        assessment_id: assessmentId,
        email: normalizedEmail,
      },
    });

    if (!session?.url || !session.id) {
      console.error('[create-checkout-session] missing session URL', { sessionId: session?.id });
      return json(500, { error: 'SESSION_CREATION_FAILED' });
    }

    return json(200, { id: session.id, url: session.url });
  } catch (error) {
    console.error('[create-checkout-session] error', error);
    return json(500, { error: 'CHECKOUT_SESSION_FAILED' });
  }
};
