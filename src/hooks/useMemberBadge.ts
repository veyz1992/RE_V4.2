import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { ADMIN_MEMBERS } from '../../lib/mockData';

export type BadgeStatus = 'NONE' | 'PENDING' | 'ACTIVE' | 'REVOKED';

export interface MemberBadgeData {
  status: BadgeStatus;
  badgeLabel: string;
  imageLightUrl: string;
  imageDarkUrl: string;
  profileUrl: string;
  rating: number | null;
}

interface UseMemberBadgeOptions {
  memberId?: string;
  email?: string;
}

export function useMemberBadge(options?: UseMemberBadgeOptions): {
  badge: MemberBadgeData | null;
  isLoading: boolean;
  error: string | null;
} {
  const { session } = useAuth();

  const member = useMemo(() => {
    const { memberId, email } = options ?? {};
    const resolvedEmail = email ?? session?.user?.email;

    if (memberId) {
      const matchById = ADMIN_MEMBERS.find(({ id }) => id === memberId);
      if (matchById) return matchById;
    }

    if (resolvedEmail) {
      const matchByEmail = ADMIN_MEMBERS.find(({ email: memberEmail }) => memberEmail === resolvedEmail);
      if (matchByEmail) return matchByEmail;
    }

    return ADMIN_MEMBERS[0] ?? null;
  }, [options, session?.user?.email]);

  const badge = useMemo<MemberBadgeData | null>(() => {
    if (!member?.badge) {
      return null;
    }

    const numericRating = typeof member.rating === 'number' ? member.rating : Number(member.rating);
    const rating = Number.isFinite(numericRating) ? numericRating : null;

    return {
      status: member.badge.status ?? 'NONE',
      badgeLabel: member.badge.badgeLabel ?? '',
      imageLightUrl: member.badge.imageLightUrl ?? '',
      imageDarkUrl: member.badge.imageDarkUrl ?? member.badge.imageLightUrl ?? '',
      profileUrl: member.badge.profileUrl ?? '',
      rating,
    };
  }, [member]);

  // TODO: Replace mock data lookup with Supabase query:
  // - fetch active badge_designs row for the current profile
  // - map to MemberBadgeData shape

  return {
    badge,
    isLoading: false,
    error: null,
  };
}
