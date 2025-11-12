import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { TIER_CONFIG } from '../../constants';

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

// Environment variables for Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Environment variables for Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
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

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-12-18',
});

// Initialize Supabase clients
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Build price mapping from centralized config
const PRICE_IDS: Record<string, string> = {};
Object.entries(TIER_CONFIG).forEach(([tierName, config]) => {
  const envValue = process.env[config.stripeEnvKey];
  if (!envValue) {
    throw new Error(`Missing environment variable: ${config.stripeEnvKey}`);
  }
  PRICE_IDS[tierName] = envValue;
});

const PRICE_TO_TIER = Object.fromEntries(
  Object.entries(PRICE_IDS).map(([tier, priceId]) => [priceId, tier]),
) as Record<string, string>;

// Utility functions
const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const getTierFromPriceId = (priceId: string): string => {
  const tier = PRICE_TO_TIER[priceId];
  if (!tier) {
    console.warn(`Unknown price ID: ${priceId}, defaulting to Bronze`);
    return 'Bronze';
  }
  return tier;
};

// Idempotency check using Stripe event ID
const isEventProcessed = async (eventId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('processed_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .maybeSingle();
  
  return !!data;
};

const markEventAsProcessed = async (eventId: string): Promise<void> => {
  await supabase
    .from('processed_events')
    .insert({ 
      stripe_event_id: eventId,
      processed_at: new Date().toISOString()
    })
    .onConflict('stripe_event_id')
    .ignoreDuplicates();
};

// Find or create Supabase Auth user
const findOrCreateAuthUser = async (email: string): Promise<string> => {
  // First try to find existing user
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    throw listError;
  }

  const existingUser = existingUsers.users.find(user => user.email === email);
  
  if (existingUser) {
    console.log('Found existing auth user:', existingUser.id);
    return existingUser.id;
  }

  // Create new user if not found
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { source: 'stripe' }
  });

  if (createError) {
    console.error('Error creating auth user:', createError);
    throw createError;
  }

  if (!newUser.user) {
    throw new Error('Failed to create auth user - no user returned');
  }

  console.log('Created new auth user:', newUser.user.id);
  return newUser.user.id;
};

// Upsert profile with Stripe data
const upsertProfile = async (
  userId: string,
  email: string,
  stripeCustomerId?: string,
  customerData?: Stripe.Customer
): Promise<void> => {
  const profileData: any = {
    id: userId,
    email,
    stripe_customer_id: stripeCustomerId,
    updated_at: new Date().toISOString()
  };

  // Add customer data if available
  if (customerData) {
    if (customerData.name) {
      profileData.full_name = customerData.name;
    }
    if (customerData.address?.city) {
      profileData.city = customerData.address.city;
    }
    if (customerData.address?.state) {
      profileData.state = customerData.address.state;
    }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(profileData, { 
      onConflict: 'id'
    });

  if (error) {
    console.error('Error upserting profile:', error);
    throw error;
  }

  console.log('Successfully upserted profile for user:', userId);
};

// Upsert membership
const upsertMembership = async (
  profileId: string,
  tier: string,
  status: 'active' | 'inactive' | 'pending' = 'active',
  assessmentId?: string
): Promise<void> => {
  const membershipData: any = {
    profile_id: profileId,
    tier,
    status,
    updated_at: new Date().toISOString()
  };

  if (assessmentId) {
    membershipData.assessment_id = assessmentId;
  }

  if (status === 'active') {
    membershipData.activated_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('memberships')
    .upsert(membershipData, {
      onConflict: 'profile_id'
    });

  if (error) {
    console.error('Error upserting membership:', error);
    throw error;
  }

  console.log(`Successfully upserted membership for profile ${profileId} with tier ${tier}`);
};

// Upsert subscription with full Stripe data
const upsertSubscription = async (
  profileId: string,
  subscription: Stripe.Subscription
): Promise<void> => {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) : 'Bronze';

  const subscriptionData = {
    profile_id: profileId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    status: subscription.status,
    tier,
    unit_amount_cents: subscription.items.data[0]?.price?.unit_amount || 0,
    billing_cycle: subscription.items.data[0]?.price?.recurring?.interval || 'month',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'stripe_subscription_id'
    });

  if (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }

  console.log(`Successfully upserted subscription ${subscription.id} for profile ${profileId}`);
};

