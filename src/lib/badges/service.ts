import type { PostgrestError } from '@supabase/supabase-js';
import { mapRowToMemberBadgeView, type BadgeDesignRow } from '@/lib/badges';
import { supabase } from '@/lib/supabase';
import type { MemberBadgeSummary, BadgeTemplate } from './model';
import { toBadgeTemplate, type BadgeTemplateRow } from './model';

export { deleteBadgeTemplate, fetchBadgeTemplates, upsertBadgeTemplate } from '../../lib/badges/service';

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

export const fetchMemberBadgeSummary = async (
  profileId: string,
): Promise<{ badge: MemberBadgeSummary | null; error: string | null }> => {
  try {
    const { data: designRow, error: designError } = await supabase
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
      const { data: templateRow, error: templateError } = await supabase
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
