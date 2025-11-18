import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface BlueprintAccessResult {
  hasBlueprintAccess: boolean;
  loading: boolean;
  error?: string;
}

export const useBlueprintAccess = (): BlueprintAccessResult => {
  const { session } = useAuth();
  const [state, setState] = useState<BlueprintAccessResult>({
    hasBlueprintAccess: false,
    loading: false,
    error: undefined,
  });

  useEffect(() => {
    // If no session, user doesn't have access
    if (!session?.user?.id) {
      setState({
        hasBlueprintAccess: false,
        loading: false,
        error: undefined,
      });
      return;
    }

    let isMounted = true;
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    const checkBlueprintAccess = async () => {
      try {
        const userId = session.user.id;

        // Call the has_blueprint_access RPC function
        const { data: hasAccess, error: rpcError } = await supabase.rpc('has_blueprint_access', {
          p_profile_id: userId
        });

        if (rpcError) {
          throw rpcError;
        }

        if (isMounted) {
          setState({
            hasBlueprintAccess: hasAccess || false,
            loading: false,
            error: undefined,
          });
        }

      } catch (error) {
        console.error('Failed to check blueprint access:', error);
        if (isMounted) {
          setState({
            hasBlueprintAccess: false,
            loading: false,
            error: 'Failed to check access',
          });
        }
      }
    };

    void checkBlueprintAccess();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  return state;
};