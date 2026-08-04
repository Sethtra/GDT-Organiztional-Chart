import { Position } from "@xyflow/react";
import { getFloatingEdgeParams, getStaticAnchor } from "./floatingEdge";

// OrgNode's <Handle> ids are literally "top"/"bottom"/"left"/"right" —
// matches how CustomEdge itself reads sourcePosition/targetPosition.
export const HANDLE_ID_TO_POSITION = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

// Dragging a segment already snaps it onto ITS OWN anchor axes (see
// ControlHandles' xSnaps/ySnaps in CustomEdge.jsx). That's not enough to
// merge two sibling trunks that were manually dragged near — but not
// exactly onto — each other: nothing pulls one edge's line onto another
// edge's line, so users land a few px off and the near-parallel strokes
// read as one blurred/thicker line instead of a single crisp one.
//
// This collects every OTHER edge's known x/y coordinates (its resolved
// source/target anchors, plus any manually-placed waypoints) as additional
// snap candidates, so dragging near an existing line pulls onto it exactly.
export function collectCrossEdgeSnapCandidates(
  currentEdgeId,
  getEdges,
  getInternalNode,
) {
  const xs = [];
  const ys = [];

  for (const edge of getEdges()) {
    if (edge.id === currentEdgeId) continue;

    const sourceNode = getInternalNode(edge.source);
    const targetNode = getInternalNode(edge.target);
    if (!sourceNode || !targetNode) continue;

    const isDynamic =
      edge.data?.dynamic === true ||
      (edge.data?.dynamic !== false &&
        !edge.sourceHandle &&
        !edge.targetHandle);

    if (isDynamic) {
      const floating = getFloatingEdgeParams(sourceNode, targetNode);
      if (floating) {
        xs.push(floating.sx, floating.tx);
        ys.push(floating.sy, floating.ty);
      }
    } else {
      const sourcePosition = HANDLE_ID_TO_POSITION[edge.sourceHandle];
      const targetPosition = HANDLE_ID_TO_POSITION[edge.targetHandle];
      const source = sourcePosition
        ? getStaticAnchor(sourceNode, sourcePosition)
        : null;
      const target = targetPosition
        ? getStaticAnchor(targetNode, targetPosition)
        : null;
      if (source) {
        xs.push(source.x);
        ys.push(source.y);
      }
      if (target) {
        xs.push(target.x);
        ys.push(target.y);
      }
    }

    for (const point of edge.data?.points ?? []) {
      xs.push(point.x);
      ys.push(point.y);
    }
  }

  return { xs, ys };
}
