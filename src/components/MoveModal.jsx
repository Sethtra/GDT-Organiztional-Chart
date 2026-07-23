import { useState, useMemo } from 'react';
import { X, Folder, ChevronRight, ArrowLeft, HardDrive } from 'lucide-react';
import './MoveModal.css';

export default function MoveModal({ chart, currentFolderId, folders, onClose, onMove }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'starred'
  const [navPath, setNavPath] = useState([null]); // Array of folder IDs representing the path. null is root.
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  const currentNavId = navPath[navPath.length - 1];
  
  // Folders to display in the current navigated location
  const displayFolders = useMemo(() => {
    if (activeTab === 'starred') return []; // Mock empty starred folders for now
    return folders.filter(f => (f.parent_id || null) === currentNavId);
  }, [folders, currentNavId, activeTab]);

  const getCurrentLocationName = () => {
    if (!currentFolderId) return 'Default';
    const folder = folders.find(f => f.id === currentFolderId);
    return folder ? folder.name : 'Default';
  };

  const getNavLocationName = () => {
    if (!currentNavId) return 'Default';
    const folder = folders.find(f => f.id === currentNavId);
    return folder ? folder.name : 'Default';
  };

  const handleNavigateIn = (folderId) => {
    setNavPath([...navPath, folderId]);
    setSelectedFolderId(null);
  };

  const handleNavigateBack = () => {
    if (navPath.length > 1) {
      setNavPath(navPath.slice(0, -1));
      setSelectedFolderId(null);
    }
  };

  const destinationId = selectedFolderId !== null ? selectedFolderId : currentNavId;
  const canMove = destinationId !== (chart.folder_id || null);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="move-modal" onClick={e => e.stopPropagation()}>
        
        <div className="move-modal__header">
          <h2 className="move-modal__title">Move {chart.name}</h2>
          <div className="move-modal__current-loc">
            Current location: <span className="move-modal__loc-badge"><HardDrive size={12} /> {getCurrentLocationName()}</span>
          </div>
          <button className="move-modal__close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="move-modal__tabs">
          <button 
            className={`move-modal__tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => { setActiveTab('all'); setNavPath([null]); setSelectedFolderId(null); }}
          >
            All locations
          </button>
          <button 
            className={`move-modal__tab ${activeTab === 'starred' ? 'active' : ''}`}
            onClick={() => { setActiveTab('starred'); setNavPath([null]); setSelectedFolderId(null); }}
          >
            Starred
          </button>
        </div>

        <div className="move-modal__body">
          {navPath.length > 1 && activeTab === 'all' && (
            <div className="move-modal__back-nav" onClick={handleNavigateBack}>
              <ArrowLeft size={16} />
              <span>{getNavLocationName()}</span>
            </div>
          )}

          <div className="move-modal__list">
            {displayFolders.length === 0 ? (
              <div className="move-modal__empty">No folders here</div>
            ) : (
              displayFolders.map(folder => (
                <div 
                  key={folder.id} 
                  className={`move-modal__item ${selectedFolderId === folder.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFolderId(folder.id)}
                  onDoubleClick={() => handleNavigateIn(folder.id)}
                >
                  <div className="move-modal__item-icon">
                    <Folder size={20} fill={selectedFolderId === folder.id ? "currentColor" : "none"} />
                  </div>
                  <div className="move-modal__item-name">{folder.name}</div>
                  <button className="move-modal__item-nav" onClick={(e) => { e.stopPropagation(); handleNavigateIn(folder.id); }}>
                    <ChevronRight size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="move-modal__footer">
          <button className="move-modal__btn move-modal__btn--cancel" onClick={onClose}>Cancel</button>
          <button 
            className="move-modal__btn move-modal__btn--primary" 
            disabled={!canMove}
            onClick={() => {
              if (canMove) onMove(destinationId);
            }}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
