import type { Handler } from '@netlify/functions';
import { supabase } from '../lib/supabaseServer';

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  },
  body: JSON.stringify(body),
});

interface ProfileRow {
  id: string;
  company_name: string | null;
  full_name: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  member_status: string | null;
  verification_status: string | null;
  badge_rating: string | null;
  created_at: string | null;
  memberships?: {
    tier: string | null;
    status: string | null;
    activated_at: string | null;
    badge_rating?: string | null;
  }[];
}

interface AdminMember {
  id: string;
  businessName: string;
  primaryContact: string | null;
  email: string | null;
  location: string | null;
  tier: string | null;
  status: string | null;
  verificationStatus: string | null;
  badgeRating: string | null;
  joinDate: string | null;
}

const selectFields =
  'id, company_name, full_name, email, city, state, member_status, verification_status, badge_rating, created_at, memberships(tier, status, activated_at, badge_rating)';

const mapProfileToAdminMember = (profile: ProfileRow): AdminMember => {
  const membership = Array.isArray(profile.memberships)
    ? [...profile.memberships].sort((a, b) => {
        const aDate = a.activated_at ? new Date(a.activated_at).getTime() : 0;
        const bDate = b.activated_at ? new Date(b.activated_at).getTime() : 0;
        return bDate - aDate;
      })[0]
    : undefined;

  const location = profile.city && profile.state
    ? `${profile.city}, ${profile.state}`
    : profile.city || profile.state || null;

  return {
    id: profile.id,
    businessName: profile.company_name ?? 'Unknown',
    primaryContact: profile.full_name,
    email: profile.email,
    location,
    tier: membership?.tier ?? null,
    status: membership?.status ?? profile.member_status ?? null,
    verificationStatus: profile.verification_status ?? null,
    badgeRating: membership?.badge_rating ?? profile.badge_rating ?? null,
    joinDate: profile.created_at ?? null,
  };
};

export const handler: Handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  // Placeholder: later we can validate admin auth from the Authorization header
  // const authHeader = event.headers.authorization || event.headers.Authorization;

  const { data, error } = await supabase
    .from<ProfileRow>('profiles')
    .select(selectFields);

  if (error) {
    console.error('[admin-get-members] failed to fetch profiles', error);
    return jsonResponse(500, { error: 'Failed to fetch members' });
  }

  const members: AdminMember[] = (data ?? []).map(mapProfileToAdminMember);

  return jsonResponse(200, { members });
};
