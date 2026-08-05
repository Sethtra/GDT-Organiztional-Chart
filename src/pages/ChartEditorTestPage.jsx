import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomEdge from '../components/CustomEdge';
import OrgNode from '../components/OrgNode';
import ConfirmModal from '../components/ConfirmModal';
import ContextMenu from '../components/ContextMenu';
import PropertiesPanel from '../components/PropertiesPanel';
import SearchBar from '../components/SearchBar';
import ShortcutsModal from '../components/ShortcutsModal';
import EditorHeader from '../components/editor/EditorHeader';
import AlignmentGuides from '../components/editor/AlignmentGuides';
import { ChartContext } from '../contexts/ChartContext';
import { useTheme } from '../contexts/ThemeContext';
import { useChartHistory } from '../hooks/useChartHistory';
import { useChartShortcuts } from '../hooks/useChartShortcuts';
import { useNodeOperations } from '../hooks/useNodeOperations';
import { useChartBackupOps } from '../hooks/useChartBackupOps';
import { computeChartHierarchy } from '../utils/chartHierarchy';
import { getNodeAlignmentGuides } from '../utils/nodeAlignment';
import { DEFAULT_EDGE_OPTIONS, withoutRelationalIds } from '../utils/chartData';
import '../styles/chart-editor.css';

// Screen-px feel regardless of zoom: 6px reads the same whether the canvas
// is zoomed to 50% or 200%, a flat flow-space threshold would not.
const ALIGNMENT_THRESHOLD_PX = 6;
// Matches the visible dot grid (Background gap={20} below) and the old
// snapGrid={[20, 20]} this replaces.
const GRID_SIZE = 20;
// Backup export validates chartId as a real UUID (ChartSnapshotSchema) — a
// readable slug here throws a ZodError and silently fails the download.
// The nil UUID is explicitly whitelisted by that schema for exactly this
// kind of fixture/placeholder use.
const TEST_CHART_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Isolated design/QA harness for the Chart Editor surface — no Supabase, no
 * auth, but a REAL editing loop: add/edit/delete/duplicate/collapse nodes,
 * right-click menu, properties panel, undo/redo, copy/paste, search,
 * backup/restore. All of it runs on `useNodeOperations`/`useChartHistory`/
 * `useChartShortcuts`/`useChartBackupOps` — the exact same Supabase-free
 * hooks FlowApp.jsx uses, not reimplementations — so behavior here is the
 * real behavior, not a lookalike. What's deliberately absent: Share (needs
 * a real DB-backed chart to point a link at), Preview mode, viewing a
 * staff profile, and chart-linking — all four need a live chart/staff
 * record this route has no backend to provide. Save stays simulated.
 *
 * The real /chart/:id route needs a signed-in session and a live chart to
 * reach (see EditorShell) — exactly why the resizer/connector sync bug and
 * the header/node redesign were never exercised in a browser before this
 * route existed.
 *
 * Not linked from any nav — reached only at /test-chart-editor.
 */

const nodeTypes = { orgNode: OrgNode };
const edgeTypes = { custom: CustomEdge };

