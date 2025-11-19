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
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { KeyIcon, CheckIcon, ChevronDownIcon, ClipboardDocumentCheckIcon, XMarkIcon } from './icons';
import { useBlueprintAccess } from '../src/hooks';
import { useBlueprintData } from '../src/hooks/useBlueprintData';
import type { StepWithProgress, SectionWithStats, StepStatus } from '../src/hooks/useBlueprintData';
import BlueprintUpgradePrompt from './BlueprintUpgradePrompt';

type MemberView = 'overview' | 'my-requests' | 'profile' | 'badge' | 'documents' | 'benefits' | 'billing' | 'community' | 'blueprint' | 'settings';

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
    <div onClick={onClick} className={`bg-[var(--bg-card)] p-6 rounded-2xl shadow-lg border border-[var(--border-subtle)] ${className} ${onClick ? 'cursor-pointer transition-transform duration-200 hover:-translatey-1' : ''}`}>
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

// Compact page heading component
const BlueprintPageHeader: React.FC = () => (
    <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-1">Your 99 Steps Blueprint Progress</h2>
        <p className="text-sm text-[var(--text-muted)]">
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
                    <h3 className="font-semibold text-lg text-[var(--text-main)] mb-1">Your Progress</h3>
                    <p className="text-base text-[var(--text-main)]">
                        <span className="font-bold text-[var(--accent)]">{globalStats.completedSteps}</span>
                        <span className="text-[var(--text-muted)]"> of </span>
                        <span className="font-bold">{globalStats.totalSteps}</span>
                        <span className="text-[var(--text-muted)]"> steps completed – </span>
                        <span className="font-bold text-[var(--accent)]">{globalStats.completionPercent}%</span>
                    </p>
                </div>
                <div className="text-left lg:text-right">
                    <p className="text-sm font-semibold text-[var(--text-muted)] mb-1">Mastery Level</p>
                    <p className="font-bold text-xl text-[var(--accent)] font-playfair">{globalStats.masteryLevel}</p>
                </div>
            </div>
            <div className="w-full bg-[var(--bg-subtle)] rounded-full h-3 mt-4 shadow-inner">
                <div 
                    className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${displayPercentage}%` }}
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
        <div className="sticky top-0 z-20 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-[var(--text-muted)]">Progress</span>
                        <span className="text-sm font-bold text-[var(--accent)]">{globalStats.completionPercent}%</span>
                    </div>
                    <div className="w-px h-4 bg-[var(--border-subtle)]"></div>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-[var(--text-muted)]">Mastery</span>
                        <span className="text-sm font-bold text-[var(--accent)]">{globalStats.masteryLevel}</span>
                    </div>
                </div>
            </div>
            <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2 shadow-inner">
                <div 
                    className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${displayPercentage}%` }}
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
        onSelectStep(stepId);
    };

    const statusColors: Record<StepStatus, string> = {
        'not_started': 'bg-gray-200 text-gray-600',
        'in_progress': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800',
    };

    return (
        <div className="space-y-6">
            {sections.map(section => {
                const isSelected = section.id === selectedSectionId;
                const isOpen = expandedSectionIds.has(section.id);
                const isFullyCompleted = section.completionRate === 100 && section.totalSteps > 0;

                return (
                    <Card 
                        key={section.id}
                        data-section-id={section.id}
                        className={`p-0 overflow-hidden transition-all duration-300 ${
                            isSelected ? 'ring-2 ring-[var(--accent)] bg-[var(--accent-bg-subtle)]' : ''
                        } ${isFullyCompleted ? 'ring-2 ring-green-200 bg-gradient-to-r from-green-50 to-transparent' : ''}`}
                    >
                        <div className={`p-5 transition-all duration-200 ${
                            isOpen ? 'bg-[var(--bg-subtle)]' : 'hover:bg-[var(--bg-subtle)]'
                        }`}>
                            <div className="flex justify-between items-center">
                                <div 
                                    className="flex-1 cursor-pointer" 
                                    onClick={() => handleSectionHeaderClick(section.id)}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-playfair text-xl font-bold text-[var(--text-main)]">{section.name}</h3>
                                        {isFullyCompleted && (
                                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                                <CheckIcon className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                            section.completionRate === 100 ? 'bg-green-100 text-green-800' :
                                            section.completionRate > 0 ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {section.completedSteps} of {section.totalSteps} completed
                                        </span>
                                        <span className="text-sm font-semibold text-[var(--accent)]">
                                            {section.completionRate}%
                                        </span>
                                    </div>
                                    {section.description && (
                                        <p className="text-sm text-[var(--text-muted)] leading-relaxed">{section.description}</p>
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
                                    <ChevronDownIcon className={`w-6 h-6 text-[var(--text-muted)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>
                        
                        {isOpen && (
                            <div 
                                className="px-5 pb-5 animate-fade-in"
                                id={`section-${section.id}-content`}
                                aria-labelledby={`section-${section.id}-header`}
                            >
                                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2 mb-6 shadow-inner">
                                    <div 
                                        className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] h-2 rounded-full transition-all duration-500 shadow-sm" 
                                        style={{ width: `${section.completionRate}%` }}
                                    ></div>
                                </div>
                                <div className="space-y-3">
                                    {section.steps.map(step => {
                                        const isStepSelected = step.id === selectedStepId;
                                        
                                        return (
                                            <div
                                                key={step.id}
                                                data-step-id={step.id}
                                                onClick={(e) => handleStepClick(step.id, e)}
                                                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 flex items-start gap-4 min-h-[80px] touch-manipulation ${
                                                    isStepSelected 
                                                        ? 'bg-[var(--accent)] text-white shadow-lg scale-[1.02] transform' 
                                                        : 'hover:bg-[var(--bg-subtle)] hover:shadow-md active:scale-[0.98]'
                                                } ${step.status === 'completed' && !isStepSelected ? 'bg-gradient-to-r from-green-50 to-transparent border border-green-200' : ''}`}
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
                                                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-sm mt-1 transition-all duration-300 ${
                                                    step.status === 'completed' 
                                                        ? isStepSelected 
                                                            ? 'bg-white text-[var(--accent)] scale-110 shadow-md' 
                                                            : 'bg-green-500 text-white scale-105 shadow-sm'
                                                        : isStepSelected
                                                            ? 'bg-white text-[var(--accent)] scale-105'
                                                            : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {step.status === 'completed' ? <CheckIcon className="w-5 h-5"/> : step.step_number}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`font-semibold leading-tight text-base mb-2 break-words ${
                                                        isStepSelected ? 'text-white' : 'text-[var(--text-main)]'
                                                    }`}>
                                                        {step.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                                                            isStepSelected 
                                                                ? 'bg-white bg-opacity-20 text-white'
                                                                : statusColors[step.status]
                                                        }`}>
                                                            {step.status.replace('_', ' ')}
                                                        </span>
                                                        {step.checklist && step.checklist.length > 0 && (
                                                            <span className={`text-xs font-medium ${
                                                                isStepSelected ? 'text-white text-opacity-80' : 'text-[var(--text-muted)]'
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
                    </Card>
                );
            })}
        </div>
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
        'completed': 'bg-green-100 text-green-800',
    };

    return (
        <Card>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-[var(--accent-dark)]">Step {step.step_number}</span>
            </div>
            <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mt-1">{step.title}</h2>
            
            {step.description && (
                <p className="text-[var(--text-muted)] mt-2">{step.description}</p>
            )}
            
            <div className="mt-6">
                <p className="text-sm font-semibold text-[var(--text-muted)] mb-3">
                    Status (automatically updated):
                </p>
                <div className="flex bg-[var(--bg-subtle)] p-1.5 rounded-xl">
                    {statusOptions.map(s => (
                        <div 
                            key={s} 
                            className={`flex-1 py-3 px-2 text-sm font-bold rounded-lg transition-all text-center ${
                                step.status === s ? statusColors[s] + ' shadow-md transform scale-105' : 'text-[var(--text-muted)] opacity-60'
                            }`}
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
                        <h4 className="font-bold text-[var(--text-main)] text-lg">Checklist</h4>
                        <span className="text-sm text-[var(--text-muted)] font-medium">
                            {(step.checklistState || []).filter(Boolean).length} of {step.checklist.length} completed
                        </span>
                    </div>
                    <div className="space-y-3">
                        {step.checklist.map((item, index) => {
                            const isChecked = (step.checklistState || Array(step.checklist.length).fill(false))[index] || false;
                            return (
                                <label 
                                    key={index} 
                                    className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 touch-manipulation min-h-[60px] ${
                                        isChecked 
                                            ? 'bg-green-50 hover:bg-green-100 border border-green-200' 
                                            : 'hover:bg-[var(--bg-subtle)] border border-transparent active:bg-[var(--bg-subtle)]'
                                    }`}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={e => handleChecklistChange(index, e.target.checked)}
                                        className="h-5 w-5 mt-1 rounded-md border-2 border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-2 transition-all duration-150 cursor-pointer shrink-0"
                                    />
                                    <span className={`text-base leading-relaxed transition-all duration-200 break-words ${
                                        isChecked 
                                            ? 'line-through text-[var(--text-muted)] opacity-80' 
                                            : 'text-[var(--text-main)]'
                                    }`}>
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
                    <h4 className="font-bold text-[var(--text-main)] mb-2">Why this matters</h4>
                    <p className="text-[var(--text-muted)] text-sm">{step.why_it_matters}</p>
                </div>
            )}
        </Card>
    );
};

const MobileStepDrawer: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
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
                        <h3 className="font-playfair text-lg font-bold text-[var(--text-main)]">Step Details</h3>
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
        setSelectedStep(stepId);
    };

    const handleCloseDrawer = () => {
        setSelectedStep('');
    };

    const isMobileDrawerOpen = isMobile && !!selectedStepId;

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
                    <MobileStepDrawer isOpen={isMobileDrawerOpen} onClose={handleCloseDrawer}>
                        <BlueprintStepDetail 
                            step={selectedStep} 
                            onUpdateChecklist={updateChecklist} 
                        />
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
                            <BlueprintStepDetail 
                                step={selectedStep} 
                                onUpdateChecklist={updateChecklist} 
                            />
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
                /* Step completion animation - subtle scale and glow */
                .step-completing {
                    animation: stepComplete 0.3s ease-out;
                }
                
                @keyframes stepComplete {
                    0% { 
                        transform: scale(1); 
                        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
                    }
                    50% { 
                        transform: scale(1.02); 
                        box-shadow: 0 4px 12px 0 rgba(34, 197, 94, 0.2);
                        background-color: rgba(34, 197, 94, 0.05);
                    }
                    100% { 
                        transform: scale(1); 
                        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
                        background-color: transparent;
                    }
                }
                
                /* Section completion animation - elegant glow and underline */
                .section-completing {
                    animation: sectionComplete 0.6s ease-out;
                    position: relative;
                }
                
                @keyframes sectionComplete {
                    0% { 
                        background-color: transparent;
                    }
                    25% { 
                        background-color: rgba(34, 197, 94, 0.08);
                    }
                    50% {
                        background-color: rgba(34, 197, 94, 0.12);
                    }
                    100% { 
                        background-color: rgba(34, 197, 94, 0.05);
                    }
                }
                
                .section-completing::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: linear-gradient(90deg, rgba(34, 197, 94, 0.8), rgba(34, 197, 94, 0.4));
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