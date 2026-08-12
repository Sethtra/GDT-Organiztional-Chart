import { useCallback, useEffect, useRef } from 'react';
import { getNodeResizeGuides } from '../utils/nodeResizeSnap';

const SIZE_SNAP_THRESHOLD_PX = 7;

export function useNodeResizeSnap({ getNodes, getZoom, setNodes, setGuides }) {
  const frameRef = useRef(null);

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return useCallback(
    (nodeId, params, resizeEdges = {}, commit = false) => {
      const otherRects = getNodes()
        .filter((node) => node.id !== nodeId && !node.hidden)
        .map((node) => ({
          x: node.position.x,
          y: node.position.y,
          width: node.measured?.width ?? node.width,
          height: node.measured?.height ?? node.height,
        }))
        .filter((node) => Number.isFinite(node.width) && Number.isFinite(node.height));
      const threshold = SIZE_SNAP_THRESHOLD_PX / Math.max(getZoom(), 0.01);
      const snapped = getNodeResizeGuides(
        params,
        otherRects,
        resizeEdges,
        threshold,
      );

      setGuides?.(
        commit
          ? { guideX: null, guideY: null }
          : { guideX: snapped.guideX, guideY: snapped.guideY },
      );

      if (commit && (snapped.widthMatched || snapped.heightMatched)) {
        if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(() => {
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === nodeId
                ? {
                    ...node,
                    width: snapped.width,
                    height: snapped.height,
                    position: { x: snapped.x, y: snapped.y },
                  }
                : node,
            ),
          );
          frameRef.current = null;
        });
      }

      return snapped;
    },
    [getNodes, getZoom, setGuides, setNodes],
  );
}
