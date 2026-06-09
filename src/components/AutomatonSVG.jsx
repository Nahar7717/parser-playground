import React, { useMemo } from 'react';

// ── Constants ──────────────────────────────────
const STATE_W = 300;
const H_GAP   = 80;
const V_GAP   = 70;
const ITEM_H  = 18;
const HDR_H   = 28;
const PAD_V   = 10;

// Unicode subscript digits
const SUB = '₀₁₂₃₄₅₆₇₈₉';
function sub(n) { return String(n).split('').map(d => SUB[+d] ?? d).join(''); }

// ── Item grouping ──────────────────────────────
// Merge items with same rule/dot, combining their lookaheads
function groupItems(items) {
  const map = new Map();
  for (const item of items) {
    const k = `${item.lhs}\x00${item.rhs.join('\x00')}\x00${item.dot}`;
    if (!map.has(k)) map.set(k, { lhs: item.lhs, rhs: item.rhs, dot: item.dot, las: new Set() });
    if (item.lookahead) map.get(k).las.add(item.lookahead);
  }
  return [...map.values()].map(it => ({
    lhs: it.lhs, rhs: it.rhs, dot: it.dot,
    lookahead: it.las.size ? [...it.las].sort().join('  ') : null,
  }));
}

// ── State height ───────────────────────────────
function stateH(groupedItems) { return HDR_H + groupedItems.length * ITEM_H + PAD_V; }

// ── State type / color ─────────────────────────
function stateType(idx, items, augStart) {
  if (idx === 0) return 'initial';
  const grouped = groupItems(items);
  if (grouped.some(it => it.lhs === augStart && it.dot >= it.rhs.length)) return 'accept';
  const hasReduce = grouped.some(it => it.dot >= it.rhs.length ||
    (it.rhs.length === 1 && it.rhs[0] === 'ε'));
  if (hasReduce) return 'reduce';
  if (grouped.length > 6) return 'large';
  return 'other';
}

const TYPE_STROKE = {
  initial: { stroke: '#185FA5', sw: 2   },
  accept:  { stroke: '#0F6E56', sw: 1.5 },
  reduce:  { stroke: '#993C1D', sw: 1   },
  large:   { stroke: '#7A4F10', sw: 1   },
  other:   { stroke: '#533AB7', sw: 1   },
};

const TYPE_LABEL_COLOR = {
  initial: '#185FA5',
  accept:  '#0F6E56',
  reduce:  '#993C1D',
  large:   '#7A4F10',
  other:   '#533AB7',
};

// ── Layout ─────────────────────────────────────
function bfsLevels(N, transitions) {
  const adj = Array.from({ length: N }, () => []);
  for (const { from, to } of transitions) adj[from].push(to);
  const lvl = new Array(N).fill(-1);
  lvl[0] = 0;
  const q = [0];
  for (let i = 0; i < q.length; i++)
    for (const v of adj[q[i]])
      if (lvl[v] === -1) { lvl[v] = lvl[q[i]] + 1; q.push(v); }
  for (let i = 0; i < N; i++) if (lvl[i] === -1) lvl[i] = 0;
  return lvl;
}

function computeLayout(states, transitions) {
  const N = states.length;
  const grouped = states.map(groupItems);
  const lvl = bfsLevels(N, transitions);

  // Group states by level
  const byLvl = new Map();
  let maxLvl = 0;
  for (let i = 0; i < N; i++) {
    const l = lvl[i];
    if (!byLvl.has(l)) byLvl.set(l, []);
    byLvl.get(l).push(i);
    maxLvl = Math.max(maxLvl, l);
  }

  const MAX_COLS = 3;
  const rows = [];
  for (let l = 0; l <= maxLvl; l++) {
    const ids = byLvl.get(l) || [];
    for (let i = 0; i < ids.length; i += MAX_COLS) rows.push(ids.slice(i, i + MAX_COLS));
  }

  const pos = new Array(N);
  let y = 24;
  for (const row of rows) {
    const rowH = Math.max(...row.map(i => stateH(grouped[i])));
    let x = 24;
    for (const i of row) {
      pos[i] = { x, y, w: STATE_W, h: stateH(grouped[i]) };
      x += STATE_W + H_GAP;
    }
    y += rowH + V_GAP;
  }

  const totalW = Math.max(...pos.filter(Boolean).map(p => p.x + p.w)) + 40;
  const totalH = y + 10;
  return { pos, grouped, totalW, totalH };
}

