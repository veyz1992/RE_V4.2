import { supabase } from '@/lib/supabase';
import type { MemberBadgeSummary } from './model';

export { deleteBadgeTemplate, fetchBadgeTemplates, upsertBadgeTemplate } from '../../lib/badges/service';
export { fetchMemberBadgeSummary } from '../../lib/badges/service';

export const fetchMemberBadgeSummaryForProfile = async (
  profileId: string,
): Promise<{ badge: MemberBadgeSummary | null; error: string | null }> => {
  try {
    const badge = await fetchMemberBadgeSummary(supabase, profileId);
    return { badge, error: null };
  } catch (err: unknown) {
    console.error('Failed to load member badge summary', err);
    const message = err instanceof Error ? err.message : 'Failed to load badge.';
    return { badge: null, error: message };
  }
};
