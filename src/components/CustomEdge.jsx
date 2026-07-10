import { memo, useCallback, useRef, useState } from 'react';
import { useReactFlow, Position, getStraightPath, EdgeLabelRenderer } from '@xyflow/react';

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

// ── Build SVG path from an array of {x,y} points with rounded corners ─────────
function buildPathFromPts(pts, R = 10) {
  if (pts.length < 2) return { d: 'M 0 0', labelX: 0, labelY: 0, arrowAngle: 0, arrowStartAngle: 0 };

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const r = Math.min(R, d01 / 2.1, d12 / 2.1);
    if (r < 1) {
      d += ` L ${p1.x} ${p1.y}`;
    } else {
      const psx = p1.x + ((p0.x - p1.x) / d01) * r;
      const psy = p1.y + ((p0.y - p1.y) / d01) * r;
      const pex = p1.x + ((p2.x - p1.x) / d12) * r;
      const pey = p1.y + ((p2.y - p1.y) / d12) * r;
      d += ` L ${psx} ${psy} Q ${p1.x} ${p1.y} ${pex} ${pey}`;
    }
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;

  const midIdx = Math.floor((pts.length - 1) / 2);
  const labelX = (pts[midIdx].x + pts[midIdx + 1].x) / 2;
  const labelY = (pts[midIdx].y + pts[midIdx + 1].y) / 2;
  const prev = pts[pts.length - 2];
  const arrowAngle = Math.atan2(last.y - prev.y, last.x - prev.x);
  const arrowStartAngle = Math.atan2(pts[0].y - pts[1].y, pts[0].x - pts[1].x);

  return { d, labelX, labelY, arrowAngle, arrowStartAngle };
}

// ── Robust Orthogonal Router ──────────────────────────────────────────────────
// Returns { d, labelX, labelY, arrowAngle, arrowStartAngle, pts }
// pts is exposed so ControlHandles can compute segment handles on the auto-routed path
function buildRobustElbow(sx, sy, sp, tx, ty, tp, R = 10) {
  const getDir = (p) => {
    if (p === 'top' || p === Position.Top) return [0, -1];
    if (p === 'bottom' || p === Position.Bottom) return [0, 1];
    if (p === 'left' || p === Position.Left) return [-1, 0];
    if (p === 'right' || p === Position.Right) return [1, 0];
    return [0, 0];
  };
  const [sdx, sdy] = getDir(sp);
  const [tdx, tdy] = getDir(tp);
  const CLEAR = 20;
  const s1x = sx + sdx * CLEAR, s1y = sy + sdy * CLEAR;
  const t1x = tx + tdx * CLEAR, t1y = ty + tdy * CLEAR;
  const isSourceV = sdy !== 0, isTargetV = tdy !== 0;

  let crossbarType = 'horizontal';
  if (isSourceV && isTargetV) crossbarType = 'horizontal';
  else if (!isSourceV && !isTargetV) crossbarType = 'vertical';
  else crossbarType = Math.abs(s1x - t1x) > Math.abs(s1y - t1y) ? 'vertical' : 'horizontal';

  const rawPts = [[sx, sy]];
  if (crossbarType === 'vertical') {
    const mx = (s1x + t1x) / 2;
    rawPts.push([s1x, s1y], [mx, s1y], [mx, t1y], [t1x, t1y]);
  } else {
    const my = (s1y + t1y) / 2;
    rawPts.push([s1x, s1y], [s1x, my], [t1x, my], [t1x, t1y]);
  }
  rawPts.push([tx, ty]);

  // Clean collinear points and duplicates
  const clean = [rawPts[0]];
  for (let i = 1; i < rawPts.length; i++) {
    const curr = rawPts[i], prev = clean[clean.length - 1];
    if (Math.abs(prev[0] - curr[0]) < 1 && Math.abs(prev[1] - curr[1]) < 1) continue;
    if (clean.length >= 2) {
      const p1 = clean[clean.length - 2], p2 = clean[clean.length - 1];
      const isX = Math.abs(p1[0] - p2[0]) < 1 && Math.abs(p2[0] - curr[0]) < 1;
      const isY = Math.abs(p1[1] - p2[1]) < 1 && Math.abs(p2[1] - curr[1]) < 1;
      if (isX || isY) clean.pop();
    }
    clean.push(curr);
  }

  const pts = clean.map(([x, y]) => ({ x, y }));
  return { ...buildPathFromPts(pts, R), pts };
}

