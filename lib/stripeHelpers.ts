/**
 * Stripe integration helper functions
 */

import { TIER_CONFIG } from '../constants';

// Build price mapping from centralized config
const buildPriceMapping = () => {
  const PRICE_IDS: Record<string, string> = {};
  Object.entries(TIER_CONFIG).forEach(([tierName, config]) => {
    const envValue = process.env[config.stripeEnvKey];
    if (envValue) {
      PRICE_IDS[tierName] = envValue;
    }
  });
  
  return Object.fromEntries(
    Object.entries(PRICE_IDS).map(([tier, priceId]) => [priceId, tier]),
  ) as Record<string, string>;
};

const PRICE_TO_TIER = buildPriceMapping();

/**
 * Map Stripe price ID to membership tier name
 */
export const getTierFromPriceId = (priceId: string): string => {
  const tier = PRICE_TO_TIER[priceId];
  if (!tier) {
    console.warn(`Unknown price ID: ${priceId}, defaulting to Bronze`);
    return 'Bronze';
  }
  return tier;
};

/**
 * Map Stripe price/metadata to database membership tier
 */
export const mapPriceToMembershipTier = (priceId: string, metadata?: Record<string, string>): string => {
  // Check metadata first for explicit tier mapping
  if (metadata?.tier) {
    return metadata.tier;
  }

  // Fallback to price ID mapping from TIER_CONFIG
  const tier = getTierFromPriceId(priceId);
  
  // Map tier names to database values
  switch (tier.toLowerCase()) {
    case 'founding member':
    case 'founding-member':
      return 'gold';
    case 'gold':
      return 'gold';
    case 'silver':
      return 'silver';
    case 'bronze':
      return 'bronze';
    default:
      return 'gold'; // Default for unknown tiers
  }
};

/**
 * Format payment method for logging
 */
export const formatPaymentMethod = (paymentMethod: any): string => {
  if (!paymentMethod) return 'No payment method';
  
  if (paymentMethod.type === 'card' && paymentMethod.card) {
    return `${paymentMethod.card.brand.toUpperCase()} ending in ${paymentMethod.card.last4}`;
  }
  
  return `${paymentMethod.type} payment method`;
};