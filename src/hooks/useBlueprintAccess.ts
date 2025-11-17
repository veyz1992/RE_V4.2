import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BlueprintAccessResult {
  hasBlueprintAccess: boolean;
  isLoading: boolean;
  error?: Error;
}

export const useBlueprintAccess = (profileId: string | null): BlueprintAccessResult => {
  const [hasBlueprintAccess, setHasBlueprintAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    // If no profileId, return defaults
    if (!profileId) {
      setHasBlueprintAccess(false);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);

    const fetchBlueprintAccess = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('profile_blueprint_access')
          .select('has_blueprint_access')
          .eq('profile_id', profileId)
          .limit(1)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        if (queryError && queryError.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" which is expected when no access exists
          throw queryError;
        }

        // If no row found or has_blueprint_access is null/false, default to false
        const hasAccess = data?.has_blueprint_access === true;

        setHasBlueprintAccess(hasAccess);
        setIsLoading(false);
        setError(undefined);
      } catch (err) {
        console.error('Failed to fetch blueprint access:', err);
        
        if (!isMounted) {
          return;
        }

        const errorObject = err instanceof Error ? err : new Error('Failed to fetch blueprint access');
        setHasBlueprintAccess(false);
        setIsLoading(false);
        setError(errorObject);
      }
    };

    fetchBlueprintAccess();

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  return {
    hasBlueprintAccess,
    isLoading,
    error,
  };
};