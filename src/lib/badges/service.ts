import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { BadgeTemplateRow } from './model';

const BADGE_TEMPLATE_COLUMNS =
  'id,name,badge_code,status,accent_color,description,svg_template,config,updated_at,created_at';

const mapSupabaseError = (error: PostgrestError | null, fallback: string) => {
  if (!error) return null;

  if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
    return 'Badge templates table is missing in Supabase. Please run the latest migrations for admin badge builder support.';
  }

  if (error.code === '400') {
    return error.message || fallback;
  }

  return `${fallback} (${error.message})`;
};

export const fetchBadgeTemplates = async (): Promise<{
  data: BadgeTemplateRow[] | null;
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase
      .from('badge_templates')
      .select(BADGE_TEMPLATE_COLUMNS)
      .order('updated_at', { ascending: false });

    return {
      data: (data as BadgeTemplateRow[]) ?? null,
      error: mapSupabaseError(error, 'Unable to load badge templates.'),
    };
  } catch (err) {
    console.error('Unexpected error loading badge templates', err);
    return { data: null, error: 'Unexpected error loading badge templates.' };
  }
};

export const createBadgeTemplate = async (
  payload: Partial<BadgeTemplateRow>,
): Promise<{ data: BadgeTemplateRow | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('badge_templates')
      .insert(payload)
      .select(BADGE_TEMPLATE_COLUMNS)
      .maybeSingle();

    return { data: (data as BadgeTemplateRow) ?? null, error: mapSupabaseError(error, 'Unable to create badge template.') };
  } catch (err) {
    console.error('Unexpected error creating badge template', err);
    return { data: null, error: 'Unexpected error creating badge template.' };
  }
};

export const updateBadgeTemplate = async (
  id: string,
  payload: Partial<BadgeTemplateRow>,
): Promise<{ data: BadgeTemplateRow | null; error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('badge_templates')
      .update(payload)
      .eq('id', id)
      .select(BADGE_TEMPLATE_COLUMNS)
      .maybeSingle();

    return { data: (data as BadgeTemplateRow) ?? null, error: mapSupabaseError(error, 'Unable to update badge template.') };
  } catch (err) {
    console.error('Unexpected error updating badge template', err);
    return { data: null, error: 'Unexpected error updating badge template.' };
  }
};
