export type BadgeStatus = 'draft' | 'pending_review' | 'active' | 'revoked';

export interface BadgeDesignRow {
  id: string;
  profile_id: string;
  status: BadgeStatus;
  version: number;
  design_config: unknown; // will be the BadgeBuilder DesignState JSON
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

export interface MemberBadgeView {
  status: BadgeStatus;
  badgeLabel: string;
  imageLightUrl: string | null;
  imageDarkUrl: string | null;
  profileUrl: string | null;
  rating: number | null;
}

export const mapRowToMemberBadgeView = (
  row: BadgeDesignRow | null
): MemberBadgeView | null => {
  if (!row) {
    return null;
  }

  return {
    status: row.status,
    badgeLabel: row.badge_label ?? '',
    imageLightUrl: row.image_light_url || null,
    imageDarkUrl: row.image_dark_url || null,
    profileUrl: null,
    rating: row.rating ?? null,
  };
};
