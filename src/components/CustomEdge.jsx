import { memo, useCallback, useRef, useState } from 'react';
import { useReactFlow, Position } from '@xyflow/react';

// ── Arrowhead options exposed for PropertiesPanel ─────────────────────────────
export const ARROWHEAD_OPTIONS = [
  { id: 'closed',       label: 'Arrow',        preview: '▶' },
  { id: 'open',         label: 'Open Arrow',   preview: '▷' },
  { id: 'circle',       label: 'Dot',          preview: '●' },
  { id: 'ring',         label: 'Ring',         preview: '○' },
  { id: 'diamond',      label: 'Diamond',      preview: '◆' },
  { id: 'diamond-open', label: 'Open Diamond', preview: '◇' },
  { id: 'square',       label: 'Square',       preview: '■' },
  { id: 'double',       label: 'Double',       preview: '»' },
  { id: 'chevron',      label: 'Chevron',      preview: '›' },
  { id: 'none',         label: 'None',         preview: '—' },
];

// ── Draw an arrowhead at (tx, ty) pointing in direction `angle` ───────────────
function Arrowhead({ type, tx, ty, angle, color, sw }) {
  if (type === 'none') return null;
  const sz = Math.max(9, sw * 4);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rot = (px, py) => {
    const dx = px - tx, dy = py - ty;
    return [tx + dx * cos - dy * sin, ty + dx * sin + dy * cos];
  };
  const fill = { fill: color };
  const stroke = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinejoin: 'round' };
  switch (type) {
    case 'closed': {
      const [x1, y1] = rot(tx - sz, ty - sz * 0.4);
      const [x2, y2] = rot(tx - sz, ty + sz * 0.4);
      return <polygon points={`${tx},${ty} ${x1},${y1} ${x2},${y2}`} {...fill} />;
    }
    case 'open': {
      const [x1, y1] = rot(tx - sz, ty - sz * 0.5);
      const [x2, y2] = rot(tx - sz, ty + sz * 0.5);
      return <polyline points={`${x1},${y1} ${tx},${ty} ${x2},${y2}`} {...stroke} strokeLinecap="round" />;
    }
    case 'circle': {
      const r = sz * 0.45;
      const [cx, cy] = rot(tx - r, ty);
      return <circle cx={cx} cy={cy} r={r} {...fill} />;
    }
    case 'ring': {
      const r = sz * 0.45;
      const [cx, cy] = rot(tx - r, ty);
      return <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw} />;
    }
    case 'diamond': {
      const [x1, y1] = rot(tx - sz * 0.5, ty - sz * 0.35);
      const [x2, y2] = rot(tx - sz, ty);
      const [x3, y3] = rot(tx - sz * 0.5, ty + sz * 0.35);
      return <polygon points={`${tx},${ty} ${x1},${y1} ${x2},${y2} ${x3},${y3}`} {...fill} />;
    }
    case 'diamond-open': {
      const [x1, y1] = rot(tx - sz * 0.5, ty - sz * 0.35);
      const [x2, y2] = rot(tx - sz, ty);
      const [x3, y3] = rot(tx - sz * 0.5, ty + sz * 0.35);
      return <polygon points={`${tx},${ty} ${x1},${y1} ${x2},${y2} ${x3},${y3}`} {...stroke} />;
    }
    case 'square': {
      const [x1, y1] = rot(tx - sz, ty - sz * 0.4);
      const [x2, y2] = rot(tx,      ty - sz * 0.4);
      const [x3, y3] = rot(tx,      ty + sz * 0.4);
      const [x4, y4] = rot(tx - sz, ty + sz * 0.4);
      return <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} {...fill} />;
    }
    case 'double': {
      const [a1, a2] = rot(tx - sz * 0.5, ty - sz * 0.4);
      const [b1, b2] = rot(tx - sz * 0.5, ty + sz * 0.4);
      const [c1, c2] = rot(tx - sz * 0.5, ty);
      const [d1, d2] = rot(tx - sz,       ty - sz * 0.4);
      const [e1, e2] = rot(tx - sz,       ty + sz * 0.4);
      return (
        <g>
          <polygon points={`${tx},${ty} ${a1},${a2} ${b1},${b2}`} {...fill} />
          <polygon points={`${c1},${c2} ${d1},${d2} ${e1},${e2}`} {...fill} />
        </g>
      );
    }
    case 'chevron': {
      const [x1, y1] = rot(tx - sz,       ty - sz * 0.5);
      const [xm, ym] = rot(tx - sz * 0.4, ty);
      const [x2, y2] = rot(tx - sz,       ty + sz * 0.5);
      return <polyline points={`${x1},${y1} ${xm},${ym} ${x2},${y2}`} {...stroke} strokeLinecap="round" strokeWidth={sw + 1} />;
    }
    default: return null;
  }
}

