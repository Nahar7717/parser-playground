/**
 * LL(1): left factoring, table construction, parse trace with panic recovery.
 */

import { computeFirst, computeFollow, firstOfSequence } from './firstFollow.js';

// ── Left factoring ─────────────────────────────

export function leftFactor(grammar) {
  const allNTs = new Set(grammar.nonTerminals);

  function freshNT(base) {
    let name = base + "'";
    while (allNTs.has(name)) name += "'";
    allNTs.add(name);
    return name;
  }

  let productions = [...grammar.productions];
  let changed = true;

  while (changed) {
    changed = false;
    const byLHS = new Map();
    const order = [];

    for (const p of productions) {
      if (!byLHS.has(p.lhs)) { byLHS.set(p.lhs, []); order.push(p.lhs); }
      byLHS.get(p.lhs).push(p.rhs);
    }

    const newProds = [];

    for (const lhs of order) {
      const rhsList = byLHS.get(lhs);

      // Group by first symbol
      const groups = new Map();
      const gOrder = [];
      for (const rhs of rhsList) {
        const k = rhs[0];
        if (!groups.has(k)) { groups.set(k, []); gOrder.push(k); }
        groups.get(k).push(rhs);
      }

      for (const sym of gOrder) {
        const group = groups.get(sym);
        if (group.length === 1) {
          newProds.push({ lhs, rhs: group[0] });
          continue;
        }

        // Common prefix length
        let lcpLen = group[0].length;
        for (const rhs of group) {
          let i = 0;
          while (i < lcpLen && i < rhs.length && rhs[i] === group[0][i]) i++;
          lcpLen = i;
        }

        if (lcpLen === 0) {
          for (const rhs of group) newProds.push({ lhs, rhs });
          continue;
        }

        changed = true;
        const lcp = group[0].slice(0, lcpLen);
        const newNT = freshNT(lhs);
        newProds.push({ lhs, rhs: [...lcp, newNT] });

        for (const rhs of group) {
          const rem = rhs.slice(lcpLen);
          newProds.push({ lhs: newNT, rhs: rem.length ? rem : ['ε'] });
        }
      }
    }

    productions = newProds;
  }

  const nonTerminals = new Set(productions.map(p => p.lhs));
  const terminals = new Set();
  for (const { rhs } of productions)
    for (const s of rhs)
      if (s !== 'ε' && !nonTerminals.has(s)) terminals.add(s);

  return { ...grammar, productions, nonTerminals, terminals };
}

// ── LL(1) table ────────────────────────────────

export function buildLL1Table(grammar, firstSets, followSets) {
  // Returns Map<NT, Map<terminal, rhs[]>>
  // Multiple entries indicate a conflict.
  const table = new Map();
  const conflicts = [];

  for (const nt of grammar.nonTerminals) table.set(nt, new Map());

  for (const { lhs, rhs } of grammar.productions) {
    const row = table.get(lhs);
    const firstAlpha = firstOfSequence(rhs, firstSets);

    function addEntry(terminal, r) {
      if (!row.has(terminal)) row.set(terminal, []);
      const list = row.get(terminal);
      const str = r.join('\x00');
      if (list.some(x => x.join('\x00') === str)) return;
      list.push(r);
      if (list.length > 1) {
        const ex = conflicts.find(c => c.nt === lhs && c.terminal === terminal);
        if (!ex) conflicts.push({ nt: lhs, terminal, entries: list });
      }
    }

    for (const a of firstAlpha) {
      if (a !== 'ε') addEntry(a, rhs);
    }

    if (firstAlpha.has('ε')) {
      for (const b of (followSets.get(lhs) || [])) {
        addEntry(b, rhs);
      }
    }
  }

  return { table, conflicts };
}

// ── LL(1) parse trace ──────────────────────────

export function parseLL1(grammar, table, inputStr) {
  const tokens = inputStr.trim().split(/\s+/).filter(Boolean);
  tokens.push('$');

  // Stack: top = last element
  const stack = ['$', grammar.startSymbol];
  let ip = 0;
  const steps = [];
  let step = 0;

  while (step < 500) {
    const top = stack[stack.length - 1];
    const a = tokens[ip] ?? '$';

    // Display stack top-to-bottom (reverse for display)
    const stackStr = [...stack].reverse().join(' ');
    const remStr = tokens.slice(ip).join(' ');

    if (top === '$' && a === '$') {
      steps.push({ step: ++step, stack: stackStr, remaining: remStr, action: 'Accept', type: 'accept' });
      break;
    }

    if (grammar.nonTerminals.has(top)) {
      const row = table.get(top);
      const prods = row?.get(a);
      if (prods && prods.length > 0) {
        const rhs = prods[0];
        const rhsStr = rhs[0] === 'ε' ? 'ε' : rhs.join(' ');
        steps.push({
          step: ++step, stack: stackStr, remaining: remStr,
          action: `${top} → ${rhsStr}`, type: 'predict',
        });
        stack.pop();
        if (rhs[0] !== 'ε') for (let i = rhs.length - 1; i >= 0; i--) stack.push(rhs[i]);
      } else {
        // Panic: no rule — pop non-terminal
        steps.push({
          step: ++step, stack: stackStr, remaining: remStr,
          action: `Error: no rule for ${top} on "${a}" — pop ${top}`, type: 'panic',
        });
        stack.pop();
      }
    } else if (top === a) {
      steps.push({
        step: ++step, stack: stackStr, remaining: remStr,
        action: `Match  ${a}`, type: 'match',
      });
      stack.pop();
      ip++;
    } else {
      // Panic: terminal mismatch — discard input symbol
      steps.push({
        step: ++step, stack: stackStr, remaining: remStr,
        action: `Error: expected "${top}", got "${a}" — discard ${a}`, type: 'panic',
      });
      ip++;
    }
  }

  return steps;
}

// ── Full LL(1) solve ───────────────────────────

export function solveLL1(grammar, inputStr) {
  const factored = leftFactor(grammar);
  const firstSets = computeFirst(factored);
  const followSets = computeFollow(factored, firstSets);
  const { table, conflicts } = buildLL1Table(factored, firstSets, followSets);
  const trace = inputStr ? parseLL1(factored, table, inputStr) : null;

  return { factored, firstSets, followSets, table, conflicts, trace };
}
