import React from 'react';

function ActionCell({ actions }) {
  if (!actions || actions.length === 0) return null;

  if (actions.length > 1) {
    const label = actions.map(a => {
      if (a.type === 'shift') return `s${a.state}`;
      if (a.type === 'reduce') return `r${a.prodIdx}`;
      return 'acc';
    }).join('/');
    return <span className="action-conflict" title="Conflict">{label}</span>;
  }

  const a = actions[0];
  if (a.type === 'shift') return <span className="action-shift">s{a.state}</span>;
  if (a.type === 'reduce') return <span className="action-reduce">r{a.prodIdx}</span>;
  if (a.type === 'accept') return <span className="action-accept">acc</span>;
  return null;
}

export default function ParsingTable({ states, terminals, nonTerminals, actionTable, gotoTable, augProductions, conflicts }) {
  const termCols = [...terminals].sort();
  if (!termCols.includes('$')) termCols.push('$');
  const ntCols = [...nonTerminals].filter(nt => {
    // exclude augmented start
    return gotoTable.some(row => row.has(nt));
  });

  const hasConflicts = conflicts && conflicts.length > 0;

  return (
    <>
      <div className="section-header">Parsing Table</div>

      {hasConflicts && (
        <div className="conflict-box">
          <strong>⚠ Conflicts detected:</strong>
          <ul>
            {conflicts.map((c, i) => (
              <li key={i}>State {c.state}, symbol "{c.sym}": {c.type} conflict</li>
            ))}
          </ul>
        </div>
      )}

      <div className="table-scroll">
        <table className="parsing-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ minWidth: 40 }}>State</th>
              <th colSpan={termCols.length} className="table-group-header">ACTION</th>
              {ntCols.length > 0 && (
                <th colSpan={ntCols.length} className="table-group-header">GOTO</th>
              )}
            </tr>
            <tr>
              {termCols.map(t => <th key={t}>{t}</th>)}
              {ntCols.map(nt => <th key={nt}>{nt}</th>)}
            </tr>
          </thead>
          <tbody>
            {states.map((_, i) => (
              <tr key={i}>
                <td className="state-col">{i}</td>
                {termCols.map(t => (
                  <td key={t}>
                    <ActionCell actions={actionTable[i]?.get(t)} />
                  </td>
                ))}
                {ntCols.map(nt => (
                  <td key={nt}>
                    {gotoTable[i]?.has(nt) && (
                      <span style={{ fontFamily: 'monospace' }}>{gotoTable[i].get(nt)}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {augProductions && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'monospace', lineHeight: 1.8 }}>
          {augProductions.map((p, i) => (
            <div key={i}>{i}: {p.lhs} → {p.rhs.join(' ')}</div>
          ))}
        </div>
      )}
    </>
  );
}
