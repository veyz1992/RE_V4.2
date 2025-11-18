import React, { useState, useMemo, useEffect } from 'react';
import { KeyIcon, CheckIcon, ChevronDownIcon, ClipboardDocumentCheckIcon, Cog6ToothIcon, ClockIcon, XMarkIcon } from './icons';
import { useBlueprintAccess, useBlueprintProgress } from '../src/hooks';
import type { StepWithProgress, StepStatus } from '../src/hooks/useBlueprintProgress';

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

const TOTAL_STEPS = 99; // The blueprint is always out of 99 steps

// --- Sub-components for Blueprint ---

const BlueprintHeader: React.FC<{ completedCount: number }> = ({ completedCount }) => {
    const percentage = Math.round((completedCount / TOTAL_STEPS) * 100);
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
                    <p className="text-lg text-[var(--text-main)]"><span className="font-bold">{completedCount} of {TOTAL_STEPS}</span> steps completed – {percentage}%</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Mastery Level</p>
                    <p className="font-bold text-lg text-[var(--accent-dark)]">{getMasteryTitle()}</p>
                </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
                <div 
                    className="bg-[var(--accent)] h-4 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${displayPercentage}%` }}
                ></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <p>This week: <span className="font-bold">3</span> steps completed (demo)</p>
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
                                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-start gap-3 ${selectedStepId === step.id ? 'bg-[var(--accent-bg-subtle)] shadow-inner' : 'hover:bg-[var(--bg-subtle)]'}`}
                                        >
                                            <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-xs mt-0.5 ${step.status === 'completed' ? 'bg-[var(--accent)] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                {step.status === 'completed' ? <CheckIcon className="w-4 h-4"/> : index + 1}
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
    step: StepWithProgress | null;
    onUpdateStep: (stepId: string, newStatus: StepStatus) => void;
    onUpdateNote: (stepId: string, note: string) => void;
}> = ({ step, onUpdateStep, onUpdateNote }) => {
    const [note, setNote] = useState('');
    const [isUpdatingNote, setIsUpdatingNote] = useState(false);

    useEffect(() => {
        if(step) {
            setNote(step.note || '');
        }
    }, [step]);
    
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
            <p className="text-sm font-bold text-[var(--accent-dark)]">{step.category}</p>
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
    const { hasBlueprintAccess, loading, error } = useBlueprintAccess();
    const { stepsByCategory, progress, loading: progressLoading, setStatus, setNote } = useBlueprintProgress();
    const isMobile = useIsMobile();
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

    const allSteps = useMemo(() => [
        ...stepsByCategory.foundation,
        ...stepsByCategory.acceleration,
        ...stepsByCategory.empire_legacy,
    ], [stepsByCategory]);

    const completedCount = useMemo(() => allSteps.filter(s => s.status === 'completed').length, [allSteps]);

    const handleUpdateStep = async (stepId: string, newStatus: StepStatus) => {
        await setStatus(stepId, newStatus);
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

    const selectedStep = useMemo(() => allSteps.find(s => s.id === selectedStepId) || null, [allSteps, selectedStepId]);
    const isMobileDrawerOpen = isMobile && selectedStepId !== null;

    // Show loading state while checking access or loading progress
    if (loading || progressLoading) {
        return (
            <div className="animate-fade-in p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
                    <div className="text-lg text-[var(--text-muted)]">
                        {loading ? 'Checking your access...' : 'Loading your progress...'}
                    </div>
                </div>
            </div>
        );
    }

    // Show access wall if user doesn't have blueprint access
    if (!loading && !hasBlueprintAccess) {
        return (
            <div className="animate-fade-in p-8">
                <div className="max-w-2xl mx-auto text-center">
                    <KeyIcon className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-6" />
                    <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)] mb-4">
                        Unlock the 99 Steps Blueprint
                    </h1>
                    <p className="text-lg text-[var(--text-muted)] mb-8">
                        This roadmap is included in Founding Member and Gold memberships or as a standalone 99 Steps Blueprint add-on.
                    </p>
                    <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                        <button
                            onClick={() => onNavigate('billing')}
                            className="w-full sm:w-auto px-6 py-3 bg-[var(--accent)] text-white rounded-lg font-semibold hover:bg-[var(--accent-hover)] transition-colors duration-200"
                        >
                            Upgrade membership
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
                        <BlueprintHeader completedCount={completedCount} />
                    </div>
                    <MobileStepDrawer isOpen={isMobileDrawerOpen} onClose={handleCloseDrawer}>
                        <BlueprintStepDetail step={selectedStep} onUpdateStep={handleUpdateStep} onUpdateNote={handleUpdateNote} />
                    </MobileStepDrawer>
                </>
            ) : (
                <>
                    <BlueprintHeader completedCount={completedCount} />
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
        </div>
    );
};

export default MemberBlueprint;