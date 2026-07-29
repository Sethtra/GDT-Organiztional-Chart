import { useCallback } from 'react';
import { getNodesBounds } from '@xyflow/react';
import {
  chartBackupFilename,
  createChartBackup,
  parseChartBackup,
  serializeChartBackup,
} from '../utils/chartBackup';
import { normalizeEdges } from '../utils/chartData';

/**
 * Chart backup/restore and PNG image export operations.
 *
 * Extracted from App.jsx FlowApp component (original lines 788–914).
 */
export function useChartBackupOps({
  chartId,
  chartName,
  nodesRef,
  edgesRef,
  getNodes,
  theme,
  setNodes,
  setEdges,
  setConfirmModal,
  setSaveStatus,
  takeSnapshot,
  lastSyncData,
  setSelectedNodes,
  setSelectedEdge,
}) {
  const downloadChartBackup = useCallback(() => {
    try {
      const snapshot = createChartBackup({
        chartId,
        chartName: chartName || 'Untitled Chart',
        nodes: nodesRef.current,
        edges: edgesRef.current,
      });
      const url = URL.createObjectURL(
        new Blob([serializeChartBackup(snapshot)], {
          type: 'application/json',
        }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = chartBackupFilename(snapshot.chartName);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Chart backup export failed:', error);
      setSaveStatus('error');
    }
  }, [chartId, chartName, nodesRef, edgesRef, setSaveStatus]);

  const restoreChartBackup = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;

      try {
        const snapshot = parseChartBackup(await file.text());
        const belongsToAnotherChart = snapshot.chartId !== chartId;
        setConfirmModal({
          title: 'Restore chart backup?',
          message:
            `Replace the current in-memory chart with ${snapshot.nodes.length} node(s) and ${snapshot.edges.length} edge(s) from "${snapshot.chartName}"?` +
            (belongsToAnotherChart
              ? ' This backup was created from a different chart.'
              : ''),
          danger: true,
          onConfirm: () => {
            takeSnapshot();
            setSelectedNodes([]);
            setSelectedEdge(null);
            setNodes(snapshot.nodes);
            setEdges(normalizeEdges(snapshot.edges));
            lastSyncData.current = { nodes: '[]', edges: '[]' };
            try {
              localStorage.setItem(
                `chart_backup_${chartId}`,
                JSON.stringify({
                  nodes: snapshot.nodes,
                  edges: snapshot.edges,
                  timestamp: Date.now(),
                }),
              );
            } catch (error) {
              console.warn(
                'Failed to save restored chart backup locally',
                error,
              );
            }
            setSaveStatus('idle');
            setConfirmModal(null);
          },
        });
      } catch (error) {
        setConfirmModal({
          title: 'Backup cannot be restored',
          message:
            error instanceof Error
              ? error.message
              : 'The selected backup is invalid.',
          danger: true,
          onConfirm: () => setConfirmModal(null),
        });
      }
    },
    [
      chartId,
      setEdges,
      setNodes,
      takeSnapshot,
      setConfirmModal,
      setSaveStatus,
      setSelectedNodes,
      setSelectedEdge,
      lastSyncData,
    ],
  );

  const downloadImage = useCallback(async () => {
    const currentNodes = getNodes();
    if (currentNodes.length === 0) return;
    const nodesBounds = getNodesBounds(currentNodes);

    const padding = 60;
    const imageWidth = Math.ceil(nodesBounds.width + padding * 2);
    const imageHeight = Math.ceil(nodesBounds.height + padding * 2);

    const viewport = {
      x: padding - nodesBounds.x,
      y: padding - nodesBounds.y,
      zoom: 1,
    };

    const el = document.querySelector('.react-flow__viewport');
    if (!el) return;

    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, {
        backgroundColor: theme === 'dark' ? '#0f2044' : '#ffffff',
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
      const a = document.createElement('a');
      a.setAttribute('download', `${chartName || 'org-chart'}.png`);
      a.setAttribute('href', dataUrl);
      a.click();
    } catch (error) {
      console.error('Chart image export failed:', error);
      window.alert('Unable to export the chart image. Please try again.');
    }
  }, [getNodes, theme, chartName]);

  return { downloadChartBackup, restoreChartBackup, downloadImage };
}
