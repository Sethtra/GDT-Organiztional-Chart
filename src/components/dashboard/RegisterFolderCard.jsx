import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, FolderInput, MoreVertical, Pencil, Trash2 } from "lucide-react";

/**
 * Folder entry in the register-styled dashboard.
 *
 * Same behaviour as the original FolderCard (navigate, inline rename, move,
 * delete) but drawn on the admin `--pa-*` system and with a configurable base
 * path so it can serve a test route without touching the live dashboard.
 */
export default function RegisterFolderCard({
  folder,
  allFolders = [],
  basePath = "/dashboard",
  onRename,
  onDelete,
  onMove,
}) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
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
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed);
    else setEditName(folder.name);
    setIsEditing(false);
  };

  // Valid destinations: not itself, not the folder it already sits in.
  const moveTargets = allFolders.filter((f) => f.id !== folder.id && f.id !== folder.parent_id);

  return (
    <div className={`rd-folder ${menuOpen ? "rd-folder-menu-open" : ""}`}>
      <button
        type="button"
        className="rd-folder-open pa-focus-ring"
        onClick={() => {
          if (!isEditing) navigate(`${basePath}/folder/${folder.id}`);
        }}
        disabled={isEditing}
      >
        <span className="rd-folder-icon">
          <Folder size={16} strokeWidth={1.9} aria-hidden="true" />
        </span>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="rd-rename-input"
            value={editName}
            aria-label={`Rename folder ${folder.name}`}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setEditName(event.target.value)}
            onBlur={submitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitRename();
              if (event.key === "Escape") {
                setEditName(folder.name);
                setIsEditing(false);
              }
            }}
          />
        ) : (
          <span className="rd-folder-name">{folder.name}</span>
        )}
      </button>

      <div className={`rd-menu-anchor ${menuOpen ? "rd-menu-anchor-open" : ""}`} ref={menuRef}>
        <button
          type="button"
          className="rd-icon-button pa-focus-ring"
          aria-label={`Options for ${folder.name}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MoreVertical size={15} aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="rd-menu" role="menu">
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

            {moveTargets.length > 0 && (
              <>
                <div className="rd-menu-divider" role="none" />
                <div className="rd-menu-label" role="none">
                  Move into
                </div>
                {folder.parent_id && (
                  <button
                    type="button"
                    role="menuitem"
                    className="rd-menu-item"
                    onClick={() => {
                      onMove(folder.id, null);
                      setMenuOpen(false);
                    }}
                  >
                    <FolderInput size={14} aria-hidden="true" />
                    Move to root
                  </button>
                )}
                {moveTargets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    role="menuitem"
                    className="rd-menu-item"
                    onClick={() => {
                      onMove(folder.id, target.id);
                      setMenuOpen(false);
                    }}
                  >
                    <Folder size={14} aria-hidden="true" />
                    <span className="rd-menu-item-text">{target.name}</span>
                  </button>
                ))}
              </>
            )}

            <div className="rd-menu-divider" role="none" />
            <button
              type="button"
              role="menuitem"
              className="rd-menu-item rd-menu-item-danger"
              onClick={() => {
                onDelete(folder.id);
                setMenuOpen(false);
              }}
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
