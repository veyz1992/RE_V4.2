import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables');
}

// Initialize Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
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
  body: string | null;
  isBase64Encoded?: boolean;
};

type Context = unknown;

type HandlerResult = Promise<{
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
}>;

export const handler = async (event: Event, _context: Context) => {
  // Handle CORS preflight
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

  let payload: { email?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { email } = payload;

  if (!email || typeof email !== 'string') {
    return jsonResponse(400, { error: 'Valid email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return jsonResponse(400, { error: 'Valid email is required' });
  }

  console.log(`Checking email eligibility: ${normalizedEmail}`);

  try {
    // Step 1: Check if user exists in auth.users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return jsonResponse(500, { error: 'Failed to check user status' });
    }

    const existingUser = existingUsers.users.find((user: any) => 
      user.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      const userId = existingUser.id;
      console.log(`Found existing user: ${userId}`);

      // Step 2: Check for active subscription
      const { data: subscription, error: subError } = await supabaseAdmin
        .from('subscriptions')
        .select('status, stripe_subscription_id')
        .eq('profile_id', userId)
        .in('status', ['active', 'trialing', 'past_due']) // Include past_due as still "active"
        .maybeSingle();

      if (subError) {
        console.error('Error checking subscription:', subError);
        return jsonResponse(500, { error: 'Failed to check subscription status' });
      }

      if (subscription) {
        console.log(`User ${userId} has active subscription: ${subscription.stripe_subscription_id}`);
        return jsonResponse(200, { 
          eligible: false, 
          reason: 'member',
          message: 'This email is already a member with an active subscription.'
        });
      }

      // User exists but no active subscription - they can take assessment again
      console.log(`User ${userId} exists but no active subscription found`);
    }

    // Step 3: Check for recent assessment (within 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentAssessment, error: assessmentError } = await supabaseAdmin
      .from('assessments')
      .select('id, created_at')
      .eq('email_entered', normalizedEmail)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessmentError) {
      console.error('Error checking recent assessments:', assessmentError);
      // Don't fail the request for this - just proceed without this check
    }

    if (recentAssessment) {
      console.log(`Found recent assessment for ${normalizedEmail}: ${recentAssessment.id} (${recentAssessment.created_at})`);
      return jsonResponse(200, { 
        eligible: false, 
        reason: 'recent-assessment',
        message: 'You have recently completed an assessment. Please check your inbox or contact support.',
        assessmentDate: recentAssessment.created_at
      });
    }

    // All checks passed - user is eligible
    console.log(`Email ${normalizedEmail} is eligible for new assessment`);
    return jsonResponse(200, { 
      eligible: true,
      message: 'Email is eligible for assessment'
    });

  } catch (error) {
    console.error('Error in email eligibility check:', error);
    return jsonResponse(500, { 
      error: 'Internal server error during eligibility check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};