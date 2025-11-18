import { useMemo } from 'react';
import { BLUEPRINT_STEPS, getBlueprintStepsByCategory } from '../data/blueprintSteps';

export const useBlueprintSteps = () => {
  const stepsByCategory = useMemo(() => getBlueprintStepsByCategory(), []);
  
  const allSteps = useMemo(() => BLUEPRINT_STEPS, []);
  
  const getStepById = useMemo(() => {
    return (stepId: string) => allSteps.find(step => step.id === stepId);
  }, [allSteps]);
  
  const getCategorySteps = useMemo(() => {
    return (category: 'foundation' | 'acceleration' | 'empire_legacy') => {
      return allSteps.filter(step => step.category === category);
    };
  }, [allSteps]);
  
  return {
    allSteps,
    stepsByCategory,
    getStepById,
    getCategorySteps,
    totalSteps: allSteps.length,
  };
};