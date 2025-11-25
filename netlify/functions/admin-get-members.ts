import type { Handler } from '@netlify/functions';
import { supabase } from '../lib/supabaseServer';
import {
  type AdminAssessmentRow,
  type AdminMemberDocumentRow,
  type AdminMembershipRow,
  type AdminProfileRow,
  type AdminSubscriptionRow,
} from '../../components/admin/adminUtils';

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
    .from<AdminProfileRow>('profiles')
    .select('id, company_name, full_name, email, city, state, membership_tier, member_status, verification_status, badge_rating, created_at, last_assessment_id');

  if (profilesError) {
    console.error('[admin-get-members] failed to fetch profiles', profilesError);
    return jsonResponse(500, { error: 'Failed to fetch members' });
  }

  if (!profiles || profiles.length === 0) {
    return jsonResponse(200, { profiles: [], memberships: [], assessments: [], subscriptions: [], memberDocuments: [] });
  }

  const profileIds = profiles.map(profile => profile.id);

  const { data: memberships, error: membershipsError } = await supabase
    .from<AdminMembershipRow>('memberships')
    .select('profile_id, tier, status, badge_rating, created_at')
    .in('profile_id', profileIds);

  if (membershipsError) {
    console.error('[admin-get-members] failed to fetch memberships', membershipsError);
  }

  const lastAssessmentIds = profiles
    .map(profile => profile.last_assessment_id)
    .filter((id): id is string => Boolean(id));

  const { data: assessments, error: assessmentsError } = await supabase
    .from<AdminAssessmentRow>('assessments')
    .select('id, profile_id, pci_rating, created_at')
    .in('id', lastAssessmentIds);

  if (assessmentsError) {
    console.error('[admin-get-members] failed to fetch assessments', assessmentsError);
  }

  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from<AdminSubscriptionRow>('subscriptions')
    .select('profile_id, status, created_at')
    .in('profile_id', profileIds);

  if (subscriptionsError) {
    console.error('[admin-get-members] failed to fetch subscriptions', subscriptionsError);
  }

  const { data: memberDocuments, error: memberDocumentsError } = await supabase
    .from<AdminMemberDocumentRow>('member_documents')
    .select('profile_id, status')
    .eq('status', 'pending')
    .in('profile_id', profileIds);

  if (memberDocumentsError) {
    console.error('[admin-get-members] failed to fetch member documents', memberDocumentsError);
  }

  return jsonResponse(200, {
    profiles,
    memberships: memberships ?? [],
    assessments: assessments ?? [],
    subscriptions: subscriptions ?? [],
    memberDocuments: memberDocuments ?? [],
  });
};
