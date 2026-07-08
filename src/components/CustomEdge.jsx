import { memo, useCallback, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

// ── Arrowhead options exposed for PropertiesPanel
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

// ── Draws the arrowhead at (tx, ty) pointing in direction `angle`
function Arrowhead({ type, tx, ty, angle, color, sw }) {
  const sz = Math.max(9, sw * 4);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  // Rotate point (px-tx, py-ty) by angle around origin, then offset by (tx, ty)
  const rot = (px, py) => {
    const dx = px - tx, dy = py - ty;
    return [tx + dx * cos - dy * sin, ty + dx * sin + dy * cos];
  };

  const sharedProps = { fill: color };
  const outlineProps = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinejoin: 'round' };

  switch (type) {
    case 'closed': {
      const [x1, y1] = rot(tx - sz, ty - sz * 0.4);
      const [x2, y2] = rot(tx - sz, ty + sz * 0.4);
      return <polygon points={`${tx},${ty} ${x1},${y1} ${x2},${y2}`} {...sharedProps} />;
    }
    case 'open': {
      const [x1, y1] = rot(tx - sz, ty - sz * 0.5);
      const [x2, y2] = rot(tx - sz, ty + sz * 0.5);
      return <polyline points={`${x1},${y1} ${tx},${ty} ${x2},${y2}`} {...outlineProps} strokeLinecap="round" />;
    }
    case 'circle': {
      const r = sz * 0.45;
      const [cx, cy] = rot(tx - r, ty);
      return <circle cx={cx} cy={cy} r={r} {...sharedProps} />;
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
      return <polygon points={`${tx},${ty} ${x1},${y1} ${x2},${y2} ${x3},${y3}`} {...sharedProps} />;
    }
    case 'diamond-open': {
      const [x1, y1] = rot(tx - sz * 0.5, ty - sz * 0.35);
      const [x2, y2] = rot(tx - sz, ty);
      const [x3, y3] = rot(tx - sz * 0.5, ty + sz * 0.35);
      return <polygon points={`${tx},${ty} ${x1},${y1} ${x2},${y2} ${x3},${y3}`} {...outlineProps} />;
    }
    case 'square': {
      const [x1, y1] = rot(tx - sz, ty - sz * 0.4);
      const [x2, y2] = rot(tx,      ty - sz * 0.4);
      const [x3, y3] = rot(tx,      ty + sz * 0.4);
      const [x4, y4] = rot(tx - sz, ty + sz * 0.4);
      return <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} {...sharedProps} />;
    }
    case 'double': {
      const [a1, a2] = rot(tx - sz * 0.5, ty - sz * 0.4);
      const [b1, b2] = rot(tx - sz * 0.5, ty + sz * 0.4);
      const [c1, c2] = rot(tx - sz * 0.5, ty);
      const [d1, d2] = rot(tx - sz,       ty - sz * 0.4);
      const [e1, e2] = rot(tx - sz,       ty + sz * 0.4);
      return (
        <g>
          <polygon points={`${tx},${ty} ${a1},${a2} ${b1},${b2}`} {...sharedProps} />
          <polygon points={`${c1},${c2} ${d1},${d2} ${e1},${e2}`} {...sharedProps} />
        </g>
      );
    }
    case 'chevron': {
      const [x1, y1] = rot(tx - sz,       ty - sz * 0.5);
      const [xm, ym] = rot(tx - sz * 0.4, ty);
      const [x2, y2] = rot(tx - sz,       ty + sz * 0.5);
      return <polyline points={`${x1},${y1} ${xm},${ym} ${x2},${y2}`} {...outlineProps} strokeLinecap="round" strokeWidth={sw + 1} />;
    }
    case 'none':
    default:
      return null;
  }
}

// ── Compute quadratic bezier path and tangent angle at target
function computeEdge(sourceX, sourceY, targetX, targetY, waypoint) {
  const cpX = (sourceX + targetX) / 2 + (waypoint?.x || 0);
  const cpY = (sourceY + targetY) / 2 + (waypoint?.y || 0);
  const pathD = `M ${sourceX} ${sourceY} Q ${cpX} ${cpY} ${targetX} ${targetY}`;
  // Tangent at t=1 for quadratic bezier: direction from CP to target
  const angle = Math.atan2(targetY - cpY, targetX - cpX);
  // Label position: midpoint on curve at t=0.5
  const labelX = 0.25 * sourceX + 0.5 * cpX + 0.25 * targetX;
  const labelY = 0.25 * sourceY + 0.5 * cpY + 0.25 * targetY;
  return { pathD, cpX, cpY, angle, labelX, labelY };
}

