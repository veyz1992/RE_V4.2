import React from 'react';
import { KeyIcon } from './icons';

interface BlueprintUpgradePromptProps {
  onUpgrade: () => void;
}

const BlueprintUpgradePrompt: React.FC<BlueprintUpgradePromptProps> = ({ onUpgrade }) => {
  return (
    <div className="animate-fade-in p-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="relative mb-6">
          <KeyIcon className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" />
          <div className="w-6 h-6 absolute top-0 right-1/2 translate-x-12 text-[var(--accent)]">✨</div>
        </div>
        
        <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)] mb-4">
          Unlock the 99 Steps Blueprint
        </h1>
        
        <p className="text-lg text-[var(--text-muted)] mb-6">
          The comprehensive 99 Steps Blueprint is your step-by-step roadmap to building a dominant restoration business.
        </p>
        
        <div className="bg-[var(--bg-subtle)] rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-[var(--text-main)] mb-4">Included with higher tier memberships:</h3>
          <ul className="space-y-2 text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full flex-shrink-0"></span>
              Complete step-by-step business building framework
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full flex-shrink-0"></span>
              Progress tracking with interactive checklists
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full flex-shrink-0"></span>
              Foundation, Acceleration, and Empire building phases
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full flex-shrink-0"></span>
              Regular updates and refinements
            </li>
          </ul>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={onUpgrade}
            className="px-8 py-4 bg-[var(--accent)] text-white rounded-lg font-semibold hover:bg-[var(--accent-hover)] transition-colors duration-200 shadow-lg"
          >
            View membership options
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlueprintUpgradePrompt;