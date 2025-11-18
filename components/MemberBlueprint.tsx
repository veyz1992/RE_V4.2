import React, { useState, useMemo, useEffect, useRef } from 'react';
import { KeyIcon, CheckIcon, ChevronDownIcon, ClipboardDocumentCheckIcon, XMarkIcon } from './icons';
import { useBlueprintAccess } from '../src/hooks';
import { useBlueprintData } from '../src/hooks/useBlueprintData';
import type { StepWithProgress, SectionWithStats, StepStatus } from '../src/hooks/useBlueprintData';

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

const BlueprintHeader: React.FC<{ globalStats: { totalSteps: number; completedSteps: number; completionPercent: number; masteryLevel: string } }> = ({ globalStats }) => {
    const [displayPercentage, setDisplayPercentage] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => setDisplayPercentage(globalStats.completionPercent), 100);
        return () => clearTimeout(timeout);
    }, [globalStats.completionPercent]);

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="font-playfair text-xl font-bold text-[var(--text-main)]">Your Progress</h2>
                    <p className="text-lg text-[var(--text-main)]"><span className="font-bold">{globalStats.completedSteps} of {globalStats.totalSteps}</span> steps completed – {globalStats.completionPercent}%</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Mastery Level</p>
                    <p className="font-bold text-lg text-[var(--accent-dark)]">{globalStats.masteryLevel}</p>
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
                <div 
                    className="bg-[var(--accent)] h-4 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${displayPercentage}%` }}
                ></div>
            </div>
        </Card>
    );
};