// ── Main CustomEdge component
const CustomEdge = memo(({
  id,
  sourceX, sourceY,
  targetX, targetY,
  data = {},
  selected,
}) => {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const isDraggingRef = useRef(false);
  const startFlowRef = useRef({ x: 0, y: 0 });
  const waypointStartRef = useRef({ x: 0, y: 0 });

  const waypoint   = data.waypoint     || { x: 0, y: 0 };
  const strokeColor = data.strokeColor || '#4b8fd4';
  const strokeWidth = data.strokeWidth || 2;
  const arrowType  = data.arrowType    || 'closed';
  const arrowStart = data.arrowStart   || 'none';
  const animated   = data.animated     || false;
  const label      = data.label        || '';

  const { pathD, cpX, cpY, angle, labelX, labelY } =
    computeEdge(sourceX, sourceY, targetX, targetY, waypoint);

  // Source tangent angle (reversed) for start arrowhead
  const angleStart = Math.atan2(sourceY - cpY, sourceX - cpX);

  const onWaypointMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingRef.current = true;
    startFlowRef.current = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    waypointStartRef.current = { ...waypoint };

    const onMouseMove = (ev) => {
      if (!isDraggingRef.current) return;
      const cur = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const dx = cur.x - startFlowRef.current.x;
      const dy = cur.y - startFlowRef.current.y;
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id !== id ? edge : {
            ...edge,
            data: {
              ...edge.data,
              waypoint: {
                x: waypointStartRef.current.x + dx,
                y: waypointStartRef.current.y + dy,
              },
            },
          }
        )
      );
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, waypoint, setEdges, screenToFlowPosition]);

  const dashArray = animated ? '10 5' : undefined;
  const glowFilter = selected ? `drop-shadow(0 0 5px ${strokeColor}99)` : undefined;

  return (
    <g>
      {/* ── Wide invisible hit area ─────────────────────────── */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={24}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer' }}
      />

      {/* ── Selection glow ──────────────────────────────────── */}
      {selected && (
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 6}
          strokeOpacity={0.25}
          strokeLinecap="round"
        />
      )}

      {/* ── Main path ───────────────────────────────────────── */}
      <path
        id={id}
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
        style={{ filter: glowFilter }}
        className="react-flow__edge-path"
      />

      {/* ── End arrowhead ───────────────────────────────────── */}
      <Arrowhead type={arrowType} tx={targetX} ty={targetY} angle={angle} color={strokeColor} sw={strokeWidth} />

      {/* ── Start arrowhead (optional) ──────────────────────── */}
      {arrowStart !== 'none' && (
        <Arrowhead type={arrowStart} tx={sourceX} ty={sourceY} angle={angleStart} color={strokeColor} sw={strokeWidth} />
      )}

      {/* ── Edge label ──────────────────────────────────────── */}
      {label && (
        <foreignObject
          x={labelX - 60}
          y={labelY - 14}
          width={120}
          height={28}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              background: 'rgba(10, 18, 40, 0.92)',
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

      {/* ── Waypoint handle (only when selected) ────────────── */}
      {selected && (
        <g
          onMouseDown={onWaypointMouseDown}
          style={{ cursor: 'crosshair' }}
        >
          <circle
            cx={cpX}
            cy={cpY}
            r={10}
            fill="transparent"
          />
          <circle
            cx={cpX}
            cy={cpY}
            r={6}
            fill="#0f2044"
            stroke={strokeColor}
            strokeWidth={2.5}
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))' }}
          />
          {/* Cross-hair lines */}
          <line x1={cpX - 10} y1={cpY} x2={cpX - 7} y2={cpY} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={cpX + 7} y1={cpY} x2={cpX + 10} y2={cpY} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={cpX} y1={cpY - 10} x2={cpX} y2={cpY - 7} stroke={strokeColor} strokeWidth={1.5} />
          <line x1={cpX} y1={cpY + 7} x2={cpX} y2={cpY + 10} stroke={strokeColor} strokeWidth={1.5} />
        </g>
      )}
    </g>
  );
});

CustomEdge.displayName = 'CustomEdge';
export default CustomEdge;
