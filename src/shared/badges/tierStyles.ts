export interface TierStyleConfig {
  key: string;
  label: string;
  stylePreset: string;
  accentGradient: string;
  ratingPreset: string;
  templateId?: string;
}

const DEFAULT_TIER_KEY = 'gold';

const BASE_STYLE: TierStyleConfig = {
  key: DEFAULT_TIER_KEY,
  label: 'Gold Member',
  stylePreset: 'gold',
  accentGradient: 'from-amber-400 to-amber-600',
  ratingPreset: 'A+',
  templateId: 'standard-member',
};

const STYLE_MAP: Record<string, TierStyleConfig> = {
  [DEFAULT_TIER_KEY]: BASE_STYLE,
  silver: {
    key: 'silver',
    label: 'Silver Member',
    stylePreset: 'silver',
    accentGradient: 'from-slate-200 to-slate-500',
    ratingPreset: 'A',
    templateId: 'standard-member',
  },
  bronze: {
    key: 'bronze',
    label: 'Bronze Member',
    stylePreset: 'bronze',
    accentGradient: 'from-amber-300 to-amber-500',
    ratingPreset: 'B+',
    templateId: 'standard-member',
  },
  platinum: {
    key: 'platinum',
    label: 'Platinum Member',
    stylePreset: 'platinum',
    accentGradient: 'from-slate-700 to-slate-900',
    ratingPreset: 'A+',
    templateId: 'standard-member',
  },
  founding: {
    key: 'founding',
    label: 'Founding Member',
    stylePreset: 'founding',
    accentGradient: 'from-slate-500 to-slate-700',
    ratingPreset: 'A+',
    templateId: 'founding-member',
  },
};

const normalizeTier = (tier?: string | null): string => tier?.trim().toLowerCase() ?? '';

export const getTierStyle = (tier?: string | null): TierStyleConfig => {
  const normalized = normalizeTier(tier);

  if (normalized.includes('found')) return STYLE_MAP.founding;
  if (STYLE_MAP[normalized]) return STYLE_MAP[normalized];
  if (normalized.includes('silver')) return STYLE_MAP.silver;
  if (normalized.includes('bronze')) return STYLE_MAP.bronze;
  if (normalized.includes('platinum')) return STYLE_MAP.platinum;

  return BASE_STYLE;
};

export const TIER_STYLE_OPTIONS: Array<{ value: string; label: string }> = Object.values(STYLE_MAP).map(
  (style) => ({ value: style.key, label: style.label }),
);
