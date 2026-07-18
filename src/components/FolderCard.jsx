import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, MoreVertical, Edit2, Trash2, FolderInput } from 'lucide-react';

/**
 * FolderCard — Google Drive-style folder chip.
 * Renders as a navigable link with an action menu on hover.
 */
export default function FolderCard({ folder, allFolders = [], onRename, onDelete, onMove }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  // Folders that could be targets (not self, not already its parent, not its own descendants)
  const moveTargets = allFolders.filter(f => f.id !== folder.id && f.id !== folder.parent_id);

  return (
    <div 
      className="folder-chip" 
      style={{ userSelect: 'none' }}
      onClick={() => {
        if (!isEditing) navigate(`/dashboard/folder/${folder.id}`);
      }}
    >
      <Folder size={18} className="folder-chip__icon" style={{ color: 'var(--text-secondary)', fill: 'var(--text-secondary)', fillOpacity: 0.15 }} />

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="chart-card__rename-input"
          style={{ zIndex: 2, position: 'relative', fontSize: 13, padding: '2px 6px' }}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename();
            if (e.key === 'Escape') { setEditName(folder.name); setIsEditing(false); }
          }}
        />
      ) : (
        <span className="folder-chip__name" style={{ zIndex: 1, position: 'relative' }}>
          {folder.name}
        </span>
      )}

      {/* Three-dot menu */}
      <div style={{ position: 'relative', zIndex: 2 }} ref={menuRef}>
        <button
          className="folder-chip__menu-btn"
          aria-label="Folder options"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(v => !v); }}
        >
          <MoreVertical size={15} />
        </button>

        {menuOpen && (
          <div className="chart-card__menu" style={{ minWidth: 160 }}>
            <button className="chart-card__menu-item" onClick={() => { setIsEditing(true); setMenuOpen(false); }}>
              <Edit2 size={13} /> Rename
            </button>

            {moveTargets.length > 0 && (
              <>
                <div className="chart-card__menu-divider" />
                <div style={{ fontSize: 11, padding: '4px 14px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Move into
                </div>
                {folder.parent_id && (
                  <button className="chart-card__menu-item" onClick={() => { onMove(folder.id, null); setMenuOpen(false); }}>
                    <FolderInput size={13} /> Move to Root
                  </button>
                )}
                {moveTargets.map(f => (
                  <button key={f.id} className="chart-card__menu-item" onClick={() => { onMove(folder.id, f.id); setMenuOpen(false); }}>
                    <Folder size={13} /> {f.name}
                  </button>
                ))}
              </>
            )}

            <div className="chart-card__menu-divider" />
            <button
              className="chart-card__menu-item chart-card__menu-item--danger"
              onClick={() => { onDelete(folder.id); setMenuOpen(false); }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
