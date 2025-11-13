import { serviceRoleClient } from '../lib/supabaseServer.js';

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
  try {
    // Validate required env vars
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.VITE_SUPABASE_ANON_KEY) {
      console.error('[check-email-eligibility] Missing required environment variables');
      return jsonResponse(500, { error: 'Missing server configuration' });
    }

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

    // Step 1: Check if user exists in auth.users
    const { data: existingUsers, error: listError } = await serviceRoleClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('[check-email-eligibility] step:list_users_error', { error: listError });
      return jsonResponse(500, { eligible: false, error: 'Database error' });
    }

    const existingUser = existingUsers.users.find((user: any) => 
      user.email?.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      const userId = existingUser.id;
      console.log('[check-email-eligibility] step:user_found', { userId });

      // Step 2: Check for active subscription
      const { data: subscription, error: subError } = await serviceRoleClient
        .from('subscriptions')
        .select('status, stripe_subscription_id')
        .eq('profile_id', userId)
        .in('status', ['active', 'trialing', 'past_due']) // Include past_due as still "active"
        .maybeSingle();

      if (subError) {
        console.error('[check-email-eligibility] step:subscription_check_error', { error: subError });
        return jsonResponse(500, { eligible: false, error: 'Database error' });
      }

      if (subscription) {
        console.log('[check-email-eligibility] step:active_subscription', { 
          userId, 
          subscriptionId: subscription.stripe_subscription_id,
          context: process.env.CONTEXT
        });
        return jsonResponse(200, { 
          eligible: false, 
          reason: 'member',
          message: 'This email is already a member with an active subscription.'
        });
      }

      console.log('[check-email-eligibility] step:user_no_subscription', { userId });
    }

    // Step 3: Check for recent assessment (within 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentAssessment, error: assessmentError } = await serviceRoleClient
      .from('assessments')
      .select('id, created_at')
      .eq('email_entered', normalizedEmail)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessmentError) {
      console.error('[check-email-eligibility] step:assessment_check_error', { error: assessmentError });
      // Don't fail the request for this - just proceed without this check
    }

    if (recentAssessment) {
      console.log('[check-email-eligibility] step:recent_assessment', { 
        assessmentId: recentAssessment.id,
        createdAt: recentAssessment.created_at,
        context: process.env.CONTEXT
      });
      return jsonResponse(200, { 
        eligible: false, 
        reason: 'recent-assessment',
        message: 'You have recently completed an assessment. Please check your inbox or contact support.',
        assessmentDate: recentAssessment.created_at
      });
    }

    // All checks passed - user is eligible
    console.log('[check-email-eligibility] step:eligible', { 
      email: normalizedEmail,
      context: process.env.CONTEXT
    });
    return jsonResponse(200, { 
      eligible: true,
      message: 'Email is eligible for assessment'
    });

  } catch (error) {
    console.error('[check-email-eligibility] step:unhandled_error', { 
      error: error,
      context: process.env.CONTEXT
    });
    return jsonResponse(500, { 
      eligible: false,
      error: 'Internal server error'
    });
  }
};