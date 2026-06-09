/**
 * DirectDFAOutput — displays all artifacts for Direct DFA construction.
 */
import React from 'react';
import SyntaxTreeSVG from './SyntaxTreeSVG.jsx';
import DFADiagram from './DFADiagram.jsx';
import { subNum } from '../algorithms/directDFA.js';

// ── Followpos table ──────────────────────────────────────────────────────────
function FollowposTable({ fpMap, posSymbol }) {
  const positions = [...fpMap.keys()].sort((a, b) => a - b);
  return (
    <>
      <div className="section-header">Followpos Table</div>
      <div className="table-scroll">
        <table className="parsing-table" style={{ fontSize: 15 }}>
          <thead>
            <tr>
              <th>Position</th>
              <th>Symbol</th>
              <th>followpos</th>
            </tr>
          </thead>
          <tbody>
            {positions.map(pos => {
              const fp = [...(fpMap.get(pos) ?? [])].sort((a, b) => a - b);
              return (
                <tr key={pos}>
                  <td className="state-col" style={{ fontSize: 15, fontWeight: 700 }}>{pos}</td>
                  <td style={{ fontFamily: 'Menlo,Consolas,monospace', fontSize: 15, fontWeight: 600 }}>
                    {posSymbol.get(pos)}
                  </td>
                  <td style={{ fontFamily: 'Menlo,Consolas,monospace', fontSize: 15, fontWeight: 600 }}>
                    {fp.length ? `{${fp.join(', ')}}` : '∅'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── State construction table ─────────────────────────────────────────────────
function StateConstructionTable({ dfaMap, nameMap, order, symbols, posSymbol, endPos }) {
  return (
    <>
      <div className="section-header">DFA State Construction</div>
      <div className="table-scroll">
        <table className="parsing-table" style={{ fontSize: 15 }}>
          <thead>
            <tr>
              <th>State</th>
              <th>Positions</th>
              {symbols.map(s => <th key={s}>{s}</th>)}
              <th>Accepting?</th>
            </tr>
          </thead>
          <tbody>
            {order.map(key => {
              const state = dfaMap.get(key);
              const name = nameMap.get(key);
              const positions = [...state.positions].sort((a, b) => a - b);
              const posStr = positions.join(', ');
              return (
                <tr key={key}>
                  <td className="state-col" style={{ color: '#185FA5', fontWeight: 700, fontSize: 15 }}>
                    {name}
                  </td>
                  <td style={{ fontFamily: 'Menlo,Consolas,monospace', fontSize: 15, fontWeight: 600 }}>
                    {`{${posStr}}`}
                  </td>
                  {symbols.map(sym => {
                    const toKey = state.transitions.get(sym);
                    const toName = toKey ? nameMap.get(toKey) : '—';
                    return (
                      <td key={sym}
                        className={toKey ? 'action-shift' : ''}
                        style={{ fontFamily: 'Menlo,Consolas,monospace' }}>
                        {toName}
                      </td>
                    );
                  })}
                  <td style={{ color: state.accepting ? '#0F6E56' : 'var(--color-text-secondary)', fontWeight: state.accepting ? 600 : 400 }}>
                    {state.accepting ? '✓ yes' : 'no'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Main output component ────────────────────────────────────────────────────
export default function DirectDFAOutput({ result }) {
  const {
    augmentedRegex, root,
    treeNodes, treeEdges, treeW, treeH,
    fpMap, posSymbol, endPos,
    dfaMap, nameMap, order, startKey, symbols,
  } = result;

  return (
    <div>
      {/* Augmented regex */}
      <div className="section-header">Augmented Regular Expression</div>
      <div className="aug-grammar" style={{ fontSize: 14 }}>
        {augmentedRegex}
      </div>

      {/* Syntax tree */}
      <SyntaxTreeSVG
        treeNodes={treeNodes}
        treeEdges={treeEdges}
        treeW={treeW}
        treeH={treeH}
      />

      {/* Followpos */}
      <FollowposTable fpMap={fpMap} posSymbol={posSymbol} />

      {/* State construction */}
      <StateConstructionTable
        dfaMap={dfaMap}
        nameMap={nameMap}
        order={order}
        symbols={symbols}
        posSymbol={posSymbol}
        endPos={endPos}
      />

      {/* DFA diagram */}
      <DFADiagram
        dfaMap={dfaMap}
        nameMap={nameMap}
        order={order}
        startKey={startKey}
        symbols={symbols}
      />
    </div>
  );
}
