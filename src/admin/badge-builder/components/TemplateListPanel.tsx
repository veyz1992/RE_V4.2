import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Copy, Loader2, MoreVertical, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import type { BadgeTemplateRow } from 'lib/badges/service';

const statusOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'coming-soon', label: 'Coming soon' },
  { value: 'archived', label: 'Archived' },
];

interface TemplateListPanelProps {
  open: boolean;
  onClose: () => void;
  templates: BadgeTemplateRow[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (row: BadgeTemplateRow) => void;
  onCreate: () => void;
  onDuplicate: (row: BadgeTemplateRow) => void;
  onArchive: (row: BadgeTemplateRow) => void;
  onDelete: (row: BadgeTemplateRow) => void;
  onRetry: () => void;
}

const TemplateListPanel: React.FC<TemplateListPanelProps> = ({
  open,
  onClose,
  templates,
  selectedId,
  loading,
  error,
  onSelect,
  onCreate,
  onDuplicate,
  onArchive,
  onDelete,
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="relative flex w-full max-w-5xl flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Templates</p>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">Choose a badge template</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Pick an existing template or create a new one. Selecting a template will update the editor and live preview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />}
            <button
              className="inline-flex items-center gap-2 rounded-md bg-info px-3 py-1.5 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
              onClick={() => {
                onCreate();
                onClose();
              }}
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
              New template
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
              aria-label="Close template selector"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-main)]"
            placeholder="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-main)] md:col-span-2"
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
          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{error}</p>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] shadow-sm"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          {loading && templates.length === 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {[...Array(6)].map((_, idx) => (
                <div key={`skeleton-${idx}`} className="h-32 animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)]" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
              <p className="font-semibold text-[var(--text-main)]">No templates yet</p>
              <p className="text-xs">Create your first badge template to get started.</p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((template) => {
              const isSelected = selectedId === template.id;
              return (
                <div
                  key={template.id}
                  className={`relative flex h-full flex-col justify-between rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isSelected
                      ? 'border-info/70 bg-[var(--bg-card)] ring-2 ring-info/15'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[var(--text-main)]">{template.name}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{template.description || 'Badge template'}</p>
                    </div>
                    <button
                      onClick={() => setOpenMenuId((prev) => (prev === template.id ? null : template.id))}
                      className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
                      aria-label={`Template actions for ${template.name}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 font-semibold uppercase">
                        {template.badge_code || '—'}
                      </span>
                      <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 font-semibold">
                        {template.status || 'draft'}
                      </span>
                    </div>
                    <span>{template.updated_at ? new Date(template.updated_at).toLocaleDateString() : 'Not saved'}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        onSelect(template);
                        onClose();
                      }}
                      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                        isSelected
                          ? 'bg-info text-white shadow-sm'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-main)] hover:bg-[var(--bg-muted)]'
                      }`}
                      disabled={loading}
                    >
                      {isSelected ? <Check className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 rotate-90" />} Select
                    </button>
                  </div>

                  {openMenuId === template.id && (
                    <div className="absolute right-3 top-10 z-10 w-40 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-lg">
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateListPanel;
