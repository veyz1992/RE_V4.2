import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@src/context/AuthContext';
import type { MemberBadgeSummary } from '@/lib/badges/model';
import { fetchMemberBadgeSummaryForProfile } from '@/lib/badges/service';

// This hook fetches the active badge summary for the current profile using the Supabase-backed
// badge service so the dashboard can render embed-ready metadata.
interface UseMemberBadgeResult {
  badge: MemberBadgeSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMemberBadge(): UseMemberBadgeResult {
  const { session } = useAuth();
  const profileId = session?.user?.id;
  const [badge, setBadge] = useState<MemberBadgeSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadge = useCallback(async () => {
    if (!profileId) {
      setBadge(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { badge: badgeSummary, error: badgeError } = await fetchMemberBadgeSummaryForProfile(profileId);

      if (badgeError) {
        console.error('Failed to load member badge summary', badgeError);
        setError('Failed to load badge');
        setBadge(null);
      } else {
        setError(null);
        setBadge(badgeSummary);
      }
    } catch (err) {
      console.error('Failed to load member badge summary', err);
      setError('Failed to load badge');
      setBadge(null);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchBadge();
  }, [fetchBadge]);

  return { badge, isLoading, error, refetch: fetchBadge };
}
