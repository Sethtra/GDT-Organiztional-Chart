import { memo, useState, useContext } from "react";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import {
  Pencil,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
  History,
} from "lucide-react";
import { ChartContext } from "../contexts/ChartContext";
import { TYPE_META } from "../data/nodeTypes";

const OrgNode = memo(({ id, data, selected }) => {
  const [hovered, setHovered] = useState(false);
  const context = useContext(ChartContext);

  const meta = TYPE_META[data.orgType] || TYPE_META.orgNode;
  const bgColor = data.color || "var(--default-node-bg)";
  const textColor = data.textColor || "#ffffff";
  const badgeText = data.badgeText || meta.label;
  const badgeAccent = data.badgeColor || meta.accent;

  // Dynamic properties from context
  const isCollapsed = context?.collapsedNodes?.has(id) || false;
  const isHighlighted = context?.searchHighlights?.includes(id) || false;
  const childCount = context?.childCounts?.[id] || 0;
  const teamSize = context?.teamSizes?.[id] || 0;

  const fontSize = data.fontSize || 13;
  const textAlign = data.textAlign || "center";
  const textVerticalAlign = data.textVerticalAlign || "center";

  // Staff/position nodes (Head, Deputy, Officer): dark card matching the
  // Claude Design "clean card" reference (design turn 11b) exactly — fixed
  // dark gradient + gold accents, avatar and team-pill overlapping the
  // card's top/bottom edges. Both overlapping elements are pointer-events:
  // none (see index.css) so they sit visually on top of this node's
  // connector handles without blocking drag-to-connect on them.
  if (meta.isPerson) {
    const initials = (data.nameEn || data.name || "?")
      .trim()
      .charAt(0)
      .toUpperCase();

    const isVacant = !data.name && !data.nameEn;
    const hasHistory = data.history && data.history.length > 0;

    return (
      <div
        className={`org-node org-node--person ${selected ? "org-node--selected" : ""} ${isHighlighted ? "org-node--highlighted" : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <NodeResizer
          minWidth={220}
          minHeight={170}
          isVisible={selected}
          lineStyle={{ borderColor: badgeAccent }}
          handleStyle={{ borderColor: badgeAccent, background: "#fff" }}
        />

        <Handle
          type="source"
          position={Position.Top}
          id="top"
          className="flow-handle"
        />
        {data.type !== 'officer' && (
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            className="flow-handle"
          />
        )}
        {data.type !== 'officer' && (
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            className="flow-handle"
          />
        )}
        {data.type !== 'officer' && (
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className="flow-handle"
          />
        )}



        {data.linkedChartId && (
          <span
            title="Linked to another chart"
            className="person-node__link-badge"
          >
            <LinkIcon size={9} />
          </span>
        )}

        {hasHistory && (
          <span
            title={`${data.history.length} past record(s)`}
            className="person-node__history-badge"
          >
            <History size={10} />
          </span>
        )}

        <div
          className="person-node__avatar"
          style={{ "--avatar-accent": badgeAccent, opacity: isVacant ? 0.3 : 1 }}
        >
          {isVacant ? "?" : initials}
        </div>

        <div className="person-node__body">
          <div
            className="person-node__name"
            style={{ fontSize: `${fontSize + 2.5}px` }}
          >
            {isVacant ? (
              <span style={{ color: "#fca5a5", letterSpacing: "2px", fontWeight: "800", fontSize: "11px" }}>VACANT</span>
            ) : (
              data.name
            )}
          </div>
          {(data.position || badgeText) && (
            <div className="person-node__position">
              {data.position || badgeText}
            </div>
          )}
        </div>

        {teamSize > 0 && data.type !== 'officer' && (
          <span
            className={`person-node__team ${isCollapsed ? "person-node__team--collapsed" : ""}`}
            title={
              isCollapsed
                ? `${teamSize} people under them (subtree collapsed)`
                : `${teamSize} people under them`
            }
          >
            {teamSize}
            {isCollapsed ? (
              <ChevronRight size={11} />
            ) : (
              <ChevronDown size={11} />
            )}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`org-node ${selected ? "org-node--selected" : ""} ${isHighlighted ? "org-node--highlighted" : ""}`}
      style={{
        "--node-bg": bgColor,
        "--node-accent": badgeAccent,
        color: textColor,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Resize handles when selected */}
      <NodeResizer
        minWidth={180}
        minHeight={70}
        isVisible={selected}
        lineStyle={{ borderColor: badgeAccent }}
        handleStyle={{ borderColor: badgeAccent, background: "#fff" }}
      />

      {/* Connection handles */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="flow-handle"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="flow-handle"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="flow-handle"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="flow-handle"
      />

      {/* Colored top accent bar */}
      <div className="org-node__bar" />

      {/* Header: type badge + hints — hidden for 'simple' type */}
      <div className="org-node__header">
        {data.orgType !== "simple" && (
          <span
            className="org-node__badge"
            style={{ color: badgeAccent, borderColor: badgeAccent }}
          >
            {badgeText}
          </span>
        )}
        <div
          className="org-node__header-right"
          style={data.orgType === "simple" ? { marginLeft: "auto" } : {}}
        >
          {childCount > 0 && (
            <span
              className="org-node__child-count"
              style={{ color: badgeAccent }}
            >
              {isCollapsed ? (
                <ChevronRight size={10} />
              ) : (
                <ChevronDown size={10} />
              )}
              {childCount}
            </span>
          )}
          {hovered && !isCollapsed && (
            <span className="org-node__edit-hint">
              <Pencil size={11} /> edit
            </span>
          )}
          {data.linkedChartId && (
            <span
              title="Linked to another chart"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "1px 5px",
                background: "rgba(14,125,110,0.25)",
                borderRadius: 4,
                border: "1px solid rgba(14,125,110,0.5)",
                marginLeft: 2,
              }}
            >
              <LinkIcon size={9} style={{ color: "#0e7d6e" }} />
            </span>
          )}
        </div>
      </div>

      {/* Body: names */}
      <div
        className="org-node__body"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: textVerticalAlign,
          textAlign: textAlign,
          flex: 1,
        }}
      >
        <div className="org-node__name" style={{ fontSize: `${fontSize}px` }}>
          {data.name || "ឈ្មោះ"}
        </div>
        {data.nameEn && (
          <div
            className="org-node__name-en"
            style={{ fontSize: `${Math.max(8, fontSize - 3)}px` }}
          >
            {data.nameEn}
          </div>
        )}
        {data.description && (
          <div
            className="org-node__desc"
            style={{ fontSize: `${Math.max(8, fontSize - 4)}px` }}
          >
            {data.description}
          </div>
        )}
        {isCollapsed && childCount > 0 && (
          <div className="org-node__collapsed-badge">▶ {childCount} hidden</div>
        )}
      </div>
    </div>
  );
});

OrgNode.displayName = "OrgNode";
export default OrgNode;
