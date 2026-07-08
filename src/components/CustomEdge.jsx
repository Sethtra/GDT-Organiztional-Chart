import { memo, useCallback, useRef, useState } from 'react';
import { useReactFlow, Position, getSmoothStepPath, getBezierPath, getStraightPath } from '@xyflow/react';

// ── Arrowhead options ─────────────────────────────────────────────────────────
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

const SNAP_GRID = 15; // px to snap to when Shift is held

// ── Arrowhead renderer ────────────────────────────────────────────────────────
function Arrowhead({ type, tx, ty, angle, color, sw }) {
  if (type === 'none') return null;
  const sz = Math.max(9, sw * 4);
  const c = Math.cos(angle), s = Math.sin(angle);
  const r = (px, py) => {
    const dx = px - tx, dy = py - ty;
    return [tx + dx * c - dy * s, ty + dx * s + dy * c];
  };
  const F = { fill: color };
  const O = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinejoin: 'round', strokeLinecap: 'round' };
  switch (type) {
    case 'closed': { const [x1,y1]=r(tx-sz,ty-sz*.4); const [x2,y2]=r(tx-sz,ty+sz*.4); return <polygon points={`${tx},${ty} ${x1},${y1} ${x2},${y2}`} {...F}/>; }
    case 'open':   { const [x1,y1]=r(tx-sz,ty-sz*.5); const [x2,y2]=r(tx-sz,ty+sz*.5); return <polyline points={`${x1},${y1} ${tx},${ty} ${x2},${y2}`} {...O}/>; }
    case 'circle': { const rv=sz*.45; const [cx,cy]=r(tx-rv,ty); return <circle cx={cx} cy={cy} r={rv} {...F}/>; }
    case 'ring':   { const rv=sz*.45; const [cx,cy]=r(tx-rv,ty); return <circle cx={cx} cy={cy} r={rv} fill="none" stroke={color} strokeWidth={sw}/>; }
    case 'diamond':      { const [x1,y1]=r(tx-sz*.5,ty-sz*.35); const [x2,y2]=r(tx-sz,ty); const [x3,y3]=r(tx-sz*.5,ty+sz*.35); return <polygon points={`${tx},${ty} ${x1},${y1} ${x2},${y2} ${x3},${y3}`} {...F}/>; }
    case 'diamond-open': { const [x1,y1]=r(tx-sz*.5,ty-sz*.35); const [x2,y2]=r(tx-sz,ty); const [x3,y3]=r(tx-sz*.5,ty+sz*.35); return <polygon points={`${tx},${ty} ${x1},${y1} ${x2},${y2} ${x3},${y3}`} {...O}/>; }
    case 'square': { const [x1,y1]=r(tx-sz,ty-sz*.4); const [x2,y2]=r(tx,ty-sz*.4); const [x3,y3]=r(tx,ty+sz*.4); const [x4,y4]=r(tx-sz,ty+sz*.4); return <polygon points={`${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`} {...F}/>; }
    case 'double': { const [a1,a2]=r(tx-sz*.5,ty-sz*.4); const [b1,b2]=r(tx-sz*.5,ty+sz*.4); const [c1,c2]=r(tx-sz*.5,ty); const [d1,d2]=r(tx-sz,ty-sz*.4); const [e1,e2]=r(tx-sz,ty+sz*.4); return <g><polygon points={`${tx},${ty} ${a1},${a2} ${b1},${b2}`} {...F}/><polygon points={`${c1},${c2} ${d1},${d2} ${e1},${e2}`} {...F}/></g>; }
    case 'chevron': { const [x1,y1]=r(tx-sz,ty-sz*.5); const [xm,ym]=r(tx-sz*.4,ty); const [x2,y2]=r(tx-sz,ty+sz*.5); return <polyline points={`${x1},${y1} ${xm},${ym} ${x2},${y2}`} {...O} strokeWidth={sw+1}/>; }
    default: return null;
  }
}

// Helper to determine arrow angle based purely on handle position
function getAngleFromPosition(pos, isTarget) {
  switch (pos) {
    case Position.Top:    return isTarget ? Math.PI / 2 : -Math.PI / 2; // points DOWN at target, UP at source
    case Position.Bottom: return isTarget ? -Math.PI / 2 : Math.PI / 2; // points UP at target, DOWN at source
    case Position.Left:   return isTarget ? 0 : Math.PI;               // points RIGHT at target, LEFT at source
    case Position.Right:  return isTarget ? Math.PI : 0;               // points LEFT at target, RIGHT at source
    default: return 0;
  }
}

