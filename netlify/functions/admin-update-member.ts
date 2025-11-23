import type { Handler } from '@netlify/functions';
import { supabase } from '../lib/supabaseServer';

// TODO: Validate admin auth from Authorization header before allowing updates
const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  },
  body: JSON.stringify(body),
});

interface UpdateMemberPayload {
  profileId: string;
  companyName?: string | null;
  fullName?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  membershipTier?: string | null;
  memberStatus?: string | null;
  verificationStatus?: string | null;
  badgeRating?: string | null;
  websiteUrl?: string | null;
}

const selectFields =
  'id, company_name, full_name, email, city, state, membership_tier, member_status, verification_status, badge_rating, created_at, phone_number, website_url';

export const handler: Handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'PUT') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  if (!event.body) {
    return jsonResponse(400, { error: 'Missing request body' });
  }

  let payload: UpdateMemberPayload;
  try {
    payload = JSON.parse(event.body);
  } catch (error) {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }

  const {
    profileId,
    companyName,
    fullName,
    email,
    city,
    state,
    phone,
    membershipTier,
    memberStatus,
    verificationStatus,
    badgeRating,
    websiteUrl,
  } = payload;

  if (!profileId) {
    return jsonResponse(400, { error: 'profileId is required' });
  }

  const update: Record<string, string | null> = {};

  const addIfDefined = (key: string, value: string | null | undefined) => {
    if (value !== undefined) {
      update[key] = value;
    }
  };

  addIfDefined('company_name', companyName ?? null);
  addIfDefined('full_name', fullName ?? null);
  addIfDefined('email', email ?? null);
  addIfDefined('city', city ?? null);
  addIfDefined('state', state ?? null);
  addIfDefined('phone_number', phone ?? null);
  addIfDefined('membership_tier', membershipTier ?? null);
  addIfDefined('member_status', memberStatus ?? null);
  addIfDefined('verification_status', verificationStatus ?? null);
  addIfDefined('badge_rating', badgeRating ?? null);
  addIfDefined('website_url', websiteUrl ?? null);

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', profileId)
    .select(selectFields)
    .single();

  if (error) {
    console.error('[admin-update-member] failed to update profile', error);
    return jsonResponse(500, { error: 'Failed to update profile' });
  }

  return jsonResponse(200, { profile: data });
};
