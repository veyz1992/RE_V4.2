

import { Answers } from './types';

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