/**
 * Subset construction: NFA → DFA
 */

function setKey(states) {
  return [...states].sort().join(',');
}

function epsilonClosure(startStates, transitions) {
  const closure = new Set(startStates);
  const stack = [...startStates];
  while (stack.length) {
    const s = stack.pop();
    const epsTrans = transitions[s]?.['ε'] ?? transitions[s]?.['eps'] ?? [];
    for (const t of epsTrans) {
      if (!closure.has(t)) { closure.add(t); stack.push(t); }
    }
  }
  return closure;
}

function move(states, symbol, transitions) {
  const result = new Set();
  for (const s of states) {
    const targets = transitions[s]?.[symbol] ?? [];
    for (const t of targets) result.add(t);
  }
  return result;
}

export function solveSubset({ nfaStates, symbols, startState, acceptStates, transitions }) {
  // Build epsilon closures for each individual NFA state (for the ε-closure table)
  const closureMap = new Map(); // stateId → Set
  for (const s of nfaStates) {
    closureMap.set(s, epsilonClosure([s], transitions));
  }

  // Subset construction
  const startClosure = epsilonClosure([startState], transitions);
  const startKey = setKey(startClosure);
  const acceptSet = new Set(acceptStates);

  const dfaMap = new Map();   // key → { states: Set, transitions: Map<sym,key>, accepting: bool }
  const nameMap = new Map();  // key → 'A','B',...
  const order = [startKey];
  nameMap.set(startKey, 'A');
  let nc = 0;

  dfaMap.set(startKey, {
    states: startClosure,
    transitions: new Map(),
    accepting: [...startClosure].some(s => acceptSet.has(s)),
  });

  // Subset construction table rows for display
  const constructionRows = [];

  const queue = [startClosure];
  while (queue.length) {
    const cur = queue.shift();
    const curKey = setKey(cur);
    const rowTrans = {};

    for (const sym of symbols) {
      const moved = move(cur, sym, transitions);
      if (!moved.size) { rowTrans[sym] = null; continue; }
      const closed = epsilonClosure([...moved], transitions);
      const nxtKey = setKey(closed);
      rowTrans[sym] = nxtKey;

      if (!dfaMap.has(nxtKey)) {
        const letter = String.fromCharCode(65 + (++nc));
        nameMap.set(nxtKey, letter);
        order.push(nxtKey);
        dfaMap.set(nxtKey, {
          states: closed,
          transitions: new Map(),
          accepting: [...closed].some(s => acceptSet.has(s)),
        });
        queue.push(closed);
      }
      dfaMap.get(curKey).transitions.set(sym, nxtKey);
    }

    constructionRows.push({ key: curKey, states: cur, transitions: rowTrans });
  }

  return {
    method: 'SubsetConstr',
    closureMap,
    dfaMap,
    nameMap,
    order,
    startKey,
    symbols,
    nfaStates,
    startState,
    acceptStates,
    constructionRows,
  };
}
