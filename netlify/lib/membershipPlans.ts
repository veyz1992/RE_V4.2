export type MembershipTier = 'free' | 'founding-member' | 'bronze' | 'silver' | 'gold';
export type PaidMembershipTier = Exclude<MembershipTier, 'free'>;

const foundingMemberPrice =
  process.env.PRICE_ID_FOUNDING_MEMBER ?? process.env.STRIPE_PRICE_FOUNDING_MEMBER ?? '';

export const PLAN_PRICE_IDS: Record<PaidMembershipTier, string> = {
  'founding-member': foundingMemberPrice,
  bronze: process.env.STRIPE_PRICE_BRONZE ?? '',
  silver: process.env.STRIPE_PRICE_SILVER ?? '',
  gold: process.env.STRIPE_PRICE_GOLD ?? '',
};

const hasValue = (value: string | null | undefined): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const isPaidMembershipTier = (value: unknown): value is PaidMembershipTier => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'founding-member' || normalized === 'bronze' || normalized === 'silver' || normalized === 'gold';
};

export const getPriceIdForTier = (tier: PaidMembershipTier): string | null => {
  const priceId = PLAN_PRICE_IDS[tier];
  return hasValue(priceId) ? priceId : null;
};

export const normalizeMembershipTier = (value?: string | null): MembershipTier => {
  if (!value) {
    return 'free';
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.includes('founding')) {
    return 'founding-member';
  }
  if (normalized.includes('bronze')) {
    return 'bronze';
  }
  if (normalized.includes('silver')) {
    return 'silver';
  }
  if (normalized.includes('gold')) {
    return 'gold';
  }

  return 'free';
};

export const mapPriceIdToTier = (priceId: string): MembershipTier => {
  switch (priceId) {
    case PLAN_PRICE_IDS['founding-member']:
      return 'founding-member';
    case PLAN_PRICE_IDS.bronze:
      return 'bronze';
    case PLAN_PRICE_IDS.silver:
      return 'silver';
    case PLAN_PRICE_IDS.gold:
      return 'gold';
    default:
      return 'free';
  }
};
