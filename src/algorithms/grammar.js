/**
 * Grammar utilities: parsing, augmentation, helpers.
 */

export function parseGrammar(text) {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'));

  const productions = [];

  for (const line of lines) {
    const arrowIdx = line.indexOf('->');
    if (arrowIdx === -1) continue;

    const lhs = line.slice(0, arrowIdx).trim();
    const rhsPart = line.slice(arrowIdx + 2).trim();
    if (!lhs || !rhsPart) continue;

    for (const alt of rhsPart.split('|')) {
      const rawTokens = alt.trim().split(/\s+/).filter(Boolean);
      if (!rawTokens.length) continue;
      const rhs = rawTokens.map(t =>
        t === 'eps' || t === 'epsilon' ? 'ε' : t
      );
      productions.push({ lhs, rhs });
    }
  }

  if (!productions.length) return null;

  const nonTerminals = new Set(productions.map(p => p.lhs));
  const terminals = new Set();
  for (const { rhs } of productions)
    for (const s of rhs)
      if (s !== 'ε' && !nonTerminals.has(s)) terminals.add(s);

  return {
    productions,
    nonTerminals,
    terminals,
    startSymbol: productions[0].lhs,
  };
}

export function augmentGrammar(grammar) {
  let newStart = grammar.startSymbol + "'";
  while (grammar.nonTerminals.has(newStart)) newStart += "'";

  const augProd = { lhs: newStart, rhs: [grammar.startSymbol] };
  return {
    productions: [augProd, ...grammar.productions],
    nonTerminals: new Set([newStart, ...grammar.nonTerminals]),
    terminals: new Set(grammar.terminals),
    startSymbol: newStart,
  };
}

export function productionString(p) {
  return `${p.lhs} → ${p.rhs.join(' ')}`;
}
