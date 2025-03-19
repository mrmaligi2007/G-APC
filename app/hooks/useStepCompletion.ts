// app/hooks/useStepCompletion.ts
import { useState, useEffect, useCallback } from 'react';
import { useDataStore } from '../contexts/DataStoreContext';

export interface StepCompletionOptions {
  stepKey: string;
  shouldCompleteOnMount?: boolean;
}

export function useStepCompletion({ stepKey, shouldCompleteOnMount = false }: StepCompletionOptions) {
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const { store, updateGlobalSettings, refreshStore } = useDataStore();

  const checkCompletionStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      await refreshStore();
      const completedSteps = store.globalSettings.completedSteps;
      setIsCompleted(completedSteps.includes(stepKey));
    } catch (error) {
      console.error(`Failed to check status for step ${stepKey}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [store.globalSettings.completedSteps, stepKey, refreshStore]);

  useEffect(() => {
    checkCompletionStatus();
  }, [checkCompletionStatus]);

  useEffect(() => {
    if (shouldCompleteOnMount && !isCompleted) {
      markStepCompleted();
    }
  }, [shouldCompleteOnMount, isCompleted]);

  const markStepCompleted = async () => {
    try {
      if (!store.globalSettings.completedSteps.includes(stepKey)) {
        const updatedSteps = [...store.globalSettings.completedSteps, stepKey];
        await updateGlobalSettings({
          completedSteps: updatedSteps
        });
        setIsCompleted(true); // Update local state
        await refreshStore();  // Refresh the store.
      }
    } catch (error) {
      console.error(`Failed to mark step ${stepKey} as completed:`, error);
    }
  };

  const resetStepCompletion = async () => {
    try {
      if (isCompleted) {
        const updatedSteps = store.globalSettings.completedSteps.filter(step => step !== stepKey);
        await updateGlobalSettings({
          completedSteps: updatedSteps
        });
        setIsCompleted(false); // Update local state
        await refreshStore(); // Refresh the store.
      }
    } catch (error) {
      console.error(`Failed to reset completion for step ${stepKey}:`, error);
    }
  };

  return {
    isCompleted,
    isLoading,
    markStepCompleted,
    resetStepCompletion,
    checkCompletionStatus // Expose the check function
  };
}

export default useStepCompletion;