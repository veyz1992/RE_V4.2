import type { Handler } from '@netlify/functions';
import { BadgeStatus } from '../../src/lib/badges';
import { supabase } from '../lib/supabaseServer';

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

type AdminSaveBadgePayload = {
  profileId: string;
  designConfig: unknown;
  status?: BadgeStatus;
  badgeLabel?: string | null;
  rating?: number | null;
};

export const handler: Handler = async event => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, {});
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'METHOD_NOT_ALLOWED' });
  }

  if (!event.body) {
    return jsonResponse(400, { error: 'INVALID_PAYLOAD' });
  }

  let payload: AdminSaveBadgePayload;
  try {
    payload = JSON.parse(event.body);
  } catch (error) {
    console.error('[admin-save-badge] json_parse_error', error);
    return jsonResponse(400, { error: 'INVALID_PAYLOAD' });
  }

  const { profileId, designConfig, status, badgeLabel = null, rating = null } = payload;

  if (!profileId || typeof profileId !== 'string' || !designConfig) {
    return jsonResponse(400, { error: 'MISSING_REQUIRED_FIELDS' });
  }

  const statusValue: BadgeStatus = status ?? 'draft';

  try {
    const { data, error } = await supabase
      .from('badge_designs')
      .upsert(
        {
          profile_id: profileId,
          design_config: designConfig,
          status: statusValue,
          badge_label: badgeLabel,
          rating,
          version: 1,
          // TODO: enforce single active badge per profile before setting status to "active".
        },
        { returning: 'representation' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[admin-save-badge] upsert_error', error);
      return jsonResponse(500, { error: 'DB_ERROR' });
    }

    return jsonResponse(200, { badge: data });
  } catch (err) {
    console.error('[admin-save-badge] unhandled_error', err);
    return jsonResponse(500, { error: 'INTERNAL_ERROR' });
  }
};