// ── Polyline waypoint control handles ───────────────────────────────────────────
// Shows real handles at user waypoints and ghost handles at midpoints.
const ControlHandles = memo(({ id, pts, setEdges, screenToFlowPosition, strokeColor }) => {
  const dragging = useRef(null);

  const onMouseDown = useCallback((e, type, index) => {
    // type is 'real' or 'ghost'
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const startFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    // Snapshot interior points
    const startPts = pts.slice(1, pts.length - 1).map(p => ({ ...p }));
    
    let activeIdx = index;
    if (type === 'ghost') {
      const p0 = pts[index];
      const p1 = pts[index + 1];
      startPts.splice(index, 0, { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 });
      activeIdx = index;
    }

    dragging.current = { activeIdx, startFlow, startPts };

    const onMove = (ev) => {
      if (!dragging.current) return;
      const { activeIdx, startFlow, startPts } = dragging.current;
      const cur = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      
      const newPts = startPts.map(p => ({ ...p }));
      newPts[activeIdx] = {
        x: startPts[activeIdx].x + (cur.x - startFlow.x),
        y: startPts[activeIdx].y + (cur.y - startFlow.y)
      };

      setEdges(eds => eds.map(edge =>
        edge.id !== id ? edge : { ...edge, data: { ...edge.data, points: newPts } }
      ));
    };

    const onUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    // If ghost, trigger immediate state update so the new point renders
    if (type === 'ghost') {
      setEdges(eds => eds.map(edge =>
        edge.id !== id ? edge : { ...edge, data: { ...edge.data, points: startPts } }
      ));
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [id, pts, setEdges, screenToFlowPosition]);

  const onDoubleClick = useCallback((e, index) => {
    e.stopPropagation();
    const currentPts = pts.slice(1, pts.length - 1).map(p => ({ ...p }));
    currentPts.splice(index, 1);
    setEdges(eds => eds.map(edge =>
      edge.id !== id ? edge : { ...edge, data: { ...edge.data, points: currentPts } }
    ));
  }, [id, pts, setEdges]);

  const realHandles = [];
  for (let i = 1; i < pts.length - 1; i++) {
    realHandles.push({ x: pts[i].x, y: pts[i].y, index: i - 1 });
  }

  const ghostHandles = [];
  for (let i = 0; i < pts.length - 1; i++) {
    ghostHandles.push({
      x: (pts[i].x + pts[i + 1].x) / 2,
      y: (pts[i].y + pts[i + 1].y) / 2,
      index: i
    });
  }

  return (
    <EdgeLabelRenderer>
      {ghostHandles.map((h, i) => (
        <div
          key={`g-${i}`}
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${h.x}px, ${h.y}px)`,
            pointerEvents: 'all',
            cursor: 'grab',
            zIndex: 10,
          }}
          onMouseDown={(e) => onMouseDown(e, 'ghost', h.index)}
          title="Drag to add waypoint"
        >
          <div style={{
            width: 12, height: 12, borderRadius: '50%',
            background: `${strokeColor}40`, border: `1px solid ${strokeColor}80`,
            backdropFilter: 'blur(2px)'
          }} />
        </div>
      ))}
      {realHandles.map((h, i) => (
        <div
          key={`r-${i}`}
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${h.x}px, ${h.y}px)`,
            pointerEvents: 'all',
            cursor: 'grab',
            zIndex: 11,
          }}
          onMouseDown={(e) => onMouseDown(e, 'real', h.index)}
          onDoubleClick={(e) => onDoubleClick(e, h.index)}
          title="Drag to move · Double-click to remove"
        >
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: '#0a1228', border: `2px solid ${strokeColor}`,
            boxShadow: `0 0 0 4px ${strokeColor}28, 0 2px 8px rgba(0,0,0,0.5)`,
          }} />
        </div>
      ))}
    </EdgeLabelRenderer>
  );
});
ControlHandles.displayName = 'ControlHandles';

