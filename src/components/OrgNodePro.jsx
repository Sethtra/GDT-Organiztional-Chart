import { memo, useContext } from "react";
import { Handle, Position, NodeResizer } from "@xyflow/react";
import {
  Pencil,
  ChevronDown,
  ChevronRight,
  Link as LinkIcon,
} from "lucide-react";
import { ChartContext } from "../contexts/ChartContext";
import { TYPE_META } from "../data/nodeTypes";
import OrgNode from "./OrgNode";
import "../styles/org-node-pro.css";

/**
 * The unit card. Mounted by both the live editor (FlowApp.jsx) and
 * /test-chart-editor; test/orgNodeIsolation.test.js fails if those two drift.
 *
 * It renders `.gdt-node*` class names, which OrgNode never emits, so the two
 * cards cannot style each other despite sharing a bundle. That separation was
 * built for the review period and is kept because it still holds the person
 * card's styling apart from this one's.
 *
 * Person cards are deliberately NOT redesigned here — they are delegated
 * straight back to OrgNode. The brief was the unit node; a person card is a
 * fixed-format profile with avatar geometry that floatingEdge.js aims
 * connector endpoints at, and reworking it as a side effect of this would be
 * scope the review did not ask for.
 *
 * What changed, and why each one:
 *  · Three registers instead of two. Identity band, name field, recessed
 *    footer for secondary text. The live card runs the description straight
 *    under the name behind a hairline, so everything below the band is one
 *    undifferentiated column.
 *  · The band collapses to a 7px rule when it has nothing to carry. An
 *    unlabelled node used to draw a full-height empty colour slab, which is
 *    most of why a badge-less node looked unfinished rather than plain.
 *  · A stroke stack instead of a border, plus a keel under the band. Detail
 *    at the edges is what separates a printed object from a div.
 *  · The edit hint is always mounted at low opacity. Mounting it on hover
 *    shifted the count chip beside it every time the pointer crossed the card.
 */

// Mirrors readableInk in OrgNode.jsx on purpose. Sharing it would mean editing
// the live component to add an export, and the point of this pass is that
// nothing live is touched. Fold the two together when (if) this replaces it.
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

const RESIZE_LINE = { borderColor: "transparent" };
const RESIZE_HANDLE = {
  borderColor: "#136232",
  background: "#ffffff",
  borderWidth: 1.5,
  width: 9,
  height: 9,
  borderRadius: "50%",
};

const OrgNodePro = memo(({ id, data, selected }) => {
  // No hover state: every hover affordance on this card is a CSS :hover rule.
  // Tracking it in React re-rendered the node on every pointer cross for a
  // result the stylesheet already had.
  const context = useContext(ChartContext);

  const meta = TYPE_META[data.orgType] || TYPE_META.orgNode;

  // Person cards keep the shipped design — see the note above.
  if (meta.isPerson) {
    return <OrgNode id={id} data={data} selected={selected} />;
  }

  const isCollapsed = context?.collapsedNodes?.has(id) || false;
  const isHighlighted = context?.searchHighlights?.includes(id) || false;
  const childCount = context?.childCounts?.[id] || 0;

  const fontSize = data.fontSize || 15;
  const textAlign = data.textAlign || "center";
  const textVerticalAlign = data.textVerticalAlign || "center";

  const authored = /^#?[0-9a-f]{6}$/i.test(String(data.color || "").trim());
  const bandColor = data.color || "var(--nx-band-default)";
  const bandInk = authored ? readableInk(data.color) : "#ffffff";

  const isSimple = data.orgType === "simple";
  const label = isSimple ? "" : data.badgeText || "";
  const hasMeta = childCount > 0 || !!data.linkedChartId;
  // With no label and nothing in the meta cluster there is nothing for a
  // full-height band to hold, so it becomes a rule. The edit pencil alone does
  // not keep it open — it is a hint, not content.
  const bandIsRule = !label && !hasMeta;

  const footer = data.description || "";

  return (
    <div
      className={[
        "gdt-node",
        bandIsRule && "gdt-node--rule",
        selected && "gdt-node--selected",
        isHighlighted && "gdt-node--highlighted",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--gdt-band": bandColor,
        "--gdt-band-ink": bandInk,
        "--gdt-keel": `color-mix(in srgb, ${bandColor} 74%, #000)`,
      }}
    >
      <NodeResizer
        minWidth={150}
        minHeight={72}
        isVisible={selected}
        lineStyle={RESIZE_LINE}
        handleStyle={RESIZE_HANDLE}
      />

      <Handle type="source" position={Position.Top} id="top" className="flow-handle" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="flow-handle" />
      <Handle type="source" position={Position.Left} id="left" className="flow-handle" />
      <Handle type="source" position={Position.Right} id="right" className="flow-handle" />

      <div className="gdt-node__band">
        {label && <span className="gdt-node__label">{label}</span>}
        {!bandIsRule && (
          <div className="gdt-node__meta" style={label ? undefined : { marginLeft: "auto" }}>
            {childCount > 0 && (
              <span
                className="gdt-node__count"
                title={`${childCount} direct ${childCount === 1 ? "unit" : "units"}`}
              >
                {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                {childCount}
              </span>
            )}
            {data.linkedChartId && (
              <span className="gdt-node__link" title="Linked to another chart">
                <LinkIcon size={9} />
              </span>
            )}
            <span className="gdt-node__edit" aria-hidden="true" title="Double-click to edit">
              <Pencil size={10} />
            </span>
          </div>
        )}
      </div>

      <div
        className="gdt-node__body"
        style={{ justifyContent: textVerticalAlign, textAlign }}
      >
        <div
          className={`gdt-node__name ${data.name ? "" : "gdt-node__name--empty"}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          {data.name || "ឈ្មោះ"}
        </div>

        {/* The caption keeps a fixed register rather than scaling with the
            name. It is a letterhead line, not a smaller copy of the title —
            letting it track a 24px name would turn it back into one. */}
        {data.nameEn && <div className="gdt-node__name-en">{data.nameEn}</div>}

        {isCollapsed && childCount > 0 && (
          <span className="gdt-node__collapsed">
            <ChevronRight size={9} /> {childCount} hidden
          </span>
        )}
      </div>

      {footer && <div className="gdt-node__footer">{footer}</div>}
    </div>
  );
});

OrgNodePro.displayName = "OrgNodePro";
export default OrgNodePro;
