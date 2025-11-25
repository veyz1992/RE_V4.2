import { useEffect, useState } from 'react';
import { useAuth } from '@src/context/AuthContext';
import type { MemberBadgeSummary } from '@/lib/badges/model';
import { fetchMemberBadgeSummary } from '@/lib/badges/service';

// This hook fetches the active badge summary for the current profile using the Supabase-backed
// badge service so the dashboard can render embed-ready metadata.
interface UseMemberBadgeResult {
  badge: MemberBadgeSummary | null;
  isLoading: boolean;
  error: string | null;
}

export function useMemberBadge(): UseMemberBadgeResult {
  const { session } = useAuth();
  const profileId = session?.user?.id;
  const [badge, setBadge] = useState<MemberBadgeSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadge = async () => {
      if (!profileId) {
        setBadge(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { badge: summary, error: badgeError } = await fetchMemberBadgeSummary(profileId);

        if (badgeError) {
          setError(badgeError);
          setBadge(null);
          return;
        }

        setBadge(summary);
      } catch (err: any) {
        console.error('Failed to load member badge', err);
        setError(err?.message ?? 'Failed to load badge');
        setBadge(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBadge();
  }, [profileId]);

  return { badge, isLoading, error };
}
