
import React, { useState } from 'react';
import { Check, ArrowRight, Building2, MapPin, Star, Lock } from 'lucide-react';
import { DEFAULT_TEMPLATES } from '../constants';
import { useDesign } from '../context/DesignContext';

const StartupModal: React.FC = () => {
  const { ui, actions } = useDesign();
  const [step, setStep] = useState(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [rating, setRating] = useState('A');

  if (!ui.isStartupOpen) return null;

  const startupTemplates = DEFAULT_TEMPLATES.filter(t => 
    t.id === 'standard-member' || t.id === 'founding-member'
  );

  const handleNext = () => {
    if (step === 1 && selectedTemplateId) {
      setStep(2);
    }
  };

  const handleFinish = () => {
    if (selectedTemplateId) {
      actions.applyTemplate(selectedTemplateId, companyName, location, rating);
      actions.setStartupOpen(false);
    }
  };

  const activeTemplate = DEFAULT_TEMPLATES.find(t => t.id === selectedTemplateId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="h-1.5 bg-slate-800 w-full">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 ease-out"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Choose Your Badge Template</h2>
                <p className="text-slate-400">Select the verification style for your business</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {startupTemplates.map((template) => (
                  <button
                    key={template.id}
                    disabled={template.status === 'coming-soon'}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`relative p-0 rounded-xl border-2 text-left transition-all group hover:shadow-xl overflow-hidden h-full flex flex-col ${
                      selectedTemplateId === template.id
                        ? `border-blue-500 bg-blue-900/10 transform scale-[1.02]`
                        : template.status === 'coming-soon'
                          ? 'border-slate-800 bg-slate-900 opacity-60 cursor-not-allowed'
                          : 'border-slate-800 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <div className="h-40 bg-slate-800 w-full relative overflow-hidden">
                      {template.imageUrl ? (
                        <div 
                          className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundImage: `url(${template.imageUrl})` }}
                        ></div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                          <Lock className="text-slate-600" size={32} />
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                      
                      {template.status === 'coming-soon' && (
                        <div className="absolute top-4 right-4 bg-slate-800 border border-slate-600 px-3 py-1 rounded-full text-xs font-bold text-slate-400">
                          Coming Soon
                        </div>
                      )}

                      {selectedTemplateId === template.id && (
                         <div className="absolute top-4 right-4 bg-blue-500 text-white p-1.5 rounded-full shadow-lg animate-in zoom-in">
                           <Check size={16} />
                         </div>
                      )}
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="font-bold text-xl text-white mb-2">{template.name}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-4">{template.description}</p>
                      
                      <div className="mt-auto">
                         <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                           template.status === 'coming-soon' 
                             ? 'bg-slate-800 text-slate-500' 
                             : 'bg-blue-500/10 text-blue-400'
                         }`}>
                            {template.status === 'coming-soon' ? 'Locked' : 'Available Now'}
                         </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && activeTemplate && (
            <div className="space-y-8 max-w-md mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="text-center">
                 <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 text-blue-400 mb-4">
                    <Building2 size={32} />
                 </div>
                <h2 className="text-2xl font-bold text-white mb-2">Customize Your Badge</h2>
                <p className="text-slate-400">Enter your professional details</p>
              </div>

              <div className="space-y-5 bg-slate-800/50 p-6 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company / Business Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input 
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
                      placeholder="e.g. Restoration Mongos"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-500" size={18} />
                    <input 
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
                      placeholder="e.g. Jacksonville Florida"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Rating</label>
                  <div className="relative">
                    <Star className="absolute left-3 top-3 text-slate-500" size={18} />
                    <select
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none"
                    >
                      <option value="A">A (Excellent)</option>
                      <option value="A+">A+ (Elite)</option>
                      <option value="B+">B+ (Professional)</option>
                      <option value="B">B (Standard)</option>
                    </select>
                    <div className="absolute right-3 top-3 text-slate-500 pointer-events-none">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-between items-center backdrop-blur-sm">
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="text-slate-400 hover:text-white font-medium px-4 py-2 transition-colors"
            >
              Back
            </button>
          ) : (
             <span></span>
          )}
          
          {step === 1 && (
            <button
              onClick={handleNext}
              disabled={!selectedTemplateId || activeTemplate?.status === 'coming-soon'}
              className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold transition-all ${
                (selectedTemplateId && activeTemplate?.status !== 'coming-soon')
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 hover:scale-[1.02]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              Select Template
              <ArrowRight size={18} />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleFinish}
              disabled={!companyName || !location}
              className={`flex items-center gap-2 px-8 py-3 rounded-lg font-bold transition-all ${
                (companyName && location)
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 hover:scale-[1.02]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              ✨ Generate My Badge
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartupModal;
