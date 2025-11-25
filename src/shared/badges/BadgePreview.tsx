import React from 'react';
import { CheckCircle2, Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { MemberBadgeSummary, BadgeTemplate } from '@/lib/badges/model';

export type BadgePreviewSummary = {
  label: string;
  status?: MemberBadgeSummary['status'] | string;
  imageLightUrl: string | null;
  imageDarkUrl: string | null;
  embedHtml?: string | null;
  code?: string | null;
  previewContent?: React.ReactNode;
  updatedAt?: string | null;
};

interface BadgePreviewProps {
  summary?: BadgePreviewSummary | BadgeTemplate | null;
  isLoading?: boolean;
  error?: string | null;
  embedSnippet?: string | null;
  onCopyEmbed?: () => void;
  copied?: boolean;
}

const getImageUrl = (summary?: BadgePreviewSummary | BadgeTemplate | null) => {
  if (!summary) return null;
  if ('imageLightUrl' in summary) {
    return summary.imageLightUrl ?? summary.imageDarkUrl ?? null;
  }
  return summary.backgroundImageUrl ?? null;
};

export const BadgePreview: React.FC<BadgePreviewProps> = ({
  summary,
  isLoading = false,
  error,
  embedSnippet,
  onCopyEmbed,
  copied,
}) => {
  const imageUrl = getImageUrl(summary);
  const statusLabel = summary && 'status' in summary ? summary.status : 'draft';
  const previewContent = summary && 'previewContent' in summary ? summary.previewContent : null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Preview</p>
          <h3 className="text-xl font-semibold text-[var(--text-main)]">Badge preview</h3>
        </div>
        {statusLabel && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
            <ShieldCheck className="h-3.5 w-3.5 text-info" />
            {statusLabel}
          </span>
        )}
      </div>

      <div className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
        <div className="flex h-full min-h-[280px] items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
          {isLoading && (
            <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Loading preview…</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center gap-2 text-center text-[var(--text-muted)]">
              <TriangleAlert className="h-6 w-6 text-error" />
              <p className="text-sm font-semibold text-[var(--text-main)]">Could not load preview</p>
              <p className="text-xs">{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="flex flex-col items-center gap-3 text-center text-[var(--text-muted)]">
              {previewContent ? (
                <div className="w-full overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
                  {previewContent}
                </div>
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt={(summary && 'label' in summary ? summary.label : 'Badge preview') || 'Badge preview'}
                  className="max-h-[320px] w-auto"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-muted)]">
                  No preview yet
                </div>
              )}
              {summary && 'label' in summary && (
                <div className="text-sm text-[var(--text-main)]">{summary.label}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {embedSnippet && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
            <span>Embed code</span>
            {copied && (
              <span className="inline-flex items-center gap-1 text-[var(--text-main)]">
                <CheckCircle2 className="h-4 w-4 text-success" /> Copied
              </span>
            )}
          </div>
          <div className="relative">
            <textarea
              className="h-28 w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs text-[var(--text-main)]"
              readOnly
              value={embedSnippet}
            />
            {onCopyEmbed && (
              <button
                onClick={onCopyEmbed}
                className="absolute bottom-2 right-2 inline-flex items-center gap-2 rounded-md bg-info px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
              >
                Copy
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgePreview;
