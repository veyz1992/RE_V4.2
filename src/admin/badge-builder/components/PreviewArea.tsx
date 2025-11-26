import React, { useEffect, useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, Crosshair } from 'lucide-react';
import BadgeRenderer from '@src/shared/badges/BadgeRenderer';
import { useDesign } from '../context/DesignContext';
import type { TextLayer } from '../types';
import { getTierStyle } from '@/shared/badges/tierStyles';

interface PreviewAreaProps {
  baseScale?: number;
  containerRef?: React.RefObject<HTMLDivElement>;
}

const PreviewArea: React.FC<PreviewAreaProps> = ({ baseScale = 1, containerRef }) => {
  const { state, availableTemplates } = useDesign();
  const [zoom, setZoom] = useState(baseScale);
  const [showGuides, setShowGuides] = useState(true);
  const tierStyle = useMemo(() => getTierStyle(state.tier), [state.tier]);

  useEffect(() => {
    setZoom(baseScale);
  }, [baseScale]);

  const memberName = useMemo(() => {
    const layer = state.layers.find(l => l.type === 'text' && l.id === 'member-name') as TextLayer | undefined;
    return layer?.text || state.companyName || 'Company Name';
  }, [state.companyName, state.layers]);

  const tagline = useMemo(() => {
    const locationLayer = state.layers.find(l => l.type === 'text' && l.id === 'location') as TextLayer | undefined;
    return locationLayer?.text || state.location || 'City, State';
  }, [state.layers, state.location]);

  const rating = useMemo(() => {
    const ratingLayer = state.layers.find(l => l.type === 'text' && l.id === 'rating') as TextLayer | undefined;
    return ratingLayer?.text || state.rating || tierStyle.ratingPreset;
  }, [state.layers, state.rating, tierStyle.ratingPreset]);

  const templatePreset = useMemo(() => {
    const template = availableTemplates.find(t => t.id === state.templateId);
    return tierStyle.stylePreset || template?.id || 'standard-member';
  }, [availableTemplates, state.templateId, tierStyle.stylePreset]);

  const templateName = useMemo(() => {
    const template = availableTemplates.find(t => t.id === state.templateId);
    return tierStyle.label || template?.name || 'Verified Member';
  }, [availableTemplates, state.templateId, tierStyle.label]);

  const backgroundImage = state.backgroundImage;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/70 px-4 py-2 backdrop-blur">
        <h2 className="text-sm font-semibold text-[var(--text-main)] whitespace-nowrap">Live Preview</h2>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
            <button
                onClick={() => setShowGuides(!showGuides)}
                className={`px-3 py-2 rounded text-xs flex items-center gap-1 transition-colors ${showGuides ? 'bg-info/10 text-info' : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'}`}
            >
                <Crosshair size={14} />
                <span className="hidden sm:inline">Guides</span>
            </button>
            <div className="h-4 w-px bg-[var(--border-subtle)] mx-2 hidden sm:block"></div>
            <div className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                  <ZoomOut size={16} />
              </button>
              <span className="text-xs font-mono w-12 text-center text-[var(--text-muted)]">
                  {Math.round(zoom * 100)}%
              </span>
              <button
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                  <ZoomIn size={16} />
              </button>
            </div>
            <button
                onClick={() => setZoom(1)}
                className="px-3 py-2 rounded text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
            >
                1:1
            </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 md:p-6"
      >
        <div
            ref={containerRef}
            className="relative mx-auto"
            style={{
                width: state.imageWidth,
                height: state.imageHeight,
                maxWidth: '100%',
                aspectRatio: `${state.imageWidth} / ${state.imageHeight}`,
                transform: `scale(${zoom})`,
                transformOrigin: 'center center'
            }}
        >
            <BadgeRenderer
              companyName={memberName}
              membershipTier={templateName}
              tagline={tagline}
              stylePreset={templatePreset}
              ratingLabel={rating}
              backgroundImageUrl={backgroundImage}
            />

            {showGuides && (
              <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-cyan-400/40">
                <div className="absolute left-4 top-4 rounded-full bg-info/10 px-3 py-1 text-xs font-semibold text-info">Preview guides</div>
              </div>
            )}
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[10px] text-[var(--text-muted)]">
          <p className="font-mono">
            {state.imageWidth} x {state.imageHeight}px
          </p>
          <p>
             {showGuides ? 'Guides On' : 'Guides Off'}
          </p>
      </div>
    </div>
  );
};

export default PreviewArea;
