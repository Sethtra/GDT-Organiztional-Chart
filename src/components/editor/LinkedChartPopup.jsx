import { X } from 'lucide-react';

/**
 * Floating popup shown when clicking a node that links to another chart.
 * Extracted from App.jsx FlowApp component (original lines 1527–1648).
 */
export default function LinkedChartPopup({ popup, onOpen, onClose }) {
  if (!popup) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: popup.x + 12,
        top: popup.y - 20,
        zIndex: 1000,
        background: 'var(--bg-surface-translucent)',
        border: '1px solid rgba(14, 125, 110, 0.4)',
        borderRadius: 12,
        padding: '14px 18px',
        minWidth: 220,
        boxShadow:
          '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(14,125,110,0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            background: 'rgba(14,125,110,0.2)',
            padding: 6,
            borderRadius: 8,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0e7d6e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div>
          <div
            style={{
              color: 'var(--text-muted)',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Linked Chart
          </div>
          <div
            style={{
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {popup.node.data.nameEn || popup.node.data.name}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 2,
          }}
        >
          <X size={14} />
        </button>
      </div>
      <button
        onClick={() => {
          onOpen(popup.node.data.linkedChartId);
          onClose();
        }}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #0e7d6e, #0a5c50)',
          border: 'none',
          borderRadius: 8,
          color: 'white',
          padding: '9px 14px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Open Chart
      </button>
    </div>
  );
}
