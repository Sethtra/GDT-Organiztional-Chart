import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../supabaseClient';

function normalizeChartOptions(data) {
  if (!Array.isArray(data)) return [];
  return data.filter(
    (chart) =>
      chart && typeof chart.id === 'string' && typeof chart.name === 'string',
  );
}

export function useOwnedChartOptions() {
  const { user } = useAuth();
  const [charts, setCharts] = useState([]);

  useEffect(() => {
    if (!user?.id) {
      setCharts([]);
      return undefined;
    }

    let active = true;
    const loadCharts = async () => {
      try {
        const { data, error } = await supabase
          .from('charts')
          .select('id, name')
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) throw error;
        if (active) setCharts(normalizeChartOptions(data));
      } catch {
        if (active) setCharts([]);
      }
    };

    void loadCharts();
    return () => {
      active = false;
    };
  }, [user?.id]);

  return charts;
}

export function useLinkedChartTarget(linkedChartId) {
  const [target, setTarget] = useState({ name: '', isLoading: false });

  useEffect(() => {
    if (!linkedChartId) {
      setTarget({ name: '', isLoading: false });
      return undefined;
    }

    let active = true;
    setTarget({ name: '', isLoading: true });

    const loadTarget = async () => {
      try {
        const { data, error } = await supabase
          .from('charts')
          .select('name')
          .eq('id', linkedChartId)
          .maybeSingle();

        if (error) throw error;
        if (!active) return;
        setTarget({
          name: typeof data?.name === 'string' ? data.name : 'Linked chart',
          isLoading: false,
        });
      } catch {
        if (active) setTarget({ name: 'Linked chart', isLoading: false });
      }
    };

    void loadTarget();
    return () => {
      active = false;
    };
  }, [linkedChartId]);

  return target;
}
