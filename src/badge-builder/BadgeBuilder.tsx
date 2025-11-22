
import React from 'react';
import { 
  Settings, 
  Clipboard, 
  ImageIcon, 
  LayoutTemplate, 
  Save, 
  RefreshCw, 
  Code as CodeIcon,
  Loader2,
  CheckCircle2,
  Trash2,
  HardDrive
} from 'lucide-react';
import { DesignProvider, useDesign } from './context/DesignContext';
import LayerControls from './components/LayerControls';
import PreviewArea from './components/PreviewArea';
import CodeModal from './components/CodeModal';
import StartupModal from './components/StartupModal';

const MainLayout: React.FC = () => {
  const { state, ui, actions, availableTemplates } = useDesign();
  
  // Find active template from the combined list
  const activeTemplate = availableTemplates.find(t => t.id === state.templateId);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) actions.updateBackground(file);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "badge_design.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSaveCustom = () => {
     const name = prompt("Name your custom template:");
     if (name) actions.saveCustomTemplate(name);
  };

  const confirmReset = () => {
    if (window.confirm("This will reset your current design. Are you sure?")) {
      actions.resetDesign();
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <StartupModal />
      
      {/* Loading Overlay */}
      {ui.isLoading && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
           <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
           <h3 className="text-xl font-bold text-white">Generating Badge...</h3>
           <p className="text-slate-400">Loading high-res assets</p>
        </div>
      )}

      {/* Success Notification */}
      {ui.showSuccess && (
          <div className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-5 fade-in">
             <CheckCircle2 size={20} />
             <span className="font-bold">Badge generated! Adjust settings if needed.</span>
          </div>
      )}

      {/* Toast Notification */}
      {ui.toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-800 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in">
          <CheckCircle2 size={16} className="text-green-400" />
          <span className="text-sm font-medium">{ui.toastMessage}</span>
        </div>
      )}

      <div className="w-[450px] flex flex-col border-r border-slate-800 bg-slate-950 z-10 shadow-xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                <Settings className="text-blue-400" />
                Badge Designer
              </h1>
              {activeTemplate && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <Clipboard size={12} />
                    <span>Template: <span className="text-slate-300 font-medium">{activeTemplate.name}</span></span>
                </div>
              )}
            </div>
            {activeTemplate && (
              <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${activeTemplate.accentColor} shadow-lg`}>
                 <span className="font-bold text-white text-xs">{activeTemplate.badge}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
           {/* Background Section */}
           <section>
             <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3 flex items-center gap-2">
               <ImageIcon size={14} /> Background
             </h3>
             <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors group">
               <input 
                 type="file" 
                 accept="image/*" 
                 onChange={handleImageUpload}
                 className="hidden" 
                 id="bg-upload"
               />
               <div className="flex items-center justify-between">
                 <span className="text-xs text-slate-400 truncate max-w-[200px]">
                    {state.backgroundImage ? 'Custom/Template Background Active' : 'No background'}
                 </span>
                 <label 
                    htmlFor="bg-upload"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs cursor-pointer text-blue-400 transition-colors"
                 >
                    Change Image
                 </label>
               </div>
             </div>
          </section>

          {/* Layers Section */}
          <section>
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Text Layers</h3>
            <LayerControls />
          </section>

          {/* Actions Section */}
          <section className="pt-4 border-t border-slate-800">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Actions</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button 
                onClick={handleSaveCustom}
                className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-sm font-medium transition-colors"
              >
                <LayoutTemplate size={16} /> Save Template
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center justify-center gap-2 p-3 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-sm font-medium transition-colors"
              >
                <Save size={16} /> Export JSON
              </button>
            </div>

            {/* Local Storage Controls */}
            <div className="grid grid-cols-2 gap-3">
               <button 
                onClick={actions.saveDesign}
                className="flex items-center justify-center gap-2 p-2 bg-slate-900/50 hover:bg-slate-800 rounded border border-slate-800 text-xs text-slate-400 transition-colors"
               >
                 <HardDrive size={14} /> Save Local
               </button>
               <button 
                onClick={actions.clearSavedDesign}
                className="flex items-center justify-center gap-2 p-2 bg-red-900/10 hover:bg-red-900/20 rounded border border-red-900/20 text-xs text-red-400 transition-colors"
               >
                 <Trash2 size={14} /> Clear Data
               </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex gap-3">
           <button 
            onClick={confirmReset}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-400 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
            title="Change Template / Reset"
          >
            <RefreshCw size={16} />
            Change
          </button>
          <button 
            onClick={() => actions.setCodeModalOpen(true)}
            className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <CodeIcon size={20} />
            Generate Code
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 h-full relative">
        <PreviewArea />
      </div>

      <CodeModal />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <DesignProvider>
      <MainLayout />
    </DesignProvider>
  );
};

export default App;
