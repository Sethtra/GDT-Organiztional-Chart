import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './useAuth';
import { initialNodes, initialEdges } from '../data/initialData';

export { getFolderAncestors } from '../utils/folderUtils';

export function useChart() {
  const { user } = useAuth();
  const [charts, setCharts] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCharts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: chartsData, error: chartsError } = await supabase
      .from('charts')
      .select('id, name, thumbnail_url, updated_at, created_at, owner_id, is_public, folder_id, chart_shares(status, shared_email)')
      .order('updated_at', { ascending: false });
    if (!chartsError && chartsData) setCharts(chartsData);

    const { data: foldersData, error: foldersError } = await supabase
      .from('chart_folders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!foldersError && foldersData) setFolders(foldersData);

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCharts(); }, [fetchCharts]);

  const createChart = useCallback(async (name, useGdtTemplate = false, folderId = null) => {
    if (!user) return null;
    const nodes = useGdtTemplate ? initialNodes : [];
    const edges = useGdtTemplate ? initialEdges : [];
    const { data, error } = await supabase
      .from('charts')
      .insert([{ owner_id: user.id, name, nodes, edges, folder_id: folderId }])
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
    // Try to clean up thumbnail from Storage too
    const chart = charts.find(c => c.id === id);
    if (chart?.thumbnail_url?.includes('/thumbnails/')) {
      const path = chart.thumbnail_url.split('/thumbnails/')[1];
      if (path) await supabase.storage.from('thumbnails').remove([decodeURIComponent(path)]);
    }
    const { error } = await supabase.from('charts').delete().eq('id', id);
    if (!error) setCharts(prev => prev.filter(c => c.id !== id));
    return { error };
  }, [charts]);

  const duplicateChart = useCallback(async (chart) => {
    if (!user) return null;
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

  // ── Folder operations ─────────────────────────────

  const createFolder = useCallback(async (name, parentId = null) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('chart_folders')
      .insert([{ owner_id: user.id, name, parent_id: parentId }])
      .select()
      .single();
    if (error) { console.error('createFolder error:', error); return null; }
    setFolders(prev => [data, ...prev]);
    return data;
  }, [user]);

  const renameFolder = useCallback(async (id, newName) => {
    const { error } = await supabase
      .from('chart_folders')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    return { error };
  }, []);

  const deleteFolder = useCallback(async (id) => {
    // ON DELETE SET NULL in DB handles charts.folder_id and child folders' parent_id automatically.
    const { error } = await supabase.from('chart_folders').delete().eq('id', id);
    if (!error) {
      // Mirror DB cascade in client state immediately (no refetch needed)
      setFolders(prev => prev
        .filter(f => f.id !== id)
        .map(f => f.parent_id === id ? { ...f, parent_id: null } : f)
      );
      setCharts(prev => prev.map(c => c.folder_id === id ? { ...c, folder_id: null } : c));
    }
    return { error };
  }, []);

  const moveToFolder = useCallback(async (chartId, folderId) => {
    const { error } = await supabase
      .from('charts')
      .update({ folder_id: folderId, updated_at: new Date().toISOString() })
      .eq('id', chartId);
    if (!error) {
      setCharts(prev => prev.map(c => c.id === chartId ? { ...c, folder_id: folderId } : c));
    }
    return { error };
  }, []);

  const moveFolder = useCallback(async (folderId, newParentId) => {
    const { error } = await supabase
      .from('chart_folders')
      .update({ parent_id: newParentId, updated_at: new Date().toISOString() })
      .eq('id', folderId);
    if (!error) {
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, parent_id: newParentId } : f));
    }
    return { error };
  }, []);

  return {
    charts,
    folders,
    loading,
    refreshCharts: fetchCharts,
    createChart,
    renameChart,
    deleteChart,
    duplicateChart,
    acceptInvite,
    declineInvite,
    createFolder,
    renameFolder,
    deleteFolder,
    moveToFolder,
    moveFolder,
  };
}

