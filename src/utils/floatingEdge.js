import { Position } from "@xyflow/react";
import { TYPE_META } from "../data/nodeTypes";

// Visio-style "dynamic glue": instead of a connector locking to one fixed
// handle, it automatically picks whichever side of the node faces the other
// node — but it always lands on that side's CENTER point, i.e. exactly where
// OrgNode's own <Handle> dot renders (top/bottom/left/right, each centered
// on its side). A true perimeter-intersection point (wherever the straight
// line between node centers happens to cross the rectangle) looks like a
// misfire because it rarely lands exactly on the visible dot.

// Used ONLY until React Flow has measured the node's rendered DOM size (the
// first paint right after a node is created). Once a measurement exists it
// always wins — see getNodeRect.
const DEFAULT_WIDTH = 200;
const PERSON_FALLBACK_WIDTH = 220;
const DEFAULT_HEIGHT = 80;

export function getNodeRect(node) {
  const { x, y } = node.internals.positionAbsolute;
  const isPerson = !!TYPE_META[node.data?.orgType]?.isPerson;

  // Always trust the measured DOM size. An earlier version clamped the width up
  // to an assumed CSS minimum, which put the computed side-centre half the
  // difference away from the handle the user can actually see — so connectors
  // landed off-centre on any node narrower than the assumed minimum, and the
  // error changed whenever the CSS min-width did. The fallbacks below apply
  // only before React Flow has measured anything.
  const width = node.measured?.width ?? node.width ??
    (isPerson ? PERSON_FALLBACK_WIDTH : DEFAULT_WIDTH);
  const height = node.measured?.height ?? node.height ?? DEFAULT_HEIGHT;
  return { x, y, width, height };
}

function getNodeCenter(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

// A person card (see OrgNode.jsx) renders its avatar overlapping ABOVE the
// card, so the card's literal top edge is not the shape's visible top. The top
// port therefore lands on the avatar's apex — `top: -42px` in chart-editor.css
// — and an arrow into it meets the avatar instead of hanging in the air above
// the head. This offset is only ever correct while something actually renders
// out there: it is the visible outer edge of the node, not padding.
//
// There is deliberately NO matching bottom offset. One used to exist, at 13px,
// to reach a headcount pill that hung below the card at `bottom: -13px`. That
// pill was removed, and the offset outlived it — every person node's outgoing
// connector then began 13px below the card with nothing to meet, which read as
// a gap at the source while the arrow end still touched its target.
const PERSON_TOP_OFFSET = 42;

// The fixed point for a given side — matches the Handle dot's position
// (or, for a person card's top, the avatar apex that covers it).
function getPort(rect, position, isPerson) {
  switch (position) {
    case Position.Top:
      return { x: rect.x + rect.width / 2, y: rect.y - (isPerson ? PERSON_TOP_OFFSET : 0) };
    case Position.Bottom:
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
    case Position.Left:
      return { x: rect.x, y: rect.y + rect.height / 2 };
    case Position.Right:
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    default:
      return getNodeCenter(rect);
  }
}

// Which side of `rect` faces `otherCenter`, based on whether the horizontal
// or vertical separation between the two node centers dominates.
function nearestSide(rect, otherCenter) {
  const center = getNodeCenter(rect);
  const dx = otherCenter.x - center.x;
  const dy = otherCenter.y - center.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? Position.Right : Position.Left;
  return dy > 0 ? Position.Bottom : Position.Top;
}

// Returns null only if a node object isn't resolvable at all yet (e.g. the
// id briefly doesn't exist in the store, such as mid-delete).
export function getFloatingEdgeParams(sourceNode, targetNode) {
  if (!sourceNode?.internals?.positionAbsolute || !targetNode?.internals?.positionAbsolute) return null;

  const sourceRect = getNodeRect(sourceNode);
  const targetRect = getNodeRect(targetNode);
  const sourceCenter = getNodeCenter(sourceRect);
  const targetCenter = getNodeCenter(targetRect);

  const sourcePosition = nearestSide(sourceRect, targetCenter);
  const targetPosition = nearestSide(targetRect, sourceCenter);

  const sourceIsPerson = !!TYPE_META[sourceNode.data?.orgType]?.isPerson;
  const targetIsPerson = !!TYPE_META[targetNode.data?.orgType]?.isPerson;

  const source = getPort(sourceRect, sourcePosition, sourceIsPerson);
  const target = getPort(targetRect, targetPosition, targetIsPerson);

  return {
    sx: source.x, sy: source.y, sourcePosition,
    tx: target.x, ty: target.y, targetPosition,
  };
}

// For a STATIC edge (locked to a specific handle the user manually chose —
// e.g. dragged from node A's left side to node B's top) the SIDE must stay
// exactly what was picked. This ensures we calculate the EXACT center of that
// side, bypassing React Flow's default behavior of slightly offsetting
// overlapping edges (which caused perfectly vertical parent->child trunks to
// split into multiple slightly unaligned lines).
export function getStaticAnchor(node, position) {
  if (!node?.internals?.positionAbsolute) return null;
  const isPerson = !!TYPE_META[node.data?.orgType]?.isPerson;
  return getPort(getNodeRect(node), position, isPerson);
}
