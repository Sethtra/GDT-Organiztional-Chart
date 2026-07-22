import { useState, useEffect, useRef } from "react";
import { X, Trash2, Plus, ChevronDown, Copy, User, Tag, Palette, Zap, Minus, Link as LinkIcon, ExternalLink, RotateCcw, Contact, Check, UserMinus } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../hooks/useAuth";
import { ARROWHEAD_OPTIONS } from "./CustomEdge";
import { TYPE_META, TYPE_OPTIONS } from "../data/nodeTypes";

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
  const [dynamic, setDynamic] = useState(d.dynamic ?? !(edge.sourceHandle || edge.targetHandle));
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
    setDynamic(d2.dynamic ?? !(edge.sourceHandle || edge.targetHandle));
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

// ── Node Panel ────────────────────────────────────────────────────────────────
export default function PropertiesPanel({ nodes, edge, onUpdateNodes, onUpdateEdge, onDelete, onAddChild, onDuplicate, onClose, onSave }) {
  if (edge) {
    return <EdgePropertiesPanel edge={edge} onUpdate={onUpdateEdge} onDelete={onDelete} onClose={onClose} />;
  }
  if (nodes && nodes.length > 0) {
    return <NodePropertiesPanel nodes={nodes} onUpdateNodes={onUpdateNodes} onDelete={onDelete} onAddChild={onAddChild} onDuplicate={onDuplicate} onClose={onClose} onSave={onSave} />;
  }
  return null;
}