// ── Build a Visio-style orthogonal path (3 segments, rounded corners) ─────────
// Returns { d: svgPathString, handleX, handleY, arrowAngle }
function buildElbowPath(sx, sy, sp, tx, ty, tp, offset, R = 10) {
  // Determine routing axis from source position
  const verticalPrimary =
    sp === Position.Bottom || sp === Position.Top ||
    sp === 'bottom' || sp === 'top';

  if (verticalPrimary) {
    // 3-segment: |vertical| → horizontal → |vertical|
    // mid_y is the y-level of the horizontal crossbar
    const rawMidY = (sy + ty) / 2;
    const my = rawMidY + (offset?.y || 0);

    const xDist = tx - sx;
    const xDir  = xDist >= 0 ? 1 : -1;
    const y1Dir = my >= sy ? 1 : -1; // source to crossbar
    const y2Dir = ty >= my ? 1 : -1; // crossbar to target

    // Corner radii clamped so they don't exceed half the segment lengths
    const r1 = Math.min(R, Math.abs(my - sy) * 0.9, Math.abs(xDist) * 0.45);
    const r2 = Math.min(R, Math.abs(ty - my) * 0.9, Math.abs(xDist) * 0.45);

    let d;
    if (Math.abs(xDist) < 2) {
      // Straight vertical (source directly above/below target)
      d = `M ${sx} ${sy} L ${tx} ${ty}`;
    } else if (r1 < 1 || r2 < 1) {
      // No room for rounding
      d = `M ${sx} ${sy} L ${sx} ${my} L ${tx} ${my} L ${tx} ${ty}`;
    } else {
      d = [
        `M ${sx} ${sy}`,
        `L ${sx} ${my - r1 * y1Dir}`,
        `Q ${sx} ${my} ${sx + r1 * xDir} ${my}`,
        `L ${tx - r2 * xDir} ${my}`,
        `Q ${tx} ${my} ${tx} ${my + r2 * y2Dir}`,
        `L ${tx} ${ty}`,
      ].join(' ');
    }

    return {
      d,
      // Handle at midpoint of the horizontal crossbar
      handleX: (sx + tx) / 2,
      handleY: my,
      // Dragging this handle moves it vertically
      dragAxis: 'y',
      // Arrow points straight down or up (last segment direction)
      arrowAngle: ty >= my ? Math.PI / 2 : -Math.PI / 2,
      arrowStartAngle: sy >= my ? Math.PI / 2 : -Math.PI / 2,
    };
  } else {
    // 3-segment: horizontal → |vertical| → horizontal
    const rawMidX = (sx + tx) / 2;
    const mx = rawMidX + (offset?.x || 0);

    const yDist = ty - sy;
    const yDir  = yDist >= 0 ? 1 : -1;
    const x1Dir = mx >= sx ? 1 : -1;
    const x2Dir = tx >= mx ? 1 : -1;

    const r1 = Math.min(R, Math.abs(mx - sx) * 0.9, Math.abs(yDist) * 0.45);
    const r2 = Math.min(R, Math.abs(tx - mx) * 0.9, Math.abs(yDist) * 0.45);

    let d;
    if (Math.abs(yDist) < 2) {
      d = `M ${sx} ${sy} L ${tx} ${ty}`;
    } else if (r1 < 1 || r2 < 1) {
      d = `M ${sx} ${sy} L ${mx} ${sy} L ${mx} ${ty} L ${tx} ${ty}`;
    } else {
      d = [
        `M ${sx} ${sy}`,
        `L ${mx - r1 * x1Dir} ${sy}`,
        `Q ${mx} ${sy} ${mx} ${sy + r1 * yDir}`,
        `L ${mx} ${ty - r2 * yDir}`,
        `Q ${mx} ${ty} ${mx + r2 * x2Dir} ${ty}`,
        `L ${tx} ${ty}`,
      ].join(' ');
    }

    return {
      d,
      handleX: mx,
      handleY: (sy + ty) / 2,
      dragAxis: 'x',
      arrowAngle: tx >= mx ? 0 : Math.PI,
      arrowStartAngle: sx >= mx ? 0 : Math.PI,
    };
  }
}

