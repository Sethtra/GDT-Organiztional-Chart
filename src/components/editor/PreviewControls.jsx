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
        <div className="absolute top-5 left-5 z-10">
          <button
            className="tb-btn tb-btn--secondary"
            onClick={onBackToHome}
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
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
        </div>
      )}

      <div className="absolute top-5 right-5 z-10 flex items-center gap-2.5">
        {/* Show read-only badge if they lack edit access */}
        {!canEdit && (
          <div className="hint-chip !m-0 flex items-center gap-1.5 font-semibold text-xs text-[var(--text-primary)]">
            <Eye size={13} /> Read Only
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

