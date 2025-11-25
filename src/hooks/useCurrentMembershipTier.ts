import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@src/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface MembershipData {
  tier: string;
  status: string;
  isFree: boolean;
  isPaidMember: boolean;
  isFounding: boolean;
  isBronzeOrHigher: boolean;
}

interface SupabaseProfile {
  id: string;
  email?: string | null;
  company_name?: string | null;
  membership_tier?: string | null;
  member_status?: string | null;
  verification_status?: string | null;
  badge_rating?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  next_billing_date?: string | null;
  last_pci_score?: number | null;
  last_assessment_id?: string | null;
  [key: string]: unknown;
}

interface SupabaseSubscription {
  id: string;
  profile_id?: string | null;
  membership_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  tier?: string | null;
  status?: string | null;
  billing_cycle?: string | null;
  unit_amount_cents?: number | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

/**
 * Normalizes tier string to standard format
 */
const normalizeTier = (tier: string | null | undefined): string => {
  if (!tier) return 'free';
  
  const normalized = tier.toLowerCase().trim();
  
  // Handle various tier name formats
  switch (normalized) {
    case 'founding':
    case 'founder':
    case 'founding_member':
      return 'founding';
    case 'bronze':
      return 'bronze';
    case 'silver':
      return 'silver';
    case 'gold':
      return 'gold';
    case 'free':
    case '':
      return 'free';
    default:
      return normalized;
  }
};

/**
 * Determines membership tier data from profile and subscription information
 */
const determineMembershipData = (
  profile: SupabaseProfile | null,
  subscription: SupabaseSubscription | null
): MembershipData => {
  // Prefer subscription data if available and active, otherwise use profile data
  let tier: string;
  let status: string;

  if (subscription?.tier && subscription?.status && subscription.status === 'active') {
    tier = normalizeTier(subscription.tier);
    status = subscription.status;
  } else if (profile?.membership_tier) {
    tier = normalizeTier(profile.membership_tier);
    status = profile.member_status || 'inactive';
  } else {
    tier = 'free';
    status = 'inactive';
  }

  // Calculate derived properties
  const isFree = tier === 'free';
  const isPaidMember = !isFree;
  const isFounding = tier === 'founding';
  const isBronzeOrHigher = ['founding', 'bronze', 'silver', 'gold'].includes(tier);

  return {
    tier,
    status,
    isFree,
    isPaidMember,
    isFounding,
    isBronzeOrHigher,
  };
};

/**
 * Hook that provides the current user's membership tier information
 * 
 * @returns {MembershipData & { isLoading: boolean; error: string | null; refetch: () => void }}
 */
export const useCurrentMembershipTier = () => {
  const { session } = useAuth();
  const [membershipData, setMembershipData] = useState<MembershipData>(
    determineMembershipData(null, null)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembershipData = useCallback(async () => {
    if (!session?.user?.id) {
      setMembershipData(determineMembershipData(null, null));
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          company_name,
          membership_tier,
          member_status,
          verification_status,
          badge_rating,
          stripe_customer_id,
          stripe_subscription_id,
          next_billing_date,
          last_pci_score,
          last_assessment_id
        `)
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
        throw profileError;
      }

      const profile = profileData as SupabaseProfile | null;

      // Fetch active subscription data
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          profile_id,
          membership_id,
          stripe_customer_id,
          stripe_subscription_id,
          tier,
          status,
          billing_cycle,
          unit_amount_cents,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          canceled_at,
          created_at,
          updated_at
        `)
        .eq('profile_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionError) {
        console.warn('Failed to fetch subscription data:', subscriptionError);
        // Continue with profile data only
      }

      const subscription = subscriptionData as SupabaseSubscription | null;

      // Determine final membership data
      const data = determineMembershipData(profile, subscription);
      setMembershipData(data);
    } catch (fetchError) {
      console.error('[useCurrentMembershipTier] Failed to fetch membership data:', fetchError);
      setError('Failed to load membership information');
      // Set fallback data
      setMembershipData(determineMembershipData(null, null));
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const refetch = useCallback(() => {
    void fetchMembershipData();
  }, [fetchMembershipData]);

  useEffect(() => {
    void fetchMembershipData();
  }, [fetchMembershipData]);

  return {
    ...membershipData,
    isLoading,
    error,
    refetch,
  };
};

export default useCurrentMembershipTier;