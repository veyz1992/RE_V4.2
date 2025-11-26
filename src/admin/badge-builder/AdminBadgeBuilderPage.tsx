import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  ChevronDown,
  Copy,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import {
  fetchBadgeTemplates,
  upsertBadgeTemplate,
  deleteBadgeTemplate,
  type BadgeTemplateRow,
} from 'lib/badges/service';
import { DesignProvider, useDesign } from './context/DesignContext';
import { INITIAL_LAYERS, DEFAULT_TEMPLATES } from './constants';
import type { DesignState, Template } from './types';
import LayerControls from './components/LayerControls';
import CodeModal from './components/CodeModal';
import PreviewPanel from './components/PreviewPanel';
import { getTierStyle, TIER_STYLE_OPTIONS } from '@/shared/badges/tierStyles';

interface TemplateFormState {
  name: string;
  badgeCode: string;
  status: string;
  accentColor: string;
  description: string;
  svgTemplate: string;
}

const DEFAULT_TIER_STYLE = getTierStyle();

const BASE_DESIGN_STATE: DesignState = {
  templateId: DEFAULT_TIER_STYLE.templateId ?? 'standard-member',
  tier: DEFAULT_TIER_STYLE.key,
  companyName: '',
  location: '',
  rating: DEFAULT_TIER_STYLE.ratingPreset,
  backgroundImage: null,
  imageWidth: 1200,
  imageHeight: 600,
  layers: INITIAL_LAYERS,
  customTemplates: [],
};

const DEFAULT_FORM_STATE: TemplateFormState = {
  name: '',
  badgeCode: '',
  status: 'draft',
  accentColor: DEFAULT_TIER_STYLE.accentGradient,
  description: '',
  svgTemplate: '',
};

const normalizeDesignState = (config?: unknown): DesignState => {
  if (!config || typeof config !== 'object') {
    return { ...BASE_DESIGN_STATE, layers: [...BASE_DESIGN_STATE.layers] };
  }

  const parsed = config as Partial<DesignState>;
  const layers = Array.isArray((parsed as { layers?: unknown }).layers)
    ? (parsed as { layers: DesignState['layers'] }).layers
    : BASE_DESIGN_STATE.layers;

  const tierStyle = getTierStyle(parsed.tier ?? BASE_DESIGN_STATE.tier);
  const templateId = parsed.templateId ?? tierStyle.templateId ?? BASE_DESIGN_STATE.templateId;
  const rating = parsed.rating ?? tierStyle.ratingPreset;

  return {
    ...BASE_DESIGN_STATE,
    ...parsed,
    tier: tierStyle.key,
    templateId,
    rating,
    layers,
    backgroundImage: parsed.backgroundImage ?? null,
    customTemplates: [],
  };
};

const mapRowToTemplate = (row: BadgeTemplateRow): Template => {
  const design = normalizeDesignState(row.config);
  const tierStyle = getTierStyle(design.tier);
  return {
    id: row.id,
    name: row.name || 'Untitled Template',
    description: row.description || 'Badge template',
    badge: row.badge_code || 'TMP',
    accentColor: row.accent_color || tierStyle.accentGradient,
    imageUrl: design.backgroundImage || undefined,
    status: (row.status as Template['status']) ?? undefined,
    layers: design.layers,
  };
};

const buildFormStateFromRow = (row?: BadgeTemplateRow | null, design?: DesignState): TemplateFormState => {
  const tierStyle = getTierStyle(design?.tier);
  return {
  name: row?.name ?? '',
  badgeCode: row?.badge_code ?? '',
  status: row?.status ?? 'draft',
  accentColor: row?.accent_color ?? tierStyle.accentGradient,
  description: row?.description ?? '',
  svgTemplate: row?.svg_template ?? '',
  };
};

const buildDesignSeedFromRow = (row?: BadgeTemplateRow | null): DesignState => {
  if (!row) {
    return { ...BASE_DESIGN_STATE, layers: [...BASE_DESIGN_STATE.layers] };
  }

  const normalized = normalizeDesignState(row.config);
  const tierStyle = getTierStyle(normalized.tier);

  return { ...normalized, layers: [...normalized.layers], rating: normalized.rating || tierStyle.ratingPreset };
};

const statusOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'coming-soon', label: 'Coming soon' },
  { value: 'archived', label: 'Archived' },
];

