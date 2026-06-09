import React from 'react';

const DEFAULT_GRAMMAR = `E -> T E'
E' -> + T E' | eps
T -> F T'
T' -> * F T' | eps
F -> ( E ) | id`;

// Default NFA for subset construction: simple NFA for (a|b)*abb
const DEFAULT_NFA = {
  states: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  symbols: ['a', 'b'],
  start: '0',
  accept: ['10'],
  // transitions: state → { symbol → [targets] }
  trans: {
    '0':  { 'ε': ['1', '7'] },
    '1':  { 'ε': ['2', '4'] },
    '2':  { 'a': ['3'] },
    '3':  { 'ε': ['6'] },
    '4':  { 'b': ['5'] },
    '5':  { 'ε': ['6'] },
    '6':  { 'ε': ['1', '7'] },
    '7':  { 'a': ['8'] },
    '8':  { 'b': ['9'] },
    '9':  { 'b': ['10'] },
    '10': {},
  },
};

// ── NFA Table Editor ─────────────────────────────────────────────────────────
function NFAEditor({ nfa, onChange }) {
  const { states, symbols, start, accept, trans } = nfa;

  function setStates(val) {
    const newStates = val.split(',').map(s => s.trim()).filter(Boolean);
    // Rebuild trans to include any new states
    const newTrans = {};
    for (const s of newStates) newTrans[s] = trans[s] ?? {};
    onChange({ ...nfa, states: newStates, trans: newTrans });
  }

  function setSymbols(val) {
    const newSymbols = val.split(',').map(s => s.trim()).filter(Boolean);
    onChange({ ...nfa, symbols: newSymbols });
  }

  function setTrans(state, sym, val) {
    const targets = val.split(',').map(s => s.trim()).filter(Boolean);
    const newTrans = { ...trans, [state]: { ...(trans[state] ?? {}), [sym]: targets } };
    onChange({ ...nfa, trans: newTrans });
  }

  const allSymbols = ['ε', ...symbols.filter(s => s !== 'ε')];

  return (
    <div>
      <div className="input-spacer" />
      <label className="input-label">NFA States (comma-separated)</label>
      <input className="input-string-field"
        value={states.join(', ')}
        onChange={e => setStates(e.target.value)}
        placeholder="0, 1, 2, ..." spellCheck={false} />

      <div className="input-spacer" />
      <label className="input-label">Symbols (comma-separated, no ε)</label>
      <input className="input-string-field"
        value={symbols.join(', ')}
        onChange={e => setSymbols(e.target.value)}
        placeholder="a, b" spellCheck={false} />

      <div className="input-spacer" />
      <label className="input-label">Start State</label>
      <input className="input-string-field"
        value={start}
        onChange={e => onChange({ ...nfa, start: e.target.value.trim() })}
        placeholder="0" spellCheck={false} />

      <div className="input-spacer" />
      <label className="input-label">Accept States (comma-separated)</label>
      <input className="input-string-field"
        value={accept.join(', ')}
        onChange={e => onChange({ ...nfa, accept: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
        placeholder="10" spellCheck={false} />

      <div className="input-spacer" />
      <label className="input-label">Transition Table</label>
      <div className="nfa-table-wrap">
        <table className="nfa-table">
          <thead>
            <tr>
              <th>State</th>
              {allSymbols.map(sym => <th key={sym}>{sym}</th>)}
            </tr>
          </thead>
          <tbody>
            {states.map(state => (
              <tr key={state}>
                <td className="nfa-state-cell">{state}</td>
                {allSymbols.map(sym => (
                  <td key={sym}>
                    <input
                      className="nfa-cell-input"
                      value={(trans[state]?.[sym] ?? []).join(', ')}
                      onChange={e => setTrans(state, sym, e.target.value)}
                      placeholder="—"
                      spellCheck={false}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main InputPanel ──────────────────────────────────────────────────────────
export default function InputPanel({ onSolve, onClear, error }) {
  const [grammar, setGrammar] = React.useState(DEFAULT_GRAMMAR);
  const [method, setMethod] = React.useState('SLR');
  const [inputStr, setInputStr] = React.useState('');
  const [regex, setRegex] = React.useState('(a|b)*abb');
  const [nfa, setNfa] = React.useState(DEFAULT_NFA);

  const isGrammar = ['SLR', 'CLR', 'LALR', 'LL1'].includes(method);
  const isDFA = method === 'DirectDFA';
  const isSubset = method === 'SubsetConstr';

  function handleSolve() {
    if (isDFA)     onSolve({ method, regex });
    else if (isSubset) onSolve({ method, nfa });
    else           onSolve({ grammar, method, inputStr: inputStr.trim() });
  }

  function handleClear() {
    if (isGrammar) setGrammar('');
    if (isDFA)     setRegex('');
    if (isSubset)  setNfa({ states: [], symbols: [], start: '', accept: [], trans: {} });
    onClear();
  }

  function handleKey(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSolve();
  }

  return (
    <div>
      <label className="input-label">Method</label>
      <select
        className="method-select"
        value={method}
        onChange={e => setMethod(e.target.value)}
      >
        <optgroup label="Grammar Parsers">
          <option value="SLR">SLR(1)</option>
          <option value="CLR">CLR(1)</option>
          <option value="LALR">LALR(1)</option>
          <option value="LL1">LL(1)</option>
        </optgroup>
        <optgroup label="Automata">
          <option value="DirectDFA">Direct DFA</option>
        </optgroup>
      </select>

      {/* Grammar methods */}
      {isGrammar && (
        <>
          <div className="input-spacer" />
          <label className="input-label">Grammar</label>
          <textarea
            className="grammar-textarea"
            value={grammar}
            onChange={e => setGrammar(e.target.value)}
            onKeyDown={handleKey}
            placeholder={"S -> a S b | eps\n(one rule per line, | for alternates)"}
            spellCheck={false}
            rows={10}
          />
          <div className="input-spacer" />
          <label className="input-label">Input String (optional)</label>
          <input
            className="input-string-field"
            value={inputStr}
            onChange={e => setInputStr(e.target.value)}
            onKeyDown={handleKey}
            placeholder="id + id * id"
            spellCheck={false}
          />
        </>
      )}

      {/* Direct DFA */}
      {isDFA && (
        <>
          <div className="input-spacer" />
          <label className="input-label">Regular Expression</label>
          <input
            className="input-string-field"
            value={regex}
            onChange={e => setRegex(e.target.value)}
            onKeyDown={handleKey}
            placeholder="(a|b)*abb"
            spellCheck={false}
          />
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            Supports <code>*</code> <code>+</code> <code>?</code> <code>|</code> and <code>()</code><br />
            ⚠ Each character is one symbol — use single letters only
          </div>
        </>
      )}

      {/* Subset construction */}
      {isSubset && (
        <NFAEditor nfa={nfa} onChange={setNfa} />
      )}

      <div className="btn-row">
        <button className="btn-solve" onClick={handleSolve}>Solve</button>
        <button className="btn-clear" onClick={handleClear}>Clear</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {isGrammar && (
        <div style={{ marginTop: 20, fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
          <strong>Tips</strong><br />
          Use <code>eps</code> or <code>epsilon</code> for ε<br />
          ⚠ Put spaces between all symbols: <code>E + T</code> not <code>E+T</code><br />
          Multi-char tokens allowed: <code>id</code>, <code>int</code>, <code>op</code><br />
          Ctrl+Enter to solve
        </div>
      )}
    </div>
  );
}
