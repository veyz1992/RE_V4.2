import type { Handler } from '@netlify/functions';
import { supabase } from '../lib/supabaseServer';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const jsonResponse = (statusCode: number, body: unknown) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});

const mapPciScoreToRating = (score: number | null | undefined): string | null => {
  if (score == null) return null;

  if (score >= 90) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';

  return 'E';
};

export const handler: Handler = async event => {
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, company_name, role, membership_tier, created_at, phone, city, state, country, address_line1, postal_code, years_in_business, services, verification_status, member_status, badge_rating, stripe_customer_id, stripe_subscription_id, next_billing_date, last_pci_score, last_assessment_id, has_license, has_insurance, updated_at'
    )
    .eq('id', profileId)
    .single();

  if (profileError) {
    console.error('[admin-get-member-full] failed to load profile', profileError);
    if (profileError.code === 'PGRST116') {
      return jsonResponse(404, { error: 'Profile not found' });
    }

    return jsonResponse(500, { error: 'Failed to load profile' });
  }

  const { data: memberships, error: membershipError } = await supabase
    .from('memberships')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (membershipError) {
    console.error('[admin-get-member-full] failed to load membership', membershipError);
    return jsonResponse(500, { error: 'Failed to load membership' });
  }

  const membership = memberships?.[0] ?? null;

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (subscriptionError) {
    console.error('[admin-get-member-full] failed to load subscription', subscriptionError);
    return jsonResponse(500, { error: 'Failed to load subscription' });
  }

  const subscription = subscriptions?.[0] ?? null;

  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select(
      'id, total_score, operational_score, licensing_score, feedback_score, certifications_score, digital_score, pci_rating, created_at'
    )
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  if (assessmentsError) {
    console.error('[admin-get-member-full] failed to load assessments', assessmentsError);
    return jsonResponse(500, { error: 'Failed to load assessments' });
  }

  const hasAssessments = !!assessments && assessments.length > 0;
  const firstAssessment = hasAssessments ? assessments[0] : null;

  const { data: documents, error: documentsError } = await supabase
    .from('member_documents')
    .select('*')
    .eq('profile_id', profileId);

  if (documentsError) {
    console.error('[admin-get-member-full] failed to load member documents', documentsError);
  }

  const { data: serviceRequests, error: serviceRequestsError } = await supabase
    .from('service_requests')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (serviceRequestsError) {
    console.error('[admin-get-member-full] failed to load service requests', serviceRequestsError);
  }

  const { data: recheckRequests, error: recheckError } = await supabase
    .from('service_requests')
    .select('*')
    .eq('profile_id', profileId)
    .eq('request_type', 'assessment_recheck')
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false });

  if (recheckError) {
    console.error('[admin-get-member-full] failed to load assessment recheck requests', recheckError);
  }

  const openRecheckRequest = recheckRequests?.[0] ?? null;

  const latestAssessmentFromProfile = assessments?.find((assessment) => assessment.id === profile.last_assessment_id);
  const latestAssessment = latestAssessmentFromProfile ?? (hasAssessments ? assessments[assessments.length - 1] : null);
  const firstAssessmentDate = firstAssessment?.created_at ?? null;
  const latestAssessmentDate = latestAssessment?.created_at ?? null;
  const lastPciScore = latestAssessment?.total_score ?? null;
  const latestPciRating = latestAssessment?.pci_rating ?? null;
  const summaryPciRating = latestPciRating ?? mapPciScoreToRating(lastPciScore);

  const summary = {
    pciRating: summaryPciRating,
    initialPciRating: firstAssessment?.pci_rating ?? null,
    totalScore: lastPciScore,
    initialTotalScore: firstAssessment?.total_score ?? null,
    membershipTier: membership?.tier ?? profile.membership_tier ?? null,
    memberStatus: membership?.status ?? profile.member_status ?? null,
    verificationStatus: membership?.verification_status ?? profile.verification_status ?? null,
    badgeRating: membership?.badge_rating ?? profile.badge_rating ?? null,
    joinDate: profile.created_at ?? null,
    hasAssessment: hasAssessments,
    firstAssessmentDate,
    latestAssessmentDate,
    lastPciScore,
  };

  return jsonResponse(200, {
    profile,
    membership,
    subscription,
    firstAssessment,
    latestAssessment,
    summary,
    documents: documents ?? [],
    serviceRequests: serviceRequests ?? [],
    openRecheckRequest,
    openRecheckCount: recheckRequests?.length ?? 0,
  });
};
