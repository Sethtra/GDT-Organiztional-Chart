import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ConfirmModal from '../ConfirmModal';
import ContextMenu from '../ContextMenu';
import CustomEdge from '../CustomEdge';
import OrgNode from '../OrgNode';
import ProfileDrawer from '../ProfileDrawer';
import PropertiesPanel from '../PropertiesPanel';
import SearchBar from '../SearchBar';
import ShareModal from '../ShareModal';
import ShortcutsModal from '../ShortcutsModal';
import StatusBar from '../StatusBar';
import VersionHistoryModal from '../VersionHistoryModal';
import StaffProfileDialog from '../staff/StaffProfileDialog';
import PositionDetailDialog from '../PositionDetailDialog';
import EditorHeader from './EditorHeader';
import LinkedChartPopup from './LinkedChartPopup';
import PreviewControls from './PreviewControls';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useChartHistory } from '../../hooks/useChartHistory';
import { useChartPersistence } from '../../hooks/useChartPersistence';
import { useChartShortcuts } from '../../hooks/useChartShortcuts';
import { useChartBackupOps } from '../../hooks/useChartBackupOps';
import { useChartLoad } from '../../hooks/useChartLoad';
import { useChartNodeFocus } from '../../hooks/useChartNodeFocus';
import { useNodeOperations } from '../../hooks/useNodeOperations';

import { TabContext } from '../../contexts/TabContext';
import { ChartContext } from '../../contexts/ChartContext';

import { CHART_VERSION_WRITES_ENABLED } from '../../config/chartFeatures';
import { HR_FEATURES_ENABLED } from '../../config/hrFeatures';
import { TYPE_META } from '../../data/nodeTypes';
import { supabase } from '../../supabaseClient';
import { DEFAULT_EDGE_OPTIONS, withoutRelationalIds } from '../../utils/chartData';

const nodeTypes = { orgNode: OrgNode };
const edgeTypes = { custom: CustomEdge };

// Older/legacy charts (e.g. anything seeded before the GDT template edges
// carried a `type`) can have edges missing `type: "custom"`. Without it,
// React Flow silently falls back to its own built-in edge component, which
// ignores every custom style/dynamic-glue field — the connector renders but
// none of the Properties Panel controls do anything. Backfill on every load
// so old charts self-heal instead of needing a manual data migration.

