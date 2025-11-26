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
import PreviewArea from './components/PreviewArea';
import CodeModal from './components/CodeModal';
import BadgePreview from '@src/shared/badges/BadgePreview';
import type { MemberBadgeSummary } from '@/lib/badges/model';

interface TemplateFormState {
  name: string;
  badgeCode: string;
  status: string;
  accentColor: string;
  description: string;
  svgTemplate: string;
}

const BASE_DESIGN_STATE: DesignState = {
  templateId: 'standard-member',
  companyName: '',
  location: '',
  rating: 'A',
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
  accentColor: 'from-blue-500 to-indigo-600',
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

  return {
    ...BASE_DESIGN_STATE,
    ...parsed,
    layers,
    backgroundImage: parsed.backgroundImage ?? null,
    customTemplates: [],
  };
};

const mapRowToTemplate = (row: BadgeTemplateRow): Template => {
  const design = normalizeDesignState(row.config);
  return {
    id: row.id,
    name: row.name || 'Untitled Template',
    description: row.description || 'Badge template',
    badge: row.badge_code || 'TMP',
    accentColor: row.accent_color || 'from-blue-500 to-indigo-600',
    imageUrl: design.backgroundImage || undefined,
    status: (row.status as Template['status']) ?? undefined,
    layers: design.layers,
  };
};

const buildFormStateFromRow = (row?: BadgeTemplateRow | null): TemplateFormState => ({
  name: row?.name ?? '',
  badgeCode: row?.badge_code ?? '',
  status: row?.status ?? 'draft',
  accentColor: row?.accent_color ?? 'from-blue-500 to-indigo-600',
  description: row?.description ?? '',
  svgTemplate: row?.svg_template ?? '',
});

const buildDesignSeedFromRow = (row?: BadgeTemplateRow | null): DesignState => {
  if (!row) {
    return { ...BASE_DESIGN_STATE, layers: [...BASE_DESIGN_STATE.layers] };
  }

  const normalized = normalizeDesignState(row.config);
  return { ...normalized, layers: [...normalized.layers] };
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
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Templates</p>
          <h2 className="text-lg font-semibold text-[var(--text-main)]">Supabase badge templates</h2>
        </div>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
      </div>

      <div className="mt-4 space-y-2">
        <input
          className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-main)]"
          placeholder="Search templates"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-main)]"
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

      <div className="mt-4 space-y-2">
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

        {filtered.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <div
              key={template.id}
              className={`relative flex items-start justify-between rounded-lg border px-3 py-2 transition hover:border-[var(--border-subtle)] ${
                isSelected
                  ? 'border-info ring-2 ring-info/20 bg-[var(--bg-subtle)]'
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
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) actions.updateBackground(file);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Basics</p>
          <h2 className="text-xl font-semibold text-[var(--text-main)]">Badge template details</h2>
          <p className="text-xs text-[var(--text-muted)]">{dirty ? 'Unsaved changes' : `Saved ${savedAtLabel}`}</p>
        </div>
        <button
          onClick={() => onSave(state)}
          disabled={saving || loading}
          aria-busy={saving || loading}
          className="inline-flex items-center gap-2 rounded-md bg-info px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save template'}
        </button>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-main)]">Basics</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
              Template name
              <input
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                value={formState.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
                placeholder="e.g. Founding Member"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
              Badge code
              <input
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                value={formState.badgeCode}
                onChange={(e) => onFormChange({ badgeCode: e.target.value })}
                placeholder="Short code"
              />
              {badgeCodeError && <span className="text-xs text-error">{badgeCodeError}</span>}
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
              Status
              <select
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
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
              Accent gradient
              <input
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
                value={formState.accentColor}
                onChange={(e) => onFormChange({ accentColor: e.target.value })}
                placeholder="from-blue-500 to-indigo-600"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            Description
            <textarea
              className="min-h-[80px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[var(--text-main)]"
              value={formState.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="What makes this badge special?"
            />
          </label>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-main)]">Design</h3>
            <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--text-muted)]">
              Preview updates live
            </span>
          </div>
          <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            Background image
            <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
              <span className="truncate text-xs text-[var(--text-muted)]">
                {state.backgroundImage ? 'Background image active' : 'No background selected'}
              </span>
              <label
                htmlFor="bg-upload"
                className="cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1 text-xs font-medium text-info shadow-sm"
              >
                Change Image
              </label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="bg-upload" />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            SVG template
            <textarea
              className="min-h-[120px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 font-mono text-xs text-[var(--text-main)]"
              value={formState.svgTemplate}
              onChange={(e) => onFormChange({ svgTemplate: e.target.value })}
              placeholder="Optional raw SVG markup"
            />
          </label>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Text layers</p>
            <LayerControls />
          </div>
        </section>
      </div>
    </div>
  );
};

const PreviewColumn: React.FC<{
  formState: TemplateFormState;
  loading: boolean;
  embedCopied: boolean;
  onCopy: () => void;
  embedSnippet?: string | null;
}> = ({ formState, loading, embedCopied, onCopy, embedSnippet }) => {
  const { state } = useDesign();

  return (
    <BadgePreview
      summary={{
        label: formState.name || 'Badge preview',
        code: formState.badgeCode,
        status: (formState.status as MemberBadgeSummary['status'] | string) ?? 'draft',
        imageLightUrl: state.backgroundImage ?? null,
        imageDarkUrl: state.backgroundImage ?? null,
        embedHtml: null,
        previewContent: <PreviewArea />,
      }}
      isLoading={loading}
      embedSnippet={embedSnippet || undefined}
      onCopyEmbed={onCopy}
      copied={embedCopied}
    />
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
  const [embedCopied, setEmbedCopied] = useState(false);

  const templateOptions = useMemo<Template[]>(() => [...DEFAULT_TEMPLATES, ...templates.map(mapRowToTemplate)], [templates]);

  const updatedLabel = selectedTemplate?.updated_at
    ? new Date(selectedTemplate.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Not saved yet';

  const applyTemplateRow = useCallback((row: BadgeTemplateRow | null) => {
    setDesignSeed(buildDesignSeedFromRow(row));
    setFormState(buildFormStateFromRow(row));
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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Badge Builder</h1>
          <p className="text-[var(--text-muted)]">Manage Supabase-backed badge templates and update their designs.</p>
        </div>
        <div className="flex gap-2">
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
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3">
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
          </div>

          <div className="lg:col-span-6">
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
          </div>

          <div className="lg:col-span-3">
            <PreviewColumn
              formState={formState}
              loading={loading}
              embedCopied={embedCopied}
              embedSnippet={selectedTemplate?.svg_template ?? formState.svgTemplate ?? null}
              onCopy={() => {
                const snippet = selectedTemplate?.svg_template ?? formState.svgTemplate;
                if (!snippet) return;
                void navigator.clipboard.writeText(snippet);
                setEmbedCopied(true);
                setTimeout(() => setEmbedCopied(false), 1500);
              }}
            />
          </div>
        </div>
        <CodeModal />
      </DesignProvider>
    </div>
  );
};

export default AdminBadgeBuilderPage;
