import type { Handler } from '@netlify/functions';
import { supabase } from '../lib/supabaseServer';

// TODO: Validate admin auth from Authorization header before allowing updates
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
};

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});

const toNullIfEmpty = (v: any) => (v === '' || v === undefined ? null : v);

export const handler: Handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'PUT') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  let payload: any = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  if (!payload.profileId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'profileId is required' }),
    };
  }

  const update: any = {};

  if ('companyName' in payload) update.company_name = toNullIfEmpty(payload.companyName);
  if ('fullName' in payload) update.full_name = toNullIfEmpty(payload.fullName);
  if ('email' in payload) update.email = toNullIfEmpty(payload.email);
  if ('city' in payload) update.city = toNullIfEmpty(payload.city);
  if ('state' in payload) update.state = toNullIfEmpty(payload.state);
  if ('phone' in payload) update.phone = toNullIfEmpty(payload.phone);
  if ('membershipTier' in payload) update.membership_tier = toNullIfEmpty(payload.membershipTier);
  if ('memberStatus' in payload) update.member_status = toNullIfEmpty(payload.memberStatus);
  if ('verificationStatus' in payload) update.verification_status = toNullIfEmpty(payload.verificationStatus);
  if ('badgeRating' in payload) update.badge_rating = toNullIfEmpty(payload.badgeRating);
  if ('websiteUrl' in payload) update.website_url = toNullIfEmpty(payload.websiteUrl);

  if (Object.keys(update).length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No fields to update' }),
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .select()
    .eq('id', payload.profileId)
    .single();

  if (error) {
    console.error('admin-update-member supabase error', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update profile',
        details: error.message,
        code: error.code,
      }),
    };
  }

  if ('badgeRating' in payload) {
    const badgeRating = toNullIfEmpty(payload.badgeRating);
    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select('id')
      .eq('profile_id', payload.profileId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!membershipError && memberships && memberships.length > 0) {
      const latestMembershipId = memberships[0].id;
      const { error: updateMembershipError } = await supabase
        .from('memberships')
        .update({ badge_rating: badgeRating })
        .eq('id', latestMembershipId);
      if (updateMembershipError) {
        console.error('Failed to update membership badge_rating', updateMembershipError);
      }
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ profile: data }),
  };
};
