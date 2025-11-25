import type { MemberBadgeUiStatus } from '@/lib/badges';

export type BadgeTemplateStatus = 'draft' | 'active' | 'coming-soon' | 'archived';

export interface BadgeTemplateRow {
  id: string;
  name: string;
  badge_code?: string | null;
  status?: BadgeTemplateStatus | null;
  accent_color?: string | null;
  description?: string | null;
  svg_template?: string | null;
  config?: unknown;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface BadgeTemplate {
  id: string;
  name: string;
  badgeCode: string;
  status: BadgeTemplateStatus | null;
  accentColor: string;
  description: string;
  svgTemplate: string | null;
  config?: unknown;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export const toBadgeTemplate = (row: BadgeTemplateRow): BadgeTemplate => ({
  id: row.id,
  name: row.name ?? 'Untitled Template',
  badgeCode: row.badge_code ?? '',
  status: row.status ?? null,
  accentColor: row.accent_color ?? 'from-blue-500 to-indigo-600',
  description: row.description ?? '',
  svgTemplate: row.svg_template ?? null,
  config: row.config,
  updatedAt: row.updated_at,
  createdAt: row.created_at,
});

export interface MemberBadgeSummary {
  label: string;
  code: string | null;
  status: MemberBadgeUiStatus;
  imageLightUrl: string | null;
  imageDarkUrl: string | null;
  svg?: string | null;
  profileUrl: string | null;
  rating: number | null;
  embedHtml?: string | null;
  embedStyle?: string | null;
  embedScriptUrl?: string | null;
}
