import type { MemberBadgeUiStatus } from '@/lib/badges';

export type BadgeTemplateStatus = 'draft' | 'active' | 'coming-soon' | 'archived';

export interface BadgeTemplateRow {
  id: string;
  name: string;
  badge_code?: string | null;
  status?: BadgeTemplateStatus | null;
  accent_color?: string | null;
  accent_gradient?: string | null;
  background_image_url?: string | null;
  description?: string | null;
  svg_template?: string | null;
  config?: unknown;
  design_config?: unknown;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface BadgeTemplate {
  id: string;
  name: string;
  badgeCode: string;
  status: BadgeTemplateStatus | null;
  accentColor: string;
  accentGradient?: string | null;
  backgroundImageUrl?: string | null;
  description: string;
  svgTemplate: string | null;
  config?: unknown;
  designConfig?: unknown;
  updatedAt?: string | null;
  createdAt?: string | null;
}

export const toBadgeTemplate = (row: BadgeTemplateRow): BadgeTemplate => ({
  id: row.id,
  name: row.name ?? 'Untitled Template',
  badgeCode: row.badge_code ?? '',
  status: row.status ?? null,
  accentColor: row.accent_color ?? row.accent_gradient ?? 'from-blue-500 to-indigo-600',
  accentGradient: row.accent_gradient ?? row.accent_color ?? null,
  backgroundImageUrl: row.background_image_url ?? null,
  description: row.description ?? '',
  svgTemplate: row.svg_template ?? null,
  config: row.config ?? row.design_config,
  designConfig: row.design_config ?? row.config,
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
