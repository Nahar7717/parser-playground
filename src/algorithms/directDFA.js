/**
 * Direct DFA construction from regex via syntax tree.
 * Steps: parse → augment → annotate (nullable/firstpos/lastpos) → followpos → DFA
 */

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
export function subNum(n) { return String(n).split('').map(d => SUBS[+d] ?? d).join(''); }

function setKey(s) { return [...s].sort((a,b) => a-b).join(','); }

// ── Regex Parser ───────────────────────────────────────────────────────────

class RegexParser {
  constructor(raw) {
    this.s = raw.replace(/\s/g, '');
    this.i = 0;
    this.posCount = 0;
    this.posSymbol = new Map(); // pos → symbol char
  }

  peek() { return this.i < this.s.length ? this.s[this.i] : null; }
  eat()  { return this.s[this.i++]; }

  // expr := term ('|' term)*
  expr() {
    let n = this.term();
    while (this.peek() === '|') { this.eat(); n = { t:'alt', c1:n, c2:this.term() }; }
    return n;
  }

  // term := factor factor*  (implicit concat)
  term() {
    let n = this.factor();
    const stop = new Set([')', '|', null]);
    while (!stop.has(this.peek())) { n = { t:'cat', c1:n, c2:this.factor() }; }
    return n;
  }

  // factor := atom ( '*' | '+' | '?' )*
  factor() {
    let n = this.atom();
    while ('*+?'.includes(this.peek())) {
      const op = this.eat();
      if      (op === '*') n = { t:'star', c:n };
      else if (op === '+') n = { t:'plus', c:n };
      else                 n = { t:'opt',  c:n };
    }
    return n;
  }

  // atom := '(' expr ')' | char
  atom() {
    const c = this.peek();
    if (c === '(') {
      this.eat();
      const n = this.expr();
      if (this.peek() === ')') this.eat();
      return n;
    }
    if (!c || ')|*+?'.includes(c)) throw new Error(`Unexpected: "${c ?? 'EOF'}"`);
    this.eat();
    const pos = ++this.posCount;
    this.posSymbol.set(pos, c);
    return { t:'leaf', sym:c, pos };
  }
}

// ── Tree annotation: nullable, firstpos (fp), lastpos (lp) ────────────────

function annotate(n) {
  switch (n.t) {
    case 'leaf':
      n.nullable = false;
      n.fp = new Set([n.pos]);
      n.lp = new Set([n.pos]);
      break;
    case 'star':
    case 'opt':
      annotate(n.c);
      n.nullable = true;
      n.fp = new Set(n.c.fp);
      n.lp = new Set(n.c.lp);
      break;
    case 'plus':
      annotate(n.c);
      n.nullable = n.c.nullable;
      n.fp = new Set(n.c.fp);
      n.lp = new Set(n.c.lp);
      break;
    case 'alt':
      annotate(n.c1); annotate(n.c2);
      n.nullable = n.c1.nullable || n.c2.nullable;
      n.fp = new Set([...n.c1.fp, ...n.c2.fp]);
      n.lp = new Set([...n.c1.lp, ...n.c2.lp]);
      break;
    case 'cat':
      annotate(n.c1); annotate(n.c2);
      n.nullable = n.c1.nullable && n.c2.nullable;
      n.fp = n.c1.nullable ? new Set([...n.c1.fp, ...n.c2.fp]) : new Set(n.c1.fp);
      n.lp = n.c2.nullable ? new Set([...n.c1.lp, ...n.c2.lp]) : new Set(n.c2.lp);
      break;
  }
}

// ── Followpos ──────────────────────────────────────────────────────────────

function buildFollowpos(n, fp) {
  if (n.t === 'cat') {
    buildFollowpos(n.c1, fp);
    buildFollowpos(n.c2, fp);
    for (const i of n.c1.lp)
      for (const j of n.c2.fp)
        fp.get(i).add(j);
  } else if (n.t === 'star' || n.t === 'plus') {
    buildFollowpos(n.c, fp);
    for (const i of n.lp)
      for (const j of n.fp)
        fp.get(i).add(j);
  } else if (n.t === 'alt' || n.t === 'opt') {
    if (n.c1) buildFollowpos(n.c1, fp);
    if (n.c2) buildFollowpos(n.c2, fp);
    if (n.c)  buildFollowpos(n.c,  fp);
  }
}

