import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Copy, Trash2, Clock, FilePlus2, Check, Folder, UserPlus, Download, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ChartCard({
  chart,
  isOwner,
  isPending,
  folders = [],
  viewMode = 'grid',
  isStarred,
  onRename,
  onDelete,
  onDuplicate,
  onMoveToFolder,
  onShare,
  onDownload,
  onToggleStar,
  onAccept,
  onDecline
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chart.name);
  const menuRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [isEditing]);

  const submitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== chart.name) onRename(chart.id, trimmed);
    else setEditName(chart.name);
    setIsEditing(false);
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return viewMode === 'list' ? (
    <div className="chart-list-item">
      <Link to={`/chart/${chart.id}`} className="chart-list-item__thumb-link">
        <div className="chart-list-item__icon-wrap">
          <FilePlus2 size={18} className="chart-list-item__icon" />
        </div>
      </Link>
      
      <div className="chart-list-item__name">
        {isEditing ? (
          <div className="chart-card__rename-wrap" style={{ maxWidth: 300 }}>
            <input
              ref={inputRef}
              type="text"
              className="chart-card__rename-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setEditName(chart.name); setIsEditing(false); } }}
            />
            <button className="chart-card__rename-confirm" onClick={submitRename}><Check size={14} /></button>
          </div>
        ) : (
          <>
            <Link to={`/chart/${chart.id}`} className="chart-list-item__title" onDoubleClick={() => isOwner && setIsEditing(true)} title="Double-click to rename">
              {chart.name}
            </Link>
            {isStarred && <Star size={14} fill="#facc15" color="#facc15" style={{ marginLeft: 6, flexShrink: 0 }} />}
          </>
        )}
      </div>

      <div className="chart-list-item__owner">
        {isOwner ? 'me' : 'Shared'}
      </div>

      <div className="chart-list-item__date">
        {formatDate(chart.updated_at)}
      </div>

      <div className="chart-list-item__actions">
        {/* Quick Actions (Hover) */}
        {isOwner && (
          <button className="chart-list-item__action-btn chart-list-item__quick-btn" title="Share" onClick={(e) => { e.preventDefault(); onShare && onShare(); }}>
            <UserPlus size={16} />
          </button>
        )}
        <button className="chart-list-item__action-btn chart-list-item__quick-btn" title="Download" onClick={(e) => { e.preventDefault(); onDownload && onDownload(); }}>
          <Download size={16} />
        </button>
        {isOwner && (
          <button className="chart-list-item__action-btn chart-list-item__quick-btn" title="Rename" onClick={(e) => { e.preventDefault(); setIsEditing(true); }}>
            <Edit2 size={16} />
          </button>
        )}
        <button className="chart-list-item__action-btn chart-list-item__quick-btn" title={isStarred ? "Remove from starred" : "Add to starred"} onClick={(e) => { e.preventDefault(); onToggleStar && onToggleStar(); }}>
          <Star size={16} fill={isStarred ? "currentColor" : "none"} className={isStarred ? "text-yellow-500" : ""} />
        </button>

        {/* 3-dot Menu (Always visible) */}
        <div className="chart-card__menu-wrap" ref={menuRef} style={{ marginLeft: 4 }}>
          <button className="chart-list-item__action-btn" onClick={() => setMenuOpen(v => !v)} title="More actions">
            <MoreVertical size={16} />
          </button>
          {menuOpen && (
            <div className="chart-card__menu" style={{ right: 0, top: '100%', zIndex: 100 }}>
              {isOwner && (
                <button className="chart-card__menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); onShare && onShare(); }}>
                  <UserPlus size={13} /> Share
                </button>
              )}
              <button className="chart-card__menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); onDownload && onDownload(); }}>
                <Download size={13} /> Download
              </button>
              {isOwner && (
                <button className="chart-card__menu-item" onClick={(e) => { e.preventDefault(); setIsEditing(true); setMenuOpen(false); }}>
                  <Edit2 size={13} /> Rename
                </button>
              )}
              <button className="chart-card__menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); onToggleStar && onToggleStar(); }}>
                <Star size={13} fill={isStarred ? "currentColor" : "none"} /> {isStarred ? 'Remove from starred' : 'Add to starred'}
              </button>
              <div className="chart-card__menu-divider" />
              <button className="chart-card__menu-item" onClick={() => { onDuplicate(chart); setMenuOpen(false); }}>
                <Copy size={13} /> Duplicate
              </button>
              
              {isOwner && (
                <>
                  <div className="chart-card__menu-divider" />
                  <button className="chart-card__menu-item" onClick={() => { onMoveToFolder && onMoveToFolder(); setMenuOpen(false); }}>
                    <Folder size={13} /> Move
                  </button>
                </>
              )}
              {isOwner && (
                <>
                  <div className="chart-card__menu-divider" />
                  <button className="chart-card__menu-item chart-card__menu-item--danger" onClick={() => { onDelete(chart.id); setMenuOpen(false); }}>
                    <Trash2 size={13} /> Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="chart-card">
      {/* Thumbnail */}
      <Link to={`/chart/${chart.id}`} className="chart-card__thumb-link">
        <div className="chart-card__thumb">
          {chart.thumbnail_url
            ? <img src={chart.thumbnail_url} alt={chart.name} className="chart-card__thumb-img" />
            : (
              <div className="chart-card__placeholder">
                <FilePlus2 size={36} opacity={0.25} />
                <span>No preview yet</span>
              </div>
            )
          }
          <div className="chart-card__badge" style={{ background: isOwner ? 'rgba(14,125,110,.9)' : 'rgba(30,87,153,.9)' }}>
            {isOwner ? 'Owner' : 'Shared'}
          </div>
          <div className="chart-card__overlay">
            <span className="chart-card__open-btn">Open Editor →</span>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="chart-card__info">
        <div className="chart-card__title-row">
          {isEditing ? (
            <div className="chart-card__rename-wrap">
              <input
                ref={inputRef}
                type="text"
                className="chart-card__rename-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') { setEditName(chart.name); setIsEditing(false); } }}
              />
              <button className="chart-card__rename-confirm" onClick={submitRename}><Check size={14} /></button>
            </div>
          ) : (
            <div className="chart-card__title" onDoubleClick={() => isOwner && setIsEditing(true)} title="Double-click to rename" style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chart.name}</span>
              {isStarred && <Star size={14} fill="#facc15" color="#facc15" style={{ marginLeft: 6, flexShrink: 0 }} />}
            </div>
          )}

          {/* Context menu */}
          <div className="chart-card__menu-wrap" ref={menuRef}>
            <button className="chart-card__menu-btn" onClick={() => setMenuOpen(v => !v)}>
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="chart-card__menu">
                {isOwner && (
                  <button className="chart-card__menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); onShare && onShare(); }}>
                    <UserPlus size={13} /> Share
                  </button>
                )}
                <button className="chart-card__menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); onDownload && onDownload(); }}>
                  <Download size={13} /> Download
                </button>
                {isOwner && (
                  <button className="chart-card__menu-item" onClick={(e) => { e.preventDefault(); setIsEditing(true); setMenuOpen(false); }}>
                    <Edit2 size={13} /> Rename
                  </button>
                )}
                <button className="chart-card__menu-item" onClick={(e) => { e.preventDefault(); setMenuOpen(false); onToggleStar && onToggleStar(); }}>
                  <Star size={13} fill={isStarred ? "currentColor" : "none"} /> {isStarred ? 'Remove from starred' : 'Add to starred'}
                </button>
                <div className="chart-card__menu-divider" />
                <button className="chart-card__menu-item" onClick={() => { onDuplicate(chart); setMenuOpen(false); }}>
                  <Copy size={13} /> Duplicate
                </button>

                {isOwner && (
                  <>
                    <div className="chart-card__menu-divider" />
                    <button className="chart-card__menu-item" onClick={() => { onMoveToFolder && onMoveToFolder(); setMenuOpen(false); }}>
                      <Folder size={13} /> Move
                    </button>
                  </>
                )}

                {isOwner && (
                  <>
                    <div className="chart-card__menu-divider" />
                    <button className="chart-card__menu-item chart-card__menu-item--danger" onClick={() => { onDelete(chart.id); setMenuOpen(false); }}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="chart-card__meta">
          <Clock size={11} /> Edited {formatDate(chart.updated_at)}
        </div>
      </div>
    </div>
  );
}
