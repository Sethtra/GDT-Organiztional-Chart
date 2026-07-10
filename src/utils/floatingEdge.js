import { Position } from "@xyflow/react";

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

function getNodeRect(node) {
  const { x, y } = node.internals.positionAbsolute;
  const width = node.measured?.width ?? node.width ?? DEFAULT_WIDTH;
  const height = node.measured?.height ?? node.height ?? DEFAULT_HEIGHT;
  return { x, y, width, height };
}

function getNodeCenter(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

// The fixed point for a given side — matches the Handle dot's position.
function getPort(rect, position) {
  switch (position) {
    case Position.Top:    return { x: rect.x + rect.width / 2, y: rect.y };
    case Position.Bottom: return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
    case Position.Left:   return { x: rect.x, y: rect.y + rect.height / 2 };
    case Position.Right:  return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    default:              return getNodeCenter(rect);
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

  const source = getPort(sourceRect, sourcePosition);
  const target = getPort(targetRect, targetPosition);

  return {
    sx: source.x, sy: source.y, sourcePosition,
    tx: target.x, ty: target.y, targetPosition,
  };
}
