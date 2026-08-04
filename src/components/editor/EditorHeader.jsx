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
 * Pure presentational component: no state, all behavior via props.
 *
 * The brand mark is the seal only, at a resolution it is actually displayed at,
 * with the wordmark set as live text beside it. The old header scaled the full
 * 2609x546 lockup down to ~34px tall — a 16x downscale the browser rasterised
 * once with a cheap filter, which is why it looked soft until a hover transform
 * forced a high-quality re-raster. Text cannot blur, and the seal now ships at
 * 1x/2x/3x so no downscaling happens at display size.
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
      {/* Brand & Back Button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="tb-btn tb-btn--icon"
          onClick={() => navigate('/dashboard')}
          title="Back to Dashboard"
          aria-label="Back to Dashboard"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="tb-divider" />
        <div
          className="header-brand"
          onClick={() => navigate('/dashboard')}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/dashboard'); }}
          title="Go to Dashboard"
          aria-label="Go to Dashboard"
        >
          <img
            src="/gdt-seal-mark.png"
            srcSet="/gdt-seal-mark.png 1x, /gdt-seal-mark@2x.png 2x, /gdt-seal-mark@3x.png 3x"
            width="30"
            height="30"
            alt=""
            className="header-brand__seal"
          />
          <div className="header-brand__rule" />
          <div className="header-brand__label">
            <span className="header-brand__kh">អគ្គនាយកដ្ឋានពន្ធដារ</span>
            <span className="header-brand__en">General Department of Taxation</span>
          </div>
        </div>
      </div>

      {/* Main Toolbar */}
      <div className="header-toolbar">
        {/* Edit group */}
        <button
          className="tb-btn tb-btn--primary"
          onClick={addRootNode}
          title="Add Root Node"
        >
          <Plus size={14} aria-hidden="true" /> Add Node
        </button>
        <button
          className="tb-btn tb-btn--icon"
          onClick={autoLayout}
          title="Auto Layout Diagram"
          aria-label="Auto Layout Diagram"
        >
          <LayoutGrid size={15} aria-hidden="true" />
        </button>
        <button
          className="tb-btn tb-btn--icon"
          onClick={toggleLayout}
          title={layoutDir === 'TB' ? 'Switch to Horizontal Layout' : 'Switch to Vertical Layout'}
          aria-label={layoutDir === 'TB' ? 'Switch to Horizontal Layout' : 'Switch to Vertical Layout'}
        >
          {layoutDir === 'TB' ? (
            <ArrowDownUp size={15} aria-hidden="true" />
          ) : (
            <ArrowLeftRight size={15} aria-hidden="true" />
          )}
        </button>

        <div className="tb-divider" />

        {/* History group */}
        <button
          className="tb-btn tb-btn--icon"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo2 size={15} aria-hidden="true" />
        </button>
        <button
          className="tb-btn tb-btn--icon"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo2 size={15} aria-hidden="true" />
        </button>

        <div className="tb-divider" />

        {/* Search & Shortcuts group */}
        <button
          className="tb-btn tb-btn--icon"
          onClick={onSearchOpen}
          title="Search Nodes (Ctrl+F)"
          aria-label="Search Nodes"
        >
          <SearchIcon size={15} aria-hidden="true" />
        </button>
        <button
          className="tb-btn tb-btn--icon"
          onClick={onShortcutsOpen}
          title="Keyboard Shortcuts (?)"
          aria-label="Keyboard Shortcuts"
        >
          <Keyboard size={15} aria-hidden="true" />
        </button>

        <div className="tb-divider" />

        {/* Actions group */}
        {isOwner && (
          <button
            className="tb-btn tb-btn--secondary"
            onClick={onShareOpen}
            title="Share chart access"
          >
            <Share2 size={14} aria-hidden="true" /> Share
          </button>
        )}
        {canEdit && (
          <>
            <button
              className="tb-btn tb-btn--secondary"
              onClick={onDownloadBackup}
              title="Download backup JSON"
            >
              <Download size={14} aria-hidden="true" /> Backup
            </button>
            <button
              className="tb-btn tb-btn--secondary"
              onClick={onRestoreBackup}
              title="Restore from backup JSON"
            >
              <Upload size={14} aria-hidden="true" /> Restore
            </button>
          </>
        )}
        <button
          className="tb-btn tb-btn--secondary"
          onClick={onPreviewMode}
          title="Enter Preview Mode"
        >
          <Eye size={14} aria-hidden="true" /> Preview
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
          aria-label={
            theme === 'dark'
              ? 'Switch to light theme'
              : 'Switch to dark theme'
          }
        >
          {theme === 'dark' ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
        </button>

        {/* Save button */}
        <button
          className="tb-btn tb-btn--primary"
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          title="Save Chart (Ctrl+S)"
        >
          <Save size={14} aria-hidden="true" /> Save
        </button>
      </div>

      {/* Save badge */}
      <div
        className={`save-badge ${saveStatus === 'saving' ? 'save-badge--saving' : saveStatus === 'saved' ? 'save-badge--saved' : ''}`}
        role="status"
        aria-live="polite"
      >
        {saveStatus === 'saving' && (
          <Loader2 size={12} className="save-spin" aria-hidden="true" />
        )}
        {saveStatus === 'saved' && <CheckCircle2 size={12} aria-hidden="true" />}
        <span>
          {saveStatus === 'saving'
            ? 'Saving'
            : saveStatus === 'saved'
              ? 'Saved'
              : ''}
        </span>
      </div>
    </header>
  );
}
