/*
 * 99 Steps Blueprint Component - Updated Implementation
 * 
 * Key Changes Made:
 * 1. Removed redundant H1 title (kept in navbar only)
 * 2. Added compact page heading above progress card
 * 3. Created mobile sticky progress bar for better UX
 * 4. Fixed section accordion flicker by isolating toggle controls
 * 5. Implemented responsive default open/closed behavior
 * 6. Updated mastery level calculation with proper thresholds
 * 7. Improved mobile layouts and spacing
 * 8. Enhanced accessibility with proper ARIA attributes
 * 9. Made checkmarks clearly visible with high-contrast white color
 * 10. Added category overview functionality when section is selected
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { KeyIcon, CheckIcon, PremiumCheckIcon, ChevronDownIcon, ClipboardDocumentCheckIcon, XMarkIcon } from './icons';
import { useBlueprintAccess } from '../src/hooks';
import { useBlueprintData } from '../src/hooks/useBlueprintData';
import type { StepWithProgress, SectionWithStats, StepStatus } from '../src/hooks/useBlueprintData';
import BlueprintUpgradePrompt from './BlueprintUpgradePrompt';

type MemberView = 'overview' | 'my-requests' | 'profile' | 'badge' | 'documents' | 'benefits' | 'billing' | 'community' | 'blueprint' | 'settings';

// Category summaries configuration - static data for category overview
const CATEGORY_SUMMARIES: Record<string, { intro: string; bullets: string[] }> = {
  'foundation-vision': {
    intro: 'Clarify why you exist, who you serve, and put the basic business + legal pieces in place.',
    bullets: [
      'Commit fully and embrace the grind.',
      'Get trained, certified and insured.',
      'Set up your legal, money and basic systems foundation.',
    ],
  },
  'team-operations-basics': {
    intro: 'Lay down the first hires, safety, equipment and daily workflows so jobs do not feel chaotic.',
    bullets: [
      'Start building your core team.',
      'Standardise how you handle jobs day to day.',
      'Make safety and reliability non-negotiable.',
    ],
  },
  'marketing-sales-fundamentals': {
    intro: 'Create a steady flow of quality leads and convert them into paying customers consistently.',
    bullets: [
      'Build a professional online presence.',
      'Develop reliable lead generation systems.',
      'Master the sales process and customer communication.',
    ],
  },
  'financial-management': {
    intro: 'Take control of your numbers, pricing, and cash flow to ensure sustainable profitability.',
    bullets: [
      'Set up proper bookkeeping and financial tracking.',
      'Develop competitive yet profitable pricing strategies.',
      'Manage cash flow and plan for growth.',
    ],
  },
  'customer-experience': {
    intro: 'Deliver exceptional service that turns customers into raving fans and referral sources.',
    bullets: [
      'Standardize your service delivery process.',
      'Build systems for consistent communication.',
      'Create memorable experiences that drive referrals.',
    ],
  },
  'growth-scaling': {
    intro: 'Scale your operations, expand your market reach, and build a business that works without you.',
    bullets: [
      'Develop systems that run without your constant oversight.',
      'Expand into new markets and service areas.',
      'Build a leadership team to support growth.',
    ],
  },
};

const useIsMobile = (breakpoint = 1024) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
};

const Card: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ children, className = '', onClick }) => (
    <div onClick={onClick} className={`surface-card p-6 ${className} ${onClick ? 'cursor-pointer interactive-gold' : ''}`}>
        {children}
    </div>
);


// Celebration Toast Component
const CelebrationToast: React.FC<{ message: string; isVisible: boolean; onClose: () => void }> = ({ message, isVisible, onClose }) => {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <div className={`fixed bottom-6 right-6 z-50 transform transition-all duration-300 ease-out ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}>
            <div className="bg-[var(--accent)] text-white px-6 py-3 rounded-lg shadow-lg max-w-sm">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <CheckIcon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">{message}</span>
                </div>
            </div>
        </div>
    );
};

// --- Sub-components for Blueprint ---

// Compact page heading component (desktop only)
const BlueprintPageHeader: React.FC = () => (
    <div className="mb-6 hidden lg:block">
        <h2 className="text-page-title mb-2">Your 99 Steps Blueprint Progress</h2>
        <p className="text-meta">
            Your step-by-step roadmap to building a dominant restoration business.
        </p>
    </div>
);

// Desktop progress card component 
const BlueprintProgressCard: React.FC<{ globalStats: { totalSteps: number; completedSteps: number; completionPercent: number; masteryLevel: string } }> = ({ globalStats }) => {
    const [displayPercentage, setDisplayPercentage] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => setDisplayPercentage(globalStats.completionPercent), 100);
        return () => clearTimeout(timeout);
    }, [globalStats.completionPercent]);

    return (
        <Card>
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div className="flex-1">
                    <h3 className="text-section-title mb-2">Your Progress</h3>
                    <p className="text-step-title">
                        <span className="font-bold text-[var(--accent)]">{globalStats.completedSteps}</span>
                        <span className="text-[var(--text-muted)]"> of </span>
                        <span className="font-bold text-[var(--text-primary)]">{globalStats.totalSteps}</span>
                        <span className="text-[var(--text-muted)]"> steps completed – </span>
                        <span className="font-bold text-[var(--accent)]">{globalStats.completionPercent}%</span>
                    </p>
                </div>
                <div className="text-left lg:text-right">
                    <p className="text-meta mb-1">Mastery Level</p>
                    <p className="font-bold text-xl text-[var(--accent)] font-playfair">{globalStats.masteryLevel}</p>
                </div>
            </div>
            <div className="w-full h-2 mt-4 shadow-inner" style={{
                backgroundColor: 'var(--progress-track-bg)',
                borderRadius: '8px'
            }}>
                <div 
                    className="h-2 shadow-sm"
                    style={{ 
                        width: `${displayPercentage}%`,
                        backgroundColor: 'var(--accent)',
                        borderRadius: '999px',
                        transition: 'width 0.35s ease'
                    }}
                ></div>
            </div>
        </Card>
    );
};

// Mobile sticky progress bar component
const MobileStickyProgressBar: React.FC<{ globalStats: { totalSteps: number; completedSteps: number; completionPercent: number; masteryLevel: string } }> = ({ globalStats }) => {
    const [displayPercentage, setDisplayPercentage] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => setDisplayPercentage(globalStats.completionPercent), 100);
        return () => clearTimeout(timeout);
    }, [globalStats.completionPercent]);

    return (
        <div className="sticky top-0 z-20 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <span className="text-meta">Progress</span>
                        <span className="text-sm font-bold text-[var(--accent)]">{globalStats.completionPercent}%</span>
                    </div>
                    <div className="w-px h-4 bg-[var(--border-subtle)]"></div>
                    <div className="flex items-center gap-1">
                        <span className="text-meta">Mastery</span>
                        <span className="text-sm font-bold text-[var(--accent)]">{globalStats.masteryLevel}</span>
                    </div>
                </div>
            </div>
            <div className="w-full h-2 shadow-inner" style={{
                backgroundColor: 'var(--progress-track-bg)',
                borderRadius: '8px'
            }}>
                <div 
                    className="h-2 shadow-sm"
                    style={{ 
                        width: `${displayPercentage}%`,
                        backgroundColor: 'var(--accent)',
                        borderRadius: '999px',
                        transition: 'width 0.35s ease'
                    }}
                ></div>
            </div>
        </div>
    );
};

const BlueprintSectionsList: React.FC<{
    sections: SectionWithStats[];
    selectedSectionId: string | null;
    selectedStepId: string | null;
    onSelectSection: (sectionId: string) => void;
    onSelectStep: (stepId: string) => void;
    isMobile: boolean;
}> = ({ sections, selectedSectionId, selectedStepId, onSelectSection, onSelectStep, isMobile }) => {
    const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set());
    const [hasInitialized, setHasInitialized] = useState(false);

    // Initialize default open/closed behavior based on screen size
    useEffect(() => {
        if (!hasInitialized && sections.length > 0) {
            if (isMobile) {
                // Mobile: all sections collapsed by default
                setExpandedSectionIds(new Set());
            } else {
                // Desktop: first section open by default
                setExpandedSectionIds(new Set([sections[0]?.id].filter(Boolean)));
            }
            setHasInitialized(true);
        }
    }, [sections, isMobile, hasInitialized]);

    // Toggle section expand/collapse - only triggered by chevron button
    const toggleSection = (sectionId: string) => {
        setExpandedSectionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };

    // Handle section header click (select section but don't toggle)
    const handleSectionHeaderClick = (sectionId: string) => {
        onSelectSection(sectionId);
    };

    // Handle step click (select step only, don't affect accordion)
    const handleStepClick = (stepId: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent any parent handlers
        // Ensure step selection persists and doesn't get reset
        onSelectStep(stepId);
    };

    const statusColors: Record<StepStatus, string> = {
        'not_started': 'bg-gray-200 text-gray-600',
        'in_progress': 'bg-blue-100 text-blue-800',
        'completed': 'shadow-sm border',
    };

    const getStatusStyle = (status: StepStatus) => {
        if (status === 'completed') {
            return {
                background: 'var(--accent-soft-bg)',
                color: 'var(--accent)',
                borderColor: 'var(--accent)'
            };
        }
        return {};
    };

    return (
        <div className="space-y-6">
            {sections.map(section => {
                const isSelected = section.id === selectedSectionId;
                const isOpen = expandedSectionIds.has(section.id);
                const isFullyCompleted = section.completionRate === 100 && section.totalSteps > 0;

                return (
                    <div
                        key={section.id}
                        data-section-id={section.id}
                        className={`surface-card p-0 overflow-hidden transition-all duration-300 ${
                            isSelected ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-soft-bg)]' : ''
                        } ${isFullyCompleted ? 'ring-2 shadow-lg' : ''}`}
                        style={isFullyCompleted ? {
                            background: 'var(--accent-soft-bg)',
                            boxShadow: '0 0 20px var(--accent-soft-bg), var(--elevation-high)',
                            borderColor: 'var(--accent)'
                        } : {}}
                    >
                        <div className={`p-5 transition-all duration-120 ${
                            isOpen ? 'bg-[var(--bg-surface-soft)]' : 'hover:bg-[var(--bg-surface-soft)] hover:shadow-md'
                        }`}>
                            <div className="flex justify-between items-center">
                                <div 
                                    className="flex-1 cursor-pointer" 
                                    onClick={() => handleSectionHeaderClick(section.id)}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-section-title">{section.name}</h3>
                                        {isFullyCompleted && (
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg animate-pulse-gold" style={{background: 'var(--accent-soft)', border: '2px solid var(--accent)'}}>
                                                <PremiumCheckIcon className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                                            section.completionRate === 100 ? 'shadow-sm' :
                                            section.completionRate > 0 ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-600'
                                        }`}
                                        style={section.completionRate === 100 ? {
                                            background: 'var(--accent-soft-bg)',
                                            color: 'var(--accent)',
                                            border: '1px solid var(--accent)'
                                        } : {}}>
                                            {section.completedSteps} of {section.totalSteps} completed
                                        </span>
                                        <span className="text-sm font-semibold text-[var(--accent)]">
                                            {section.completionRate}%
                                        </span>
                                    </div>
                                    {section.description && (
                                        <p className="text-meta leading-relaxed">{section.description}</p>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSection(section.id);
                                    }}
                                    className="p-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors ml-4"
                                    aria-expanded={isOpen}
                                    aria-controls={`section-${section.id}-content`}
                                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${section.name} section`}
                                >
                                    <ChevronDownIcon className={`w-6 h-6 text-[var(--text-muted)] transition-transform duration-[120ms] ease-out ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>
                        
                        {isOpen && (
                            <div 
                                className="px-5 pb-5 animate-fade-in"
                                id={`section-${section.id}-content`}
                                aria-labelledby={`section-${section.id}-header`}
                            >
                                <div className="w-full h-2 mb-6 shadow-inner" style={{
                                    backgroundColor: 'var(--progress-track-bg)',
                                    borderRadius: '8px'
                                }}>
                                    <div 
                                        className="h-2 shadow-sm" 
                                        style={{ 
                                            width: `${section.completionRate}%`,
                                            backgroundColor: 'var(--accent)',
                                            borderRadius: '999px',
                                            transition: 'width 0.35s ease'
                                        }}
                                    ></div>
                                </div>
                                <div className="space-y-3 space-stack-sm">
                                    {section.steps.map(step => {
                                        const isStepSelected = step.id === selectedStepId;
                                        
                                        return (
                                            <div
                                                key={step.id}
                                                data-step-id={step.id}
                                                onClick={(e) => handleStepClick(step.id, e)}
                                                className={`surface-soft p-4 cursor-pointer transition-all duration-120 flex items-start gap-4 min-h-[80px] touch-manipulation interactive-gold ${
                                                    isStepSelected 
                                                        ? 'text-white shadow-lg scale-[1.02] transform' 
                                                        : 'hover:shadow-md active:scale-[0.98]'
                                                } ${step.status === 'completed' && !isStepSelected ? 'border border-opacity-70' : ''}`}
                                                style={step.status === 'completed' && !isStepSelected ? {
                                                    background: 'var(--brand-success)',
                                                    borderColor: 'var(--accent)'
                                                } : isStepSelected ? {
                                                    background: 'var(--accent)'
                                                } : {}}
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Select step ${step.step_number}: ${step.title}`}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleStepClick(step.id, e);
                                                    }
                                                }}
                                            >
                                                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-sm mt-1 transition-all duration-120 ${
                                                    step.status === 'completed' 
                                                        ? isStepSelected 
                                                            ? 'bg-white scale-110 shadow-md' 
                                                            : 'scale-105 shadow-lg'
                                                        : isStepSelected
                                                            ? 'bg-white scale-105'
                                                            : 'bg-gray-200 text-gray-600'
                                                }`}
                                                style={step.status === 'completed' && !isStepSelected ? {
                                                    background: 'var(--accent-soft)',
                                                    border: '2px solid var(--accent)'
                                                } : isStepSelected ? {
                                                    color: 'var(--accent)'
                                                } : {}}>
                                                    {step.status === 'completed' ? <PremiumCheckIcon className="w-5 h-5 text-white" /> : step.step_number}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-step-title mb-2 break-words ${
                                                        isStepSelected ? 'text-white' : ''
                                                    }`}>
                                                        {step.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-120 ${
                                                            isStepSelected 
                                                                ? 'bg-white bg-opacity-20 text-white'
                                                                : statusColors[step.status]
                                                        }`}
                                                        style={!isStepSelected ? getStatusStyle(step.status) : {}}>
                                                            {step.status.replace('_', ' ')}
                                                        </span>
                                                        {step.checklist && step.checklist.length > 0 && (
                                                            <span className={`text-meta ${
                                                                isStepSelected ? 'text-white text-opacity-80' : ''
                                                            }`}>
                                                                {(step.checklistState || []).filter(Boolean).length}/{step.checklist.length} tasks
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const CategoryOverview: React.FC<{
    section: SectionWithStats;
}> = ({ section }) => {
    const categoryData = CATEGORY_SUMMARIES[section.key] || CATEGORY_SUMMARIES[section.id];
    const isFullyCompleted = section.completionRate === 100 && section.totalSteps > 0;
    
    return (
        <Card>
            <div className="flex items-center gap-3 mb-4">
                <h2 className="text-page-title">{section.name}</h2>
                {isFullyCompleted && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg animate-pulse-gold" style={{background: 'var(--accent-soft)', border: '2px solid var(--accent)'}}>
                        <PremiumCheckIcon className="w-5 h-5 text-white" />
                    </div>
                )}
            </div>
            
            {/* Category Description */}
            <div className="mb-6">
                <p className="text-meta leading-relaxed">
                    {categoryData?.intro || section.description || 'Explore the steps in this category to build expertise in this area.'}
                </p>
            </div>

            {/* Progress Summary */}
            <div className="mb-6 p-4 bg-[var(--bg-surface-soft)] rounded-lg border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-section-title">Progress</h4>
                    <span className="text-step-title">
                        <span className="font-bold text-[var(--accent)]">{section.completedSteps}</span>
                        <span className="text-[var(--text-muted)]"> of </span>
                        <span className="font-bold text-[var(--text-primary)]">{section.totalSteps}</span>
                        <span className="text-[var(--text-muted)]"> steps completed – </span>
                        <span className="font-bold text-[var(--accent)]">{section.completionRate}%</span>
                    </span>
                </div>
                <div className="w-full h-2 shadow-inner" style={{
                    backgroundColor: 'var(--progress-track-bg)',
                    borderRadius: '8px'
                }}>
                    <div 
                        className="h-2 shadow-sm"
                        style={{ 
                            width: `${section.completionRate}%`,
                            backgroundColor: 'var(--accent)',
                            borderRadius: '999px',
                            transition: 'width 0.35s ease'
                        }}
                    ></div>
                </div>
            </div>

            {/* Key Focus Areas */}
            {categoryData?.bullets && (
                <div className="mb-6">
                    <h4 className="text-section-title mb-3">Key Focus Areas</h4>
                    <ul className="space-y-2">
                        {categoryData.bullets.map((bullet, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className="w-2 h-2 rounded-full bg-[var(--accent)] mt-2 shrink-0"></div>
                                <span className="text-meta leading-relaxed">{bullet}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Success Panel for Completed Categories */}
            {isFullyCompleted && (
                <div className="p-4 rounded-lg border-2 border-[var(--accent)] bg-[var(--accent-soft-bg)] mb-6">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-md" style={{background: 'var(--accent-soft)', border: '2px solid var(--accent)'}}>
                            <PremiumCheckIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-[var(--accent)] mb-1">Great work! You finished {section.name}.</h4>
                            <p className="text-sm text-[var(--text-muted)]">You now have the foundation for this phase in place and you are ready to move into the next area.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Hint */}
            <div className="text-center pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-meta italic">Choose a step on the left to see the detailed tasks.</p>
            </div>
        </Card>
    );
};

const BlueprintStepDetail: React.FC<{
    step: StepWithProgress | null;
    onUpdateChecklist: (stepId: string, checklistState: boolean[]) => void;
}> = ({ step, onUpdateChecklist }) => {
    if (!step) {
        return (
            <Card className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto text-gray-300"/>
                    <h3 className="mt-2 text-xl font-bold text-[var(--text-main)]">Select a step</h3>
                    <p className="mt-1 text-[var(--text-muted)]">Choose a step from the list to see details and track your progress.</p>
                </div>
            </Card>
        );
    }
    
    const handleChecklistChange = (index: number, checked: boolean) => {
        // Take the current checklist_state array for that step
        // If null/undefined, initialize an array of false with the same length as the step's checklist
        const currentChecklistState = step.checklistState || Array(step.checklist.length).fill(false);
        
        // Toggle the clicked index to compute nextChecklistState
        const nextChecklistState = [...currentChecklistState];
        nextChecklistState[index] = checked;
        
        onUpdateChecklist(step.id, nextChecklistState);
    };

    const statusOptions: StepStatus[] = ['not_started', 'in_progress', 'completed'];
    const statusColors: Record<StepStatus, string> = {
        'not_started': 'bg-gray-100 text-gray-700',
        'in_progress': 'bg-blue-100 text-blue-800',
        'completed': 'shadow-sm border',
    };

    const getDetailStatusStyle = (status: StepStatus) => {
        if (status === 'completed') {
            return {
                background: 'var(--accent-soft-bg)',
                color: 'var(--accent)',
                borderColor: 'var(--accent)'
            };
        }
        return {};
    };

    return (
        <Card>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-meta font-bold text-[var(--accent)]">Step {step.step_number}</span>
            </div>
            <h2 className="text-page-title mt-1">{step.title}</h2>
            
            {step.description && (
                <p className="text-meta mt-2">{step.description}</p>
            )}
            
            <div className="mt-6">
                <div className="flex bg-[var(--bg-surface-soft)] p-1.5 rounded-xl border border-[var(--border-subtle)]">
                    {statusOptions.map(s => (
                        <div 
                            key={s} 
                            className={`flex-1 py-3 px-2 text-sm font-bold rounded-lg transition-all text-center ${
                                step.status === s ? statusColors[s] + ' shadow-md transform scale-105' : 'text-[var(--text-muted)] opacity-60'
                            }`}
                            style={step.status === s ? getDetailStatusStyle(s) : {}}
                        >
                            {s.replace('_', ' ')}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-3 italic">
                    ✨ Status updates automatically as you complete checklist items
                </p>
            </div>

            {/* Checklist section - moved to be first after status */}
            {step.checklist && step.checklist.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-section-title">Checklist</h4>
                        <span className="text-meta">
                            {(step.checklistState || []).filter(Boolean).length} of {step.checklist.length} completed
                        </span>
                    </div>
                    <div className="space-y-3 space-stack-sm">
                        {step.checklist.map((item, index) => {
                            const isChecked = (step.checklistState || Array(step.checklist.length).fill(false))[index] || false;
                            return (
                                <label 
                                    key={index} 
                                    className={`surface-soft p-4 cursor-pointer transition-all duration-120 touch-manipulation min-h-[60px] flex items-start gap-4 interactive-gold ${
                                        isChecked 
                                            ? 'border shadow-sm' 
                                            : 'border-transparent'
                                    }`}
                                    style={isChecked ? {
                                        background: 'var(--brand-success)',
                                        borderColor: 'var(--accent)'
                                    } : {}}
                                >
                                    <div className="relative shrink-0 mt-1">
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked}
                                            onChange={e => handleChecklistChange(index, e.target.checked)}
                                            className="opacity-0 absolute h-5 w-5 cursor-pointer"
                                        />
                                        <div className={`h-5 w-5 rounded border-2 transition-all duration-120 cursor-pointer flex items-center justify-center ${
                                            isChecked 
                                                ? 'shadow-sm' 
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                        style={isChecked ? {
                                            background: 'var(--accent-soft)',
                                            borderColor: 'var(--accent)'
                                        } : {}}>
                                            {isChecked && <PremiumCheckIcon className="h-3 w-3 text-white" />}
                                        </div>
                                    </div>
                                    <span className={`text-step-title leading-relaxed transition-all duration-120 break-words ${
                                        isChecked 
                                            ? 'line-through opacity-80' 
                                            : ''
                                    }`}
                                    style={isChecked ? { color: 'var(--text-muted)' } : {}}>
                                        {item}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Why this matters section - moved to be after checklist */}
            {step.why_it_matters && (
                <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                    <h4 className="text-section-title mb-2">Why this matters</h4>
                    <p className="text-meta">{step.why_it_matters}</p>
                </div>
            )}
        </Card>
    );
};

const MobileStepDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    selectedStep: StepWithProgress | null;
}> = ({ isOpen, onClose, children, selectedStep }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-50 animate-fade-in" onClick={onClose}></div>

            {/* Drawer Content */}
            <div className="relative w-full bg-[var(--bg-main)] rounded-t-3xl shadow-2xl h-[90vh] mt-auto flex flex-col animate-slide-up-drawer">
                {/* Handle and Header */}
                <div className="shrink-0 p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-t-3xl">
                    <div className="w-12 h-1.5 bg-[var(--border-subtle)] rounded-full mx-auto mb-4"></div>
                    <div className="flex items-center justify-between">
                        <h3 className="font-playfair text-lg font-bold text-[var(--text-main)]">
                            {selectedStep ? 'Step Details' : 'Category Overview'}
                        </h3>
                        <button 
                            onClick={onClose} 
                            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-grow overflow-y-auto p-6 overscroll-contain">
                    {children}
                </div>
            </div>
        </div>
    );
};

const MemberBlueprint: React.FC<{ onNavigate: (view: MemberView) => void; }> = ({ onNavigate }) => {
    const { hasBlueprintAccess, loading: accessLoading, accessState, error: accessError } = useBlueprintAccess();
    const { 
        sections, 
        globalStats,
        selectedSectionId, 
        selectedStepId, 
        selectedSection,
        selectedStep,
        loading, 
        error,
        updateChecklist,
        setSelectedSection,
        setSelectedStep
    } = useBlueprintData();
    
    const isMobile = useIsMobile();
    
    // Celebration state
    const [celebrationMessage, setCelebrationMessage] = useState<string>('');
    const [showCelebration, setShowCelebration] = useState(false);
    const celebrationTriggeredRef = useRef<Set<string>>(new Set());

    // Track section completion for celebrations
    const sectionCompletion = useMemo(() => {
        return sections.reduce((acc, section) => {
            acc[section.id] = section.steps.length > 0 && section.steps.every(s => s.status === 'completed');
            return acc;
        }, {} as Record<string, boolean>);
    }, [sections]);

    // Monitor section completions for celebrations and animations
    const prevSectionCompletionRef = useRef<Record<string, boolean>>({});
    
    useEffect(() => {
        if (loading) return;
        
        const prevCompletion = prevSectionCompletionRef.current;
        
        // Check for newly completed sections
        sections.forEach(section => {
            if (!prevCompletion[section.id] && sectionCompletion[section.id] && !celebrationTriggeredRef.current.has(section.id)) {
                // Trigger section completion animation
                const sectionElement = document.querySelector(`[data-section-id="${section.id}"]`);
                if (sectionElement) {
                    sectionElement.classList.add('section-completing');
                    setTimeout(() => {
                        sectionElement.classList.remove('section-completing');
                    }, 1200);
                }
                
                // Show celebration toast
                setCelebrationMessage(`🏆 Amazing! You completed ${section.name}!`);
                setShowCelebration(true);
                celebrationTriggeredRef.current.add(section.id);
            }
        });
        
        prevSectionCompletionRef.current = sectionCompletion;
    }, [sectionCompletion, sections, loading]);

    const handleCloseCelebration = () => {
        setShowCelebration(false);
        setCelebrationMessage('');
    };

    const handleSelectStep = (stepId: string) => {
        // Always ensure we set the step, regardless of section state
        setSelectedStep(stepId);
        
        // Find which section contains this step and ensure it's selected too
        const containingSection = sections.find(section => 
            section.steps.some(step => step.id === stepId)
        );
        if (containingSection && containingSection.id !== selectedSectionId) {
            setSelectedSection(containingSection.id);
        }
    };

    const handleCloseDrawer = () => {
        // Only clear selections on mobile when explicitly closing drawer
        if (isMobile) {
            setSelectedStep('');
            setSelectedSection('');
        }
    };

    // Handle access state based on the AccessState type
    if (accessState === 'loading') {
        return (
            <div className="animate-fade-in p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
                    <div className="text-lg text-[var(--text-muted)]">Checking your access...</div>
                </div>
            </div>
        );
    }

    if (accessState === 'denied') {
        return <BlueprintUpgradePrompt onUpgrade={() => onNavigate('billing')} />;
    }

    if (accessState === 'error') {
        return (
            <div className="animate-fade-in p-8">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="text-red-500 mb-4 text-4xl">⚠️</div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Unable to check access</h2>
                    <p className="text-[var(--text-muted)] mb-6">
                        {accessError || 'There was a problem verifying your blueprint access. Please try refreshing the page.'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg font-semibold hover:bg-[var(--accent-hover)] transition-colors duration-200"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Only continue if accessState === 'allowed'

    // Show loading state if data is loading
    if (loading) {
        return (
            <div className="animate-fade-in p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
                    <div className="text-lg text-[var(--text-muted)]">Loading your blueprint...</div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="animate-fade-in p-8">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="text-red-500 mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Unable to load blueprint</h2>
                    <p className="text-[var(--text-muted)]">{error}</p>
                </div>
            </div>
        );
    }

    // Show empty state if no sections
    if (sections.length === 0) {
        return (
            <div className="animate-fade-in p-8">
                <div className="max-w-2xl mx-auto text-center">
                    <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto text-gray-300 mb-6" />
                    <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Blueprint not yet available</h2>
                    <p className="text-[var(--text-muted)]">The 99 Steps Blueprint is being prepared for you. Check back soon!</p>
                </div>
            </div>
        );
    }

    // Render the full Blueprint UI when user has access
    return (
        <div className="animate-fade-in pb-8">
            {isMobile ? (
                <div className="space-y-6">
                    {/* Mobile: Sticky Progress Bar at top */}
                    <MobileStickyProgressBar globalStats={globalStats} />
                    
                    {/* Mobile Sections List */}
                    <div className="space-y-4 px-4">
                        <BlueprintSectionsList 
                            sections={sections}
                            selectedSectionId={selectedSectionId}
                            selectedStepId={selectedStepId}
                            onSelectSection={setSelectedSection}
                            onSelectStep={handleSelectStep}
                            isMobile={isMobile}
                        />
                    </div>

                    {/* Mobile Step Drawer */}
                    <MobileStepDrawer isOpen={isMobile && (!!selectedStepId || !!selectedSectionId)} onClose={handleCloseDrawer} selectedStep={selectedStep}>
                        {selectedStep ? (
                            <BlueprintStepDetail 
                                step={selectedStep} 
                                onUpdateChecklist={updateChecklist} 
                            />
                        ) : selectedSection ? (
                            <CategoryOverview section={selectedSection} />
                        ) : null}
                    </MobileStepDrawer>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Desktop: Compact page header */}
                    <BlueprintPageHeader />
                    
                    {/* Desktop: Progress Card */}
                    <BlueprintProgressCard globalStats={globalStats} />
                    
                    {/* Desktop Two-Column Layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 items-start">
                        <div className="xl:col-span-2 space-y-6">
                            <BlueprintSectionsList 
                                sections={sections}
                                selectedSectionId={selectedSectionId}
                                selectedStepId={selectedStepId}
                                onSelectSection={setSelectedSection}
                                onSelectStep={handleSelectStep}
                                isMobile={isMobile}
                            />
                        </div>
                        <div className="xl:col-span-3 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
                            {selectedStep ? (
                                <BlueprintStepDetail 
                                    step={selectedStep} 
                                    onUpdateChecklist={updateChecklist} 
                                />
                            ) : selectedSection ? (
                                <CategoryOverview section={selectedSection} />
                            ) : (
                                <BlueprintStepDetail 
                                    step={null} 
                                    onUpdateChecklist={updateChecklist} 
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <CelebrationToast 
                message={celebrationMessage}
                isVisible={showCelebration}
                onClose={handleCloseCelebration}
            />
            
            <style jsx>{`
                /* Premium gold pulse animation */
                .animate-pulse-gold {
                    animation: pulseGold 2s infinite;
                }
                
                @keyframes pulseGold {
                    0%, 100% { 
                        box-shadow: 0 0 0 0 rgba(196, 165, 116, 0.7);
                        transform: scale(1);
                    }
                    50% { 
                        box-shadow: 0 0 0 8px rgba(196, 165, 116, 0);
                        transform: scale(1.05);
                    }
                }

                /* Step completion animation - premium gold glow */
                .step-completing {
                    animation: stepComplete 0.3s ease-out;
                }
                
                @keyframes stepComplete {
                    0% { 
                        transform: scale(1); 
                        box-shadow: 0 0 0 0 rgba(196, 165, 116, 0);
                    }
                    50% { 
                        transform: scale(1.02); 
                        box-shadow: 0 4px 12px 0 rgba(196, 165, 116, 0.3);
                        background-color: rgba(196, 165, 116, 0.1);
                    }
                    100% { 
                        transform: scale(1); 
                        box-shadow: 0 0 0 0 rgba(196, 165, 116, 0);
                        background-color: transparent;
                    }
                }
                
                /* Section completion animation - premium gold glow */
                .section-completing {
                    animation: sectionComplete 0.6s ease-out;
                    position: relative;
                }
                
                @keyframes sectionComplete {
                    0% { 
                        background-color: transparent;
                    }
                    25% { 
                        background-color: rgba(196, 165, 116, 0.08);
                    }
                    50% {
                        background-color: rgba(196, 165, 116, 0.12);
                    }
                    100% { 
                        background-color: rgba(196, 165, 116, 0.05);
                    }
                }
                
                .section-completing::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: linear-gradient(90deg, rgba(196, 165, 116, 0.8), rgba(196, 165, 116, 0.4));
                    animation: underlineGrow 0.8s ease-out;
                }
                
                @keyframes underlineGrow {
                    0% { width: 0; opacity: 0; }
                    50% { opacity: 1; }
                    100% { width: 100%; opacity: 0; }
                }
                
                /* Completion badge fade in */
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out;
                }
                
                @keyframes fadeIn {
                    0% { 
                        opacity: 0; 
                        transform: translateY(-10px) scale(0.9); 
                    }
                    100% { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                }
                
                /* Existing animations */
                .completed-check-icon {
                    animation: checkIconScale 0.3s ease-out;
                }
                
                @keyframes checkIconScale {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                .animate-slide-up-drawer {
                    animation: slideUpDrawer 0.3s ease-out;
                }
                
                @keyframes slideUpDrawer {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default MemberBlueprint;