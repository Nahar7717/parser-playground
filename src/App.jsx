import React, { useState, useCallback } from 'react';
import InputPanel from './components/InputPanel.jsx';
import Logo from './components/Logo.jsx';
import AugmentedGrammar from './components/AugmentedGrammar.jsx';
import FirstFollowBox from './components/FirstFollowBox.jsx';
import StateCards from './components/StateCards.jsx';
import ParsingTable from './components/ParsingTable.jsx';
import AutomatonSVG from './components/AutomatonSVG.jsx';
import TraceTable from './components/TraceTable.jsx';
import LL1Table from './components/LL1Table.jsx';
import DirectDFAOutput from './components/DirectDFAOutput.jsx';
import SubsetOutput from './components/SubsetOutput.jsx';

import { parseGrammar, augmentGrammar } from './algorithms/grammar.js';
import { computeFirst, computeFollow } from './algorithms/firstFollow.js';
import { buildLR0Collection, buildLR1Collection, buildLALRCollection } from './algorithms/lrItems.js';
import { buildSLRTable, buildLR1Table, parseLR } from './algorithms/tables.js';
import { solveLL1 } from './algorithms/ll1.js';
import { solveDirectDFA } from './algorithms/directDFA.js';
import { solveSubset } from './algorithms/subsetConstruction.js';

function solve(params) {
  const { method } = params;

  if (method === 'DirectDFA') {
    return solveDirectDFA(params.regex || '');
  }

  if (method === 'SubsetConstr') {
    const { nfa } = params;
    return solveSubset({
      nfaStates: nfa.states,
      symbols: nfa.symbols,
      startState: nfa.start,
      acceptStates: nfa.accept,
      transitions: nfa.trans,
    });
  }

  const grammar = parseGrammar(params.grammar);
  if (!grammar) throw new Error('Could not parse grammar. Check formatting.');

  if (method === 'LL1') {
    const result = solveLL1(grammar, params.inputStr || '');
    return { method, grammar, ...result };
  }

  // LR methods
  const augGrammar = augmentGrammar(grammar);
  const firstSets = computeFirst(augGrammar);
  const followSets = computeFollow(augGrammar, firstSets);

  let states, transitions, tables, mergedNames;

  if (method === 'SLR') {
    ({ states, transitions } = buildLR0Collection(augGrammar));
    tables = buildSLRTable(augGrammar, states, transitions, followSets);
  } else if (method === 'CLR') {
    ({ states, transitions } = buildLR1Collection(augGrammar, firstSets));
    tables = buildLR1Table(augGrammar, states, transitions);
  } else if (method === 'LALR') {
    ({ states, transitions, mergedNames } = buildLALRCollection(augGrammar, firstSets));
    tables = buildLR1Table(augGrammar, states, transitions);
  }

  const trace = params.inputStr ? parseLR(augGrammar, tables, params.inputStr) : null;

  return {
    method, grammar, augGrammar, firstSets, followSets,
    states, transitions, tables, trace, mergedNames,
  };
}

// ── Theme toggle ───────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState('auto');
  React.useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : t === 'light' ? 'auto' : 'dark');
  const label = theme === 'dark' ? '☀ Light' : theme === 'light' ? '◑ Auto' : '☾ Dark';
  return { toggle, label };
}

// ── LR Output ──────────────────────────────────
function LROutput({ result }) {
  const { method, augGrammar, firstSets, followSets, states, transitions, tables, trace, mergedNames } = result;
  const allNTs = [...augGrammar.nonTerminals];
  return (
    <div>
      <AugmentedGrammar productions={augGrammar.productions} />
      <FirstFollowBox nonTerminals={allNTs} firstSets={firstSets} followSets={followSets} />
      <StateCards states={states} method={method} mergedNames={mergedNames} />
      <AutomatonSVG states={states} transitions={transitions} augGrammar={augGrammar} method={method} mergedNames={mergedNames} />
      <ParsingTable
        states={states}
        terminals={augGrammar.terminals}
        nonTerminals={augGrammar.nonTerminals}
        actionTable={tables.action}
        gotoTable={tables.goto}
        augProductions={augGrammar.productions}
        conflicts={tables.conflicts}
      />
      {trace && <TraceTable steps={trace} title={`Parse Trace (${method})`} />}
    </div>
  );
}

// ── LL1 Output ─────────────────────────────────
function LL1Output({ result }) {
  const { grammar, noLR, factored, firstSets, followSets, table, conflicts, trace } = result;
  const hadLeftRecursion = grammar && noLR &&
    [...noLR.nonTerminals].some(nt => !grammar.nonTerminals.has(nt));
  return (
    <div>
      {hadLeftRecursion && (
        <AugmentedGrammar productions={noLR.productions} title="After Left-Recursion Elimination" />
      )}
      <AugmentedGrammar productions={factored.productions} title="After Left-Factoring" />
      <FirstFollowBox nonTerminals={[...factored.nonTerminals]} firstSets={firstSets} followSets={followSets} />
      <LL1Table grammar={factored} table={table} conflicts={conflicts} />
      {trace && <TraceTable steps={trace} title="Parse Trace (LL1)" />}
    </div>
  );
}

// ── Placeholder ────────────────────────────────
function Placeholder() {
  return (
    <div className="placeholder">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="4" y="16" width="18" height="14" rx="4" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="26" y="8" width="18" height="14" rx="4" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="26" y="28" width="18" height="14" rx="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M22 23h4M22 23c0-5 4-8 4-8M22 23c0 5 4 8 4 8" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      </svg>
      <p>Configure input and click <strong>Solve</strong></p>
      <p style={{ fontSize: 12 }}>SLR(1) · CLR(1) · LALR(1) · LL(1) · Direct DFA · Subset Construction</p>
    </div>
  );
}

// ── App ────────────────────────────────────────
export default function App() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const { toggle, label } = useTheme();

  const handleSolve = useCallback((params) => {
    setError('');
    setResult(null);
    try {
      const r = solve(params);
      setResult(r);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const handleClear = useCallback(() => {
    setResult(null);
    setError('');
  }, []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={40} />
          <h1>Parser <span>Playground</span></h1>
        </div>
        <button className="theme-toggle" onClick={toggle}>{label}</button>
      </header>

      <aside className="input-sidebar">
        <InputPanel onSolve={handleSolve} onClear={handleClear} error={error} />
      </aside>

      <main className="output-main">
        {!result && !error && <Placeholder />}
        {result?.method === 'LL1'        && <LL1Output      result={result} />}
        {result?.method === 'DirectDFA'  && <DirectDFAOutput result={result} />}
        {result?.method === 'SubsetConstr' && <SubsetOutput  result={result} />}
        {result && !['LL1','DirectDFA','SubsetConstr'].includes(result.method) && <LROutput result={result} />}
      </main>
    </div>
  );
}
