import { useState, useEffect } from "react";
import { X, Trash2, Plus, ChevronDown } from "lucide-react";

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

const TYPE_OPTIONS = ["ministry", "department", "division", "office"];

function EdgePropertiesPanel({ edge, onUpdate, onDelete, onClose }) {
  const [strokeColor, setStrokeColor] = useState(edge.style?.stroke || "#4b8fd4");
  const [strokeWidth, setStrokeWidth] = useState(edge.style?.strokeWidth || 2);
  const [edgeType, setEdgeType] = useState(edge.type || "smoothstep");
  const [animated, setAnimated] = useState(edge.animated || false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setStrokeColor(edge.style?.stroke || "#4b8fd4");
    setStrokeWidth(edge.style?.strokeWidth || 2);
    setEdgeType(edge.type || "smoothstep");
    setAnimated(edge.animated || false);
    setConfirmDelete(false);
  }, [edge.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      onUpdate(edge.id, {
        type: edgeType,
        animated,
        style: { ...edge.style, stroke: strokeColor, strokeWidth: parseInt(strokeWidth) },
      });
    }, 250);
    return () => clearTimeout(t);
  }, [strokeColor, strokeWidth, edgeType, animated]);

  return (
    <div className="properties-panel">
      <div className="pp-header">
        <div className="pp-header-left">
          <div className="pp-dot" style={{ background: strokeColor, borderRadius: 0, height: 4, width: 16 }} />
          <span className="pp-title">Edge Properties</span>
        </div>
        <button className="pp-close" onClick={onClose} title="Close"><X size={15} /></button>
      </div>

      <div className="pp-body">
        <div className="pp-section">
          <div className="pp-section-label">Style</div>
          
          <label className="pp-label">Line Type</label>
          <div className="pp-type-grid" style={{ marginBottom: 12 }}>
            {["smoothstep", "straight", "step"].map((t) => (
              <button key={t} className={`pp-type-btn ${edgeType === t ? "active" : ""}`} onClick={() => setEdgeType(t)}>
                {t}
              </button>
            ))}
          </div>

          <label className="pp-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} />
            Animated (Flowing)
          </label>
        </div>

        <div className="pp-section">
          <div className="pp-section-label">Line Color</div>
          <div className="pp-colors">
            {COLOR_PRESETS.map((c) => (
              <button key={c.value} className={`pp-swatch ${strokeColor === c.value ? "active" : ""}`} style={{ background: c.value }} onClick={() => setStrokeColor(c.value)} title={c.label} />
            ))}
            <label className="pp-swatch pp-swatch--custom" title="Custom color (Eyedropper)">
              <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
              <span style={{ fontSize: 16 }}>🎨</span>
            </label>
          </div>
        </div>

        <div className="pp-section">
          <div className="pp-section-label">Actions</div>
          {confirmDelete ? (
            <div className="pp-delete-confirm">
              <p>Delete this connection?</p>
              <div className="pp-delete-btns">
                <button className="pp-btn pp-btn--ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                <button className="pp-btn pp-btn--delete" onClick={() => onDelete(edge.id)}><Trash2 size={13} /> Delete</button>
              </div>
            </div>
          ) : (
            <button className="pp-btn pp-btn--delete-ghost" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete Edge</button>
          )}
        </div>
      </div>
      <div className="pp-footer">ID: {edge.id}</div>
    </div>
  );
}

