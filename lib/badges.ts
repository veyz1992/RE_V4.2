export type BadgeDesignStatus = 'draft' | 'pending_review' | 'active' | 'revoked';

export interface BadgeDesignRow {
  id: string;
  profile_id: string;
  status: BadgeDesignStatus;
  version: number;
  design_config: unknown;
  badge_label: string | null;
  rating: number | null;
  image_light_url: string | null;
  image_dark_url: string | null;
  embed_code_version: string | null;
  created_at: string;
  updated_at: string;
  approved_by_admin_id: string | null;
  approved_at: string | null;
}

export type MemberBadgeUiStatus = 'NONE' | 'PENDING' | 'ACTIVE' | 'REVOKED';

export interface MemberBadgeView {
  status: MemberBadgeUiStatus;
  badgeLabel: string;
  imageLightUrl: string | null;
  imageDarkUrl: string | null;
  profileUrl: string | null;
  rating: number | null;
}

export const mapRowToMemberBadgeView = (
  row: BadgeDesignRow | null,
  profileUrl: string | null = null,
): MemberBadgeView | null => {
  if (!row) {
    return null;
  }

  const status: MemberBadgeUiStatus =
    row.status === 'active'
      ? 'ACTIVE'
      : row.status === 'pending_review'
      ? 'PENDING'
      : row.status === 'revoked'
      ? 'REVOKED'
      : 'NONE';

  return {
    status,
    badgeLabel: row.badge_label ?? 'Restoration Expertise Badge',
    imageLightUrl: row.image_light_url,
    imageDarkUrl: row.image_dark_url,
    profileUrl,
    rating: row.rating,
  };
};
