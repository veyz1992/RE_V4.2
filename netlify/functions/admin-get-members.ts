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
  last_assessment_id?: string | null;
}

interface MembershipRow {
  profile_id: string;
  tier: string | null;
  status: string | null;
  badge_rating: string | null;
  created_at: string | null;
  verification_status?: string | null;
}

interface AssessmentRow {
  id: string;
  profile_id: string | null;
  pci_rating: string | null;
  created_at: string | null;
}

interface SubscriptionRow {
  profile_id: string;
  status: string | null;
  created_at: string | null;
}

interface MemberDocumentRow {
  profile_id: string;
  status: string | null;
}

type MemberSegment = 'active' | 'pending_verification' | 'lead' | 'churned' | 'unknown';

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
  segment?: MemberSegment;
  hasActiveSubscription?: boolean;
  hasAnyAssessment?: boolean;
  lastAssessmentDate: string | null;
  hasNewAssessment: boolean;
  pendingItems?: number;
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
    .select('id, company_name, full_name, email, city, state, membership_tier, member_status, verification_status, badge_rating, created_at, last_assessment_id');

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

  const lastAssessmentIds = profiles
    .map(profile => profile.last_assessment_id)
    .filter((id): id is string => Boolean(id));

  const { data: assessments, error: assessmentsError } = await supabase
    .from<AssessmentRow>('assessments')
    .select('id, profile_id, pci_rating, created_at')
    .in('id', lastAssessmentIds);

  if (assessmentsError) {
    console.error('[admin-get-members] failed to fetch assessments', assessmentsError);
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from<SubscriptionRow>('subscriptions')
    .select('profile_id, status, created_at')
    .in('profile_id', profileIds);

  if (subscriptionsError) {
    console.error('[admin-get-members] failed to fetch subscriptions', subscriptionsError);
  }

  const { data: memberDocuments, error: memberDocumentsError } = await supabase
    .from<MemberDocumentRow>('member_documents')
    .select('profile_id, status')
    .eq('status', 'pending')
    .in('profile_id', profileIds);

  if (memberDocumentsError) {
    console.error('[admin-get-members] failed to fetch member documents', memberDocumentsError);
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

  const assessmentById = (assessments ?? []).reduce<Record<string, AssessmentRow>>((acc, assessment) => {
    acc[assessment.id] = assessment;
    return acc;
  }, {});

  const hasActiveSubscriptionByProfileId = (subscriptions ?? []).reduce<Record<string, boolean>>((acc, subscription) => {
    if (subscription.status === 'active') {
      acc[subscription.profile_id] = true;
    }

    return acc;
  }, {});

  const pendingDocumentsByProfileId = (memberDocuments ?? []).reduce<Record<string, number>>((acc, document) => {
    if (document.status === 'pending') {
      acc[document.profile_id] = (acc[document.profile_id] ?? 0) + 1;
    }

    return acc;
  }, {});

  const members: AdminMember[] = profiles.map(profile => {
    const membership = membershipByProfileId[profile.id];
    const lastAssessment = profile.last_assessment_id ? assessmentById[profile.last_assessment_id] : null;
    const hasAnyAssessment = !!lastAssessment;
    const lastAssessmentDate = lastAssessment?.created_at ?? null;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const hasNewAssessment = !!(
      lastAssessmentDate &&
      new Date(lastAssessmentDate).getTime() >= sevenDaysAgo &&
      profile.verification_status === 'pending'
    );
    const hasActiveSubscription = hasActiveSubscriptionByProfileId[profile.id] ?? false;
    const pendingDocumentsCount = pendingDocumentsByProfileId[profile.id] ?? 0;

    const location = profile.city && profile.state
      ? `${profile.city}, ${profile.state}`
      : profile.city || profile.state || null;

    const tier = membership?.tier || profile.membership_tier || null;
    const status = membership?.status || profile.member_status || null;
    const badgeRating =
      membership?.badge_rating ||
      lastAssessment?.pci_rating ||
      profile.badge_rating ||
      null;

    let segment: MemberSegment = 'unknown';

    if (hasActiveSubscription && profile.member_status === 'active' && profile.verification_status === 'verified') {
      segment = 'active';
    } else if (hasActiveSubscription && profile.verification_status === 'pending' && hasAnyAssessment) {
      segment = 'pending_verification';
    } else if (!hasActiveSubscription && hasAnyAssessment) {
      segment = 'lead';
    } else if (!hasActiveSubscription && profile.member_status === 'canceled') {
      segment = 'churned';
    }

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
      segment,
      hasActiveSubscription,
      hasAnyAssessment,
      lastAssessmentDate,
      hasNewAssessment,
      pendingItems: pendingDocumentsCount,
    };
  });

  return jsonResponse(200, { members });
};
