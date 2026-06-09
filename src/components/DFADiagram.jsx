/**
 * DFADiagram — circle-based DFA SVG, shared by DirectDFA and SubsetConstruction.
 * Supports multi-row layouts with proper 2-D edge curves.
 */
import React, { useMemo } from 'react';

const R       = 42;   // node radius
const COLS    = 3;    // states per row
const COL_GAP = 260;  // horizontal distance between node centres
const ROW_GAP = 240;  // vertical distance between node centres
const PAD_X   = 100;
const PAD_TOP = 80;   // base top padding (may grow for same-row back-arcs)
const PAD_BOT = 70;

// ── Bezier helpers ────────────────────────────────────────────────────────────
function quadAt(t, p0, p1, p2) {
  const m = 1 - t;
  return m * m * p0 + 2 * m * t * p1 + t * t * p2;
}
function cubicAt(t, p0, p1, p2, p3) {
  const m = 1 - t;
  return m*m*m*p0 + 3*m*m*t*p1 + 3*m*t*t*p2 + t*t*t*p3;
}

// ── Layout ────────────────────────────────────────────────────────────────────
function layout(order, topPad) {
  const pos = new Map();
  order.forEach((key, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    pos.set(key, { x: PAD_X + col * COL_GAP, y: topPad + row * ROW_GAP });
  });
  const rows = Math.ceil(order.length / COLS);
  const cols = Math.min(order.length, COLS);
  const W = PAD_X + (cols - 1) * COL_GAP + PAD_X;
  const H = topPad + (rows - 1) * ROW_GAP + PAD_BOT;
  return { pos, W: Math.max(W, PAD_X * 2), H };
}

// ── Group transitions by (from,to) ────────────────────────────────────────────
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

