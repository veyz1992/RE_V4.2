

import { Answers, ServiceRequestPriority, ServiceRequestType } from './types';

export const MAX_SCORES = {
  operational: 20,
  licensing: 20,
  feedback: 30,
  certifications: 15,
  digital: 15,
  total: 100,
};

export const ASSESSMENT_STEPS = [
  "Business Basics",
  "Operational & Professional Standards",
  "Licensing & Compliance",
  "Customer Feedback & Online Authority",
  "Industry Certifications & Training",
  "Digital & Brand Maturity"
];

// US States for dropdown
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

export const INITIAL_ANSWERS: Answers = {
  businessName: '',
  city: '',
  yearsInBusiness: 1,
  employees: 1,
  services: { water: false, fire: false, mold: false, storm: false },
  businessDescription: '',
  hasLicense: false,
  hasLiabilityInsurance: false,
  hasWorkersComp: false,
  yearsLicensed: 0,
  googleRating: 0,
  googleReviews: 0,
  otherPlatforms: { yelp: false, bbb: false, facebook: false },
  certifications: { water: false, fire: false, mold: false, other: false },
  hasWebsite: false,
  activeSocialMedia: false,
  brandedVehicles: false,
  emergencyLine: false,
  hasProEmail: false,
};

export const FOUNDING_MEMBER_SPOTS_REMAINING = 12;

// Centralized tier mapping configuration
export const TIER_CONFIG = {
  'Bronze': {
    displayName: 'Bronze',
    stripeEnvKey: 'STRIPE_PRICE_BRONZE',
    order: 1
  },
  'Silver': {
    displayName: 'Silver', 
    stripeEnvKey: 'STRIPE_PRICE_SILVER',
    order: 2
  },
  'Gold': {
    displayName: 'Gold',
    stripeEnvKey: 'STRIPE_PRICE_GOLD', 
    order: 3
  },
  'Founding Member': {
    displayName: 'Founding Member',
    stripeEnvKey: 'STRIPE_PRICE_FOUNDING_MEMBER',
    order: 4
  }
} as const;

export type TierName = keyof typeof TIER_CONFIG;

export const REJECTION_REASONS = [
    "Proof of insurance does not meet the $1M minimum requirement.",
    "Submitted contractor license is expired or invalid.",
    "Uploaded document is blurry, illegible, or incomplete.",
    "Business name on documents does not match the application.",
    "Workers' compensation policy information is missing.",
];

// Central source of truth for member service request priority labels and Supabase enum values.
export const PRIORITY_LABELS: Record<ServiceRequestPriority, string> = {
  low: 'Low',
  normal: 'Medium',
  high: 'High',
};

export const PRIORITY_OPTIONS: { label: string; value: ServiceRequestPriority }[] = [
  { label: PRIORITY_LABELS.low, value: 'low' },
  { label: PRIORITY_LABELS.normal, value: 'normal' },
  { label: PRIORITY_LABELS.high, value: 'high' },
];

export const SERVICE_REQUEST_TYPE_LABELS: Record<ServiceRequestType, string> = {
  seo_blog_post: 'SEO Blog Post',
  spotlight_article: 'Spotlight Article',
  website_review: 'Website Review',
  badge_support: 'Badge / Trust Badge Support',
  consultation: 'Consultation',
  other: 'Other',
};

export const SERVICE_REQUEST_TYPE_OPTIONS: { label: string; value: ServiceRequestType }[] = [
  { label: SERVICE_REQUEST_TYPE_LABELS.seo_blog_post, value: 'seo_blog_post' },
  { label: SERVICE_REQUEST_TYPE_LABELS.spotlight_article, value: 'spotlight_article' },
  { label: SERVICE_REQUEST_TYPE_LABELS.website_review, value: 'website_review' },
  { label: SERVICE_REQUEST_TYPE_LABELS.badge_support, value: 'badge_support' },
  { label: SERVICE_REQUEST_TYPE_LABELS.consultation, value: 'consultation' },
  { label: SERVICE_REQUEST_TYPE_LABELS.other, value: 'other' },
];

export const SERVICE_REQUEST_TYPE_LABEL_TO_VALUE: Record<string, ServiceRequestType> = {
  [SERVICE_REQUEST_TYPE_LABELS.seo_blog_post]: 'seo_blog_post',
  [SERVICE_REQUEST_TYPE_LABELS.spotlight_article]: 'spotlight_article',
  [SERVICE_REQUEST_TYPE_LABELS.website_review]: 'website_review',
  [SERVICE_REQUEST_TYPE_LABELS.badge_support]: 'badge_support',
  [SERVICE_REQUEST_TYPE_LABELS.consultation]: 'consultation',
  [SERVICE_REQUEST_TYPE_LABELS.other]: 'other',
  'Badge Support': 'badge_support',
  'Trust Badge Support': 'badge_support',
  'Badge / Trust Badge Support': 'badge_support',
  'Consultation': 'consultation',
  'Strategy Call': 'consultation',
  'Consultation / Strategy Call': 'consultation',
};
