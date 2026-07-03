import { memo, useState } from "react";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import { Pencil } from "lucide-react";

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

  return (
    <div
      className={`org-node ${selected ? "org-node--selected" : ""}`}
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
      <Handle type="source" position={Position.Top} id="top" className="flow-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="flow-handle" />
      <Handle type="source" position={Position.Left} id="left" className="flow-handle" />
      <Handle type="source" position={Position.Right} id="right" className="flow-handle" />

      {/* Colored top accent bar */}
      <div className="org-node__bar" />

      {/* Header: type badge */}
      <div className="org-node__header">
        <span className="org-node__badge" style={{ color: meta.accent, borderColor: meta.accent }}>
          {meta.label}
        </span>
        {hovered && (
          <span className="org-node__edit-hint">
            <Pencil size={11} /> click to edit
          </span>
        )}
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
      </div>
    </div>
  );
});

OrgNode.displayName = "OrgNode";
export default OrgNode;
