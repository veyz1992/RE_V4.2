import type { Handler } from '@netlify/functions';
import { mapRowToMemberBadgeView, type BadgeDesignRow } from '../../src/lib/badges';
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

  const { data, error } = await supabase
    .from<BadgeDesignRow>('badge_designs')
    .select('*')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return jsonResponse(500, { error: 'Database error', details: error.message });
  }

  const view = mapRowToMemberBadgeView(data, null);
  return jsonResponse(200, { badge: view });
};
