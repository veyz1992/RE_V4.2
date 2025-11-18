import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { updateBlueprintProgress, type BlueprintStatus } from '../lib/updateBlueprintProgress';

export type StepStatus = 'not_started' | 'in_progress' | 'completed';

export interface BlueprintSection {
  id: string;
  key: string;
  name: string;
  description?: string;
  sort_order: number;
}

export interface BlueprintStep {
  id: string;
  section_id: string;
  step_number: number;
  title: string;
  why_it_matters?: string;
  description?: string;
  checklist: string[];
  sort_order: number;
}

export interface BlueprintProgress {
  id?: string;
  profile_id: string;
  step_id: string;
  status: StepStatus;
  checklist_state: boolean[];
  created_at?: string;
  updated_at?: string;
}

export interface StepWithProgress extends BlueprintStep {
  status: StepStatus;
  checklistState: boolean[];
}

export interface SectionWithStats extends BlueprintSection {
  steps: StepWithProgress[];
  totalSteps: number;
  completedSteps: number;
  completionRate: number; // percentage 0-100
}

export interface SectionWithSteps extends BlueprintSection {
  steps: StepWithProgress[];
}

interface BlueprintDataState {
  sections: SectionWithStats[];
  selectedSectionId: string | null;
  selectedStepId: string | null;
  loading: boolean;
  error?: string;
  completedStepAnimations: Set<string>;
  completedSectionAnimations: Set<string>;
  globalStats: {
    totalSteps: number;
    completedSteps: number;
    completionPercent: number;
    masteryLevel: string;
  };
  previousStepStatuses: Map<string, StepStatus>;
  isInitialLoad: boolean;
}

// Derive status from checklist state (needed for RPC call)
function deriveStatus(values: boolean[]): BlueprintStatus {
  const anyTrue = values.some(Boolean);
  const allTrue = values.length > 0 && values.every(Boolean);

  if (!anyTrue) return 'not_started';
  if (allTrue) return 'completed';
  return 'in_progress';
}

// Legacy alias for backward compatibility
const deriveStatusFromChecklist = deriveStatus;

// Calculate mastery level from completion percentage
const getMasteryLevel = (completionPercent: number): string => {
  if (completionPercent === 100) return 'Restoration Elite';
  if (completionPercent >= 75) return 'Dominating Your Market';
  if (completionPercent >= 50) return 'Scaling Up';
  if (completionPercent >= 25) return 'Building Momentum';
  return 'Getting Organized';
};

// Calculate global and section stats
const calculateStats = (sections: SectionWithStats[]) => {
  const allSteps = sections.flatMap(section => section.steps);
  const totalSteps = allSteps.length;
  const completedSteps = allSteps.filter(step => step.status === 'completed').length;
  const completionPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  
  return {
    totalSteps,
    completedSteps,
    completionPercent,
    masteryLevel: getMasteryLevel(completionPercent),
  };
};

// Function to trigger step completion animation
const triggerStepCompletionAnimation = (stepId: string) => {
  const stepElement = document.querySelector(`[data-step-id="${stepId}"]`);
  if (stepElement) {
    stepElement.classList.add('step-completing');
    setTimeout(() => {
      stepElement.classList.remove('step-completing');
    }, 300);
  }
};

// Function to trigger section completion animation
const triggerSectionCompletionAnimation = (sectionId: string) => {
  const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (sectionElement) {
    // Animate the section header
    const sectionHeader = sectionElement.querySelector('button');
    if (sectionHeader) {
      sectionHeader.classList.add('section-completing');
      setTimeout(() => {
        sectionHeader.classList.remove('section-completing');
      }, 600);
    }

    // Add completion badge
    const sectionTitle = sectionElement.querySelector('h3');
    if (sectionTitle && !sectionTitle.querySelector('.section-complete-badge')) {
      const badge = document.createElement('span');
      badge.className = 'section-complete-badge ml-2 px-2 py-1 text-xs font-bold bg-green-500 text-white rounded-full opacity-0';
      badge.textContent = 'Section completed!';
      sectionTitle.appendChild(badge);
      
      // Animate badge in
      setTimeout(() => {
        badge.classList.remove('opacity-0');
        badge.classList.add('animate-fade-in');
      }, 200);
      
      // Remove badge after delay
      setTimeout(() => {
        if (badge.parentNode) {
          badge.remove();
        }
      }, 3000);
    }
  }
};