// ── Tree layout (for SVG) ──────────────────────────────────────────────────

const NODE_W = 90;  // horizontal spacing per leaf unit
const LEVEL_H = 110; // vertical spacing per level
const NODE_R = 26;  // circle radius

function countLeaves(n) {
  if (n.t === 'leaf') return 1;
  let c = 0;
  for (const k of ['c1','c2','c']) if (n[k]) c += countLeaves(n[k]);
  return c || 1;
}

function layoutNode(n, xLeft, depth) {
  const children = ['c1','c2','c'].map(k => n[k]).filter(Boolean);
  if (children.length === 0) {
    n._w = NODE_W;
    n._x = xLeft + NODE_W / 2;
    n._y = depth * LEVEL_H + NODE_R + 24;
    return;
  }
  let cx = xLeft;
  for (const ch of children) {
    ch._leafW = countLeaves(ch) * NODE_W;
    layoutNode(ch, cx, depth + 1);
    cx += ch._leafW;
  }
  n._w = cx - xLeft;
  n._x = (children[0]._x + children[children.length-1]._x) / 2;
  n._y = depth * LEVEL_H + NODE_R + 24;
}

function collectNodes(n, arr = []) {
  arr.push(n);
  for (const k of ['c1','c2','c']) if (n[k]) collectNodes(n[k], arr);
  return arr;
}

function collectEdges(n, arr = []) {
  for (const k of ['c1','c2','c']) {
    if (n[k]) { arr.push({ from:n, to:n[k] }); collectEdges(n[k], arr); }
  }
  return arr;
}

// ── Main solver ────────────────────────────────────────────────────────────

export function solveDirectDFA(regexStr) {
  if (!regexStr.trim()) throw new Error('Enter a regular expression.');

  const p = new RegexParser(regexStr.trim());
  let regTree;
  try {
    regTree = p.expr();
    if (p.i < p.s.length) throw new Error(`Unexpected "${p.s[p.i]}"`);
  } catch (e) {
    throw new Error('Regex parse error: ' + e.message);
  }

  // Augment: root = cat(regTree, #)
  const endPos = p.posCount + 1;
  const endLeaf = { t:'leaf', sym:'#', pos:endPos };
  p.posSymbol.set(endPos, '#');
  const root = { t:'cat', c1:regTree, c2:endLeaf };

  annotate(root);

  // followpos
  const fpMap = new Map();
  for (let i = 1; i <= endPos; i++) fpMap.set(i, new Set());
  buildFollowpos(root, fpMap);

  // Layout tree
  layoutNode(root, 10, 0);
  const treeNodes = collectNodes(root);
  const treeEdges = collectEdges(root);
  const treeW = root._w + 40;
  const treeH = Math.max(...treeNodes.map(n => n._y)) + 60;

  const posSymbol = p.posSymbol;
  const symbols = [...new Set([...posSymbol.values()].filter(s => s !== '#'))].sort();

  // Build DFA
  const startSet  = new Set(root.fp);
  const startKey  = setKey(startSet);
  const dfaMap    = new Map();
  const nameMap   = new Map([[startKey, 'S0']]);
  const order     = [startKey];
  let nc = 0;

  dfaMap.set(startKey, { positions: startSet, transitions: new Map(), accepting: startSet.has(endPos) });

  const queue = [startSet];
  while (queue.length) {
    const cur    = queue.shift();
    const curKey = setKey(cur);

    for (const sym of symbols) {
      const nxt = new Set();
      for (const pos of cur)
        if (posSymbol.get(pos) === sym)
          for (const f of fpMap.get(pos)) nxt.add(f);
      if (!nxt.size) continue;

      const nxtKey = setKey(nxt);
      if (!dfaMap.has(nxtKey)) {
        nameMap.set(nxtKey, 'S' + (++nc));
        order.push(nxtKey);
        dfaMap.set(nxtKey, { positions: nxt, transitions: new Map(), accepting: nxt.has(endPos) });
        queue.push(nxt);
      }
      dfaMap.get(curKey).transitions.set(sym, nxtKey);
    }
  }

  return {
    method: 'DirectDFA',
    regex: regexStr,
    augmentedRegex: '(' + regexStr + ')#',
    root, treeNodes, treeEdges, treeW, treeH,
    fpMap, posSymbol, endPos,
    dfaMap, nameMap, order, startKey, symbols,
  };
}
