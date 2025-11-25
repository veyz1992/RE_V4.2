import type { Handler } from '@netlify/functions';
import { getSupabaseClient } from '../lib/supabaseServer';

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify(body),
});

export const handler: Handler = async event => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  const profileId = event.queryStringParameters?.profileId;

  if (!profileId) {
    return jsonResponse(400, { error: 'profileId is required' });
  }

  const supabase = getSupabaseClient();

  const [{ data: membership, error: membershipError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from('memberships')
      .select('badge_rating, verification_status')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('company_name, badge_rating, verification_status')
      .eq('id', profileId)
      .maybeSingle(),
  ]);

  if (membershipError && membershipError.code !== 'PGRST116') {
    return jsonResponse(500, { error: 'Database error', details: membershipError.message });
  }

  if (profileError && profileError.code !== 'PGRST116') {
    return jsonResponse(500, { error: 'Database error', details: profileError.message });
  }

  const badgeRating = membership?.badge_rating ?? profile?.badge_rating ?? null;
  const verificationStatus = membership?.verification_status ?? profile?.verification_status ?? null;

  return jsonResponse(200, {
    badge: {
      profile_id: profileId,
      rating: badgeRating,
      status: verificationStatus,
      company_name: profile?.company_name ?? null,
    },
  });
};