// ── Main edge component ───────────────────────────────────────────────────────
const CustomEdge = memo(({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data = {},
  selected,
}) => {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const [hovered, setHovered] = useState(false);

  // Read edge styling props
  const strokeColor  = data.strokeColor  || '#4b8fd4';
  const strokeWidth  = data.strokeWidth  || 2;
  const arrowType    = data.arrowType    || 'closed';
  const arrowStart   = data.arrowStart   || 'none';
  const animated     = data.animated     || false;
  const label        = data.label        || '';
  const lineStyle    = data.lineStyle    || 'elbow';
  const cornerRadius = data.cornerRadius ?? 10;
  // data.points: array of {x,y} intermediate waypoints — null/[] = auto-route
  const userPoints   = data.points;

  // ── Compute path ─────────────────────────────────────────────────────────────
  let d, labelX, labelY, arrowAngle, arrowStartAngle;
  let activePts = null; // used by ControlHandles

  if (lineStyle === 'straight') {
    [d, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    arrowAngle      = Math.atan2(targetY - sourceY, targetX - sourceX);
    arrowStartAngle = Math.atan2(sourceY - targetY, sourceX - targetX);

  } else if (lineStyle === 'bezier') {
    // Legacy bezier with optional offset control point
    const offset = data.offset || { x: 0, y: 0 };
    labelX = (sourceX + targetX) / 2 + offset.x;
    labelY = (sourceY + targetY) / 2 + offset.y;
    d = `M ${sourceX} ${sourceY} Q ${labelX} ${labelY} ${targetX} ${targetY}`;
    arrowAngle      = Math.atan2(targetY - labelY, targetX - labelX);
    arrowStartAngle = Math.atan2(sourceY - labelY, sourceX - labelX);

  } else if (userPoints && userPoints.length > 0) {
    // Custom waypoints mode — build path through [source, ...waypoints, target]
    activePts = [{ x: sourceX, y: sourceY }, ...userPoints, { x: targetX, y: targetY }];
    ({ d, labelX, labelY, arrowAngle, arrowStartAngle } = buildPathFromPts(activePts, cornerRadius));

  } else {
    // Auto-route mode — orthogonal router, expose pts for segment handles
    const res = buildRobustElbow(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, cornerRadius);
    ({ d, labelX, labelY, arrowAngle, arrowStartAngle } = res);
    activePts = res.pts;
  }

  const resetRouting = useCallback(() => {
    setEdges(eds => eds.map(e =>
      e.id !== id ? e : { ...e, data: { ...e.data, points: [] } }
    ));
  }, [id, setEdges]);

  // ── Bezier drag (legacy — whole-path nudge via offset) ────────────────────
  const bezierDragRef = useRef(null);
  const onBezierMouseDown = useCallback((e) => {
    if (lineStyle !== 'bezier') return;
    e.stopPropagation();
    e.preventDefault();
    const startFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const startOffset = data.offset || { x: 0, y: 0 };
    bezierDragRef.current = { startFlow, startOffset };

    const onMove = (ev) => {
      if (!bezierDragRef.current) return;
      const cur = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
      const dx = cur.x - bezierDragRef.current.startFlow.x;
      const dy = cur.y - bezierDragRef.current.startFlow.y;
      setEdges(eds => eds.map(edge =>
        edge.id !== id ? edge : {
          ...edge,
          data: { ...edge.data, offset: { x: bezierDragRef.current.startOffset.x + dx, y: bezierDragRef.current.startOffset.y + dy } }
        }
      ));
    };
    const onUp = () => {
      bezierDragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [id, lineStyle, data.offset, setEdges, screenToFlowPosition]);

  const onBezierDoubleClick = useCallback((e) => {
    if (lineStyle !== 'bezier') return;
    e.stopPropagation();
    setEdges(eds => eds.map(edge =>
      edge.id !== id ? edge : { ...edge, data: { ...edge.data, offset: { x: 0, y: 0 } } }
    ));
  }, [id, lineStyle, setEdges]);

  const showInteractive = selected || hovered;
  // Segment handles: only in elbow mode with a computed pts array
  const showHandles = showInteractive && lineStyle === 'elbow' && activePts !== null;

  // ── Arrowhead trim (shorten path so line stops at arrowhead base) ─────────
  const sw = strokeWidth;
  const sz = Math.max(9, sw * 4);
  const endTrim   = arrowType  !== 'none' && arrowType  !== 'open' && arrowType  !== 'chevron' ? sz : 0;
  const startTrim = arrowStart !== 'none' && arrowStart !== 'open' && arrowStart !== 'chevron' ? sz : 0;
  let trimmedD = d;
  if (endTrim > 0) {
    const cos = Math.cos(arrowAngle), sin = Math.sin(arrowAngle);
    trimmedD = trimmedD.replace(
      /L\s+([\d.\-eE]+)\s+([\d.\-eE]+)\s*$/,
      `L ${targetX - cos * endTrim} ${targetY - sin * endTrim}`
    );
  }
  if (startTrim > 0) {
    const cos = Math.cos(arrowStartAngle), sin = Math.sin(arrowStartAngle);
    trimmedD = trimmedD.replace(
      /^M\s+([\d.\-eE]+)\s+([\d.\-eE]+)/,
      `M ${sourceX - cos * startTrim} ${sourceY - sin * startTrim}`
    );
  }

  return (
    <g>
      {/* ── Wide invisible interaction area ──────────────────────────────── */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        className="react-flow__edge-interaction"
        style={{ cursor: lineStyle === 'bezier' ? 'move' : 'default' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseDown={onBezierMouseDown}
        onDoubleClick={onBezierDoubleClick}
      />

      {/* ── Selection / hover glow ───────────────────────────────────────── */}
      {showInteractive && (
        <path
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 8}
          strokeOpacity={hovered && !selected ? 0.3 : 0.15}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* ── Main visible stroke ───────────────────────────────────────────── */}
      <path
        id={id}
        d={trimmedD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={animated ? '10 5' : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="react-flow__edge-path"
        style={{ pointerEvents: 'none' }}
      />

      {/* ── Arrowheads ───────────────────────────────────────────────────── */}
      <Arrowhead type={arrowType}  tx={targetX} ty={targetY} angle={arrowAngle}      color={strokeColor} sw={strokeWidth} />
      {arrowStart !== 'none' && (
        <Arrowhead type={arrowStart} tx={sourceX} ty={sourceY} angle={arrowStartAngle} color={strokeColor} sw={strokeWidth} />
      )}

      {/* ── Edge label ────────────────────────────────────────────────────── */}
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

      {/* ── Bezier center handle (when selected) ─────────────────────────── */}
      {selected && lineStyle === 'bezier' && (
        <circle
          cx={labelX} cy={labelY} r={5}
          fill="#0f2044" stroke={strokeColor} strokeWidth={2}
          style={{ pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
        />
      )}

      {/* ── Polyline handles (elbow mode) ────────────────────────────────── */}
      {showHandles && (
        <ControlHandles
          id={id}
          pts={activePts}
          setEdges={setEdges}
          screenToFlowPosition={screenToFlowPosition}
          strokeColor={strokeColor}
        />
      )}
    </g>
  );
});

CustomEdge.displayName = 'CustomEdge';
export default CustomEdge;