// ── Edge geometry (handles same-row and cross-row) ────────────────────────────
function edgeGeom(px, py, qx, qy, fromIdx, toIdx, hasReverse) {
  const isSelf = fromIdx === toIdx;

  // Self-loop — arc above the node
  if (isSelf) {
    const loopH = 80;
    const sx = px - 20, sy = py - R;
    const ex = px + 20, ey = py - R;
    const c1x = px - 60, c1y = py - R - loopH;
    const c2x = px + 60, c2y = py - R - loopH;
    return {
      d: `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`,
      lx: px, ly: py - R - loopH - 6,
    };
  }

  const fromRow = Math.floor(fromIdx / COLS);
  const toRow   = Math.floor(toIdx   / COLS);
  const sameRow = fromRow === toRow;

  if (sameRow) {
    // ── Same-row: arc horizontally ──
    const isBack = toIdx < fromIdx;
    const ux  = qx > px ? 1 : -1;
    const sx  = px + ux * R;
    const ex  = qx - ux * R;
    const mx  = (sx + ex) / 2;
    const gap = Math.abs(fromIdx - toIdx);

    if (isBack) {
      const arcH = 52 + gap * 40;
      const cpx  = mx, cpy = py - arcH;
      const t    = 0.72;
      const lx   = quadAt(t, sx, cpx, ex);
      const ly   = quadAt(t, py, cpy, py) - 14;
      return {
        d: `M ${sx.toFixed(1)} ${py.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${ex.toFixed(1)} ${py.toFixed(1)}`,
        lx, ly,
      };
    }

    if (hasReverse) {
      // Forward when a back-edge exists in the other direction — bow downward
      const arcH = 40, cpx = mx, cpy = py + arcH;
      const lx = quadAt(0.5, sx, cpx, ex);
      const ly = quadAt(0.5, py, cpy, py) + 16;
      return {
        d: `M ${sx.toFixed(1)} ${py.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${ex.toFixed(1)} ${py.toFixed(1)}`,
        lx, ly,
      };
    }

    // Straight forward
    return {
      d: `M ${sx.toFixed(1)} ${py.toFixed(1)} L ${ex.toFixed(1)} ${py.toFixed(1)}`,
      lx: mx, ly: py - 18,
    };
  }

  // ── Cross-row: cubic bezier in 2-D ──
  const dx  = qx - px, dy = qy - py;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux  = dx / len, uy = dy / len;

  // Exit/entry points on node perimeters
  const sx = px + ux * R, sy = py + uy * R;
  const ex = qx - ux * R, ey = qy - uy * R;

  // Perpendicular unit vector (for bowing bidirectional pairs)
  const perpX = -uy, perpY = ux;
  const bow   = hasReverse ? 50 : 0;

  const c1x = sx + dx / 3 + perpX * bow;
  const c1y = sy + dy / 3 + perpY * bow;
  const c2x = ex - dx / 3 + perpX * bow;
  const c2y = ey - dy / 3 + perpY * bow;

  // Label at midpoint of cubic
  const lx = cubicAt(0.5, sx, c1x, c2x, ex) + perpX * bow * 0.6;
  const ly = cubicAt(0.5, sy, c1y, c2y, ey) + perpY * bow * 0.6 - 14;

  return {
    d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
    lx, ly,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DFADiagram({ dfaMap, nameMap, order, startKey }) {
  const edges      = useMemo(() => buildEdges(order, dfaMap), [order, dfaMap]);
  const edgeKeySet = new Set(edges.map(e => `${e.from}→${e.to}`));

  // Top padding must clear the tallest same-row back-arc
  const topPad = useMemo(() => {
    let maxArc = PAD_TOP;
    for (const e of edges) {
      if (e.from === e.to) { maxArc = Math.max(maxArc, 90); continue; }
      const fi = order.indexOf(e.from), ti = order.indexOf(e.to);
      const sameRow = Math.floor(fi / COLS) === Math.floor(ti / COLS);
      if (sameRow && ti < fi) {
        const gap  = fi - ti;
        const arcH = 52 + gap * 40;
        maxArc = Math.max(maxArc, arcH + 30);
      }
    }
    return maxArc + 20;
  }, [edges, order]);

  const { pos, W, H } = useMemo(() => layout(order, topPad), [order, topPad]);

  // Extra bottom padding when forward arcs bow downward
  const botPad = useMemo(() => {
    let extra = PAD_BOT;
    for (const e of edges) {
      const fi = order.indexOf(e.from), ti = order.indexOf(e.to);
      const sameRow = Math.floor(fi / COLS) === Math.floor(ti / COLS);
      if (sameRow && ti > fi && edgeKeySet.has(`${e.to}→${e.from}`)) {
        extra = Math.max(extra, 100);
      }
    }
    return extra;
  }, [edges, edgeKeySet, order]);

  const svgH = H - PAD_BOT + botPad;

  return (
    <>
      <div className="section-header">DFA Diagram</div>
      <div className="automaton-wrap dfa-wrap">
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
                <line x1={sp.x - R - 44} y1={sp.y} x2={sp.x - R - 2} y2={sp.y}
                  stroke="#888" strokeWidth={1.6} markerEnd="url(#dfa-arr)" />
                <text x={sp.x - R - 48} y={sp.y - 8}
                  textAnchor="end" fontSize={11} fill="var(--color-text-secondary)">start</text>
              </g>
            );
          })()}

          {/* Edges */}
          {edges.map((edge, ei) => {
            const fp = pos.get(edge.from), tp = pos.get(edge.to);
            if (!fp || !tp) return null;
            const fromIdx    = order.indexOf(edge.from);
            const toIdx      = order.indexOf(edge.to);
            const hasReverse = fromIdx !== toIdx && edgeKeySet.has(`${edge.to}→${edge.from}`);
            const { d, lx, ly } = edgeGeom(fp.x, fp.y, tp.x, tp.y, fromIdx, toIdx, hasReverse);
            const label  = edge.labels.join(', ');
            const labelW = label.length * 8.5 + 16;

            return (
              <g key={ei}>
                <path d={d} fill="none" stroke="#888" strokeWidth={1.6}
                  markerEnd="url(#dfa-arr)" />
                <rect x={lx - labelW / 2} y={ly - 11} width={labelW} height={22}
                  rx="5" fill="var(--color-bg-primary)"
                  stroke="var(--color-border)" strokeWidth={1} />
                <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={13} fontFamily="'Menlo','Consolas',monospace"
                  fontWeight={700} fill="var(--color-text-primary)">
                  {label}
                </text>
              </g>
            );
          })}

          {/* Nodes — drawn last (on top of edges) */}
          {order.map(key => {
            const p      = pos.get(key);
            if (!p) return null;
            const state    = dfaMap.get(key);
            const isStart  = key === startKey;
            const isAccept = state?.accepting;
            const name     = nameMap.get(key) ?? key;
            const color    = isStart ? '#185FA5' : isAccept ? '#0F6E56' : '#533AB7';

            return (
              <g key={key}>
                <circle cx={p.x} cy={p.y} r={R}
                  fill="var(--color-bg-secondary)" stroke={color}
                  strokeWidth={isStart ? 2.8 : 2} />
                {isAccept && (
                  <circle cx={p.x} cy={p.y} r={R - 7}
                    fill="none" stroke={color} strokeWidth={1.4} />
                )}
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize={14} fontWeight={700}
                  fontFamily="'Menlo','Consolas',monospace" fill={color}>
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
