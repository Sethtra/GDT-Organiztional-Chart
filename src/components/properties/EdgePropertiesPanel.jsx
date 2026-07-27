import { useEffect, useRef, useState } from "react";
import { Minus, Palette, RotateCcw, Trash2, X } from "lucide-react";

import { ARROWHEAD_OPTIONS } from "../../data/edgeOptions";

const COLOR_PRESETS = [
  { label: "Navy",    value: "#0f2044" },
  { label: "Teal",   value: "#0e7d6e" },
  { label: "Blue",   value: "var(--default-node-bg)" },
  { label: "Sky",    value: "#0369a1" },
  { label: "Purple", value: "#6d28d9" },
  { label: "Violet", value: "#7c3aed" },
  { label: "Amber",  value: "#b45309" },
  { label: "Orange", value: "#c2410c" },
  { label: "Red",    value: "#b91c1c" },
  { label: "Green",  value: "#047857" },
  { label: "Pink",   value: "#be185d" },
  { label: "Slate",  value: "#334155" },
];

// ── Arrow preview SVG ─────────────────────────────────────────────────────────
function ArrowPreview({ type, color }) {
  const previews = {
    'closed':       <polygon points="28,10 18,6 18,14" fill={color} />,
    'open':         <polyline points="18,6 28,10 18,14" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />,
    'circle':       <circle cx="24" cy="10" r="4" fill={color} />,
    'ring':         <circle cx="24" cy="10" r="4" fill="none" stroke={color} strokeWidth={1.5} />,
    'diamond':      <polygon points="28,10 23,6 18,10 23,14" fill={color} />,
    'diamond-open': <polygon points="28,10 23,6 18,10 23,14" fill="none" stroke={color} strokeWidth={1.5} />,
    'square':       <rect x="18" y="6" width="9" height="9" fill={color} />,
    'double':       <g><polygon points="28,10 22,6 22,14" fill={color} /><polygon points="22,10 16,6 16,14" fill={color} /></g>,
    'chevron':      <polyline points="18,6 23,10 18,14" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />,
    'none':         null,
  };

  return (
    <svg width="38" height="20" viewBox="0 0 38 20">
      <line x1="4" y1="10" x2="26" y2="10" stroke={color} strokeWidth={1.5} strokeDasharray={type === 'none' ? 'none' : undefined} />
      {previews[type]}
    </svg>
  );
}

