/**
 * LR item set construction: LR(0), LR(1), LALR.
 */

import { firstOfSequence } from './firstFollow.js';

// ── Key helpers ────────────────────────────────

function key0({ lhs, rhs, dot }) {
  return `${lhs}->${rhs.join('\x00')}@${dot}`;
}

function key1({ lhs, rhs, dot, lookahead }) {
  return `${lhs}->${rhs.join('\x00')}@${dot}/${lookahead}`;
}

function stateKey0(items) {
  return items.map(key0).sort().join('|');
}

function stateKey1(items) {
  return items.map(key1).sort().join('|');
}

// ── LR(0) ──────────────────────────────────────

export function closure0(kernelItems, grammar) {
  const seen = new Set();
  const result = [];

  function add(item) {
    const k = key0(item);
    if (seen.has(k)) return;
    seen.add(k);
    result.push(item);
  }

  for (const it of kernelItems) add(it);

  for (let i = 0; i < result.length; i++) {
    const { rhs, dot } = result[i];
    if (dot >= rhs.length) continue;
    const B = rhs[dot];
    if (B === 'ε') continue; // ε-production: treat as reduce item, nothing to expand
    if (!grammar.nonTerminals.has(B)) continue;

    for (const prod of grammar.productions) {
      if (prod.lhs === B)
        add({ lhs: B, rhs: prod.rhs, dot: 0 });
    }
  }

  return result;
}

export function goto0(items, sym, grammar) {
  const kernel = items
    .filter(it => it.dot < it.rhs.length && it.rhs[it.dot] === sym)
    .map(it => ({ ...it, dot: it.dot + 1 }));
  return kernel.length ? closure0(kernel, grammar) : null;
}

export function buildLR0Collection(augGrammar) {
  const s0 = closure0(
    [{ lhs: augGrammar.startSymbol, rhs: augGrammar.productions[0].rhs, dot: 0 }],
    augGrammar
  );

  const states = [s0];
  const byKey = new Map([[stateKey0(s0), 0]]);
  const transitions = [];

  for (let i = 0; i < states.length; i++) {
    const syms = new Set(
      states[i].filter(it => it.dot < it.rhs.length).map(it => it.rhs[it.dot])
    );
    for (const sym of syms) {
      const next = goto0(states[i], sym, augGrammar);
      if (!next) continue;
      const k = stateKey0(next);
      let j = byKey.has(k) ? byKey.get(k) : (byKey.set(k, states.length), states.push(next), states.length - 1);
      transitions.push({ from: i, symbol: sym, to: j });
    }
  }

  return { states, transitions };
}

// ── LR(1) ──────────────────────────────────────

export function closure1(kernelItems, grammar, firstSets) {
  const seen = new Set();
  const result = [];

  function add(item) {
    const k = key1(item);
    if (seen.has(k)) return;
    seen.add(k);
    result.push(item);
  }

  for (const it of kernelItems) add(it);

  for (let i = 0; i < result.length; i++) {
    const { rhs, dot, lookahead } = result[i];
    if (dot >= rhs.length) continue;
    const B = rhs[dot];
    if (B === 'ε') continue;
    if (!grammar.nonTerminals.has(B)) continue;

    const beta = rhs.slice(dot + 1);
    const laFirst = firstOfSequence([...beta, lookahead], firstSets);

    for (const prod of grammar.productions) {
      if (prod.lhs !== B) continue;
      for (const la of laFirst) {
        if (la !== 'ε') add({ lhs: B, rhs: prod.rhs, dot: 0, lookahead: la });
      }
    }
  }

  return result;
}

export function goto1(items, sym, grammar, firstSets) {
  const kernel = items
    .filter(it => it.dot < it.rhs.length && it.rhs[it.dot] === sym)
    .map(it => ({ ...it, dot: it.dot + 1 }));
  return kernel.length ? closure1(kernel, grammar, firstSets) : null;
}

export function buildLR1Collection(augGrammar, firstSets) {
  const s0 = closure1(
    [{ lhs: augGrammar.startSymbol, rhs: augGrammar.productions[0].rhs, dot: 0, lookahead: '$' }],
    augGrammar,
    firstSets
  );

  const states = [s0];
  const byKey = new Map([[stateKey1(s0), 0]]);
  const transitions = [];

  for (let i = 0; i < states.length; i++) {
    const syms = new Set(
      states[i].filter(it => it.dot < it.rhs.length).map(it => it.rhs[it.dot])
    );
    for (const sym of syms) {
      const next = goto1(states[i], sym, augGrammar, firstSets);
      if (!next) continue;
      const k = stateKey1(next);
      let j = byKey.has(k) ? byKey.get(k) : (byKey.set(k, states.length), states.push(next), states.length - 1);
      transitions.push({ from: i, symbol: sym, to: j });
    }
  }

  return { states, transitions };
}

// ── LALR ───────────────────────────────────────

export function buildLALRCollection(augGrammar, firstSets) {
  const { states: lr1States, transitions: lr1Trans } = buildLR1Collection(augGrammar, firstSets);

  // Group LR(1) states by their LR(0) core
  const coreOf = s => s.map(key0).sort().join('|');

  const coreMap = new Map();   // core string -> [lr1 state indices]
  for (let i = 0; i < lr1States.length; i++) {
    const c = coreOf(lr1States[i]);
    if (!coreMap.has(c)) coreMap.set(c, []);
    coreMap.get(c).push(i);
  }

  // Assign each lr1 state index to a merged (LALR) state index
  const lr1ToLALR = new Array(lr1States.length);
  const lalrStates = [];

  for (const [, idxs] of coreMap) {
    const lalrIdx = lalrStates.length;
    // Collect all items from these lr1 states, merging lookaheads
    const itemMap = new Map(); // key0 -> item with Set of lookaheads
    for (const si of idxs) {
      for (const item of lr1States[si]) {
        const k = key0(item);
        if (!itemMap.has(k)) itemMap.set(k, { ...item, lookaheads: new Set() });
        itemMap.get(k).lookaheads.add(item.lookahead);
      }
      lr1ToLALR[si] = lalrIdx;
    }

    // Expand: one item per lookahead
    const merged = [];
    for (const [, it] of itemMap) {
      for (const la of it.lookaheads)
        merged.push({ lhs: it.lhs, rhs: it.rhs, dot: it.dot, lookahead: la });
    }
    lalrStates.push(merged);
  }

  // Remap transitions
  const seen = new Set();
  const transitions = [];
  for (const { from, symbol, to } of lr1Trans) {
    const mf = lr1ToLALR[from], mt = lr1ToLALR[to];
    const k = `${mf}:${symbol}:${mt}`;
    if (!seen.has(k)) { seen.add(k); transitions.push({ from: mf, symbol, to: mt }); }
  }

  return { states: lalrStates, transitions };
}
