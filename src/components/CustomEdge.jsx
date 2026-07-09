import { memo, useCallback, useRef, useState } from 'react';
import { useReactFlow, Position, getBezierPath, getStraightPath } from '@xyflow/react';

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

// ── Robust Orthogonal (Visio) Router ──────────────────────────────────────────
function buildRobustElbow(sx, sy, sp, tx, ty, tp, offsetX, offsetY, R = 10) {
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
  const s1x = sx + sdx * CLEAR;
  const s1y = sy + sdy * CLEAR;
  const t1x = tx + tdx * CLEAR;
  const t1y = ty + tdy * CLEAR;

  const isSourceV = sdy !== 0;
  const isTargetV = tdy !== 0;

  let crossbarType = 'horizontal';
  if (isSourceV && isTargetV) crossbarType = 'horizontal';
  else if (!isSourceV && !isTargetV) crossbarType = 'vertical';
  else {
    // mixed
    crossbarType = Math.abs(s1x - t1x) > Math.abs(s1y - t1y) ? 'vertical' : 'horizontal';
  }

  const pts = [[sx, sy]];

  if (crossbarType === 'vertical') {
    const mx = (s1x + t1x) / 2 + offsetX;
    pts.push([s1x, s1y], [mx, s1y], [mx, t1y], [t1x, t1y]);
  } else {
    const my = (s1y + t1y) / 2 + offsetY;
    pts.push([s1x, s1y], [s1x, my], [t1x, my], [t1x, t1y]);
  }
  pts.push([tx, ty]);

  // Clean collinear and dupes
  const clean = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const curr = pts[i];
    const prev = clean[clean.length - 1];
    if (Math.abs(prev[0] - curr[0]) < 1 && Math.abs(prev[1] - curr[1]) < 1) continue;
    
    if (clean.length >= 2) {
      const p1 = clean[clean.length - 2];
      const p2 = clean[clean.length - 1];
      const isX = Math.abs(p1[0] - p2[0]) < 1 && Math.abs(p2[0] - curr[0]) < 1;
      const isY = Math.abs(p1[1] - p2[1]) < 1 && Math.abs(p2[1] - curr[1]) < 1;
      if (isX || isY) clean.pop();
    }
    clean.push(curr);
  }

  // Draw Path with rounded corners
  let d = `M ${clean[0][0]} ${clean[0][1]}`;
  for (let i = 1; i < clean.length - 1; i++) {
    const p0 = clean[i - 1];
    const p1 = clean[i];
    const p2 = clean[i + 1];
    
    const d01 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const d12 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const r = Math.min(R, d01 / 2.1, d12 / 2.1);

    if (r < 1) {
      d += ` L ${p1[0]} ${p1[1]}`;
    } else {
      const pStart = [p1[0] + ((p0[0] - p1[0]) / d01) * r, p1[1] + ((p0[1] - p1[1]) / d01) * r];
      const pEnd = [p1[0] + ((p2[0] - p1[0]) / d12) * r, p1[1] + ((p2[1] - p1[1]) / d12) * r];
      d += ` L ${pStart[0]} ${pStart[1]} Q ${p1[0]} ${p1[1]} ${pEnd[0]} ${pEnd[1]}`;
    }
  }
  const last = clean[clean.length - 1];
  d += ` L ${last[0]} ${last[1]}`;

  // Find midpoint for label and hit area
  let labelX, labelY;
  const midIdx = Math.floor((clean.length - 1) / 2);
  labelX = (clean[midIdx][0] + clean[midIdx + 1][0]) / 2;
  labelY = (clean[midIdx][1] + clean[midIdx + 1][1]) / 2;

  // Accurate arrow angles from actual path segments
  const arrowStartAngle = Math.atan2(clean[0][1] - clean[1][1], clean[0][0] - clean[1][0]);
  const arrowAngle = Math.atan2(clean[clean.length - 1][1] - clean[clean.length - 2][1], clean[clean.length - 1][0] - clean[clean.length - 2][0]);

  return { d, labelX, labelY, arrowStartAngle, arrowAngle };
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

  // ── Compute path ────────────────────────────────────────────────────────────
  let d, labelX, labelY, arrowAngle, arrowStartAngle;

  if (lineStyle === 'straight') {
    [d, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    arrowAngle = Math.atan2(targetY - sourceY, targetX - sourceX);
    arrowStartAngle = Math.atan2(sourceY - targetY, sourceX - targetX);
  } else if (lineStyle === 'bezier') {
    labelX = (sourceX + targetX) / 2 + offset.x;
    labelY = (sourceY + targetY) / 2 + offset.y;
    d = `M ${sourceX} ${sourceY} Q ${labelX} ${labelY} ${targetX} ${targetY}`;
    arrowAngle = Math.atan2(targetY - labelY, targetX - labelX);
    arrowStartAngle = Math.atan2(sourceY - labelY, sourceX - labelX);
  } else {
    // Our robust custom orthogonal router
    const res = buildRobustElbow(sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, offset.x, offset.y, cornerRadius);
    d = res.d;
    labelX = res.labelX;
    labelY = res.labelY;
    arrowAngle = res.arrowAngle;
    arrowStartAngle = res.arrowStartAngle;
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

      {/* ── Arrowheads ───────────────────────────────────────────────────────── */}
      {(() => {
        // Shorten the path end so the line stops exactly at the arrowhead base (not tip).
        // sz = arrowhead size, matches Arrowhead component: Math.max(9, sw*4)
        const sw = strokeWidth;
        const sz = Math.max(9, sw * 4);

        // Trim target end: move the final point back by sz along the last segment direction
        const trimPath = (pathD, tx, ty, angle, trim) => {
          if (trim <= 0) return pathD;
          // Replace the last "L tx ty" with "L (tx - cos*trim) (ty - sin*trim)"
          const newTx = tx - Math.cos(angle) * trim;
          const newTy = ty - Math.sin(angle) * trim;
          // The path ends with "L <tx> <ty>" — replace just those last coordinates
          return pathD.replace(
            new RegExp(`L\\s+${tx.toFixed(4)}\\s+${ty.toFixed(4)}$`),
            `L ${newTx} ${newTy}`
          ).replace(
            /L\s+([\d.eE+-]+)\s+([\d.eE+-]+)$/,
            (_, lx, ly) => {
              // fallback: trim the last segment geometrically
              const ox = parseFloat(lx), oy = parseFloat(ly);
              const len = Math.hypot(tx - ox, ty - oy);
              if (len < 1) return `L ${ox} ${oy}`;
              const t = Math.max(0, (len - trim) / len);
              return `L ${ox + (tx - ox) * t} ${oy + (ty - oy) * t}`;
            }
          );
        };

        // Calculate trim amounts per arrow type
        const endTrim   = arrowType  !== 'none' && arrowType  !== 'open' && arrowType  !== 'chevron' ? sz : 0;
        const startTrim = arrowStart !== 'none' && arrowStart !== 'open' && arrowStart !== 'chevron' ? sz : 0;

        // Build trimmed path: trim target end first, then source start
        let trimmedD = d;

        // Trim target end — shorten by walking from the last L point
        if (endTrim > 0) {
          // Find last segment: from second-to-last point toward targetX,targetY
          const cos = Math.cos(arrowAngle), sin = Math.sin(arrowAngle);
          const newTx = targetX - cos * endTrim;
          const newTy = targetY - sin * endTrim;
          // Replace only the final coordinate pair in the path
          trimmedD = trimmedD.replace(
            /L\s+([\d.\-eE]+)\s+([\d.\-eE]+)\s*$/,
            `L ${newTx} ${newTy}`
          );
        }

        // Trim source start — adjust M point
        if (startTrim > 0) {
          const cos = Math.cos(arrowStartAngle), sin = Math.sin(arrowStartAngle);
          const newSx = sourceX - cos * startTrim;
          const newSy = sourceY - sin * startTrim;
          trimmedD = trimmedD.replace(
            /^M\s+([\d.\-eE]+)\s+([\d.\-eE]+)/,
            `M ${newSx} ${newSy}`
          );
        }

        return (
          <>
            {/* Render main stroke on trimmed path */}
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
            <Arrowhead type={arrowType}  tx={targetX} ty={targetY} angle={arrowAngle}      color={strokeColor} sw={strokeWidth} />
            {arrowStart !== 'none' && (
              <Arrowhead type={arrowStart} tx={sourceX} ty={sourceY} angle={arrowStartAngle} color={strokeColor} sw={strokeWidth} />
            )}
          </>
        );
      })()}

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
