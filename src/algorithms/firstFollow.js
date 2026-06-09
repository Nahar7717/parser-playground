/**
 * FIRST and FOLLOW set computation.
 */

export function firstOfSequence(sequence, firstSets) {
  if (!sequence || sequence.length === 0) return new Set(['ε']);

  const result = new Set();
  let allEpsilon = true;

  for (const sym of sequence) {
    if (sym === 'ε') continue;
    const f = firstSets.get(sym);
    if (!f) {
      // Unknown symbol — treat as terminal whose FIRST = itself
      result.add(sym);
      allEpsilon = false;
      break;
    }
    for (const x of f) if (x !== 'ε') result.add(x);
    if (!f.has('ε')) { allEpsilon = false; break; }
  }

  if (allEpsilon) result.add('ε');
  return result;
}

export function computeFirst(grammar) {
  const { productions, nonTerminals, terminals } = grammar;
  const first = new Map();

  for (const t of terminals) first.set(t, new Set([t]));
  first.set('$', new Set(['$']));
  first.set('ε', new Set(['ε']));
  for (const nt of nonTerminals) first.set(nt, new Set());

  let changed = true;
  while (changed) {
    changed = false;
    for (const { lhs, rhs } of productions) {
      const lhsSet = first.get(lhs);
      const before = lhsSet.size;

      if (rhs.length === 1 && rhs[0] === 'ε') {
        lhsSet.add('ε');
      } else {
        let allEps = true;
        for (const sym of rhs) {
          const sf = first.get(sym);
          if (!sf) { lhsSet.add(sym); allEps = false; break; }
          for (const x of sf) if (x !== 'ε') lhsSet.add(x);
          if (!sf.has('ε')) { allEps = false; break; }
        }
        if (allEps) lhsSet.add('ε');
      }

      if (lhsSet.size !== before) changed = true;
    }
  }

  return first;
}

export function computeFollow(grammar, firstSets) {
  const { productions, nonTerminals, startSymbol } = grammar;
  const follow = new Map();
  for (const nt of nonTerminals) follow.set(nt, new Set());
  follow.get(startSymbol).add('$');

  let changed = true;
  while (changed) {
    changed = false;
    for (const { lhs, rhs } of productions) {
      for (let i = 0; i < rhs.length; i++) {
        const B = rhs[i];
        if (!nonTerminals.has(B)) continue;

        const bFollow = follow.get(B);
        const before = bFollow.size;
        const beta = rhs.slice(i + 1);

        if (beta.length === 0) {
          for (const f of follow.get(lhs)) bFollow.add(f);
        } else {
          const betaFirst = firstOfSequence(beta, firstSets);
          for (const f of betaFirst) if (f !== 'ε') bFollow.add(f);
          if (betaFirst.has('ε'))
            for (const f of follow.get(lhs)) bFollow.add(f);
        }

        if (bFollow.size !== before) changed = true;
      }
    }
  }

  return follow;
}
