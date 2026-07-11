import { Position } from "@xyflow/react";
import { TYPE_META } from "../data/nodeTypes";

// Visio-style "dynamic glue": instead of a connector locking to one fixed
// handle, it automatically picks whichever side of the node faces the other
// node — but it always lands on that side's CENTER point, i.e. exactly where
// OrgNode's own <Handle> dot renders (top/bottom/left/right, each centered
// on its side). A true perimeter-intersection point (wherever the straight
// line between node centers happens to cross the rectangle) looks like a
// misfire because it rarely lands exactly on the visible dot.

// Matches .org-node's min-width/min-height (index.css) — used only until
// React Flow has actually measured the node's rendered DOM size (e.g. the
// first paint right after a node is created).
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 80;

export function getNodeRect(node) {
  const { x, y } = node.internals.positionAbsolute;
  let width = node.measured?.width ?? node.width ?? DEFAULT_WIDTH;
  const isPerson = !!TYPE_META[node.data?.orgType]?.isPerson;
  
  // Ensure math matches the CSS min-widths (220 for person, 160 for org unit)
  const minWidth = isPerson ? 220 : 160;
  if (width < minWidth) {
    width = minWidth;
  }
  
  const height = node.measured?.height ?? node.height ?? DEFAULT_HEIGHT;
  return { x, y, width, height };
}

function getNodeCenter(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

// Person cards (Head/Deputy/Officer — see OrgNode.jsx) render an avatar
// overlapping above the card and a team-size pill overlapping below it
// (matching Claude Design turn 11b). The card's literal top/bottom edges sit
// hidden behind those. We land the connector exactly on the visible outer
// edge of the avatar (its topmost point) and the pill (its bottom), so the
// line TOUCHES the node instead of floating in the empty space beyond it:
//   · avatar: top:-42px in index.css → its apex is 42px above the card top
//   · team pill: bottom:-13px        → its base is 13px below the card bottom
// (A larger offset here left the arrowhead hanging in mid-air above the head.)
const PERSON_TOP_OFFSET = 42;
const PERSON_BOTTOM_OFFSET = 13;

// The fixed point for a given side — matches the Handle dot's position
// (or, for a person card's top/bottom, just outside the avatar/team pill).
function getPort(rect, position, isPerson) {
  switch (position) {
    case Position.Top:
      return { x: rect.x + rect.width / 2, y: rect.y - (isPerson ? PERSON_TOP_OFFSET : 0) };
    case Position.Bottom:
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height + (isPerson ? PERSON_BOTTOM_OFFSET : 0) };
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
// exactly what was picked; only a person card's top/bottom needs its
// position nudged past the overlapping avatar/team pill. Returns null for
// non-person nodes (or left/right sides) so the caller's raw React-Flow
// coordinate is used unchanged, and null if the node isn't resolvable yet.
export function getPersonStaticAnchor(node, position) {
  if (!node?.internals?.positionAbsolute) return null;
  if (!TYPE_META[node.data?.orgType]?.isPerson) return null;
  if (position !== Position.Top && position !== Position.Bottom) return null;
  return getPort(getNodeRect(node), position, true);
}