export const useBlueprintData = () => {
  const { session } = useAuth();
  const [state, setState] = useState<BlueprintDataState>({
    sections: [],
    selectedSectionId: null,
    selectedStepId: null,
    loading: false,
    error: undefined,
    completedStepAnimations: new Set(),
    completedSectionAnimations: new Set(),
    globalStats: {
      totalSteps: 0,
      completedSteps: 0,
      completionPercent: 0,
      masteryLevel: 'Getting Organized',
    },
    previousStepStatuses: new Map(),
    isInitialLoad: true,
  });

  // Load sections, steps, and progress data
  useEffect(() => {
    if (!session?.user?.id) {
      setState(prev => ({ ...prev, loading: false, sections: [] }));
      return;
    }

    let isMounted = true;
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    const loadBlueprintData = async () => {
      try {
        // Load sections
        const { data: sectionsData, error: sectionsError } = await supabase
          .from('blueprint_sections')
          .select('*')
          .order('sort_order');

        if (sectionsError) throw sectionsError;

        if (!sectionsData || sectionsData.length === 0) {
          if (isMounted) {
            setState(prev => ({
              ...prev,
              loading: false,
              sections: [],
            }));
          }
          return;
        }

        // Load all steps
        const { data: stepsData, error: stepsError } = await supabase
          .from('blueprint_steps')
          .select('*')
          .order('step_number');

        if (stepsError) throw stepsError;

        // Load user progress
        const { data: progressData, error: progressError } = await supabase
          .from('blueprint_progress')
          .select('step_id, status, checklist_state')
          .eq('profile_id', session.user.id);

        if (progressError) throw progressError;

        // Create progress map for quick lookup
        const progressMap = new Map();
        (progressData || []).forEach((row: any) => {
          progressMap.set(row.step_id, {
            status: row.status,
            checklistState: row.checklist_state || [],
          });
        });

        // Merge data and organize by sections with statistics
        const sectionsWithStats: SectionWithStats[] = (sectionsData || []).map(section => {
          const sectionSteps = (stepsData || [])
            .filter(step => step.section_id === section.id)
            .map(step => {
              const progress = progressMap.get(step.id);
              const checklist = step.checklist || [];
              const checklistState = progress?.checklistState || Array(checklist.length).fill(false);
              
              // Ensure checklist state array matches checklist length
              const normalizedChecklistState = checklist.map((_, index) => 
                checklistState[index] || false
              );

              // Derive status from checklist state - this is the single source of truth
              const derivedStatus = deriveStatusFromChecklist(normalizedChecklistState);

              return {
                ...step,
                status: derivedStatus,
                checklistState: normalizedChecklistState,
              } as StepWithProgress;
            });

          // Calculate section statistics
          const totalSteps = sectionSteps.length;
          const completedSteps = sectionSteps.filter(step => step.status === 'completed').length;
          const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

          return {
            ...section,
            steps: sectionSteps,
            totalSteps,
            completedSteps,
            completionRate,
          };
        });

        // Calculate global statistics
        const globalStats = calculateStats(sectionsWithStats);

        if (isMounted) {
          // Create a map of step statuses for initial load
          const initialStepStatuses = new Map<string, StepStatus>();
          sectionsWithStats.forEach(section => {
            section.steps.forEach(step => {
              initialStepStatuses.set(step.id, step.status);
            });
          });

          setState(prev => ({
            ...prev,
            loading: false,
            sections: sectionsWithStats,
            globalStats,
            previousStepStatuses: initialStepStatuses,
            isInitialLoad: false, // Mark that initial load is complete
            // Auto-select first section if none selected
            selectedSectionId: prev.selectedSectionId || (sectionsWithStats[0]?.id || null),
          }));
        }
      } catch (error) {
        console.error('Failed to load blueprint data:', error);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to load blueprint data',
          }));
        }
      }
    };

    void loadBlueprintData();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  const updateChecklist = async (stepId: string, newChecklistState: boolean[]) => {
    if (!session?.user?.id) {
      console.warn('No user session available');
      return;
    }

    // Find the current step
    const currentStep = state.sections
      .flatMap(s => s.steps)
      .find(s => s.id === stepId);
    
    if (!currentStep) {
      console.warn('Step not found:', stepId);
      return;
    }

    // Store previous state for rollback and animation detection
    const prevStatus = currentStep.status;
    const prevChecklistState = [...currentStep.checklistState];
    
    // Derive the new status from the new checklist state
    const newStatus = deriveStatus(newChecklistState);

    try {
      // Optimistic update of local state (so the checkbox feels instant)
      setState(prev => {
        const updatedSections = prev.sections.map(section => {
          const updatedSteps = section.steps.map(step => 
            step.id === stepId 
              ? { ...step, checklistState: newChecklistState, status: newStatus }
              : step
          );

          // Recalculate section statistics
          const totalSteps = updatedSteps.length;
          const completedSteps = updatedSteps.filter(step => step.status === 'completed').length;
          const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

          return {
            ...section,
            steps: updatedSteps,
            totalSteps,
            completedSteps,
            completionRate,
          };
        });

        // Recalculate global statistics
        const globalStats = calculateStats(updatedSections);

        // Update previous step statuses map
        const updatedStepStatuses = new Map(prev.previousStepStatuses);
        updatedStepStatuses.set(stepId, newStatus);

        return {
          ...prev,
          sections: updatedSections,
          globalStats,
          previousStepStatuses: updatedStepStatuses,
        };
      });

      // Call the helper function which will upsert to the existing row
      await updateBlueprintProgress({
        profileId: session.user.id,
        stepId: stepId,
        checklistState: newChecklistState,
        status: newStatus,
      });

      // Trigger step completion animation only if step transitioned to completed (not on initial load)
      if (!state.isInitialLoad && (prevStatus === 'not_started' || prevStatus === 'in_progress') && newStatus === 'completed') {
        triggerStepCompletionAnimation(stepId);
      }

      // Check for section completion and trigger animation
      if (!state.isInitialLoad) {
        const currentSection = state.sections.find(s => s.steps.some(step => step.id === stepId));
        if (currentSection) {
          // Check if this step completion makes the entire section complete
          const wasLastIncompleteStep = prevStatus !== 'completed' && newStatus === 'completed';
          const allOtherStepsComplete = currentSection.steps
            .filter(step => step.id !== stepId)
            .every(step => step.status === 'completed');
          
          if (wasLastIncompleteStep && allOtherStepsComplete && !state.completedSectionAnimations.has(currentSection.id)) {
            triggerSectionCompletionAnimation(currentSection.id);
            setState(prev => ({
              ...prev,
              completedSectionAnimations: new Set([...prev.completedSectionAnimations, currentSection.id])
            }));
          }
        }
      }

    } catch (error) {
      console.error('Failed to update checklist:', error);
      
      // Roll back the optimistic state to the previous values on error
      setState(prev => {
        const revertedSections = prev.sections.map(section => {
          const revertedSteps = section.steps.map(step => 
            step.id === stepId
              ? { ...step, checklistState: prevChecklistState, status: prevStatus }
              : step
          );

          // Recalculate section statistics after revert
          const totalSteps = revertedSteps.length;
          const completedSteps = revertedSteps.filter(step => step.status === 'completed').length;
          const completionRate = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

          return {
            ...section,
            steps: revertedSteps,
            totalSteps,
            completedSteps,
            completionRate,
          };
        });

        // Recalculate global statistics after revert
        const globalStats = calculateStats(revertedSections);

        return {
          ...prev,
          sections: revertedSections,
          globalStats,
        };
      });

      // Show user-friendly error message without crashing the app
      console.warn('Checklist update failed. Your changes have been reverted.');
    }
  };

  const setSelectedSection = (sectionId: string) => {
    setState(prev => ({
      ...prev,
      selectedSectionId: sectionId,
      selectedStepId: null, // Clear step selection when changing sections
    }));
  };

  const setSelectedStep = (stepId: string) => {
    setState(prev => ({
      ...prev,
      selectedStepId: stepId,
    }));
  };

  // Get selected section
  const selectedSection = state.sections.find(s => s.id === state.selectedSectionId) || null;

  // Get selected step
  const selectedStep = selectedSection?.steps.find(s => s.id === state.selectedStepId) || null;

  return {
    ...state,
    selectedSection,
    selectedStep,
    updateChecklist,
    setSelectedSection,
    setSelectedStep,
    triggerStepCompletionAnimation,
    triggerSectionCompletionAnimation,
  };
};