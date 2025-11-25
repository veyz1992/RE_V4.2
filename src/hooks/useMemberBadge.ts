import { useEffect, useState } from 'react';
import { FUNCTION_ENDPOINTS } from '@/lib/functions';
import { useAuth } from '@src/context/AuthContext';
import type { MemberBadgeView } from '@/lib/badges';

// This hook now fetches the active badge for the current profile from the Netlify function
// /.netlify/functions/member-badge, which reads from the Supabase badge_designs table.
export type BadgeStatus = 'NONE' | 'PENDING' | 'ACTIVE' | 'REVOKED';

export interface MemberBadgeData {
  status: BadgeStatus;
  badgeLabel: string;
  imageLightUrl: string | null;
  imageDarkUrl: string | null;
  profileUrl: string | null;
  rating: number | null;
}

interface UseMemberBadgeResult {
  badge: MemberBadgeData | null;
  isLoading: boolean;
  error: string | null;
}

export function useMemberBadge(): UseMemberBadgeResult {
  const { session } = useAuth();
  const profileId = session?.user?.id;
  const [badge, setBadge] = useState<MemberBadgeData | null>(null);
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
        const url = `${FUNCTION_ENDPOINTS.MEMBER_BADGE}?profileId=${encodeURIComponent(profileId)}`;
        const res = await fetch(url, { method: 'GET' });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed with status ${res.status}`);
        }

        const data: { badge: MemberBadgeView | null } = await res.json();

        if (!data.badge) {
          setBadge(null);
        } else {
          const mapped: MemberBadgeData = {
            status: data.badge.status,
            badgeLabel: data.badge.badgeLabel,
            imageLightUrl: data.badge.imageLightUrl,
            imageDarkUrl: data.badge.imageDarkUrl,
            profileUrl: data.badge.profileUrl,
            rating: data.badge.rating,
          };
          setBadge(mapped);
        }
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