// Insert invoice record
const insertInvoice = async (
  profileId: string,
  invoice: Stripe.Invoice
): Promise<void> => {
  const invoiceData = {
    profile_id: profileId,
    stripe_invoice_id: invoice.id,
    subscription_stripe_id: typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id,
    amount_cents: invoice.amount_paid || 0,
    amount_due_cents: invoice.amount_due || 0,
    currency: invoice.currency || 'usd',
    status: invoice.status || 'draft',
    hosted_invoice_url: invoice.hosted_invoice_url,
    pdf_url: invoice.invoice_pdf,
    invoice_date: new Date(invoice.created * 1000).toISOString(),
    due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
    paid_at: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() : null,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('invoices')
    .upsert(invoiceData, {
      onConflict: 'stripe_invoice_id'
    });

  if (error) {
    console.error('Error inserting invoice:', error);
    throw error;
  }

  console.log(`Successfully inserted invoice ${invoice.id} for profile ${profileId}`);
};

// Handle payment method attachment
const handlePaymentMethodAttached = async (paymentMethod: Stripe.PaymentMethod): Promise<void> => {
  const customerId = typeof paymentMethod.customer === 'string' ? paymentMethod.customer : paymentMethod.customer?.id;
  
  if (!customerId) {
    console.warn('Payment method has no customer, skipping');
    return;
  }

  // Find profile by stripe_customer_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!profile) {
    console.warn(`No profile found for customer ID: ${customerId}`);
    return;
  }

  // Update profile with payment method details if it's a card
  if (paymentMethod.type === 'card' && paymentMethod.card) {
    const { error } = await supabase
      .from('profiles')
      .update({
        payment_method_brand: paymentMethod.card.brand,
        payment_method_last4: paymentMethod.card.last4,
        payment_method_exp_month: paymentMethod.card.exp_month,
        payment_method_exp_year: paymentMethod.card.exp_year,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (error) {
      console.error('Error updating payment method:', error);
    } else {
      console.log(`Updated payment method for profile ${profile.id}`);
    }
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
    // Idempotency check
    if (await isEventProcessed(stripeEvent.id)) {
      console.log(`Event ${stripeEvent.id} already processed, returning 200 OK`);
      return jsonResponse(200, { received: true, message: 'Already processed' });
    }

    console.log(`Processing Stripe event: ${stripeEvent.type} (${stripeEvent.id})`);

    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        const email = session.customer_details?.email || session.customer_email;
        const assessmentId = session.metadata?.assessment_id || null;
        const tier = session.metadata?.intended_tier || 'Founding Member';
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : session.subscription?.id;
        const customerId = typeof session.customer === 'string' 
          ? session.customer 
          : session.customer?.id;

        if (!email) {
          console.warn('No email found in checkout session');
          break;
        }

        if (!subscriptionId) {
          console.warn('No subscription ID found in checkout session');
          break;
        }

        // Create/find auth user and profile
        const userId = await findOrCreateAuthUser(email);
        
        // Get customer data for additional profile info
        let customerData: Stripe.Customer | undefined;
        if (customerId) {
          try {
            customerData = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          } catch (error) {
            console.warn('Could not retrieve customer data:', error);
          }
        }

        await upsertProfile(userId, email, customerId, customerData);
        
        // Get subscription data
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Upsert membership and subscription
        await upsertMembership(userId, tier, 'active', assessmentId || undefined);
        await upsertSubscription(userId, subscription);

        console.log(`Successfully processed checkout completion for ${email}`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

        // Find profile by stripe_customer_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (!profile) {
          console.warn(`No profile found for customer ID: ${customerId}`);
          break;
        }

        await upsertSubscription(profile.id, subscription);

        // Update membership status based on subscription status
        const membershipStatus = subscription.status === 'active' ? 'active' : 'inactive';
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = priceId ? getTierFromPriceId(priceId) : 'Bronze';
        
        await upsertMembership(profile.id, tier, membershipStatus);

        console.log(`Successfully processed subscription ${stripeEvent.type} for profile ${profile.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;

        // Update subscription status
        const { error } = await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating canceled subscription:', error);
        } else {
          console.log(`Successfully canceled subscription: ${subscription.id}`);
        }

        // Update membership status to inactive
        const { data: subscriptionRecord } = await supabase
          .from('subscriptions')
          .select('profile_id')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();

        if (subscriptionRecord) {
          await supabase
            .from('memberships')
            .update({ 
              status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('profile_id', subscriptionRecord.profile_id);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;

        // Find profile by subscription
        let profileId: string | null = null;
        if (subscriptionId) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('profile_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();
          
          profileId = subscription?.profile_id || null;
          
          // Update subscription status to active
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscriptionId);
        }

        // Insert invoice record
        if (profileId) {
          await insertInvoice(profileId, invoice);
        }

        console.log(`Successfully processed payment succeeded for invoice ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;

        // Find profile by subscription
        let profileId: string | null = null;
        if (subscriptionId) {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('profile_id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();
          
          profileId = subscription?.profile_id || null;
          
          // Update subscription status to past_due
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'past_due',
              updated_at: new Date().toISOString()
            })
            .eq('stripe_subscription_id', subscriptionId);
        }

        // Insert invoice record
        if (profileId) {
          await insertInvoice(profileId, invoice);
        }

        console.log(`Successfully processed payment failed for invoice ${invoice.id}`);
        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = stripeEvent.data.object as Stripe.PaymentMethod;
        await handlePaymentMethodAttached(paymentMethod);
        
        console.log(`Successfully processed payment method attached: ${paymentMethod.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    // Mark event as processed
    await markEventAsProcessed(stripeEvent.id);

    return jsonResponse(200, { received: true });
  } catch (error) {
    console.error(`Error processing Stripe webhook ${stripeEvent.id}:`, error instanceof Error ? error.message : 'Unknown error');
    return jsonResponse(500, { error: 'Webhook handling failed' });
  }
};