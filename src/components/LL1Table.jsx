import React from 'react';

export default function LL1Table({ grammar, table, conflicts }) {
  const nts = [...grammar.nonTerminals];
  const termSet = new Set();
  for (const row of table.values())
    for (const t of row.keys()) termSet.add(t);
  const terms = [...termSet].sort();
  if (!terms.includes('$')) terms.push('$');

  const hasConflicts = conflicts && conflicts.length > 0;

  return (
    <>
      <div className="section-header">LL(1) Parsing Table</div>

      {hasConflicts && (
        <div className="conflict-box">
          <strong>⚠ Not LL(1) — conflicts:</strong>
          <ul>
            {conflicts.map((c, i) => (
              <li key={i}>M[{c.nt}, {c.terminal}] has {c.entries.length} entries</li>
            ))}
          </ul>
        </div>
      )}

      <div className="table-scroll">
        <table className="parsing-table">
          <thead>
            <tr>
              <th>NT</th>
              {terms.map(t => <th key={t}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {nts.map(nt => (
              <tr key={nt}>
                <td className="state-col" style={{ fontFamily: 'monospace' }}>{nt}</td>
                {terms.map(t => {
                  const entries = table.get(nt)?.get(t) || [];
                  if (entries.length === 0) return <td key={t} />;
                  if (entries.length > 1) {
                    return (
                      <td key={t}>
                        <span className="action-conflict">
                          {entries.map(r => r.join(' ')).join(' / ')}
                        </span>
                      </td>
                    );
                  }
                  const rhs = entries[0];
                  return (
                    <td key={t} style={{ fontFamily: 'monospace', fontSize: 11 }}>
                      {nt} → {rhs.join(' ')}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
