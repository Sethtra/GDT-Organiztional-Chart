import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';
import { initialNodes, initialEdges } from '../data/initialData';

export function useChart() {
  const { user } = useAuth();
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCharts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('charts')
      .select('id, name, thumbnail_url, updated_at, created_at, owner_id, is_public, chart_shares(status, shared_email)')
      .order('updated_at', { ascending: false });
    if (!error && data) setCharts(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCharts(); }, [fetchCharts]);

  const createChart = useCallback(async (name, useGdtTemplate = false) => {
    if (!user) return null;
    const nodes = useGdtTemplate ? initialNodes : [];
    const edges = useGdtTemplate ? initialEdges : [];
    const { data, error } = await supabase
      .from('charts')
      .insert([{ owner_id: user.id, name, nodes, edges }])
      .select()
      .single();
    if (error) { console.error('createChart error:', error); return null; }
    setCharts(prev => [data, ...prev]);
    return data;
  }, [user]);

  const renameChart = useCallback(async (id, newName) => {
    const { error } = await supabase
      .from('charts')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) setCharts(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    return { error };
  }, []);

  const deleteChart = useCallback(async (id) => {
    const { error } = await supabase.from('charts').delete().eq('id', id);
    if (!error) setCharts(prev => prev.filter(c => c.id !== id));
    return { error };
  }, []);

  const duplicateChart = useCallback(async (chart) => {
    if (!user) return null;
    // Fetch full data first
    const { data: full } = await supabase.from('charts').select('*').eq('id', chart.id).single();
    if (!full) return null;
    const { data, error } = await supabase
      .from('charts')
      .insert([{ owner_id: user.id, name: `${full.name} (Copy)`, nodes: full.nodes, edges: full.edges }])
      .select()
      .single();
    if (error) { console.error('duplicateChart error:', error); return null; }
    setCharts(prev => [data, ...prev]);
    return data;
  }, [user]);

  const acceptInvite = useCallback(async (chartId) => {
    if (!user) return { error: 'Not logged in' };
    const { error } = await supabase
      .from('chart_shares')
      .update({ status: 'accepted' })
      .eq('chart_id', chartId)
      .eq('shared_email', user.email);
    if (!error) await fetchCharts();
    return { error };
  }, [user, fetchCharts]);

  const declineInvite = useCallback(async (chartId) => {
    if (!user) return { error: 'Not logged in' };
    const { error } = await supabase
      .from('chart_shares')
      .delete()
      .eq('chart_id', chartId)
      .eq('shared_email', user.email);
    if (!error) await fetchCharts();
    return { error };
  }, [user, fetchCharts]);

  return { 
    charts, 
    loading, 
    refreshCharts: fetchCharts, 
    createChart, 
    renameChart, 
    deleteChart, 
    duplicateChart,
    acceptInvite,
    declineInvite
  };
}
