import React from 'react';
import {
  Settings,
  Clipboard,
  ImageIcon,
  Code as CodeIcon,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import LayerControls from './components/LayerControls';
import PreviewArea from './components/PreviewArea';
import CodeModal from './components/CodeModal';
import { useDesign } from './context/DesignContext';

interface BadgeBuilderProps {
  actionSlot?: React.ReactNode;
  metadataSlot?: React.ReactNode;
}

const BadgeBuilder: React.FC<BadgeBuilderProps> = ({ actionSlot, metadataSlot }) => {
  const { state, ui, actions, availableTemplates } = useDesign();
  const activeTemplate = availableTemplates.find(t => t.id === state.templateId);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) actions.updateBackground(file);
  };

  return (
    <div className="space-y-4">
      {ui.isLoading && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          <p className="text-sm text-white">Generating preview…</p>
        </div>
      )}

      {ui.toastMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="inline mr-2" />
          {ui.toastMessage}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-12 items-start">
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 space-y-4 shadow-sm xl:col-span-7">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Badge Builder</p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-[var(--text-main)]">
                <Settings className="h-5 w-5 text-info" />
                Design Workspace
              </h2>
              {activeTemplate && (
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Clipboard size={12} />
                  <span>Template: <span className="font-medium text-[var(--text-main)]">{activeTemplate.name}</span></span>
                </div>
              )}
            </div>
            {activeTemplate && (
              <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${activeTemplate.accentColor}`}>
                <span className="text-xs font-bold text-white">{activeTemplate.badge}</span>
              </div>
            )}
          </div>

          {metadataSlot}

          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <ImageIcon size={14} /> Background
            </h3>
            <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
              <span className="truncate text-xs text-[var(--text-muted)]">
                {state.backgroundImage ? 'Background image active' : 'No background selected'}
              </span>
              <label htmlFor="bg-upload" className="cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1 text-xs font-medium text-info shadow-sm">
                Change Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="bg-upload"
              />
            </div>
          </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Text Layers</h3>
          <LayerControls />
        </section>

        <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <CodeIcon size={14} />
            Need embed code? Use the Generate Code option.
          </div>
          <button
            onClick={() => actions.setCodeModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2 py-1 text-[var(--text-main)]"
          >
            <CodeIcon size={12} />
            Generate
          </button>
        </div>
      </div>

        <div className="flex h-full min-h-[420px] max-h-[75vh] flex-col gap-4 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm xl:col-span-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Preview</p>
              <h3 className="text-xl font-semibold text-[var(--text-main)]">Badge Preview</h3>
            </div>
            {actionSlot}
          </div>
          <div className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2">
            <div className="h-full overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)]/40 p-2">
              <PreviewArea />
            </div>
          </div>
        </div>
      </div>

      <CodeModal />
    </div>
  );
};

export default BadgeBuilder;
