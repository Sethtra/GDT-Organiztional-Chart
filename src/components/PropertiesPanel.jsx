import { useState, useEffect } from "react";
import { X, Trash2, Plus, ChevronDown, Copy, User, Tag, Palette, Zap, Minus, Link as LinkIcon, ExternalLink } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { ARROWHEAD_OPTIONS } from "./CustomEdge";

const COLOR_PRESETS = [
  { label: "Navy",    value: "#0f2044" },
  { label: "Teal",   value: "#0e7d6e" },
  { label: "Blue",   value: "#1e5799" },
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

const TYPE_OPTIONS = ["ministry", "department", "division", "office", "simple"];

const TYPE_META = {
  ministry:   { accent: "#d4af37" },
  department: { accent: "#38bdf8" },
  division:   { accent: "#a78bfa" },
  office:     { accent: "#6ee7b7" },
  simple:     { accent: "#94a3b8" },
};

// ── Arrow preview SVG ─────────────────────────────────────────────────────────
function ArrowPreview({ type, color, selected }) {
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
function EdgePropertiesPanel({ edge, onUpdate, onDelete, onClose }) {
  const d = edge.data || {};
  const [strokeColor, setStrokeColor] = useState(d.strokeColor || "#4b8fd4");
  const [strokeWidth, setStrokeWidth] = useState(d.strokeWidth || 2);
  const [arrowType, setArrowType]     = useState(d.arrowType   || "closed");
  const [arrowStart, setArrowStart]   = useState(d.arrowStart  || "none");
  const [animated, setAnimated]       = useState(d.animated    || false);
  const [label, setLabel]             = useState(d.label       || "");
  const [lineStyle, setLineStyle]     = useState(d.lineStyle   || "elbow");
  const [cornerRadius, setCornerRadius] = useState(d.cornerRadius ?? 10);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const d2 = edge.data || {};
    setStrokeColor(d2.strokeColor || "#4b8fd4");
    setStrokeWidth(d2.strokeWidth || 2);
    setArrowType(d2.arrowType   || "closed");
    setArrowStart(d2.arrowStart || "none");
    setAnimated(d2.animated    || false);
    setLabel(d2.label          || "");
    setLineStyle(d2.lineStyle  || "elbow");
    setCornerRadius(d2.cornerRadius ?? 10);
    setConfirmDelete(false);
  }, [edge.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      onUpdate(edge.id, {
        data: {
          ...edge.data,
          strokeColor,
          strokeWidth: Number(strokeWidth),
          arrowType,
          arrowStart,
          animated,
          label,
          lineStyle,
          cornerRadius: Number(cornerRadius),
          // Reset offset when style changes so path re-routes cleanly
        },
      });
    }, 200);
    return () => clearTimeout(t);
  }, [strokeColor, strokeWidth, arrowType, arrowStart, animated, label, lineStyle, cornerRadius]);

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
                    <polyline points="4,20 4,8 40,8 40,20" fill="none" stroke={lineStyle === 'elbow' ? strokeColor : '#475569'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ),
              },
              {
                id: 'bezier',
                label: 'Curved',
                icon: (
                  <svg width="44" height="24" viewBox="0 0 44 24">
                    <path d="M 4 20 Q 4 4 40 4" fill="none" stroke={lineStyle === 'bezier' ? strokeColor : '#475569'} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ),
              },
              {
                id: 'straight',
                label: 'Straight',
                icon: (
                  <svg width="44" height="24" viewBox="0 0 44 24">
                    <line x1="4" y1="20" x2="40" y2="4" stroke={lineStyle === 'straight' ? strokeColor : '#475569'} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ),
              },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setLineStyle(opt.id)}
                style={{
                  background: lineStyle === opt.id ? `${strokeColor}18` : 'rgba(255,255,255,0.03)',
                  border: lineStyle === opt.id ? `1.5px solid ${strokeColor}` : '1.5px solid rgba(255,255,255,0.08)',
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
                <span style={{ fontSize: 9, color: lineStyle === opt.id ? strokeColor : '#64748b', fontWeight: 600 }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          {lineStyle === 'elbow' && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>Corner Rounding</span>
                <span style={{ color: '#94a3b8', fontSize: 11 }}>{cornerRadius}px</span>
              </div>
              <input
                type="range" min={0} max={30} value={cornerRadius}
                onChange={(e) => setCornerRadius(e.target.value)}
                style={{ width: '100%', accentColor: strokeColor }}
              />
            </div>
          )}
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
            <span style={{ color: '#94a3b8', fontSize: 12, minWidth: 20, textAlign: 'right' }}>{strokeWidth}px</span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: '#94a3b8', fontSize: 12 }}>
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
                  background: arrowType === opt.id ? `${strokeColor}22` : 'rgba(255,255,255,0.04)',
                  border: arrowType === opt.id ? `1.5px solid ${strokeColor}` : '1.5px solid rgba(255,255,255,0.08)',
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
                <ArrowPreview type={opt.id} color={arrowType === opt.id ? strokeColor : '#64748b'} />
                <span style={{ fontSize: 9, color: arrowType === opt.id ? strokeColor : '#64748b', fontWeight: 600, letterSpacing: 0.2 }}>
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
                  background: arrowStart === opt.id ? `${strokeColor}22` : 'rgba(255,255,255,0.04)',
                  border: arrowStart === opt.id ? `1.5px solid ${strokeColor}` : '1.5px solid rgba(255,255,255,0.08)',
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
                <ArrowPreview type={opt.id} color={arrowStart === opt.id ? strokeColor : '#64748b'} />
                <span style={{ fontSize: 9, color: arrowStart === opt.id ? strokeColor : '#64748b', fontWeight: 600, letterSpacing: 0.2 }}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Drag hint */}
        <div className="pp-section">
          <div style={{ background: 'rgba(75, 143, 212, 0.08)', border: '1px solid rgba(75, 143, 212, 0.18)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.6 }}>
              💡 <strong style={{ color: '#cbd5e1' }}>Drag the handle</strong> on the selected line to reposition the connector segment — up/down for elbow, free-form for curved
            </div>
          </div>
        </div>

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

// ── Node Panel ────────────────────────────────────────────────────────────────
export default function PropertiesPanel({ node, edge, onUpdateNode, onUpdateEdge, onDeleteNode, onDeleteEdge, onAddChild, onDuplicate, onClose }) {
  if (edge) {
    return <EdgePropertiesPanel edge={edge} onUpdate={onUpdateEdge} onDelete={onDeleteEdge} onClose={onClose} />;
  }

  const { user } = useAuth();
  const [name, setName]               = useState(node.data.name || "");
  const [nameEn, setNameEn]           = useState(node.data.nameEn || "");
  const [description, setDescription] = useState(node.data.description || "");
  const [orgType, setOrgType]         = useState(node.data.orgType || "office");
  const [color, setColor]             = useState(node.data.color || "#1e5799");
  const [textColor, setTextColor]     = useState(node.data.textColor || "#ffffff");
  const [linkedChartId, setLinkedChartId] = useState(node.data.linkedChartId || "");
  const [fontSize, setFontSize]           = useState(node.data.fontSize || 13);
  const [textAlign, setTextAlign]         = useState(node.data.textAlign || "center");
  const [textVerticalAlign, setTextVerticalAlign] = useState(node.data.textVerticalAlign || "center");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addChildType, setAddChildType]   = useState("office");
  const [showAddChild, setShowAddChild]   = useState(false);
  const [charts, setCharts]               = useState([]);

  const meta = TYPE_META[orgType] || TYPE_META.office;

  // Fetch user's charts for chart linking
  useEffect(() => {
    if (!user) return;
    supabase
      .from('charts')
      .select('id, name')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setCharts(data || []));
  }, [user]);

  useEffect(() => {
    setName(node.data.name || "");
    setNameEn(node.data.nameEn || "");
    setDescription(node.data.description || "");
    setOrgType(node.data.orgType || "office");
    setColor(node.data.color || "#1e5799");
    setTextColor(node.data.textColor || "#ffffff");
    setLinkedChartId(node.data.linkedChartId || "");
    setFontSize(node.data.fontSize || 13);
    setTextAlign(node.data.textAlign || "center");
    setTextVerticalAlign(node.data.textVerticalAlign || "center");
    setConfirmDelete(false);
    setShowAddChild(false);
  }, [node.id]);

  // Auto-save (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      onUpdateNode(node.id, { name, nameEn, description, orgType, color, textColor, linkedChartId, fontSize, textAlign, textVerticalAlign });
    }, 250);
    return () => clearTimeout(t);
  }, [name, nameEn, description, orgType, color, textColor, linkedChartId, fontSize, textAlign, textVerticalAlign]);

  const linkedChart = charts.find(c => c.id === linkedChartId);

  return (
    <div className="properties-panel">
      {/* Header */}
      <div className="pp-header">
        <div className="pp-header-left">
          <div className="pp-dot" style={{ background: color }} />
          <span className="pp-title">Properties</span>
          <span className="pp-type-chip" style={{ color: meta.accent, borderColor: meta.accent }}>
            {orgType}
          </span>
        </div>
        <button className="pp-close" onClick={onClose} title="Close"><X size={15} /></button>
      </div>

      {/* Live node preview */}
      <div className="pp-preview" style={{ "--prev-bg": color, "--prev-accent": meta.accent }}>
        <div className="pp-preview__bar" />
        <div className="pp-preview__badge" style={{ color: meta.accent, borderColor: meta.accent }}>
          {orgType.toUpperCase()}
        </div>
        <div className="pp-preview__name" style={{ color: textColor }}>{name || "ឈ្មោះ"}</div>
        {nameEn && <div className="pp-preview__name-en">{nameEn}</div>}
      </div>

      {/* Scrollable body */}
      <div className="pp-body">

        {/* Identity */}
        <div className="pp-section">
          <div className="pp-section-label"><User size={11} /> Identity</div>
          <label className="pp-label">Khmer Name</label>
          <textarea className="pp-textarea" value={name} onChange={(e) => setName(e.target.value)} placeholder="ឈ្មោះ..." dir="auto" rows={2} />
          <label className="pp-label">English Name</label>
          <textarea className="pp-textarea" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="English name..." rows={2} />
          <label className="pp-label">Description</label>
          <textarea className="pp-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
        </div>

        {/* Type */}
        <div className="pp-section">
          <div className="pp-section-label"><Tag size={11} /> Node Type</div>
          <div className="pp-type-grid">
            {TYPE_OPTIONS.map((t) => (
              <button key={t} className={`pp-type-btn ${orgType === t ? "active" : ""}`} onClick={() => setOrgType(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div className="pp-section">
          <div className="pp-section-label"><Palette size={11} /> Background Color</div>
          <div className="pp-colors">
            {COLOR_PRESETS.map((c) => (
              <button key={c.value} className={`pp-swatch ${color === c.value ? "active" : ""}`}
                style={{ background: c.value }} onClick={() => setColor(c.value)} title={c.label} />
            ))}
            <label className="pp-swatch pp-swatch--custom" title="Custom color">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
              <span style={{ fontSize: 14 }}>🎨</span>
            </label>
          </div>
          <div className="pp-color-preview" style={{ background: color }}><span>{color}</span></div>
        </div>

        {/* Text Color */}
        <div className="pp-section">
          <div className="pp-section-label"><Palette size={11} /> Text Color</div>
          <div className="pp-colors">
            {[
              { label: "White",  value: "#ffffff" },
              { label: "Light",  value: "#cbd5e1" },
              { label: "Yellow", value: "#fef08a" },
              { label: "Black",  value: "#000000" },
            ].map((c) => (
              <button key={c.value} className={`pp-swatch ${textColor === c.value ? "active" : ""}`}
                style={{ background: c.value, border: c.value === "#ffffff" ? "1px solid rgba(255,255,255,.3)" : "none" }}
                onClick={() => setTextColor(c.value)} title={c.label} />
            ))}
            <label className="pp-swatch pp-swatch--custom" title="Custom text color">
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
              <span style={{ fontSize: 14 }}>🎨</span>
            </label>
          </div>
        </div>

        {/* Text Formatting */}
        <div className="pp-section">
          <div className="pp-section-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
            Text Formatting
          </div>

          {/* Font Size */}
          <label className="pp-label">Font Size — <strong style={{ color: '#e2e8f0' }}>{fontSize}px</strong></label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button
              className="pp-btn pp-btn--ghost"
              style={{ padding: '2px 8px', fontSize: 16, lineHeight: 1 }}
              onClick={() => setFontSize(s => Math.max(8, s - 1))}
            >−</button>
            <input
              type="range" min={8} max={32} value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#4b8fd4' }}
            />
            <button
              className="pp-btn pp-btn--ghost"
              style={{ padding: '2px 8px', fontSize: 16, lineHeight: 1 }}
              onClick={() => setFontSize(s => Math.min(32, s + 1))}
            >+</button>
          </div>

          {/* Horizontal Align */}
          <label className="pp-label">Horizontal Align</label>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {[
              { v: 'left',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>,   label: 'Left' },
              { v: 'center', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>,   label: 'Center' },
              { v: 'right',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>,   label: 'Right' },
            ].map(({ v, icon, label }) => (
              <button key={v} title={label}
                className="pp-align-btn"
                style={{
                  flex: 1, padding: '5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center',
                  borderRadius: 5, border: '1px solid',
                  borderColor: textAlign === v ? '#4b8fd4' : 'rgba(255,255,255,.12)',
                  background: textAlign === v ? 'rgba(75,143,212,.2)' : 'rgba(255,255,255,.04)',
                  color: textAlign === v ? '#4b8fd4' : '#94a3b8',
                  cursor: 'pointer', transition: 'all .15s',
                }}
                onClick={() => setTextAlign(v)}
              >{icon}</button>
            ))}
          </div>

          {/* Vertical Align */}
          <label className="pp-label">Vertical Align</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { v: 'flex-start', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="3" x2="21" y2="3"/><line x1="9" y1="7" x2="9" y2="21"/><line x1="15" y1="7" x2="15" y2="21"/><line x1="9" y1="7" x2="15" y2="7"/></svg>, label: 'Top' },
              { v: 'center',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/><line x1="9" y1="4" x2="15" y2="4"/><line x1="9" y1="20" x2="15" y2="20"/></svg>, label: 'Middle' },
              { v: 'flex-end',   icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="21" x2="21" y2="21"/><line x1="9" y1="3" x2="9" y2="17"/><line x1="15" y1="3" x2="15" y2="17"/><line x1="9" y1="17" x2="15" y2="17"/></svg>, label: 'Bottom' },
            ].map(({ v, icon, label }) => (
              <button key={v} title={label}
                className="pp-align-btn"
                style={{
                  flex: 1, padding: '5px 0', display: 'flex', justifyContent: 'center', alignItems: 'center',
                  borderRadius: 5, border: '1px solid',
                  borderColor: textVerticalAlign === v ? '#4b8fd4' : 'rgba(255,255,255,.12)',
                  background: textVerticalAlign === v ? 'rgba(75,143,212,.2)' : 'rgba(255,255,255,.04)',
                  color: textVerticalAlign === v ? '#4b8fd4' : '#94a3b8',
                  cursor: 'pointer', transition: 'all .15s',
                }}
                onClick={() => setTextVerticalAlign(v)}
              >{icon}</button>
            ))}
          </div>
        </div>

        {/* Chart Link */}
        <div className="pp-section">
          <div className="pp-section-label"><LinkIcon size={11} /> Link to Chart</div>
          <p style={{ color: '#64748b', fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
            Link this node to another chart. Viewers can click the node to open it.
          </p>
          <select
            className="pp-input"
            value={linkedChartId}
            onChange={(e) => setLinkedChartId(e.target.value)}
            style={{ cursor: 'pointer' }}
          >
            <option value="">— No link —</option>
            {charts.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {linkedChart && (
            <div style={{ marginTop: 8, background: 'rgba(14, 125, 110, 0.1)', border: '1px solid rgba(14, 125, 110, 0.3)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ExternalLink size={12} style={{ color: '#0e7d6e', flexShrink: 0 }} />
              <span style={{ color: '#0e7d6e', fontSize: 12, fontWeight: 600 }}>{linkedChart.name}</span>
              <button
                onClick={() => setLinkedChartId("")}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                title="Remove link"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="pp-section">
          <div className="pp-section-label"><Zap size={11} /> Actions</div>

          {/* Duplicate */}
          <button className="pp-btn pp-btn--ghost" onClick={() => onDuplicate?.(node.id)}>
            <Copy size={13} /> Duplicate Node
          </button>

          {/* Add Child */}
          <div className="pp-action-group">
            <button className="pp-btn pp-btn--add" onClick={() => setShowAddChild((v) => !v)}>
              <Plus size={14} /> Add Child Node
              <ChevronDown size={12} style={{ marginLeft: "auto", transform: showAddChild ? "rotate(180deg)" : "", transition: ".2s" }} />
            </button>
            {showAddChild && (
              <div className="pp-add-child">
                <div className="pp-type-grid" style={{ marginBottom: 8 }}>
                  {TYPE_OPTIONS.map((t) => (
                    <button key={t} className={`pp-type-btn ${addChildType === t ? "active" : ""}`} onClick={() => setAddChildType(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <button className="pp-btn pp-btn--confirm-add"
                  onClick={() => { onAddChild(node.id, addChildType); setShowAddChild(false); }}>
                  <Plus size={13} /> Create {addChildType} node
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky footer — Delete */}
      <div className="pp-sticky-footer">
        {confirmDelete ? (
          <div className="pp-delete-confirm">
            <p>Delete this node and all its connections?</p>
            <div className="pp-delete-btns">
              <button className="pp-btn pp-btn--ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="pp-btn pp-btn--delete" onClick={() => onDeleteNode(node.id)}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <button className="pp-btn pp-btn--delete-ghost" style={{ width: "100%" }} onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Delete Node
          </button>
        )}
      </div>
    </div>
  );
}
