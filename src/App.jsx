import { useCallback, useEffect, useState, useRef, useMemo, createContext } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  ConnectionMode,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
  reconnectEdge,
  useViewport,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import "@xyflow/react/dist/style.css";

import {
  Plus, LayoutGrid, ArrowDownUp, ArrowLeftRight,
  Undo2, Redo2, Eye, EyeOff, RotateCcw, Download,
  Search as SearchIcon, Keyboard, CheckCircle2, Loader2, Share2, X,
} from "lucide-react";

import OrgNode from "./components/OrgNode";
import CustomEdge from "./components/CustomEdge";
import PropertiesPanel from "./components/PropertiesPanel";
import ConfirmModal from "./components/ConfirmModal";
import ShareModal from "./components/ShareModal";
import SearchBar from "./components/SearchBar";
import ContextMenu from "./components/ContextMenu";
import ShortcutsModal from "./components/ShortcutsModal";
import StatusBar from "./components/StatusBar";
import { initialNodes, initialEdges } from "./data/initialData";
import { getLayoutedElements } from "./utils/layoutUtils";
import { supabase } from "./supabaseClient";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";

const nodeTypes = { orgNode: OrgNode };
const edgeTypes = { custom: CustomEdge };

const DEFAULT_EDGE_OPTIONS = {
  type: "custom",
  animated: false,
  data: { strokeColor: "#4b8fd4", strokeWidth: 2, arrowType: "closed", arrowStart: "none", label: "" },
};

export const ChartContext = createContext(null);

