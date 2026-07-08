import { memo, useCallback, useRef, useState } from 'react';
import { useReactFlow, Position } from '@xyflow/react';

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
const MIN_CLEARANCE = 28; // min distance crossbar from source/target

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

// ── Build Visio-style orthogonal (elbow) path ─────────────────────────────────
// Returns full path data AND the moveable segment endpoints for drag area
function buildElbow(sx, sy, sp, tx, ty, tp, offsetY, offsetX, R = 10) {
  const verticalPrimary =
    sp === Position.Bottom || sp === Position.Top || sp === 'bottom' || sp === 'top';

  if (verticalPrimary) {
    const natural = (sy + ty) / 2;
    // Clamp so crossbar never overlaps source or target node
    const minY = sy + MIN_CLEARANCE;
    const maxY = ty - MIN_CLEARANCE;
    let my = natural + offsetY;
    // Only clamp if there's room
    if (minY < maxY) {
      my = Math.max(minY, Math.min(maxY, my));
    } else {
      my = natural;
    }

    const xDist = tx - sx;
    const xDir  = xDist >= 0 ? 1 : -1;
    const y1Dir = my >= sy ? 1 : -1;
    const y2Dir = ty >= my ? 1 : -1;

    const r1 = Math.min(R, Math.abs(my - sy) * 0.45, Math.abs(xDist) * 0.45);
    const r2 = Math.min(R, Math.abs(ty - my) * 0.45, Math.abs(xDist) * 0.45);

    let d;
    if (Math.abs(xDist) < 1) {
      // Straight vertical
      d = `M ${sx} ${sy} L ${tx} ${ty}`;
    } else {
      const seg = [];
      seg.push(`M ${sx} ${sy}`);
      if (r1 > 1) { seg.push(`L ${sx} ${my - r1 * y1Dir}`); seg.push(`Q ${sx} ${my} ${sx + r1 * xDir} ${my}`); }
      else { seg.push(`L ${sx} ${my}`); }
      if (r2 > 1) { seg.push(`L ${tx - r2 * xDir} ${my}`); seg.push(`Q ${tx} ${my} ${tx} ${my + r2 * y2Dir}`); }
      else { seg.push(`L ${tx} ${my}`); }
      seg.push(`L ${tx} ${ty}`);
      d = seg.join(' ');
    }

    return {
      d,
      dragType: 'vertical-primary',
      // Middle segment: from sx to tx at y=my (for drag hit area)
      segX1: Math.min(sx, tx), segY1: my,
      segX2: Math.max(sx, tx), segY2: my,
      midX: (sx + tx) / 2, midY: my,
      arrowAngle: ty >= my ? Math.PI / 2 : -Math.PI / 2,
      arrowStartAngle: sy >= my ? Math.PI / 2 : -Math.PI / 2,
    };
  } else {
    const natural = (sx + tx) / 2;
    const minX = sx + MIN_CLEARANCE;
    const maxX = tx - MIN_CLEARANCE;
    let mx = natural + offsetX;
    if (minX < maxX) {
      mx = Math.max(minX, Math.min(maxX, mx));
    } else {
      mx = natural;
    }

    const yDist = ty - sy;
    const yDir  = yDist >= 0 ? 1 : -1;
    const x1Dir = mx >= sx ? 1 : -1;
    const x2Dir = tx >= mx ? 1 : -1;

    const r1 = Math.min(R, Math.abs(mx - sx) * 0.45, Math.abs(yDist) * 0.45);
    const r2 = Math.min(R, Math.abs(tx - mx) * 0.45, Math.abs(yDist) * 0.45);

    let d;
    if (Math.abs(yDist) < 1) {
      d = `M ${sx} ${sy} L ${tx} ${ty}`;
    } else {
      const seg = [];
      seg.push(`M ${sx} ${sy}`);
      if (r1 > 1) { seg.push(`L ${mx - r1 * x1Dir} ${sy}`); seg.push(`Q ${mx} ${sy} ${mx} ${sy + r1 * yDir}`); }
      else { seg.push(`L ${mx} ${sy}`); }
      if (r2 > 1) { seg.push(`L ${mx} ${ty - r2 * yDir}`); seg.push(`Q ${mx} ${ty} ${mx + r2 * x2Dir} ${ty}`); }
      else { seg.push(`L ${mx} ${ty}`); }
      seg.push(`L ${tx} ${ty}`);
      d = seg.join(' ');
    }

    return {
      d,
      dragType: 'horizontal-primary',
      segX1: mx, segY1: Math.min(sy, ty),
      segX2: mx, segY2: Math.max(sy, ty),
      midX: mx, midY: (sy + ty) / 2,
      arrowAngle: tx >= mx ? 0 : Math.PI,
      arrowStartAngle: sx >= mx ? 0 : Math.PI,
    };
  }
}

