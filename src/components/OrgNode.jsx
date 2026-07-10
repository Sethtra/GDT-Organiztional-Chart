import { memo, useState, useContext } from "react";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import { Pencil, ChevronDown, ChevronRight, Link as LinkIcon } from "lucide-react";
import { ChartContext } from "../App";

const TYPE_META = {
  ministry:   { label: "MINISTRY",   accent: "#d4af37" },
  department: { label: "DEPARTMENT", accent: "#38bdf8" },
  division:   { label: "DIVISION",   accent: "#a78bfa" },
  office:     { label: "OFFICE",     accent: "#6ee7b7" },
  simple:     { label: "",           accent: "#94a3b8" },
};

const OrgNode = memo(({ id, data, selected }) => {
  const [hovered, setHovered] = useState(false);
  const context = useContext(ChartContext);

  const meta = TYPE_META[data.orgType] || TYPE_META.office;
  const bgColor = data.color || "#1e5799";
  const textColor = data.textColor || "#ffffff";
  
  // Dynamic properties from context
  const isCollapsed = context?.collapsedNodes?.has(id) || false;
  const isHighlighted = context?.searchHighlights?.includes(id) || false;
  const childCount = context?.childCounts?.[id] || 0;

  const fontSize = data.fontSize || 13;
  const textAlign = data.textAlign || "center";
  const textVerticalAlign = data.textVerticalAlign || "center";

  return (
    <div
      className={`org-node ${selected ? "org-node--selected" : ""} ${isHighlighted ? "org-node--highlighted" : ""}`}
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

      {/* Header: type badge + hints — hidden for 'simple' type */}
      <div className="org-node__header">
        {data.orgType !== 'simple' && (
          <span className="org-node__badge" style={{ color: meta.accent, borderColor: meta.accent }}>
            {meta.label}
          </span>
        )}
        <div className="org-node__header-right" style={data.orgType === 'simple' ? { marginLeft: 'auto' } : {}}>
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
      <div
        className="org-node__body"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: textVerticalAlign,
          textAlign: textAlign,
          flex: 1,
        }}
      >
        <div className="org-node__name" style={{ fontSize: `${fontSize}px` }}>{data.name || "ឈ្មោះ"}</div>
        {data.nameEn && (
          <div className="org-node__name-en" style={{ fontSize: `${Math.max(8, fontSize - 3)}px` }}>{data.nameEn}</div>
        )}
        {data.description && (
          <div className="org-node__desc" style={{ fontSize: `${Math.max(8, fontSize - 4)}px` }}>{data.description}</div>
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