// ── Build a smooth bezier path (with drag control point) ─────────────────────
function buildBezierPath(sx, sy, tx, ty, offset) {
  const cpX = (sx + tx) / 2 + (offset?.x || 0);
  const cpY = (sy + ty) / 2 + (offset?.y || 0);
  return {
    d: `M ${sx} ${sy} Q ${cpX} ${cpY} ${tx} ${ty}`,
    handleX: cpX,
    handleY: cpY,
    dragAxis: 'both',
    arrowAngle: Math.atan2(ty - cpY, tx - cpX),
    arrowStartAngle: Math.atan2(sy - cpY, sx - cpX),
  };
}

// ── Build a straight line ─────────────────────────────────────────────────────
function buildStraightPath(sx, sy, tx, ty) {
  return {
    d: `M ${sx} ${sy} L ${tx} ${ty}`,
    handleX: (sx + tx) / 2,
    handleY: (sy + ty) / 2,
    dragAxis: 'none',
    arrowAngle: Math.atan2(ty - sy, tx - sx),
    arrowStartAngle: Math.atan2(sy - ty, sx - tx),
  };
}

// ── Main CustomEdge ───────────────────────────────────────────────────────────
const CustomEdge = memo(({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data = {},
  selected,
}) => {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const isDraggingRef = useRef(false);
  const startFlowRef  = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });

  const strokeColor = data.strokeColor || '#4b8fd4';
  const strokeWidth = data.strokeWidth || 2;
  const arrowType   = data.arrowType   || 'closed';
  const arrowStart  = data.arrowStart  || 'none';
  const animated    = data.animated    || false;
  const label       = data.label       || '';
  const lineStyle   = data.lineStyle   || 'elbow'; // 'elbow' | 'bezier' | 'straight'
  const offset      = data.offset      || { x: 0, y: 0 };
  const cornerRadius = data.cornerRadius ?? 10;

  // ── Compute path based on style ──────────────────────────────
  const pathData = (() => {
    switch (lineStyle) {
      case 'bezier':
        return buildBezierPath(sourceX, sourceY, targetX, targetY, offset);
      case 'straight':
        return buildStraightPath(sourceX, sourceY, targetX, targetY);
      case 'elbow':
      default:
        return buildElbowPath(
          sourceX, sourceY, sourcePosition,
          targetX, targetY, targetPosition,
          offset, cornerRadius
        );
    }
  })();

  const { d, handleX, handleY, dragAxis, arrowAngle, arrowStartAngle } = pathData;

  // ── Drag the midpoint handle ─────────────────────────────────
  const onHandleMouseDown = useCallback((e) => {
    if (dragAxis === 'none') return;
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    startFlowRef.current = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    offsetStartRef.current = { ...offset };

    const onMove = (ev) => {
      if (!isDraggingRef.current) return;
      const cur = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const dx = cur.x - startFlowRef.current.x;
      const dy = cur.y - startFlowRef.current.y;
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id !== id) return edge;
          const newOffset = {
            x: dragAxis === 'y' ? 0 : offsetStartRef.current.x + dx,
            y: dragAxis === 'x' ? 0 : offsetStartRef.current.y + dy,
          };
          return { ...edge, data: { ...edge.data, offset: newOffset } };
        })
      );
    };

    const onUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [id, offset, dragAxis, setEdges, screenToFlowPosition]);

  const dashArray = animated ? '10 5' : undefined;

  return (
    <g>
      {/* ── Wide invisible click area ─── */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer' }}
      />

      {/* ── Glow when selected ─────────── */}
      {selected && (
        <path
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 6}
          strokeOpacity={0.18}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* ── Main path ──────────────────── */}
      <path
        id={id}
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="react-flow__edge-path"
      />

      {/* ── Arrowheads ─────────────────── */}
      <Arrowhead type={arrowType} tx={targetX} ty={targetY} angle={arrowAngle} color={strokeColor} sw={strokeWidth} />
      {arrowStart !== 'none' && (
        <Arrowhead type={arrowStart} tx={sourceX} ty={sourceY} angle={arrowStartAngle} color={strokeColor} sw={strokeWidth} />
      )}

      {/* ── Label ──────────────────────── */}
      {label && (
        <foreignObject
          x={handleX - 60}
          y={handleY - 14}
          width={120}
          height={28}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              background: 'rgba(10,18,40,0.92)',
              color: strokeColor,
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 5,
              border: `1px solid ${strokeColor}50`,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              backdropFilter: 'blur(4px)',
              letterSpacing: 0.4,
            }}
          >
            {label}
          </div>
        </foreignObject>
      )}

      {/* ── Drag handle (visible on select) ── */}
      {selected && dragAxis !== 'none' && (
        <g onMouseDown={onHandleMouseDown} style={{ cursor: dragAxis === 'y' ? 'row-resize' : dragAxis === 'x' ? 'col-resize' : 'crosshair' }}>
          {/* Larger invisible hit target */}
          <circle cx={handleX} cy={handleY} r={14} fill="transparent" />
          {/* Visual handle */}
          <circle
            cx={handleX}
            cy={handleY}
            r={6}
            fill="#0f2044"
            stroke={strokeColor}
            strokeWidth={2.5}
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}
          />
          {/* Directional arrows on the handle */}
          {dragAxis === 'y' && (
            <>
              <polygon points={`${handleX},${handleY - 10} ${handleX - 4},${handleY - 6} ${handleX + 4},${handleY - 6}`} fill={strokeColor} />
              <polygon points={`${handleX},${handleY + 10} ${handleX - 4},${handleY + 6} ${handleX + 4},${handleY + 6}`} fill={strokeColor} />
            </>
          )}
          {dragAxis === 'x' && (
            <>
              <polygon points={`${handleX - 10},${handleY} ${handleX - 6},${handleY - 4} ${handleX - 6},${handleY + 4}`} fill={strokeColor} />
              <polygon points={`${handleX + 10},${handleY} ${handleX + 6},${handleY - 4} ${handleX + 6},${handleY + 4}`} fill={strokeColor} />
            </>
          )}
          {dragAxis === 'both' && (
            <>
              <line x1={handleX - 9} y1={handleY} x2={handleX - 6} y2={handleY} stroke={strokeColor} strokeWidth={1.5} />
              <line x1={handleX + 6} y1={handleY} x2={handleX + 9} y2={handleY} stroke={strokeColor} strokeWidth={1.5} />
              <line x1={handleX} y1={handleY - 9} x2={handleX} y2={handleY - 6} stroke={strokeColor} strokeWidth={1.5} />
              <line x1={handleX} y1={handleY + 6} x2={handleX} y2={handleY + 9} stroke={strokeColor} strokeWidth={1.5} />
            </>
          )}
        </g>
      )}
    </g>
  );
});

CustomEdge.displayName = 'CustomEdge';
export default CustomEdge;