// ── Main edge component ───────────────────────────────────────────────────────
const CustomEdge = memo(({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data = {},
  selected,
}) => {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const isDragging  = useRef(false);
  const startFlow   = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const strokeColor  = data.strokeColor  || '#4b8fd4';
  const strokeWidth  = data.strokeWidth  || 2;
  const arrowType    = data.arrowType    || 'closed';
  const arrowStart   = data.arrowStart   || 'none';
  const animated     = data.animated     || false;
  const label        = data.label        || '';
  const lineStyle    = data.lineStyle    || 'elbow';
  const cornerRadius = data.cornerRadius ?? 10;
  const offset       = data.offset       || { x: 0, y: 0 };

  // ── Compute path using standard XYFlow routers ──────────────────────────────
  let d, labelX, labelY, arrowAngle, arrowStartAngle;

  if (lineStyle === 'straight') {
    [d, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    arrowAngle = Math.atan2(targetY - sourceY, targetX - sourceX);
    arrowStartAngle = Math.atan2(sourceY - targetY, sourceX - targetX);
  } else if (lineStyle === 'bezier') {
    // Custom bezier with drag control point
    labelX = (sourceX + targetX) / 2 + offset.x;
    labelY = (sourceY + targetY) / 2 + offset.y;
    d = `M ${sourceX} ${sourceY} Q ${labelX} ${labelY} ${targetX} ${targetY}`;
    arrowAngle = Math.atan2(targetY - labelY, targetX - labelX);
    arrowStartAngle = Math.atan2(sourceY - labelY, sourceX - labelX);
  } else {
    // Elbow (SmoothStep) using standard router but injecting centerX/centerY
    const defaultCenterX = (sourceX + targetX) / 2;
    const defaultCenterY = (sourceY + targetY) / 2;
    [d, labelX, labelY] = getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      borderRadius: cornerRadius,
      centerX: defaultCenterX + offset.x,
      centerY: defaultCenterY + offset.y,
    });
    // Orthogonal arrows strictly follow handle positions
    arrowAngle = getAngleFromPosition(targetPosition, true);
    arrowStartAngle = getAngleFromPosition(sourcePosition, false);
  }

  // ── Drag handler applied to the whole path ──────────────────────────────────
  const onEdgeMouseDown = useCallback((e) => {
    if (lineStyle === 'straight') return;
    e.stopPropagation();
    e.preventDefault();
    isDragging.current = true;
    startFlow.current = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    startOffset.current = { ...offset };

    const onMove = (ev) => {
      if (!isDragging.current) return;
      const cur = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      let dx = cur.x - startFlow.current.x;
      let dy = cur.y - startFlow.current.y;

      // Shift = snap to grid
      if (ev.shiftKey) {
        dx = Math.round((startOffset.current.x + dx) / SNAP_GRID) * SNAP_GRID - startOffset.current.x;
        dy = Math.round((startOffset.current.y + dy) / SNAP_GRID) * SNAP_GRID - startOffset.current.y;
      }

      setEdges((eds) =>
        eds.map((edge) =>
          edge.id !== id ? edge : { 
            ...edge, 
            data: { 
              ...edge.data, 
              offset: { 
                x: startOffset.current.x + dx, 
                y: startOffset.current.y + dy 
              } 
            } 
          }
        )
      );
    };

    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [id, offset, lineStyle, setEdges, screenToFlowPosition]);

  const onEdgeDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setEdges((eds) => eds.map((edge) => edge.id !== id ? edge : { ...edge, data: { ...edge.data, offset: { x: 0, y: 0 } } }));
  }, [id, setEdges]);

  const dashArray = animated ? '10 5' : undefined;
  const showInteractive = selected || hovered;
  const dragCursor = lineStyle === 'straight' ? 'default' : 'move';

  return (
    <g>
      {/* ── Wide invisible click area spanning the whole edge ────────────────── */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        className="react-flow__edge-interaction"
        style={{ cursor: dragCursor }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={onEdgeMouseDown}
        onDoubleClick={onEdgeDoubleClick}
      />

      {/* ── Selection glow spanning the whole edge ───────────────────────────── */}
      {showInteractive && (
        <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth + 8}
          strokeOpacity={hovered && !selected ? 0.3 : 0.15} strokeLinecap="round" strokeLinejoin="round" 
          style={{ pointerEvents: 'none' }} />
      )}

      {/* ── Main path ────────────────────────────────────────────────────────── */}
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
        style={{ pointerEvents: 'none' }}
      />

      {/* ── Arrowheads ───────────────────────────────────────────────────────── */}
      <Arrowhead type={arrowType}  tx={targetX} ty={targetY} angle={arrowAngle}      color={strokeColor} sw={strokeWidth} />
      {arrowStart !== 'none' && (
        <Arrowhead type={arrowStart} tx={sourceX} ty={sourceY} angle={arrowStartAngle} color={strokeColor} sw={strokeWidth} />
      )}

      {/* ── Label ────────────────────────────────────────────────────────────── */}
      {label && (
        <foreignObject
          x={labelX - 60} y={labelY - 14}
          width={120} height={28}
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div xmlns="http://www.w3.org/1999/xhtml" style={{
            background: 'rgba(10,18,40,0.92)', color: strokeColor,
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 5,
            border: `1px solid ${strokeColor}50`, whiteSpace: 'nowrap',
            textAlign: 'center', backdropFilter: 'blur(4px)', letterSpacing: 0.4,
          }}>
            {label}
          </div>
        </foreignObject>
      )}

      {/* ── Drag hint indicator at center (when selected) ────────────────────── */}
      {selected && lineStyle !== 'straight' && (
        <circle
          cx={labelX} cy={labelY} r={5}
          fill="#0f2044" stroke={strokeColor} strokeWidth={2}
          style={{ pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
        />
      )}
    </g>
  );
});

CustomEdge.displayName = 'CustomEdge';
export default CustomEdge;
