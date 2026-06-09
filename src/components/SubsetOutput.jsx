/**
 * SubsetOutput — displays all artifacts for Subset Construction (NFA → DFA).
 */
import React from 'react';
import DFADiagram from './DFADiagram.jsx';

// ── ε-closure table ──────────────────────────────────────────────────────────
function EpsilonClosureTable({ nfaStates, closureMap }) {
  return (
    <>
      <div className="section-header">ε-closure Table</div>
      <div className="table-scroll">
        <table className="parsing-table">
          <thead>
            <tr>
              <th>State</th>
              <th>ε-closure</th>
            </tr>
          </thead>
          <tbody>
            {nfaStates.map(s => {
              const cl = [...(closureMap.get(s) ?? [])].sort();
              return (
                <tr key={s}>
                  <td className="state-col">{s}</td>
                  <td style={{ fontFamily: 'Menlo,Consolas,monospace' }}>
                    {`{${cl.join(', ')}}`}
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

// ── Subset construction table ────────────────────────────────────────────────
function SubsetTable({ constructionRows, nameMap, symbols, dfaMap, acceptStates }) {
  const acceptSet = new Set(acceptStates);
  return (
    <>
      <div className="section-header">Subset Construction Table</div>
      <div className="table-scroll">
        <table className="parsing-table">
          <thead>
            <tr>
              <th>DFA State</th>
              <th>NFA States</th>
              {symbols.map(s => <th key={s}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {constructionRows.map((row, i) => {
              const dfaName = nameMap.get(row.key);
              const nfaList = [...row.states].sort().join(', ');
              return (
                <tr key={i}>
                  <td className="state-col" style={{ color: '#185FA5', fontWeight: 600 }}>
                    {dfaName}
                  </td>
                  <td style={{ fontFamily: 'Menlo,Consolas,monospace' }}>
                    {`{${nfaList}}`}
                  </td>
                  {symbols.map(sym => {
                    const toKey = row.transitions[sym];
                    const toName = toKey ? nameMap.get(toKey) : '—';
                    return (
                      <td key={sym}
                        className={toKey ? 'action-shift' : ''}
                        style={{ fontFamily: 'Menlo,Consolas,monospace' }}>
                        {toName ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Final DFA transition table ───────────────────────────────────────────────
function FinalDFATable({ dfaMap, nameMap, order, symbols }) {
  return (
    <>
      <div className="section-header">Final DFA Transition Table</div>
      <div className="table-scroll">
        <table className="parsing-table">
          <thead>
            <tr>
              <th>State</th>
              {symbols.map(s => <th key={s}>{s}</th>)}
              <th>Accepting?</th>
            </tr>
          </thead>
          <tbody>
            {order.map(key => {
              const state = dfaMap.get(key);
              const name = nameMap.get(key);
              return (
                <tr key={key}>
                  <td className="state-col" style={{ color: '#185FA5', fontWeight: 600 }}>
                    {name}
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
export default function SubsetOutput({ result }) {
  const {
    closureMap, dfaMap, nameMap, order,
    startKey, symbols, nfaStates, acceptStates,
    constructionRows,
  } = result;

  return (
    <div>
      <EpsilonClosureTable nfaStates={nfaStates} closureMap={closureMap} />
      <SubsetTable
        constructionRows={constructionRows}
        nameMap={nameMap}
        symbols={symbols}
        dfaMap={dfaMap}
        acceptStates={acceptStates}
      />
      <FinalDFATable
        dfaMap={dfaMap}
        nameMap={nameMap}
        order={order}
        symbols={symbols}
      />
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
