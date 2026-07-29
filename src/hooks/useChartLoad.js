import { useEffect } from 'react';
import { shouldOfferLocalRecovery } from '../utils/backupUtils';
import { getChartAccess } from '../utils/chartAccess';
import { normalizeEdges } from '../utils/chartData';
import { loadChartForViewer } from '../services/chartService';
import { mergeChartStaffProjection } from '../services/chartStaffProjectionService';
import { HR_FEATURES_ENABLED } from '../config/hrFeatures';

/**
 * Loads a chart from Supabase, resolves access rights, merges HR projection,
 * and offers local-backup recovery. Populates all FlowApp state via setters.
 *
 * Extracted from App.jsx FlowApp component (original lines 296–409).
 */
export function useChartLoad({
  chartId,
  user,
  navigate,
  setChartName,
  setChartIsPublic,
  setCanEdit,
  setCanViewProfiles,
  setIsOwner,
  setPreviewMode,
  setNodes,
  setEdges,
  setLoading,
  lastSyncData,
}) {
  useEffect(() => {
    if (!chartId) {
      navigate('/dashboard');
      return;
    }

    async function loadData() {
      let loadResult;
      try {
        loadResult = await loadChartForViewer(chartId, {
          allowLegacyAuthenticatedFallback: Boolean(user),
        });
      } catch (error) {
        console.error('Chart load contract failed:', error);
        navigate(user ? '/dashboard' : '/login', { replace: true });
        return;
      }
      const data = loadResult.chart;

      if (data) {
        const rpcAccess = data.viewer_access;
        const legacyAccess = getChartAccess(data, user);
        const canView = rpcAccess ? true : legacyAccess.canView;
        const editAccess = rpcAccess
          ? rpcAccess === 'owner' || rpcAccess === 'edit'
          : legacyAccess.canEdit;
        const ownerStatus = rpcAccess
          ? rpcAccess === 'owner'
          : legacyAccess.isOwner;

        // Frontend visibility complements Supabase RLS. Public links may
        // render without a session; private charts still require an owner or
        // accepted share.
        if (!canView) {
          navigate(user ? '/dashboard' : '/login', { replace: true });
          return;
        }

        setChartName(data.name || 'Untitled Chart');
        setChartIsPublic(data.is_public);
        setCanEdit(editAccess);
        setCanViewProfiles(
          rpcAccess
            ? rpcAccess !== 'public'
            : legacyAccess.isOwner || !!legacyAccess.acceptedShare,
        );
        setIsOwner(ownerStatus);
        if (!editAccess) setPreviewMode(true);

        // Respect empty arrays — don't fall back to GDT template for blank charts.
        // lastSyncData intentionally reflects the RAW saved data (pre-normalization)
        // so the persist effect sees a diff and re-saves the normalized edges,
        // permanently healing any chart saved before edges carried a `type`.
        // Load HR data from relational tables and merge it into the visual nodes.
        const mergedNodes =
          rpcAccess === 'public' || !HR_FEATURES_ENABLED
            ? data.nodes || []
            : await mergeChartStaffProjection(chartId, data.nodes || []);
        const normalizedEdges = normalizeEdges(data.edges);

        setNodes(mergedNodes);
        setEdges(normalizedEdges);
        lastSyncData.current = {
          nodes: JSON.stringify(mergedNodes),
          edges: JSON.stringify(data.edges || []),
        };

        // Local-backup safety net: recover unsaved work if the browser closed
        // (or refreshed) before the debounced save finished. Compares BOTH
        // node and edge counts against the server version — an edge-only
        // change (e.g. drawing one new connector, no new node) used to be
        // invisible to this check and would silently vanish on reload.
        try {
          const localBackupStr = localStorage.getItem(
            `chart_backup_${chartId}`,
          );
          if (localBackupStr) {
            const localBackup = JSON.parse(localBackupStr);
            const loadedServerChart = {
              ...data,
              nodes: mergedNodes,
              edges: normalizedEdges,
            };
            if (shouldOfferLocalRecovery(loadedServerChart, localBackup)) {
              if (
                window.confirm(
                  'A local backup was found with unsaved changes not present on the server. Do you want to recover it?',
                )
              ) {
                setNodes(localBackup.nodes);
                setEdges(normalizeEdges(localBackup.edges));
                lastSyncData.current = { nodes: '[]', edges: '[]' }; // Force a resync
              } else {
                localStorage.removeItem(`chart_backup_${chartId}`);
              }
            } else {
              // It matches the fully loaded server chart (or is older), so it
              // is stale recovery data and should not prompt again.
              localStorage.removeItem(`chart_backup_${chartId}`);
            }
          }
        } catch (e) {
          console.error('Error reading local backup', e);
        }
      } else {
        // Chart not found or blocked by RLS.
        navigate(user ? '/dashboard' : '/login', { replace: true });
        return;
      }
      setLoading(false);
    }
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId, navigate, setNodes, setEdges, user]);
}
