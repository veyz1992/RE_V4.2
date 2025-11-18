// This hook is deprecated - use useBlueprintData for the data-driven system
export const useBlueprintSteps = () => {
  return {
    allSteps: [],
    stepsByCategory: { foundation: [], acceleration: [], empire_legacy: [] },
    getStepById: () => null,
    getCategorySteps: () => [],
    totalSteps: 0,
  };
};