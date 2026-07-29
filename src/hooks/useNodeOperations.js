import { useCallback } from 'react';
import { addEdge, reconnectEdge } from '@xyflow/react';
import { DEFAULT_EDGE_OPTIONS, withoutRelationalIds } from '../utils/chartData';
import { getLayoutedElements } from '../utils/layoutUtils';

/**
 * All pure node/edge mutation operations for the chart editor.
 *
 * Simple event handlers that are tightly coupled to local UI state
 * (onSelectionChange, onNodeClick, onPaneClick, onNodeContextMenu,
 * onEdgeDoubleClick) remain in FlowApp — they are 3–8 lines each.
 *
 * Extracted from App.jsx FlowApp component (original lines 489–782).
 */
export function useNodeOperations({
  nodes,
  edges,
  selectedNodes,
  takeSnapshot,
  nodesRef,
  setNodes,
  setEdges,
  layoutDir,
  setLayoutDir,
  setCollapsedNodes,
}) {
  // ── ReactFlow event handlers that take a snapshot ───────────────
  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onConnect = useCallback(
    (params) => {
      takeSnapshot();
      setEdges((eds) => addEdge({ ...params, ...DEFAULT_EDGE_OPTIONS }, eds));
    },
    [setEdges, takeSnapshot],
  );

  const onReconnect = useCallback(
    (oldEdge, newConnection) => {
      takeSnapshot();
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    },
    [setEdges, takeSnapshot],
  );

  // ── Selection-aware updates ──────────────────────────────────────
  const updateSelectedNodes = useCallback(
    (data) => {
      takeSnapshot();

      // Keep React's state update pure. Running database writes inside a state
      // updater can execute them more than once under Strict Mode.
      const nextNodes = nodesRef.current.map((n) => {
        if (!n.selected) return n;
        return { ...n, data: { ...n.data, ...data } };
      });

      // Update the mirror immediately so another fast field edit builds on
      // this one even before React has completed its next render.
      nodesRef.current = nextNodes;
      setNodes(nextNodes);
    },
    [setNodes, takeSnapshot, nodesRef],
  );

  const updateEdgeProperties = useCallback(
    (id, edgeData) => {
      takeSnapshot();
      setEdges((eds) =>
        eds.map((e) => (e.id === id ? { ...e, ...edgeData } : e)),
      );
    },
    [setEdges, takeSnapshot],
  );

  // ── Add / remove nodes ───────────────────────────────────────────
  const deleteNodes = useCallback(() => {
    takeSnapshot();
    const ids = new Set(selectedNodes.map((n) => n.id));
    setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
    setEdges((eds) =>
      eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
    );
  }, [selectedNodes, setNodes, setEdges, takeSnapshot]);

  const duplicateNodes = useCallback(
    (nodesToDuplicate) => {
      if (!nodesToDuplicate || nodesToDuplicate.length === 0) return;
      takeSnapshot();

      const idMap = {};
      const newNodes = nodesToDuplicate.map((n) => {
        const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        idMap[n.id] = newId;
        return {
          ...n,
          id: newId,
          data: withoutRelationalIds(n.data),
          position: { x: n.position.x + 40, y: n.position.y + 40 },
          selected: true,
        };
      });

      const newEdges = [];
      edges.forEach((e) => {
        if (idMap[e.source] && idMap[e.target]) {
          newEdges.push({
            ...e,
            id: `e-${idMap[e.source]}-${idMap[e.target]}`,
            source: idMap[e.source],
            target: idMap[e.target],
            selected: false,
          });
        }
      });

      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        ...newNodes,
      ]);
      setEdges((eds) => [...eds, ...newEdges]);
    },
    [edges, setNodes, setEdges, takeSnapshot],
  );

  const addChildNode = useCallback(
    (parentId, orgType) => {
      takeSnapshot();
      const parent = nodes.find((n) => n.id === parentId);
      if (!parent) return;
      const newId = `node-${Date.now()}`;
      const colorMap = {
        orgNode: 'var(--default-node-bg)',
        individualNode: '#334155',
      };
      const newNode = {
        id: newId,
        type: 'orgNode',
        position: {
          x: parent.position.x + (Math.random() * 60 - 30),
          y: parent.position.y + 180,
        },
        data: {
          name: 'ថ្មី',
          nameEn: 'New Node',
          orgType,
          color: colorMap[orgType] || 'var(--default-node-bg)',
          description: '',
        },
      };
      const newEdge = {
        id: `e-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        ...DEFAULT_EDGE_OPTIONS,
        data: { ...DEFAULT_EDGE_OPTIONS.data, dynamic: true },
      };
      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        { ...newNode, selected: true },
      ]);
      setEdges((eds) => [...eds, newEdge]);
      // Expand parent if collapsed
      setCollapsedNodes((prev) => {
        const s = new Set(prev);
        s.delete(parentId);
        return s;
      });
    },
    [nodes, setNodes, setEdges, setCollapsedNodes, takeSnapshot],
  );

  const addRootNode = useCallback(() => {
    takeSnapshot();
    const newId = `node-${Date.now()}`;
    const newNode = {
      id: newId,
      type: 'orgNode',
      position: { x: Math.random() * 600 - 300, y: -200 },
      data: {
        name: 'ថ្មី',
        nameEn: 'New Node',
        orgType: 'orgNode',
        color: 'var(--default-node-bg)',
        description: '',
      },
      selected: true,
    };
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      newNode,
    ]);
  }, [setNodes, takeSnapshot]);

  // ── Layout / collapse ────────────────────────────────────────────
  const autoLayout = useCallback(() => {
    takeSnapshot();
    const { nodes: ln, edges: le } = getLayoutedElements(
      nodes,
      edges,
      layoutDir,
    );
    setNodes(ln);
    setEdges(le);
  }, [nodes, edges, layoutDir, setNodes, setEdges, takeSnapshot]);

  const toggleLayout = useCallback(() => {
    takeSnapshot();
    const nextDir = layoutDir === 'TB' ? 'LR' : 'TB';
    setLayoutDir(nextDir);
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, nextDir);
    setNodes(ln);
    setEdges(le);
  }, [
    layoutDir,
    nodes,
    edges,
    setNodes,
    setEdges,
    setLayoutDir,
    takeSnapshot,
  ]);

  const toggleCollapse = useCallback(
    (nodeId) => {
      setCollapsedNodes((prev) => {
        const s = new Set(prev);
        if (s.has(nodeId)) s.delete(nodeId);
        else s.add(nodeId);
        return s;
      });
    },
    [setCollapsedNodes],
  );

  return {
    onNodeDragStart,
    onConnect,
    onReconnect,
    updateSelectedNodes,
    updateEdgeProperties,
    deleteNodes,
    duplicateNodes,
    addChildNode,
    addRootNode,
    autoLayout,
    toggleLayout,
    toggleCollapse,
  };
}
