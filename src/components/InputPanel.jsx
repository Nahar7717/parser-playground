import React from 'react';

const DEFAULT_GRAMMAR = `E -> T E'
E' -> + T E' | eps
T -> F T'
T' -> * F T' | eps
F -> ( E ) | id`;

export default function InputPanel({ onSolve, onClear, error }) {
  const [grammar, setGrammar] = React.useState(DEFAULT_GRAMMAR);
  const [method, setMethod] = React.useState('SLR');
  const [inputStr, setInputStr] = React.useState('');

  function handleSolve() {
    onSolve({ grammar, method, inputStr: inputStr.trim() });
  }

  function handleClear() {
    setGrammar('');
    setInputStr('');
    onClear();
  }

  function handleKey(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSolve();
  }

  return (
    <div>
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
      <label className="input-label">Method</label>
      <select
        className="method-select"
        value={method}
        onChange={e => setMethod(e.target.value)}
      >
        <option value="SLR">SLR(1)</option>
        <option value="CLR">CLR(1)</option>
        <option value="LALR">LALR(1)</option>
        <option value="LL1">LL(1)</option>
      </select>

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

      <div className="btn-row">
        <button className="btn-solve" onClick={handleSolve}>Solve</button>
        <button className="btn-clear" onClick={handleClear}>Clear</button>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div style={{ marginTop: 20, fontSize: 11, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
        <strong>Tips</strong><br />
        Use <code>eps</code> or <code>epsilon</code> for ε<br />
        Multi-char tokens: <code>id</code>, <code>int</code>, <code>op</code><br />
        Ctrl+Enter to solve
      </div>
    </div>
  );
}
