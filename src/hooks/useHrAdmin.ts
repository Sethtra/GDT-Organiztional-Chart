import { useEffect, useState } from 'react';
import { HR_FEATURES_ENABLED } from '../config/hrFeatures';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';

export interface HrAdminState {
  isHrAdmin: boolean;
  loading: boolean;
  error: string | null;
}

export function useHrAdmin(): HrAdminState {
  const { user, loading: authLoading } = useAuth();
  const userId = (user as { id?: string } | null)?.id ?? null;
  const [state, setState] = useState<HrAdminState>({
    isHrAdmin: false,
    loading: HR_FEATURES_ENABLED,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!HR_FEATURES_ENABLED) {
      setState({ isHrAdmin: false, loading: false, error: null });
      return () => {
        cancelled = true;
      };
    }

    if (authLoading) {
      setState({ isHrAdmin: false, loading: true, error: null });
      return () => {
        cancelled = true;
      };
    }

    if (!userId) {
      setState({ isHrAdmin: false, loading: false, error: null });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({ ...current, loading: true, error: null }));
    void supabase.rpc('is_hr_admin').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setState({
          isHrAdmin: false,
          loading: false,
          error: 'Unable to verify HR administrator access.',
        });
        return;
      }

      setState({
        isHrAdmin: data === true,
        loading: false,
        error: null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId]);

  return state;
}
