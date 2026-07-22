import {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
  useContext,
  createContext,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
  Plus,
  LayoutGrid,
  ArrowDownUp,
  ArrowLeftRight,
  Undo2,
  Redo2,
  Eye,
  EyeOff,
  Download,
  Save,
  Sun,
  Moon,
  Search as SearchIcon,
  Keyboard,
  CheckCircle2,
  Loader2,
  Share2,
  X,
} from "lucide-react";

import OrgNode from "./components/OrgNode";
import CustomEdge from "./components/CustomEdge";
import PropertiesPanel from "./components/PropertiesPanel";
import ProfileDrawer from "./components/ProfileDrawer";
import ConfirmModal from "./components/ConfirmModal";
import ShareModal from "./components/ShareModal";
import SearchBar from "./components/SearchBar";
import ContextMenu from "./components/ContextMenu";
import ShortcutsModal from "./components/ShortcutsModal";
import StatusBar from "./components/StatusBar";
import { getLayoutedElements } from "./utils/layoutUtils";
import { supabase } from "./supabaseClient";
import { TYPE_META } from "./data/nodeTypes";
import { mergeHRDataIntoNodes, syncNodeToHRDatabase } from "./utils/hrUtils";
import ErrorBoundary from "./components/ErrorBoundary";
import VersionHistoryModal from "./components/VersionHistoryModal";
import ChartTabBar from "./components/ChartTabBar";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider, useTheme } from "./hooks/useTheme";
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
  data: {
    strokeColor: "#4b8fd4",
    strokeWidth: 2,
    arrowType: "closed",
    arrowStart: "none",
    label: "",
  },
};

// Older/legacy charts (e.g. anything seeded before the GDT template edges
// carried a `type`) can have edges missing `type: "custom"`. Without it,
// React Flow silently falls back to its own built-in edge component, which
// ignores every custom style/dynamic-glue field — the connector renders but
// none of the Properties Panel controls do anything. Backfill on every load
// so old charts self-heal instead of needing a manual data migration.
function normalizeEdges(edges) {
  return (edges || []).map((e) =>
    e.type === "custom"
      ? e
      : {
          ...e,
          type: "custom",
          data: { ...DEFAULT_EDGE_OPTIONS.data, ...e.data },
        },
  );
}

export const ChartContext = createContext(null);

// ── Tab management context ─────────────────────────────────────
// Lives above the router so tab state survives Dashboard↔Chart navigations.
const TabContext = createContext(null);

