import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

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

export interface StepWithProgress extends BlueprintStep {
  status: StepStatus;
  checklistState: boolean[];
}

export interface SectionWithSteps extends BlueprintSection {
  steps: StepWithProgress[];
}

interface BlueprintDataState {
  sections: SectionWithSteps[];
  selectedSectionId: string | null;
  selectedStepId: string | null;
  loading: boolean;
  error?: string;
}

// Derive status from checklist state
const deriveStatusFromChecklist = (checklistState: boolean[]): StepStatus => {
  if (checklistState.length === 0) return 'not_started';
  
  const checkedCount = checklistState.filter(Boolean).length;
  
  if (checkedCount === 0) return 'not_started';
  if (checkedCount === checklistState.length) return 'completed';
  return 'in_progress';
};

export const useBlueprintData = () => {
  const { session } = useAuth();
  const [state, setState] = useState<BlueprintDataState>({
    sections: [],
    selectedSectionId: null,
    selectedStepId: null,
    loading: false,
    error: undefined,
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

        // Merge data and organize by sections
        const sectionsWithSteps: SectionWithSteps[] = (sectionsData || []).map(section => {
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

              // Derive status from checklist if checklist exists, otherwise use stored status
              const derivedStatus = checklist.length > 0 
                ? deriveStatusFromChecklist(normalizedChecklistState)
                : (progress?.status || 'not_started');

              return {
                ...step,
                status: derivedStatus,
                checklistState: normalizedChecklistState,
              } as StepWithProgress;
            });

          return {
            ...section,
            steps: sectionSteps,
          };
        });

        if (isMounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            sections: sectionsWithSteps,
            // Auto-select first section if none selected
            selectedSectionId: prev.selectedSectionId || (sectionsWithSteps[0]?.id || null),
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

    try {
      // Derive new status
      const newStatus = deriveStatusFromChecklist(newChecklistState);

      // Optimistically update local state
      setState(prev => {
        const updatedSections = prev.sections.map(section => ({
          ...section,
          steps: section.steps.map(step => 
            step.id === stepId 
              ? { ...step, checklistState: newChecklistState, status: newStatus }
              : step
          ),
        }));

        return {
          ...prev,
          sections: updatedSections,
        };
      });

      // Upsert to database
      const { error } = await supabase
        .from('blueprint_progress')
        .upsert({
          profile_id: session.user.id,
          step_id: stepId,
          status: newStatus,
          checklist_state: newChecklistState,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update checklist:', error);
      // TODO: Consider reverting optimistic update on error
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
  };
};