export default function PropertiesPanel({ node, edge, onUpdateNode, onUpdateEdge, onDeleteNode, onDeleteEdge, onAddChild, onClose }) {
  if (edge) {
    return <EdgePropertiesPanel edge={edge} onUpdate={onUpdateEdge} onDelete={onDeleteEdge} onClose={onClose} />;
  }

  const [name, setName]           = useState(node.data.name || "");
  const [nameEn, setNameEn]       = useState(node.data.nameEn || "");
  const [description, setDescription] = useState(node.data.description || "");
  const [orgType, setOrgType]     = useState(node.data.orgType || "office");
  const [color, setColor]         = useState(node.data.color || "#1e5799");
  const [textColor, setTextColor] = useState(node.data.textColor || "#ffffff");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addChildType, setAddChildType]   = useState("office");
  const [showAddChild, setShowAddChild]   = useState(false);

  // Sync when a different node is selected
  useEffect(() => {
    setName(node.data.name || "");
    setNameEn(node.data.nameEn || "");
    setDescription(node.data.description || "");
    setOrgType(node.data.orgType || "office");
    setColor(node.data.color || "#1e5799");
    setTextColor(node.data.textColor || "#ffffff");
    setConfirmDelete(false);
    setShowAddChild(false);
  }, [node.id]);

  // Auto-save on every change (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      onUpdateNode(node.id, { name, nameEn, description, orgType, color, textColor });
    }, 250);
    return () => clearTimeout(t);
  }, [name, nameEn, description, orgType, color, textColor]);

  return (
    <div className="properties-panel">
      {/* Panel Header */}
      <div className="pp-header">
        <div className="pp-header-left">
          <div className="pp-dot" style={{ background: color }} />
          <span className="pp-title">Properties</span>
        </div>
        <button className="pp-close" onClick={onClose} title="Close">
          <X size={15} />
        </button>
      </div>

      <div className="pp-body">
        {/* ── Identity ─────────────────────────────── */}
        <div className="pp-section">
          <div className="pp-section-label">Identity</div>

          <label className="pp-label">Khmer Name</label>
          <input
            className="pp-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ឈ្មោះ..."
            dir="auto"
          />

          <label className="pp-label">English Name</label>
          <input
            className="pp-input"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="English name..."
          />

          <label className="pp-label">Description</label>
          <textarea
            className="pp-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            rows={3}
          />
        </div>

        {/* ── Type ──────────────────────────────────── */}
        <div className="pp-section">
          <div className="pp-section-label">Node Type</div>
          <div className="pp-type-grid">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t}
                className={`pp-type-btn ${orgType === t ? "active" : ""}`}
                onClick={() => setOrgType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* ── Color ─────────────────────────────────── */}
        <div className="pp-section">
          <div className="pp-section-label">Color</div>
          <div className="pp-colors">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                className={`pp-swatch ${color === c.value ? "active" : ""}`}
                style={{ background: c.value }}
                onClick={() => setColor(c.value)}
                title={c.label}
              />
            ))}
            {/* Custom color input */}
            <label className="pp-swatch pp-swatch--custom" title="Custom color">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
              />
              <span style={{ fontSize: 16 }}>🎨</span>
            </label>
          </div>
          {/* Current color preview */}
          <div className="pp-color-preview" style={{ background: color }}>
            <span>{color}</span>
          </div>
        </div>

        {/* ── Text Color ────────────────────────────── */}
        <div className="pp-section">
          <div className="pp-section-label">Text Color</div>
          <div className="pp-colors">
            {[{label:"White", value:"#ffffff"}, {label:"Black", value:"#000000"}, {label:"Gray", value:"#cbd5e1"}, {label:"Yellow", value:"#fef08a"}].map((c) => (
              <button
                key={c.value}
                className={`pp-swatch ${textColor === c.value ? "active" : ""}`}
                style={{ background: c.value, border: c.value === "#ffffff" ? "1px solid #ccc" : "none" }}
                onClick={() => setTextColor(c.value)}
                title={c.label}
              />
            ))}
            <label className="pp-swatch pp-swatch--custom" title="Custom text color (Eyedropper)">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
              />
              <span style={{ fontSize: 16 }}>🎨</span>
            </label>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────── */}
        <div className="pp-section">
          <div className="pp-section-label">Actions</div>

          {/* Add Child */}
          <div className="pp-action-group">
            <button
              className="pp-btn pp-btn--add"
              onClick={() => setShowAddChild((v) => !v)}
            >
              <Plus size={14} /> Add Child Node
              <ChevronDown size={12} style={{ marginLeft: "auto", transform: showAddChild ? "rotate(180deg)" : "", transition: ".2s" }} />
            </button>
            {showAddChild && (
              <div className="pp-add-child">
                <div className="pp-type-grid" style={{ marginBottom: 8 }}>
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      className={`pp-type-btn ${addChildType === t ? "active" : ""}`}
                      onClick={() => setAddChildType(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  className="pp-btn pp-btn--confirm-add"
                  onClick={() => { onAddChild(node.id, addChildType); setShowAddChild(false); }}
                >
                  <Plus size={13} /> Create {addChildType} node
                </button>
              </div>
            )}
          </div>

          {/* Delete */}
          {confirmDelete ? (
            <div className="pp-delete-confirm">
              <p>Delete this node?</p>
              <div className="pp-delete-btns">
                <button className="pp-btn pp-btn--ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                <button className="pp-btn pp-btn--delete" onClick={() => onDeleteNode(node.id)}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              className="pp-btn pp-btn--delete-ghost"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} /> Delete node
            </button>
          )}
        </div>
      </div>

      {/* Node ID footer */}
      <div className="pp-footer">ID: {node.id}</div>
    </div>
  );
}