function TabProvider({ children }) {
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [tabNames, setTabNames] = useState({});

  const openTab = useCallback((chartId) => {
    if (!chartId) return;
    setOpenTabs((tabs) =>
      tabs.includes(chartId) ? tabs : [...tabs, chartId],
    );
    setActiveTabId(chartId);
  }, []);

  const closeTab = useCallback((chartId, navigateFn) => {
    setOpenTabs((tabs) => {
      const next = tabs.filter((id) => id !== chartId);
      // If we closed the active tab, switch to the last remaining one
      setActiveTabId((current) => {
        if (current === chartId) {
          if (next.length === 0) {
            navigateFn?.("/dashboard");
            return null;
          }
          return next[next.length - 1];
        }
        return current;
      });
      return next;
    });
  }, []);

  const setTabName = useCallback((chartId, name) => {
    setTabNames((t) => (t[chartId] === name ? t : { ...t, [chartId]: name }));
  }, []);

  const value = useMemo(
    () => ({ openTabs, activeTabId, tabNames, openTab, closeTab, setActiveTabId, setTabName }),
    [openTabs, activeTabId, tabNames, openTab, closeTab, setTabName],
  );

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

function FlowApp({ chartId, openLinkedChart, onChartName }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { getNodes, fitView, setCenter } = useReactFlow();
  const viewport = useViewport();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [chartName, setChartName] = useState("Untitled Chart");
  // Report the loaded chart's display name up to EditorShell for the tab label.
  useEffect(() => {
    onChartName?.(chartName);
  }, [chartName, onChartName]);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  // Person nodes open as a read-only profile first; Edit switches to the
  // properties panel. Resets to profile view whenever the selection changes.
  const [editingPerson, setEditingPerson] = useState(false);
  const [layoutDir, setLayoutDir] = useState("TB");
  const [previewMode, setPreviewMode] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");

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
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  // Tracks what's currently saved on the server so the persist effect can
  // tell "nothing changed" from "needs saving" without re-sending identical data.
  const lastSyncData = useRef({ nodes: "[]", edges: "[]" });

  // ── Undo/Redo ─────────────────────────────────────────────────
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // ── Clipboard ─────────────────────────────────────────────────
  const [clipboard, setClipboard] = useState(null);

  // Mirrors of the latest nodes/edges so takeSnapshot can stay referentially
  // stable ([] deps) instead of changing identity on every edit. Every
  // callback that depends on takeSnapshot (updateSelectedNodes, onConnect,
  // addChildNode, etc.) was getting a new identity on nearly every render as
  // a result, which cascaded into consumers whose effects list those
  // callbacks as a dependency — e.g. the Properties Panel's autosave effect,
  // which could then fire from selection changes alone, not just real edits.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  const takeSnapshot = useCallback(() => {
    setPast((p) => [
      ...p.slice(-30),
      { nodes: nodesRef.current, edges: edgesRef.current },
    ]);
    setFuture([]);
  }, []);

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
    const newNodes = clipboard.map((n) => {
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

  // ── Save ─────────────────────────────────────────────────────
  // Shared by the debounced autosave effect and the manual Save button, so
  // both a passive edit and a deliberate click go through the same guarded
  // path and report real (not simulated) save status.
  const performSave = useCallback(async () => {
    const nodesStr = JSON.stringify(nodes);
    const edgesStr = JSON.stringify(edges);
    if (
      nodesStr === lastSyncData.current.nodes &&
      edgesStr === lastSyncData.current.edges
    ) {
      setSaveStatus("saved");
      return;
    }

    const prevNodes = JSON.parse(lastSyncData.current.nodes || "[]");
    const prevNodeCount = prevNodes.length;
    const currNodeCount = nodes.length;

    // Guard against accidentally saving a near-empty chart over real data
    // (e.g. a bulk-select-delete misfire).
    if (
      prevNodeCount > 5 &&
      (currNodeCount < 3 || currNodeCount < prevNodeCount * 0.3)
    ) {
      if (
        !window.confirm(
          `Warning: You are about to save a state with only ${currNodeCount} nodes (down from ${prevNodeCount}). This will overwrite your data in the database. Are you absolutely sure you want to proceed?`,
        )
      ) {
        setNodes(prevNodes);
        setEdges(JSON.parse(lastSyncData.current.edges || "[]"));
        setSaveStatus("saved");
        return;
      }
    }

    setSaveStatus("saving");
    lastSyncData.current = { nodes: nodesStr, edges: edgesStr };
    await supabase
      .from("charts")
      .update({ nodes, edges, updated_at: new Date().toISOString() })
      .eq("id", chartId);

    // Auto-save version history every 5 minutes
    const lastVersionTimeStr = localStorage.getItem(
      `last_version_time_${chartId}`,
    );
    const lastVersionTime = lastVersionTimeStr
      ? parseInt(lastVersionTimeStr, 10)
      : 0;
    if (Date.now() - lastVersionTime > 5 * 60 * 1000) {
      await supabase
        .from("chart_versions")
        .insert({ chart_id: chartId, nodes, edges });
      localStorage.setItem(
        `last_version_time_${chartId}`,
        Date.now().toString(),
      );
    }

    // Auto-save thumbnail every 5 minutes (throttled separately)
    const lastThumbTimeStr = localStorage.getItem(`last_thumb_time_${chartId}`);
    const lastThumbTime = lastThumbTimeStr ? parseInt(lastThumbTimeStr, 10) : 0;
    if (Date.now() - lastThumbTime > 5 * 60 * 1000) {
      try {
        const el = document.querySelector(".react-flow__viewport");
        if (el && nodes.length > 0) {
          const { getNodesBounds, getViewportForBounds } = await import("@xyflow/react");
          const currentNodes = nodes;
          const nodesBounds = getNodesBounds(currentNodes);
          const thumbW = 640, thumbH = 360;
          const viewport = getViewportForBounds(nodesBounds, thumbW, thumbH, 0.05, 2, 0.05);
          const dataUrl = await toPng(el, {
            backgroundColor: "#0f2044",
            width: thumbW,
            height: thumbH,
            style: {
              width: `${thumbW}px`,
              height: `${thumbH}px`,
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            },
          });
          // Convert dataUrl to Blob
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const filePath = `${chartId}.png`;
          await supabase.storage.from("thumbnails").upload(filePath, blob, {
            contentType: "image/png",
            upsert: true,
          });
          const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            await supabase.from("charts").update({ thumbnail_url: urlData.publicUrl }).eq("id", chartId);
          }
          localStorage.setItem(`last_thumb_time_${chartId}`, Date.now().toString());
        }
      } catch (thumbErr) {
        console.warn("Thumbnail capture failed (non-critical):", thumbErr);
      }
    }

    setSaveStatus("saved");
  }, [nodes, edges, chartId, setNodes, setEdges]);

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => {
    if (!chartId) {
      navigate("/dashboard");
      return;
    }

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
        } else if (data.is_public && data.public_access_level === "edit")
          editAccess = true;
        else if (
          user &&
          data.chart_shares?.some(
            (s) => s.shared_email === user.email && s.access_level === "edit",
          )
        ) {
          editAccess = true;
        }
        setCanEdit(editAccess);
        setIsOwner(ownerStatus);
        if (!editAccess) setPreviewMode(true);

        // Respect empty arrays — don't fall back to GDT template for blank charts
        // lastSyncData intentionally reflects the RAW saved data (pre-normalization)
        // so the persist effect sees a diff and re-saves the normalized edges,
        // permanently healing any chart saved before edges carried a `type`.
        // Load HR data from relational tables and merge it into the visual nodes
        const mergedNodes = await mergeHRDataIntoNodes(chartId, data.nodes || []);
        
        setNodes(mergedNodes);
        setEdges(normalizeEdges(data.edges));
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
            const serverIsNewer =
              data.updated_at && localBackup.timestamp
                ? new Date(data.updated_at).getTime() >= localBackup.timestamp
                : false;
            const localHasMore =
              (localBackup.nodes?.length || 0) > (data.nodes?.length || 0) ||
              (localBackup.edges?.length || 0) > (data.edges?.length || 0);
            if (!serverIsNewer && localHasMore) {
              if (
                window.confirm(
                  "A local backup was found with unsaved changes not present on the server. Do you want to recover it?",
                )
              ) {
                setNodes(localBackup.nodes);
                setEdges(normalizeEdges(localBackup.edges));
                lastSyncData.current = { nodes: "[]", edges: "[]" }; // Force a resync
              }
            }
          }
        } catch (e) {
          console.error("Error reading local backup", e);
        }
      } else {
        // Chart not found — go back to dashboard
        navigate("/dashboard");
        return;
      }
      setLoading(false);
    }
    loadData();
  }, [chartId, navigate, setNodes, setEdges]);

  // ── Persist on change ─────────────────────────────────────────
  useEffect(() => {
    if (loading || !canEdit) return;
    const nodesStr = JSON.stringify(nodes);
    const edgesStr = JSON.stringify(edges);

    // Save to local storage as a safety net — happens immediately (not
    // debounced) so even an edit that hasn't reached the DB yet is
    // recoverable via the load-time backup check.
    try {
      localStorage.setItem(
        `chart_backup_${chartId}`,
        JSON.stringify({ nodes, edges, timestamp: Date.now() }),
      );
    } catch (e) {
      console.warn("Failed to save to localStorage", e);
    }

    if (
      nodesStr === lastSyncData.current.nodes &&
      edgesStr === lastSyncData.current.edges
    )
      return;

    const timeoutId = setTimeout(() => {
      performSave();
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, loading, canEdit, chartId, performSave]);

  // ── Sync selected nodes ────────────────────────────────────────
  useEffect(() => {
    if (selectedNodes.length > 0) {
      const ids = new Set(selectedNodes.map((n) => n.id));
      const freshNodes = nodes.filter((n) => ids.has(n.id) && n.selected);
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
      if (visiting.has(nodeId)) return 0; // cycle guard — shouldn't happen in a real org tree
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

  // ── Handlers ──────────────────────────────────────────────────
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

  const onSelectionChange = useCallback(({ nodes, edges }) => {
    setSelectedNodes(nodes);
    setSelectedEdge(edges.length === 1 ? edges[0] : null);
    setEditingPerson(false);
  }, []);

  const onNodeClick = useCallback((evt, node) => {
    if (
      document.activeElement &&
      (document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA")
    ) {
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
    if (
      document.activeElement &&
      (document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA")
    ) {
      document.activeElement.blur();
    }
  }, []);

  const onPaneClick = useCallback(() => {
    if (
      document.activeElement &&
      (document.activeElement.tagName === "INPUT" ||
        document.activeElement.tagName === "TEXTAREA")
    ) {
      document.activeElement.blur();
    }
    setContextMenu(null);
  }, []);

  const onNodeContextMenu = useCallback(
    (evt, node) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA")
      ) {
        document.activeElement.blur();
      }
      evt.preventDefault();
      setContextMenu({ x: evt.clientX, y: evt.clientY, nodeId: node.id });
      if (!node.selected) {
        setNodes((nds) =>
          nds.map((n) => ({ ...n, selected: n.id === node.id })),
        );
      }
    },
    [setNodes],
  );

  const updateSelectedNodes = useCallback(
    (data) => {
      takeSnapshot();
      setNodes((nds) =>
        nds.map((n) => {
          if (n.selected) {
            const updatedNode = { ...n, data: { ...n.data, ...data } };
            // Sync to HR database in the background if it's an HR node
            syncNodeToHRDatabase(chartId, user?.id, updatedNode);
            return updatedNode;
          }
          return n;
        })
      );
    },
    [setNodes, takeSnapshot, chartId, user?.id],
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

  // ── Keyboard shortcuts ────────────────────────────────────────
  const handleKeyDownRef = useRef();

  // Update the ref to the latest closure on every render
  useEffect(() => {
    handleKeyDownRef.current = (e) => {
      if (e.key === "Shift") setShiftHeld(true);
      const inInput =
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable;

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
          if (e.shiftKey) redo();
          else undo();
        } else if (key === "y" || code === "KeyY") {
          e.preventDefault();
          redo();
        } else if (key === "s" || code === "KeyS") {
          e.preventDefault();
          performSave();
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
          showConfirm(
            "Delete Nodes",
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
        }
      }
    };
  });

  useEffect(() => {
    const handleKeyDown = (e) => handleKeyDownRef.current?.(e);
    const handleKeyUp = (e) => {
      if (e.key === "Shift") setShiftHeld(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const addChildNode = useCallback(
    (parentId, orgType) => {
      takeSnapshot();
      const parent = nodes.find((n) => n.id === parentId);
      if (!parent) return;
      const newId = `node-${Date.now()}`;
      const colorMap = {
        orgNode: "var(--default-node-bg)",
        individualNode: "#334155",
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
          color: colorMap[orgType] || "var(--default-node-bg)",
          description: "",
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
    [nodes, setNodes, setEdges, takeSnapshot],
  );

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
        orgType: "orgNode",
        color: "var(--default-node-bg)",
        description: "",
      },
      selected: true,
    };
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      newNode,
    ]);
  }, [setNodes, takeSnapshot]);

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
    const nextDir = layoutDir === "TB" ? "LR" : "TB";
    setLayoutDir(nextDir);
    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, nextDir);
    setNodes(ln);
    setEdges(le);
  }, [layoutDir, nodes, edges, setNodes, setEdges, takeSnapshot]);

  const toggleCollapse = useCallback((nodeId) => {
    setCollapsedNodes((prev) => {
      const s = new Set(prev);
      if (s.has(nodeId)) s.delete(nodeId);
      else s.add(nodeId);
      return s;
    });
  }, []);

  const showConfirm = (title, message, onConfirm, danger = false) => {
    setConfirmModal({ title, message, onConfirm, danger });
  };

  const onEdgeDoubleClick = useCallback(
    (evt, edge) => {
      takeSnapshot();
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      setSelectedEdge(null);
    },
    [setEdges, takeSnapshot],
  );

  const downloadImage = useCallback(() => {
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

    const el = document.querySelector(".react-flow__viewport");
    toPng(el, {
      backgroundColor: theme === "dark" ? "#0f2044" : "#ffffff",
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then((dataUrl) => {
      const a = document.createElement("a");
      a.setAttribute("download", `${chartName || "org-chart"}.png`);
      a.setAttribute("href", dataUrl);
      a.click();
    });
  }, [getNodes, theme, chartName]);

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


  // Only shift canvas right when the edit PropertiesPanel is actually visible.
  // When viewing a person node profile (read-only drawer on the right), the
  // left side has nothing, so we must NOT add the margin-left offset.
  const personNode = useMemo(() => {
    if (selectedEdge || selectedNodes.length !== 1) return null;
    const live = nodes.find((n) => n.id === selectedNodes[0].id);
    if (!live || !TYPE_META[live.data?.orgType]?.isPerson) return null;
    return live;
  }, [selectedNodes, selectedEdge, nodes]);

  // Shift canvas left only when the edit PropertiesPanel is rendered.
  // Profile-view (personNode && !editingPerson) shows a right-side drawer only
  // — nothing fills the left, so no margin shift needed.
  const showingProfileOnly = !!(personNode && !editingPerson && !previewMode);
  const panelOpen = !previewMode && (selectedNodes.length > 0 || selectedEdge) && !showingProfileOnly;

  // Memoized so OrgNode (wrapped in memo()) doesn't re-render on every
  // unrelated render of FlowApp — without this, a new object here every
  // render defeats memo() for every node on the canvas.
  const chartContextValue = useMemo(
    () => ({ childCounts, collapsedNodes, searchHighlights, teamSizes }),
    [childCounts, collapsedNodes, searchHighlights, teamSizes],
  );

  return (
    <div className={`app-wrapper ${previewMode ? "preview-mode" : ""}`}>
      {/* ── Header ────────────────────────────────────────── */}
      {!previewMode && (
        <header className="app-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              className="tb-btn tb-btn--icon"
              onClick={() => navigate("/dashboard")}
              title="Back to Dashboard"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="tb-divider" style={{ height: 24, margin: 0 }} />
            <div className="header-brand">
              <img
                src={
                  theme === "dark"
                    ? "/GDT-Logo (Dark).png"
                    : "/GDT-Logo (Light).png"
                }
                alt="GDT - General Department of Taxation"
                style={{ height: 36, objectFit: "contain" }}
              />
            </div>
          </div>

          <div className="header-toolbar">
            {/* Edit group */}
            <button
              className="tb-btn tb-btn--primary"
              onClick={addRootNode}
              title="Add Node"
            >
              <Plus size={14} /> Add Node
            </button>
            <button
              className="tb-btn tb-btn--icon"
              onClick={autoLayout}
              title="Auto Layout"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className="tb-btn tb-btn--icon"
              onClick={toggleLayout}
              title={
                layoutDir === "TB" ? "Vertical Layout" : "Horizontal Layout"
              }
            >
              {layoutDir === "TB" ? (
                <ArrowDownUp size={15} />
              ) : (
                <ArrowLeftRight size={15} />
              )}
            </button>

            <div className="tb-divider" />

            {/* History group */}
            <button
              className="tb-btn tb-btn--icon"
              onClick={undo}
              disabled={past.length === 0}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              className="tb-btn tb-btn--icon"
              onClick={redo}
              disabled={future.length === 0}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={15} />
            </button>

            <div className="tb-divider" />

            {/* Utility group */}
            <button
              className="tb-btn tb-btn--icon"
              onClick={() => setShowSearch(true)}
              title="Search (Ctrl+F)"
            >
              <SearchIcon size={15} />
            </button>
            <button
              className="tb-btn tb-btn--icon"
              onClick={() => setShowShortcuts(true)}
              title="Keyboard shortcuts (?)"
            >
              <Keyboard size={15} />
            </button>

            <div className="tb-divider" />

            {isOwner && (
              <button
                className="tb-btn tb-btn--primary"
                onClick={() => setShowShare(true)}
                title="Share chart"
              >
                <Share2 size={14} /> Share
              </button>
            )}
            <button
              className="tb-btn tb-btn--primary"
              onClick={() => {
                setPreviewMode(true);
                setSelectedNodes([]);
                setSelectedEdge(null);
              }}
              title="Preview mode"
            >
              <Eye size={14} /> Preview
            </button>
            {/* Theme toggle */}
            <button
              className="tb-btn tb-btn--icon"
              onClick={toggleTheme}
              title={
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              className="tb-btn tb-btn--primary"
              onClick={performSave}
              disabled={saveStatus === "saving"}
              title="Save now (Ctrl+S)"
            >
              <Save size={14} /> Save
            </button>
          </div>

          {/* Save badge */}
          <div
            className={`save-badge ${saveStatus === "saving" ? "save-badge--saving" : saveStatus === "saved" ? "save-badge--saved" : ""}`}
          >
            {saveStatus === "saving" && (
              <Loader2 size={12} className="save-spin" />
            )}
            {saveStatus === "saved" && <CheckCircle2 size={12} />}
            <span>
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                  ? "Saved"
                  : ""}
            </span>
          </div>
        </header>
      )}

      {/* ── Preview Controls ─────────────────────────────── */}
      {previewMode && (
        <>
          {/* Back button for Viewers */}
          {!canEdit && (
            <div
              style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}
            >
              <button
                className="tb-btn"
                onClick={() => navigate("/")}
                style={{
                  background: "var(--bg-surface-translucent)",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(var(--surface-rgb),0.1)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginRight: 8 }}
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Home
              </button>
            </div>
          )}

          <div
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              zIndex: 10,
              display: "flex",
              gap: 10,
            }}
          >
            {/* Show read-only badge if they lack edit access */}
            {!canEdit && (
              <div
                style={{
                  background: "var(--bg-surface-translucent)",
                  color: "var(--text-primary)",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  fontWeight: 600,
                }}
              >
                <Eye size={14} style={{ marginRight: 6 }} /> Read Only
              </div>
            )}
            <button className="tb-btn tb-btn--primary" onClick={downloadImage}>
              <Download size={14} /> Download PNG
            </button>
            {canEdit && (
              <button
                className="tb-btn tb-btn--danger"
                onClick={() => setPreviewMode(false)}
              >
                <EyeOff size={14} /> Exit Preview
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Main Content Area ────────────────────────────── */}
      <div
        className="main-content"
        style={{
          display: "flex",
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className={`canvas-wrapper ${panelOpen ? "panel-open" : ""}`}>
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
                      color={theme === "dark" ? "#ffffff22" : "#0f172a40"}
                      gap={20}
                      size={1.5}
                    />
                  )}
                  {!previewMode && (
                    <Controls
                      style={{
                        background: "var(--bg-surface-translucent)",
                        border: "1px solid rgba(var(--surface-rgb),.12)",
                        borderRadius: 8,
                      }}
                    />
                  )}
                  {!previewMode && (
                    <MiniMap
                      nodeColor={(n) =>
                        n.data?.color || "var(--default-node-bg)"
                      }
                      maskColor={
                        theme === "dark"
                          ? "rgba(0,0,0,0.65)"
                          : "rgba(15,23,42,0.35)"
                      }
                      style={{
                        background: "var(--bg-surface-translucent)",
                        border: "1px solid rgba(var(--surface-rgb),.12)",
                        borderRadius: 8,
                      }}
                    />
                  )}
                  {!previewMode && canEdit && (
                    <Panel
                      position="top-right"
                      style={{ pointerEvents: "none" }}
                    >
                      <div className="hint-chip">
                        Right-click node for menu &nbsp;·&nbsp; Ctrl+F to search
                        &nbsp;·&nbsp; ? for shortcuts
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
                  onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
                />
              )}
            </>
          )}
        </div>

        {/* Staff profile drawer — the read-only view a person node opens
            first (and the only view in preview mode). Edit Details switches
            to the full properties panel below. */}
        {personNode && (!editingPerson || previewMode) ? (
          <ProfileDrawer
            node={personNode}
            teamSize={teamSizes[personNode.id] || 0}
            canEdit={canEdit && !previewMode}
            onEdit={() => setEditingPerson(true)}
            onClose={() => {
              setSelectedNodes([]);
              setSelectedEdge(null);
              setNodes((nds) =>
                nds.map((n) => (n.selected ? { ...n, selected: false } : n)),
              );
            }}
          />
        ) : null}

        {/* Properties Panel (Outside canvas-wrapper) */}
        {(selectedNodes.length > 0 || selectedEdge) &&
          !previewMode &&
          !(personNode && !editingPerson) && (
            <PropertiesPanel
              nodes={selectedNodes}
              edge={selectedEdge}
              onUpdateNodes={updateSelectedNodes}
              onUpdateEdge={updateEdgeProperties}
              onAddChild={(type) => addChildNode(selectedNodes[0]?.id, type)}
              onDelete={() => {
                if (selectedNodes.length > 0) {
                  showConfirm(
                    "Delete Nodes",
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
              }}
              onSave={() => {
                // Person node → back to its read-only profile; anything else →
                // just deselect. Edits are already committed to node state.
                if (personNode) {
                  setEditingPerson(false);
                } else {
                  setSelectedNodes([]);
                  setSelectedEdge(null);
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.selected ? { ...n, selected: false } : n,
                    ),
                  );
                }
              }}
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
            if (n) {
              setSelectedNodes([n]);
              setSelectedEdge(null);
            }
          }}
          onAddChild={() => addChildNode(contextMenu.nodeId, "orgNode")}
          onDuplicate={() => {
            const n = nodes.find((nd) => nd.id === contextMenu.nodeId);
            if (n) duplicateNodes([n]);
          }}
          onToggleCollapse={() => toggleCollapse(contextMenu.nodeId)}
          onDelete={() => {
            const targetId = contextMenu.nodeId;
            showConfirm(
              "Delete Node",
              "Delete this node and all its connections?",
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
      {/* ── Linked Chart Popup ───────────────────────────── */}
      {linkedChartPopup && (
        <div
          style={{
            position: "fixed",
            left: linkedChartPopup.x + 12,
            top: linkedChartPopup.y - 20,
            zIndex: 1000,
            background: "var(--bg-surface-translucent)",
            border: "1px solid rgba(14, 125, 110, 0.4)",
            borderRadius: 12,
            padding: "14px 18px",
            minWidth: 220,
            boxShadow:
              "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,125,110,0.1)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                background: "rgba(14,125,110,0.2)",
                padding: 6,
                borderRadius: 8,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0e7d6e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Linked Chart
              </div>
              <div
                style={{
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {linkedChartPopup.node.data.nameEn ||
                  linkedChartPopup.node.data.name}
              </div>
            </div>
            <button
              onClick={() => setLinkedChartPopup(null)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          </div>
          <button
            onClick={() => {
              openLinkedChart(linkedChartPopup.node.data.linkedChartId);
              setLinkedChartPopup(null);
            }}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #0e7d6e, #0a5c50)",
              border: "none",
              borderRadius: 8,
              color: "white",
              padding: "9px 14px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open Chart
          </button>
        </div>
      )}

      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        chartId={chartId}
        onRestore={(restoredNodes, restoredEdges) => {
          takeSnapshot();
          // Snapshot the pre-restore state too, so restoring the wrong version is itself recoverable.
          supabase
            .from("chart_versions")
            .insert({ chart_id: chartId, nodes, edges })
            .then(({ error }) => {
              if (error)
                console.error("Failed to snapshot before restore", error);
            });
          setNodes(restoredNodes || []);
          setEdges(restoredEdges || []);
          lastSyncData.current = { nodes: "[]", edges: "[]" }; // Force re-sync
        }}
      />
    </div>
  );
}

/** Route guard — redirects to /login if not authenticated */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "var(--bg-app)",
        }}
      >
        <div
          className="loading-spinner"
          style={{ width: 40, height: 40, borderWidth: 3 }}
        />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}
/**
 * Owns the set of currently-open chart tabs. Consumes TabContext (which
 * persists above the router) so tab state survives Dashboard↔Chart
 * navigations. Rendered OUTSIDE <Routes> so it never unmounts — FlowApp
 * instances stay alive across Dashboard round-trips.
 *
 * Data flow is UNIDIRECTIONAL:  URL → state (never state → URL).
 * Tab clicks / linked-chart opens navigate first; the effect syncs state.
 */
function EditorShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    openTabs, activeTabId, tabNames,
    openTab, closeTab, setActiveTabId, setTabName,
  } = useContext(TabContext);

  // Detect whether we're on a /chart/:id route
  const chartMatch = location.pathname.match(/^\/chart\/([^/]+)/);
  const urlChartId = chartMatch ? chartMatch[1] : null;

  // URL → state: when the URL points to a chart, ensure it's open & active
  useEffect(() => {
    console.log('[EditorShell] URL effect fired:', { urlChartId, activeTabId, openTabs: openTabs.join(',') });
    if (urlChartId) {
      openTab(urlChartId);
    }
  }, [urlChartId, openTab]);

  // Navigate to open a linked chart (called from within FlowApp)
  const handleOpenLinkedChart = useCallback((chartId) => {
    if (!chartId) return;
    openTab(chartId); // Add to tab list immediately
    navigate(`/chart/${chartId}`, { replace: true });
  }, [openTab, navigate]);

  const handleCloseTab = useCallback(
    (chartId) => closeTab(chartId, navigate),
    [closeTab, navigate],
  );

  // Only show when we're on a chart route and have tabs
  const isVisible = !!urlChartId && openTabs.length > 0;

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {openTabs.map((id) => (
          <div
            key={id}
            style={{
              position: "absolute",
              inset: 0,
              opacity: id === activeTabId ? 1 : 0,
              zIndex: id === activeTabId ? 1 : -1,
              pointerEvents: id === activeTabId ? "auto" : "none",
              transition: "opacity 0.15s ease",
            }}
          >
            <ErrorBoundary>
              <ReactFlowProvider>
                <FlowApp
                  chartId={id}
                  openLinkedChart={handleOpenLinkedChart}
                  onChartName={(name) => setTabName(id, name)}
                />
              </ReactFlowProvider>
            </ErrorBoundary>
          </div>
        ))}
      </div>
      {openTabs.length > 1 && (
        <ChartTabBar
          tabs={openTabs.map((id) => ({
            id,
            name: tabNames[id] || "Untitled Chart",
          }))}
          activeTabId={activeTabId}
          onSelect={(id) => navigate(`/chart/${id}`, { replace: true })}
          onClose={handleCloseTab}
        />
      )}
    </div>
  );
}

/**
 * Main layout: renders Routes for all pages, plus a persistent EditorShell
 * that lives outside the route tree so it never unmounts.
 */
function AppLayout() {
  const { user, loading } = useAuth();

  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/folder/:folderId"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Chart editor — handled by the persistent EditorShell below,
              but we still need a route entry so ProtectedRoute guards it
              and React Router doesn't show 404. */}
          <Route
            path="/chart/:chartId"
            element={
              <ProtectedRoute>
                {/* EditorShell renders itself via the persistent instance below */}
                <div />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      {/* Persistent editor — never unmounts once a chart has been opened */}
      {user && !loading && <EditorShell />}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TabProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </TabProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
