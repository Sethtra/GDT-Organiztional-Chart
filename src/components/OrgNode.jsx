import { memo, useState } from "react";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import { Pencil, ChevronDown, ChevronRight, Link as LinkIcon } from "lucide-react";

const TYPE_META = {
  ministry:   { label: "MINISTRY",   accent: "#d4af37" },
  department: { label: "DEPARTMENT", accent: "#38bdf8" },
  division:   { label: "DIVISION",   accent: "#a78bfa" },
  office:     { label: "OFFICE",     accent: "#6ee7b7" },
};

const OrgNode = memo(({ data, selected }) => {
  const [hovered, setHovered] = useState(false);
  const meta = TYPE_META[data.orgType] || TYPE_META.office;
  const bgColor = data.color || "#1e5799";
  const textColor = data.textColor || "#ffffff";
  const isCollapsed = data.collapsed || false;
  const childCount = data.childCount || 0;

  return (
    <div
      className={`org-node ${selected ? "org-node--selected" : ""} ${data.searchHighlight ? "org-node--highlighted" : ""}`}
      style={{ "--node-bg": bgColor, "--node-accent": meta.accent, color: textColor }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Resize handles when selected */}
      <NodeResizer
        minWidth={180}
        minHeight={70}
        isVisible={selected}
        lineStyle={{ borderColor: meta.accent }}
        handleStyle={{ borderColor: meta.accent, background: "#fff" }}
      />

      {/* Connection handles */}
      <Handle type="source" position={Position.Top}    id="top"    className="flow-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="flow-handle" />
      <Handle type="source" position={Position.Left}   id="left"   className="flow-handle" />
      <Handle type="source" position={Position.Right}  id="right"  className="flow-handle" />

      {/* Colored top accent bar */}
      <div className="org-node__bar" />

      {/* Header: type badge + hints */}
      <div className="org-node__header">
        <span className="org-node__badge" style={{ color: meta.accent, borderColor: meta.accent }}>
          {meta.label}
        </span>
        <div className="org-node__header-right">
          {childCount > 0 && (
            <span className="org-node__child-count" style={{ color: meta.accent }}>
              {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
              {childCount}
            </span>
          )}
          {hovered && !isCollapsed && (
            <span className="org-node__edit-hint">
              <Pencil size={11} /> edit
            </span>
          )}
          {data.linkedChartId && (
            <span title="Linked to another chart" style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 5px', background: 'rgba(14,125,110,0.25)', borderRadius: 4, border: '1px solid rgba(14,125,110,0.5)', marginLeft: 2 }}>
              <LinkIcon size={9} style={{ color: '#0e7d6e' }} />
            </span>
          )}
        </div>
      </div>

      {/* Body: names */}
      <div className="org-node__body">
        <div className="org-node__name">{data.name || "ឈ្មោះ"}</div>
        {data.nameEn && (
          <div className="org-node__name-en">{data.nameEn}</div>
        )}
        {data.description && (
          <div className="org-node__desc">{data.description}</div>
        )}
        {isCollapsed && childCount > 0 && (
          <div className="org-node__collapsed-badge">
            ▶ {childCount} hidden
          </div>
        )}
      </div>
    </div>
  );
});

OrgNode.displayName = "OrgNode";
export default OrgNode;