export default function FlowApp({
  chartId,
  focusNodeId,
  openLinkedChart,
  onChartName,
}) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeTabId } = useContext(TabContext);
  const navigate = useNavigate();
  const { getNodes, setCenter } = useReactFlow();
  const viewport = useViewport();

  // ── Core state ─────────────────────────────────────────────────
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [chartName, setChartName] = useState('Untitled Chart');

  // Report the loaded chart's display name up to EditorShell for the tab label.
  useEffect(() => {
    onChartName?.(chartName);
  }, [chartName, onChartName]);

  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  // Gates whether the NODE properties panel is visible. Left-click still
  // drives `selectedNodes` (needed for drag/copy/delete/keyboard shortcuts
  // and to know which node saves apply to) but no longer opens the panel by
  // itself — only an explicit edit action does. Edge selection is
  // unaffected; clicking an edge still opens its panel as before.
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [profileNodeId, setProfileNodeId] = useState(null);
  const [profileStaffId, setProfileStaffId] = useState(null);
  const [layoutDir, setLayoutDir] = useState('TB');
  const [previewMode, setPreviewMode] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [searchHighlights, setSearchHighlights] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [chartIsPublic, setChartIsPublic] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [canViewProfiles, setCanViewProfiles] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [linkedChartPopup, setLinkedChartPopup] = useState(null); // { node, x, y }
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const backupFileInputRef = useRef(null);

  // Tracks what's currently saved on the server so the persist effect can
  // tell "nothing changed" from "needs saving" without re-sending identical data.
  const lastSyncData = useRef({ nodes: '[]', edges: '[]' });

  // ── Clipboard ─────────────────────────────────────────────────
  const [clipboard, setClipboard] = useState(null);

  // ── Undo/Redo ─────────────────────────────────────────────────
  // Mirrors of the latest nodes/edges so takeSnapshot can stay referentially
  // stable ([] deps) instead of changing identity on every edit.
  const {
    nodesRef,
    edgesRef,
    takeSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useChartHistory(nodes, edges, setNodes, setEdges);

  const copyNode = useCallback(() => {
    if (selectedNodes.length > 0) setClipboard(selectedNodes);
  }, [selectedNodes]);

  const pasteNode = useCallback(() => {
    if (!clipboard || clipboard.length === 0) return;
    takeSnapshot();

    const idMap = {};
    const newNodes = clipboard.map((n) => {
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
    setClipboard(newNodes);
  }, [clipboard, setNodes, setEdges, edges, takeSnapshot]);

  // ── Persistence ────────────────────────────────────────────────
  // Shared by the debounced autosave effect and the manual Save button, so
  // both a passive edit and a deliberate click go through the same guarded
  // path and report real (not simulated) save status.
  const { performSave } = useChartPersistence({
    chartId,
    nodes,
    edges,
    nodesRef,
    edgesRef,
    lastSyncData,
    setNodes,
    setEdges,
    setSaveStatus,
    loading,
    canEdit,
  });

  // ── Chart load ────────────────────────────────────────────────
  useChartLoad({
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
  });

  // ── Sync selected nodes ────────────────────────────────────────
  useEffect(() => {
    if (selectedNodes.length > 0) {
      const ids = new Set(selectedNodes.map((n) => n.id));
      const freshNodes = nodes.filter((n) => ids.has(n.id) && n.selected);
      if (
        freshNodes.length !== selectedNodes.length ||
        freshNodes.some((node, index) => node !== selectedNodes[index])
      ) {
        setSelectedNodes(freshNodes);
      }
    }
    if (selectedEdge) {
      const freshEdge = edges.find((e) => e.id === selectedEdge.id);
      if (freshEdge && freshEdge !== selectedEdge) {
        setSelectedEdge(freshEdge);
      } else if (!freshEdge) {
        setSelectedEdge(null);
      }
    }
  }, [nodes, edges, selectedNodes, selectedEdge]);

  // ── Compute visible nodes/edges (collapse) ────────────────────
  const { visibleNodes, visibleEdges, childCounts, teamSizes } = useMemo(() => {
    const hidden = new Set();
    if (collapsedNodes.size > 0) {
      function collectDescendants(nodeId) {
        edges
          .filter((e) => e.source === nodeId)
          .forEach((e) => {
            if (!hidden.has(e.target)) {
              hidden.add(e.target);
              collectDescendants(e.target);
            }
          });
      }
      collapsedNodes.forEach((id) => collectDescendants(id));
    }

    const cCounts = {};
    const childrenMap = {};
    edges.forEach((e) => {
      cCounts[e.source] = (cCounts[e.source] || 0) + 1;
      (childrenMap[e.source] ||= []).push(e.target);
    });

    // Total descendants per node (not just direct reports) — e.g. a "Head"
    // with 2 deputies who each have their own staff should show the full
    // team size underneath them, not just the 2 direct reports.
    const tSizes = {};
    const visiting = new Set();
    function countDescendants(nodeId) {
      if (tSizes[nodeId] !== undefined) return tSizes[nodeId];
      if (visiting.has(nodeId)) return 0; // cycle guard
      visiting.add(nodeId);
      const children = childrenMap[nodeId] || [];
      let total = children.length;
      for (const childId of children) total += countDescendants(childId);
      visiting.delete(nodeId);
      tSizes[nodeId] = total;
      return total;
    }
    nodes.forEach((n) => countDescendants(n.id));

    const vNodes = nodes.filter((n) => !hidden.has(n.id));
    const vEdges = edges.filter(
      (e) => !hidden.has(e.source) && !hidden.has(e.target),
    );

    return {
      visibleNodes: vNodes,
      visibleEdges: vEdges,
      childCounts: cCounts,
      teamSizes: tSizes,
    };
  }, [nodes, edges, collapsedNodes]);

  // ── Node / edge operations ────────────────────────────────────
  const {
    onNodeDragStart,
    onConnect,
    onReconnect,
    updateSelectedNodes,
    updateEdgeProperties,
    deleteNodes,
    duplicateNodes: duplicateNodesRaw,
    addChildNode: addChildNodeRaw,
    addRootNode: addRootNodeRaw,
    autoLayout,
    toggleLayout,
    toggleCollapse,
  } = useNodeOperations({
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
  });

  // Creating or duplicating a node is itself an explicit edit action, so
  // (unlike a plain click) it should open the properties panel — these
  // wrappers are used everywhere instead of the raw hook functions.
  const addChildNode = useCallback(
    (parentId, orgType) => {
      addChildNodeRaw(parentId, orgType);
      setShowNodePanel(true);
    },
    [addChildNodeRaw],
  );
  const addRootNode = useCallback(() => {
    addRootNodeRaw();
    setShowNodePanel(true);
  }, [addRootNodeRaw]);
  const duplicateNodes = useCallback(
    (nodesToDuplicate) => {
      duplicateNodesRaw(nodesToDuplicate);
      setShowNodePanel(true);
    },
    [duplicateNodesRaw],
  );

  // ── Backup / export operations ─────────────────────────────────
  const { downloadChartBackup, restoreChartBackup, downloadImage } =
    useChartBackupOps({
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
    });

  // ── Simple event handlers ──────────────────────────────────────
  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }) => {
      setSelectedNodes(selNodes);
      setSelectedEdge(selEdges.length === 1 ? selEdges[0] : null);
    },
    [],
  );

  const onNodeClick = useCallback((evt, node) => {
    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA')
    ) {
      document.activeElement.blur();
    }
    setContextMenu(null);
    // A plain click only selects (for drag/copy/delete/shortcuts) — it must
    // not surface the properties panel. Only an explicit edit action does.
    setShowNodePanel(false);
    if (node.data.linkedChartId) {
      setLinkedChartPopup({ node, x: evt.clientX, y: evt.clientY });
    } else {
      setLinkedChartPopup(null);
    }
  }, []);

  const onEdgeClick = useCallback(() => {
    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA')
    ) {
      document.activeElement.blur();
    }
  }, []);

  const onPaneClick = useCallback(() => {
    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA')
    ) {
      document.activeElement.blur();
    }
    setContextMenu(null);
    setShowNodePanel(false);
  }, []);

  const onNodeContextMenu = useCallback(
    (evt, node) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        document.activeElement.blur();
      }
      evt.preventDefault();
      const isPerson = !!TYPE_META[node.data?.orgType]?.isPerson;
      if (!canEdit && !isPerson) return;
      setContextMenu({ x: evt.clientX, y: evt.clientY, nodeId: node.id });
    },
    [canEdit],
  );

  const onEdgeDoubleClick = useCallback(
    (_evt, edge) => {
      takeSnapshot();
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      setSelectedEdge(null);
    },
    [setEdges, takeSnapshot],
  );

  const showConfirm = (title, message, onConfirm, danger = false) => {
    setConfirmModal({ title, message, onConfirm, danger });
  };

  // Search fly-to
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
    [handleFlyTo],
  );

  useChartNodeFocus({
    active: activeTabId === chartId,
    loading,
    focusNodeId,
    nodes,
    onFocus: handleLocatedNode,
  });

  // ── Keyboard shortcuts ────────────────────────────────────────
  useChartShortcuts(activeTabId === chartId, {
    undo,
    redo,
    save: () => void performSave(),
    toggleSearch: () => setShowSearch((v) => !v),
    toggleHelp: () => setShowShortcuts((v) => !v),
    closeOverlays: () => {
      setShowSearch(false);
      setShowShortcuts(false);
      setContextMenu(null);
      setShowNodePanel(false);
    },
    duplicateSelection: () => {
      if (selectedNodes.length > 0) duplicateNodes(selectedNodes);
    },
    copySelection: copyNode,
    pasteSelection: pasteNode,
    deleteSelection: () => {
      if (selectedNodes.length > 0) {
        showConfirm(
          'Delete Nodes',
          `Delete ${selectedNodes.length} node(s) and all connections?`,
          () => {
            deleteNodes();
            setConfirmModal(null);
          },
          true,
        );
      } else if (selectedEdge) {
        takeSnapshot();
        setEdges((currentEdges) =>
          currentEdges.filter((edge) => edge.id !== selectedEdge.id),
        );
      }
    },
    setShiftHeld,
  });

  // ── Derived state ──────────────────────────────────────────────
  // Only shift canvas right when the edit PropertiesPanel is actually visible.
  // When viewing a person node profile (read-only drawer on the right), the
  // left side has nothing, so we must NOT add the margin-left offset.
  const profileNode = useMemo(() => {
    if (!profileNodeId || !canViewProfiles) return null;
    const live = nodes.find((node) => node.id === profileNodeId);
    if (!live || !TYPE_META[live.data?.orgType]?.isPerson) return null;
    return live;
  }, [profileNodeId, canViewProfiles, nodes]);

  const panelOpen =
    !previewMode &&
    ((selectedNodes.length > 0 && showNodePanel) || selectedEdge);
  const contextNode = contextMenu
    ? nodes.find((node) => node.id === contextMenu.nodeId)
    : null;
  const contextNodeIsPerson =
    !!contextNode && !!TYPE_META[contextNode.data?.orgType]?.isPerson;
  const relationalProfileStaffId = HR_FEATURES_ENABLED
    ? profileStaffId ||
      (typeof profileNode?.data?.dbStaffId === 'string'
        ? profileNode.data.dbStaffId
        : null)
    : null;

  // Memoized so OrgNode (wrapped in memo()) doesn't re-render on every
  // unrelated render of FlowApp — without this, a new object here every
  // render defeats memo() for every node on the canvas.
  const chartContextValue = useMemo(
    () => ({ childCounts, collapsedNodes, searchHighlights, teamSizes }),
    [childCounts, collapsedNodes, searchHighlights, teamSizes],
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={`app-wrapper ${previewMode ? 'preview-mode' : ''}`}>
      {/* ── Header ────────────────────────────────────────── */}
      {!previewMode && (
        <EditorHeader
          addRootNode={addRootNode}
          autoLayout={autoLayout}
          toggleLayout={toggleLayout}
          layoutDir={layoutDir}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onSearchOpen={() => setShowSearch(true)}
          onShortcutsOpen={() => setShowShortcuts(true)}
          isOwner={isOwner}
          onShareOpen={() => setShowShare(true)}
          canEdit={canEdit}
          onDownloadBackup={downloadChartBackup}
          onRestoreBackup={() => backupFileInputRef.current?.click()}
          onPreviewMode={() => {
            setPreviewMode(true);
            setSelectedNodes([]);
            setSelectedEdge(null);
            setShowNodePanel(false);
          }}
          toggleTheme={toggleTheme}
          theme={theme}
          onSave={performSave}
          saveStatus={saveStatus}
          navigate={navigate}
        />
      )}

      {/* ── Preview Controls ─────────────────────────────── */}
      {previewMode && (
        <PreviewControls
          canEdit={canEdit}
          onDownloadImage={downloadImage}
          onExitPreview={() => setPreviewMode(false)}
          onBackToHome={() => navigate('/')}
        />
      )}

      {/* ── Main Content Area ────────────────────────────── */}
      <div
        className="main-content"
        style={{
          display: 'flex',
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className={`canvas-wrapper ${panelOpen ? 'panel-open' : ''}`}>
          {loading ? (
            <div className="loading-screen">
              <div className="loading-spinner" />
              <span>Loading from cloud...</span>
            </div>
          ) : (
            <>
              <ChartContext.Provider value={chartContextValue}>
                <ReactFlow
                  nodes={visibleNodes}
                  edges={visibleEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onSelectionChange={onSelectionChange}
                  multiSelectionKeyCode="Shift"
                  onNodeDragStart={onNodeDragStart}
                  onConnect={onConnect}
                  onReconnect={onReconnect}
                  onNodeClick={onNodeClick}
                  onEdgeClick={onEdgeClick}
                  onPaneClick={onPaneClick}
                  onEdgeDoubleClick={onEdgeDoubleClick}
                  onNodeContextMenu={onNodeContextMenu}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
                  connectionMode={ConnectionMode.Loose}
                  reconnectRadius={shiftHeld ? 150 : 20}
                  nodesDraggable={canEdit && !previewMode}
                  nodesConnectable={canEdit && !previewMode}
                  elementsSelectable={canEdit || previewMode}
                  edgesFocusable={canEdit && !previewMode}
                  fitView
                  fitViewOptions={{ padding: 0.15 }}
                  snapToGrid
                  snapGrid={[20, 20]}
                  minZoom={0.05}
                  maxZoom={2.5}
                  proOptions={{ hideAttribution: true }}
                >
                  {!previewMode && (
                    <Background
                      variant={BackgroundVariant.Dots}
                      color={theme === 'dark' ? '#ffffff22' : '#0f172a40'}
                      gap={20}
                      size={1.5}
                    />
                  )}
                  {!previewMode && (
                    <Controls
                      style={{
                        background: 'var(--bg-surface-translucent)',
                        border: '1px solid rgba(var(--surface-rgb),.12)',
                        borderRadius: 8,
                      }}
                    />
                  )}
                  {!previewMode && (
                    <MiniMap
                      nodeColor={(n) =>
                        n.data?.color || 'var(--default-node-bg)'
                      }
                      maskColor={
                        theme === 'dark'
                          ? 'rgba(0,0,0,0.65)'
                          : 'rgba(15,23,42,0.35)'
                      }
                      style={{
                        background: 'var(--bg-surface-translucent)',
                        border: '1px solid rgba(var(--surface-rgb),.12)',
                        borderRadius: 8,
                      }}
                    />
                  )}
                  {!previewMode && canEdit && (
                    <Panel
                      position="top-right"
                      style={{ pointerEvents: 'none' }}
                    >
                      <div className="hint-chip">
                        Right-click node for menu &nbsp;·&nbsp; Ctrl+F to
                        search &nbsp;·&nbsp; ? for shortcuts
                      </div>
                    </Panel>
                  )}
                </ReactFlow>
              </ChartContext.Provider>
            </>
          )}
        </div>

        {/* Status Bar */}
        {!previewMode && !loading && (
          <StatusBar
            nodeCount={nodes.length}
            edgeCount={edges.length}
            zoom={viewport.zoom}
            saveStatus={saveStatus}
            onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
          />
        )}

        {/* Staff profile drawer — the read-only view a person node opens
            first (and the only view in preview mode). Edit Details switches
            to the full properties panel below. */}
        {relationalProfileStaffId ? (
          <StaffProfileDialog
            staffId={relationalProfileStaffId}
            onClose={() => {
              setProfileStaffId(null);
              setProfileNodeId(null);
            }}
          />
        ) : profileNode && HR_FEATURES_ENABLED ? (
          // Vacant position (or a person node without a relational staff
          // record yet) on an HR-modernized chart: same read-only "View
          // Details" experience, but sourced from the position rather than
          // a staff profile.
          <PositionDetailDialog
            node={profileNode}
            onClose={() => setProfileNodeId(null)}
          />
        ) : profileNode ? (
          <ProfileDrawer
            node={profileNode}
            teamSize={teamSizes[profileNode.id] || 0}
            canEdit={canEdit && !previewMode}
            onEdit={() => {
              setProfileNodeId(null);
              setSelectedNodes([profileNode]);
              setSelectedEdge(null);
              setNodes((nds) =>
                nds.map((node) => ({
                  ...node,
                  selected: node.id === profileNode.id,
                })),
              );
              setShowNodePanel(true);
            }}
            onClose={() => setProfileNodeId(null)}
          />
        ) : null}

        {/* Properties Panel (Outside canvas-wrapper) */}
        {((selectedNodes.length > 0 && showNodePanel) || selectedEdge) &&
          !previewMode && (
          <PropertiesPanel
            chartId={chartId}
            nodes={selectedNodes}
            edge={selectedEdge}
            onUpdateNodes={updateSelectedNodes}
            onUpdateEdge={updateEdgeProperties}
            onAddChild={(type) => addChildNode(selectedNodes[0]?.id, type)}
            onDelete={() => {
              if (selectedNodes.length > 0) {
                showConfirm(
                  'Delete Nodes',
                  `Delete ${selectedNodes.length} node(s) and all connections?`,
                  () => {
                    deleteNodes();
                    setConfirmModal(null);
                  },
                  true,
                );
              } else if (selectedEdge) {
                takeSnapshot();
                setEdges((eds) =>
                  eds.filter((e) => e.id !== selectedEdge.id),
                );
                setSelectedEdge(null);
              }
            }}
            onClose={() => {
              setSelectedNodes([]);
              setSelectedEdge(null);
              setShowNodePanel(false);
            }}
            onSave={() => {
              // Person node → back to its read-only profile; anything else →
              // just deselect. Edits are already committed to node state.
              setSelectedNodes([]);
              setSelectedEdge(null);
              setShowNodePanel(false);
              setNodes((nds) =>
                nds.map((n) => (n.selected ? { ...n, selected: false } : n)),
              );
            }}
            onViewStaffProfile={setProfileStaffId}
            charts={[]}
          />
        )}
      </div>

      {/* ── Context Menu ─────────────────────────────────── */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isCollapsed={collapsedNodes.has(contextMenu.nodeId)}
          onViewDetails={
            contextNodeIsPerson && canViewProfiles
              ? () => setProfileNodeId(contextMenu.nodeId)
              : undefined
          }
          profileRestricted={contextNodeIsPerson && !canViewProfiles}
          onEdit={
            canEdit
              ? () => {
                  const n = nodes.find((nd) => nd.id === contextMenu.nodeId);
                  if (n) {
                    setSelectedNodes([n]);
                    setSelectedEdge(null);
                    // Field edits save to whichever node(s) have
                    // `selected: true` in the live nodes array — align it
                    // with the node we're actually opening the panel for.
                    setNodes((nds) =>
                      nds.map((node) => ({
                        ...node,
                        selected: node.id === n.id,
                      })),
                    );
                    setShowNodePanel(true);
                  }
                }
              : undefined
          }
          onAddChild={() => addChildNode(contextMenu.nodeId, 'orgNode')}
          onDuplicate={() => {
            const n = nodes.find((nd) => nd.id === contextMenu.nodeId);
            if (n) duplicateNodes([n]);
          }}
          onToggleCollapse={() => toggleCollapse(contextMenu.nodeId)}
          onDelete={() => {
            const targetId = contextMenu.nodeId;
            showConfirm(
              'Delete Node',
              'Delete this node and all its connections?',
              () => {
                takeSnapshot();
                setNodes((nds) => nds.filter((n) => n.id !== targetId));
                setEdges((eds) =>
                  eds.filter(
                    (e) => e.source !== targetId && e.target !== targetId,
                  ),
                );
                setConfirmModal(null);
              },
              true,
            );
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* ── Search Bar ───────────────────────────────────── */}
      {showSearch && (
        <SearchBar
          nodes={nodes}
          onFlyTo={handleFlyTo}
          onHighlight={setSearchHighlights}
          onClose={() => {
            setShowSearch(false);
            setSearchHighlights([]);
          }}
        />
      )}

      {/* ── Share Modal ──────────────────────────────── */}
      {showShare && (
        <ShareModal
          chartId={chartId}
          chartName={chartName}
          isPublic={chartIsPublic}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* ── Shortcuts Modal ──────────────────────────── */}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}

      {/* ── Confirm Modal ────────────────────────────────── */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          danger={confirmModal.danger}
        />
      )}

      <input
        ref={backupFileInputRef}
        type="file"
        accept=".json,.gdt-chart.json,application/json"
        onChange={restoreChartBackup}
        style={{ display: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* ── Linked Chart Popup ───────────────────────────── */}
      <LinkedChartPopup
        popup={linkedChartPopup}
        onOpen={openLinkedChart}
        onClose={() => setLinkedChartPopup(null)}
      />

      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        chartId={chartId}
        onRestore={(restoredNodes, restoredEdges) => {
          takeSnapshot();
          // Snapshot the pre-restore state too, so restoring the wrong version
          // is itself recoverable.
          if (CHART_VERSION_WRITES_ENABLED) {
            supabase
              .from('chart_versions')
              .insert({ chart_id: chartId, nodes, edges })
              .then(({ error }) => {
                if (error)
                  console.error('Failed to snapshot before restore', error);
              });
          }
          setNodes(restoredNodes || []);
          setEdges(restoredEdges || []);
          lastSyncData.current = { nodes: '[]', edges: '[]' }; // Force re-sync
        }}
      />
    </div>
  );
}
