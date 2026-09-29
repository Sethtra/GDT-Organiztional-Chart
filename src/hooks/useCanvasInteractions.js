import { useCallback, useRef, useState } from 'react';

import { getNodeAlignmentGuides } from '../utils/nodeAlignment';

/**
 * Encapsulates all canvas interaction state and handlers that were previously
 * inline in FlowApp: alignment guides, drag snapping, click/context-menu
 * handlers, and search fly-to. Keeps FlowApp focused on composition.
 */
export function useCanvasInteractions({
  visibleNodes,
  nodes,
  canEdit,
  previewMode,
  canViewProfiles,
  setNodes,
  setSelectedNodes,
  setSelectedEdge,
  setShowNodePanel,
  setContextMenu,
  setLinkedChartPopup,
  setCollapsedNodes,
  setSearchHighlights,
  setShowSearch,
  setProfileNodeId,
  setProfileStaffId,
  getZoom,
  setCenter,
  gridSize,
  alignmentThresholdPx,
  nodesRef,
  TYPE_META,
}) {
  // ── Alignment guides ──────────────────────────────────────────
  const [alignmentGuides, setAlignmentGuides] = useState({
    guideX: null,
    guideY: null,
  });
  const dragGuideFrameRef = useRef(null);

  const clearResizeGuides = useCallback(() => {
    if (dragGuideFrameRef.current != null) {
      cancelAnimationFrame(dragGuideFrameRef.current);
      dragGuideFrameRef.current = null;
    }
    setAlignmentGuides({ guideX: null, guideY: null });
  }, []);

  const applyAlignmentSnap = useCallback(
    (node, commit = false) => {
      const dragged = {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? node.width ?? 0,
        height: node.measured?.height ?? node.height ?? 0,
      };
      const others = visibleNodes
        .filter((n) => n.id !== node.id)
        .map((n) => ({
          x: n.position.x,
          y: n.position.y,
          width: n.measured?.width ?? n.width ?? 0,
          height: n.measured?.height ?? n.height ?? 0,
        }));

      const threshold = alignmentThresholdPx / Math.max(getZoom(), 0.01);
      const { deltaX, deltaY, guideX, guideY } = getNodeAlignmentGuides(
        dragged,
        others,
        threshold,
        gridSize,
      );

      if (commit) {
        if (dragGuideFrameRef.current != null) {
          cancelAnimationFrame(dragGuideFrameRef.current);
          dragGuideFrameRef.current = null;
        }
        setAlignmentGuides({ guideX: null, guideY: null });

        if (deltaX !== 0 || deltaY !== 0) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === node.id
                ? {
                    ...n,
                    position: {
                      x: n.position.x + deltaX,
                      y: n.position.y + deltaY,
                    },
                  }
                : n,
            ),
          );
        }
      } else {
        if (dragGuideFrameRef.current != null) {
          cancelAnimationFrame(dragGuideFrameRef.current);
        }
        dragGuideFrameRef.current = requestAnimationFrame(() => {
          setAlignmentGuides({ guideX, guideY });
          dragGuideFrameRef.current = null;
        });
      }
    },
    [visibleNodes, setNodes, getZoom, gridSize, alignmentThresholdPx],
  );

  const onNodeDrag = useCallback(
    (_event, node) => applyAlignmentSnap(node, false),
    [applyAlignmentSnap],
  );

  const onNodeDragStop = useCallback(
    (_event, node) => {
      applyAlignmentSnap(node, true);
    },
    [applyAlignmentSnap],
  );

  // ── Click handlers ─────────────────────────────────────────────

  function blurActiveInput() {
    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA')
    ) {
      document.activeElement.blur();
    }
  }

  const openNodeProperties = useCallback(
    (nodeId) => {
      const node = nodesRef.current.find((candidate) => candidate.id === nodeId);
      if (!node) return;

      setSelectedNodes([node]);
      setSelectedEdge(null);
      setNodes((currentNodes) =>
        currentNodes.map((candidate) => ({
          ...candidate,
          selected: candidate.id === nodeId,
        })),
      );
      setShowNodePanel(true);
      setLinkedChartPopup(null);
    },
    [nodesRef, setNodes, setSelectedNodes, setSelectedEdge, setShowNodePanel, setLinkedChartPopup],
  );

  const onNodeClick = useCallback(
    (evt, node) => {
      blurActiveInput();
      setContextMenu(null);
      setShowNodePanel(false);
      if (node.data.linkedChartId) {
        setLinkedChartPopup({ node, x: evt.clientX, y: evt.clientY });
      } else {
        setLinkedChartPopup(null);
      }
    },
    [setContextMenu, setShowNodePanel, setLinkedChartPopup],
  );

  const onEdgeClick = useCallback(() => {
    blurActiveInput();
  }, []);

  const onPaneClick = useCallback(() => {
    blurActiveInput();
    setContextMenu(null);
    setShowNodePanel(false);
  }, [setContextMenu, setShowNodePanel]);

  const onNodeContextMenu = useCallback(
    (evt, node) => {
      blurActiveInput();
      evt.preventDefault();
      const isPerson = !!TYPE_META[node.data?.orgType]?.isPerson;
      if (!canEdit && !isPerson) return;
      setContextMenu({ x: evt.clientX, y: evt.clientY, nodeId: node.id });
    },
    [canEdit, TYPE_META, setContextMenu],
  );

  // ── Search fly-to ──────────────────────────────────────────────

  const handleFlyTo = useCallback(
    (node) => {
      setCenter(node.position.x + 100, node.position.y + 50, {
        zoom: 1.2,
        duration: 600,
      });
    },
    [setCenter],
  );

  const handleLocatedNode = useCallback(
    (node) => {
      setCollapsedNodes(new Set());
      setSearchHighlights([node.id]);
      setShowSearch(false);
      setContextMenu(null);
      setProfileNodeId(null);
      setProfileStaffId(null);
      handleFlyTo(node);
    },
    [handleFlyTo, setCollapsedNodes, setSearchHighlights, setShowSearch, setContextMenu, setProfileNodeId, setProfileStaffId],
  );

  return {
    // Alignment
    alignmentGuides,
    setAlignmentGuides,
    clearResizeGuides,
    onNodeDrag,
    onNodeDragStop,
    dragGuideFrameRef,

    // Click handlers
    openNodeProperties,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onNodeContextMenu,

    // Search
    handleFlyTo,
    handleLocatedNode,
  };
}
