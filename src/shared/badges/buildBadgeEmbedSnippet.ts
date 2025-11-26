import type { MemberBadgeSummary } from '@/lib/badges/model';

export interface BadgeEmbedContext {
  profileId?: string | null;
  membershipTier?: string | null;
}

export const buildBadgeEmbedSnippet = (
  badge?: MemberBadgeSummary | null,
  context: BadgeEmbedContext = {},
): { snippet: string | null; error: string | null } => {
  if (!badge) {
    return { snippet: null, error: 'Badge details are missing.' };
  }

  const { profileId, membershipTier } = context;
  const dataAttributes = [
    profileId ? `data-profile="${profileId}"` : null,
    membershipTier ? `data-tier="${membershipTier}"` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const hydrateTemplate = (template: string) =>
    template
      .replace(/{{\s*profileId\s*}}/gi, profileId ?? '')
      .replace(/{{\s*badgeCode\s*}}/gi, badge.code ?? '')
      .replace(/{{\s*tier\s*}}/gi, membershipTier ?? '')
      .trim();

  if (badge.embedHtml) {
    const hydratedHtml = hydrateTemplate(badge.embedHtml);
    const snippetParts = [] as string[];

    if (badge.embedStyle) {
      snippetParts.push(`<style>${badge.embedStyle}</style>`);
    }

    snippetParts.push(hydratedHtml);

    return { snippet: snippetParts.join('\n'), error: null };
  }

  if (badge.embedScriptUrl && badge.code) {
    const attributes = [`data-template="${badge.code}"`, dataAttributes].filter(Boolean).join(' ');
    const embedHtml = `<div data-re-badge ${attributes}></div>\n<script async src="${badge.embedScriptUrl}" ${attributes}></script>`;
    const snippetParts = [] as string[];

    if (badge.embedStyle) {
      snippetParts.push(`<style>${badge.embedStyle}</style>`);
    }

    snippetParts.push(embedHtml);

    return { snippet: snippetParts.join('\n'), error: null };
  }

  const imageUrl = badge.imageLightUrl ?? badge.imageDarkUrl;
  if (imageUrl) {
    const anchorAttributes = [
      badge.profileUrl ? `href="${badge.profileUrl}"` : null,
      'target="_blank"',
      'rel="noopener noreferrer"',
      dataAttributes || null,
    ]
      .filter(Boolean)
      .join(' ');

    const snippet = `<a ${anchorAttributes}>
  <img
    src="${imageUrl}"
    alt="Restoration Expertise Verified Member – ${badge.label}${membershipTier ? ` (${membershipTier})` : ''}"
    style="max-width:180px;height:auto;" />
</a>`;

    return { snippet, error: null };
  }

  return { snippet: null, error: 'No badge assets are available yet.' };
};
