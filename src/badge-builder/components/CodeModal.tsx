
import React, { useState } from 'react';
import { X, Copy, Check, Server, Code } from 'lucide-react';
import { useDesign } from '../context/DesignContext';
import { generateNetlifyFunction, generateEmbedCode } from '../utils/codeGenerator';

const CodeModal: React.FC = () => {
  const { state, ui, actions } = useDesign();
  const [activeTab, setActiveTab] = useState<'netlify' | 'embed'>('netlify');
  const [copied, setCopied] = useState(false);

  if (!ui.isCodeModalOpen) return null;

  const code = activeTab === 'netlify' 
    ? generateNetlifyFunction(state) 
    : generateEmbedCode(state);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[80vh] flex flex-col rounded-xl shadow-2xl">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Generated Code
            <span className="text-xs font-normal text-slate-400 px-2 py-0.5 bg-slate-800 rounded-full border border-slate-700">Production Ready</span>
          </h2>
          <button onClick={() => actions.setCodeModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <button
            onClick={() => setActiveTab('netlify')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'netlify' 
                ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-900' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Server size={16} />
            Netlify Function (Node.js)
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'embed' 
                ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-900' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Code size={16} />
            Client Embed (HTML)
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative group">
           <textarea
             readOnly
             value={code}
             className="w-full h-full p-6 bg-slate-950 text-slate-300 font-mono text-xs leading-relaxed resize-none outline-none focus:bg-slate-950/80"
             spellCheck={false}
           />
           
           <div className="absolute top-4 right-4">
             <button
               onClick={handleCopy}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
                 copied 
                   ? 'bg-green-500 text-white translate-y-0' 
                   : 'bg-white text-slate-900 hover:bg-blue-50 translate-y-0'
               }`}
             >
               {copied ? <Check size={16} /> : <Copy size={16} />}
               {copied ? 'Copied!' : 'Copy Code'}
             </button>
           </div>
        </div>

        <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-500">
          {activeTab === 'netlify' ? (
            <p>
              Create a file at <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">netlify/functions/badge.js</code> and paste this code. 
              Ensure you have <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">canvas</code> installed in package.json.
            </p>
          ) : (
            <p>
              Paste this HTML anywhere on your client's website. Update the query parameters dynamically based on your database data.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeModal;
