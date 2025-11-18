import type { StepStatus } from '../hooks/useBlueprintProgress';

/**
 * Derives the step status based on checklist completion
 * @param checkedCount Number of checked items
 * @param totalCount Total number of checklist items
 * @returns The appropriate status based on completion
 */
export const deriveStatusFromChecklist = (checkedCount: number, totalCount: number): StepStatus => {
  if (checkedCount === 0) return 'not_started';
  if (checkedCount === totalCount) return 'completed';
  return 'in_progress';
};

/**
 * Calculates the number of checked items in a checklist state
 * @param checklistState Record of item -> checked status
 * @returns Number of checked items
 */
export const getCheckedCount = (checklistState: Record<string, boolean>): number => {
  return Object.values(checklistState).filter(Boolean).length;
};

/**
 * Checks if this is the first step completion (milestone)
 * @param previousCompletedCount Previous count of completed steps
 * @param currentCompletedCount Current count of completed steps
 * @returns True if this is the first step completion
 */
export const isFirstStepCompletion = (previousCompletedCount: number, currentCompletedCount: number): boolean => {
  return previousCompletedCount === 0 && currentCompletedCount === 1;
};

/**
 * Checks if a section was just completed
 * @param categorySteps All steps in the category
 * @param previousStep Previous step that changed
 * @param newStatus New status of the changed step
 * @returns True if the section is now complete
 */
export const isSectionComplete = (categorySteps: any[], stepId: string, newStatus: StepStatus): boolean => {
  if (newStatus !== 'completed') return false;
  
  // Check if all steps in this category are completed (including the one we just changed)
  const completedCount = categorySteps.filter(step => 
    step.id === stepId ? true : step.status === 'completed'
  ).length;
  
  return completedCount === categorySteps.length;
};