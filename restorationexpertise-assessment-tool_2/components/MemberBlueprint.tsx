import React, { useState, useMemo, useEffect } from 'react';
import { KeyIcon, CheckIcon, ChevronDownIcon, ClipboardDocumentCheckIcon, Cog6ToothIcon, ClockIcon, XMarkIcon } from './icons';
import { BLUEPRINT_STEPS, BlueprintStep, StepStatus } from '../lib/mockData';

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
    groupedSteps: Record<string, Record<string, BlueprintStep[]>>;
    steps: BlueprintStep[];
    selectedStepId: number | null;
    onSelectStep: (id: number) => void;
}> = ({ groupedSteps, steps, selectedStepId, onSelectStep }) => {
    const [openLevels, setOpenLevels] = useState<Record<string, boolean>>({ 'Foundation': true });

    const toggleLevel = (level: string) => {
        setOpenLevels(prev => ({...prev, [level]: !prev[level]}));
    };

    const statusColors: Record<StepStatus, string> = {
        'not_started': 'bg-gray-200 text-gray-dark',
        'in_progress': 'bg-info/20 text-blue-800',
        'completed': 'bg-success/20 text-green-800',
    };

    const effortColors: Record<BlueprintStep['effort'], string> = {
        'Quick win': 'border-gold text-gold-dark',
        'Deep work': 'border-charcoal text-charcoal',
    };

    return (
        <div className="space-y-6">
            {Object.entries(groupedSteps).map(([level, chapters]) => {
                const levelSteps = steps.filter(s => s.level === level);
                const completedInLevel = levelSteps.filter(s => s.status === 'completed').length;
                const levelProgress = levelSteps.length > 0 ? (completedInLevel / levelSteps.length) * 100 : 0;

                return (
                    <Card key={level} className="p-0 overflow-hidden">
                        <button onClick={() => toggleLevel(level)} className="w-full p-4 flex justify-between items-center text-left">
                            <div>
                                <h3 className="font-playfair text-xl font-bold text-[var(--text-main)]">{level}</h3>
                                <p className="text-sm text-[var(--text-muted)]">{completedInLevel} of {levelSteps.length} steps completed</p>
                            </div>
                            <ChevronDownIcon className={`w-6 h-6 text-[var(--text-muted)] transition-transform ${openLevels[level] ? 'rotate-180' : ''}`} />
                        </button>
                        {openLevels[level] && (
                            <div className="px-4 pb-4 animate-fade-in">
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                                    <div className="bg-[var(--accent)] h-1.5 rounded-full" style={{ width: `${levelProgress}%` }}></div>
                                </div>
                                {Object.entries(chapters).map(([chapter, chapterSteps]) => (
                                    <div key={chapter} className="mb-4">
                                        <h4 className="font-bold text-sm uppercase text-[var(--text-muted)] tracking-wider pb-1 mb-2 border-b border-[var(--border-subtle)]">{chapter}</h4>
                                        <div className="space-y-2">
                                            {chapterSteps.map(step => (
                                                <div
                                                    key={step.id}
                                                    onClick={() => onSelectStep(step.id)}
                                                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 flex items-start gap-3 ${selectedStepId === step.id ? 'bg-[var(--accent-bg-subtle)] shadow-inner' : 'hover:bg-[var(--bg-subtle)]'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-xs mt-0.5 ${step.status === 'completed' ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-gray-200 text-gray-dark'}`}>
                                                        {step.status === 'completed' ? <CheckIcon className="w-4 h-4"/> : step.id}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-[var(--text-main)] leading-tight">{step.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                             <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${statusColors[step.status]}`}>{step.status.replace('_', ' ')}</span>
                                                             <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${effortColors[step.effort]}`}>{step.effort}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};

const BlueprintStepDetail: React.FC<{
    step: BlueprintStep | null;
    onUpdateStep: (stepId: number, newStatus: StepStatus) => void;
}> = ({ step, onUpdateStep }) => {
    const [note, setNote] = useState('');
    const [checklist, setChecklist] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if(step) {
            setNote(''); // Reset notes for demo
            const initialChecklist = step.details.checklist.reduce((acc, item) => ({...acc, [item.text]: false}), {});
            setChecklist(initialChecklist);
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

    return (
        <Card>
            <p className="text-sm font-bold text-[var(--accent-dark)]">{step.level} / {step.chapter}</p>
            <h2 className="font-playfair text-3xl font-bold text-[var(--text-main)] mt-1">Step {step.id}: {step.title}</h2>
            
            <div className="mt-6">
                <p className="text-sm font-semibold text-[var(--text-muted)] mb-2">Set status:</p>
                <div className="flex bg-[var(--bg-subtle)] p-1 rounded-lg">
                    {statusOptions.map(s => (
                        <button key={s} onClick={() => onUpdateStep(step.id, s)} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${step.status === s ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm' : 'text-[var(--text-muted)] hover:bg-white/50'}`}>
                            {s.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                <h4 className="font-bold text-[var(--text-main)] mb-2">Why this matters</h4>
                <p className="text-[var(--text-muted)] text-sm">{step.details.why}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                <h4 className="font-bold text-[var(--text-main)] mb-2">Checklist</h4>
                <div className="space-y-2">
                    {step.details.checklist.map(item => (
                         <label key={item.text} className="flex items-center gap-3 p-2 rounded-md hover:bg-[var(--bg-subtle)]">
                            <input type="checkbox" checked={checklist[item.text] || false} onChange={e => setChecklist({...checklist, [item.text]: e.target.checked})} className="h-5 w-5 rounded border-gray-300 text-[var(--accent)] focus:ring-[var(--accent)]"/>
                            <span className={`text-sm ${checklist[item.text] ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>{item.text}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                <h4 className="font-bold text-[var(--text-main)] mb-2">My notes for this step</h4>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={4} className="w-full p-2 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-input)] focus:ring-[var(--accent)] focus:border-[var(--accent)]" placeholder="Add any personal notes, reminders, or links here..."></textarea>
                <div className="text-right mt-2">
                    <button className="py-2 px-4 bg-[var(--accent)] text-[var(--accent-text)] font-bold text-sm rounded-lg shadow-sm">Save Note</button>
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
    const isMobile = useIsMobile();
    const [steps, setSteps] = useState<BlueprintStep[]>(BLUEPRINT_STEPS);
    const [selectedStepId, setSelectedStepId] = useState<number | null>(null);

    const completedCount = useMemo(() => steps.filter(s => s.status === 'completed').length, [steps]);

    const groupedSteps = useMemo(() => {
        return steps.reduce((acc, step) => {
            if (!acc[step.level]) acc[step.level] = {};
            if (!acc[step.level][step.chapter]) acc[step.level][step.chapter] = [];
            acc[step.level][step.chapter].push(step);
            return acc;
        }, {} as Record<string, Record<string, BlueprintStep[]>>);
    }, [steps]);

    const handleUpdateStep = (stepId: number, newStatus: StepStatus) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: newStatus } : s));
    };

    const handleSelectStep = (id: number) => {
        setSelectedStepId(id);
    };

    const handleCloseDrawer = () => {
        setSelectedStepId(null);
    };

    const selectedStep = useMemo(() => steps.find(s => s.id === selectedStepId) || null, [steps, selectedStepId]);
    const isMobileDrawerOpen = isMobile && selectedStepId !== null;

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <h1 className="font-playfair text-4xl font-bold text-[var(--text-main)]">99 Steps Blueprint</h1>
                <p className="mt-2 text-lg text-[var(--text-muted)]">Your step-by-step roadmap to building a dominant restoration business.</p>
            </div>

            {isMobile ? (
                <>
                    <BlueprintStepList 
                        groupedSteps={groupedSteps} 
                        steps={steps}
                        selectedStepId={selectedStepId}
                        onSelectStep={handleSelectStep}
                    />
                    <div className="mt-8">
                        <BlueprintHeader completedCount={completedCount} />
                    </div>
                    <MobileStepDrawer isOpen={isMobileDrawerOpen} onClose={handleCloseDrawer}>
                        <BlueprintStepDetail step={selectedStep} onUpdateStep={handleUpdateStep} />
                    </MobileStepDrawer>
                </>
            ) : (
                <>
                    <BlueprintHeader completedCount={completedCount} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-8">
                        <div className="lg:col-span-1">
                            <BlueprintStepList 
                                groupedSteps={groupedSteps} 
                                steps={steps}
                                selectedStepId={selectedStepId}
                                onSelectStep={handleSelectStep}
                            />
                        </div>
                        <div className="lg:col-span-2 sticky top-8">
                            <BlueprintStepDetail step={selectedStep} onUpdateStep={handleUpdateStep} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MemberBlueprint;