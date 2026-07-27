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
  reconnectEdge,
  useViewport,
} from "@xyflow/react";
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
  Upload,
  X,
} from "lucide-react";

import OrgNode from "./components/OrgNode";
import CustomEdge from "./components/CustomEdge";
import PropertiesPanel from "./components/PropertiesPanel";
import ProfileDrawer from "./components/ProfileDrawer";
import StaffProfileDialog from "./components/staff/StaffProfileDialog";
import ConfirmModal from "./components/ConfirmModal";
import ShareModal from "./components/ShareModal";
import SearchBar from "./components/SearchBar";
import ContextMenu from "./components/ContextMenu";
import HrAdminRoute from "./components/HrAdminRoute";
import ShortcutsModal from "./components/ShortcutsModal";
import StatusBar from "./components/StatusBar";
import { getLayoutedElements } from "./utils/layoutUtils";
import { shouldOfferLocalRecovery } from "./utils/backupUtils";
import { getChartAccess } from "./utils/chartAccess";
import {
  DEFAULT_EDGE_OPTIONS,
  normalizeEdges,
  withoutRelationalIds,
} from "./utils/chartData";
import {
  chartBackupFilename,
  createChartBackup,
  parseChartBackup,
  serializeChartBackup,
} from "./utils/chartBackup";
import { loadChartForViewer } from "./services/chartService";
import { mergeChartStaffProjection } from "./services/chartStaffProjectionService";
import { HR_FEATURES_ENABLED } from "./config/hrFeatures";
import { CHART_VERSION_WRITES_ENABLED } from "./config/chartFeatures";
import { supabase } from "./supabaseClient";
import { TYPE_META } from "./data/nodeTypes";
import ErrorBoundary from "./components/ErrorBoundary";
import VersionHistoryModal from "./components/VersionHistoryModal";
import ChartTabBar from "./components/ChartTabBar";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./hooks/useTheme";
import { useTheme } from "./contexts/ThemeContext";
import { useChartHistory } from "./hooks/useChartHistory";
import { useChartShortcuts } from "./hooks/useChartShortcuts";
import { useChartPersistence } from "./hooks/useChartPersistence";
import { ChartContext } from "./contexts/ChartContext";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import LoginTestPage from "./pages/LoginTestPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminOrgStructurePage from "./pages/AdminOrgStructurePage";
import StaffDirectoryPage from "./pages/StaffDirectoryPage";
import JobArchitecturePage from "./pages/JobArchitecturePage";

const nodeTypes = { orgNode: OrgNode };
const edgeTypes = { custom: CustomEdge };

// Older/legacy charts (e.g. anything seeded before the GDT template edges
// carried a `type`) can have edges missing `type: "custom"`. Without it,
// React Flow silently falls back to its own built-in edge component, which
// ignores every custom style/dynamic-glue field — the connector renders but
// none of the Properties Panel controls do anything. Backfill on every load
// so old charts self-heal instead of needing a manual data migration.
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
    () => ({ openTabs, activeTabId, tabNames, openTab, closeTab, setTabName }),
    [openTabs, activeTabId, tabNames, openTab, closeTab, setTabName],
  );

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