// ── Border-point helper ────────────────────────
function borderPt(rect, angle) {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const tx = cos !== 0 ? rect.w / 2 / Math.abs(cos) : Infinity;
  const ty = sin !== 0 ? rect.h / 2 / Math.abs(sin) : Infinity;
  const t = Math.min(tx, ty);
  return { x: cx + cos * t, y: cy + sin * t };
}

// ── Edge paths ─────────────────────────────────
function edgePath(from, to, pos, edgeIdx, totalEdges) {
  if (from === to) {
    // Self-loop — small loop above the right side of the state
    const r = pos[from];
    const cx = r.x + r.w * 0.7;
    const cy = r.y;
    return { d: `M ${cx-14} ${cy} C ${cx-18} ${cy-52} ${cx+18} ${cy-52} ${cx+14} ${cy}`, lx: cx, ly: cy - 50 };
  }

  const sr = pos[from], dr = pos[to];
  const angle = Math.atan2(
    dr.y + dr.h / 2 - (sr.y + sr.h / 2),
    dr.x + dr.w / 2 - (sr.x + sr.w / 2)
  );
  const src = borderPt(sr, angle);
  const dst = borderPt(dr, angle + Math.PI);

  // Curvature: offset for parallel edges, extra for backward edges
  const isBack = dr.y + dr.h / 2 < sr.y + sr.h / 2;
  const base = isBack ? 60 : 0;
  const perOffset = (edgeIdx - (totalEdges - 1) / 2) * 32;
  const curve = base + perOffset;

  const mx = (src.x + dst.x) / 2, my = (src.y + dst.y) / 2;
  const perp = angle + Math.PI / 2;
  const cpx = mx + Math.cos(perp) * curve, cpy = my + Math.sin(perp) * curve;

  const d = curve === 0
    ? `M ${src.x.toFixed(1)} ${src.y.toFixed(1)} L ${dst.x.toFixed(1)} ${dst.y.toFixed(1)}`
    : `M ${src.x.toFixed(1)} ${src.y.toFixed(1)} Q ${cpx.toFixed(1)} ${cpy.toFixed(1)} ${dst.x.toFixed(1)} ${dst.y.toFixed(1)}`;

  return { d, lx: curve === 0 ? mx : cpx, ly: curve === 0 ? my : cpy };
}

// ── SVG Item row ───────────────────────────────
function ItemRow({ item, y, stateW }) {
  const before = item.rhs.slice(0, item.dot);
  const after  = item.rhs.slice(item.dot);
  const isEps  = item.rhs.length === 1 && item.rhs[0] === 'ε';

  return (
    <>
      {/* Rule — left aligned */}
      <text
        x={10}
        y={y}
        dominantBaseline="middle"
        fontFamily="'Menlo','Consolas',monospace"
        fontSize={11}
        fill="var(--color-text-primary)"
      >
        {item.lhs} →
        {before.length > 0 && <tspan> {before.join(' ')}</tspan>}
        <tspan> </tspan>
        <tspan fill="#E24B4A" fontWeight="700">•</tspan>
        {!isEps && after.length > 0 && <tspan> {after.join(' ')}</tspan>}
      </text>

      {/* Lookahead — right aligned */}
      {item.lookahead && (
        <text
          x={stateW - 8}
          y={y}
          textAnchor="end"
          dominantBaseline="middle"
          fontFamily="'Menlo','Consolas',monospace"
          fontSize={10}
          fontWeight="600"
          fill="#185FA5"
        >
          {item.lookahead}
        </text>
      )}
    </>
  );
}

