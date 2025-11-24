import type { Handler } from '@netlify/functions';
import { supabase } from '../lib/supabaseServer';

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
  body: JSON.stringify(body),
});

type SaveBadgePayload = {
  profileId: string;
  badgeLabel?: string | null;
  rating?: string | number | null;
};

export const handler: Handler = async event => {
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

  let payload: SaveBadgePayload;
  try {
    payload = JSON.parse(event.body);
  } catch (error) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const { profileId, badgeLabel = null, rating = null } = payload;

  if (!profileId) {
    return jsonResponse(400, { error: 'profileId is required' });
  }

  const badgeRating = badgeLabel ?? (rating !== null && rating !== undefined ? String(rating) : null);

  const [membershipResult, profileResult] = await Promise.all([
    supabase
      .from('memberships')
      .update({ badge_rating: badgeRating })
      .eq('profile_id', profileId)
      .select('id, badge_rating')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .update({ badge_rating: badgeRating })
      .eq('id', profileId)
      .select('id, badge_rating')
      .maybeSingle(),
  ]);

  if (membershipResult.error) {
    return jsonResponse(500, { error: 'Database error', details: membershipResult.error.message });
  }

  if (profileResult.error) {
    return jsonResponse(500, { error: 'Database error', details: profileResult.error.message });
  }

  return jsonResponse(200, {
    badge: {
      profile_id: profileId,
      badge_rating: badgeRating,
      membership_id: membershipResult.data?.id ?? null,
    },
  });
};
