import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface BadgeTemplateRow {
  id: string;
  name: string;
  badge_code?: string | null;
  status?: string | null;
  accent_color?: string | null;
  description?: string | null;
  svg_template?: string | null;
  config?: unknown;
  updated_at?: string | null;
  created_at?: string | null;
}

const BADGE_TEMPLATE_COLUMNS =
  'id,name,badge_code,status,accent_color,description,svg_template,config,updated_at,created_at';

const normalizeSupabaseError = (error: PostgrestError | null, fallback: string): string | null => {
  if (!error) return null;

  if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
    return 'Badge templates table is missing in Supabase. Please run the latest migrations for admin badge builder support.';
  }

  if (error.code === '400') {
    return error.message || fallback;
  }

  return `${fallback} (${error.message})`;
};

const handleMissingTable = (
  error: PostgrestError | null,
  options: { onMissingTable?: () => void; fallback: string },
): string | null => {
  if (!error) return null;

  if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
    if (options.onMissingTable) {
      options.onMissingTable();
    }
    return null;
  }

  return normalizeSupabaseError(error, options.fallback);
};

export const fetchBadgeTemplates = async (): Promise<{ data: BadgeTemplateRow[]; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('badge_templates')
      .select(BADGE_TEMPLATE_COLUMNS)
      .order('updated_at', { ascending: false });

    const normalizedError = handleMissingTable(error, {
      fallback: 'Unable to load badge templates.',
      onMissingTable: () =>
        console.warn(
          'Badge templates table not found in Supabase. Returning empty list for admin badge builder.',
        ),
    });

    return {
      data: normalizedError ? [] : (data as BadgeTemplateRow[]) ?? [],
      error: normalizedError,
    };
  } catch (err) {
    console.error('Unexpected error loading badge templates', err);
    return { data: [], error: 'Unexpected error loading badge templates.' };
  }
};

export const upsertBadgeTemplate = async (
  payload: Partial<BadgeTemplateRow>,
): Promise<{ data: BadgeTemplateRow | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('badge_templates')
      .upsert(payload, { onConflict: 'id' })
      .select(BADGE_TEMPLATE_COLUMNS)
      .maybeSingle();

    const normalizedError = handleMissingTable(error, {
      fallback: 'Unable to save badge template.',
      onMissingTable: () =>
        console.warn(
          'Badge templates table not found while saving. Ensure migrations are applied for admin badge builder.',
        ),
    });

    return { data: normalizedError ? null : ((data as BadgeTemplateRow) ?? null), error: normalizedError };
  } catch (err) {
    console.error('Unexpected error saving badge template', err);
    return { data: null, error: 'Unexpected error saving badge template.' };
  }
};

export const deleteBadgeTemplate = async (
  id: string,
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.from('badge_templates').delete().eq('id', id);

    const normalizedError = handleMissingTable(error, {
      fallback: 'Unable to delete badge template.',
      onMissingTable: () =>
        console.warn(
          'Badge templates table not found while deleting. Nothing was removed; ensure migrations are applied.',
        ),
    });

    return { success: !normalizedError, error: normalizedError };
  } catch (err) {
    console.error('Unexpected error deleting badge template', err);
    return { success: false, error: 'Unexpected error deleting badge template.' };
  }
};