// ── Edge Panel ────────────────────────────────────────────────────────────────
export default function EdgePropertiesPanel({ edge, onUpdate, onDelete, onClose }) {
  const d = edge.data || {};
  const [strokeColor, setStrokeColor] = useState(d.strokeColor || "#4b8fd4");
  const [strokeWidth, setStrokeWidth] = useState(d.strokeWidth || 2);
  const [arrowType, setArrowType]     = useState(d.arrowType   || "closed");
  const [arrowStart, setArrowStart]   = useState(d.arrowStart  || "none");
  const [animated, setAnimated]       = useState(d.animated    || false);
  const [label, setLabel]             = useState(d.label       || "");
  const [lineStyle, setLineStyle]     = useState(d.lineStyle   || "elbow");
  const [cornerRadius, setCornerRadius] = useState(d.cornerRadius ?? 10);
  const [dynamic, setDynamic] = useState(d.dynamic ?? !(edge.sourceHandle || edge.targetHandle));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const edgeRef = useRef(edge);
  const onUpdateRef = useRef(onUpdate);
  edgeRef.current = edge;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const currentEdge = edgeRef.current;
    const d2 = currentEdge.data || {};
    setStrokeColor(d2.strokeColor || "#4b8fd4");
    setStrokeWidth(d2.strokeWidth || 2);
    setArrowType(d2.arrowType   || "closed");
    setArrowStart(d2.arrowStart || "none");
    setAnimated(d2.animated    || false);
    setLabel(d2.label          || "");
    setLineStyle(d2.lineStyle  || "elbow");
    setCornerRadius(d2.cornerRadius ?? 10);
    setDynamic(d2.dynamic ?? !(currentEdge.sourceHandle || currentEdge.targetHandle));
    setConfirmDelete(false);
  }, [edge.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      const currentEdge = edgeRef.current;
      onUpdateRef.current(currentEdge.id, {
        data: {
          ...currentEdge.data,
          strokeColor,
          strokeWidth: Number(strokeWidth),
          arrowType,
          arrowStart,
          animated,
          label,
          lineStyle,
          cornerRadius: Number(cornerRadius),
          dynamic,
          // Reset offset when style changes so path re-routes cleanly
        },
      });
    }, 200);
    return () => clearTimeout(t);
  }, [strokeColor, strokeWidth, arrowType, arrowStart, animated, label, lineStyle, cornerRadius, dynamic]);

  return (
    <div className="properties-panel">
      <div className="pp-header">
        <div className="pp-header-left">
          <div className="pp-dot" style={{ background: strokeColor, borderRadius: 0, height: 3, width: 18 }} />
          <span className="pp-title">Connection</span>
        </div>
        <button className="pp-close" onClick={onClose} title="Close"><X size={15} /></button>
      </div>

      <div className="pp-body">

        {/* Line Style */}
        <div className="pp-section">
          <div className="pp-section-label"><Minus size={11} /> Line Style</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {[
              {
                id: 'elbow',
                label: 'Elbow',
                icon: (
                  <svg width="44" height="24" viewBox="0 0 44 24">
                    <polyline points="4,20 4,8 40,8 40,20" fill="none" stroke={lineStyle === 'elbow' ? strokeColor : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                id: 'bezier',
                label: 'Curved',
                icon: (
                  <svg width="44" height="24" viewBox="0 0 44 24">
                    <path d="M 4 20 Q 4 4 40 4" fill="none" stroke={lineStyle === 'bezier' ? strokeColor : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                id: 'straight',
                label: 'Straight',
                icon: (
                  <svg width="44" height="24" viewBox="0 0 44 24">
                    <line x1="4" y1="20" x2="40" y2="4" stroke={lineStyle === 'straight' ? strokeColor : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ),
              },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLineStyle(opt.id)}
                style={{
                  background: lineStyle === opt.id ? `${strokeColor}18` : 'rgba(var(--surface-rgb),0.03)',
                  border: lineStyle === opt.id ? `1.5px solid ${strokeColor}` : '1.5px solid rgba(var(--surface-rgb),0.08)',
                  borderRadius: 8,
                  padding: '6px 4px 4px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  transition: 'all .15s',
                }}
              >
                {opt.icon}
                <span style={{ fontSize: 9, color: lineStyle === opt.id ? strokeColor : 'var(--text-muted)', fontWeight: 600 }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {lineStyle === 'elbow' && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Corner Rounding</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{cornerRadius}px</span>
              </div>
              <input
                type="range" min={0} max={30} value={cornerRadius}
                onChange={(e) => setCornerRadius(e.target.value)}
                style={{ width: '100%', accentColor: strokeColor }}
              />
            </div>
          )}
        </div>

        {/* Dynamic glue */}
        <div className="pp-section">
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
            <input type="checkbox" checked={dynamic} onChange={(e) => setDynamic(e.target.checked)} />
            Dynamic Connector
          </label>
          <div style={{ color: 'var(--text-muted)', fontSize: 10.5, marginTop: 6, lineHeight: 1.5 }}>
            {dynamic
              ? "Glues to the nearest side of each box and re-routes automatically when either box moves."
              : "Locked to its current fixed attachment points — won't re-route if you move the connected boxes."}
          </div>
        </div>

        {/* Label */}
        <div className="pp-section">
          <div className="pp-section-label"><Minus size={11} /> Label</div>
          <input
            className="pp-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Optional label..."
          />
        </div>

        {/* Line color */}
        <div className="pp-section">
          <div className="pp-section-label"><Palette size={11} /> Line Color</div>
          <div className="pp-colors">
            {COLOR_PRESETS.map((c) => (
              <button key={c.value} className={`pp-swatch ${strokeColor === c.value ? "active" : ""}`}
                style={{ background: c.value }} onClick={() => setStrokeColor(c.value)} title={c.label} />
            ))}
            <label className="pp-swatch pp-swatch--custom" title="Custom">
              <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
              <span style={{ fontSize: 14 }}>🎨</span>
            </label>
          </div>
          <div className="pp-color-preview" style={{ background: strokeColor }}><span>{strokeColor}</span></div>
        </div>

        {/* Thickness + animated */}
        <div className="pp-section">
          <div className="pp-section-label"><Minus size={11} /> Thickness & Style</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <input
              type="range" min={1} max={8} value={strokeWidth}
              onChange={(e) => setStrokeWidth(e.target.value)}
              style={{ flex: 1, accentColor: strokeColor }}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: 12, minWidth: 20, textAlign: 'right' }}>{strokeWidth}px</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: 'var(--text-secondary)', fontSize: 12 }}>
            <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} />
            Animated flow
          </label>
        </div>

        {/* End arrowhead */}
        <div className="pp-section">
          <div className="pp-section-label" style={{ marginBottom: 10 }}>Arrow — End</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {ARROWHEAD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setArrowType(opt.id)}
                title={opt.label}
                style={{
                  background: arrowType === opt.id ? `${strokeColor}22` : 'rgba(var(--surface-rgb),0.04)',
                  border: arrowType === opt.id ? `1.5px solid ${strokeColor}` : '1.5px solid rgba(var(--surface-rgb),0.08)',
                  borderRadius: 7,
                  padding: '5px 2px 2px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'all .15s',
                }}
              >
                <ArrowPreview type={opt.id} color={arrowType === opt.id ? strokeColor : 'var(--text-muted)'} />
                <span style={{ fontSize: 9, color: arrowType === opt.id ? strokeColor : 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.2 }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Start arrowhead */}
        <div className="pp-section">
          <div className="pp-section-label" style={{ marginBottom: 10 }}>Arrow — Start</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {ARROWHEAD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setArrowStart(opt.id)}
                title={opt.label}
                style={{
                  background: arrowStart === opt.id ? `${strokeColor}22` : 'rgba(var(--surface-rgb),0.04)',
                  border: arrowStart === opt.id ? `1.5px solid ${strokeColor}` : '1.5px solid rgba(var(--surface-rgb),0.08)',
                  borderRadius: 7,
                  padding: '5px 2px 2px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  transition: 'all .15s',
                }}
              >
                <ArrowPreview type={opt.id} color={arrowStart === opt.id ? strokeColor : 'var(--text-muted)'} />
                <span style={{ fontSize: 9, color: arrowStart === opt.id ? strokeColor : 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.2 }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Segment routing controls — elbow mode only */}
        {lineStyle === 'elbow' && (
          <div className="pp-section">
            <button
              className="pp-btn pp-btn--ghost"
              style={{ width: '100%', marginBottom: 8 }}
              onClick={() => onUpdate(edge.id, { data: { ...edge.data, points: [] } })}
            >
              <RotateCcw size={13} /> Reset Routing
            </button>
            <div style={{ background: 'rgba(75, 143, 212, 0.08)', border: '1px solid rgba(75, 143, 212, 0.18)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 11, lineHeight: 1.6 }}>
                💡 <strong style={{ color: 'var(--text-secondary)' }}>Hover or select</strong> a connector to reveal handles. <strong style={{ color: 'var(--text-secondary)' }}>Drag a faded handle</strong> to create a new waypoint. <strong style={{ color: 'var(--text-secondary)' }}>Drag a solid handle</strong> to move it, or <strong style={{ color: 'var(--text-secondary)' }}>Double-click</strong> it to delete it.
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="pp-sticky-footer">
        {confirmDelete ? (
          <div className="pp-delete-confirm">
            <p>Delete this connection?</p>
            <div className="pp-delete-btns">
              <button className="pp-btn pp-btn--ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="pp-btn pp-btn--delete" onClick={() => onDelete(edge.id)}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <button className="pp-btn pp-btn--delete-ghost" style={{ width: "100%" }} onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Delete Connection
          </button>
        )}
      </div>
    </div>
  );
}
