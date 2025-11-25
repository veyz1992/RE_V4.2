import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { mapRowToMemberBadgeView, type BadgeDesignRow } from '@/lib/badges';
import type { MemberBadgeSummary, BadgeTemplate, BadgeTemplateRow } from '@src/lib/badges/model';
import { toBadgeTemplate } from '@src/lib/badges/model';
import { supabase } from '../supabase';

const BADGE_TEMPLATE_COLUMNS =
  'id,name,badge_code,status,accent_color,accent_gradient,background_image_url,description,svg_template,config,design_config,updated_at,created_at';

const normalizeSupabaseError = (error: PostgrestError | null, fallback: string): string | null => {
  if (!error) return null;

  if (error.code === '42P01' || error.message?.toLowerCase().includes('does not exist')) {
    return 'Badge templates table is missing in Supabase. Please run the latest migrations for admin badge builder support.';
  }

  if (error.code === '23505') {
    return 'A badge with this code already exists. Please choose a unique badge code.';
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

const getDefaultProfileUrl = (profileId: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://restorationexpertise.com';
  return `${origin}/members/${profileId}`;
};

const extractBadgeCode = (row: BadgeDesignRow): string | null => {
  const configCode =
    row.design_config && typeof row.design_config === 'object'
      ? (row.design_config as Record<string, unknown>).badgeCode ??
        (row.design_config as Record<string, unknown>).templateCode ??
        null
      : null;

  return (row.embed_code_version ?? configCode ?? null) as string | null;
};

const buildFallbackEmbed = (
  badgeLabel: string,
  profileUrl: string,
  imageLightUrl: string | null,
  imageDarkUrl: string | null,
): string | null => {
  const imageUrl = imageLightUrl ?? imageDarkUrl;
  if (!imageUrl) return null;

  return `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer">
  <img
    src="${imageUrl}"
    alt="Restoration Expertise Verified Member – ${badgeLabel}"
    style="max-width:180px;height:auto;" />
</a>`;
};

const extractTemplateEmbed = (
  template: BadgeTemplate | null,
  profileId: string,
): { html: string | null; style: string | null; script: string | null } => {
  if (!template) return { html: null, style: null, script: null };

  const config = (template.config ?? {}) as Record<string, unknown>;
  const embedHtml = typeof config.embedHtml === 'string' ? config.embedHtml : null;
  const embedStyle = typeof config.embedStyle === 'string' ? config.embedStyle : null;
  const embedScriptUrl = typeof config.embedScriptUrl === 'string' ? config.embedScriptUrl : null;

  if (embedHtml) {
    const hydratedHtml = embedHtml
      .replace(/{{\s*profileId\s*}}/g, profileId)
      .replace(/{{\s*badgeCode\s*}}/g, template.badgeCode);
    return { html: hydratedHtml, style: embedStyle, script: embedScriptUrl };
  }

  if (embedScriptUrl) {
    return {
      html: `<div data-re-badge data-template="${template.badgeCode}" data-profile="${profileId}"></div>
<script async src="${embedScriptUrl}" data-template="${template.badgeCode}" data-profile="${profileId}"></script>`,
      style: embedStyle,
      script: embedScriptUrl,
    };
  }

  return { html: null, style: embedStyle, script: embedScriptUrl };
};

export const fetchBadgeTemplates = async (
  supabaseClient: SupabaseClient = supabase,
): Promise<{ data: BadgeTemplateRow[]; error: string | null }> => {
  try {
    const { data, error } = await supabaseClient
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

export const fetchBadgeTemplatesForAdmin = async (
  supabaseClient: SupabaseClient = supabase,
): Promise<{ templates: BadgeTemplate[]; error: string | null }> => {
  const { data, error } = await fetchBadgeTemplates(supabaseClient);

  if (error) {
    return { templates: [], error };
  }

  const templates = (data ?? []).map((row) => toBadgeTemplate(row));
  return { templates, error: null };
};

export const upsertBadgeTemplate = async (
  payload: Partial<BadgeTemplateRow>,
  supabaseClient: SupabaseClient = supabase,
): Promise<{ data: BadgeTemplateRow | null; error: string | null }> => {
  try {
    const { data, error } = await supabaseClient
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
  supabaseClient: SupabaseClient = supabase,
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabaseClient.from('badge_templates').delete().eq('id', id);

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

export const fetchMemberBadgeSummary = async (
  supabaseClient: SupabaseClient,
  profileId: string,
): Promise<{ badge: MemberBadgeSummary | null; error: string | null }> => {
  try {
    const { data: designRow, error: designError } = await supabaseClient
      .from('badge_designs')
      .select('*')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .maybeSingle();

    const normalizedDesignError = handleMissingTable(designError, {
      fallback: 'Unable to load badge design.',
      onMissingTable: () => console.warn('Badge designs table not found. Returning empty badge summary.'),
    });

    if (normalizedDesignError) {
      return { badge: null, error: normalizedDesignError };
    }

    if (!designRow) {
      return { badge: null, error: null };
    }

    const badgeView = mapRowToMemberBadgeView(designRow as BadgeDesignRow, getDefaultProfileUrl(profileId));
    const candidateBadgeCode = extractBadgeCode(designRow as BadgeDesignRow);

    let template: BadgeTemplate | null = null;
    if (candidateBadgeCode) {
      const { data: templateRow, error: templateError } = await supabaseClient
        .from('badge_templates')
        .select(BADGE_TEMPLATE_COLUMNS)
        .eq('badge_code', candidateBadgeCode)
        .eq('status', 'active')
        .maybeSingle();

      const normalizedTemplateError = handleMissingTable(templateError, {
        fallback: 'Unable to load badge template.',
        onMissingTable: () =>
          console.warn('Badge templates table not found while loading member badge. Falling back to design assets.'),
      });

      if (!normalizedTemplateError && templateRow) {
        template = toBadgeTemplate(templateRow as BadgeTemplateRow);
      }
    }

    const profileUrl = badgeView.profileUrl ?? getDefaultProfileUrl(profileId);
    const templateEmbed = extractTemplateEmbed(template, profileId);
    const fallbackEmbed = buildFallbackEmbed(
      badgeView.badgeLabel,
      profileUrl,
      badgeView.imageLightUrl,
      badgeView.imageDarkUrl,
    );

    const summary: MemberBadgeSummary = {
      label: badgeView.badgeLabel,
      code: template?.badgeCode ?? candidateBadgeCode ?? null,
      status: badgeView.status,
      imageLightUrl: badgeView.imageLightUrl,
      imageDarkUrl: badgeView.imageDarkUrl,
      svg: badgeView.svg,
      profileUrl,
      rating: badgeView.rating,
      embedHtml: templateEmbed.html ?? fallbackEmbed,
      embedStyle: templateEmbed.style ?? badgeView.embedStyle ?? null,
      embedScriptUrl: templateEmbed.script ?? badgeView.embedScriptUrl ?? null,
    };

    return { badge: summary, error: null };
  } catch (err) {
    console.error('Unexpected error loading member badge summary', err);
    return { badge: null, error: 'Unexpected error loading badge.' };
  }
};
