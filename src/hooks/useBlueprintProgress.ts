import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { updateBlueprintProgress, type BlueprintStatus } from '../lib/updateBlueprintProgress';
// Note: This hook is deprecated in favor of useBlueprintData for the data-driven system

export type StepStatus = 'not_started' | 'in_progress' | 'completed';

export interface StepWithProgress {
  id: string;
  category: 'foundation' | 'acceleration' | 'empire_legacy';
  title: string;
  description?: string;
  status: StepStatus;
  note: string;
  checklist_data?: Record<string, boolean>;
}

interface BlueprintProgressState {
  stepsByCategory: {
    foundation: StepWithProgress[];
    acceleration: StepWithProgress[];
    empire_legacy: StepWithProgress[];
  };
  progress: number;
  loading: boolean;
  error?: string;
}

interface ProgressRow {
  step_id: string;
  status: StepStatus;
  note: string | null;
  checklist_data: Record<string, boolean> | null;
  profile_id: string;
}

export const useBlueprintProgress = () => {
  const { session } = useAuth();
  const [state, setState] = useState<BlueprintProgressState>({
    stepsByCategory: { foundation: [], acceleration: [], empire_legacy: [] },
    progress: 0,
    loading: false,
    error: undefined,
  });

  // Load progress data from database
  useEffect(() => {
    if (!session?.user?.id) {
      // No user session, return empty state for data-driven system
      const defaultSteps = {
        foundation: [],
        acceleration: [],
        empire_legacy: [],
      };
      
      setState({
        stepsByCategory: defaultSteps,
        progress: 0,
        loading: false,
        error: undefined,
      });
      return;
    }

    let isMounted = true;
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    const loadProgress = async () => {
      try {
        const { data: progressData, error: progressError } = await supabase
          .from('blueprint_progress')
          .select('step_id, status, note, checklist_data, profile_id')
          .eq('profile_id', session.user.id);

        if (progressError) {
          throw progressError;
        }

        // Create a map of progress data for quick lookup
        const progressMap = new Map<string, ProgressRow>();
        (progressData || []).forEach((row: any) => {
          progressMap.set(row.step_id, row as ProgressRow);
        });

        // Return empty state - use useBlueprintData for the data-driven system
        const foundation: StepWithProgress[] = [];
        const acceleration: StepWithProgress[] = [];
        const empire_legacy: StepWithProgress[] = [];
        const progressPercentage = 0;

        if (isMounted) {
          setState({
            stepsByCategory: { foundation, acceleration, empire_legacy },
            progress: progressPercentage,
            loading: false,
            error: undefined,
          });
        }
      } catch (error) {
        console.error('Failed to load blueprint progress:', error);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to load progress',
          }));
        }
      }
    };

    void loadProgress();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  const setStatus = async (stepId: string, newStatus: StepStatus) => {
    if (!session?.user?.id) {
      console.warn('No user session available');
      return;
    }

    try {
      // Optimistically update local state
      setState(prev => {
        const updatedStepsByCategory = { ...prev.stepsByCategory };
        
        // Find and update the step in the appropriate category
        for (const category of Object.keys(updatedStepsByCategory) as Array<keyof typeof updatedStepsByCategory>) {
          const categorySteps = [...updatedStepsByCategory[category]];
          const stepIndex = categorySteps.findIndex(step => step.id === stepId);
          
          if (stepIndex !== -1) {
            categorySteps[stepIndex] = { ...categorySteps[stepIndex], status: newStatus };
            updatedStepsByCategory[category] = categorySteps;
            break;
          }
        }

        // Recalculate progress
        const allSteps = [
          ...updatedStepsByCategory.foundation,
          ...updatedStepsByCategory.acceleration,
          ...updatedStepsByCategory.empire_legacy,
        ];
        const completedSteps = allSteps.filter(step => step.status === 'completed').length;
        const progressPercentage = Math.round((completedSteps / allSteps.length) * 100);

        return {
          ...prev,
          stepsByCategory: updatedStepsByCategory,
          progress: progressPercentage,
        };
      });

      // Update database
      await updateBlueprintProgress({
        profileId: session.user.id,
        stepId: stepId,
        status: newStatus as BlueprintStatus,
      });
    } catch (error) {
      console.error('Failed to update step status:', error);
      // TODO: Consider reverting optimistic update on error
    }
  };

  const setNote = async (stepId: string, noteText: string) => {
    if (!session?.user?.id) {
      console.warn('No user session available');
      return;
    }

    try {
      // Optimistically update local state
      setState(prev => {
        const updatedStepsByCategory = { ...prev.stepsByCategory };
        
        // Find and update the step in the appropriate category
        for (const category of Object.keys(updatedStepsByCategory) as Array<keyof typeof updatedStepsByCategory>) {
          const categorySteps = [...updatedStepsByCategory[category]];
          const stepIndex = categorySteps.findIndex(step => step.id === stepId);
          
          if (stepIndex !== -1) {
            categorySteps[stepIndex] = { ...categorySteps[stepIndex], note: noteText };
            updatedStepsByCategory[category] = categorySteps;
            break;
          }
        }

        return {
          ...prev,
          stepsByCategory: updatedStepsByCategory,
        };
      });

      // Update database
      await updateBlueprintProgress({
        profileId: session.user.id,
        stepId: stepId,
        note: noteText,
      });
    } catch (error) {
      console.error('Failed to update step note:', error);
      // TODO: Consider reverting optimistic update on error
    }
  };

  const setChecklistData = async (stepId: string, checklistData: Record<string, boolean>) => {
    if (!session?.user?.id) {
      console.warn('No user session available');
      return;
    }

    try {
      // Optimistically update local state
      setState(prev => {
        const updatedStepsByCategory = { ...prev.stepsByCategory };
        
        // Find and update the step in the appropriate category
        for (const category of Object.keys(updatedStepsByCategory) as Array<keyof typeof updatedStepsByCategory>) {
          const categorySteps = [...updatedStepsByCategory[category]];
          const stepIndex = categorySteps.findIndex(step => step.id === stepId);
          
          if (stepIndex !== -1) {
            categorySteps[stepIndex] = { ...categorySteps[stepIndex], checklist_data: checklistData };
            updatedStepsByCategory[category] = categorySteps;
            break;
          }
        }

        return {
          ...prev,
          stepsByCategory: updatedStepsByCategory,
        };
      });

      // Update database
      await updateBlueprintProgress({
        profileId: session.user.id,
        stepId: stepId,
        checklistData: checklistData,
      });
    } catch (error) {
      console.error('Failed to update checklist data:', error);
      // TODO: Consider reverting optimistic update on error
    }
  };

  return {
    ...state,
    setStatus,
    setNote,
    setChecklistData,
  };
};