/**
 * DFADiagram — circle-based DFA SVG, shared by DirectDFA and SubsetConstruction.
 */
import React, { useMemo } from 'react';

const R       = 38;
const COLS    = 5;
const COL_GAP = 210;
const ROW_GAP = 220;
const PAD_X   = 90;
const PAD_BOT = 50;

// ── Layout ───────────────────────────────────────────────────────────────────
function layout(order, topPad) {
  const pos = new Map();
  order.forEach((key, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    pos.set(key, { x: PAD_X + col * COL_GAP, y: topPad + row * ROW_GAP });
  });
  const last  = order.length - 1;
  const W     = PAD_X + Math.min(last, COLS - 1) * COL_GAP + PAD_X;
  const H     = topPad + Math.floor(last / COLS) * ROW_GAP + PAD_BOT;
  return { pos, W: Math.max(W, PAD_X * 2 + COL_GAP), H };
}

// ── Group transitions ────────────────────────────────────────────────────────
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

// ── SVG path ─────────────────────────────────────────────────────────────────
// All states on one horizontal row — arcs go UP for back edges, DOWN for
// bidirectional forward edges.  We explicitly use ±Y, never the rotated perp.
function circleEdge(px, py, qx, qy, isSelf, fromIdx, toIdx, hasReverse) {
  const gap = Math.abs(fromIdx - toIdx);

  // Self-loop — arc above node
  if (isSelf) {
    const loopH = 75;
    return {
      d: `M ${px - 18} ${py - R} C ${px - 55} ${py - R - loopH} ${px + 55} ${py - R - loopH} ${px + 18} ${py - R}`,
      lx: px, ly: py - R - loopH - 4,
    };
  }

  const dx   = qx - px;
  const dist = Math.abs(dx);                  // always horizontal (same row)
  const ux   = dx / dist;                      // +1 forward, -1 backward

  const sx = px + ux * R;                      // edge start on circle border
  const ex = qx - ux * R;                      // edge end   on circle border
  const mx = (sx + ex) / 2;
  const my = py;                               // same y (horizontal row)

  const isBack = toIdx < fromIdx;

  if (isBack) {
    // Arc upward — control point above the midpoint
    // Use increasing heights per gap so arcs don't overlap
    const arcH = 50 + gap * 36;
    const cpx  = mx;
    const cpy  = my - arcH;
    // Label at top of arc
    return {
      d: `M ${sx.toFixed(1)} ${sy(py, ux, R)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${ex.toFixed(1)} ${sy(py, -ux, R)}`,
      lx: cpx, ly: cpy - 10,
    };
  }

  if (hasReverse) {
    // Curve downward so it doesn't overlap the back-arc
    const arcH = 40;
    const cpx  = mx;
    const cpy  = my + arcH;
    return {
      d: `M ${sx.toFixed(1)} ${my.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${ex.toFixed(1)} ${my.toFixed(1)}`,
      lx: cpx, ly: cpy + 10,
    };
  }

  // Straight
  return {
    d: `M ${sx.toFixed(1)} ${my.toFixed(1)} L ${ex.toFixed(1)} ${my.toFixed(1)}`,
    lx: mx, ly: my - 14,
  };
}

// helper — Y coordinate on circle border for horizontal edge
function sy(cy, ux, r) { return cy; }  // horizontal: start/end at centre-y

// ── Component ─────────────────────────────────────────────────────────────────
export default function DFADiagram({ dfaMap, nameMap, order, startKey }) {
  const edges      = useMemo(() => buildEdges(order, dfaMap), [order, dfaMap]);
  const edgeKeySet = new Set(edges.map(e => `${e.from}→${e.to}`));

  // Top padding = height of tallest back-arc + room for labels + self-loop
  const topPad = useMemo(() => {
    let maxUp = 80;   // minimum for self-loops
    for (const e of edges) {
      const fi = order.indexOf(e.from), ti = order.indexOf(e.to);
      if (ti < fi) {
        const arcH = 50 + Math.abs(fi - ti) * 36;
        maxUp = Math.max(maxUp, arcH + 28);  // +28 for label above arc
      }
    }
    return maxUp + 20;
  }, [edges, order]);

  const { pos, W, H } = useMemo(() => layout(order, topPad), [order, topPad]);

  // Bottom padding for downward arcs of bidirectional edges
  const botExtra = useMemo(() => {
    for (const e of edges) {
      const hasRev = edgeKeySet.has(`${e.to}→${e.from}`);
      if (hasRev && order.indexOf(e.to) > order.indexOf(e.from)) return 80;
    }
    return 10;
  }, [edges, edgeKeySet, order]);

  const svgH = H + botExtra;

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
                <line x1={sp.x - R - 38} y1={sp.y} x2={sp.x - R - 2} y2={sp.y}
                  stroke="#888" strokeWidth={1.6} markerEnd="url(#dfa-arr)" />
                <text x={sp.x - R - 42} y={sp.y - 8}
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
            const labelW = label.length * 7.5 + 12;

            return (
              <g key={ei}>
                <path d={d} fill="none" stroke="#888" strokeWidth={1.5}
                  markerEnd="url(#dfa-arr)" />
                <rect x={lx - labelW / 2} y={ly - 10} width={labelW} height={20}
                  rx="4" fill="var(--color-bg-primary)"
                  stroke="var(--color-border)" strokeWidth={0.8} />
                <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={12} fontFamily="'Menlo','Consolas',monospace"
                  fontWeight={600} fill="var(--color-text-primary)">
                  {label}
                </text>
              </g>
            );
          })}

          {/* Nodes — drawn last so they sit on top of edges */}
          {order.map(key => {
            const p      = pos.get(key);
            if (!p) return null;
            const state  = dfaMap.get(key);
            const isStart  = key === startKey;
            const isAccept = state?.accepting;
            const name   = nameMap.get(key) ?? key;
            const color  = isStart ? '#185FA5' : isAccept ? '#0F6E56' : '#533AB7';

            return (
              <g key={key}>
                <circle cx={p.x} cy={p.y} r={R}
                  fill="var(--color-bg-secondary)" stroke={color} strokeWidth={isStart ? 2.5 : 1.8} />
                {isAccept && (
                  <circle cx={p.x} cy={p.y} r={R - 6}
                    fill="none" stroke={color} strokeWidth={1.3} />
                )}
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize={13} fontWeight={700}
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
