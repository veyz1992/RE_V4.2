export type MembershipTier = 'free' | 'founding-member' | 'bronze' | 'silver' | 'gold';

export type PlanBenefitKey =
  | 'badge'
  | 'profile_page'
  | 'directory_listing'
  | 'community_access'
  | 'seo_blog_posts'
  | 'quarterly_review'
  | 'spotlight_article'
  | 'social_spotlight'
  | 'priority_support'
  | 'blueprint_99_steps';

export interface PlanDefinition {
  id: MembershipTier;
  name: string;
  priceLabel: string;
  badgeLabel?: string;
  description?: string;
  isPubliclyAvailable: boolean;
  sortOrder: number;
  benefits: {
    key: PlanBenefitKey;
    label: string;
    detail?: string;
    quotaLabel?: string;
  }[];
}

export const PLANS: PlanDefinition[] = [
  {
    id: 'founding-member',
    name: 'Founding Member',
    priceLabel: '$229 / month',
    badgeLabel: 'Legacy offer',
    description: 'Exclusive founding partner offer. Locked pricing while you stay on this plan.',
    isPubliclyAvailable: false,
    sortOrder: 0,
    benefits: [
      { key: 'badge', label: 'Founding Member Seal', detail: 'Exclusive design, never offered again', quotaLabel: 'Included' },
      {
        key: 'profile_page',
        label: 'Enhanced profile',
        detail: 'Logo, gallery, detailed services, CTA buttons',
        quotaLabel: 'Included',
      },
      { key: 'directory_listing', label: 'Verified listing on RestorationExpertise.com', quotaLabel: 'Included' },
      { key: 'community_access', label: 'Private community access', detail: 'Facebook group + resources', quotaLabel: 'Included' },
      { key: 'priority_support', label: 'Priority support & early access', quotaLabel: 'Included' },
      { key: 'seo_blog_posts', label: 'Yearly SEO Blog-Post', quotaLabel: '1 / year' },
      { key: 'quarterly_review', label: 'Website review', quotaLabel: '4 / year' },
      { key: 'blueprint_99_steps', label: '99 Steps Restoration Success Blueprint + updates', quotaLabel: 'Included' },
    ],
  },
  {
    id: 'bronze',
    name: 'Bronze',
    priceLabel: '$159 / month',
    badgeLabel: '',
    description: 'Verified badge and essential visibility.',
    isPubliclyAvailable: true,
    sortOrder: 1,
    benefits: [
      { key: 'badge', label: 'Badge: “Verified – [City]”', quotaLabel: 'Included' },
      { key: 'profile_page', label: 'Profile page (SEO backlink)', quotaLabel: 'Included' },
      { key: 'directory_listing', label: 'Basic directory listing', quotaLabel: 'Included' },
      { key: 'community_access', label: 'Community access', detail: 'Facebook group + resources', quotaLabel: 'Included' },
      { key: 'blueprint_99_steps', label: 'Annual re-verification', quotaLabel: 'Included' },
    ],
  },
  {
    id: 'silver',
    name: 'Silver',
    priceLabel: '$297 / month',
    badgeLabel: 'POPULAR',
    description: 'Everything in Bronze, plus stronger SEO and compliance.',
    isPubliclyAvailable: true,
    sortOrder: 2,
    benefits: [
      {
        key: 'directory_listing',
        label: 'Featured placement in directory',
        detail: 'Top of search results',
        quotaLabel: 'Included',
      },
      {
        key: 'profile_page',
        label: 'Enhanced profile',
        detail: 'Logo, gallery, detailed services, CTA buttons',
        quotaLabel: 'Included',
      },
      { key: 'profile_page', label: 'Enhanced service area & CTA link', quotaLabel: 'Included' },
      { key: 'seo_blog_posts', label: 'Yearly SEO Blog-Post', quotaLabel: '1 / year' },
      { key: 'quarterly_review', label: 'Quarterly automated compliance check', quotaLabel: '4 / year' },
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    priceLabel: '$497 / month',
    badgeLabel: '',
    description: 'Maximum visibility and support.',
    isPubliclyAvailable: true,
    sortOrder: 3,
    benefits: [
      {
        key: 'directory_listing',
        label: 'Featured in “Top Verified Experts” directory',
        quotaLabel: 'Included',
      },
      { key: 'seo_blog_posts', label: 'Priority SEO backlink placement', quotaLabel: 'Included' },
      { key: 'spotlight_article', label: 'Bi-Annual Spotlight Article', quotaLabel: '2 / year' },
      { key: 'social_spotlight', label: 'Social media spotlight', quotaLabel: '2 / year' },
      { key: 'priority_support', label: 'Priority 30 min/month meeting', quotaLabel: 'Included' },
      { key: 'blueprint_99_steps', label: '99-Steps Blueprint INCLUDED', quotaLabel: 'Included' },
    ],
  },
];

export const normalizePlanTier = (tier?: string | null): MembershipTier => {
  if (!tier) {
    return 'free';
  }

  const normalized = tier.trim().toLowerCase();

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
  if (normalized === 'free') {
    return 'free';
  }

  return 'free';
};