// Two nodes ship pre-resized (explicit width/height, bigger than the CSS
// min-width/min-height floor) specifically to prove the wrapper-vs-card fix:
// before it, a resized card's visible box stopped tracking the box React
// Flow measures, so the resize handles floated free of the shape and any
// connector landed on the old, smaller edge instead of the new one.
const initialNodes = [
  {
    id: 'unit-root',
    type: 'orgNode',
    position: { x: 460, y: 0 },
    data: {
      orgType: 'orgNode',
      badgeText: 'ROOT',
      name: 'អគ្គនាយកដ្ឋានពន្ធដារ',
      nameEn: 'General Department of Taxation',
    },
  },
  {
    id: 'unit-resized-wide',
    type: 'orgNode',
    position: { x: 40, y: 220 },
    width: 340,
    height: 110,
    data: {
      orgType: 'orgNode',
      badgeText: 'DEPT',
      name: 'នាយកដ្ឋានពន្ធវិនិយោគ',
      nameEn: 'Resized wider than default — proves the card fills its box',
    },
  },
  {
    id: 'unit-resized-tall',
    type: 'orgNode',
    position: { x: 820, y: 220 },
    width: 170,
    height: 230,
    data: {
      orgType: 'orgNode',
      badgeText: 'OFFICE',
      name: 'ការិយាល័យសវនកម្ម',
      nameEn: 'Resized taller — connector should land on the new bottom edge',
    },
  },
  {
    id: 'unit-colored',
    type: 'orgNode',
    position: { x: 430, y: 220 },
    data: {
      orgType: 'orgNode',
      badgeText: 'LEGAL',
      color: '#8a1f2b',
      name: 'ការិយាល័យនីតិកម្ម',
      nameEn: 'Custom band colour — checks readable-ink contrast',
    },
  },
  {
    id: 'unit-simple',
    type: 'orgNode',
    position: { x: 40, y: 420 },
    data: {
      orgType: 'simple',
      name: 'ការិយាល័យរដ្ឋបាល',
      nameEn: 'Simple node, no badge label',
    },
  },
  {
    id: 'person-head',
    type: 'orgNode',
    position: { x: 430, y: 440 },
    data: {
      orgType: 'individualNode',
      type: 'head',
      name: 'លោក សុខ សុភា',
      nameEn: 'Sok Sophea',
      position: 'ប្រធាននាយកដ្ឋាន',
    },
  },
  {
    id: 'person-resized',
    type: 'orgNode',
    position: { x: 780, y: 440 },
    width: 260,
    height: 210,
    data: {
      orgType: 'individualNode',
      type: 'deputy',
      name: 'លោកស្រី ចាន់ សុភាព',
      nameEn: 'Resized bigger — avatar/team-pill must stay glued to the card',
      position: 'អនុប្រធាននាយកដ្ឋាន',
      // Self-contained neutral silhouette placeholder (no external network
      // dependency) — reviewing the real photo treatment, not the initials
      // fallback, which is all the other fixtures show.
      photoUrl:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%238ba892'/%3E%3Ccircle cx='100' cy='78' r='38' fill='%23f4f7f5'/%3E%3Cpath d='M30 190c0-46 31-72 70-72s70 26 70 72' fill='%23f4f7f5'/%3E%3C/svg%3E",
    },
  },
  {
    id: 'person-officer-vacant',
    type: 'orgNode',
    position: { x: 1120, y: 440 },
    data: {
      orgType: 'individualNode',
      type: 'officer',
      name: '',
      nameEn: '',
      position: 'មន្ត្រី',
    },
  },
];

const initialEdges = [
  { id: 'e-root-wide', source: 'unit-root', target: 'unit-resized-wide', ...DEFAULT_EDGE_OPTIONS },
  { id: 'e-root-tall', source: 'unit-root', target: 'unit-resized-tall', ...DEFAULT_EDGE_OPTIONS },
  { id: 'e-root-colored', source: 'unit-root', target: 'unit-colored', ...DEFAULT_EDGE_OPTIONS },
  { id: 'e-colored-simple', source: 'unit-colored', target: 'unit-simple', ...DEFAULT_EDGE_OPTIONS },
  { id: 'e-colored-head', source: 'unit-colored', target: 'person-head', ...DEFAULT_EDGE_OPTIONS },
  { id: 'e-head-resized', source: 'person-head', target: 'person-resized', ...DEFAULT_EDGE_OPTIONS },
  { id: 'e-head-vacant', source: 'person-head', target: 'person-officer-vacant', ...DEFAULT_EDGE_OPTIONS },
];

