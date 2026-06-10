/**
 * Parsing table construction (SLR, CLR/LALR) and LR parse trace.
 */

// ── Table construction ─────────────────────────

function makeActionGoto(nStates) {
  return {
    action: Array.from({ length: nStates }, () => new Map()),
    goto: Array.from({ length: nStates }, () => new Map()),
    conflicts: [],
  };
}

function addAction(tables, state, sym, entry) {
  const cell = tables.action[state];
  if (!cell.has(sym)) cell.set(sym, []);
  const list = cell.get(sym);
  const str = JSON.stringify(entry);
  if (list.some(e => JSON.stringify(e) === str)) return;
  list.push(entry);
  if (list.length > 1) {
    const type = list.some(e => e.type === 'shift') ? 's/r' : 'r/r';
    const existing = tables.conflicts.find(c => c.state === state && c.sym === sym);
    if (!existing) tables.conflicts.push({ state, sym, type, entries: list });
  }
}

export function buildSLRTable(augGrammar, states, transitions, followSets) {
  const { nonTerminals, startSymbol, productions } = augGrammar;
  const tables = makeActionGoto(states.length);

  // Shifts and GOTO from transitions
  for (const { from, symbol, to } of transitions) {
    if (nonTerminals.has(symbol)) {
      tables.goto[from].set(symbol, to);
    } else {
      addAction(tables, from, symbol, { type: 'shift', state: to });
    }
  }

  // Reduces and accept
  for (let i = 0; i < states.length; i++) {
    for (const item of states[i]) {
      const atEnd = item.dot >= item.rhs.length ||
        (item.rhs.length === 1 && item.rhs[0] === 'ε');
      if (!atEnd) continue;

      if (item.lhs === startSymbol) {
        addAction(tables, i, '$', { type: 'accept' });
        continue;
      }

      const prodIdx = productions.findIndex(
        p => p.lhs === item.lhs && p.rhs.join('\x00') === item.rhs.join('\x00')
      );

      for (const a of (followSets.get(item.lhs) || [])) {
        addAction(tables, i, a, { type: 'reduce', lhs: item.lhs, rhs: item.rhs, prodIdx });
      }
    }
  }

  return tables;
}

export function buildLR1Table(augGrammar, states, transitions) {
  const { nonTerminals, startSymbol, productions } = augGrammar;
  const tables = makeActionGoto(states.length);

  for (const { from, symbol, to } of transitions) {
    if (nonTerminals.has(symbol)) {
      tables.goto[from].set(symbol, to);
    } else {
      addAction(tables, from, symbol, { type: 'shift', state: to });
    }
  }

  for (let i = 0; i < states.length; i++) {
    for (const item of states[i]) {
      const atEnd = item.dot >= item.rhs.length ||
        (item.rhs.length === 1 && item.rhs[0] === 'ε');
      if (!atEnd) continue;

      if (item.lhs === startSymbol) {
        addAction(tables, i, '$', { type: 'accept' });
        continue;
      }

      const prodIdx = productions.findIndex(
        p => p.lhs === item.lhs && p.rhs.join('\x00') === item.rhs.join('\x00')
      );

      addAction(tables, i, item.lookahead, { type: 'reduce', lhs: item.lhs, rhs: item.rhs, prodIdx });
    }
  }

  return tables;
}

// ── LR parse trace ─────────────────────────────

export function parseLR(augGrammar, tables, inputStr) {
  const tokens = inputStr.trim().split(/\s+/).filter(Boolean);
  tokens.push('$');

  const stateStack = [0];
  const symStack = [];
  let ip = 0;
  const steps = [];
  let step = 0;

  while (step < 500) {
    const state = stateStack[stateStack.length - 1];
    const a = tokens[ip] ?? '$';

    // Interleave states and symbols: 0 c 3 d 4  (like textbook)
    function interleaved(states, syms) {
      const parts = [];
      for (let i = 0; i < states.length; i++) {
        if (i > 0) parts.push(syms[i - 1]);
        parts.push(states[i]);
      }
      return parts.join(' ');
    }

    const stackStr = interleaved(stateStack, symStack);
    const remStr = tokens.slice(ip).join(' ');

    const actions = tables.action[state]?.get(a);

    if (!actions || actions.length === 0) {
      steps.push({
        step: ++step, stack: stackStr, remaining: remStr,
        action: `Error: no action for (${state}, ${a})`, type: 'error',
      });
      break;
    }

    const act = actions[0];

    if (act.type === 'accept') {
      steps.push({ step: ++step, stack: stackStr, remaining: remStr, action: 'Accept', type: 'accept' });
      break;
    }

    if (act.type === 'shift') {
      steps.push({
        step: ++step, stack: stackStr, remaining: remStr,
        action: `Shift  s${act.state}`, type: 'shift',
      });
      symStack.push(a);
      stateStack.push(act.state);
      ip++;
    } else if (act.type === 'reduce') {
      const { lhs, rhs } = act;
      const realLen = (rhs.length === 1 && rhs[0] === 'ε') ? 0 : rhs.length;

      steps.push({
        step: ++step, stack: stackStr, remaining: remStr,
        action: `Reduce  ${lhs} → ${rhs.join(' ')}`, type: 'reduce',
      });

      for (let k = 0; k < realLen; k++) { stateStack.pop(); symStack.pop(); }

      const top = stateStack[stateStack.length - 1];
      const next = tables.goto[top]?.get(lhs);
      if (next === undefined) {
        steps.push({
          step: ++step, stack: interleaved(stateStack, symStack), remaining: remStr,
          action: `Error: no GOTO(${top}, ${lhs})`, type: 'error',
        });
        break;
      }
      symStack.push(lhs);
      stateStack.push(next);
    }
  }

  return steps;
}
