import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { BadgeTemplateRow, MemberBadgeSummary, BadgeTemplate } from './model';
import {
  deleteBadgeTemplate as coreDeleteBadgeTemplate,
  fetchBadgeTemplates as coreFetchBadgeTemplates,
  fetchBadgeTemplatesForAdmin as coreFetchBadgeTemplatesForAdmin,
  fetchMemberBadgeSummary as coreFetchMemberBadgeSummary,
  upsertBadgeTemplate as coreUpsertBadgeTemplate,
} from '../../lib/badges/service';

export const fetchBadgeTemplates = (client: SupabaseClient = supabase) => coreFetchBadgeTemplates(client);

export const fetchBadgeTemplatesForAdmin = (client: SupabaseClient = supabase) =>
  coreFetchBadgeTemplatesForAdmin(client);

export const upsertBadgeTemplate = (payload: Partial<BadgeTemplateRow>, client: SupabaseClient = supabase) =>
  coreUpsertBadgeTemplate(payload, client);

export const deleteBadgeTemplate = (id: string, client: SupabaseClient = supabase) =>
  coreDeleteBadgeTemplate(id, client);

export const fetchMemberBadgeSummary = async (
  client: SupabaseClient = supabase,
  profileId?: string,
): Promise<{ badge: MemberBadgeSummary | null; error: string | null }> => {
  if (!profileId) {
    return { badge: null, error: 'No profile id provided for badge lookup.' };
  }

  return coreFetchMemberBadgeSummary(client, profileId);
};

export type { BadgeTemplateRow, MemberBadgeSummary, BadgeTemplate };
