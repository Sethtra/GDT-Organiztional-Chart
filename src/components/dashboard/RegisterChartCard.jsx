import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Copy,
  Download,
  FolderInput,
  Loader2,
  MoreVertical,
  Network,
  Pencil,
  Share2,
  Star,
  Trash2,
  X,
} from "lucide-react";

function formatDate(iso) {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

/**
 * Chart entry in the register-styled dashboard.
 *
 * Preserves the full action set of the original ChartCard — inline rename,
 * star, share, download, duplicate, move, delete, and invitation accept /
 * decline — in both list ("register row") and grid ("tile") presentations.
 */
export default function RegisterChartCard({
  chart,
  index,
  isOwner,
  isPending,
  viewMode = "list",
  isStarred,
  onRename,
  onDelete,
  onDuplicate,
  onMoveToFolder,
  onShare,
  onDownload,
  onToggleStar,
  onAccept,
  onDecline,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chart.name);
  const [inviteAction, setInviteAction] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const submitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== chart.name) onRename(chart.id, trimmed);
    else setEditName(chart.name);
    setIsEditing(false);
  };

  // The original surfaced invitation failures through window.alert; an inline
  // message keeps the error next to the control that caused it.
  const handleInvitation = async (action) => {
    const callback = action === "accept" ? onAccept : onDecline;
    if (!callback || inviteAction) return;

    setInviteAction(action);
    setInviteError("");
    try {
      const result = await callback();
      if (result?.error) {
        const message = typeof result.error === "string" ? result.error : result.error.message;
        setInviteError(message || `Unable to ${action} this invitation.`);
      }
    } catch (error) {
      console.error(`Failed to ${action} chart invitation:`, error);
      setInviteError(`Unable to ${action} this invitation. Please try again.`);
    } finally {
      setInviteAction(null);
    }
  };

  const renameField = (
    <span className="rd-rename-wrap">
      <input
        ref={inputRef}
        type="text"
        className="rd-rename-input"
        value={editName}
        aria-label={`Rename chart ${chart.name}`}
        onChange={(event) => setEditName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submitRename();
          if (event.key === "Escape") {
            setEditName(chart.name);
            setIsEditing(false);
          }
        }}
      />
      <button
        type="button"
        className="rd-rename-confirm pa-focus-ring"
        onClick={submitRename}
        aria-label="Save name"
      >
        <Check size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="rd-rename-cancel pa-focus-ring"
        onClick={() => {
          setEditName(chart.name);
          setIsEditing(false);
        }}
        aria-label="Cancel rename"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </span>
  );

  const invitationActions = (
    <div className="rd-invite">
      <button
        type="button"
        className="rd-invite-accept pa-focus-ring"
        onClick={() => handleInvitation("accept")}
        disabled={Boolean(inviteAction)}
      >
        {inviteAction === "accept" ? (
          <Loader2 size={13} className="rd-spin" aria-hidden="true" />
        ) : (
          <Check size={13} aria-hidden="true" />
        )}
        Accept
      </button>
      <button
        type="button"
        className="rd-invite-decline pa-focus-ring"
        onClick={() => handleInvitation("decline")}
        disabled={Boolean(inviteAction)}
      >
        {inviteAction === "decline" ? (
          <Loader2 size={13} className="rd-spin" aria-hidden="true" />
        ) : (
          <X size={13} aria-hidden="true" />
        )}
        Decline
      </button>
      {inviteError && (
        <p className="rd-invite-error" role="alert">
          {inviteError}
        </p>
      )}
    </div>
  );

  const starButton = (
    <button
      type="button"
      className={`rd-icon-button pa-focus-ring ${isStarred ? "rd-icon-button-starred" : ""}`}
      title={isStarred ? "Remove from starred" : "Add to starred"}
      aria-label={isStarred ? `Unstar ${chart.name}` : `Star ${chart.name}`}
      aria-pressed={Boolean(isStarred)}
      onClick={() => onToggleStar?.()}
    >
      <Star size={15} fill={isStarred ? "currentColor" : "none"} aria-hidden="true" />
    </button>
  );

  const actionMenu = (
    <div className={`rd-menu-anchor ${menuOpen ? "rd-menu-anchor-open" : ""}`} ref={menuRef}>
      <button
        type="button"
        className="rd-icon-button pa-focus-ring"
        aria-label={`Actions for ${chart.name}`}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MoreVertical size={15} aria-hidden="true" />
      </button>

      {menuOpen && (
        <div className="rd-menu rd-menu-end" role="menu">
          {isOwner && onShare && (
            <button
              type="button"
              role="menuitem"
              className="rd-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onShare();
              }}
            >
              <Share2 size={14} aria-hidden="true" />
              Share
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="rd-menu-item"
            onClick={() => {
              setMenuOpen(false);
              onDownload?.();
            }}
          >
            <Download size={14} aria-hidden="true" />
            Download thumbnail
          </button>
          {onRename && (
            <button
              type="button"
              role="menuitem"
              className="rd-menu-item"
              onClick={() => {
                setIsEditing(true);
                setMenuOpen(false);
              }}
            >
              <Pencil size={14} aria-hidden="true" />
              Rename
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="rd-menu-item"
            onClick={() => {
              setMenuOpen(false);
              onToggleStar?.();
            }}
          >
            <Star size={14} aria-hidden="true" />
            {isStarred ? "Remove from starred" : "Add to starred"}
          </button>
          <button
            type="button"
            role="menuitem"
            className="rd-menu-item"
            onClick={() => {
              onDuplicate(chart);
              setMenuOpen(false);
            }}
          >
            <Copy size={14} aria-hidden="true" />
            Duplicate
          </button>
          {isOwner && onMoveToFolder && (
            <button
              type="button"
              role="menuitem"
              className="rd-menu-item"
              onClick={() => {
                onMoveToFolder();
                setMenuOpen(false);
              }}
            >
              <FolderInput size={14} aria-hidden="true" />
              Move to folder
            </button>
          )}
          <div className="rd-menu-divider" role="none" />
          <button
            type="button"
            role="menuitem"
            className="rd-menu-item rd-menu-item-danger"
            onClick={() => {
              onDelete(chart.id);
              setMenuOpen(false);
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </button>
        </div>
      )}
    </div>
  );

  const standing = isPending ? (
    <span className="rd-badge rd-badge-warning">Invitation</span>
  ) : isOwner ? (
    <span className="rd-badge rd-badge-success">
      <span className="rd-badge-dot" aria-hidden="true" />
      Owner
    </span>
  ) : (
    <span className="rd-badge rd-badge-info">
      <span className="rd-badge-dot" aria-hidden="true" />
      Shared
    </span>
  );

  /* ── List: a ruled register row ─────────────────── */
  if (viewMode === "list") {
    return (
      <div className={`rd-row ${isPending ? "rd-row-pending" : ""} ${menuOpen ? "rd-row-menu-open" : ""}`}>
        <span className="rd-row-index pa-tabular" aria-hidden="true">
          {typeof index === "number" ? String(index + 1).padStart(2, "0") : "—"}
        </span>

        <span className="rd-row-name">
          {isEditing ? (
            renameField
          ) : (
            <Link to={`/chart/${chart.id}`} className="rd-row-link pa-focus-ring">
              <span className="rd-row-glyph" aria-hidden="true">
                <Network size={15} strokeWidth={1.9} />
              </span>
              <span className="rd-row-title">{chart.name || "Untitled chart"}</span>
              {isStarred && (
                <Star size={12} className="rd-row-star" fill="currentColor" aria-label="Starred" />
              )}
            </Link>
          )}
        </span>

        <span className="rd-row-standing">{standing}</span>
        <span className="rd-row-date pa-tabular">{formatDate(chart.updated_at)}</span>

        <span className="rd-row-actions">
          {isPending ? (
            invitationActions
          ) : (
            <>
              {starButton}
              {actionMenu}
            </>
          )}
        </span>
      </div>
    );
  }

  /* ── Grid: a tile carrying the chart's own thumbnail ── */
  return (
    <article className={`rd-tile ${isPending ? "rd-tile-pending" : ""} ${menuOpen ? "rd-tile-menu-open" : ""}`}>
      <Link to={`/chart/${chart.id}`} className="rd-tile-preview pa-focus-ring">
        {chart.thumbnail_url ? (
          <img src={chart.thumbnail_url} alt="" loading="lazy" />
        ) : (
          <span className="rd-tile-placeholder" aria-hidden="true">
            <Network size={26} strokeWidth={1.5} />
          </span>
        )}
      </Link>

      <div className="rd-tile-body">
        <div className="rd-tile-heading">
          {isEditing ? (
            renameField
          ) : (
            <Link to={`/chart/${chart.id}`} className="rd-tile-title pa-focus-ring">
              {chart.name || "Untitled chart"}
            </Link>
          )}
          {!isPending && (
            <span className="rd-tile-controls">
              {starButton}
              {actionMenu}
            </span>
          )}
        </div>

        <div className="rd-tile-meta">
          {standing}
          <span className="rd-tile-date pa-tabular">{formatDate(chart.updated_at)}</span>
        </div>

        {isPending && invitationActions}
      </div>
    </article>
  );
}