function FlowApp({ chartId, openLinkedChart, onChartName }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeTabId } = useContext(TabContext);
  const navigate = useNavigate();
  const { getNodes, setCenter } = useReactFlow();
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
  const [profileNodeId, setProfileNodeId] = useState(null);
  const [profileStaffId, setProfileStaffId] = useState(null);
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
  const [canViewProfiles, setCanViewProfiles] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [linkedChartPopup, setLinkedChartPopup] = useState(null); // { node, x, y }
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const backupFileInputRef = useRef(null);

  // Tracks what's currently saved on the server so the persist effect can
  // tell "nothing changed" from "needs saving" without re-sending identical data.
  const lastSyncData = useRef({ nodes: "[]", edges: "[]" });
  // ── Undo/Redo ─────────────────────────────────────────────────
  // ── Clipboard ─────────────────────────────────────────────────
  const [clipboard, setClipboard] = useState(null);

  // Mirrors of the latest nodes/edges so takeSnapshot can stay referentially
  // stable ([] deps) instead of changing identity on every edit. Every
  // callback that depends on takeSnapshot (updateSelectedNodes, onConnect,
  // addChildNode, etc.) was getting a new identity on nearly every render as
  // a result, which cascaded into consumers whose effects list those
  // callbacks as a dependency — e.g. the Properties Panel's autosave effect,
  // which could then fire from selection changes alone, not just real edits.
  const {
    nodesRef,
    edgesRef,
    takeSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useChartHistory(nodes, edges, setNodes, setEdges);

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

  // ── Save ─────────────────────────────────────────────────────
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

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => {
    if (!chartId) {
      navigate("/dashboard");
      return;
    }

    async function loadData() {
      let loadResult;
      try {
        loadResult = await loadChartForViewer(chartId, {
          allowLegacyAuthenticatedFallback: Boolean(user),
        });
      } catch (error) {
        console.error("Chart load contract failed:", error);
        navigate(user ? "/dashboard" : "/login", { replace: true });
        return;
      }
      const data = loadResult.chart;

      if (data) {
        const rpcAccess = data.viewer_access;
        const legacyAccess = getChartAccess(data, user);
        const canView = rpcAccess ? true : legacyAccess.canView;
        const editAccess = rpcAccess
          ? rpcAccess === "owner" || rpcAccess === "edit"
          : legacyAccess.canEdit;
        const ownerStatus = rpcAccess
          ? rpcAccess === "owner"
          : legacyAccess.isOwner;

        // Frontend visibility complements Supabase RLS. Public links may
        // render without a session; private charts still require an owner or
        // accepted share.
        if (!canView) {
          navigate(user ? "/dashboard" : "/login", { replace: true });
          return;
        }

        setChartName(data.name || "Untitled Chart");
        setChartIsPublic(data.is_public);

        setCanEdit(editAccess);
        setCanViewProfiles(
          rpcAccess
            ? rpcAccess !== "public"
            : legacyAccess.isOwner || !!legacyAccess.acceptedShare,
        );
        setIsOwner(ownerStatus);
        if (!editAccess) setPreviewMode(true);

        // Respect empty arrays — don't fall back to GDT template for blank charts
        // lastSyncData intentionally reflects the RAW saved data (pre-normalization)
        // so the persist effect sees a diff and re-saves the normalized edges,
        // permanently healing any chart saved before edges carried a `type`.
        // Load HR data from relational tables and merge it into the visual nodes
        const mergedNodes =
          rpcAccess === "public" || !HR_FEATURES_ENABLED
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
                  "A local backup was found with unsaved changes not present on the server. Do you want to recover it?",
                )
              ) {
                setNodes(localBackup.nodes);
                setEdges(normalizeEdges(localBackup.edges));
                lastSyncData.current = { nodes: "[]", edges: "[]" }; // Force a resync
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
          console.error("Error reading local backup", e);
        }
      } else {
        // Chart not found or blocked by RLS.
        navigate(user ? "/dashboard" : "/login", { replace: true });
        return;
      }
      setLoading(false);
    }
    loadData();
  }, [chartId, navigate, setNodes, setEdges, user]);

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

  const onEdgeClick = useCallback(() => {
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
      const isPerson = !!TYPE_META[node.data?.orgType]?.isPerson;
      if (!canEdit && !isPerson) return;
      setContextMenu({ x: evt.clientX, y: evt.clientY, nodeId: node.id });
    },
    [canEdit],
  );

  const updateSelectedNodes = useCallback(
    (data) => {
      takeSnapshot();

      // Keep React's state update pure. Running database writes inside a state
      // updater can execute them more than once under Strict Mode.
      const nextNodes = nodesRef.current.map((n) => {
        if (!n.selected) return n;
        const updatedNode = { ...n, data: { ...n.data, ...data } };
        return updatedNode;
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

  // ── Keyboard shortcuts ────────────────────────────────────────
  useChartShortcuts(activeTabId === chartId, {
    undo,
    redo,
    save: () => void performSave(),
    toggleSearch: () => setShowSearch((visible) => !visible),
    toggleHelp: () => setShowShortcuts((visible) => !visible),
    closeOverlays: () => {
      setShowSearch(false);
      setShowShortcuts(false);
      setContextMenu(null);
    },
    duplicateSelection: () => {
      if (selectedNodes.length > 0) duplicateNodes(selectedNodes);
    },
    copySelection: copyNode,
    pasteSelection: pasteNode,
    deleteSelection: () => {
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
        setEdges((currentEdges) =>
          currentEdges.filter((edge) => edge.id !== selectedEdge.id),
        );
      }
    },
    setShiftHeld,
  });

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

  const downloadChartBackup = useCallback(() => {
    try {
      const snapshot = createChartBackup({
        chartId,
        chartName: chartName || "Untitled Chart",
        nodes: nodesRef.current,
        edges: edgesRef.current,
      });
      const url = URL.createObjectURL(
        new Blob([serializeChartBackup(snapshot)], {
          type: "application/json",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = chartBackupFilename(snapshot.chartName);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Chart backup export failed:", error);
      setSaveStatus("error");
    }
  }, [chartId, chartName, nodesRef, edgesRef]);

  const restoreChartBackup = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      try {
        const snapshot = parseChartBackup(await file.text());
        const belongsToAnotherChart = snapshot.chartId !== chartId;
        setConfirmModal({
          title: "Restore chart backup?",
          message:
            `Replace the current in-memory chart with ${snapshot.nodes.length} node(s) and ${snapshot.edges.length} edge(s) from “${snapshot.chartName}”?` +
            (belongsToAnotherChart
              ? " This backup was created from a different chart."
              : ""),
          danger: true,
          onConfirm: () => {
            takeSnapshot();
            setSelectedNodes([]);
            setSelectedEdge(null);
            setNodes(snapshot.nodes);
            setEdges(normalizeEdges(snapshot.edges));
            lastSyncData.current = { nodes: "[]", edges: "[]" };
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
              console.warn("Failed to save restored chart backup locally", error);
            }
            setSaveStatus("idle");
            setConfirmModal(null);
          },
        });
      } catch (error) {
        setConfirmModal({
          title: "Backup cannot be restored",
          message:
            error instanceof Error
              ? error.message
              : "The selected backup is invalid.",
          danger: true,
          onConfirm: () => setConfirmModal(null),
        });
      }
    },
    [chartId, setEdges, setNodes, takeSnapshot],
  );

  const onEdgeDoubleClick = useCallback(
    (evt, edge) => {
      takeSnapshot();
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      setSelectedEdge(null);
    },
    [setEdges, takeSnapshot],
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

    const el = document.querySelector(".react-flow__viewport");
    if (!el) return;

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, {
        backgroundColor: theme === "dark" ? "#0f2044" : "#ffffff",
        width: imageWidth,
        height: imageHeight,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
      const a = document.createElement("a");
      a.setAttribute("download", `${chartName || "org-chart"}.png`);
      a.setAttribute("href", dataUrl);
      a.click();
    } catch (error) {
      console.error("Chart image export failed:", error);
      window.alert("Unable to export the chart image. Please try again.");
    }
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
  const profileNode = useMemo(() => {
    if (!profileNodeId || !canViewProfiles) return null;
    const live = nodes.find((node) => node.id === profileNodeId);
    if (!live || !TYPE_META[live.data?.orgType]?.isPerson) return null;
    return live;
  }, [profileNodeId, canViewProfiles, nodes]);

  // Shift canvas left only when the edit PropertiesPanel is rendered.
  // Profile-view (personNode && !editingPerson) shows a right-side drawer only
  // — nothing fills the left, so no margin shift needed.
  const panelOpen =
    !previewMode && (selectedNodes.length > 0 || selectedEdge);
  const contextNode = contextMenu
    ? nodes.find((node) => node.id === contextMenu.nodeId)
    : null;
  const contextNodeIsPerson =
    !!contextNode && !!TYPE_META[contextNode.data?.orgType]?.isPerson;
  const relationalProfileStaffId = HR_FEATURES_ENABLED
    ? profileStaffId ||
      (typeof profileNode?.data?.dbStaffId === "string"
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
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              className="tb-btn tb-btn--icon"
              onClick={redo}
              disabled={!canRedo}
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
            {canEdit && (
              <>
                <button
                  className="tb-btn tb-btn--primary"
                  onClick={downloadChartBackup}
                  title="Download a recoverable chart backup"
                >
                  <Download size={14} /> Backup JSON
                </button>
                <button
                  className="tb-btn tb-btn--primary"
                  onClick={() => backupFileInputRef.current?.click()}
                  title="Restore nodes and edges from a chart backup"
                >
                  <Upload size={14} /> Restore JSON
                </button>
              </>
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
        {relationalProfileStaffId ? (
          <StaffProfileDialog
            staffId={relationalProfileStaffId}
            onClose={() => {
              setProfileStaffId(null);
              setProfileNodeId(null);
            }}
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
            }}
            onClose={() => setProfileNodeId(null)}
          />
        ) : null}

        {/* Properties Panel (Outside canvas-wrapper) */}
        {(selectedNodes.length > 0 || selectedEdge) &&
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
                setSelectedNodes([]);
                setSelectedEdge(null);
                setNodes((nds) =>
                  nds.map((n) =>
                    n.selected ? { ...n, selected: false } : n,
                  ),
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
                  const n = nodes.find(
                    (nd) => nd.id === contextMenu.nodeId,
                  );
                  if (n) {
                    setSelectedNodes([n]);
                    setSelectedEdge(null);
                  }
                }
              : undefined
          }
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
      <input
        ref={backupFileInputRef}
        type="file"
        accept=".json,.gdt-chart.json,application/json"
        onChange={restoreChartBackup}
        style={{ display: "none" }}
        tabIndex={-1}
        aria-hidden="true"
      />
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
          if (CHART_VERSION_WRITES_ENABLED) {
            supabase
              .from("chart_versions")
              .insert({ chart_id: chartId, nodes, edges })
              .then(({ error }) => {
                if (error)
                  console.error("Failed to snapshot before restore", error);
              });
          }
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
    openTab, closeTab, setTabName,
  } = useContext(TabContext);

  // Detect whether we're on a /chart/:id route
  const chartMatch = location.pathname.match(/^\/chart\/([^/]+)/);
  const urlChartId = chartMatch ? chartMatch[1] : null;

  // URL → state: when the URL points to a chart, ensure it's open & active
  useEffect(() => {
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
  const { loading } = useAuth();

  return (
    <>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/test-login" element={<LoginTestPage />} />
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

          {/* Public chart links may render without a session. FlowApp checks
              public/owner/share visibility after loading the chart. */}
          <Route
            path="/chart/:chartId"
            element={<div />}
          />

          {/* Hidden admin route — no UI links point here */}
          <Route
            path="/admin/org-structure"
            element={
              <ProtectedRoute>
                <HrAdminRoute>
                  <AdminOrgStructurePage />
                </HrAdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute>
                <HrAdminRoute>
                  <StaffDirectoryPage />
                </HrAdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/job-architecture"
            element={
              <ProtectedRoute>
                <HrAdminRoute>
                  <JobArchitecturePage />
                </HrAdminRoute>
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      {/* Persistent editor — never unmounts once a chart has been opened */}
      {!loading && <EditorShell />}
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