function ChartEditorTestHarness() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { fitView, getZoom, setCenter, getNodes } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [saveStatus, setSaveStatus] = useState('');
  const [guides, setGuides] = useState({ guideX: null, guideY: null });

  // ── Selection / UI chrome state (mirrors FlowApp.jsx) ──────────────────
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [searchHighlights, setSearchHighlights] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [layoutDir, setLayoutDir] = useState('TB');
  const [shiftHeld, setShiftHeld] = useState(false);
  const [clipboard, setClipboard] = useState(null);
  const lastSyncData = useRef({ nodes: '[]', edges: '[]' });

  const { nodesRef, edgesRef, takeSnapshot, undo, redo, canUndo, canRedo } =
    useChartHistory(nodes, edges, setNodes, setEdges);

  const {
    onNodeDragStart,
    onConnect,
    onReconnect,
    updateSelectedNodes,
    updateEdgeProperties,
    deleteNodes,
    duplicateNodes,
    addChildNode: addChildNodeRaw,
    addRootNode: addRootNodeRaw,
    autoLayout: autoLayoutRaw,
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

  const { downloadChartBackup, restoreChartBackup } = useChartBackupOps({
    chartId: TEST_CHART_ID,
    chartName: 'Test Chart',
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
  const backupFileInputRef = useRef(null);

  // Creating a node is itself an explicit edit action, so (unlike a plain
  // click) it should open the properties panel — same wrapper FlowApp.jsx
  // uses around the raw hook functions.
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

  // ── Copy / paste (inline in FlowApp.jsx too, not part of useNodeOperations) ──
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

  const showConfirm = useCallback((title, message, onConfirm, danger = false) => {
    setConfirmModal({ title, message, onConfirm, danger });
  }, []);

  // ── Selection / click / context-menu handlers (mirrors FlowApp.jsx,
  // minus LinkedChartPopup and staff-profile viewing — both need a real
  // chart/staff record this route has no backend to resolve) ────────────
  const onSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }) => {
    setSelectedNodes(selNodes);
    setSelectedEdge(selEdges.length === 1 ? selEdges[0] : null);
  }, []);

  const blurActiveField = () => {
    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA')
    ) {
      document.activeElement.blur();
    }
  };

  const onNodeClick = useCallback(() => {
    blurActiveField();
    setContextMenu(null);
    // A plain click only selects (for drag/copy/delete/shortcuts) — it must
    // not surface the properties panel. Only an explicit edit action does.
    setShowNodePanel(false);
  }, []);

  const onEdgeClick = useCallback(() => {
    blurActiveField();
  }, []);

  const onPaneClick = useCallback(() => {
    blurActiveField();
    setContextMenu(null);
    setShowNodePanel(false);
  }, []);

  const onNodeContextMenu = useCallback((evt, node) => {
    blurActiveField();
    evt.preventDefault();
    setContextMenu({ x: evt.clientX, y: evt.clientY, nodeId: node.id });
  }, []);

  const onEdgeDoubleClick = useCallback(
    (_evt, edge) => {
      takeSnapshot();
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      setSelectedEdge(null);
    },
    [setEdges, takeSnapshot],
  );

  const deleteSelection = useCallback(() => {
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
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }, [selectedNodes, selectedEdge, deleteNodes, setEdges, takeSnapshot, showConfirm]);

  const simulateSave = useCallback(() => {
    setSaveStatus('saving');
    window.setTimeout(() => setSaveStatus('saved'), 900);
    window.setTimeout(() => setSaveStatus(''), 2600);
  }, []);

  useChartShortcuts(true, {
    undo,
    redo,
    save: simulateSave,
    toggleSearch: () => setShowSearch((s) => !s),
    toggleHelp: () => setShowShortcuts((s) => !s),
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
    deleteSelection,
    setShiftHeld,
  });

  // Smart guides: snap the dragged node onto any sibling's edge/centre line
  // — or the position grid — the moment it's within tolerance, and surface
  // whichever matched for AlignmentGuides to render. Grid and sibling
  // alignment are ONE pool of candidates (see nodeAlignment.js), not grid
  // snapping unconditionally and guides layered on top: React Flow's own
  // snapToGrid is deliberately OFF (no snapToGrid/snapGrid props below) so
  // movement is free everywhere except near an actual candidate line — the
  // "canvas defines a place for it" rigidity this replaces, and the reason
  // an unconditional grid round could put a node's position permanently
  // out of a sibling's alignment tolerance (half a 20px cell can easily
  // exceed a 6px threshold) even though the two were dragged visually
  // together.
  //
  // Applied in BOTH onNodeDrag and onNodeDragStop, not just the former:
  // xyflow's drag-end (mouseup) doesn't fire another onNodeDrag before
  // onNodeDragStop, so a build that only snapped in onNodeDrag left the
  // FINAL dropped position wherever the pointer released — every guide
  // during the drag was cosmetically correct and the one position a user
  // actually looks at afterward was not.
  const applyAlignmentSnap = useCallback(
    (node) => {
      const dragged = {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? node.width ?? 0,
        height: node.measured?.height ?? node.height ?? 0,
      };
      const others = nodes
        .filter((n) => n.id !== node.id)
        .map((n) => ({
          x: n.position.x,
          y: n.position.y,
          width: n.measured?.width ?? n.width ?? 0,
          height: n.measured?.height ?? n.height ?? 0,
        }));

      const threshold = ALIGNMENT_THRESHOLD_PX / getZoom();
      const { deltaX, deltaY, guideX, guideY } = getNodeAlignmentGuides(dragged, others, threshold, GRID_SIZE);

      setGuides({ guideX, guideY });

      if (deltaX !== 0 || deltaY !== 0) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? { ...n, position: { x: n.position.x + deltaX, y: n.position.y + deltaY } }
              : n,
          ),
        );
      }
    },
    [nodes, setNodes, getZoom],
  );

  const onNodeDrag = useCallback(
    (_event, node) => applyAlignmentSnap(node),
    [applyAlignmentSnap],
  );

  const onNodeDragStop = useCallback(
    (_event, node) => {
      applyAlignmentSnap(node);
      setGuides({ guideX: null, guideY: null });
    },
    [applyAlignmentSnap],
  );

  // The real production path (same layoutUtils.js), not a stub — this is
  // what actually proves whether a crooked parent/child connector is a
  // centring bug in the algorithm or just this page's hand-placed fixture
  // coordinates never having been run through it.
  const autoLayout = useCallback(() => {
    autoLayoutRaw();
    window.setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [autoLayoutRaw, fitView]);

  const handleFlyTo = useCallback(
    (node) => {
      setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.2, duration: 600 });
    },
    [setCenter],
  );

  // ── Collapse-aware visible set + child/team counts (same derivation
  // FlowApp.jsx uses — collapsing a node here now actually hides its
  // subtree instead of the child-count/team-size pills being fixed
  // fixture numbers that never moved). ───────────────────────────────────
  const { visibleNodes, visibleEdges, childCounts, teamSizes } = useMemo(
    () => computeChartHierarchy(nodes, edges, collapsedNodes),
    [nodes, edges, collapsedNodes],
  );

  const chartContextValue = useMemo(
    () => ({ childCounts, collapsedNodes, searchHighlights, teamSizes }),
    [childCounts, collapsedNodes, searchHighlights, teamSizes],
  );

  const panelOpen = (selectedNodes.length > 0 && showNodePanel) || !!selectedEdge;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}>
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
        isOwner={false}
        onShareOpen={() => {}}
        canEdit
        onDownloadBackup={downloadChartBackup}
        onRestoreBackup={() => backupFileInputRef.current?.click()}
        onPreviewMode={() => {}}
        toggleTheme={toggleTheme}
        theme={theme}
        onSave={simulateSave}
        saveStatus={saveStatus}
        navigate={navigate}
      />
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <ChartContext.Provider value={chartContextValue}>
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onSelectionChange={onSelectionChange}
            multiSelectionKeyCode="Shift"
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
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
            nodesDraggable
            nodesConnectable
            elementsSelectable
            edgesFocusable
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.05}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color={theme === 'dark' ? 'rgba(238,242,239,0.14)' : 'rgba(22,33,27,0.16)'}
              gap={20}
              size={1}
            />
            <AlignmentGuides guideX={guides.guideX} guideY={guides.guideY} />
            <Controls />
            <MiniMap
              nodeColor={(n) => n.data?.color || (theme === 'dark' ? '#6b7280' : '#0a0a0a')}
              nodeStrokeWidth={0}
            />
            <Panel position="top-left" style={{ pointerEvents: 'none' }}>
              <div className="hint-chip">
                Design preview — full local editing, not connected to Supabase
              </div>
            </Panel>
          </ReactFlow>
        </ChartContext.Provider>

        {panelOpen && (
          <PropertiesPanel
            chartId={null}
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
                setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
                setSelectedEdge(null);
              }
            }}
            onClose={() => {
              setSelectedNodes([]);
              setSelectedEdge(null);
              setShowNodePanel(false);
            }}
            onSave={() => {
              setSelectedNodes([]);
              setSelectedEdge(null);
              setShowNodePanel(false);
              setNodes((nds) => nds.map((n) => (n.selected ? { ...n, selected: false } : n)));
            }}
            onViewStaffProfile={() => {}}
            charts={[]}
          />
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isCollapsed={collapsedNodes.has(contextMenu.nodeId)}
          onEdit={() => {
            const n = nodes.find((nd) => nd.id === contextMenu.nodeId);
            if (n) {
              setSelectedNodes([n]);
              setSelectedEdge(null);
              setNodes((nds) => nds.map((node) => ({ ...node, selected: node.id === n.id })));
              setShowNodePanel(true);
            }
          }}
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
                setEdges((eds) => eds.filter((e) => e.source !== targetId && e.target !== targetId));
                setConfirmModal(null);
              },
              true,
            );
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

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

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

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
      />
    </div>
  );
}

export default function ChartEditorTestPage() {
  return (
    <ReactFlowProvider>
      <ChartEditorTestHarness />
    </ReactFlowProvider>
  );
}
