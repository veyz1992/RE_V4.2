import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Loader2, Pencil, Plus, RefreshCw, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BadgeBuilder from './BadgeBuilder';
import { DesignProvider, useDesign } from './context/DesignContext';
import { INITIAL_LAYERS, DEFAULT_TEMPLATES } from './constants';
import type { DesignState, Template } from './types';

interface BadgeTemplateRow {
  id: string;
  name: string;
  badge_code?: string | null;
  status?: string | null;
  accent_color?: string | null;
  description?: string | null;
  svg_template?: string | null;
  config?: unknown;
  updated_at?: string | null;
  created_at?: string | null;
}

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
  const layers = Array.isArray((parsed as any).layers) ? (parsed as any).layers : BASE_DESIGN_STATE.layers;

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

const TemplateEditor: React.FC<{
  formState: TemplateFormState;
  onFormChange: (changes: Partial<TemplateFormState>) => void;
  onSave: (state: DesignState) => void;
  saving: boolean;
  updatedAtLabel: string;
}> = ({ formState, onFormChange, onSave, saving, updatedAtLabel }) => {
  const { state } = useDesign();

  return (
    <BadgeBuilder
      metadataSlot={(
        <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
              Template name
              <input
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-main)]"
                value={formState.name}
                onChange={(e) => onFormChange({ name: e.target.value })}
                placeholder="e.g. Founding Member"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
              Badge code
              <input
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-main)]"
                value={formState.badgeCode}
                onChange={(e) => onFormChange({ badgeCode: e.target.value })}
                placeholder="Short code"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
              Status
              <select
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-main)]"
                value={formState.status}
                onChange={(e) => onFormChange({ status: e.target.value })}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="coming-soon">Coming soon</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
              Accent gradient
              <input
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-main)]"
                value={formState.accentColor}
                onChange={(e) => onFormChange({ accentColor: e.target.value })}
                placeholder="from-blue-500 to-indigo-600"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            Description
            <textarea
              className="min-h-[80px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-main)]"
              value={formState.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="What makes this badge special?"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[var(--text-muted)]">
            SVG template
            <textarea
              className="min-h-[120px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 font-mono text-xs text-[var(--text-main)]"
              value={formState.svgTemplate}
              onChange={(e) => onFormChange({ svgTemplate: e.target.value })}
              placeholder="Optional raw SVG markup"
            />
          </label>
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>Updated {updatedAtLabel}</span>
            <button
              onClick={() => onSave(state)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-info px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </div>
      )}
      actionSlot={(
        <button
          onClick={() => onSave(state)}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-main)] shadow-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      )}
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
  const [formState, setFormState] = useState<TemplateFormState>(DEFAULT_FORM_STATE);

  const templateOptions = useMemo<Template[]>(
    () => [...DEFAULT_TEMPLATES, ...templates.map(mapRowToTemplate)],
    [templates],
  );

  const updatedLabel = selectedTemplate?.updated_at
    ? new Date(selectedTemplate.updated_at).toLocaleString()
    : 'Not saved yet';

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('badge_templates')
      .select('id,name,badge_code,status,accent_color,description,svg_template,config,updated_at,created_at')
      .order('updated_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setTemplates(data as BadgeTemplateRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const handleSelectTemplate = (row: BadgeTemplateRow) => {
    setSelectedTemplate(row);
    setDesignSeed(normalizeDesignState(row.config));
    setFormState({
      name: row.name ?? '',
      badgeCode: row.badge_code ?? '',
      status: row.status ?? 'draft',
      accentColor: row.accent_color ?? 'from-blue-500 to-indigo-600',
      description: row.description ?? '',
      svgTemplate: row.svg_template ?? '',
    });
    setSuccess(null);
    setError(null);
  };

  const startNewTemplate = () => {
    setSelectedTemplate(null);
    setDesignSeed({ ...BASE_DESIGN_STATE, layers: [...BASE_DESIGN_STATE.layers] });
    setFormState(DEFAULT_FORM_STATE);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async (state: DesignState) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

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

    const { data, error: upsertError } = await supabase
      .from('badge_templates')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (upsertError) {
      setError(upsertError.message);
    } else if (data) {
      const normalized = data as BadgeTemplateRow;
      setSelectedTemplate(normalized);
      setDesignSeed(normalizeDesignState(normalized.config));
      setFormState({
        name: normalized.name ?? '',
        badgeCode: normalized.badge_code ?? '',
        status: normalized.status ?? 'draft',
        accentColor: normalized.accent_color ?? 'from-blue-500 to-indigo-600',
        description: normalized.description ?? '',
        svgTemplate: normalized.svg_template ?? '',
      });
      setSuccess('Template saved');
      await loadTemplates();
    }

    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Badge Builder</h1>
          <p className="text-[var(--text-muted)]">Manage Supabase-backed badge templates and update their designs.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startNewTemplate}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-main)]"
          >
            <Plus className="h-4 w-4" />
            Create template
          </button>
          <button
            onClick={() => void loadTemplates()}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-main)]"
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

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Templates</p>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">Supabase badge templates</h2>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-card)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Name</th>
                  <th className="px-3 py-2 font-semibold">Badge</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {templates.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-[var(--text-muted)]" colSpan={5}>
                      No templates found. Create one to get started.
                    </td>
                  </tr>
                )}
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-[var(--bg-card)]">
                    <td className="px-3 py-2 text-[var(--text-main)]">{template.name}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">{template.badge_code || '—'}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-1 text-xs font-semibold text-[var(--text-muted)]">
                        {template.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleSelectTemplate(template)}
                        className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-main)]"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm">
          <DesignProvider
            key={selectedTemplate?.id ?? 'new-template'}
            initialState={designSeed}
            templates={templateOptions}
          >
            <TemplateEditor
              formState={formState}
              onFormChange={(changes) => setFormState((prev) => ({ ...prev, ...changes }))}
              onSave={handleSave}
              saving={saving}
              updatedAtLabel={updatedLabel}
            />
          </DesignProvider>
        </div>
      </div>
    </div>
  );
};

export default AdminBadgeBuilderPage;
