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
  membership_tier: string | null;
  member_status: string | null;
  verification_status: string | null;
  badge_rating: string | null;
  created_at: string | null;
}

interface MembershipRow {
  profile_id: string;
  tier: string | null;
  status: string | null;
  badge_rating: string | null;
  created_at: string | null;
}

interface BadgeDesignRow {
  profile_id: string;
  status: string | null;
  rating: string | null;
  created_at: string | null;
}

interface AssessmentRow {
  profile_id: string;
  pci_rating: string | null;
  created_at: string | null;
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

export const handler: Handler = async event => {
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(200, { ok: true });
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  // Placeholder: later we can validate admin auth from the Authorization header
  // const authHeader = event.headers.authorization || event.headers.Authorization;

  const { data: profiles, error: profilesError } = await supabase
    .from<ProfileRow>('profiles')
    .select('id, company_name, full_name, email, city, state, membership_tier, member_status, verification_status, badge_rating, created_at');

  if (profilesError) {
    console.error('[admin-get-members] failed to fetch profiles', profilesError);
    return jsonResponse(500, { error: 'Failed to fetch members' });
  }

  if (!profiles || profiles.length === 0) {
    return jsonResponse(200, { members: [] });
  }

  const profileIds = profiles.map(profile => profile.id);

  const { data: memberships, error: membershipsError } = await supabase
    .from<MembershipRow>('memberships')
    .select('profile_id, tier, status, badge_rating, created_at')
    .in('profile_id', profileIds);

  if (membershipsError) {
    console.error('[admin-get-members] failed to fetch memberships', membershipsError);
  }

  const { data: badgeDesigns, error: badgeDesignsError } = await supabase
    .from<BadgeDesignRow>('badge_designs')
    .select('profile_id, status, rating, created_at')
    .in('profile_id', profileIds);

  if (badgeDesignsError) {
    console.error('[admin-get-members] failed to fetch badge designs', badgeDesignsError);
  }

  const { data: assessments, error: assessmentsError } = await supabase
    .from<AssessmentRow>('assessments')
    .select('profile_id, pci_rating, created_at')
    .in('profile_id', profileIds);

  if (assessmentsError) {
    console.error('[admin-get-members] failed to fetch assessments', assessmentsError);
  }

  const membershipByProfileId = (memberships ?? []).reduce<Record<string, MembershipRow>>((acc, membership) => {
    const existing = acc[membership.profile_id];
    const existingDate = existing?.created_at ? new Date(existing.created_at).getTime() : 0;
    const currentDate = membership.created_at ? new Date(membership.created_at).getTime() : 0;

    if (!existing || currentDate > existingDate) {
      acc[membership.profile_id] = membership;
    }

    return acc;
  }, {});

  const badgeDesignByProfileId = (badgeDesigns ?? []).reduce<Record<string, BadgeDesignRow>>((acc, badgeDesign) => {
    const existing = acc[badgeDesign.profile_id];

    const isCurrentActive = badgeDesign.status === 'active';
    const existingIsActive = existing?.status === 'active';

    const existingDate = existing?.created_at ? new Date(existing.created_at).getTime() : 0;
    const currentDate = badgeDesign.created_at ? new Date(badgeDesign.created_at).getTime() : 0;

    const shouldReplace =
      (!existing && badgeDesign) ||
      (isCurrentActive && !existingIsActive) ||
      (isCurrentActive === existingIsActive && currentDate > existingDate);

    if (shouldReplace) {
      acc[badgeDesign.profile_id] = badgeDesign;
    }

    return acc;
  }, {});

  const assessmentByProfileId = (assessments ?? []).reduce<Record<string, AssessmentRow>>((acc, assessment) => {
    const existing = acc[assessment.profile_id];
    const existingDate = existing?.created_at ? new Date(existing.created_at).getTime() : 0;
    const currentDate = assessment.created_at ? new Date(assessment.created_at).getTime() : 0;

    if (!existing || currentDate > existingDate) {
      acc[assessment.profile_id] = assessment;
    }

    return acc;
  }, {});

  const members: AdminMember[] = profiles.map(profile => {
    const membership = membershipByProfileId[profile.id];
    const badgeDesign = badgeDesignByProfileId[profile.id];
    const assessment = assessmentByProfileId[profile.id];

    const location = profile.city && profile.state
      ? `${profile.city}, ${profile.state}`
      : profile.city || profile.state || null;

    const tier = membership?.tier || profile.membership_tier || null;
    const status = membership?.status || profile.member_status || null;
    const badgeRating =
      membership?.badge_rating ||
      badgeDesign?.rating ||
      assessment?.pci_rating ||
      profile.badge_rating ||
      null;

    return {
      id: profile.id,
      businessName: profile.company_name ?? 'Unknown',
      primaryContact: profile.full_name ?? null,
      email: profile.email ?? null,
      location,
      tier,
      status,
      verificationStatus: profile.verification_status ?? null,
      badgeRating,
      joinDate: profile.created_at ?? null,
    };
  });

  return jsonResponse(200, { members });
};
