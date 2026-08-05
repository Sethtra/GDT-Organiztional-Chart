import { ViewportPortal } from '@xyflow/react';

// A dashed line rendered fully across the canvas the instant a dragged
// node's edge or centre lines up with another node's — the Figma/Visio
// "smart guide" affordance. Deliberately NOT brand green: green is already
// claimed by selection rings, handles, and primary actions, so a same-hue
// guide would read as more chrome instead of a distinct, temporary signal
// that appears only while dragging.
const GUIDE_SPAN = 8000;

export default function AlignmentGuides({ guideX, guideY }) {
  if (guideX == null && guideY == null) return null;

  return (
    <ViewportPortal>
      {guideX != null && (
        <div
          className="nx-alignment-guide nx-alignment-guide--v"
          style={{
            left: guideX,
            top: -GUIDE_SPAN / 2,
            height: GUIDE_SPAN,
          }}
        />
      )}
      {guideY != null && (
        <div
          className="nx-alignment-guide nx-alignment-guide--h"
          style={{
            top: guideY,
            left: -GUIDE_SPAN / 2,
            width: GUIDE_SPAN,
          }}
        />
      )}
    </ViewportPortal>
  );
}
