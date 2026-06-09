/**
 * DFADiagram — circle-based DFA SVG, shared by DirectDFA and SubsetConstruction.
 */
import React, { useMemo } from 'react';

const R       = 38;
const COLS    = 5;
const COL_GAP = 220;
const ROW_GAP = 220;
const PAD_X   = 90;
const PAD_BOT = 60;

// ── Bezier helpers ────────────────────────────────────────────────────────────
function quadAt(t, p0, p1, p2) {
  const m = 1 - t;
  return m * m * p0 + 2 * m * t * p1 + t * t * p2;
}

// ── Layout ────────────────────────────────────────────────────────────────────
function layout(order, topPad) {
  const pos = new Map();
  order.forEach((key, idx) => {
    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    pos.set(key, { x: PAD_X + col * COL_GAP, y: topPad + row * ROW_GAP });
  });
  const last = order.length - 1;
  const W = PAD_X + Math.min(last, COLS - 1) * COL_GAP + PAD_X;
  const H = topPad + Math.floor(last / COLS) * ROW_GAP + PAD_BOT;
  return { pos, W: Math.max(W, PAD_X * 2 + COL_GAP), H };
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

// ── Edge geometry ─────────────────────────────────────────────────────────────
function edgeGeom(px, py, qx, qy, isSelf, fromIdx, toIdx, hasReverse) {
  const gap = Math.abs(fromIdx - toIdx);

  // Self-loop — arc above the node
  if (isSelf) {
    const loopH = 72;
    const sx = px - 18, sy = py - R;
    const ex = px + 18, ey = py - R;
    const c1x = px - 55, c1y = py - R - loopH;
    const c2x = px + 55, c2y = py - R - loopH;
    // label at peak of loop
    const lx = px, ly = py - R - loopH - 6;
    return {
      d: `M ${sx} ${sy} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${ey}`,
      lx, ly,
    };
  }

  const isBack = toIdx < fromIdx;
  const ux = (qx - px) / Math.abs(qx - px);   // +1 forward, -1 back
  const sx = px + ux * R;                        // exit point of source
  const ex = qx - ux * R;                        // entry point of dest
  const mx = (sx + ex) / 2;

  if (isBack) {
    // Arc upward; height grows with gap so arcs don't cross
    const arcH = 52 + gap * 38;
    const cpx  = mx;
    const cpy  = py - arcH;

    // Place label at t=0.72 (close to destination) so label is near arrowhead
    const t   = 0.72;
    const lx  = quadAt(t, sx, cpx, ex);
    const ly  = quadAt(t, py, cpy, py) - 14;   // 14px above the arc line

    return {
      d: `M ${sx.toFixed(1)} ${py.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${ex.toFixed(1)} ${py.toFixed(1)}`,
      lx, ly,
    };
  }

  if (hasReverse) {
    // Curve gently downward to separate from its opposing back-arc
    const arcH = 38;
    const cpx  = mx;
    const cpy  = py + arcH;
    const t    = 0.5;
    const lx   = quadAt(t, sx, cpx, ex);
    const ly   = quadAt(t, py, cpy, py) + 14;  // 14px below arc
    return {
      d: `M ${sx.toFixed(1)} ${py.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${ex.toFixed(1)} ${py.toFixed(1)}`,
      lx, ly,
    };
  }

  // Straight forward edge — label above midpoint
  return {
    d: `M ${sx.toFixed(1)} ${py.toFixed(1)} L ${ex.toFixed(1)} ${py.toFixed(1)}`,
    lx: mx, ly: py - 16,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DFADiagram({ dfaMap, nameMap, order, startKey }) {
  const edges      = useMemo(() => buildEdges(order, dfaMap), [order, dfaMap]);
  const edgeKeySet = new Set(edges.map(e => `${e.from}→${e.to}`));

  // Compute top padding = height of tallest back-arc (+ label clearance)
  const topPad = useMemo(() => {
    let maxArc = 80;  // minimum for self-loops
    for (const e of edges) {
      const fi = order.indexOf(e.from), ti = order.indexOf(e.to);
      if (e.from === e.to) { maxArc = Math.max(maxArc, 80); continue; }
      if (ti < fi) {
        const arcH = 52 + Math.abs(fi - ti) * 38;
        maxArc = Math.max(maxArc, arcH + 30);
      }
    }
    return maxArc + 24;
  }, [edges, order]);

  // Bottom padding for downward-curving bidirectional edges
  const botPad = useMemo(() => {
    let extra = PAD_BOT;
    for (const e of edges) {
      const hasRev = edgeKeySet.has(`${e.to}→${e.from}`);
      if (hasRev && order.indexOf(e.to) > order.indexOf(e.from)) { extra = Math.max(extra, 90); }
    }
    return extra;
  }, [edges, edgeKeySet, order]);

  const { pos, W, H } = useMemo(
    () => layout(order, topPad),
    [order, topPad]
  );
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
                <line x1={sp.x - R - 40} y1={sp.y} x2={sp.x - R - 2} y2={sp.y}
                  stroke="#888" strokeWidth={1.6} markerEnd="url(#dfa-arr)" />
                <text x={sp.x - R - 44} y={sp.y - 8}
                  textAnchor="end" fontSize={10} fill="var(--color-text-secondary)">start</text>
              </g>
            );
          })()}

          {/* Edges */}
          {edges.map((edge, ei) => {
            const fp = pos.get(edge.from), tp = pos.get(edge.to);
            if (!fp || !tp) return null;
            const isSelf     = edge.from === edge.to;
            const fromIdx    = order.indexOf(edge.from);
            const toIdx      = order.indexOf(edge.to);
            const hasReverse = !isSelf && edgeKeySet.has(`${edge.to}→${edge.from}`);
            const { d, lx, ly } = edgeGeom(fp.x, fp.y, tp.x, tp.y, isSelf, fromIdx, toIdx, hasReverse);
            const label  = edge.labels.join(', ');
            const labelW = label.length * 8 + 14;

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

          {/* Nodes — on top */}
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
                  fill="var(--color-bg-secondary)" stroke={color}
                  strokeWidth={isStart ? 2.5 : 1.8} />
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
