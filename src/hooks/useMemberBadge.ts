import { useEffect, useState } from 'react';
import { useAuth } from '@src/context/AuthContext';
import type { MemberBadgeSummary } from '@/lib/badges/model';
import { fetchMemberBadgeSummary } from '@/lib/badges/service';
import { supabase } from '@/lib/supabase';

interface UseMemberBadgeResult {
  badge: MemberBadgeSummary | null;
  isLoading: boolean;
  error: string | null;
}

export function useMemberBadge(): UseMemberBadgeResult {
  const { session } = useAuth();
  const profile = session?.user;
  const [badge, setBadge] = useState<MemberBadgeSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !profile?.id) return;

    let isMounted = true;
    setIsLoading(true);

    (async () => {
      try {
        const { badge, error } = await fetchMemberBadgeSummary(supabase, profile.id);

        if (!isMounted) return;

        if (error) {
          console.error('Failed to load member badge summary', error);
          setError(error);
          setBadge(null);
        } else {
          setError(null);
          setBadge(badge);
        }
      } catch (err) {
        if (!isMounted) return;

        console.error('Failed to load member badge summary', err);
        const message = err instanceof Error ? err.message : 'Failed to load badge';
        setError(message);
        setBadge(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [supabase, profile?.id]);

  return { badge, isLoading, error };
}
