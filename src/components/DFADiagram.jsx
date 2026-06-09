/**
 * DFADiagram — circle-based DFA SVG, shared by DirectDFA and SubsetConstruction.
 */
import React, { useMemo } from 'react';

const R      = 36;    // node radius
const COLS   = 5;     // max per row
const COL_GAP = 200;  // centre-to-centre horizontal
const ROW_GAP = 200;  // centre-to-centre vertical
const PAD    = 80;    // outer padding

// ── Layout ──────────────────────────────────────────────────────────────────
function layout(order) {
  const pos = new Map();
  order.forEach((key, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    pos.set(key, { x: PAD + col * COL_GAP, y: PAD + row * ROW_GAP });
  });
  const last = order.length - 1;
  const W = PAD + (Math.min(last, COLS - 1)) * COL_GAP + PAD;
  const H = PAD + Math.floor(last / COLS) * ROW_GAP + PAD;
  return { pos, W: Math.max(W, PAD * 2 + COL_GAP), H: Math.max(H, PAD * 2) };
}

// ── Group transitions by (from, to) ─────────────────────────────────────────
function buildEdges(order, dfaMap) {
  const edgeMap = new Map();
  for (const fromKey of order) {
    const state = dfaMap.get(fromKey);
    if (!state) continue;
    for (const [sym, toKey] of state.transitions) {
      const k = `${fromKey}→${toKey}`;
      if (!edgeMap.has(k)) edgeMap.set(k, { from: fromKey, to: toKey, labels: [] });
      edgeMap.get(k).labels.push(sym);
    }
  }
  return [...edgeMap.values()];
}

// ── Path between two circle centres ─────────────────────────────────────────
function circleEdge(px, py, qx, qy, isSelf, fromIdx, toIdx, hasReverse) {
  // Self-loop: arc above the node
  if (isSelf) {
    return {
      d: `M ${px - 16} ${py - R} C ${px - 50} ${py - R - 80} ${px + 50} ${py - R - 80} ${px + 16} ${py - R}`,
      lx: px, ly: py - R - 64,
    };
  }

  const dx = qx - px, dy = qy - py;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist, uy = dy / dist;
  const perpX = -uy, perpY = ux;

  // Entry/exit points on circle borders
  const sx = px + ux * R, sy = py + uy * R;
  const ex = qx - ux * R, ey = qy - uy * R;

  const isBack = toIdx < fromIdx;
  const gap    = Math.abs(fromIdx - toIdx); // how many states apart

  // Back edges arc ABOVE (negative y direction) scaled by distance
  // Forward edges with a reverse counterpart curve slightly to avoid overlap
  let curve = 0;
  let sign  = 1;

  if (isBack) {
    // Arc height grows with distance so long back edges clear over states
    curve = 40 + gap * 28;
    sign  = -1; // curve upward (negative y)
  } else if (hasReverse) {
    curve = 30;
    sign  = 1;  // curve downward
  }

  const mx = (sx + ex) / 2, my = (sy + ey) / 2;

  if (curve === 0) {
    return { d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}`, lx: mx, ly: my };
  }

  const cpx = mx + perpX * sign * curve;
  const cpy = my + perpY * sign * curve;

  // Label sits at 60% along the curve (closer to destination, less crowding at midpoint)
  const t = 0.5;
  const lx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cpx + t * t * ex;
  const ly = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cpy + t * t * ey;

  return {
    d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
    lx, ly,
  };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function DFADiagram({ dfaMap, nameMap, order, startKey }) {
  const { pos, W, H } = useMemo(() => layout(order), [order]);
  const edges = useMemo(() => buildEdges(order, dfaMap), [order, dfaMap]);
  const edgeKeySet = new Set(edges.map(e => `${e.from}→${e.to}`));

  // Extra vertical space needed for tall back-edge arcs
  const maxBackArc = useMemo(() => {
    let extra = 0;
    for (const e of edges) {
      const fi = order.indexOf(e.from), ti = order.indexOf(e.to);
      if (ti < fi) extra = Math.max(extra, 40 + Math.abs(fi - ti) * 28);
    }
    return extra;
  }, [edges, order]);

  const svgH = H + maxBackArc;

  return (
    <>
      <div className="section-header">DFA Diagram</div>
      <div className="automaton-wrap">
        <svg width={W} height={svgH} style={{ display: 'block' }}>
          <defs>
            <marker id="dfa-arr" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#888"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          {/* Start arrow */}
          {(() => {
            const sp = pos.get(startKey);
            if (!sp) return null;
            return (
              <g>
                <line x1={sp.x - R - 36} y1={sp.y} x2={sp.x - R - 2} y2={sp.y}
                  stroke="#888" strokeWidth={1.5} markerEnd="url(#dfa-arr)" />
                <text x={sp.x - R - 40} y={sp.y - 7}
                  textAnchor="end" fontSize={10} fill="var(--color-text-secondary)">start</text>
              </g>
            );
          })()}

          {/* Edges */}
          {edges.map((edge, ei) => {
            const fp = pos.get(edge.from), tp = pos.get(edge.to);
            if (!fp || !tp) return null;
            const isSelf    = edge.from === edge.to;
            const fromIdx   = order.indexOf(edge.from);
            const toIdx     = order.indexOf(edge.to);
            const hasReverse = !isSelf && edgeKeySet.has(`${edge.to}→${edge.from}`);
            const { d, lx, ly } = circleEdge(fp.x, fp.y, tp.x, tp.y, isSelf, fromIdx, toIdx, hasReverse);
            const label  = edge.labels.join(', ');
            const labelW = label.length * 7 + 10;

            return (
              <g key={ei}>
                <path d={d} fill="none" stroke="#888" strokeWidth={1.4}
                  markerEnd="url(#dfa-arr)" />
                <rect x={lx - labelW / 2} y={ly - 10} width={labelW} height={18}
                  rx="4" fill="var(--color-bg-primary)"
                  stroke="var(--color-border)" strokeWidth={0.5} />
                <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={12} fontFamily="'Menlo','Consolas',monospace"
                  fill="var(--color-text-primary)">
                  {label}
                </text>
              </g>
            );
          })}

          {/* State circles (drawn on top of edges) */}
          {order.map(key => {
            const p = pos.get(key);
            if (!p) return null;
            const state    = dfaMap.get(key);
            const isStart  = key === startKey;
            const isAccept = state?.accepting;
            const name     = nameMap.get(key) ?? key;
            const color    = isStart ? '#185FA5' : isAccept ? '#0F6E56' : '#533AB7';

            return (
              <g key={key}>
                <circle cx={p.x} cy={p.y} r={R}
                  fill="var(--color-bg-secondary)" stroke={color} strokeWidth={isStart ? 2.5 : 1.8} />
                {isAccept && (
                  <circle cx={p.x} cy={p.y} r={R - 6}
                    fill="none" stroke={color} strokeWidth={1.2} />
                )}
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize={13} fontWeight={700}
                  fontFamily="'Menlo','Consolas',monospace"
                  fill={color}>
                  {name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}
