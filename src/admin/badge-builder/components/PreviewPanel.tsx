import React, { useMemo, useState } from 'react';
import { Download, FileCode2, MonitorSmartphone, Smartphone, Tv } from 'lucide-react';
import PreviewArea from './PreviewArea';
import type { MemberBadgeSummary } from '@/lib/badges/model';
import BadgePreview from '@src/shared/badges/BadgePreview';
import { useDesign } from '../context/DesignContext';

interface PreviewPanelProps {
  formState: {
    name: string;
    badgeCode: string;
    status: string;
  };
  loading: boolean;
  embedSnippet?: string | null;
  templateName: string;
  templateStatus: string;
  onChangeTemplate: () => void;
}

const sizePresets: Record<'sm' | 'md' | 'lg', { label: string; scale: number }> = {
  sm: { label: 'Small', scale: 0.75 },
  md: { label: 'Medium', scale: 1 },
  lg: { label: 'Large', scale: 1.25 },
};

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  formState,
  loading,
  embedSnippet,
  templateName,
  templateStatus,
  onChangeTemplate,
}) => {
  const { state } = useDesign();
  const [embedCopied, setEmbedCopied] = useState(false);
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>('md');

  const previewSummary = useMemo(
    () => ({
      label: formState.name || 'Badge preview',
      code: formState.badgeCode,
      status: (formState.status as MemberBadgeSummary['status'] | string) ?? 'draft',
      imageLightUrl: state.backgroundImage ?? null,
      imageDarkUrl: state.backgroundImage ?? null,
      embedHtml: null,
      previewContent: <PreviewArea baseScale={sizePresets[size].scale} />,
    }),
    [formState.badgeCode, formState.name, formState.status, size, state.backgroundImage],
  );

  const statusLabel =
    templateStatus === 'active'
      ? 'Published'
      : templateStatus === 'archived'
        ? 'Archived'
        : templateStatus === 'coming-soon'
          ? 'Coming soon'
          : 'Draft';
  const statusStyle =
    templateStatus === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : templateStatus === 'archived'
        ? 'bg-gray-100 text-gray-700'
        : 'bg-amber-100 text-amber-700';

  const handleCopyEmbed = async () => {
    if (!embedSnippet) return;
    await navigator.clipboard.writeText(embedSnippet);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 1200);
  };

  const downloadSvg = () => {
    if (!embedSnippet) return;
    const blob = new Blob([embedSnippet], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${formState.badgeCode || 'badge'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = () => {
    if (!embedSnippet) return;
    const blob = new Blob([embedSnippet], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || state.imageWidth;
      canvas.height = img.height || state.imageHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `${formState.badgeCode || 'badge'}.png`;
        link.click();
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  return (
    <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-sm">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Live preview</p>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-[var(--text-main)]">
                Current template: <span className="text-info">{templateName}</span>
              </h3>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onChangeTemplate}
              className="inline-flex items-center gap-2 rounded-md bg-info px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Change template
            </button>
            <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] shadow-sm">
              {Object.entries(sizePresets).map(([key, config]) => (
                <button
                  key={key}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 transition ${
                    size === key ? 'bg-info text-white shadow-sm' : 'hover:bg-[var(--bg-subtle)]'
                  }`}
                  onClick={() => setSize(key as 'sm' | 'md' | 'lg')}
                >
                  {key === 'sm' && <Smartphone size={14} />}
                  {key === 'md' && <MonitorSmartphone size={14} />}
                  {key === 'lg' && <Tv size={14} />}
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs">
          <button
            onClick={handleCopyEmbed}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--bg-card)] px-3 py-2 font-semibold text-[var(--text-main)] shadow-sm disabled:opacity-60"
            disabled={!embedSnippet}
          >
            <FileCode2 size={16} /> {embedCopied ? 'Copied!' : 'Copy embed code'}
          </button>
          <div className="h-6 w-px bg-[var(--border-subtle)]" />
          <button
            onClick={downloadPng}
            className="inline-flex items-center gap-2 rounded-md bg-info px-3 py-2 font-semibold text-white shadow-sm disabled:opacity-60"
            disabled={!embedSnippet}
          >
            <Download size={16} /> Download PNG
          </button>
          <button
            onClick={downloadSvg}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 font-semibold text-[var(--text-main)] shadow-sm disabled:opacity-60"
            disabled={!embedSnippet}
          >
            <Download size={16} /> Download SVG
          </button>
        </div>

        <div className="mx-auto w-full max-w-[960px]">
          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
            <BadgePreview
              summary={previewSummary}
              isLoading={loading}
              embedSnippet={embedSnippet || undefined}
              onCopyEmbed={handleCopyEmbed}
              copied={embedCopied}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
