import { Download, Eye, EyeOff } from 'lucide-react';

/**
 * Overlay controls shown when the editor is in preview mode.
 * Extracted from App.jsx FlowApp component (original lines 1151–1230).
 */
export default function PreviewControls({
  canEdit,
  onDownloadImage,
  onExitPreview,
  onBackToHome,
}) {
  return (
    <>
      {/* Back button for Viewers (read-only shared links) */}
      {!canEdit && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
          <button
            className="tb-btn"
            onClick={onBackToHome}
            style={{
              background: 'var(--bg-surface-translucent)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid rgba(var(--surface-rgb),0.1)',
              backdropFilter: 'blur(12px)',
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
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 10,
          display: 'flex',
          gap: 10,
        }}
      >
        {/* Show read-only badge if they lack edit access */}
        {!canEdit && (
          <div
            style={{
              background: 'var(--bg-surface-translucent)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
            }}
          >
            <Eye size={14} style={{ marginRight: 6 }} /> Read Only
          </div>
        )}
        <button className="tb-btn tb-btn--primary" onClick={onDownloadImage}>
          <Download size={14} /> Download PNG
        </button>
        {canEdit && (
          <button className="tb-btn tb-btn--danger" onClick={onExitPreview}>
            <EyeOff size={14} /> Exit Preview
          </button>
        )}
      </div>
    </>
  );
}
