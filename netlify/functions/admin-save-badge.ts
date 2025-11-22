import type { Handler } from '@netlify/functions';
import { type BadgeDesignRow, type BadgeDesignStatus } from '../../src/lib/badges';
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
  designConfig: unknown;
  status?: BadgeDesignStatus;
  badgeLabel?: string | null;
  rating?: number | null;
  imageLightUrl?: string | null;
  imageDarkUrl?: string | null;
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

  const {
    profileId,
    designConfig,
    status = 'draft',
    badgeLabel = null,
    rating = null,
    imageLightUrl = null,
    imageDarkUrl = null,
  } = payload;

  if (!profileId || !designConfig) {
    return jsonResponse(400, { error: 'profileId and designConfig are required' });
  }

  const { data, error } = await supabase
    .from<BadgeDesignRow>('badge_designs')
    .insert({
      profile_id: profileId,
      status,
      design_config: designConfig,
      badge_label: badgeLabel ?? null,
      rating: rating ?? null,
      image_light_url: imageLightUrl ?? null,
      image_dark_url: imageDarkUrl ?? null,
      embed_code_version: 'v1',
    })
    .select('*')
    .single();

  if (error) {
    return jsonResponse(500, { error: 'Database error', details: error.message });
  }

  // TODO: Add logic to update existing rows and enforce active transitions

  return jsonResponse(200, { badge: data });
};
