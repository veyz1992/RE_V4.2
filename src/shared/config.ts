// Shared constants and configuration
// This module should not import any React components to avoid cycles

export const PLAN_STORAGE_KEY = 'restorationexpertise:last-plan';
export const EMAIL_STORAGE_KEY = 'restorationexpertise:last-email';
export const ASSESSMENT_ID_STORAGE_KEY = 'restorationexpertise:last-assessment-id';
export const CHECKOUT_SESSION_STORAGE_KEY = 'restorationexpertise:last-checkout-session-id';

export type Plan = 'bronze' | 'silver' | 'gold' | 'founding-member';

export const normalizePlan = (input?: string | null): Plan => {
  switch (input?.toLowerCase()) {
    case 'bronze':
      return 'bronze';
    case 'silver':
      return 'silver';
    case 'gold':
      return 'gold';
    case 'founding-member':
      return 'founding-member';
    default:
      return 'founding-member';
  }
};