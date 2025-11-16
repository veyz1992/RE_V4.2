/**
 * Update these quotas whenever membership benefits change.
 * In the future this can move to a managed table or admin UI, but for now the
 * tier → quota mapping lives here to keep it easy to audit.
 */
export type SeoBlogPeriod = 'year' | 'month';

export interface SeoBlogQuotaConfig {
  limit: number | null;
  period: SeoBlogPeriod;
}

export const DEFAULT_SEO_BLOG_QUOTA: SeoBlogQuotaConfig = { limit: 0, period: 'year' };

export const SEO_BLOG_QUOTA_BY_TIER: Record<string, SeoBlogQuotaConfig> = {
  free: { limit: 0, period: 'year' },
  bronze: { limit: 0, period: 'year' },
  silver: { limit: 1, period: 'year' },
  gold: { limit: 2, period: 'year' },
  founding_member: { limit: 1, period: 'year' },
  platinum: { limit: null, period: 'year' },
};

/**
 * This string must match the value stored in public.service_requests.request_type.
 * TODO: replace with an exported enum from a generated Supabase types file once
 * the enum values are available in the codebase.
 */
export const REQUEST_TYPE_SEO_BLOG = 'seo_blog_post' as const;

export const normalizeTierForQuota = (tier?: string | null): string => {
  return (tier ?? 'free').toLowerCase().trim();
};
