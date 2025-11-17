import type { MembershipTier as PlanConfigMembershipTier } from './plans';

export type MembershipTier = 'founding' | 'bronze' | 'silver' | 'gold';

export type PlanBenefits = {
  id: MembershipTier;
  name: string;
  label: string;
  pricePerMonth: number;
  seoPostsPerYear: number;
  websiteReviewsPerYear: number;
  spotlightArticlesPerYear: number;
  socialSpotlightsPerYear: number;
  priorityMeetingsPerMonth: number;
  includesBlueprint: boolean;
  includesTrustBadge: boolean;
  includesPrioritySupport: boolean;
};

export const PLAN_BENEFITS: Record<MembershipTier, PlanBenefits> = {
  founding: {
    id: 'founding',
    name: 'Founding Member',
    label: 'Founding Member',
    pricePerMonth: 229,
    seoPostsPerYear: 1,
    websiteReviewsPerYear: 4,
    spotlightArticlesPerYear: 1,
    socialSpotlightsPerYear: 2,
    priorityMeetingsPerMonth: 1,
    includesBlueprint: true,
    includesTrustBadge: true,
    includesPrioritySupport: true,
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    label: 'Gold',
    pricePerMonth: 199,
    seoPostsPerYear: 2,
    websiteReviewsPerYear: 4,
    spotlightArticlesPerYear: 2,
    socialSpotlightsPerYear: 4,
    priorityMeetingsPerMonth: 1,
    includesBlueprint: true,
    includesTrustBadge: true,
    includesPrioritySupport: true,
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    label: 'Silver',
    pricePerMonth: 149,
    seoPostsPerYear: 1,
    websiteReviewsPerYear: 2,
    spotlightArticlesPerYear: 1,
    socialSpotlightsPerYear: 2,
    priorityMeetingsPerMonth: 0,
    includesBlueprint: true,
    includesTrustBadge: true,
    includesPrioritySupport: false,
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    label: 'Bronze',
    pricePerMonth: 99,
    seoPostsPerYear: 0,
    websiteReviewsPerYear: 1,
    spotlightArticlesPerYear: 0,
    socialSpotlightsPerYear: 1,
    priorityMeetingsPerMonth: 0,
    includesBlueprint: false,
    includesTrustBadge: true,
    includesPrioritySupport: false,
  },
};

type PaidPlanConfigTier = Exclude<PlanConfigMembershipTier, 'free'>;

export interface MembershipPlanDefinition {
  tier: MembershipTier;
  label: string;
  description: string;
  defaultPriceCents: number;
  billingCycle: 'monthly';
  isAvailable: boolean;
  stripePriceEnvKey?: string | null;
  checkoutTier: PaidPlanConfigTier;
}

const monthly = 'monthly' as const;

export const MEMBERSHIP_PLANS: MembershipPlanDefinition[] = [
  {
    tier: 'founding',
    label: 'Founding Member',
    description: 'Lifetime pricing, concierge onboarding, and every Gold-tier benefit.',
    defaultPriceCents: 22900,
    billingCycle: monthly,
    isAvailable: true,
    stripePriceEnvKey: 'STRIPE_PRICE_FOUNDING_MEMBER',
    checkoutTier: 'founding-member',
  },
  {
    tier: 'bronze',
    label: 'Bronze',
    description: 'Verified badge, profile page, and essential visibility in the network.',
    defaultPriceCents: 15900,
    billingCycle: monthly,
    isAvailable: false,
    stripePriceEnvKey: null,
    checkoutTier: 'bronze',
  },
  {
    tier: 'silver',
    label: 'Silver',
    description: 'Bronze benefits plus featured placement, SEO content, and compliance support.',
    defaultPriceCents: 29700,
    billingCycle: monthly,
    isAvailable: false,
    stripePriceEnvKey: null,
    checkoutTier: 'silver',
  },
  {
    tier: 'gold',
    label: 'Gold',
    description: 'Maximum visibility, spotlight articles, and priority strategic support.',
    defaultPriceCents: 49700,
    billingCycle: monthly,
    isAvailable: false,
    stripePriceEnvKey: null,
    checkoutTier: 'gold',
  },
];

export const DEFAULT_MEMBERSHIP_TIER: MembershipTier = 'bronze';

export const normalizeMembershipTier = (tier?: string | null): MembershipTier => {
  if (!tier) {
    return DEFAULT_MEMBERSHIP_TIER;
  }

  const normalized = tier.toLowerCase();

  if (normalized.includes('founding')) {
    return 'founding';
  }
  if (normalized.includes('platinum')) {
    return 'gold';
  }
  if (normalized.includes('gold')) {
    return 'gold';
  }
  if (normalized.includes('silver')) {
    return 'silver';
  }
  if (normalized.includes('bronze')) {
    return 'bronze';
  }

  return DEFAULT_MEMBERSHIP_TIER;
};
