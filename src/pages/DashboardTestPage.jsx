import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  FolderPlus,
  House,
  LayoutGrid,
  LayoutList,
  Loader2,
  LogOut,
  Network,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { useChart, getFolderAncestors } from "../hooks/useChart";
import { useHrAdmin } from "../hooks/useHrAdmin";
import RegisterChartCard from "../components/dashboard/RegisterChartCard";
import RegisterFolderCard from "../components/dashboard/RegisterFolderCard";
import ConfirmModal from "../components/ConfirmModal";
import ShareModal from "../components/ShareModal";
import MoveModal from "../components/MoveModal";
import "./DashboardTestPage.css";

const BASE_PATH = "/dashboard";
const VIEW_MODE_KEY = "gdt_register_view_mode";
const STARRED_KEY = "gdt_starred_charts";

/* ── Register-styled creation dialog ─────────────── */
function CreateDialog({
  title,
  label,
  placeholder,
  submitLabel,
  withTemplate,
  onCreate,
  onClose,
}) {
  const [name, setName] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const fieldId = useId();
  const titleId = useId();

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    await onCreate(name.trim(), useTemplate);
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#081a12]/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[420px] overflow-hidden rounded-[14px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--pa-border)] px-5 py-4">
          <div>
            <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--pa-primary)]">
              New entry
            </div>
            <h2
              id={titleId}
              className="mt-1.5 text-[16px] font-extrabold tracking-[-0.015em] text-[var(--pa-text)]"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="pa-focus-ring flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--pa-muted)] transition-colors hover:bg-[var(--pa-canvas)] hover:text-[var(--pa-text)]"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <label
            htmlFor={fieldId}
            className="block text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--pa-muted)]"
          >
            {label}
          </label>
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={placeholder}
            className="pa-focus-ring mt-2 h-11 w-full rounded-[9px] border border-[var(--pa-border)] bg-white px-3.5 text-[12.5px] font-semibold text-[var(--pa-text)] outline-none placeholder:font-medium placeholder:text-[var(--pa-faint)] focus:border-[var(--pa-primary)]"
          />

          {withTemplate && (
            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-[10px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] p-3.5">
              <input
                type="checkbox"
                checked={useTemplate}
                onChange={(event) => setUseTemplate(event.target.checked)}
                className="size-4 shrink-0 accent-[var(--pa-primary)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[11.5px] font-extrabold text-[var(--pa-text)]">
                  Start from the GDT template
                </span>
                <span className="mt-0.5 block text-[10.5px] font-medium text-[var(--pa-muted)]">
                  Pre-filled organizational structure
                </span>
              </span>
              <Sparkles size={16} className="shrink-0 text-[var(--pa-gold)]" aria-hidden="true" />
            </label>
          )}

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="pa-focus-ring mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-[var(--pa-primary)] text-[12px] font-extrabold text-white transition-colors hover:bg-[var(--pa-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="rd-spin" aria-hidden="true" />
                Creating…
              </>
            ) : (
              <>
                <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
                {submitLabel}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Section shell ───────────────────────────────── */
function Section({ eyebrow, title, count, action, children }) {
  const titleId = useId();
  return (
    <section className="rd-panel mt-4" aria-labelledby={titleId}>
      <div className="rd-panel-head">
        <div>
          <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--pa-primary)]">
            {eyebrow}
          </div>
          <h2
            id={titleId}
            className="mt-1.5 flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.015em] text-[var(--pa-text)]"
          >
            {title}
            {typeof count === "number" && (
              <span className="pa-tabular rounded-md border border-[var(--pa-border)] bg-[var(--pa-canvas)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--pa-muted)]">
                {count}
              </span>
            )}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ChartCollection({ charts, viewMode, renderCard, showHeader = true }) {
  if (viewMode === "grid") {
    return <div className="rd-tile-grid">{charts.map(renderCard)}</div>;
  }
  return (
    <div>
      {showHeader && (
        <div className="rd-row-head">
          <span>No.</span>
          <span>Chart</span>
          <span>Standing</span>
          <span className="rd-head-date">Modified</span>
          <span />
        </div>
      )}
      {charts.map(renderCard)}
    </div>
  );
}

/* ── Page ────────────────────────────────────────── */
export default function DashboardTestPage() {
  const { user, displayName, signOut } = useAuth();
  const { isHrAdmin } = useHrAdmin();
  const { folderId } = useParams();
  const currentFolderId = folderId || null;
  const navigate = useNavigate();

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

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem(VIEW_MODE_KEY) || "list",
  );
  const [showNewChart, setShowNewChart] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const profileRef = useRef(null);
  const profileButtonRef = useRef(null);
  const searchId = useId();
  const profileId = useId();

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!profileOpen) return;
    const handlePointerDown = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      profileButtonRef.current?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen]);

  const [starredCharts, setStarredCharts] = useState(() => {
    try {
      const stored = localStorage.getItem(STARRED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleStar = (chartId) => {
    setStarredCharts((prev) => {
      const next = prev.includes(chartId)
        ? prev.filter((id) => id !== chartId)
        : [...prev, chartId];
      localStorage.setItem(STARRED_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Replaces the original window.alert with an inline, dismissible message.
  const handleDownload = async (chart) => {
    setDownloadError("");
    if (!chart.thumbnail_url) {
      setDownloadError(`“${chart.name}” has no thumbnail to download yet.`);
      return;
    }
    try {
      const response = await fetch(chart.thumbnail_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.style.display = "none";
      anchor.href = url;
      anchor.download = `${chart.name.replace(/\s+/g, "_")}_thumbnail.png`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    } catch (error) {
      console.error("Failed to download chart", error);
      setDownloadError(`Could not download “${chart.name}”. Check your connection.`);
    }
  };

  const breadcrumbs = useMemo(
    () => getFolderAncestors(currentFolderId, folders),
    [currentFolderId, folders],
  );
  const currentFolder = breadcrumbs[breadcrumbs.length - 1] || null;

  const visibleFolders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return folders.filter((folder) => {
      const matchesLevel = (folder.parent_id || null) === currentFolderId;
      const matchesSearch = !query || folder.name.toLowerCase().includes(query);
      return matchesLevel && matchesSearch;
    });
  }, [folders, currentFolderId, search]);

  const filteredCharts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return charts;
    return charts.filter((chart) => chart.name.toLowerCase().includes(query));
  }, [charts, search]);

  const sortStarredFirst = (a, b) =>
    (starredCharts.includes(b.id) ? 1 : 0) - (starredCharts.includes(a.id) ? 1 : 0);

  const ownedCharts = filteredCharts
    .filter((c) => c.owner_id === user?.id && (c.folder_id || null) === currentFolderId)
    .sort(sortStarredFirst);

  const pendingCharts = currentFolderId
    ? []
    : filteredCharts
        .filter(
          (c) =>
            c.owner_id !== user?.id &&
            c.chart_shares?.some(
              (s) => s.shared_email === user?.email && s.status === "pending",
            ),
        )
        .sort(sortStarredFirst);

  const sharedCharts = currentFolderId
    ? []
    : filteredCharts
        .filter(
          (c) =>
            c.owner_id !== user?.id &&
            !c.chart_shares?.some(
              (s) => s.shared_email === user?.email && s.status === "pending",
            ),
        )
        .sort(sortStarredFirst);

  const handleCreateChart = async (name, useTemplate) => {
    const chart = await createChart(name, useTemplate, currentFolderId);
    if (chart) {
      setShowNewChart(false);
      navigate(`/chart/${chart.id}`);
    }
  };

  const handleCreateFolder = async (name) => {
    const folder = await createFolder(name, currentFolderId);
    if (folder) setShowNewFolder(false);
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
    if (currentFolderId === deleteFolderTarget) navigate(BASE_PATH);
  };

  const nothingHere =
    !loading && ownedCharts.length === 0 && visibleFolders.length === 0;
  const noSearchResults = nothingHere && Boolean(search.trim());

  const viewToggle = (
    <div
      className="flex rounded-lg border border-[var(--pa-border)] bg-[var(--pa-canvas)] p-1"
      role="group"
      aria-label="View mode"
    >
      {[
        ["list", LayoutList, "List view"],
        ["grid", LayoutGrid, "Grid view"],
      ].map(([mode, Icon, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => setViewMode(mode)}
          aria-pressed={viewMode === mode}
          aria-label={label}
          className={`pa-focus-ring flex size-8 items-center justify-center rounded-md transition-colors ${
            viewMode === mode
              ? "bg-white text-[var(--pa-text)] shadow-sm"
              : "text-[var(--pa-muted)] hover:text-[var(--pa-text)]"
          }`}
        >
          <Icon size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );

  return (
    <div className="gdt-register-dashboard pa-theme">
      {/* ── Masthead ─────────────────────────────────── */}
      <header className="rd-masthead">
        <div className="mx-auto flex h-[72px] w-full max-w-[1400px] items-center gap-3 px-4 sm:px-7 lg:px-10">
          <Link
            to="/"
            className="pa-focus-ring group flex shrink-0 items-center rounded-lg no-underline transition-opacity hover:opacity-90 cursor-pointer"
            aria-label="GDT register home"
          >
            <img
              src="/GDT-Logo (Light).png"
              alt="GDT - General Department of Taxation"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-102"
            />
          </Link>

          <div className="relative mx-auto w-full max-w-[420px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pa-faint)]"
              aria-hidden="true"
            />
            <label htmlFor={searchId} className="sr-only">
              Search charts and folders
            </label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search the register"
              className="pa-focus-ring h-10 w-full rounded-[9px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] pl-10 pr-9 text-[12.5px] font-medium text-[var(--pa-text)] outline-none placeholder:text-[var(--pa-faint)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="pa-focus-ring absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--pa-faint)] transition-colors hover:text-[var(--pa-text)]"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="relative shrink-0" ref={profileRef}>
            <button
              ref={profileButtonRef}
              type="button"
              className="pa-focus-ring flex h-11 items-center gap-2 rounded-[9px] border border-[var(--pa-border)] bg-white px-2 transition-colors hover:border-[var(--pa-border-strong)] sm:px-2.5"
              aria-expanded={profileOpen}
              aria-controls={profileId}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-[var(--pa-sidebar)] text-[10.5px] font-extrabold text-white">
                {(displayName || "U").charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-[140px] truncate text-[11.5px] font-extrabold text-[var(--pa-text)] sm:block">
                {displayName}
              </span>
              <ChevronDown size={14} className="shrink-0 text-[var(--pa-muted)]" aria-hidden="true" />
            </button>

            {profileOpen && (
              <div
                id={profileId}
                className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(84vw,258px)] overflow-hidden rounded-[12px] border border-[var(--pa-border)] bg-white shadow-[var(--pa-shadow)]"
                aria-label="Account options"
              >
                <div className="border-b border-[var(--pa-border)] bg-[var(--pa-canvas)] px-3.5 py-3">
                  <strong className="block truncate text-[12px] font-extrabold text-[var(--pa-text)]">
                    {displayName}
                  </strong>
                  <span className="block truncate text-[10px] font-medium text-[var(--pa-muted)]">
                    {user?.email || "Signed-in account"}
                  </span>
                </div>
                <div className="p-1.5">
                  <Link
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="pa-focus-ring flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-bold text-[var(--pa-text)] no-underline transition-colors hover:bg-[var(--pa-canvas)]"
                  >
                    <Settings2 size={16} className="text-[var(--pa-muted)]" aria-hidden="true" />
                    Profile settings
                  </Link>
                  {isHrAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setProfileOpen(false)}
                      className="pa-focus-ring mt-1 flex min-h-11 items-center gap-2.5 rounded-lg border border-[var(--pa-primary-border)] bg-[var(--pa-primary-soft)] px-2.5 text-[12px] font-extrabold text-[var(--pa-primary)] no-underline transition-colors hover:bg-[#dcebe2]"
                    >
                      <ShieldCheck size={16} aria-hidden="true" />
                      Admin portal
                      <ChevronRight size={14} className="ml-auto" aria-hidden="true" />
                    </Link>
                  )}
                </div>
                <div className="border-t border-[var(--pa-border)] p-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      navigate("/login", { replace: true });
                    }}
                    className="pa-focus-ring flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-[12px] font-bold text-[var(--pa-danger)] transition-colors hover:bg-[var(--pa-danger-soft)]"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-7 sm:px-7 lg:px-10">
        {/* ── Page head ──────────────────────────────── */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div className="min-w-0">
            <div className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--pa-primary)]">
              {currentFolderId ? "Folder" : "Register of charts"}
            </div>
            <h1 className="mt-2.5 truncate text-[26px] font-extrabold tracking-[-0.035em] text-[var(--pa-text)] sm:text-[30px]">
              {currentFolderId ? currentFolder?.name || "Folder" : `Welcome back, ${displayName}`}
            </h1>
            {currentFolderId ? (
              <nav
                className="mt-2.5 flex flex-wrap items-center gap-1 text-[11px] font-bold"
                aria-label="Folder path"
              >
                <Link
                  to={BASE_PATH}
                  className="pa-focus-ring inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[var(--pa-muted)] no-underline transition-colors hover:text-[var(--pa-text)]"
                >
                  <House size={13} aria-hidden="true" />
                  Register
                </Link>
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.id} className="flex items-center gap-1">
                    <ChevronRight size={13} className="text-[var(--pa-faint)]" aria-hidden="true" />
                    <Link
                      to={`${BASE_PATH}/folder/${crumb.id}`}
                      aria-current={i === breadcrumbs.length - 1 ? "page" : undefined}
                      className={`pa-focus-ring rounded-md px-1.5 py-1 no-underline transition-colors ${
                        i === breadcrumbs.length - 1
                          ? "text-[var(--pa-text)]"
                          : "text-[var(--pa-muted)] hover:text-[var(--pa-text)]"
                      }`}
                    >
                      {crumb.name}
                    </Link>
                  </span>
                ))}
              </nav>
            ) : (
              <p className="mt-2 text-[12.5px] leading-5 text-[var(--pa-muted)]">
                Every chart recorded in your name, and every chart shared with you.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowNewFolder(true)}
              className="pa-focus-ring inline-flex h-11 items-center gap-2 rounded-[9px] border border-[var(--pa-border)] bg-white px-4 text-[11.5px] font-extrabold text-[var(--pa-text)] transition-colors hover:border-[var(--pa-border-strong)] hover:bg-[var(--pa-canvas)]"
            >
              <FolderPlus size={15} aria-hidden="true" />
              New folder
            </button>
            <button
              type="button"
              onClick={() => setShowNewChart(true)}
              className="pa-focus-ring inline-flex h-11 items-center gap-2 rounded-[9px] bg-[var(--pa-primary)] px-4 text-[11.5px] font-extrabold text-white shadow-[var(--pa-shadow)] transition-colors hover:bg-[var(--pa-primary-hover)]"
            >
              <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
              New chart
            </button>
          </div>
        </div>

        {downloadError && (
          <div
            role="alert"
            className="mt-5 flex items-center gap-3 rounded-[10px] border border-[var(--pa-danger-border)] bg-[var(--pa-danger-soft)] px-4 py-3"
          >
            <p className="min-w-0 flex-1 text-[11.5px] font-semibold text-[var(--pa-danger)]">
              {downloadError}
            </p>
            <button
              type="button"
              onClick={() => setDownloadError("")}
              aria-label="Dismiss"
              className="pa-focus-ring flex size-8 shrink-0 items-center justify-center rounded-md text-[var(--pa-danger)]"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── Loading ────────────────────────────────── */}
        {loading ? (
          <div className="rd-panel mt-6" aria-busy="true">
            <div className="rd-panel-head">
              <span className="rd-skeleton h-4 w-40" />
            </div>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-4 border-t border-[var(--pa-border)] px-5 py-4">
                <span className="rd-skeleton h-3 w-6 shrink-0" />
                <span className="rd-skeleton size-8 shrink-0 rounded-lg" />
                <span className="rd-skeleton h-3.5 w-[38%]" />
                <span className="rd-skeleton ml-auto hidden h-3 w-24 sm:block" />
              </div>
            ))}
            <p className="sr-only" aria-live="polite">
              Loading your register
            </p>
          </div>
        ) : (
          <>
            {/* ── Folders ───────────────────────────── */}
            {visibleFolders.length > 0 && (
              <Section eyebrow="Sub-registers" title="Folders" count={visibleFolders.length}>
                <div className="rd-folder-grid">
                  {visibleFolders.map((folder) => (
                    <RegisterFolderCard
                      key={folder.id}
                      folder={folder}
                      allFolders={folders}
                      basePath={BASE_PATH}
                      onRename={renameFolder}
                      onDelete={(id) => setDeleteFolderTarget(id)}
                      onMove={moveFolder}
                    />
                  ))}
                </div>
              </Section>
            )}

            {/* ── Charts ────────────────────────────── */}
            {nothingHere ? (
              <div className="rd-panel mt-4 flex flex-col items-center justify-center px-6 py-16 text-center">
                <span className="flex size-12 items-center justify-center rounded-[11px] border border-[var(--pa-border)] bg-[var(--pa-canvas)] text-[var(--pa-faint)]">
                  {noSearchResults ? (
                    <Search size={20} aria-hidden="true" />
                  ) : (
                    <Network size={20} aria-hidden="true" />
                  )}
                </span>
                <h2 className="mt-4 text-[14px] font-extrabold text-[var(--pa-text)]">
                  {noSearchResults
                    ? `Nothing matches “${search.trim()}”`
                    : currentFolderId
                      ? "This folder is empty"
                      : "No charts on record yet"}
                </h2>
                <p className="mt-2 max-w-[40ch] text-[12px] leading-5 text-[var(--pa-muted)]">
                  {noSearchResults
                    ? "Try a shorter term, or check the folder you are standing in."
                    : currentFolderId
                      ? "Charts you create here will be filed under this folder."
                      : "Your first chart starts the register in your name."}
                </p>
                {noSearchResults ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="pa-focus-ring mt-5 inline-flex h-11 items-center gap-2 rounded-[9px] border border-[var(--pa-border)] px-4 text-[11.5px] font-extrabold text-[var(--pa-text)] transition-colors hover:border-[var(--pa-border-strong)]"
                  >
                    Clear search
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowNewChart(true)}
                    className="pa-focus-ring mt-5 inline-flex h-11 items-center gap-2 rounded-[9px] bg-[var(--pa-primary)] px-4 text-[11.5px] font-extrabold text-white transition-colors hover:bg-[var(--pa-primary-hover)]"
                  >
                    <Plus size={15} strokeWidth={2.2} aria-hidden="true" />
                    New chart
                  </button>
                )}
              </div>
            ) : (
              ownedCharts.length > 0 && (
                <Section
                  eyebrow="Entries in your name"
                  title={currentFolderId ? "Charts in this folder" : "Your charts"}
                  count={ownedCharts.length}
                  action={viewToggle}
                >
                  <ChartCollection
                    charts={ownedCharts}
                    viewMode={viewMode}
                    renderCard={(chart, index) => (
                      <RegisterChartCard
                        key={chart.id}
                        chart={chart}
                        index={index}
                        isOwner
                        viewMode={viewMode}
                        isStarred={starredCharts.includes(chart.id)}
                        onToggleStar={() => toggleStar(chart.id)}
                        onShare={() => setShareTarget(chart)}
                        onDownload={() => handleDownload(chart)}
                        onRename={renameChart}
                        onDelete={(id) => setDeleteTarget(id)}
                        onDuplicate={duplicateChart}
                        onMoveToFolder={() => setMoveTarget(chart)}
                      />
                    )}
                  />
                </Section>
              )
            )}

            {/* ── Pending invitations ───────────────── */}
            {pendingCharts.length > 0 && (
              <Section
                eyebrow="Awaiting your decision"
                title="Invitations"
                count={pendingCharts.length}
              >
                <ChartCollection
                  charts={pendingCharts}
                  viewMode={viewMode}
                  showHeader={false}
                  renderCard={(chart, index) => (
                    <RegisterChartCard
                      key={chart.id}
                      chart={chart}
                      index={index}
                      isOwner={false}
                      isPending
                      viewMode={viewMode}
                      isStarred={starredCharts.includes(chart.id)}
                      onToggleStar={() => toggleStar(chart.id)}
                      onDownload={() => handleDownload(chart)}
                      onDelete={(id) => setDeleteTarget(id)}
                      onDuplicate={duplicateChart}
                      onAccept={() => acceptInvite(chart.id)}
                      onDecline={() => declineInvite(chart.id)}
                    />
                  )}
                />
              </Section>
            )}

            {/* ── Shared with me ────────────────────── */}
            {sharedCharts.length > 0 && (
              <Section
                eyebrow="Entries in another name"
                title="Shared with you"
                count={sharedCharts.length}
                action={
                  <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--pa-info-soft)] text-[var(--pa-info)]">
                    <UsersRound size={15} aria-hidden="true" />
                  </span>
                }
              >
                <ChartCollection
                  charts={sharedCharts}
                  viewMode={viewMode}
                  renderCard={(chart, index) => (
                    <RegisterChartCard
                      key={chart.id}
                      chart={chart}
                      index={index}
                      isOwner={false}
                      viewMode={viewMode}
                      isStarred={starredCharts.includes(chart.id)}
                      onToggleStar={() => toggleStar(chart.id)}
                      onDownload={() => handleDownload(chart)}
                      onRename={renameChart}
                      onDelete={(id) => setDeleteTarget(id)}
                      onDuplicate={duplicateChart}
                    />
                  )}
                />
              </Section>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-[var(--pa-border)] bg-white">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-5 text-[10px] font-semibold text-[var(--pa-faint)] sm:px-7 lg:px-10">
          <p className="flex flex-wrap items-center gap-x-2">
            <span>អគ្គនាយកដ្ឋានពន្ធដារ</span>
            <span aria-hidden="true">·</span>
            <span>General Department of Taxation</span>
          </p>
          <p>Ministry of Economy and Finance · Kingdom of Cambodia</p>
        </div>
      </footer>

      {/* ── Dialogs ──────────────────────────────────── */}
      {showNewChart && (
        <CreateDialog
          title="Create a chart"
          label="Chart name"
          placeholder="e.g. Department Structure 2026"
          submitLabel="Create chart"
          withTemplate
          onCreate={handleCreateChart}
          onClose={() => setShowNewChart(false)}
        />
      )}
      {showNewFolder && (
        <CreateDialog
          title="Create a folder"
          label="Folder name"
          placeholder="e.g. 2026 Structure"
          submitLabel="Create folder"
          onCreate={handleCreateFolder}
          onClose={() => setShowNewFolder(false)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete chart"
          message="This will permanently delete this chart. This cannot be undone."
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {deleteFolderTarget && (
        <ConfirmModal
          title="Delete folder"
          message="This will permanently delete this folder. Charts inside will return to the parent level — they will NOT be deleted."
          danger
          onConfirm={handleDeleteFolder}
          onCancel={() => setDeleteFolderTarget(null)}
        />
      )}
      {shareTarget && (
        <ShareModal
          chartId={shareTarget.id}
          chartName={shareTarget.name}
          isPublic={shareTarget.is_public}
          onClose={() => setShareTarget(null)}
        />
      )}
      {moveTarget && (
        <MoveModal
          chart={moveTarget}
          currentFolderId={moveTarget.folder_id || null}
          folders={folders}
          onClose={() => setMoveTarget(null)}
          onMove={(targetFolderId) => {
            moveToFolder(moveTarget.id, targetFolderId);
            setMoveTarget(null);
          }}
        />
      )}
    </div>
  );
}
