import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface BlueprintAccessResult {
  hasBlueprintAccess: boolean;
  loading: boolean;
  error?: string;
}

interface ProfileRow {
  id: string;
  membership_tier?: string | null;
}

interface SubscriptionRow {
  id: string;
  tier?: string | null;
  status?: string | null;
  profile_id?: string | null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'];
const BLUEPRINT_ELIGIBLE_TIERS = ['founding', 'gold'];
const BLUEPRINT_ADDON_TIER = 'blueprint_addon';

export const useBlueprintAccess = (): BlueprintAccessResult => {
  const { session } = useAuth();
  const [state, setState] = useState<BlueprintAccessResult>({
    hasBlueprintAccess: false,
    loading: false,
    error: undefined,
  });

  useEffect(() => {
    // If no session, user doesn't have access
    if (!session?.user?.id) {
      setState({
        hasBlueprintAccess: false,
        loading: false,
        error: undefined,
      });
      return;
    }

    let isMounted = true;
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    const checkBlueprintAccess = async () => {
      try {
        const userId = session.user.id;

        // First, get the user's profile to check membership_tier
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, membership_tier')
          .eq('id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        const profile = profileData as ProfileRow | null;

        // If no profile found, user doesn't have access
        if (!profile) {
          if (isMounted) {
            setState({
              hasBlueprintAccess: false,
              loading: false,
              error: undefined,
            });
          }
          return;
        }

        // Check if user has access through membership tier
        const membershipTier = profile.membership_tier?.toLowerCase().trim();
        const hasAccessViaTier = membershipTier && BLUEPRINT_ELIGIBLE_TIERS.includes(membershipTier);

        if (hasAccessViaTier) {
          if (isMounted) {
            setState({
              hasBlueprintAccess: true,
              loading: false,
              error: undefined,
            });
          }
          return;
        }

        // Check if user has access through blueprint addon subscription
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .select('id, tier, status, profile_id')
          .eq('profile_id', profile.id)
          .in('status', ACTIVE_SUBSCRIPTION_STATUSES);

        if (subscriptionError) {
          throw subscriptionError;
        }

        const subscriptions = subscriptionData as SubscriptionRow[] || [];
        const hasBlueprintAddon = subscriptions.some(
          sub => sub.tier === BLUEPRINT_ADDON_TIER
        );

        if (isMounted) {
          setState({
            hasBlueprintAccess: hasBlueprintAddon,
            loading: false,
            error: undefined,
          });
        }

      } catch (error) {
        console.error('Failed to check blueprint access:', error);
        if (isMounted) {
          setState({
            hasBlueprintAccess: false,
            loading: false,
            error: 'Failed to check access',
          });
        }
      }
    };

    void checkBlueprintAccess();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  return state;
};