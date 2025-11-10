import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable.');
}

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
}

if (!webhookSecret) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18',
});

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const PRICE_IDS: Record<string, string> = {
  Bronze: process.env.STRIPE_PRICE_BRONZE!,
  Silver: process.env.STRIPE_PRICE_SILVER!,
  Gold: process.env.STRIPE_PRICE_GOLD!,
  'Founding Member': process.env.STRIPE_PRICE_FOUNDING_MEMBER!,
};

const PRICE_TO_TIER = Object.fromEntries(
  Object.entries(PRICE_IDS).map(([tier, priceId]) => [priceId, tier]),
) as Record<string, string>;

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const ensureProfileForEmail = async (email: string) => {
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existing?.id) {
    return existing.id as string;
  }

  const generatedId = randomUUID();

  const { data: inserted, error: insertError } = await supabase
    .from('profiles')
    .insert({ id: generatedId, email })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return inserted.id as string;
};

const updateProfileMembership = async (
  profileId: string,
  tier: string,
  customerId: string,
  subscriptionId: string,
  nextBillingDate: string | null,
) => {
  const updates: Record<string, string | null> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    membership_tier: tier,
  };

  if (nextBillingDate) {
    updates.next_billing_date = nextBillingDate;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId);

  if (error) {
    throw error;
  }
};

const activatePendingMembership = async (profileId: string, tier: string) => {
  const { data: pending, error: pendingError } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', profileId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError && pendingError.code !== 'PGRST116') {
    throw pendingError;
  }

  if (!pending?.id) {
    return;
  }

  const { error: updateError } = await supabase
    .from('memberships')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
      tier,
    })
    .eq('id', pending.id);

  if (updateError) {
    throw updateError;
  }
};

export const handler = async (event: Event, _context: Context): HandlerResult => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  if (!event.body) {
    return jsonResponse(400, { error: 'Missing request body' });
  }

  const signature = event.headers['stripe-signature'];
  if (!signature) {
    return jsonResponse(400, { error: 'Missing Stripe signature header' });
  }

  const payload = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error);
    return jsonResponse(400, { error: 'Invalid signature' });
  }

  try {
    // Helper function to create/update subscriptions table
    const upsertSubscription = async (
      profileId: string,
      subscriptionData: {
        stripe_subscription_id: string;
        stripe_customer_id: string;
        status: string;
        tier: string;
        billing_cycle: string;
        unit_amount_cents: number;
        current_period_start: string;
        current_period_end: string;
      }
    ) => {
      try {
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            profile_id: profileId,
            stripe_subscription_id: subscriptionData.stripe_subscription_id,
            stripe_customer_id: subscriptionData.stripe_customer_id,
            status: subscriptionData.status,
            tier: subscriptionData.tier,
            billing_cycle: subscriptionData.billing_cycle,
            unit_amount_cents: subscriptionData.unit_amount_cents,
            current_period_start: subscriptionData.current_period_start,
            current_period_end: subscriptionData.current_period_end,
          }, {
            onConflict: 'stripe_subscription_id'
          });

        if (error) {
          console.error('Error upserting subscription:', error);
          throw error;
        }
        console.log('Successfully upserted subscription for profile:', profileId);
      } catch (error) {
        console.error('Failed to upsert subscription:', error);
        throw error;
      }
    };

    // Helper function to get tier from price ID
    const getTierFromPriceId = (priceId: string): string => {
      const tierEntry = Object.entries(PRICE_IDS).find(([_, id]) => id === priceId);
      return tierEntry ? tierEntry[0] : 'Bronze'; // Default fallback
    };

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email ?? session.customer_email ?? undefined;
      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

      if (!email || !customerId || !subscriptionId) {
        console.warn('Missing key Stripe session details', {
          email,
          customerId,
          subscriptionId,
        });
        return jsonResponse(200, { received: true });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      const tierFromPrice = priceId ? PRICE_TO_TIER[priceId] : undefined;
      const tier = tierFromPrice ?? session.metadata?.tier ?? 'Bronze';

      const nextRenewal = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString().split('T')[0]
        : null;

      const profileId = await ensureProfileForEmail(email);
      await updateProfileMembership(profileId, tier, customerId, subscriptionId, nextRenewal);
      await activatePendingMembership(profileId, tier);

      // Create subscription entry
      await upsertSubscription(profileId, {
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: subscription.status,
        tier: tier as any, // Assuming tier enum matches
        billing_cycle: subscription.items.data[0]?.price?.recurring?.interval || 'month',
        unit_amount_cents: subscription.items.data[0]?.price?.unit_amount || 0,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });
    }

    // Handle subscription created/updated
    if (stripeEvent.type === 'customer.subscription.created' || stripeEvent.type === 'customer.subscription.updated') {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      
      // Find profile by stripe_customer_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile?.id) {
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = priceId ? getTierFromPriceId(priceId) : 'Bronze';
        
        await upsertSubscription(profile.id, {
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          tier: tier as any,
          billing_cycle: subscription.items.data[0]?.price?.recurring?.interval || 'month',
          unit_amount_cents: subscription.items.data[0]?.price?.unit_amount || 0,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
      }
    }

    // Handle subscription deleted (cancellation)
    if (stripeEvent.type === 'customer.subscription.deleted') {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled' })
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        console.error('Error updating canceled subscription:', error);
      }
    }

    // Handle successful payments
    if (stripeEvent.type === 'invoice.payment_succeeded') {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription?.id;

      if (subscriptionId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription after successful payment:', error);
        }
      }
    }

    // Handle failed payments
    if (stripeEvent.type === 'invoice.payment_failed') {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription?.id;

      if (subscriptionId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription after failed payment:', error);
        }
      }
    }

    return jsonResponse(200, { received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook', error);
    return jsonResponse(500, { error: 'Webhook handling failed' });
  }
};