const BlueprintSectionsList: React.FC<{
    sections: SectionWithStats[];
    selectedSectionId: string | null;
    selectedStepId: string | null;
    onSelectSection: (sectionId: string) => void;
    onSelectStep: (stepId: string) => void;
}> = ({ sections, selectedSectionId, selectedStepId, onSelectSection, onSelectStep }) => {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

    // Auto-open the selected section
    useEffect(() => {
        if (selectedSectionId && !openSections[selectedSectionId]) {
            setOpenSections(prev => ({ ...prev, [selectedSectionId]: true }));
        }
    }, [selectedSectionId, openSections]);

    const toggleSection = (sectionId: string) => {
        setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
        onSelectSection(sectionId);
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
                const isOpen = openSections[section.id];
                const isFullyCompleted = section.completionRate === 100 && section.totalSteps > 0;

                return (
                    <Card 
                        key={section.id}
                        data-section-id={section.id}
                        className={`p-0 overflow-hidden transition-all duration-300 ${isFullyCompleted ? 'ring-2 ring-green-200 bg-gradient-to-r from-green-50 to-transparent' : ''}`}
                    >
                        <button 
                            onClick={() => toggleSection(section.id)} 
                            className="w-full p-4 flex justify-between items-center text-left hover:bg-[var(--bg-subtle)] transition-colors"
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-playfair text-xl font-bold text-[var(--text-main)]">{section.name}</h3>
                                    {isFullyCompleted && (
                                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                            <CheckIcon className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-[var(--text-muted)]">{section.completedSteps} of {section.totalSteps} steps completed</p>
                                {section.description && (
                                    <p className="text-sm text-[var(--text-muted)] mt-1">{section.description}</p>
                                )}
                            </div>
                            <ChevronDownIcon className={`w-6 h-6 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isOpen && (
                            <div className="px-4 pb-4 animate-fade-in">
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                                    <div 
                                        className="bg-[var(--accent)] h-1.5 rounded-full transition-all duration-500" 
                                        style={{ width: `${section.completionRate}%` }}
                                    ></div>
                                </div>
                                <div className="space-y-2">
                                    {section.steps.map(step => {
                                        const isStepSelected = step.id === selectedStepId;
                                        
                                        return (
                                            <div
                                                key={step.id}
                                                data-step-id={step.id}
                                                onClick={() => onSelectStep(step.id)}
                                                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-start gap-3 ${
                                                    isStepSelected 
                                                        ? 'bg-[var(--accent-bg-subtle)] shadow-inner' 
                                                        : 'hover:bg-[var(--bg-subtle)]'
                                                } ${step.status === 'completed' ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''}`}
                                            >
                                                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-xs mt-0.5 transition-all duration-300 ${
                                                    step.status === 'completed' 
                                                        ? 'bg-[var(--accent)] text-white scale-105' 
                                                        : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {step.status === 'completed' ? <CheckIcon className="w-4 h-4"/> : step.step_number}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-[var(--text-main)] leading-tight">{step.title}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusColors[step.status]}`}>
                                                            {step.status.replace('_', ' ')}
                                                        </span>
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
        const newChecklistState = [...step.checklistState];
        newChecklistState[index] = checked;
        onUpdateChecklist(step.id, newChecklistState);
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
                <p className="text-sm font-semibold text-[var(--text-muted)] mb-2">
                    Status (determined by checklist):
                </p>
                <div className="flex bg-[var(--bg-subtle)] p-1 rounded-lg">
                    {statusOptions.map(s => (
                        <div 
                            key={s} 
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all cursor-not-allowed opacity-75 text-center ${
                                step.status === s ? statusColors[s] + ' shadow-sm' : 'text-[var(--text-muted)]'
                            }`}
                        >
                            {s.replace('_', ' ')}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2 italic">
                    Status is automatically updated based on checklist completion
                </p>
            </div>

            {step.why_it_matters && (
                <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                    <h4 className="font-bold text-[var(--text-main)] mb-2">Why this matters</h4>
                    <p className="text-[var(--text-muted)] text-sm">{step.why_it_matters}</p>
                </div>
            )}

            {step.checklist && step.checklist.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                    <h4 className="font-bold text-[var(--text-main)] mb-2">Checklist</h4>
                    <div className="space-y-2">
                        {step.checklist.map((item, index) => (
                            <label 
                                key={index} 
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--bg-subtle)] cursor-pointer transition-all duration-150"
                            >
                                <input 
                                    type="checkbox" 
                                    checked={step.checklistState[index] || false} 
                                    onChange={e => handleChecklistChange(index, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)] transition-all duration-150"
                                />
                                <span className={`text-sm transition-all duration-150 ${
                                    step.checklistState[index] 
                                        ? 'line-through text-[var(--text-muted)]' 
                                        : 'text-[var(--text-main)]'
                                }`}>
                                    {item}
                                </span>
                            </label>
                        ))}
                    </div>
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
        <div className="fixed inset-0 z-50 flex flex-col items-end" role="dialog" aria-modal="true">
            {/* Overlay */}
            <div className="absolute inset-0 bg-[var(--bg-overlay)] animate-fade-in" onClick={onClose}></div>

            {/* Drawer Content */}
            <div className="relative w-full bg-[var(--bg-main)] rounded-t-2xl shadow-2xl h-[85vh] flex flex-col animate-slide-up-drawer">
                <div className="shrink-0 p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-t-2xl">
                    <div className="w-12 h-1.5 bg-[var(--border-subtle)] rounded-full mx-auto mb-2"></div>
                    <button onClick={onClose} className="absolute top-3 right-3 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                        <XMarkIcon className="w-7 h-7" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

const MemberBlueprint: React.FC<{ onNavigate: (view: MemberView) => void; }> = ({ onNavigate }) => {
    const { hasBlueprintAccess, loading: accessLoading } = useBlueprintAccess();
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

    // Show loading state while checking access
    if (accessLoading) {
        return (
            <div className="animate-fade-in p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
                    <div className="text-lg text-[var(--text-muted)]">Checking your access...</div>
                </div>
            </div>
        );
    }

    // Show access wall if user doesn't have blueprint access
    if (!hasBlueprintAccess) {
        return (
            <div className="animate-fade-in p-8">
                <div className="max-w-2xl mx-auto text-center">
                    <KeyIcon className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-6" />
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)] mb-4">
                        Unlock the 99 Steps Blueprint
                    </h1>
                    <p className="text-lg text-[var(--text-muted)] mb-8">
                        This comprehensive roadmap is included in Founding Member and Gold memberships or available as a standalone 99 Steps Blueprint add-on.
                    </p>
                    <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                        <button
                            onClick={() => onNavigate('billing')}
                            className="w-full sm:w-auto px-6 py-3 bg-[var(--accent)] text-white rounded-lg font-semibold hover:bg-[var(--accent-hover)] transition-colors duration-200"
                        >
                            View membership options
                        </button>
                        <button
                            onClick={() => onNavigate('my-requests')}
                            className="w-full sm:w-auto px-6 py-3 border border-[var(--border-subtle)] text-[var(--text-main)] rounded-lg font-semibold hover:bg-[var(--bg-card)] transition-colors duration-200"
                        >
                            Contact support
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
        <div className="animate-fade-in">
            <div className="mb-6">
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">99 Steps Blueprint</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">Your step-by-step roadmap to building a dominant restoration business.</p>
            </div>
            {isMobile ? (
                <>
                    <BlueprintSectionsList 
                        sections={sections}
                        selectedSectionId={selectedSectionId}
                        selectedStepId={selectedStepId}
                        onSelectSection={setSelectedSection}
                        onSelectStep={handleSelectStep}
                    />
                    <div className="mt-8">
                        <BlueprintHeader globalStats={globalStats} />
                    </div>
                    <MobileStepDrawer isOpen={isMobileDrawerOpen} onClose={handleCloseDrawer}>
                        <BlueprintStepDetail 
                            step={selectedStep} 
                            onUpdateChecklist={updateChecklist} 
                        />
                    </MobileStepDrawer>
                </>
            ) : (
                <>
                    <BlueprintHeader globalStats={globalStats} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-8">
                        <div className="lg:col-span-1">
                            <BlueprintSectionsList 
                                sections={sections}
                                selectedSectionId={selectedSectionId}
                                selectedStepId={selectedStepId}
                                onSelectSection={setSelectedSection}
                                onSelectStep={handleSelectStep}
                            />
                        </div>
                        <div className="lg:col-span-2 sticky top-8">
                            <BlueprintStepDetail 
                                step={selectedStep} 
                                onUpdateChecklist={updateChecklist} 
                            />
                        </div>
                    </div>
                </>
            )}
            
            <CelebrationToast 
                message={celebrationMessage}
                isVisible={showCelebration}
                onClose={handleCloseCelebration}
            />
            
            <style jsx>{`
                .step-completing {
                    animation: stepComplete 0.5s ease-out;
                }
                
                @keyframes stepComplete {
                    0% { transform: scale(1); opacity: 1; }
                    30% { transform: scale(1.03); opacity: 0.95; background-color: rgba(34, 197, 94, 0.15); }
                    60% { transform: scale(1.01); opacity: 0.98; background-color: rgba(34, 197, 94, 0.08); }
                    100% { transform: scale(1); opacity: 1; background-color: transparent; }
                }
                
                .section-completing {
                    animation: sectionComplete 1.2s ease-out;
                }
                
                @keyframes sectionComplete {
                    0% { transform: scale(1); box-shadow: 0 0 0 0px rgba(34, 197, 94, 0); }
                    20% { transform: scale(1.005); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.3); }
                    40% { transform: scale(1.002); box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.2); }
                    70% { transform: scale(1.001); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1); }
                    100% { transform: scale(1); box-shadow: 0 0 0 0px rgba(34, 197, 94, 0); }
                }
                
                .completed-check-icon {
                    animation: checkIconScale 0.3s ease-out;
                }
                
                @keyframes checkIconScale {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1.2); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
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