// Figma/Visio-style "smart guides": while dragging a node, snap it onto any
// sibling's edge or centre line — or the position grid — the moment it
// comes within tolerance, and report that line back so the caller can
// render a dashed guide across it. The same shape of problem
// edgeSnapping.js already solves for edge waypoints (snap onto a nearby
// line instead of landing a few px off), just applied to whole-node
// position instead of a single point.
//
// Grid and sibling alignment are evaluated as ONE pool of candidates, not
// two competing systems: closest-within-tolerance wins regardless of
// source. This is deliberately NOT React Flow's own always-on snapToGrid,
// which unconditionally rounds every position to the nearest grid
// multiple whether or not that's near where the pointer actually is. Two
// problems followed from that: movement never felt free (every drag was
// quantized, all the time, not just when useful), and a sibling whose
// centre doesn't itself land on a grid multiple was structurally
// unreachable — the grid-rounded position could get no closer than half a
// grid cell, which can easily exceed the alignment tolerance and silently
// defeat the guide it should have deferred to.

function rectLines(rect) {
  return {
    left: rect.x,
    centerX: rect.x + rect.width / 2,
    right: rect.x + rect.width,
    top: rect.y,
    centerY: rect.y + rect.height / 2,
    bottom: rect.y + rect.height,
  };
}

const X_KEYS = ["left", "centerX", "right"];
const Y_KEYS = ["top", "centerY", "bottom"];

function bestAxisMatch(draggedLines, otherRects, keys, threshold, gridSize, gridKey) {
  let best = null; // { delta, at }

  const consider = (at) => {
    const diff = at - draggedLines[gridKey];
    if (Math.abs(diff) <= threshold && (!best || Math.abs(diff) < Math.abs(best.delta))) {
      best = { delta: diff, at };
    }
  };

  if (gridSize) {
    consider(Math.round(draggedLines[gridKey] / gridSize) * gridSize);
  }

  for (const other of otherRects) {
    const otherLines = rectLines(other);
    for (const dKey of keys) {
      for (const oKey of keys) {
        const diff = otherLines[oKey] - draggedLines[dKey];
        if (Math.abs(diff) <= threshold && (!best || Math.abs(diff) < Math.abs(best.delta))) {
          best = { delta: diff, at: otherLines[oKey] };
        }
      }
    }
  }
  return best;
}

/**
 * @param {{x:number,y:number,width:number,height:number}} draggedRect - the
 *   node being dragged, at its raw (unsnapped) current position.
 * @param {Array<{x:number,y:number,width:number,height:number}>} otherRects
 * @param {number} threshold - flow-space tolerance (caller divides screen
 *   px by zoom so the snap feels the same size at any zoom level).
 * @param {number|null} gridSize - when set, the node's own position (left/
 *   top) also competes as a candidate against the nearest grid line, in
 *   the same tolerance as sibling alignment.
 * @returns {{deltaX:number, deltaY:number, guideX:number|null, guideY:number|null}}
 */
export function getNodeAlignmentGuides(draggedRect, otherRects, threshold = 6, gridSize = null) {
  const draggedLines = rectLines(draggedRect);
  const matchX = bestAxisMatch(draggedLines, otherRects, X_KEYS, threshold, gridSize, "left");
  const matchY = bestAxisMatch(draggedLines, otherRects, Y_KEYS, threshold, gridSize, "top");

  return {
    deltaX: matchX ? matchX.delta : 0,
    deltaY: matchY ? matchY.delta : 0,
    guideX: matchX ? matchX.at : null,
    guideY: matchY ? matchY.at : null,
  };
}