function buildBezier(sx, sy, tx, ty, ox, oy) {
  const cpX = (sx + tx) / 2 + ox;
  const cpY = (sy + ty) / 2 + oy;
  return {
    d: `M ${sx} ${sy} Q ${cpX} ${cpY} ${tx} ${ty}`,
    dragType: 'bezier',
    midX: cpX, midY: cpY,
    arrowAngle: Math.atan2(ty - cpY, tx - cpX),
    arrowStartAngle: Math.atan2(sy - cpY, sx - cpX),
  };
}

function buildStraight(sx, sy, tx, ty) {
  return {
    d: `M ${sx} ${sy} L ${tx} ${ty}`,
    dragType: 'straight',
    midX: (sx + tx) / 2, midY: (sy + ty) / 2,
    arrowAngle: Math.atan2(ty - sy, tx - sx),
    arrowStartAngle: Math.atan2(sy - ty, sx - tx),
  };
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

  // ── Compute path ───────────────────────────────────────────────────────────
  const path = (() => {
    switch (lineStyle) {
      case 'bezier':   return buildBezier(sourceX, sourceY, targetX, targetY, offset.x, offset.y);
      case 'straight': return buildStraight(sourceX, sourceY, targetX, targetY);
      default:         return buildElbow(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, offset.y, offset.x, cornerRadius);
    }
  })();

  const { d, dragType, midX, midY, segX1, segY1, segX2, segY2, arrowAngle, arrowStartAngle } = path;

  // ── Drag handler ───────────────────────────────────────────────────────────
  const onSegmentMouseDown = useCallback((e) => {
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

      let newOffset;
      if (dragType === 'vertical-primary') {
        newOffset = { x: 0, y: startOffset.current.y + dy };
      } else if (dragType === 'horizontal-primary') {
        newOffset = { x: startOffset.current.x + dx, y: 0 };
      } else {
        // bezier: both axes
        newOffset = { x: startOffset.current.x + dx, y: startOffset.current.y + dy };
      }

      setEdges((eds) =>
        eds.map((edge) =>
          edge.id !== id ? edge : { ...edge, data: { ...edge.data, offset: newOffset } }
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
  }, [id, offset, lineStyle, dragType, setEdges, screenToFlowPosition]);

  // Double-click segment: reset to natural center
  const onSegmentDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id !== id ? edge : { ...edge, data: { ...edge.data, offset: { x: 0, y: 0 } } }
      )
    );
  }, [id, setEdges]);

  const dashArray = animated ? '10 5' : undefined;
  const showInteractive = selected || hovered;

  // ── Determine drag cursor ─────────────────────────────────────────────────
  const dragCursor =
    lineStyle === 'straight' ? 'default' :
    dragType === 'vertical-primary' ? 'row-resize' :
    dragType === 'horizontal-primary' ? 'col-resize' : 'crosshair';

  // ── Segment hit area (wide transparent rect over middle segment) ───────────
  const segHitArea = () => {
    if (lineStyle === 'straight' || !selected) return null;
    const PAD = 10; // hit area padding around the segment

    if (dragType === 'vertical-primary' && segX1 !== undefined) {
      // Horizontal crossbar — hit rect above/below it
      const x = Math.min(segX1, segX2);
      const w = Math.abs(segX2 - segX1);
      return (
        <rect
          x={x} y={segY1 - PAD}
          width={w} height={PAD * 2}
          fill="transparent"
          style={{ cursor: dragCursor }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onMouseDown={onSegmentMouseDown}
          onDoubleClick={onSegmentDoubleClick}
        />
      );
    }

    if (dragType === 'horizontal-primary' && segX1 !== undefined) {
      // Vertical crossbar — hit rect left/right of it
      const y = Math.min(segY1, segY2);
      const h = Math.abs(segY2 - segY1);
      return (
        <rect
          x={segX1 - PAD} y={y}
          width={PAD * 2} height={h}
          fill="transparent"
          style={{ cursor: dragCursor }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onMouseDown={onSegmentMouseDown}
          onDoubleClick={onSegmentDoubleClick}
        />
      );
    }

    // Bezier — circular handle at control point
    return (
      <circle
        cx={midX} cy={midY} r={16}
        fill="transparent"
        style={{ cursor: dragCursor }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={onSegmentMouseDown}
        onDoubleClick={onSegmentDoubleClick}
      />
    );
  };

  // ── Segment highlight when hovered/selected ───────────────────────────────
  const segHighlight = () => {
    if (!selected && !hovered) return null;
    const opacity = hovered ? 0.5 : 0.25;

    if (dragType === 'vertical-primary' && segX1 !== undefined) {
      return (
        <line
          x1={segX1} y1={segY1} x2={segX2} y2={segY2}
          stroke={strokeColor}
          strokeWidth={hovered ? 8 : 4}
          strokeOpacity={opacity}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      );
    }
    if (dragType === 'horizontal-primary' && segX1 !== undefined) {
      return (
        <line
          x1={segX1} y1={segY1} x2={segX2} y2={segY2}
          stroke={strokeColor}
          strokeWidth={hovered ? 8 : 4}
          strokeOpacity={opacity}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      );
    }
    // Bezier: show a small control point dot
    return (
      <circle
        cx={midX} cy={midY} r={5}
        fill="#0f2044"
        stroke={strokeColor}
        strokeWidth={2}
        style={{ pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
      />
    );
  };

  return (
    <g>
      {/* ── Wide invisible click area ──────────────────── */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
        style={{ cursor: dragCursor }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* ── Selection glow ─────────────────────────────── */}
      {selected && (
        <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth + 8}
          strokeOpacity={0.12} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* ── Main path ──────────────────────────────────── */}
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

      {/* ── Segment highlight overlay ───────────────────── */}
      {segHighlight()}

      {/* ── Arrowheads ─────────────────────────────────── */}
      <Arrowhead type={arrowType}  tx={targetX} ty={targetY} angle={arrowAngle}      color={strokeColor} sw={strokeWidth} />
      {arrowStart !== 'none' && (
        <Arrowhead type={arrowStart} tx={sourceX} ty={sourceY} angle={arrowStartAngle} color={strokeColor} sw={strokeWidth} />
      )}

      {/* ── Label ──────────────────────────────────────── */}
      {label && (
        <foreignObject
          x={midX - 60} y={midY - 14}
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

      {/* ── Drag hit area (full segment, on top) ───────── */}
      {segHitArea()}

      {/* ── Drag hint arrow indicator (when selected, on elbow) ── */}
      {selected && dragType === 'vertical-primary' && segX1 !== undefined && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Up arrow */}
          <polygon
            points={`${midX},${segY1 - 12} ${midX - 5},${segY1 - 7} ${midX + 5},${segY1 - 7}`}
            fill={strokeColor} fillOpacity={0.6}
          />
          {/* Down arrow */}
          <polygon
            points={`${midX},${segY1 + 12} ${midX - 5},${segY1 + 7} ${midX + 5},${segY1 + 7}`}
            fill={strokeColor} fillOpacity={0.6}
          />
        </g>
      )}
      {selected && dragType === 'horizontal-primary' && segX1 !== undefined && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Left arrow */}
          <polygon
            points={`${midX - 12},${midY} ${midX - 7},${midY - 5} ${midX - 7},${midY + 5}`}
            fill={strokeColor} fillOpacity={0.6}
          />
          {/* Right arrow */}
          <polygon
            points={`${midX + 12},${midY} ${midX + 7},${midY - 5} ${midX + 7},${midY + 5}`}
            fill={strokeColor} fillOpacity={0.6}
          />
        </g>
      )}
    </g>
  );
});

CustomEdge.displayName = 'CustomEdge';
export default CustomEdge;
