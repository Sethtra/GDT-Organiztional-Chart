import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  ConnectionMode,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  reconnectEdge,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import "@xyflow/react/dist/style.css";

import OrgNode from "./components/OrgNode";
import PropertiesPanel from "./components/PropertiesPanel";
import { initialNodes, initialEdges } from "./data/initialData";
import { getLayoutedElements } from "./utils/layoutUtils";

const nodeTypes = { orgNode: OrgNode };

const STORAGE_KEY = "gdt-flow-v2";

const DEFAULT_EDGE_OPTIONS = {
  type: "smoothstep",
  animated: false,
  style: { stroke: "#4b8fd4", strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#4b8fd4" },
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.nodes?.length) return parsed;
    }
  } catch {}
  return null;
}

function getInitialData() {
  const stored = loadFromStorage();
  if (stored) return stored;
  return getLayoutedElements(initialNodes, initialEdges, "TB");
}

function FlowApp() {
  const { getNodes } = useReactFlow();
  const { nodes: initN, edges: initE } = getInitialData();
  const [nodes, setNodes, onNodesChange] = useNodesState(initN);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initE);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [layoutDir, setLayoutDir] = useState("TB");
  const [previewMode, setPreviewMode] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);

  // ── Undo/Redo State ──────────────────────────────────────────
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const takeSnapshot = useCallback(() => {
    setPast((p) => [...p.slice(-30), { nodes, edges }]);
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((p) => p.slice(0, p.length - 1));
    setFuture((f) => [{ nodes, edges }, ...f]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [past, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);

  // Keyboard listeners for undo/redo and shift
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Shift") setShiftHeld(true);

      // Ignore if user is typing in an input or textarea
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (e.key === "y") {
          e.preventDefault();
          redo();
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "Shift") setShiftHeld(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [undo, redo]);

  // Persist whenever nodes/edges change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  // Sync selectedNode/Edge data when nodes/edges update
  useEffect(() => {
    if (selectedNode) {
      const fresh = nodes.find((n) => n.id === selectedNode.id);
      if (fresh) setSelectedNode(fresh);
    }
    if (selectedEdge) {
      const freshEdge = edges.find((e) => e.id === selectedEdge.id);
      if (freshEdge) setSelectedEdge(freshEdge);
    }
  }, [nodes, edges]);

  // ── Handlers ─────────────────────────────────────────────────
  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onConnect = useCallback(
    (params) => {
      takeSnapshot();
      setEdges((eds) => addEdge({ ...params, ...DEFAULT_EDGE_OPTIONS }, eds));
    },
    [setEdges, takeSnapshot]
  );

  const onEdgeUpdate = useCallback(
    (oldEdge, newConnection) => {
      takeSnapshot();
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
    },
    [setEdges, takeSnapshot]
  );

  const onNodeClick = useCallback((_evt, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_evt, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const updateNode = useCallback((id, data) => {
    takeSnapshot();
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
    );
  }, [setNodes, takeSnapshot]);

  const updateEdgeProperties = useCallback((id, edgeData) => {
    takeSnapshot();
    setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, ...edgeData } : e)));
  }, [setEdges, takeSnapshot]);

  const deleteNode = useCallback((id) => {
    takeSnapshot();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges, takeSnapshot]);

  const addChildNode = useCallback((parentId, orgType) => {
    takeSnapshot();
    const parent = nodes.find((n) => n.id === parentId);
    if (!parent) return;

    const newId = `node-${Date.now()}`;
    const colorMap = {
      ministry: "#0f2044", department: "#0e7d6e",
      division: "#1e5799", office: "#0369a1",
    };

    const newNode = {
      id: newId,
      type: "orgNode",
      position: {
        x: parent.position.x + (Math.random() * 60 - 30),
        y: parent.position.y + 180,
      },
      data: {
        name: "ថ្មី",
        nameEn: "New Node",
        orgType,
        color: colorMap[orgType] || "#1e5799",
        description: "",
      },
    };

    const newEdge = {
      id: `e-${parentId}-${newId}`,
      source: parentId,
      target: newId,
      ...DEFAULT_EDGE_OPTIONS,
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
    setSelectedNode(newNode);
  }, [nodes, setNodes, setEdges, takeSnapshot]);

  const addRootNode = useCallback(() => {
    takeSnapshot();
    const newId = `node-${Date.now()}`;
    const newNode = {
      id: newId,
      type: "orgNode",
      position: { x: Math.random() * 600 - 300, y: -200 },
      data: {
        name: "ថ្មី",
        nameEn: "New Node",
        orgType: "department",
        color: "#1e5799",
        description: "",
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
  }, [setNodes, takeSnapshot]);

  const autoLayout = useCallback(() => {
    takeSnapshot();
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, layoutDir);
    setNodes(ln);
    setEdges(le);
  }, [nodes, edges, layoutDir, setNodes, setEdges, takeSnapshot]);

  const toggleLayout = useCallback(() => {
    takeSnapshot();
    const nextDir = layoutDir === "TB" ? "LR" : "TB";
    setLayoutDir(nextDir);
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, nextDir);
    setNodes(ln);
    setEdges(le);
  }, [layoutDir, nodes, edges, setNodes, setEdges, takeSnapshot]);

  const resetToDefault = useCallback(() => {
    if (window.confirm("Reset all data to the default GDT structure?")) {
      takeSnapshot();
      localStorage.removeItem(STORAGE_KEY);
      const { nodes: dn, edges: de } = getLayoutedElements(initialNodes, initialEdges, "TB");
      setNodes(dn);
      setEdges(de);
      setSelectedNode(null);
      setLayoutDir("TB");
    }
  }, [setNodes, setEdges, takeSnapshot]);

  const onEdgeDoubleClick = useCallback((evt, edge) => {
    takeSnapshot();
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    setSelectedEdge(null);
  }, [setEdges, takeSnapshot]);

  const downloadImage = useCallback(() => {
    const currentNodes = getNodes();
    if (currentNodes.length === 0) return;

    const nodesBounds = getNodesBounds(currentNodes);
    const imageWidth = 1920;
    const imageHeight = 1080;
    
    const viewport = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.1, // min zoom
      2,   // max zoom
      0.1  // padding
    );

    const el = document.querySelector(".react-flow__viewport");
    
    toPng(el, {
      backgroundColor: "#0f2044",
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl) => {
      const a = document.createElement("a");
      a.setAttribute("download", "org-chart.png");
      a.setAttribute("href", dataUrl);
      a.click();
    });
  }, [getNodes]);

  return (
    <div className={`app-wrapper ${previewMode ? "preview-mode" : ""}`}>
      {/* ── Header ─────────────────────────────────────── */}
      {!previewMode && (
      <header className="app-header">
        <div className="header-brand">
          <span className="header-emblem">🏛️</span>
          <div>
            <div className="header-title-kh">ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ</div>
            <div className="header-title-en">Ministry of Economy and Finance — GDT Org Chart</div>
          </div>
        </div>

        <div className="header-toolbar">
          <button className="tb-btn tb-btn--primary" onClick={addRootNode} title="Add a standalone node">
            <span>＋</span> Add Node
          </button>
          <button className="tb-btn" onClick={autoLayout} title="Re-run auto layout">
            ⬡ Auto Layout
          </button>
          <button className="tb-btn" onClick={toggleLayout} title="Toggle TB ↔ LR">
            {layoutDir === "TB" ? "↕ Vertical" : "↔ Horizontal"}
          </button>
          <div className="tb-divider" />
          <button className="tb-btn" onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)">
            ↶ Undo
          </button>
          <button className="tb-btn" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)">
            ↷ Redo
          </button>
          <div className="tb-divider" />
          <button className="tb-btn tb-btn--primary" onClick={() => { setPreviewMode(true); setSelectedNode(null); }} style={{ background: "#0ea5e9" }}>
            👁 Preview
          </button>
          <button className="tb-btn tb-btn--danger" onClick={resetToDefault}>
            ↺ Reset
          </button>
        </div>
      </header>
      )}

      {/* ── Preview Toolbar ────────────────────────────── */}
      {previewMode && (
        <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10, display: "flex", gap: 10 }}>
          <button className="tb-btn tb-btn--primary" onClick={downloadImage}>
            ⬇ Download PNG
          </button>
          <button className="tb-btn tb-btn--danger" onClick={() => setPreviewMode(false)}>
            ✕ Exit Preview
          </button>
        </div>
      )}

      {/* ── Canvas + Panel ─────────────────────────────── */}
      <div className="canvas-wrapper">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onConnect={onConnect}
          onEdgeUpdate={onEdgeUpdate}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          connectionMode={ConnectionMode.Loose}
          edgesUpdatable={true}
          connectionRadius={shiftHeld ? 150 : 20}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          {/* Dot-grid background */}
          {!previewMode && <Background color="#ffffff18" gap={24} size={1.5} />}

          {/* Bottom-left controls (zoom in/out/fit) */}
          {!previewMode && (
          <Controls
            style={{
              background: "rgba(15,32,68,.85)",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 8,
            }}
          />
          )}

          {/* Mini-map */}
          {!previewMode && (
          <MiniMap
            nodeColor={(n) => n.data?.color || "#1e5799"}
            maskColor="rgba(0,0,0,0.65)"
            style={{
              background: "rgba(15,32,68,.85)",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 8,
            }}
          />
          )}

          {/* Keyboard shortcut hint */}
          {!previewMode && (
          <Panel position="top-right" style={{ pointerEvents: "none" }}>
            <div className="hint-chip">
              Click node to edit &nbsp;·&nbsp; Drag handle to connect &nbsp;·&nbsp; Scroll to zoom
            </div>
          </Panel>
          )}
        </ReactFlow>

        {/* ── Properties Panel ───────────────────────────── */}
        {(selectedNode || selectedEdge) && (
          <PropertiesPanel
            node={selectedNode}
            edge={selectedEdge}
            onUpdateNode={updateNode}
            onUpdateEdge={updateEdgeProperties}
            onDeleteNode={deleteNode}
            onDeleteEdge={(id) => { takeSnapshot(); setEdges((eds) => eds.filter((e) => e.id !== id)); setSelectedEdge(null); }}
            onAddChild={addChildNode}
            onClose={() => { setSelectedNode(null); setSelectedEdge(null); }}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowApp />
    </ReactFlowProvider>
  );
}