function FlowApp() {
  const { chartId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getNodes, fitView, setCenter } = useReactFlow();
  const viewport = useViewport();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [chartName, setChartName] = useState("Untitled Chart");
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [layoutDir, setLayoutDir] = useState("TB");
  const [previewMode, setPreviewMode] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const saveTimerRef = useRef(null);

  // New feature states
  const [collapsedNodes, setCollapsedNodes] = useState(new Set());
  const [searchHighlights, setSearchHighlights] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [chartIsPublic, setChartIsPublic] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [linkedChartPopup, setLinkedChartPopup] = useState(null); // { node, x, y }

  const lastSyncData = useRef({ nodes: "[]", edges: "[]" });
  const channelRef = useRef(null);
  const isInteracting = useRef(false);
  const isDirty = useRef(false);

  // ── Undo/Redo ─────────────────────────────────────────────────
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // ── Clipboard ─────────────────────────────────────────────────
  const [clipboard, setClipboard] = useState(null);

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

  // ── Copy/Paste ────────────────────────────────────────────────
  const copyNode = useCallback(() => {
    if (selectedNodes.length > 0) {
      setClipboard(selectedNodes);
    }
  }, [selectedNodes]);

  const pasteNode = useCallback(() => {
    if (!clipboard || clipboard.length === 0) return;
    takeSnapshot();
    
    const idMap = {};
    const newNodes = clipboard.map(n => {
      const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      idMap[n.id] = newId;
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
        selected: true,
      };
    });

    const newEdges = [];
    edges.forEach(e => {
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
      ...nds.map(n => ({ ...n, selected: false })),
      ...newNodes
    ]);
    setEdges((eds) => [...eds, ...newEdges]);
    
    setClipboard(newNodes);
  }, [clipboard, setNodes, setEdges, edges, takeSnapshot]);


  // ── Save status helper ────────────────────────────────────────
  const triggerSave = useCallback(() => {
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus("saved"), 1200);
  }, []);

  // ── Load data + realtime ──────────────────────────────────────
  useEffect(() => {
    if (!chartId) { navigate('/dashboard'); return; }

    async function loadData() {
      const { data } = await supabase
        .from("charts")
        .select("*, chart_shares(access_level, shared_email)")
        .eq("id", chartId)
        .single();

      if (data) {
        setChartName(data.name || "Untitled Chart");
        setChartIsPublic(data.is_public);

        let editAccess = false;
        let ownerStatus = false;
        if (data.owner_id === user?.id) {
          editAccess = true;
          ownerStatus = true;
        }
        else if (data.is_public && data.public_access_level === 'edit') editAccess = true;
        else if (user && data.chart_shares?.some(s => s.shared_email === user.email && s.access_level === 'edit')) {
          editAccess = true;
        }
        setCanEdit(editAccess);
        setIsOwner(ownerStatus);
        if (!editAccess) setPreviewMode(true);

        // Respect empty arrays — don't fall back to GDT template for blank charts
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        lastSyncData.current = { nodes: JSON.stringify(data.nodes || []), edges: JSON.stringify(data.edges || []) };
      } else {
        // Chart not found — go back to dashboard
        navigate('/dashboard');
        return;
      }
      setLoading(false);
    }
    loadData();

    const channel = supabase
      .channel(`chart_room_${chartId}`)
      .on("broadcast", { event: "sync" }, (payload) => {
        if (isInteracting.current || isDirty.current) return;
        if (payload.payload?.nodes) {
          const incomingNodesStr = JSON.stringify(payload.payload.nodes);
          const incomingEdgesStr = JSON.stringify(payload.payload.edges);
          if (incomingNodesStr === lastSyncData.current.nodes && incomingEdgesStr === lastSyncData.current.edges) return;
          
          lastSyncData.current = { nodes: incomingNodesStr, edges: incomingEdgesStr };
          setNodes(payload.payload.nodes);
          setEdges(payload.payload.edges);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "charts", filter: `id=eq.${chartId}` }, (payload) => {
        if (isInteracting.current || isDirty.current) return;
        if (payload.new?.nodes) {
          const incomingNodesStr = JSON.stringify(payload.new.nodes);
          const incomingEdgesStr = JSON.stringify(payload.new.edges);
          if (incomingNodesStr === lastSyncData.current.nodes && incomingEdgesStr === lastSyncData.current.edges) return;

          lastSyncData.current = { nodes: incomingNodesStr, edges: incomingEdgesStr };
          setNodes(payload.new.nodes);
          setEdges(payload.new.edges);
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [chartId, navigate, setNodes, setEdges]);

  // ── Persist on change ─────────────────────────────────────────
  useEffect(() => {
    if (loading || !canEdit) return;
    const nodesStr = JSON.stringify(nodes);
    const edgesStr = JSON.stringify(edges);
    if (nodesStr === lastSyncData.current.nodes && edgesStr === lastSyncData.current.edges) {
      isDirty.current = false;
      return;
    }

    isDirty.current = true;
    triggerSave();

    if (channelRef.current) {
      channelRef.current.send({ type: "broadcast", event: "sync", payload: { nodes, edges } }).catch(() => {});
    }

    const timeoutId = setTimeout(async () => {
      lastSyncData.current = { nodes: nodesStr, edges: edgesStr };
      await supabase.from("charts").update({ nodes, edges, updated_at: new Date().toISOString() }).eq("id", chartId);
      isDirty.current = false;
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [nodes, edges, loading, canEdit, chartId]);

  // ── Sync selected nodes ────────────────────────────────────────
  useEffect(() => {
    if (selectedNodes.length > 0) {
      const ids = new Set(selectedNodes.map(n => n.id));
      const freshNodes = nodes.filter(n => ids.has(n.id) && n.selected);
      if (freshNodes.length !== selectedNodes.length) {
         setSelectedNodes(freshNodes);
      }
    }
    if (selectedEdge) {
      const freshEdge = edges.find((e) => e.id === selectedEdge.id);
      if (freshEdge) setSelectedEdge(freshEdge);
    }
  }, [nodes, edges]);

  // ── Compute visible nodes/edges (collapse) ────────────────────
  const { visibleNodes, visibleEdges, childCounts } = useMemo(() => {
    const hidden = new Set();
    if (collapsedNodes.size > 0) {
      function collectDescendants(nodeId) {
        edges.filter((e) => e.source === nodeId).forEach((e) => {
          if (!hidden.has(e.target)) {
            hidden.add(e.target);
            collectDescendants(e.target);
          }
        });
      }
      collapsedNodes.forEach((id) => collectDescendants(id));
    }

    const cCounts = {};
    edges.forEach((e) => { cCounts[e.source] = (cCounts[e.source] || 0) + 1; });

    const vNodes = nodes.filter((n) => !hidden.has(n.id));
    const vEdges = edges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target));
    
    return { visibleNodes: vNodes, visibleEdges: vEdges, childCounts: cCounts };
  }, [nodes, edges, collapsedNodes]);

  // ── Handlers ──────────────────────────────────────────────────
  const onNodeDragStart = useCallback(() => { isInteracting.current = true; takeSnapshot(); }, [takeSnapshot]);
  const onNodeDragStop  = useCallback(() => { isInteracting.current = false; }, []);

  const onConnect = useCallback((params) => {
    takeSnapshot();
    setEdges((eds) => addEdge({ ...params, ...DEFAULT_EDGE_OPTIONS }, eds));
  }, [setEdges, takeSnapshot]);

  const onReconnect = useCallback((oldEdge, newConnection) => {
    takeSnapshot();
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, [setEdges, takeSnapshot]);

  const onSelectionChange = useCallback(({ nodes, edges }) => {
    setSelectedNodes(nodes);
    setSelectedEdge(edges.length === 1 ? edges[0] : null);
  }, []);

  const onNodeClick = useCallback((evt, node) => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
      document.activeElement.blur();
    }
    setContextMenu(null);
    if (node.data.linkedChartId) {
      setLinkedChartPopup({ node, x: evt.clientX, y: evt.clientY });
    } else {
      setLinkedChartPopup(null);
    }
  }, []);

  const onEdgeClick = useCallback((_evt, edge) => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
      document.activeElement.blur();
    }
  }, []);

  const onPaneClick = useCallback(() => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
      document.activeElement.blur();
    }
    setContextMenu(null);
  }, []);

  const onNodeContextMenu = useCallback((evt, node) => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
      document.activeElement.blur();
    }
    evt.preventDefault();
    setContextMenu({ x: evt.clientX, y: evt.clientY, nodeId: node.id });
    if (!node.selected) {
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));
    }
  }, [setNodes]);

  const updateSelectedNodes = useCallback((data) => {
    takeSnapshot();
    setNodes((nds) => nds.map((n) => (n.selected ? { ...n, data: { ...n.data, ...data } } : n)));
  }, [setNodes, takeSnapshot]);

  const updateEdgeProperties = useCallback((id, edgeData) => {
    takeSnapshot();
    setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, ...edgeData } : e)));
  }, [setEdges, takeSnapshot]);

  const deleteNodes = useCallback(() => {
    takeSnapshot();
    const ids = new Set(selectedNodes.map(n => n.id));
    setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
    setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
  }, [selectedNodes, setNodes, setEdges, takeSnapshot]);

  const duplicateNodes = useCallback((nodesToDuplicate) => {
    if (!nodesToDuplicate || nodesToDuplicate.length === 0) return;
    takeSnapshot();
    
    const idMap = {};
    const newNodes = nodesToDuplicate.map(n => {
      const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      idMap[n.id] = newId;
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
        selected: true,
      };
    });

    const newEdges = [];
    edges.forEach(e => {
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
      ...nds.map(n => ({ ...n, selected: false })),
      ...newNodes
    ]);
    setEdges((eds) => [...eds, ...newEdges]);
  }, [edges, setNodes, setEdges, takeSnapshot]);

  // ── Keyboard shortcuts ────────────────────────────────────────
  const handleKeyDownRef = useRef();
  
  // Update the ref to the latest closure on every render
  useEffect(() => {
    handleKeyDownRef.current = (e) => {
      if (e.key === "Shift") setShiftHeld(true);
      const inInput = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable;

      // Ignore all diagram shortcuts if typing in a text field
      if (inInput) {
        if (e.key === "Escape") {
          setShowSearch(false);
          setShowShortcuts(false);
          setContextMenu(null);
          if (document.activeElement) document.activeElement.blur();
        }
        return;
      }

      const key = e.key ? e.key.toLowerCase() : "";
      const code = e.code || "";

      if (e.ctrlKey || e.metaKey) {
        if (key === "z" || code === "KeyZ") {
          e.preventDefault();
          if (e.shiftKey) redo(); else undo();
        } else if (key === "y" || code === "KeyY") {
          e.preventDefault();
          redo();
        } else if (key === "f" || code === "KeyF") {
          e.preventDefault();
          setShowSearch((v) => !v);
        } else if (key === "d" || code === "KeyD") {
          e.preventDefault();
          if (selectedNodes.length > 0) duplicateNodes(selectedNodes);
        } else if (key === "c" || code === "KeyC") {
          e.preventDefault();
          copyNode();
        } else if (key === "v" || code === "KeyV") {
          e.preventDefault();
          pasteNode();
        }
        return;
      }

      if (e.key === "?" || e.key === "/") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setShowShortcuts(false);
        setContextMenu(null);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodes.length > 0) {
          showConfirm("Delete Nodes", `Delete ${selectedNodes.length} node(s) and all connections?`, () => { 
            deleteNodes(); 
            setConfirmModal(null); 
          }, true);
        } else if (selectedEdge) {
          takeSnapshot();
          setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
        }
      }
    };
  });

  useEffect(() => {
    const handleKeyDown = (e) => handleKeyDownRef.current?.(e);
    const handleKeyUp = (e) => { if (e.key === "Shift") setShiftHeld(false); };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);


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
      position: { x: parent.position.x + (Math.random() * 60 - 30), y: parent.position.y + 180 },
      data: { name: "ថ្មី", nameEn: "New Node", orgType, color: colorMap[orgType] || "#1e5799", description: "" },
    };
    const newEdge = { id: `e-${parentId}-${newId}`, source: parentId, target: newId, ...DEFAULT_EDGE_OPTIONS };
    setNodes((nds) => [...nds.map(n => ({...n, selected: false})), { ...newNode, selected: true }]);
    setEdges((eds) => [...eds, newEdge]);
    // Expand parent if collapsed
    setCollapsedNodes((prev) => { const s = new Set(prev); s.delete(parentId); return s; });
  }, [nodes, setNodes, setEdges, takeSnapshot]);

  const addRootNode = useCallback(() => {
    takeSnapshot();
    const newId = `node-${Date.now()}`;
    const newNode = {
      id: newId, type: "orgNode",
      position: { x: Math.random() * 600 - 300, y: -200 },
      data: { name: "ថ្មី", nameEn: "New Node", orgType: "department", color: "#1e5799", description: "" },
      selected: true
    };
    setNodes((nds) => [...nds.map(n => ({...n, selected: false})), newNode]);
  }, [setNodes, takeSnapshot]);

  const autoLayout = useCallback(() => {
    takeSnapshot();
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, layoutDir);
    setNodes(ln); setEdges(le);
  }, [nodes, edges, layoutDir, setNodes, setEdges, takeSnapshot]);

  const toggleLayout = useCallback(() => {
    takeSnapshot();
    const nextDir = layoutDir === "TB" ? "LR" : "TB";
    setLayoutDir(nextDir);
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, nextDir);
    setNodes(ln); setEdges(le);
  }, [layoutDir, nodes, edges, setNodes, setEdges, takeSnapshot]);

  const toggleCollapse = useCallback((nodeId) => {
    setCollapsedNodes((prev) => {
      const s = new Set(prev);
      if (s.has(nodeId)) s.delete(nodeId); else s.add(nodeId);
      return s;
    });
  }, []);

  const showConfirm = (title, message, onConfirm, danger = false) => {
    setConfirmModal({ title, message, onConfirm, danger });
  };

  const resetToDefault = useCallback(() => {
    showConfirm(
      "Reset to Default",
      "This will replace the entire chart with the default GDT structure. This cannot be undone.",
      async () => {
        takeSnapshot();
        const { nodes: dn, edges: de } = getLayoutedElements(initialNodes, initialEdges, "TB");
        setNodes(dn); setEdges(de);
        setLayoutDir("TB");
        setCollapsedNodes(new Set());
        await supabase.from("charts").update({ nodes: dn, edges: de, updated_at: new Date().toISOString() }).eq("id", chartId);
        setConfirmModal(null);
      },
      true
    );
  }, [setNodes, setEdges, takeSnapshot, chartId]);

  const onEdgeDoubleClick = useCallback((evt, edge) => {
    takeSnapshot();
    setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    setSelectedEdge(null);
  }, [setEdges, takeSnapshot]);

  const downloadImage = useCallback(() => {
    const currentNodes = getNodes();
    if (currentNodes.length === 0) return;
    const nodesBounds = getNodesBounds(currentNodes);
    const imageWidth = 1920, imageHeight = 1080;
    const viewport = getViewportForBounds(nodesBounds, imageWidth, imageHeight, 0.1, 2, 0.1);
    const el = document.querySelector(".react-flow__viewport");
    toPng(el, {
      backgroundColor: "#0f2044",
      width: imageWidth, height: imageHeight,
      style: { width: `${imageWidth}px`, height: `${imageHeight}px`, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` },
    }).then((dataUrl) => {
      const a = document.createElement("a");
      a.setAttribute("download", "org-chart.png");
      a.setAttribute("href", dataUrl);
      a.click();
    });
  }, [getNodes]);

  // Search fly-to
  const handleFlyTo = useCallback((node) => {
    setCenter(node.position.x + 100, node.position.y + 50, { zoom: 1.2, duration: 600 });
  }, [setCenter]);

  const panelOpen = !previewMode && (selectedNodes.length > 0 || selectedEdge);

  return (
    <div className={`app-wrapper ${previewMode ? "preview-mode" : ""}`}>

      {/* ── Header ────────────────────────────────────────── */}
      {!previewMode && (
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              className="tb-btn tb-btn--icon"
              onClick={() => navigate('/dashboard')}
              title="Back to Dashboard"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div className="tb-divider" style={{ height: 24, margin: 0 }} />
            <div className="header-brand">
              <img
                src="/GDT Logo (Soft).png"
                alt="GDT - General Department of Taxation"
                style={{ height: 36, objectFit: 'contain' }}
              />
            </div>
          </div>

          <div className="header-toolbar">
            {/* Edit group */}
            <button className="tb-btn tb-btn--primary" onClick={addRootNode} title="Add Node">
              <Plus size={14} /> Add Node
            </button>
            <button className="tb-btn tb-btn--icon" onClick={autoLayout} title="Auto Layout">
              <LayoutGrid size={15} />
            </button>
            <button className="tb-btn tb-btn--icon" onClick={toggleLayout} title={layoutDir === "TB" ? "Vertical Layout" : "Horizontal Layout"}>
              {layoutDir === "TB" ? <ArrowDownUp size={15} /> : <ArrowLeftRight size={15} />}
            </button>

            <div className="tb-divider" />

            {/* History group */}
            <button className="tb-btn tb-btn--icon" onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)">
              <Undo2 size={15} />
            </button>
            <button className="tb-btn tb-btn--icon" onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)">
              <Redo2 size={15} />
            </button>

            <div className="tb-divider" />

            {/* Utility group */}
            <button className="tb-btn tb-btn--icon" onClick={() => setShowSearch(true)} title="Search (Ctrl+F)">
              <SearchIcon size={15} />
            </button>
            <button className="tb-btn tb-btn--icon" onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)">
              <Keyboard size={15} />
            </button>

            <div className="tb-divider" />

            {isOwner && (
              <button
                className="tb-btn tb-btn--primary"
                style={{ background: '#7c3aed' }}
                onClick={() => setShowShare(true)}
                title="Share chart"
              >
                <Share2 size={14} /> Share
              </button>
            )}
            <button
              className="tb-btn tb-btn--primary"
              style={{ background: "#0ea5e9" }}
              onClick={() => { setPreviewMode(true); setSelectedNode(null); }}
              title="Preview mode"
            >
              <Eye size={14} /> Preview
            </button>
            <button className="tb-btn tb-btn--danger tb-btn--icon" onClick={resetToDefault} title="Reset to default GDT chart">
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Save badge */}
          <div className={`save-badge ${saveStatus === "saving" ? "save-badge--saving" : saveStatus === "saved" ? "save-badge--saved" : ""}`}>
            {saveStatus === "saving" && <Loader2 size={12} className="save-spin" />}
            {saveStatus === "saved" && <CheckCircle2 size={12} />}
            <span>{saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : ""}</span>
          </div>
        </header>
      )}

      {/* ── Preview Controls ─────────────────────────────── */}
      {previewMode && (
        <>
          {/* Back button for Viewers */}
          {!canEdit && (
            <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
              <button 
                className="tb-btn" 
                onClick={() => navigate('/')}
                style={{ 
                  background: 'rgba(15, 32, 68, 0.85)', 
                  color: 'white', 
                  display: 'flex', 
                  alignItems: 'center',
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Back to Home
              </button>
            </div>
          )}
          
          <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10, display: "flex", gap: 10 }}>
            {/* Show read-only badge if they lack edit access */}
            {!canEdit && (
              <div style={{ background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 12px', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                <Eye size={14} style={{ marginRight: 6 }} /> Read Only
              </div>
            )}
            <button className="tb-btn tb-btn--primary" onClick={downloadImage}>
              <Download size={14} /> Download PNG
            </button>
            {canEdit && (
              <button className="tb-btn tb-btn--danger" onClick={() => setPreviewMode(false)}>
                <EyeOff size={14} /> Exit Preview
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Main Content Area ────────────────────────────── */}
      <div className="main-content" style={{ display: 'flex', flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div className={`canvas-wrapper ${panelOpen ? "panel-open" : ""}`}>
          {loading ? (
            <div className="loading-screen">
              <div className="loading-spinner" />
              <span>Loading from cloud...</span>
            </div>
          ) : (
            <>
              <ChartContext.Provider value={{ childCounts, collapsedNodes, searchHighlights }}>
                <ReactFlow
                  nodes={visibleNodes}
                  edges={visibleEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                onSelectionChange={onSelectionChange}
                multiSelectionKeyCode="Shift"
                onNodeDragStart={onNodeDragStart}
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
                {!previewMode && <Background variant={BackgroundVariant.Dots} color="#ffffff22" gap={20} size={1.5} />}
                {!previewMode && (
                  <Controls style={{ background: "rgba(15,32,68,.85)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }} />
                )}
                {!previewMode && (
                  <MiniMap
                    nodeColor={(n) => n.data?.color || "#1e5799"}
                    maskColor="rgba(0,0,0,0.65)"
                    style={{ background: "rgba(15,32,68,.85)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
                  />
                )}
                {!previewMode && canEdit && (
                  <Panel position="top-right" style={{ pointerEvents: "none" }}>
                    <div className="hint-chip">
                      Right-click node for menu &nbsp;·&nbsp; Ctrl+F to search &nbsp;·&nbsp; ? for shortcuts
                    </div>
                  </Panel>
                )}
              </ReactFlow>
              </ChartContext.Provider>

              {/* Status Bar */}
              {!previewMode && (
                <StatusBar
                  nodeCount={nodes.length}
                  edgeCount={edges.length}
                  zoom={viewport.zoom}
                  saveStatus={saveStatus}
                />
              )}
            </>
          )}
        </div>

        {/* Properties Panel (Outside canvas-wrapper) */}
        {(selectedNodes.length > 0 || selectedEdge) && !previewMode && (
          <PropertiesPanel
            nodes={selectedNodes}
            edge={selectedEdge}
            onUpdateNodes={updateSelectedNodes}
            onUpdateEdge={updateEdgeProperties}
            onAddChild={(type) => addChildNode(selectedNodes[0]?.id, type)}
            onDelete={() => {
              if (selectedNodes.length > 0) {
                showConfirm("Delete Nodes", `Delete ${selectedNodes.length} node(s) and all connections?`, () => { deleteNodes(); setConfirmModal(null); }, true);
              } else if (selectedEdge) {
                takeSnapshot();
                setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
                setSelectedEdge(null);
              }
            }}
            onClose={() => { setSelectedNodes([]); setSelectedEdge(null); }}
            charts={[]}
          />
        )}
      </div>

      {/* ── Context Menu ─────────────────────────────────── */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={nodes.find((n) => n.id === contextMenu.nodeId)}
          isCollapsed={collapsedNodes.has(contextMenu.nodeId)}
          onEdit={() => {
            const n = nodes.find((nd) => nd.id === contextMenu.nodeId);
            if (n) setSelectedNode(n);
          }}
          onAddChild={() => addChildNode(contextMenu.nodeId, "office")}
          onDuplicate={() => duplicateNode(contextMenu.nodeId)}
          onToggleCollapse={() => toggleCollapse(contextMenu.nodeId)}
          onDelete={() => {
            showConfirm("Delete Node", "Delete this node and all its connections?", () => { deleteNode(contextMenu.nodeId); setConfirmModal(null); }, true);
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
          onClose={() => { setShowSearch(false); setSearchHighlights([]); }}
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
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

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
      {/* ── Linked Chart Popup ───────────────────────────── */}
      {linkedChartPopup && (
        <div
          style={{
            position: 'fixed',
            left: linkedChartPopup.x + 12,
            top: linkedChartPopup.y - 20,
            zIndex: 1000,
            background: 'rgba(10, 18, 40, 0.97)',
            border: '1px solid rgba(14, 125, 110, 0.4)',
            borderRadius: 12,
            padding: '14px 18px',
            minWidth: 220,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,125,110,0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ background: 'rgba(14,125,110,0.2)', padding: 6, borderRadius: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0e7d6e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Linked Chart</div>
              <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{linkedChartPopup.node.data.nameEn || linkedChartPopup.node.data.name}</div>
            </div>
            <button
              onClick={() => setLinkedChartPopup(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
          <button
            onClick={() => { navigate(`/chart/${linkedChartPopup.node.data.linkedChartId}`); setLinkedChartPopup(null); }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #0e7d6e, #0a5c50)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              padding: '9px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open Chart
          </button>
        </div>
      )}
    </div>
  );
}

/** Route guard — redirects to /login if not authenticated */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a1628' }}>
        <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />

          {/* Chart editor — loads by ID */}
          <Route path="/chart/:chartId" element={
            <ProtectedRoute>
              <ReactFlowProvider>
                <FlowApp />
              </ReactFlowProvider>
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