function NodePropertiesPanel({ nodes, onUpdateNodes, onDelete, onAddChild, onDuplicate, onClose, onSave }) {
  const { user } = useAuth();
  const firstNode = nodes && nodes.length > 0 ? nodes[0] : { data: {} };
  const [name, setName]               = useState(firstNode.data.name || "");
  const [nameEn, setNameEn]           = useState(firstNode.data.nameEn || "");
  const [description, setDescription] = useState(firstNode.data.description || "");
  const [orgType, setOrgType]         = useState(firstNode.data.orgType || "orgNode");
  const [color, setColor]             = useState(firstNode.data.color || "var(--default-node-bg)");
  const [textColor, setTextColor]     = useState(firstNode.data.textColor || "#ffffff");
  const [badgeText, setBadgeText]     = useState(firstNode.data.badgeText || "");
  const [badgeColor, setBadgeColor]   = useState(firstNode.data.badgeColor || "#38bdf8");
  const [linkedChartId, setLinkedChartId] = useState(firstNode.data.linkedChartId || "");
  const [fontSize, setFontSize]           = useState(firstNode.data.fontSize || 13);
  const [textAlign, setTextAlign]         = useState(firstNode.data.textAlign || "center");
  const [textVerticalAlign, setTextVerticalAlign] = useState(firstNode.data.textVerticalAlign || "center");
  // Person-node personal details (shown in the ProfileDrawer on click)
  const [staffId, setStaffId]             = useState(firstNode.data.staffId || "");
  const [department, setDepartment]       = useState(firstNode.data.department || "");
  const [office, setOffice]               = useState(firstNode.data.office || "");
  const [joinDate, setJoinDate]           = useState(firstNode.data.joinDate || "");
  const [phone, setPhone]                 = useState(firstNode.data.phone || "");
  const [address, setAddress]             = useState(firstNode.data.address || "");
  const [maritalStatus, setMaritalStatus] = useState(firstNode.data.maritalStatus || "");
  const [siblings, setSiblings]           = useState(firstNode.data.siblings || "");
  const [education, setEducation]         = useState(firstNode.data.education || "");
  const [skill, setSkill]                 = useState(firstNode.data.skill || "");
  const [history, setHistory]             = useState(firstNode.data.history || []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addChildType, setAddChildType]   = useState("orgNode");
  const [showAddChild, setShowAddChild]   = useState(false);
  const [showVacateForm, setShowVacateForm] = useState(false);
  const [vacateStatus, setVacateStatus]   = useState("Retired");
  const [vacateDate, setVacateDate]       = useState(new Date().toISOString().split('T')[0]);
  const [vacateNotes, setVacateNotes]     = useState("");
  const [charts, setCharts]               = useState([]);

  const meta = TYPE_META[orgType] || TYPE_META.orgNode;
  const isMultiSelect = nodes && nodes.length > 1;

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

  // Guards the auto-save effect below from firing merely because the node-switch
  // effect repopulated fields to match a newly selected node (no actual user edit).
  const skipNextSave = useRef(true);

  // onUpdateNodes's identity can change on renders unrelated to this panel
  // (it's derived from broader app state). Reading it via a ref instead of
  // listing it as an effect dependency means only real field edits below can
  // trigger a save — an unrelated re-render can no longer resurrect
  // "skipNextSave" timing and bulk-apply the currently-loaded node's values
  // onto every other selected node.
  const onUpdateNodesRef = useRef(onUpdateNodes);
  onUpdateNodesRef.current = onUpdateNodes;
  const isMultiSelectRef = useRef(isMultiSelect);
  isMultiSelectRef.current = isMultiSelect;

  useEffect(() => {
    const fresh = nodes && nodes.length > 0 ? nodes[0] : { data: {} };
    setName(fresh.data.name || "");
    setNameEn(fresh.data.nameEn || "");
    setDescription(fresh.data.description || "");
    setOrgType(fresh.data.orgType || "orgNode");
    setBadgeText(fresh.data.badgeText || "");
    setBadgeColor(fresh.data.badgeColor || "#38bdf8");
    setColor(fresh.data.color || "var(--default-node-bg)");
    setTextColor(fresh.data.textColor || "#ffffff");
    setLinkedChartId(fresh.data.linkedChartId || "");
    setFontSize(fresh.data.fontSize || 13);
    setTextAlign(fresh.data.textAlign || "center");
    setTextVerticalAlign(fresh.data.textVerticalAlign || "center");
    setStaffId(fresh.data.staffId || "");
    setDepartment(fresh.data.department || "");
    setOffice(fresh.data.office || "");
    setJoinDate(fresh.data.joinDate || "");
    setPhone(fresh.data.phone || "");
    setAddress(fresh.data.address || "");
    setMaritalStatus(fresh.data.maritalStatus || "");
    setSiblings(fresh.data.siblings || "");
    setEducation(fresh.data.education || "");
    setSkill(fresh.data.skill || "");
    setHistory(fresh.data.history || []);
    setConfirmDelete(false);
    setShowAddChild(false);
    setShowVacateForm(false);
    skipNextSave.current = true;
  }, [nodes?.map(n => n.id).join(",")]);

  // Multi-select writes ONLY the bulk-editable fields — per-node data
  // (identity, chart link, personal details) must never be copied from the
  // first node onto the whole selection.
  const buildPayload = () => {
    const payload = { orgType, color, textColor, badgeText, badgeColor, fontSize, textAlign, textVerticalAlign };
    if (!isMultiSelectRef.current) {
      Object.assign(payload, {
        name, nameEn, description, linkedChartId,
        staffId, department, office, joinDate, phone, address, maritalStatus, siblings, education, skill, history,
      });
    }
    return payload;
  };

  const handleVacate = () => {
    if (!name && !nameEn && !staffId) {
      setShowVacateForm(false);
      return;
    }
    
    const newRecord = {
      id: "vacate_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      name, nameEn, staffId, department, office, joinDate, phone, address, maritalStatus, siblings, education, skill,
      exitStatus: vacateStatus,
      dateLeft: vacateDate,
      notes: vacateNotes
    };

    // Strict content-based deduplication
    const seen = new Set();
    const newHistory = [newRecord, ...(history || [])].filter(item => {
      if (!item || typeof item !== 'object') return false;
      if (!item.name && !item.nameEn && !item.staffId && !item.dateLeft && !item.exitStatus) return false;
      const key = `${(item.name || '').trim().toLowerCase()}_${(item.nameEn || '').trim().toLowerCase()}_${item.dateLeft || ''}_${item.exitStatus || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setHistory(newHistory);
    
    setName("");
    setNameEn("");
    setStaffId("");
    setDepartment("");
    setOffice("");
    setJoinDate("");
    setPhone("");
    setAddress("");
    setMaritalStatus("");
    setSiblings("");
    setEducation("");
    setSkill("");
    setShowVacateForm(false);
    setVacateNotes("");

    // Prevent debounced auto-save effect from flushing stale state
    skipNextSave.current = true;

    // Force flush
    const payload = buildPayload();
    payload.history = newHistory;
    payload.name = "";
    payload.nameEn = "";
    payload.staffId = "";
    payload.department = "";
    payload.office = "";
    payload.joinDate = "";
    payload.phone = "";
    payload.address = "";
    payload.maritalStatus = "";
    payload.siblings = "";
    payload.education = "";
    payload.skill = "";
    onUpdateNodesRef.current(payload);
  };

  // Auto-save (debounced) — keeps everything persisted as you type. The Save
  // button just flushes immediately and finishes editing.
  useEffect(() => {
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const t = setTimeout(() => { onUpdateNodesRef.current(buildPayload()); }, 250);
    return () => clearTimeout(t);
  }, [name, nameEn, description, orgType, color, textColor, badgeText, badgeColor, linkedChartId, fontSize, textAlign, textVerticalAlign,
      staffId, department, office, joinDate, phone, address, maritalStatus, siblings, education, skill, history]);

  const handleSave = () => {
    onUpdateNodesRef.current(buildPayload());
    onSave?.();
  };

  const linkedChart = charts.find(c => c.id === linkedChartId);

  return (
    <div className="properties-panel">
      {/* Header */}
      <div className="pp-header">
        <div className="pp-header-left">
          <div className="pp-dot" style={{ background: color }} />
          <span className="pp-title">{isMultiSelect ? `Multiple Nodes (${nodes.length})` : "Properties"}</span>
        </div>
        <button className="pp-close" onClick={onClose} title="Close"><X size={15} /></button>
      </div>

      {/* Live node preview */}
      <div className="pp-preview" style={{ "--prev-bg": color, "--prev-accent": badgeColor || meta.accent }}>
        <div className="pp-preview__bar" />
        <div className="pp-preview__badge" style={{ color: badgeColor || meta.accent, borderColor: badgeColor || meta.accent }}>
          {badgeText || meta.label || orgType.toUpperCase()}
        </div>
        <div className="pp-preview__name" style={{ color: textColor }}>
          {isMultiSelect ? "(Multiple Selected)" : (name || "ឈ្មោះ")}
        </div>
        {!isMultiSelect && nameEn && <div className="pp-preview__name-en">{nameEn}</div>}
      </div>

      {/* Scrollable body */}
      <div className="pp-body">

        {/* Identity */}
        <div className="pp-section" style={{ opacity: isMultiSelect ? 0.5 : 1, pointerEvents: isMultiSelect ? 'none' : 'auto' }}>
          <div className="pp-section-label"><User size={11} /> Identity {isMultiSelect && "(Disabled)"}</div>
          <label className="pp-label">Khmer Name</label>
          <textarea className="pp-textarea" value={name} onChange={(e) => setName(e.target.value)} placeholder="ឈ្មោះ..." dir="auto" rows={2} />
          <label className="pp-label">English Name</label>
          <textarea className="pp-textarea" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="English name..." rows={2} />
          <label className="pp-label">Description</label>
          <textarea className="pp-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." rows={2} />
        </div>

        {/* Personal Details — person nodes only; shown read-only in the
            ProfileDrawer when the node is clicked */}
        {meta.isPerson && !isMultiSelect && (
        <div className="pp-section">
          <div className="pp-section-label"><Contact size={11} /> Personal Details</div>

          <label className="pp-label">Staff ID</label>
          <input className="pp-input" value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="e.g. GDT-0421" />

          <label className="pp-label">Department</label>
          <input className="pp-input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. IT Department" />

          <label className="pp-label">Office</label>
          <input className="pp-input" value={office} onChange={(e) => setOffice(e.target.value)} placeholder="e.g. Software Dev Office" />

          <label className="pp-label">Join Date</label>
          <input type="date" className="pp-input" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} style={{ colorScheme: "dark" }} />

          <label className="pp-label">Phone</label>
          <input className="pp-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="012 345 678" />

          <label className="pp-label">Address</label>
          <textarea className="pp-textarea" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ភ្នំពេញ..." dir="auto" rows={2} />

          <label className="pp-label">Marital Status</label>
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {[
              { v: "", label: "—" },
              { v: "single", label: "Single" },
              { v: "married", label: "Married" },
            ].map(({ v, label }) => (
              <button key={v || "none"} className={`pp-type-btn ${maritalStatus === v ? "active" : ""}`}
                style={{ flex: 1 }} onClick={() => setMaritalStatus(v)}>
                {label}
              </button>
            ))}
          </div>

          <label className="pp-label">Siblings</label>
          <input type="number" min={0} className="pp-input" value={siblings}
            onChange={(e) => setSiblings(e.target.value)} placeholder="e.g. 3" />

          <label className="pp-label">Education</label>
          <input className="pp-input" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. MBA — Finance" />

          <label className="pp-label">Skills / Major</label>
          <input className="pp-input" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. Tax audit, Accounting" />

          {/* Vacate Action */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed rgba(255,255,255,0.08)" }}>
            {!showVacateForm ? (
              <button
                type="button"
                onClick={() => setShowVacateForm(true)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(244, 63, 94, 0.08)",
                  border: "1px solid rgba(244, 63, 94, 0.25)",
                  color: "#f43f5e",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 8px rgba(244, 63, 94, 0.05)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(244, 63, 94, 0.16)";
                  e.currentTarget.style.borderColor = "rgba(244, 63, 94, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(244, 63, 94, 0.08)";
                  e.currentTarget.style.borderColor = "rgba(244, 63, 94, 0.25)";
                }}
              >
                <UserMinus size={14} />
                <span>Vacate Position / Remove Staff</span>
              </button>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                background: 'rgba(244, 63, 94, 0.04)',
                padding: 16,
                borderRadius: 10,
                border: '1px solid rgba(244, 63, 94, 0.2)'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <UserMinus size={13} /> Vacate Position Record
                </div>
                
                <div>
                  <label htmlFor="vacate-reason-select" className="pp-label" style={{ color: '#94a3b8', marginBottom: 4, display: 'block' }}>Reason for leaving</label>
                  <select
                    id="vacate-reason-select"
                    className="pp-input"
                    value={vacateStatus}
                    onChange={e => setVacateStatus(e.target.value)}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="Retired">Retired</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Resigned">Resigned</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="vacate-date-input" className="pp-label" style={{ color: '#94a3b8', marginBottom: 4, display: 'block' }}>Date <span style={{ opacity: 0.6, fontWeight: 400 }}>(DD/MM/YYYY)</span></label>
                  <input
                    id="vacate-date-input"
                    type="text"
                    className="pp-input"
                    value={vacateDate}
                    onChange={e => setVacateDate(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                
                <div>
                  <label htmlFor="vacate-notes-input" className="pp-label" style={{ color: '#94a3b8', marginBottom: 4, display: 'block' }}>Notes</label>
                  <textarea
                    id="vacate-notes-input"
                    className="pp-textarea"
                    value={vacateNotes}
                    onChange={e => setVacateNotes(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    placeholder="Optional context..."
                    rows={2}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => setShowVacateForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: '#f43f5e', border: 'none', color: '#ffffff', fontWeight: 600, cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 8px rgba(244, 63, 94, 0.3)' }}
                    onClick={handleVacate}
                  >
                    Confirm Vacate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Type */}
        <div className="pp-section">
          <div className="pp-section-label"><Tag size={11} /> Node Type</div>
          <div className="pp-type-grid">
            {TYPE_OPTIONS.map((t) => (
              <button key={t} className={`pp-type-btn ${orgType === t ? "active" : ""}`} onClick={() => setOrgType(t)}>
                {TYPE_META[t]?.label || t}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Badge */}
        <div className="pp-section">
          <div className="pp-section-label"><Tag size={11} /> Badge Settings</div>
          <label className="pp-label">Badge Text</label>
          <input className="pp-input" value={badgeText} onChange={(e) => setBadgeText(e.target.value)} placeholder={meta.label || "e.g. Department, Director..."} />
          <label className="pp-label" style={{ marginTop: 8 }}>Badge Color</label>
          <div className="pp-colors">
            {[
              { label: "Blue",   value: "#38bdf8" },
              { label: "Gold",   value: "#d4af37" },
              { label: "Amber",  value: "#f59e0b" },
              { label: "Red",    value: "#f43f5e" },
              { label: "Green",  value: "#0e7d6e" },
              { label: "Purple", value: "#a78bfa" },
              { label: "Teal",   value: "#5eead4" },
              { label: "Pink",   value: "#fb7185" },
            ].map((c) => (
              <button key={c.value} className={`pp-swatch ${badgeColor === c.value ? "active" : ""}`}
                style={{ background: c.value }} onClick={() => setBadgeColor(c.value)} title={c.label} />
            ))}
            <label className="pp-swatch pp-swatch--custom" title="Custom badge color">
              <input type="color" value={badgeColor} onChange={(e) => setBadgeColor(e.target.value)}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
              <span style={{ fontSize: 14 }}>🎨</span>
            </label>
          </div>
          <div className="pp-color-preview" style={{ background: badgeColor }}><span>{badgeColor}</span></div>
        </div>

        {/* Background/Text Color — not applicable to person cards, which are
            a fixed dark card matching design turn 11b (see OrgNode.jsx) */}
        {!meta.isPerson && (
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
        )}

        {!meta.isPerson && (
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
                style={{ background: c.value, border: c.value === "#ffffff" ? "1px solid rgba(var(--surface-rgb),.3)" : "none" }}
                onClick={() => setTextColor(c.value)} title={c.label} />
            ))}
            <label className="pp-swatch pp-swatch--custom" title="Custom text color">
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
              <span style={{ fontSize: 14 }}>🎨</span>
            </label>
          </div>
        </div>
        )}

        {/* Text Formatting */}
        <div className="pp-section">
          <div className="pp-section-label">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
            Text Formatting
          </div>

          {/* Font Size */}
          <label className="pp-label">Font Size — <strong style={{ color: 'var(--text-primary)' }}>{fontSize}px</strong></label>
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

          {/* Horizontal/Vertical Align — not applicable to person cards,
              which are always centered by design (see OrgNode.jsx) */}
          {!meta.isPerson && (
          <>
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
                  borderColor: textAlign === v ? '#4b8fd4' : 'rgba(var(--surface-rgb),.12)',
                  background: textAlign === v ? 'rgba(75,143,212,.2)' : 'rgba(var(--surface-rgb),.04)',
                  color: textAlign === v ? '#4b8fd4' : 'var(--text-secondary)',
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
                  borderColor: textVerticalAlign === v ? '#4b8fd4' : 'rgba(var(--surface-rgb),.12)',
                  background: textVerticalAlign === v ? 'rgba(75,143,212,.2)' : 'rgba(var(--surface-rgb),.04)',
                  color: textVerticalAlign === v ? '#4b8fd4' : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all .15s',
                }}
                onClick={() => setTextVerticalAlign(v)}
              >{icon}</button>
            ))}
          </div>
          </>
          )}
        </div>

        {/* Chart Link */}
        <div className="pp-section" style={{ opacity: isMultiSelect ? 0.5 : 1, pointerEvents: isMultiSelect ? 'none' : 'auto' }}>
          <div className="pp-section-label"><LinkIcon size={11} /> Link to Chart</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 10, lineHeight: 1.5 }}>
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
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                title="Remove link"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isMultiSelect && (
          <div className="pp-section">
            <div className="pp-section-label"><Zap size={11} /> Actions</div>

            <button className="pp-btn pp-btn--ghost" onClick={() => onDuplicate?.()}>
              <Copy size={13} /> Duplicate Node
            </button>

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
                        {TYPE_META[t]?.label || t}
                      </button>
                    ))}
                  </div>
                  <button className="pp-btn pp-btn--confirm-add"
                    onClick={() => { onAddChild(addChildType); setShowAddChild(false); }}>
                    <Plus size={13} /> Create {addChildType} node
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer — Save + Delete */}
      <div className="pp-sticky-footer">
        <button className="pp-btn pp-btn--save" onClick={handleSave}>
          <Check size={15} /> {meta.isPerson ? "Save Details" : "Save Changes"}
        </button>
        {confirmDelete ? (
          <div className="pp-delete-confirm">
            <p>Delete {isMultiSelect ? "these nodes" : "this node"} and connections?</p>
            <div className="pp-delete-btns">
              <button className="pp-btn pp-btn--ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="pp-btn pp-btn--delete" onClick={() => onDelete()}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <button className="pp-btn pp-btn--delete-ghost" style={{ width: "100%" }} onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> {isMultiSelect ? `Delete ${nodes.length} Nodes` : "Delete Node"}
          </button>
        )}
      </div>
    </div>
  );
}
