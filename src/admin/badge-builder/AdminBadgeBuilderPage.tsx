import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, Loader2, Plus, RefreshCw } from 'lucide-react';
import {
  fetchBadgeTemplates,
  upsertBadgeTemplate,
  deleteBadgeTemplate,
  type BadgeTemplateRow,
} from 'lib/badges/service';
import { DesignProvider } from './context/DesignContext';
import { INITIAL_LAYERS, DEFAULT_TEMPLATES } from './constants';
import type { DesignState, Template } from './types';
import CodeModal from './components/CodeModal';
import PreviewPanel from './components/PreviewPanel';
import EditorPanel from './components/EditorPanel';
import { getTierStyle } from '@/shared/badges/tierStyles';
import TemplateListPanel from './components/TemplateListPanel';

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
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

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
        (template) => template.id !== selectedTemplate?.id && (template.badge_code ?? '').trim().toLowerCase() === normalizedBadge,
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

  const currentTemplateName = selectedTemplate?.name || formState.name || 'No template selected';
  const currentStatus = selectedTemplate?.status ?? formState.status ?? 'draft';

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 lg:py-10">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text-main)]">Badge Builder</h1>
            {dirty && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        <p className="text-[var(--text-muted)]">Manage Supabase-backed badge templates and update their designs.</p>
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
        {/* PreviewSection: hero-style live preview with controls */}
        <PreviewPanel
          formState={formState}
          loading={loading}
          embedSnippet={selectedTemplate?.svg_template ?? formState.svgTemplate ?? null}
          templateName={currentTemplateName}
          templateStatus={currentStatus}
          onChangeTemplate={() => setTemplatePickerOpen(true)}
        />

        {/* EditorColumns: left side handles template + basics, right side handles design + advanced */}
        <EditorPanel
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
          onOpenTemplatePicker={() => setTemplatePickerOpen(true)}
        />

        <CodeModal />
      </DesignProvider>

      <TemplateListPanel
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
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
  );
};

export default AdminBadgeBuilderPage;
