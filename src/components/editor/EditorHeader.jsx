import {
  ArrowDownUp,
  ArrowLeftRight,
  CheckCircle2,
  Download,
  Eye,
  Keyboard,
  LayoutGrid,
  Loader2,
  Moon,
  Plus,
  Redo2,
  Save,
  Search as SearchIcon,
  Share2,
  Sun,
  Undo2,
  Upload,
} from 'lucide-react';

/**
 * The full editor toolbar — branding, edit actions, history, search, share,
 * backup, preview, theme toggle, save, and the save-status badge.
 *
 * Extracted from App.jsx FlowApp component (original lines 966–1148).
 * Pure presentational component: no state, all behavior via props.
 */
export default function EditorHeader({
  addRootNode,
  autoLayout,
  toggleLayout,
  layoutDir,
  undo,
  redo,
  canUndo,
  canRedo,
  onSearchOpen,
  onShortcutsOpen,
  isOwner,
  onShareOpen,
  canEdit,
  onDownloadBackup,
  onRestoreBackup,
  onPreviewMode,
  toggleTheme,
  theme,
  onSave,
  saveStatus,
  navigate,
}) {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          className="tb-btn tb-btn--icon"
          onClick={() => navigate('/dashboard')}
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
              theme === 'dark'
                ? '/GDT-Logo (Dark).png'
                : '/GDT-Logo (Light).png'
            }
            alt="GDT - General Department of Taxation"
            style={{ height: 36, objectFit: 'contain' }}
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
          title={layoutDir === 'TB' ? 'Vertical Layout' : 'Horizontal Layout'}
        >
          {layoutDir === 'TB' ? (
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
          onClick={onSearchOpen}
          title="Search (Ctrl+F)"
        >
          <SearchIcon size={15} />
        </button>
        <button
          className="tb-btn tb-btn--icon"
          onClick={onShortcutsOpen}
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={15} />
        </button>

        <div className="tb-divider" />

        {isOwner && (
          <button
            className="tb-btn tb-btn--primary"
            onClick={onShareOpen}
            title="Share chart"
          >
            <Share2 size={14} /> Share
          </button>
        )}
        {canEdit && (
          <>
            <button
              className="tb-btn tb-btn--primary"
              onClick={onDownloadBackup}
              title="Download a recoverable chart backup"
            >
              <Download size={14} /> Backup JSON
            </button>
            <button
              className="tb-btn tb-btn--primary"
              onClick={onRestoreBackup}
              title="Restore nodes and edges from a chart backup"
            >
              <Upload size={14} /> Restore JSON
            </button>
          </>
        )}
        <button
          className="tb-btn tb-btn--primary"
          onClick={onPreviewMode}
          title="Preview mode"
        >
          <Eye size={14} /> Preview
        </button>
        {/* Theme toggle */}
        <button
          className="tb-btn tb-btn--icon"
          onClick={toggleTheme}
          title={
            theme === 'dark'
              ? 'Switch to light theme'
              : 'Switch to dark theme'
          }
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          className="tb-btn tb-btn--primary"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          title="Save now (Ctrl+S)"
        >
          <Save size={14} /> Save
        </button>
      </div>

      {/* Save badge */}
      <div
        className={`save-badge ${saveStatus === 'saving' ? 'save-badge--saving' : saveStatus === 'saved' ? 'save-badge--saved' : ''}`}
      >
        {saveStatus === 'saving' && (
          <Loader2 size={12} className="save-spin" />
        )}
        {saveStatus === 'saved' && <CheckCircle2 size={12} />}
        <span>
          {saveStatus === 'saving'
            ? 'Saving...'
            : saveStatus === 'saved'
              ? 'Saved'
              : ''}
        </span>
      </div>
    </header>
  );
}
