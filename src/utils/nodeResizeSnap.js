export function getNodeResizeSnap(size, otherSizes, threshold = 6) {
  const findClosest = (key) => {
    let closest = null;
    for (const other of otherSizes) {
      const candidate = Number(other[key]);
      if (!Number.isFinite(candidate) || candidate <= 0) continue;
      const distance = Math.abs(candidate - size[key]);
      if (distance <= threshold && (!closest || distance < closest.distance)) {
        closest = { value: candidate, distance };
      }
    }
    return closest;
  };

  const widthMatch = findClosest('width');
  const heightMatch = findClosest('height');

  return {
    width: widthMatch?.value ?? size.width,
    height: heightMatch?.value ?? size.height,
    widthMatched: Boolean(widthMatch),
    heightMatched: Boolean(heightMatch),
  };
}

function closestLine(value, candidates, threshold) {
  let closest = null;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value);
    if (distance <= threshold && (!closest || distance < closest.distance)) {
      closest = { value: candidate, distance };
    }
  }
  return closest;
}

/**
 * Snaps the actively resized edges to sibling edges/centres and reports the
 * matching canvas coordinates so the editor can draw true intersection guides.
 */
export function getNodeResizeGuides(rect, otherRects, resizeEdges, threshold = 6) {
  const sizeSnap = getNodeResizeSnap(rect, otherRects, threshold);
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  let x = rect.x;
  let y = rect.y;
  let width = rect.width;
  let height = rect.height;
  let guideX = null;
  let guideY = null;

  if (resizeEdges.left || resizeEdges.right) {
    const movingX = resizeEdges.left ? rect.x : right;
    const xLines = otherRects.flatMap((other) => [
      other.x,
      other.x + other.width / 2,
      other.x + other.width,
    ]);
    const edgeMatch = closestLine(movingX, xLines, threshold);
    const edgeWidth = edgeMatch
      ? resizeEdges.left
        ? right - edgeMatch.value
        : edgeMatch.value - rect.x
      : rect.width;
    const sizeDistance = sizeSnap.widthMatched
      ? Math.abs(sizeSnap.width - rect.width)
      : Infinity;
    const edgeDistance = edgeMatch ? Math.abs(edgeWidth - rect.width) : Infinity;

    if (edgeMatch && edgeDistance <= sizeDistance) {
      guideX = edgeMatch.value;
      width = edgeWidth;
      if (resizeEdges.left) x = edgeMatch.value;
    } else if (sizeSnap.widthMatched) {
      width = sizeSnap.width;
      if (resizeEdges.left) x = right - width;
    }
  }

  if (resizeEdges.top || resizeEdges.bottom) {
    const movingY = resizeEdges.top ? rect.y : bottom;
    const yLines = otherRects.flatMap((other) => [
      other.y,
      other.y + other.height / 2,
      other.y + other.height,
    ]);
    const edgeMatch = closestLine(movingY, yLines, threshold);
    const edgeHeight = edgeMatch
      ? resizeEdges.top
        ? bottom - edgeMatch.value
        : edgeMatch.value - rect.y
      : rect.height;
    const sizeDistance = sizeSnap.heightMatched
      ? Math.abs(sizeSnap.height - rect.height)
      : Infinity;
    const edgeDistance = edgeMatch ? Math.abs(edgeHeight - rect.height) : Infinity;

    if (edgeMatch && edgeDistance <= sizeDistance) {
      guideY = edgeMatch.value;
      height = edgeHeight;
      if (resizeEdges.top) y = edgeMatch.value;
    } else if (sizeSnap.heightMatched) {
      height = sizeSnap.height;
      if (resizeEdges.top) y = bottom - height;
    }
  }

  return {
    x,
    y,
    width,
    height,
    guideX,
    guideY,
    widthMatched: guideX != null || sizeSnap.widthMatched,
    heightMatched: guideY != null || sizeSnap.heightMatched,
  };
}
