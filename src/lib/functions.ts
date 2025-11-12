// Utility for standardizing Netlify function paths
export const FN = (name: string): string => {
  return `/.netlify/functions/${name}`;
};

// Common function endpoints
export const FUNCTION_ENDPOINTS = {
  CHECKOUT: FN('create-checkout-session'),
  STRIPE_WEBHOOK: FN('stripe-webhook'),
  EMAIL_ELIGIBILITY: FN('check-email-eligibility'),
  CHECKOUT_HEALTH: FN('checkout-health'),
  STRIPE_SESSION: FN('get-stripe-session'),
  SAVE_ASSESSMENT: FN('save-assessment'),
} as const;