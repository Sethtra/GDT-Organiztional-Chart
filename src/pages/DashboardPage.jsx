import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useChart, getFolderAncestors } from "../hooks/useChart";
import ChartCard from "../components/ChartCard";
import FolderCard from "../components/FolderCard";
import ConfirmModal from "../components/ConfirmModal";
import Navbar from "../components/Navbar";
import ShareModal from "../components/ShareModal";
import MoveModal from "../components/MoveModal";
import {
  Plus,
  Loader2,
  LayoutGrid,
  LayoutList,
  FileBarChart2,
  ChevronRight,
  Sparkles,
  X,
  Users,
  Folder,
  FolderPlus,
  Home,
} from "lucide-react";

/* ── New-chart modal ─────────────────────────────── */
function NewChartModal({ onCreate, onClose }) {
  const [name, setName] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim(), useTemplate);
    setLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="new-chart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="new-chart-modal__header">
          <h2>Create New Chart</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="new-chart-modal__form">
          <div className="auth-field">
            <label className="auth-label">Chart Name</label>
            <input
              type="text"
              className="auth-input"
              placeholder="e.g. Department Structure 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <label className="new-chart-option">
            <input
              type="checkbox"
              checked={useTemplate}
              onChange={(e) => setUseTemplate(e.target.checked)}
            />
            <div>
              <strong>Start with GDT Template</strong>
              <span>Pre-filled organizational structure</span>
            </div>
            <Sparkles size={16} className="new-chart-option__icon" />
          </label>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" /> Creating...
              </>
            ) : (
              <>
                <Plus size={16} /> Create Chart
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── New-folder modal ─────────────────────────────── */
function NewFolderModal({ onCreate, onClose }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim());
    setLoading(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="new-chart-modal" onClick={(e) => e.stopPropagation()}>
        <div className="new-chart-modal__header">
          <h2>Create New Folder</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="new-chart-modal__form">
          <div className="auth-field">
            <label className="auth-label">Folder Name</label>
            <input
              type="text"
              className="auth-input"
              placeholder="e.g. 2025 Reports"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="auth-submit-btn"
            disabled={!name.trim() || loading}
          >
            {loading ? (
              <><Loader2 size={16} className="spin" /> Creating...</>
            ) : (
              <><FolderPlus size={16} /> Create Folder</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Dashboard Page ──────────────────────────────── */
export default function DashboardPage() {
  const { user, displayName } = useAuth();
  const { folderId } = useParams();
  const currentFolderId = folderId || null;

  const {
    charts,
    folders,
    loading,
    createChart,
    renameChart,
    deleteChart,
    duplicateChart,
    acceptInvite,
    declineInvite,
    createFolder,
    renameFolder,
    deleteFolder,
    moveToFolder,
    moveFolder,
  } = useChart();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("dashboardViewMode") || "grid");
  
  useEffect(() => {
    localStorage.setItem("dashboardViewMode", viewMode);
  }, [viewMode]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);

  // Local storage for stars (fallback mock since db doesn't have it)
  const [starredCharts, setStarredCharts] = useState(() => {
    try {
      const stored = localStorage.getItem("gdt_starred_charts");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleStar = (chartId) => {
    setStarredCharts((prev) => {
      const next = prev.includes(chartId) ? prev.filter((id) => id !== chartId) : [...prev, chartId];
      localStorage.setItem("gdt_starred_charts", JSON.stringify(next));
      return next;
    });
  };

  const handleDownload = async (chart) => {
    if (!chart.thumbnail_url) {
      alert("No thumbnail available for this chart yet.");
      return;
    }
    try {
      const response = await fetch(chart.thumbnail_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${chart.name.replace(/\s+/g, '_')}_thumbnail.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download chart", err);
      alert("Failed to download chart.");
    }
  };

  // Breadcrumb ancestry chain
  const breadcrumbs = useMemo(
    () => getFolderAncestors(currentFolderId, folders),
    [currentFolderId, folders]
  );

  const currentFolder = breadcrumbs[breadcrumbs.length - 1] || null;

  // Folders that belong to the current level
  const visibleFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return folders.filter((f) => {
      const matchesLevel = (f.parent_id || null) === currentFolderId;
      const matchesSearch = !q || f.name.toLowerCase().includes(q);
      return matchesLevel && matchesSearch;
    });
  }, [folders, currentFolderId, search]);

  // Filter charts by search
  const filteredCharts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return charts;
    return charts.filter((c) => c.name.toLowerCase().includes(q));
  }, [charts, search]);

  // Split owned vs shared vs pending (shared only shown at root)
  // Also sort so that starred items are at the top
  const sortStarredFirst = (a, b) => {
    const aStar = starredCharts.includes(a.id) ? 1 : 0;
    const bStar = starredCharts.includes(b.id) ? 1 : 0;
    return bStar - aStar; // Starred (1) comes before unstarred (0)
  };

  const ownedCharts = filteredCharts
    .filter((c) => c.owner_id === user?.id && (c.folder_id || null) === currentFolderId)
    .sort(sortStarredFirst);

  const pendingCharts = currentFolderId
    ? []
    : filteredCharts
        .filter(
          (c) =>
            c.owner_id !== user?.id &&
            c.chart_shares?.some((s) => s.shared_email === user?.email && s.status === "pending")
        )
        .sort(sortStarredFirst);

  const sharedCharts = currentFolderId
    ? []
    : filteredCharts
        .filter(
          (c) =>
            c.owner_id !== user?.id &&
            !c.chart_shares?.some((s) => s.shared_email === user?.email && s.status === "pending")
        )
        .sort(sortStarredFirst);


  // Handlers
  const handleCreate = async (name, useTemplate) => {
    const chart = await createChart(name, useTemplate, currentFolderId);
    if (chart) {
      setShowNewModal(false);
      navigate(`/chart/${chart.id}`);
    }
  };

  const handleCreateFolder = async (name) => {
    const folder = await createFolder(name, currentFolderId);
    if (folder) setShowFolderModal(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteChart(deleteTarget);
    setDeleteTarget(null);
  };

  const handleDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    await deleteFolder(deleteFolderTarget);
    setDeleteFolderTarget(null);
    if (currentFolderId === deleteFolderTarget) navigate("/dashboard");
  };

  return (
    <div className="dashboard-page">
      <Navbar search={search} setSearch={setSearch} />

      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            {currentFolderId ? (
              <h1 className="dashboard-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Folder size={24} color="#eab308" />
                {currentFolder?.name || "Folder"}
              </h1>
            ) : (
              <h1 className="dashboard-welcome">
                Welcome back, <strong>{displayName}</strong>
              </h1>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              id="btn-new-folder"
              className="landing__btn-ghost"
              onClick={() => setShowFolderModal(true)}
              style={{ padding: "8px 16px", fontSize: 13 }}
            >
              <FolderPlus size={15} /> New Folder
            </button>
            <button
              id="btn-new-chart"
              className="landing__btn-primary"
              onClick={() => setShowNewModal(true)}
              style={{ padding: "8px 16px", fontSize: 13 }}
            >
              <Plus size={15} /> New Chart
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        {/* Breadcrumb */}
        {currentFolderId && (
          <nav className="dashboard-breadcrumb" aria-label="Folder navigation">
            <Link to="/dashboard" className="dashboard-breadcrumb__item">
              <Home size={13} /> Default
            </Link>
            {breadcrumbs.map((f, i) => (
              <span key={f.id} style={{ display: "contents" }}>
                <ChevronRight size={12} className="dashboard-breadcrumb__sep" />
                <Link
                  to={`/dashboard/folder/${f.id}`}
                  className={`dashboard-breadcrumb__item ${i === breadcrumbs.length - 1 ? "dashboard-breadcrumb__item--active" : ""}`}
                >
                  {f.name}
                </Link>
              </span>
            ))}
          </nav>
        )}



        {/* Loading */}
        {loading && (
          <div className="dashboard-loading">
            <Loader2 size={28} className="spin" style={{ color: "#0e7d6e", opacity: 0.7 }} />
            <span>Loading...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Folders section */}
            {visibleFolders.length > 0 && (
              <section className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2 className="dashboard-section-title">
                    <Folder size={14} /> Folders
                    <span className="dashboard-section-count">{visibleFolders.length}</span>
                  </h2>
                </div>
                <div className="folder-chips-row">
                  {visibleFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      allFolders={folders}
                      onRename={renameFolder}
                      onDelete={(id) => setDeleteFolderTarget(id)}
                      onMove={moveFolder}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* My Charts section */}
            <section className="dashboard-section">
              <div className="dashboard-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="dashboard-section-title">
                  <FileBarChart2 size={14} />
                  {currentFolderId ? "Charts in this folder" : "Files"}
                  <span className="dashboard-section-count">{ownedCharts.length}</span>
                </h2>
                
                <div className="dashboard-view-toggle">
                  <button
                    className={`dashboard-view-btn ${viewMode === "grid" ? "dashboard-view-btn--active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    className={`dashboard-view-btn ${viewMode === "list" ? "dashboard-view-btn--active" : ""}`}
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                  >
                    <LayoutList size={15} />
                  </button>
                </div>
              </div>

              {ownedCharts.length === 0 && visibleFolders.length === 0 ? (
                <div className="dashboard-empty">
                  <div className="dashboard-empty__icon">📊</div>
                  <h3>{currentFolderId ? "This folder is empty" : "No charts yet"}</h3>
                  <p>
                    {currentFolderId
                      ? "Create a new chart or folder here."
                      : "Create your first organizational chart to get started."}
                  </p>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
                    <button className="landing__btn-primary" onClick={() => setShowNewModal(true)}>
                      <Plus size={15} /> New Chart
                    </button>
                  </div>
                </div>
              ) : ownedCharts.length === 0 ? null : (
                <div className={viewMode === "grid" ? "chart-grid" : "chart-list"}>
                  {viewMode === "list" && (
                    <div className="chart-list-header">
                      <div></div>
                      <div>Name</div>
                      <div>Owner</div>
                      <div>Date modified</div>
                      <div></div>
                    </div>
                  )}
                  {ownedCharts.map((chart) => (
                      <ChartCard
                        key={chart.id}
                        chart={chart}
                        isOwner={true}
                        viewMode={viewMode}
                        folders={folders.filter(f => (f.parent_id || null) === currentFolderId)}
                        isStarred={starredCharts.includes(chart.id)}
                        onToggleStar={() => toggleStar(chart.id)}
                        onShare={() => setShareTarget(chart)}
                        onDownload={() => handleDownload(chart)}
                        onRename={renameChart}
                        onDelete={(id) => setDeleteTarget(id)}
                        onDuplicate={duplicateChart}
                        onMoveToFolder={() => setMoveTarget(chart)}
                      />
                  ))}
                </div>
              )}
            </section>

            {/* Pending Invites */}
            {pendingCharts.length > 0 && (
              <section className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2 className="dashboard-section-title">
                    <Users size={14} /> Pending Invites
                    <span className="dashboard-section-count">{pendingCharts.length}</span>
                  </h2>
                </div>
                <div className={viewMode === "grid" ? "chart-grid" : "chart-list"}>
                  {viewMode === "list" && (
                    <div className="chart-list-header">
                      <div></div>
                      <div>Name</div>
                      <div>Owner</div>
                      <div>Date modified</div>
                      <div></div>
                    </div>
                  )}
                  {pendingCharts.map((chart) => (
                      <ChartCard
                        key={chart.id}
                        chart={chart}
                        isOwner={false}
                        isPending={true}
                        viewMode={viewMode}
                        isStarred={starredCharts.includes(chart.id)}
                        onToggleStar={() => toggleStar(chart.id)}
                        onDownload={() => handleDownload(chart)}
                        onDelete={(id) => setDeleteTarget(id)}
                        onDuplicate={duplicateChart}
                        onAccept={() => acceptInvite(chart.id)}
                        onDecline={() => declineInvite(chart.id)}
                      />
                  ))}
                </div>
              </section>
            )}

            {/* Shared with me */}
            {sharedCharts.length > 0 && (
              <section className="dashboard-section">
                <div className="dashboard-section-header">
                  <h2 className="dashboard-section-title">
                    <Users size={14} /> Shared with me
                    <span className="dashboard-section-count">{sharedCharts.length}</span>
                  </h2>
                </div>
                <div className={viewMode === "grid" ? "chart-grid" : "chart-list"}>
                  {viewMode === "list" && (
                    <div className="chart-list-header">
                      <div></div>
                      <div>Name</div>
                      <div>Owner</div>
                      <div>Date modified</div>
                      <div></div>
                    </div>
                  )}
                  {sharedCharts.map((chart) => (
                      <ChartCard
                        key={chart.id}
                        chart={chart}
                        isOwner={false}
                        viewMode={viewMode}
                        isStarred={starredCharts.includes(chart.id)}
                        onToggleStar={() => toggleStar(chart.id)}
                        onDownload={() => handleDownload(chart)}
                        onRename={renameChart}
                        onDelete={(id) => setDeleteTarget(id)}
                        onDuplicate={duplicateChart}
                      />
                  ))}
                </div>
              </section>
            )}

            {/* Empty search */}
            {filteredCharts.length === 0 && charts.length > 0 && visibleFolders.length === 0 && search && (
              <div className="dashboard-empty">
                <div className="dashboard-empty__icon">🔍</div>
                <h3>No results for "{search}"</h3>
                <p>Try a different search term.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showNewModal && (
        <NewChartModal
          onCreate={handleCreate}
          onClose={() => setShowNewModal(false)}
        />
      )}
      {showFolderModal && (
        <NewFolderModal
          onCreate={handleCreateFolder}
          onClose={() => setShowFolderModal(false)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Chart"
          message="This will permanently delete this chart. This cannot be undone."
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {deleteFolderTarget && (
        <ConfirmModal
          title="Delete Folder"
          message="This will permanently delete this folder. Charts inside will return to the parent level — they will NOT be deleted."
          danger
          onConfirm={handleDeleteFolder}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      )}

      {/* Share Modal */}
      {shareTarget && (
        <ShareModal
          chartId={shareTarget.id}
          chartName={shareTarget.name}
          isPublic={shareTarget.is_public}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Move Modal */}
      {moveTarget && (
        <MoveModal
          chart={moveTarget}
          currentFolderId={moveTarget.folder_id || null}
          folders={folders}
          onClose={() => setMoveTarget(null)}
          onMove={(folderId) => {
            moveToFolder(moveTarget.id, folderId);
            setMoveTarget(null);
          }}
        />
      )}
    </div>
  );
}
