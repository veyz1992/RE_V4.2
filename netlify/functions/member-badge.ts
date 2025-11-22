import type { Handler } from '@netlify/functions';
import { mapRowToMemberBadgeView } from '../../src/lib/badges';
import { supabase } from '../lib/supabaseServer';

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  },
  body: JSON.stringify(body),
});

export const handler: Handler = async event => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' });
  }

  const profileId = event.queryStringParameters?.profileId || event.queryStringParameters?.profile_id;

  if (!profileId || typeof profileId !== 'string') {
    return jsonResponse(400, { error: 'MISSING_PROFILE_ID' });
  }

  try {
    const { data, error } = await supabase
      .from('badge_designs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('[member-badge] query_error', error);
      return jsonResponse(500, { error: 'DB_ERROR' });
    }

    const badge = mapRowToMemberBadgeView(data ?? null);

    return jsonResponse(200, { badge });
  } catch (err) {
    console.error('[member-badge] unhandled_error', err);
    return jsonResponse(500, { error: 'INTERNAL_ERROR' });
  }
};
