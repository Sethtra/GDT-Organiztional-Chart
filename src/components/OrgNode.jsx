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

/**
 * Relative luminance (WCAG), used to pick white or near-black for the label
 * sitting on the node's coloured band. An author can set any band colour, so a
 * hardcoded white label would go unreadable the moment someone picks a pale one.
 */
function readableInk(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L =
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255);
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? "#ffffff" : "#10221a";
}

// The resize frame follows the brand, not the node's badge colour — tying it
// to badgeAccent made it render in the panel's default sky blue.
// Selection is drawn by the node itself (.org-node--selected's green ring), not
// by a second rectangle around it. React Flow's four line controls stay in the
// DOM so the edges remain draggable, but they are not painted: they are straight
// divs on a rounded card, so at every corner they visibly detach and read as a
// foreign frame. Only the corner handles are shown, which is how Figma, Miro and
// Lucidchart all behave.
// Selection is drawn by the node itself (.org-node--selected's green ring) plus
// round corner handles sitting on that ring — the way Canva, Figma and Miro do
// it. React Flow's four line controls stay in the DOM so the edges remain
// draggable, but they paint nothing: they are straight divs on a rounded card,
// so drawn they detach at every corner and read as a separate floating frame.
const RESIZE_LINE = { borderColor: "transparent" };
const RESIZE_HANDLE = {
  borderColor: "#136232",
  background: "#ffffff",
  borderWidth: 1.5,
  width: 9,
  height: 9,
  borderRadius: "50%",
};

const OrgNode = memo(({ id, data, selected }) => {
  const [hovered, setHovered] = useState(false);
  const context = useContext(ChartContext);

  const meta = TYPE_META[data.orgType] || TYPE_META.orgNode;
  const textColor = data.textColor || "#ffffff";
  const badgeAccent = data.badgeColor || meta.accent;

  // Dynamic properties from context
  const isCollapsed = context?.collapsedNodes?.has(id) || false;
  const isHighlighted = context?.searchHighlights?.includes(id) || false;
  const childCount = context?.childCounts?.[id] || 0;
  const teamSize = context?.teamSizes?.[id] || 0;

  const fontSize = data.fontSize || 13;
  const textAlign = data.textAlign || "center";
  const textVerticalAlign = data.textVerticalAlign || "center";

  // Staff/position nodes (Head, Deputy, Officer). Avatar and team-pill overlap
  // the card's top/bottom edges at exactly the points floatingEdge.js aims its
  // connectors at (PERSON_TOP_OFFSET / PERSON_BOTTOM_OFFSET), so that geometry
  // is fixed. Both are pointer-events:none (see chart-editor.css) so they sit
  // visually over this node's handles without blocking drag-to-connect.
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
          minWidth={200}
          minHeight={160}
          isVisible={selected}
          lineStyle={RESIZE_LINE}
          handleStyle={RESIZE_HANDLE}
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
          className={`person-node__avatar ${isVacant ? "person-node__avatar--vacant" : ""}`}
        >
          {!isVacant && data.photoUrl ? (
            <img src={data.photoUrl} alt="" />
          ) : isVacant ? (
            "?"
          ) : (
            initials
          )}
        </div>

        <div className="person-node__body">
          <div
            className="person-node__name"
            style={{ fontSize: `${fontSize + 2.5}px` }}
          >
            {isVacant ? (
              <span className="person-node__vacant">Vacant</span>
            ) : (
              data.name
            )}
          </div>
          {(data.position || data.badgeText) && (
            <div className="person-node__position">
              {data.position || data.badgeText}
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

  // ── Unit node ─────────────────────────────────────────────────────────────
  // One card for every unit. No derived rank, no size tied to position in the
  // chart: the band colour and label are the author's, and the node resizes
  // freely from its handles.
  // An authored colour picks its own readable ink; the default band is GDT
  // emerald in both themes, which white always clears 4.5:1 on.
  const authored = /^#?[0-9a-f]{6}$/i.test(String(data.color || "").trim());
  const bandColor = data.color || "var(--nx-band-default)";
  const bandInk = authored ? readableInk(data.color) : "#ffffff";
  const isSimple = data.orgType === "simple";

  return (
    <div
      className={`org-node ${selected ? "org-node--selected" : ""} ${isHighlighted ? "org-node--highlighted" : ""}`}
      style={{
        "--nx-band-color": bandColor,
        "--nx-band-ink": bandInk,
        "--node-accent": badgeAccent,
        color: textColor,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NodeResizer
        minWidth={140}
        minHeight={64}
        isVisible={selected}
        lineStyle={RESIZE_LINE}
        handleStyle={RESIZE_HANDLE}
      />

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

      {/* Title band — the author's colour and label */}
      <div className="org-node__band">
        {!isSimple && data.badgeText && (
          <span className="org-node__label">{data.badgeText}</span>
        )}
        <div
          className="org-node__header-right"
          style={isSimple ? { marginLeft: "auto" } : {}}
        >
          {childCount > 0 && (
            <span
              className="org-node__child-count"
              title={`${childCount} direct ${childCount === 1 ? "unit" : "units"}`}
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
              <Pencil size={10} /> Edit
            </span>
          )}
          {data.linkedChartId && (
            <span
              title="Linked to another chart"
              className="org-node__link-badge"
            >
              <LinkIcon size={9} />
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
          <div className="org-node__collapsed-badge">
            <ChevronRight size={9} /> {childCount} hidden
          </div>
        )}
      </div>
    </div>
  );
});

OrgNode.displayName = "OrgNode";
export default OrgNode;
