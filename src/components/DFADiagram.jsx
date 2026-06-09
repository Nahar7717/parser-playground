/**
 * DFADiagram — circle-based DFA SVG, shared by DirectDFA and SubsetConstruction.
 *
 * Props:
 *   dfaMap   : Map<key, { transitions: Map<sym,key>, accepting: bool }>
 *   nameMap  : Map<key, string>   e.g. 'S0','S1'... or 'A','B'...
 *   order    : string[]           keys in BFS order
 *   startKey : string
 *   symbols  : string[]
 */
import React, { useMemo } from 'react';

const R = 36;         // node radius
const COLS = 4;       // max states per row
const COL_GAP = 160;  // horizontal spacing (centre to centre)
const ROW_GAP = 140;  // vertical spacing
const PAD = 60;       // outer padding

// ── Layout ─────────────────────────────────────────────────────────────────
function layout(order) {
  const pos = new Map();
  order.forEach((key, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    pos.set(key, {
      x: PAD + col * COL_GAP,
      y: PAD + row * ROW_GAP,
    });
  });
  const maxIdx = order.length - 1;
  const maxCol = maxIdx % COLS;
  const maxRow = Math.floor(maxIdx / COLS);
  const W = PAD + maxCol * COL_GAP + PAD;
  const H = PAD + maxRow * ROW_GAP + PAD;
  return { pos, W: Math.max(W, PAD * 2 + COL_GAP), H: Math.max(H, PAD * 2 + ROW_GAP) };
}

// ── Edge bundling ───────────────────────────────────────────────────────────
// Group edges by (from,to), collecting all labels
function buildEdges(order, dfaMap, nameMap) {
  const edgeMap = new Map(); // "from→to" → { from, to, labels: [] }
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

// ── SVG path between two circles ────────────────────────────────────────────
function circleEdge(px, py, qx, qy, isSelf, isBack, hasReverse) {
  if (isSelf) {
    // small loop above
    return {
      d: `M ${px - 14} ${py - R} C ${px - 40} ${py - R - 70} ${px + 40} ${py - R - 70} ${px + 14} ${py - R}`,
      lx: px, ly: py - R - 52,
    };
  }

  const dx = qx - px, dy = qy - py;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / dist, uy = dy / dist;

  const sx = px + ux * R, sy = py + uy * R;
  const ex = qx - ux * R, ey = qy - uy * R;

  // If there's a reverse edge, curve both sides
  const curve = isBack ? 50 : hasReverse ? 40 : 0;
  const perpX = -uy, perpY = ux;
  const sign = isBack ? -1 : 1;

  if (curve === 0) {
    const lx = (sx + ex) / 2, ly = (sy + ey) / 2;
    return { d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}`, lx, ly };
  }
  const cpx = (sx + ex) / 2 + perpX * sign * curve;
  const cpy = (sy + ey) / 2 + perpY * sign * curve;
  return {
    d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
    lx: cpx, ly: cpy,
  };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function DFADiagram({ dfaMap, nameMap, order, startKey, symbols }) {
  const { pos, W, H } = useMemo(() => layout(order), [order]);

  const edges = useMemo(() => buildEdges(order, dfaMap, nameMap), [order, dfaMap, nameMap]);

  // Check which edges have a reverse counterpart
  const edgeKeySet = new Set(edges.map(e => `${e.from}→${e.to}`));

  return (
    <>
      <div className="section-header">DFA Diagram</div>
      <div className="automaton-wrap">
        <svg width={W} height={H} style={{ display: 'block' }}>
          <defs>
            <marker id="dfa-arr" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#666"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          {/* Start arrow */}
          {(() => {
            const sp = pos.get(startKey);
            if (!sp) return null;
            return (
              <g>
                <line
                  x1={sp.x - R - 32} y1={sp.y}
                  x2={sp.x - R - 2}  y2={sp.y}
                  stroke="#666" strokeWidth={1.4}
                  markerEnd="url(#dfa-arr)"
                />
                <text x={sp.x - R - 36} y={sp.y - 6}
                  textAnchor="end" fontSize={10} fill="var(--color-text-secondary)">start</text>
              </g>
            );
          })()}

          {/* Edges */}
          {edges.map((edge, ei) => {
            const fp = pos.get(edge.from), tp = pos.get(edge.to);
            if (!fp || !tp) return null;
            const isSelf = edge.from === edge.to;
            const hasReverse = !isSelf && edgeKeySet.has(`${edge.to}→${edge.from}`);

            // Use BFS order to decide "back" edges
            const fromIdx = order.indexOf(edge.from);
            const toIdx = order.indexOf(edge.to);
            const isBack = toIdx < fromIdx;

            const { d, lx, ly } = circleEdge(fp.x, fp.y, tp.x, tp.y, isSelf, isBack, hasReverse);
            const label = edge.labels.join(', ');
            const labelW = label.length * 6.5 + 8;

            return (
              <g key={ei}>
                <path d={d} fill="none" stroke="#666" strokeWidth={1.3}
                  markerEnd="url(#dfa-arr)" />
                <rect x={lx - labelW / 2} y={ly - 9} width={labelW} height={16}
                  rx="3" fill="var(--color-bg-primary)" />
                <text x={lx} y={ly + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={11} fontFamily="'Menlo','Consolas',monospace"
                  fill="var(--color-text-primary)">
                  {label}
                </text>
              </g>
            );
          })}

          {/* State circles */}
          {order.map(key => {
            const p = pos.get(key);
            if (!p) return null;
            const state = dfaMap.get(key);
            const isStart = key === startKey;
            const isAccept = state?.accepting;
            const name = nameMap.get(key) ?? key;

            const strokeColor = isStart ? '#185FA5' : isAccept ? '#0F6E56' : '#533AB7';
            const strokeW = isStart ? 2 : 1.5;

            return (
              <g key={key}>
                {/* Outer circle */}
                <circle cx={p.x} cy={p.y} r={R}
                  fill="var(--color-bg-secondary)"
                  stroke={strokeColor} strokeWidth={strokeW} />
                {/* Double ring for accepting */}
                {isAccept && (
                  <circle cx={p.x} cy={p.y} r={R - 5}
                    fill="none"
                    stroke={strokeColor} strokeWidth={1} />
                )}
                {/* State label */}
                <text x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
                  fontSize={12} fontWeight={600}
                  fontFamily="'Menlo','Consolas',monospace"
                  fill={strokeColor}>
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
