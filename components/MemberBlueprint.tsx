import React, { useState, useMemo, useEffect, useRef } from 'react';
import { KeyIcon, CheckIcon, ChevronDownIcon, ClipboardDocumentCheckIcon, Cog6ToothIcon, ClockIcon, XMarkIcon } from './icons';
import { useBlueprintAccess, useBlueprintProgress, useBlueprintSteps } from '../src/hooks';
import type { StepWithProgress, StepStatus } from '../src/hooks/useBlueprintProgress';
import type { BlueprintStep } from '../src/data/blueprintSteps';
import { deriveStatusFromChecklist, getCheckedCount, isFirstStepCompletion, isSectionComplete } from '../src/utils/blueprintHelpers';

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

const TOTAL_STEPS = 99; // The blueprint is always out of 99 steps

// --- Sub-components for Blueprint ---

const BlueprintHeader: React.FC<{ completedCount: number; totalSteps?: number; progress?: number }> = ({ 
    completedCount, 
    totalSteps = TOTAL_STEPS, 
    progress 
}) => {
    const percentage = progress !== undefined ? progress : Math.round((completedCount / totalSteps) * 100);
    const [displayPercentage, setDisplayPercentage] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => setDisplayPercentage(percentage), 100);
        return () => clearTimeout(timeout);
    }, [percentage]);

    const getMasteryTitle = () => {
        if (percentage === 100) return "Blueprint Master";
        if (percentage >= 75) return "Restoration Leader";
        if (percentage >= 50) return "Trusted Operator";
        if (percentage >= 25) return "Emerging Pro";
        return "Getting Organized";
    };

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="font-playfair text-xl font-bold text-[var(--text-main)]">Your Progress</h2>
                    <p className="text-lg text-[var(--text-main)]"><span className="font-bold">{completedCount} of {totalSteps}</span> steps completed – {percentage}%</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Mastery Level</p>
                    <p className="font-bold text-lg text-[var(--accent-dark)]">{getMasteryTitle()}</p>
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