const TemplatesSidebar: React.FC<{
  templates: BadgeTemplateRow[];
  selectedId: string | null;
  onSelect: (row: BadgeTemplateRow) => void;
  onCreate: () => void;
  onDuplicate: (row: BadgeTemplateRow) => void;
  onArchive: (row: BadgeTemplateRow) => void;
  onDelete: (row: BadgeTemplateRow) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}> = ({
  templates,
  selectedId,
  onSelect,
  onCreate,
  onDuplicate,
  onArchive,
  onDelete,
  loading,
  error,
  onRetry,
}) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      templates.filter((template) => {
        const matchesSearch = template.name.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = status === 'all' || (template.status ?? 'draft') === status;
        return matchesSearch && matchesStatus;
      }),
    [search, status, templates],
  );

  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Templates</p>
          <h2 className="text-base font-semibold text-[var(--text-main)]">Supabase badge templates</h2>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
          <button
            className="inline-flex items-center gap-1 rounded-md bg-info px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
            onClick={onCreate}
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <input
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-main)]"
            placeholder="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="col-span-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-main)]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-3 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{error}</p>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] shadow-sm"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-hidden">
        {loading && templates.length === 0 && (
          <div className="space-y-2">
            {[...Array(3)].map((_, idx) => (
              <div key={`skeleton-${idx}`} className="h-12 animate-pulse rounded-lg bg-[var(--bg-subtle)]" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-4 text-sm text-[var(--text-muted)]">
            <p className="font-semibold text-[var(--text-main)]">No templates yet</p>
            <p className="text-xs">Create your first badge template to get started.</p>
            <button
              onClick={onCreate}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-info px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
            >
              <Plus className="h-4 w-4" /> Create template
            </button>
          </div>
        )}

        <div className="h-full space-y-2 overflow-auto pr-1">
          {filtered.map((template) => {
            const isSelected = selectedId === template.id;
            return (
              <div
                key={template.id}
                className={`relative flex items-start justify-between rounded-xl border px-3 py-2 transition hover:border-[var(--border-subtle)] ${
                  isSelected
                    ? 'border-info/70 bg-[var(--bg-subtle)] ring-2 ring-info/15'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                }`}
              >
                <button
                  onClick={() => onSelect(template)}
                  className="flex flex-1 flex-col items-start text-left"
                  disabled={loading}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-main)]">{template.name}</span>
                    <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                      {template.badge_code || '—'}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                    <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 font-semibold">{template.status || 'draft'}</span>
                    <span>
                      Updated {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : 'not saved'}
                    </span>
                  </div>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId((prev) => (prev === template.id ? null : template.id))}
                    className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenuId === template.id && (
                    <div className="absolute right-0 z-10 mt-1 w-36 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-lg">
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--bg-subtle)]"
                        onClick={() => {
                          onDuplicate(template);
                          setOpenMenuId(null);
                        }}
                      >
                        <Copy className="h-4 w-4" /> Duplicate
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--bg-subtle)]"
                        onClick={() => {
                          onArchive(template);
                          setOpenMenuId(null);
                        }}
                      >
                        <ChevronDown className="h-4 w-4" /> Archive
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-error hover:bg-red-50"
                        onClick={() => {
                          onDelete(template);
                          setOpenMenuId(null);
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const TemplateEditor: React.FC<{
  formState: TemplateFormState;
  onFormChange: (changes: Partial<TemplateFormState>) => void;
  onSave: (state: DesignState) => void;
  saving: boolean;
  loading: boolean;
  dirty: boolean;
  savedAtLabel: string;
  badgeCodeError?: string | null;
}> = ({ formState, onFormChange, onSave, saving, loading, dirty, savedAtLabel, badgeCodeError }) => {
  const { state, actions } = useDesign();
  const tierStyle = useMemo(() => getTierStyle(state.tier), [state.tier]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) actions.updateBackground(file);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-4 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Badge Editor</p>
          <h2 className="text-xl font-semibold text-[var(--text-main)]">Template settings</h2>
          <p className="text-xs text-[var(--text-muted)]">{dirty ? 'Unsaved changes' : `Saved ${savedAtLabel}`}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={() => onSave(state)}
            disabled={saving || loading || !dirty}
            aria-busy={saving || loading}
            className="inline-flex items-center gap-2 rounded-md bg-info px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Up to date'}
          </button>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-main)]">Basics</h3>
          <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Names, codes & tiers</span>
        </div>
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
            Badge code
            <input
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
              value={formState.badgeCode}
              onChange={(e) => onFormChange({ badgeCode: e.target.value })}
              placeholder="Short code"
            />
            {badgeCodeError && <span className="text-xs text-error">{badgeCodeError}</span>}
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            Status
            <select
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
              value={formState.status}
              onChange={(e) => onFormChange({ status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
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
          <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            Tier badge code
            <input
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
              value={tierStyle.templateId ?? 'standard-member'}
              readOnly
            />
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
      </section>

      <section className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-main)]">Design</h3>
          <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Backgrounds & layers</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
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
          <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            Accent/gradient selector
            <input
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
              value={formState.accentColor}
              onChange={(e) => onFormChange({ accentColor: e.target.value })}
              placeholder="Accent gradient classes"
            />
          </label>
        </div>
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
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Text & position controls</p>
            <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-muted)]">Live updates</span>
          </div>
          <LayerControls />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-main)]">Advanced</h3>
          <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">JSON config viewer</span>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Review the current design payload for debugging or export.</p>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
          <pre className="max-h-48 overflow-auto text-xs text-[var(--text-main)]">
{JSON.stringify({ ...state, backgroundImage: state.backgroundImage ? '[image-data]' : null }, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
};

const AdminBadgeBuilderPage: React.FC = () => {
  const [templates, setTemplates] = useState<BadgeTemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BadgeTemplateRow | null>(null);
  const [designSeed, setDesignSeed] = useState<DesignState>(BASE_DESIGN_STATE);
  const [designSessionKey, setDesignSessionKey] = useState(0);
  const [formState, setFormState] = useState<TemplateFormState>(DEFAULT_FORM_STATE);
  const [dirty, setDirty] = useState(false);
  const [badgeCodeError, setBadgeCodeError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const templateOptions = useMemo<Template[]>(() => [...DEFAULT_TEMPLATES, ...templates.map(mapRowToTemplate)], [templates]);

  const updatedLabel = selectedTemplate?.updated_at
    ? new Date(selectedTemplate.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Not saved yet';

  const applyTemplateRow = useCallback((row: BadgeTemplateRow | null) => {
    const design = buildDesignSeedFromRow(row);
    setDesignSeed(design);
    setFormState(buildFormStateFromRow(row, design));
    setDesignSessionKey((key) => key + 1);
    setDirty(false);
    setBadgeCodeError(null);
  }, []);

  const refreshTemplates = useCallback(
    async (rebindId?: string | null) => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await fetchBadgeTemplates();

        if (fetchError) {
          setError(fetchError);
        } else {
          setError(null);
          const sorted = [...data].sort((a, b) => {
            const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
            const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
            return bTime - aTime;
          });

          setTemplates(sorted);
          const targetId = rebindId ?? selectedTemplate?.id;
          if (targetId) {
            const updated = sorted.find((row) => row.id === targetId);
            if (updated) {
              setSelectedTemplate(updated);
              applyTemplateRow(updated);
            } else if (selectedTemplate) {
              setSelectedTemplate(null);
              applyTemplateRow(null);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [applyTemplateRow, selectedTemplate?.id],
  );

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  const handleSelectTemplate = (row: BadgeTemplateRow) => {
    setSelectedTemplate(row);
    applyTemplateRow(row);
    setSuccess(null);
    setError(null);
  };

  const startNewTemplate = () => {
    setSelectedTemplate(null);
    applyTemplateRow(null);
    setSuccess(null);
    setError(null);
  };

  const duplicateTemplate = async (row: BadgeTemplateRow) => {
    const payload: Partial<BadgeTemplateRow> = {
      ...row,
      id: undefined,
      name: `Copy of ${row.name}`,
      status: 'draft',
      badge_code: null,
      updated_at: null,
      created_at: null,
    };

    const result = await upsertBadgeTemplate(payload);
    if (!result.error) {
      await refreshTemplates(result.data?.id ?? undefined);
    } else {
      setError(result.error);
    }
  };

  const archiveTemplate = async (row: BadgeTemplateRow) => {
    const result = await upsertBadgeTemplate({ id: row.id, status: 'archived' });
    if (result.error) {
      setError(result.error);
    } else {
      await refreshTemplates(row.id);
    }
  };

  const removeTemplate = async (row: BadgeTemplateRow) => {
    const result = await deleteBadgeTemplate(row.id);
    if (result.error) {
      setError(result.error);
    } else {
      await refreshTemplates();
    }
  };

  const handleSave = async (state: DesignState) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    setBadgeCodeError(null);

    const nextBadgeCode = formState.badgeCode.trim();
    if (nextBadgeCode) {
      const normalizedBadge = nextBadgeCode.toLowerCase();
      const duplicate = templates.some(
        (template) =>
          template.id !== selectedTemplate?.id && (template.badge_code ?? '').trim().toLowerCase() === normalizedBadge,
      );

      if (duplicate) {
        setSaving(false);
        setBadgeCodeError(`Badge code "${formState.badgeCode}" is already used by another template.`);
        return;
      }
    }

    const payload = {
      id: selectedTemplate?.id,
      name: formState.name || 'Untitled badge',
      badge_code: formState.badgeCode || null,
      status: formState.status || null,
      accent_color: formState.accentColor || null,
      description: formState.description || null,
      svg_template: formState.svgTemplate || null,
      config: { ...state, templateId: selectedTemplate?.id ?? state.templateId },
    } satisfies Partial<BadgeTemplateRow>;

    const result = await upsertBadgeTemplate(payload);

    if (result.error) {
      setBadgeCodeError(result.error.toLowerCase().includes('badge code') ? result.error : null);
      setError(result.error);
    } else if (result.data) {
      const normalized = result.data as BadgeTemplateRow;
      setSelectedTemplate(normalized);
      applyTemplateRow(normalized);
      setSuccess('Template saved');
      setDirty(false);
      await refreshTemplates(normalized.id);
    }

    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text-main)]">Badge Builder</h1>
            {dirty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-[var(--text-muted)]">Manage Supabase-backed badge templates and update their designs.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] shadow-sm lg:hidden"
            onClick={() => setShowTemplates((prev) => !prev)}
          >
            <ChevronDown className={`h-4 w-4 transition ${showTemplates ? 'rotate-180' : ''}`} />
            {showTemplates ? 'Hide templates' : 'Show templates'}
          </button>
          <button
            onClick={startNewTemplate}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] shadow-sm disabled:opacity-60"
            disabled={saving || loading}
          >
            <Plus className="h-4 w-4" />
            Create template
          </button>
          <button
            onClick={() => void refreshTemplates()}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] shadow-sm disabled:opacity-60"
            disabled={loading || saving}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      <DesignProvider
        key={`${selectedTemplate?.id ?? 'new-template'}-${designSessionKey}`}
        initialState={designSeed}
        templates={templateOptions}
        onStateChange={() => setDirty(true)}
      >
        <div className="flex h-[calc(100vh-200px)] min-h-[760px] flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] shadow-sm">
          <div className="flex h-full min-h-0 flex-1 overflow-hidden">
            <aside
              className={`${showTemplates ? 'flex' : 'hidden'} w-[280px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 lg:flex`}
            >
              <TemplatesSidebar
                templates={templates}
                selectedId={selectedTemplate?.id ?? null}
                onSelect={handleSelectTemplate}
                onCreate={startNewTemplate}
                onDuplicate={duplicateTemplate}
                onArchive={archiveTemplate}
                onDelete={removeTemplate}
                loading={loading}
                error={error}
                onRetry={() => void refreshTemplates()}
              />
            </aside>

            <main className="flex-1 overflow-y-auto bg-white p-6">
              <TemplateEditor
                formState={formState}
                onFormChange={(changes) => {
                  setFormState((prev) => ({ ...prev, ...changes }));
                  setDirty(true);
                }}
                onSave={handleSave}
                saving={saving}
                loading={loading}
                dirty={dirty}
                savedAtLabel={updatedLabel}
                badgeCodeError={badgeCodeError}
              />
            </main>

            <section className="w-[420px] shrink-0 overflow-y-auto border-l border-[var(--border-subtle)] bg-gray-50 p-4">
              <PreviewPanel
                formState={formState}
                loading={loading}
                embedSnippet={selectedTemplate?.svg_template ?? formState.svgTemplate ?? null}
              />
            </section>
          </div>
        </div>
        <CodeModal />
      </DesignProvider>
    </div>
  );
};

export default AdminBadgeBuilderPage;
