import React, { useMemo, useState } from 'react';
import { ChevronDown, Copy, Loader2, MoreVertical, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { BadgeTemplateRow } from 'lib/badges/service';

const statusOptions: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'coming-soon', label: 'Coming soon' },
  { value: 'archived', label: 'Archived' },
];

interface TemplateListPanelProps {
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

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
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

      <div className="space-y-3">
        <input
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-main)]"
          placeholder="Search templates"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-main)]"
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

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2">
          {loading && templates.length === 0 && (
            <div className="space-y-2">
              {[...Array(3)].map((_, idx) => (
                <div key={`skeleton-${idx}`} className="h-12 animate-pulse rounded-lg bg-[var(--bg-card)]" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-sm text-[var(--text-muted)]">
              <p className="font-semibold text-[var(--text-main)]">No templates yet</p>
              <p className="text-xs">Create your first badge template to get started.</p>
            </div>
          )}

          {filtered.map((template) => {
            const isSelected = selectedId === template.id;
            return (
              <div
                key={template.id}
                className={`relative flex items-start justify-between rounded-xl border px-3 py-2 transition hover:border-[var(--border-subtle)] ${
                  isSelected
                    ? 'border-info/70 bg-[var(--bg-card)] ring-2 ring-info/15'
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
                    <span>Updated {template.updated_at ? new Date(template.updated_at).toLocaleDateString() : 'not saved'}</span>
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

        <button
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm font-semibold text-[var(--text-main)] shadow-sm disabled:opacity-60"
          disabled={loading}
        >
          <Plus className="h-4 w-4" /> Create template
        </button>
      </div>
    </div>
  );
};

export default TemplateListPanel;