const BlueprintStepList: React.FC<{
    stepsByCategory: { foundation: StepWithProgress[]; acceleration: StepWithProgress[]; empire_legacy: StepWithProgress[] };
    selectedStepId: string | null;
    onSelectStep: (id: string) => void;
}> = ({ stepsByCategory, selectedStepId, onSelectStep }) => {
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ 'foundation': true });

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => ({...prev, [category]: !prev[category]}));
    };

    const statusColors: Record<StepStatus, string> = {
        'not_started': 'bg-gray-200 text-gray-600',
        'in_progress': 'bg-blue-100 text-blue-800',
        'completed': 'bg-green-100 text-green-800',
    };

    const categoryLabels = {
        foundation: 'Foundation',
        acceleration: 'Acceleration',
        empire_legacy: 'Empire Legacy',
    };

    return (
        <div className="space-y-6">
            {Object.entries(stepsByCategory).map(([category, categorySteps]) => {
                const completedInCategory = categorySteps.filter(s => s.status === 'completed').length;
                const categoryProgress = categorySteps.length > 0 ? (completedInCategory / categorySteps.length) * 100 : 0;

                return (
                    <Card key={category} className="p-0 overflow-hidden">
                        <button onClick={() => toggleCategory(category)} className="w-full p-4 flex justify-between items-center text-left">
                            <div>
                                <h3 className="font-playfair text-xl font-bold text-[var(--text-main)]">{categoryLabels[category as keyof typeof categoryLabels]}</h3>
                                <p className="text-sm text-[var(--text-muted)]">{completedInCategory} of {categorySteps.length} steps completed</p>
                            </div>
                            <ChevronDownIcon className={`w-6 h-6 text-[var(--text-muted)] transition-transform ${openCategories[category] ? 'rotate-180' : ''}`} />
                        </button>
                        {openCategories[category] && (
                            <div className="px-4 pb-4 animate-fade-in">
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                                    <div className="bg-[var(--accent)] h-1.5 rounded-full" style={{ width: `${categoryProgress}%` }}></div>
                                </div>
                                <div className="space-y-2">
                                    {categorySteps.map((step, index) => (
                                        <div
                                            key={step.id}
                                            onClick={() => onSelectStep(step.id)}
                                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-start gap-3 ${selectedStepId === step.id ? 'bg-[var(--accent-bg-subtle)] shadow-inner' : 'hover:bg-[var(--bg-subtle)]'} ${step.status === 'completed' ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-xs mt-0.5 transition-all duration-200 ${step.status === 'completed' ? 'bg-[var(--accent)] text-white scale-100' : 'bg-gray-200 text-gray-600'}`}>
                                                {step.status === 'completed' ? <CheckIcon className="w-4 h-4 animate-pulse"/> : index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-[var(--text-main)] leading-tight">{step.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                     <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusColors[step.status]}`}>{step.status.replace('_', ' ')}</span>
                                                </div>
                                                {step.note && (
                                                    <p className="text-xs text-[var(--text-muted)] mt-1 italic">Note: {step.note}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
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
    step: (StepWithProgress & BlueprintStep) | null;
    onUpdateStep: (stepId: string, newStatus: StepStatus) => void;
    onUpdateNote: (stepId: string, note: string) => void;
}> = ({ step, onUpdateStep, onUpdateNote }) => {
    const [note, setNote] = useState('');
    const [isUpdatingNote, setIsUpdatingNote] = useState(false);
    const [localChecklist, setLocalChecklist] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if(step) {
            setNote(step.note || '');
            // Initialize checklist state
            if (step.checklist) {
                const initialChecklist = step.checklist.reduce((acc, item) => ({
                    ...acc,
                    [item]: false
                }), {});
                setLocalChecklist(initialChecklist);
            }
        }
    }, [step]);

    const handleChecklistChange = async (item: string, checked: boolean) => {
        if (!step) return;

        // Update local checklist state
        const newChecklistState = { ...localChecklist, [item]: checked };
        setLocalChecklist(newChecklistState);

        // If step has checklist, derive status from checklist completion
        if (step.checklist && step.checklist.length > 0) {
            const checkedCount = getCheckedCount(newChecklistState);
            const newStatus = deriveStatusFromChecklist(checkedCount, step.checklist.length);
            
            // Only update if status actually changes
            if (newStatus !== step.status) {
                await onUpdateStep(step.id, newStatus);
            }
        }
    };
    
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
    
    const statusOptions: StepStatus[] = ['not_started', 'in_progress', 'completed'];

    const handleSaveNote = async () => {
        if (!step) return;
        setIsUpdatingNote(true);
        try {
            await onUpdateNote(step.id, note);
        } catch (error) {
            console.error('Failed to save note:', error);
        } finally {
            setIsUpdatingNote(false);
        }
    };

    return (
        <Card>
            <div className="flex items-center gap-2 mb-2">
                {step.section && (
                    <span className="text-sm font-bold text-[var(--accent-dark)]">{step.section}</span>
                )}
                <span className="text-sm font-bold text-[var(--text-muted)] capitalize">{step.category}</span>
            </div>
            <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mt-1">{step.title}</h2>
            {step.description && (
                <p className="text-[var(--text-muted)] mt-2">{step.description}</p>
            )}
            
            <div className="mt-6">
                <p className="text-sm font-semibold text-[var(--text-muted)] mb-2">Set status:</p>
                <div className="flex bg-[var(--bg-subtle)] p-1 rounded-lg">
                    {statusOptions.map(s => (
                        <button key={s} onClick={() => onUpdateStep(step.id, s)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${step.status === s ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:bg-white/50'}`}>
                            {s.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {step.why && (
                <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                    <h4 className="font-bold text-[var(--text-main)] mb-2">Why this matters</h4>
                    <p className="text-[var(--text-muted)] text-sm">{step.why}</p>
                </div>
            )}

            {step.checklist && step.checklist.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                    <h4 className="font-bold text-[var(--text-main)] mb-2">Checklist</h4>
                    <div className="space-y-2">
                        {step.checklist.map(item => (
                            <label key={item} className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--bg-subtle)] cursor-pointer transition-all duration-150">
                                <input 
                                    type="checkbox" 
                                    checked={localChecklist[item] || false} 
                                    onChange={e => handleChecklistChange(item, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)] transition-all duration-150"
                                />
                                <span className={`text-sm transition-all duration-150 ${localChecklist[item] ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>
                                    {item}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                <h4 className="font-bold text-[var(--text-main)] mb-2">My notes for this step</h4>
                <textarea 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    rows={4} 
                    className="w-full p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)] resize-none" 
                    placeholder="Add any personal notes, reminders, or links here..."
                ></textarea>
                <div className="text-right mt-2">
                    <button 
                        onClick={handleSaveNote}
                        disabled={isUpdatingNote}
                        className="py-2 px-4 bg-[var(--accent)] text-white font-bold text-sm rounded-lg shadow-sm hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                    >
                        {isUpdatingNote ? 'Saving...' : 'Save Note'}
                    </button>
                </div>
            </div>
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
    const { allSteps: blueprintSteps, stepsByCategory: staticSteps, totalSteps, getStepById } = useBlueprintSteps();
    const { stepsByCategory, progress, loading: progressLoading, setStatus, setNote } = useBlueprintProgress();
    const isMobile = useIsMobile();
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [celebrationMessage, setCelebrationMessage] = useState<string>('');
    const [showCelebration, setShowCelebration] = useState(false);
    const prevCompletedCountRef = useRef<number>(0);
    const prevSectionCompletionRef = useRef<Record<string, boolean>>({ foundation: false, acceleration: false, empire_legacy: false });

    const completedCount = useMemo(() => {
        const allProgressSteps = [
            ...stepsByCategory.foundation,
            ...stepsByCategory.acceleration,
            ...stepsByCategory.empire_legacy,
        ];
        return allProgressSteps.filter(s => s.status === 'completed').length;
    }, [stepsByCategory]);

    // Track section completion for celebrations
    const sectionCompletion = useMemo(() => {
        return {
            foundation: stepsByCategory.foundation.length > 0 && stepsByCategory.foundation.every(s => s.status === 'completed'),
            acceleration: stepsByCategory.acceleration.length > 0 && stepsByCategory.acceleration.every(s => s.status === 'completed'),
            empire_legacy: stepsByCategory.empire_legacy.length > 0 && stepsByCategory.empire_legacy.every(s => s.status === 'completed'),
        };
    }, [stepsByCategory]);

    // Handle celebrations for milestones
    useEffect(() => {
        if (progressLoading) return;

        const prevCount = prevCompletedCountRef.current;
        const currentCount = completedCount;
        
        // Check for first step completion
        if (isFirstStepCompletion(prevCount, currentCount)) {
            setCelebrationMessage('🎉 Great start! You completed your first step!');
            setShowCelebration(true);
        }
        // Check for section completion
        else {
            const prevSections = prevSectionCompletionRef.current;
            const sections = ['foundation', 'acceleration', 'empire_legacy'] as const;
            
            for (const section of sections) {
                if (!prevSections[section] && sectionCompletion[section]) {
                    const sectionLabels = { foundation: 'Foundation', acceleration: 'Acceleration', empire_legacy: 'Empire Legacy' };
                    setCelebrationMessage(`🏆 Amazing! You completed ${sectionLabels[section]}!`);
                    setShowCelebration(true);
                    break;
                }
            }
        }
        
        prevCompletedCountRef.current = currentCount;
        prevSectionCompletionRef.current = sectionCompletion;
    }, [completedCount, sectionCompletion, progressLoading]);

    const handleUpdateStep = async (stepId: string, newStatus: StepStatus) => {
        // Track previous state for celebrations
        const prevCount = completedCount;
        const allSteps = [...stepsByCategory.foundation, ...stepsByCategory.acceleration, ...stepsByCategory.empire_legacy];
        const stepCategory = allSteps.find(s => s.id === stepId)?.category;
        
        await setStatus(stepId, newStatus);
        
        // Check for section completion after status update
        if (newStatus === 'completed' && stepCategory) {
            const categorySteps = stepsByCategory[stepCategory as keyof typeof stepsByCategory];
            if (isSectionComplete(categorySteps, stepId, newStatus)) {
                // Section completion celebration will be handled by useEffect
            }
        }
    };

    const handleCloseCelebration = () => {
        setShowCelebration(false);
        setCelebrationMessage('');
    };

    const handleUpdateNote = async (stepId: string, noteText: string) => {
        await setNote(stepId, noteText);
    };

    const handleSelectStep = (id: string) => {
        setSelectedStepId(id);
    };

    const handleCloseDrawer = () => {
        setSelectedStepId(null);
    };

    // Get selected step with progress data merged with static data
    const selectedStep = useMemo(() => {
        if (!selectedStepId) return null;
        
        const progressStep = [...stepsByCategory.foundation, ...stepsByCategory.acceleration, ...stepsByCategory.empire_legacy]
            .find(s => s.id === selectedStepId);
        const staticStep = getStepById(selectedStepId);
        
        if (progressStep && staticStep) {
            return {
                ...staticStep,
                status: progressStep.status,
                note: progressStep.note,
            };
        }
        return null;
    }, [selectedStepId, stepsByCategory, getStepById]);

    const isMobileDrawerOpen = isMobile && selectedStepId !== null;

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

    // Show loading state if progress is loading
    if (progressLoading) {
        return (
            <div className="animate-fade-in p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
                    <div className="text-lg text-[var(--text-muted)]">Loading your progress...</div>
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
                    <BlueprintStepList 
                        stepsByCategory={stepsByCategory}
                        selectedStepId={selectedStepId}
                        onSelectStep={handleSelectStep}
                    />
                    <div className="mt-8">
                        <BlueprintHeader completedCount={completedCount} totalSteps={totalSteps} progress={progress} />
                    </div>
                    <MobileStepDrawer isOpen={isMobileDrawerOpen} onClose={handleCloseDrawer}>
                        <BlueprintStepDetail step={selectedStep} onUpdateStep={handleUpdateStep} onUpdateNote={handleUpdateNote} />
                    </MobileStepDrawer>
                </>
            ) : (
                <>
                    <BlueprintHeader completedCount={completedCount} totalSteps={totalSteps} progress={progress} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-8">
                        <div className="lg:col-span-1">
                            <BlueprintStepList 
                                stepsByCategory={stepsByCategory}
                                selectedStepId={selectedStepId}
                                onSelectStep={handleSelectStep}
                            />
                        </div>
                        <div className="lg:col-span-2 sticky top-8">
                            <BlueprintStepDetail step={selectedStep} onUpdateStep={handleUpdateStep} onUpdateNote={handleUpdateNote} />
                        </div>
                    </div>
                </>
            )}
            
            <CelebrationToast 
                message={celebrationMessage}
                isVisible={showCelebration}
                onClose={handleCloseCelebration}
            />
        </div>
    );
};

export default MemberBlueprint;