// ── Main component ─────────────────────────────
export default function AutomatonSVG({ states, transitions, augGrammar, method, mergedNames }) {
  const { pos, grouped, totalW, totalH } = useMemo(
    () => computeLayout(states, transitions),
    [states, transitions]
  );

  const augStart = augGrammar.startSymbol;

  // Build incoming-transition map for header labels
  const incoming = useMemo(() => {
    const m = new Map();
    for (const t of transitions) {
      if (!m.has(t.to)) m.set(t.to, t); // first incoming edge per state
    }
    return m;
  }, [transitions]);

  // Group parallel edges for curvature
  const edgeMeta = useMemo(() => {
    const count = new Map(), idx = new Map();
    for (const t of transitions) {
      const k = `${t.from}→${t.to}`;
      count.set(k, (count.get(k) || 0) + 1);
    }
    return transitions.map(t => {
      const k = `${t.from}→${t.to}`;
      const i = idx.get(k) || 0;
      idx.set(k, i + 1);
      return { ...t, edgeIdx: i, totalEdges: count.get(k) };
    });
  }, [transitions]);

  return (
    <>
      <div className="section-header">Automaton Diagram</div>
      <div className="automaton-wrap">
        <svg width={totalW} height={totalH} style={{ display: 'block' }}>
          <defs>
            {/* Open chevron arrowhead — matches the reference style */}
            <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="#666"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          </defs>

          {/* ── Edges ── */}
          {edgeMeta.map((edge, ei) => {
            const p = edgePath(edge.from, edge.to, pos, edge.edgeIdx, edge.totalEdges);
            const labelW = edge.symbol.length * 6.6 + 8;
            return (
              <g key={ei}>
                <path d={p.d} fill="none" stroke="#666" strokeWidth="1.2" markerEnd="url(#arr)" />
                <rect x={p.lx - labelW / 2} y={p.ly - 9} width={labelW} height={16}
                  rx="3" fill="var(--color-bg-primary)" />
                <text x={p.lx} y={p.ly + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={11.5} fontFamily="'Menlo','Consolas',monospace"
                  fill="var(--color-text-primary)">
                  {edge.symbol}
                </text>
              </g>
            );
          })}

          {/* ── State boxes ── */}
          {states.map((items, i) => {
            const p = pos[i];
            if (!p) return null;
            const type = stateType(i, items, augStart);
            const { stroke, sw } = TYPE_STROKE[type];
            const labelColor = TYPE_LABEL_COLOR[type];
            const grp = grouped[i];
            const inc = incoming.get(i);

            // Header label: I₀ or I₆₉ (LALR merged) — goto(...)
            const rawName = mergedNames?.[i] ?? String(i);
            const stateLabel = 'I' + [...rawName].map(d => sub(+d)).join('');
            let headerLabel = stateLabel;
            if (type === 'accept') headerLabel = `${stateLabel}  —  accept`;
            else if (inc) {
              const incRaw = mergedNames?.[inc.from] ?? String(inc.from);
              const incLabel = 'I' + [...incRaw].map(d => sub(+d)).join('');
              headerLabel = `${stateLabel}  —  goto(${incLabel}, ${inc.symbol})`;
            }

            return (
              <g key={i} transform={`translate(${p.x},${p.y})`}>
                {/* Box */}
                <rect width={p.w} height={p.h} rx={10}
                  fill="var(--color-bg-secondary)"
                  stroke={stroke} strokeWidth={sw} />

                {/* Header */}
                <text
                  x={p.w / 2} y={HDR_H / 2 + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={11.5} fontWeight={600}
                  fill={labelColor}
                  fontFamily="system-ui,sans-serif"
                >
                  {headerLabel}
                </text>

                {/* Divider */}
                <line x1={0} y1={HDR_H} x2={p.w} y2={HDR_H}
                  stroke="var(--color-border)" strokeWidth={0.5} />

                {/* Items */}
                {grp.map((item, j) => (
                  <ItemRow
                    key={j}
                    item={item}
                    y={HDR_H + j * ITEM_H + ITEM_H / 2 + 2}
                    stateW={p.w}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}
