import React, { useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { getTierStyle, TIER_STYLE_OPTIONS } from '@/shared/badges/tierStyles';
import LayerControls from './LayerControls';
import { useDesign } from '../context/DesignContext';
import type { DesignState } from '../types';

interface TemplateFormState {
  name: string;
  badgeCode: string;
  status: string;
  accentColor: string;
  description: string;
  svgTemplate: string;
}

interface EditorPanelProps {
  formState: TemplateFormState;
  onFormChange: (changes: Partial<TemplateFormState>) => void;
  onSave: (state: DesignState) => void;
  saving: boolean;
  loading: boolean;
  dirty: boolean;
  savedAtLabel: string;
  badgeCodeError?: string | null;
  onOpenTemplatePicker: () => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  formState,
  onFormChange,
  onSave,
  saving,
  loading,
  dirty,
  savedAtLabel,
  badgeCodeError,
  onOpenTemplatePicker,
}) => {
  const { state, actions } = useDesign();
  const tierStyle = useMemo(() => getTierStyle(state.tier), [state.tier]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) actions.updateBackground(file);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Template editor</p>
            <h2 className="text-xl font-semibold text-[var(--text-main)]">Template settings</h2>
            <p className="text-xs text-[var(--text-muted)]">{dirty ? 'Unsaved changes' : `Saved ${savedAtLabel}`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Unsaved changes
              </span>
            )}
            <button
              onClick={() => onSave(state)}
              className="inline-flex items-center gap-2 rounded-md bg-info px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              disabled={saving || loading}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save template
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <section className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Template</p>
                <h3 className="text-lg font-semibold text-[var(--text-main)]">{formState.name || 'No template selected'}</h3>
              </div>
              <button
                onClick={onOpenTemplatePicker}
                className="inline-flex items-center gap-2 rounded-md bg-info px-3 py-2 text-sm font-semibold text-white shadow-sm"
              >
                Change template
              </button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Swap templates at any time to instantly load their settings and preview.
            </p>
          </section>

          <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--text-main)]">Basics</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                Template name
                <input
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                  value={formState.name}
                  onChange={(e) => onFormChange({ name: e.target.value })}
                  placeholder="e.g. Founding Member"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                Badge code / shortcode
                <input
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                  value={formState.badgeCode}
                  onChange={(e) => onFormChange({ badgeCode: e.target.value })}
                  placeholder="Short code"
                />
                {badgeCodeError && <span className="text-xs text-error">{badgeCodeError}</span>}
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
              Description
              <textarea
                className="min-h-[80px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                value={formState.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                placeholder="What makes this badge special?"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                Status
                <select
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                  value={formState.status}
                  onChange={(e) => onFormChange({ status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Published</option>
                  <option value="coming-soon">Coming soon</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                Member tier
                <select
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                  value={tierStyle.key}
                  onChange={(e) => {
                    const nextTier = e.target.value;
                    actions.setTier(nextTier);
                    const nextStyle = getTierStyle(nextTier);
                    onFormChange({ accentColor: nextStyle.accentGradient });
                  }}
                >
                  {TIER_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
              Tier badge code
              <input
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                value={tierStyle.templateId ?? 'standard-member'}
                readOnly
              />
            </label>
          </section>
        </div>

        <div className="space-y-5 lg:col-span-3">
          <section className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-main)]">Text & labels</h3>
              <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-muted)]">Live updates</span>
            </div>
            <LayerControls />
          </section>

          <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-main)]">Design</h3>
              <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Colors & backgrounds</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                Accent / gradient
                <input
                  className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                  value={formState.accentColor}
                  onChange={(e) => onFormChange({ accentColor: e.target.value })}
                  placeholder="Accent gradient classes"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                Background image
                <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
                  <span className="truncate text-xs text-[var(--text-muted)]">
                    {state.backgroundImage ? 'Background image active' : 'No background selected'}
                  </span>
                  <label
                    htmlFor="bg-upload"
                    className="cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1 text-xs font-semibold text-info shadow-sm"
                  >
                    Change Image
                  </label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="bg-upload" />
                </div>
              </label>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-main)]">Advanced</h3>
              <button
                onClick={() => setAdvancedOpen((prev) => !prev)}
                className="text-xs font-semibold text-info hover:underline"
              >
                {advancedOpen ? 'Hide' : 'Show'} advanced fields
              </button>
            </div>
            {advancedOpen && (
              <div className="space-y-4">
                <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
                  SVG template
                  <textarea
                    className="min-h-[140px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 font-mono text-xs text-[var(--text-main)]"
                    value={formState.svgTemplate}
                    onChange={(e) => onFormChange({ svgTemplate: e.target.value })}
                    placeholder="Optional raw SVG markup"
                  />
                </label>
                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-muted)]">Review the current design payload for debugging or export.</p>
                  <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
                    <pre className="max-h-56 overflow-auto text-xs text-[var(--text-main)]">
                      {JSON.stringify({ ...state, backgroundImage: state.backgroundImage ? '[image-data]' : null }, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
