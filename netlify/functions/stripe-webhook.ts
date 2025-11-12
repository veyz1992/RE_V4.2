import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
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

// Create admin client for user management
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

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

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

const upsertProfileWithFields = async (
  email: string,
  fullNameEntered?: string,
  state?: string,
  city?: string,
  stripeCustomerId?: string
) => {
  try {
    // Build update object with only non-empty values
    const updateData: Record<string, string> = {
      email
    };

    if (fullNameEntered?.trim()) {
      updateData.full_name = fullNameEntered.trim();
    }
    if (state?.trim()) {
      updateData.state = state.trim();
    }
    if (city?.trim()) {
      updateData.city = city.trim();
    }
    if (stripeCustomerId?.trim()) {
      updateData.stripe_customer_id = stripeCustomerId.trim();
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(updateData, { 
        onConflict: 'email',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Error upserting profile with fields:', error);
      // Don't throw - this shouldn't break the webhook
      console.log('Profile upsert failed, but continuing webhook processing');
    } else {
      console.log('Successfully upserted profile for email:', email);
    }
  } catch (error) {
    console.error('Failed to upsert profile:', error);
    // Don't throw - this shouldn't break the webhook
  }
};

const updateProfileMembership = async (
  profileId: string,
  tier: string,
  customerId: string,
  subscriptionId: string,
  nextBillingDate: string | null,
) => {
  // Update profiles table with Stripe linkage (no membership_tier field here)
  const profileUpdates: Record<string, string | null> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
  };

  if (nextBillingDate) {
    profileUpdates.next_billing_date = nextBillingDate;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', profileId);

  if (profileError) {
    console.error('Error updating profile:', profileError);
    throw profileError;
  }

  console.log(`Updated profile ${profileId} with Stripe customer ${customerId}`);
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

  if (pending?.id) {
    const { error: updateError } = await supabase
      .from('memberships')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
        tier,
      })
      .eq('id', pending.id);

    if (updateError) {
      console.error('Error activating membership:', updateError);
      throw updateError;
    }
    
    console.log(`Activated membership ${pending.id} for profile ${profileId} with tier ${tier}`);
  } else {
    // Create new membership if no pending one exists
    const { error: createError } = await supabase
      .from('memberships')
      .insert({
        profile_id: profileId,
        tier,
        status: 'active',
        verification_status: 'pending',
        badge_rating: null,
        activated_at: new Date().toISOString(),
      });

    if (createError) {
      console.error('Error creating new membership:', createError);
      throw createError;
    }
    
    console.log(`Created new active membership for profile ${profileId} with tier ${tier}`);
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
      const tier = PRICE_TO_TIER[priceId];
      if (!tier) {
        console.warn(`Unknown price ID: ${priceId}, defaulting to Bronze`);
        return 'Bronze';
      }
      return tier;
    };

    if (stripeEvent.type === 'checkout.session.completed') {
      console.log('Processing checkout.session.completed event:', stripeEvent.id);
      
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const email = session.customer_details?.email || session.customer_email;
      const assessmentId = session.metadata?.assessment_id || null;
      const tier = session.metadata?.intended_tier || 'Founding Member';
      const checkoutId = session.id;
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription?.id;

      console.log('event', stripeEvent.type, { 
        hasEmail: !!email, 
        hasMeta: !!session?.metadata, 
        assessment_id: assessmentId 
      });

      if (!email) {
        console.warn('No email found in session - cannot proceed');
        return jsonResponse(200, { received: true });
      }

      if (!subscriptionId) {
        console.warn('No subscription ID found - cannot proceed');
        return jsonResponse(200, { received: true });
      }

      // Idempotency check - see if we've already processed this subscription
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle();

      if (existingSubscription) {
        console.log('Subscription already processed, returning 200 OK');
        return jsonResponse(200, { received: true, message: 'Already processed' });
      }

      // Create or find Supabase Auth user
      const userId = await findOrCreateAuthUser(email);

      // Upsert profiles table with Auth user ID
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId, 
          email 
        }, { 
          onConflict: 'id' 
        });

      if (profileError) {
        console.error('Error upserting profile:', profileError);
        throw profileError;
      }

      // Get subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const customerId = typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer?.id || '';

      // Upsert memberships table
      const { error: membershipError } = await supabase
        .from('memberships')
        .upsert({
          profile_id: userId,
          tier,
          status: 'active',
          assessment_id: assessmentId
        }, {
          onConflict: 'profile_id'
        });

      if (membershipError) {
        console.error('Error upserting membership:', membershipError);
        throw membershipError;
      }

      // Upsert subscriptions table
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert({
          profile_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          status: subscription.status,
          tier,
          billing_cycle: subscription.items.data[0]?.price?.recurring?.interval || 'month',
          unit_amount_cents: subscription.items.data[0]?.price?.unit_amount || 0,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        }, {
          onConflict: 'stripe_subscription_id'
        });

      if (subscriptionError) {
        console.error('Error upserting subscription:', subscriptionError);
        throw subscriptionError;
      }

      // Link assessment if present
      if (assessmentId) {
        // Update profile with last assessment
        await supabase
          .from('profiles')
          .update({ last_assessment_id: assessmentId })
          .eq('id', userId);

        // Update assessment with user_id if column exists and is nullable
        await supabase
          .from('assessments')
          .update({ user_id: userId })
          .eq('id', assessmentId);
      }

      console.log(`Successfully auto-provisioned account for ${email} with user ID ${userId}`);
    }

    // Handle subscription created/updated
    if (stripeEvent.type === 'customer.subscription.created' || stripeEvent.type === 'customer.subscription.updated') {
      console.log(`Processing ${stripeEvent.type} event:`, stripeEvent.id);
      
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      
      console.log('Subscription event details:', {
        subscriptionId: subscription.id,
        customerId,
        status: subscription.status
      });
      
      // Find profile by stripe_customer_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profileError) {
        console.error('Error finding profile by customer ID:', profileError);
        return jsonResponse(200, { received: true });
      }

      if (profile?.id) {
        const priceId = subscription.items.data[0]?.price?.id;
        const tier = priceId ? getTierFromPriceId(priceId) : 'Bronze';
        
        console.log(`Updating subscription for profile ${profile.id} with tier ${tier}`);
        
        await upsertSubscription(profile.id, {
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          status: subscription.status,
          tier: tier,
          billing_cycle: subscription.items.data[0]?.price?.recurring?.interval || 'month',
          unit_amount_cents: subscription.items.data[0]?.price?.unit_amount || 0,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        });
      } else {
        console.warn(`No profile found for customer ID: ${customerId}`);
      }
    }

    // Handle subscription deleted (cancellation)
    if (stripeEvent.type === 'customer.subscription.deleted') {
      console.log('Processing subscription cancellation:', stripeEvent.id);
      
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      
      console.log('Canceling subscription:', subscription.id);
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'canceled',
          canceled_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        console.error('Error updating canceled subscription:', error);
      } else {
        console.log(`Successfully canceled subscription: ${subscription.id}`);
      }
    }

    // Handle successful payments
    if (stripeEvent.type === 'invoice.payment_succeeded') {
      console.log('Processing successful payment:', stripeEvent.id);
      
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription?.id;

      console.log('Invoice payment succeeded:', {
        invoiceId: invoice.id,
        subscriptionId,
        amount: invoice.amount_paid
      });

      if (subscriptionId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription after successful payment:', error);
        } else {
          console.log(`Updated subscription ${subscriptionId} to active status`);
        }
        
        // Optionally store invoice record
        try {
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('profile_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single();
            
          if (subscription?.profile_id) {
            const { error: invoiceError } = await supabase
              .from('invoices')
              .upsert({
                profile_id: subscription.profile_id,
                subscription_id: null, // Will be set if we have internal subscription ID
                stripe_invoice_id: invoice.id,
                amount_cents: invoice.amount_paid || 0,
                currency: invoice.currency || 'usd',
                status: 'paid',
                hosted_invoice_url: invoice.hosted_invoice_url,
                pdf_url: invoice.invoice_pdf,
                invoice_date: new Date(invoice.created * 1000).toISOString(),
              }, {
                onConflict: 'stripe_invoice_id'
              });
              
            if (invoiceError) {
              console.error('Error storing invoice record:', invoiceError);
            } else {
              console.log(`Stored invoice record for invoice ${invoice.id}`);
            }
          }
        } catch (invoiceStoreError) {
          console.error('Error storing invoice:', invoiceStoreError);
        }
      }
    }

    // Handle failed payments
    if (stripeEvent.type === 'invoice.payment_failed') {
      console.log('Processing failed payment:', stripeEvent.id);
      
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === 'string' 
        ? invoice.subscription 
        : invoice.subscription?.id;

      console.log('Invoice payment failed:', {
        invoiceId: invoice.id,
        subscriptionId,
        amount: invoice.amount_due
      });

      if (subscriptionId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('Error updating subscription after failed payment:', error);
        } else {
          console.log(`Updated subscription ${subscriptionId} to past_due status`);
        }
      }
    }

    return jsonResponse(200, { received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook', error);
    return jsonResponse(500, { error: 'Webhook handling failed' });
  }
};
