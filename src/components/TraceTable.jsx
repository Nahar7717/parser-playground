import React from 'react';

const TYPE_META = {
  predict: { label: 'P',     cls: 'trace-type-p' },
  match:   { label: 'M',     cls: 'trace-type-m' },
  shift:   { label: 'S',     cls: 'trace-type-s' },
  reduce:  { label: 'R',     cls: 'trace-type-r' },
  accept:  { label: 'ACC',   cls: 'trace-type-acc' },
  error:   { label: 'ERR',   cls: 'trace-type-err' },
  panic:   { label: 'PANIC', cls: 'trace-type-err' },
};

function rowClass(type) {
  if (type === 'accept') return 'trace-row-accept';
  if (type === 'error' || type === 'panic') return 'trace-row-error';
  return '';
}

export default function TraceTable({ steps, title }) {
  if (!steps || steps.length === 0) return null;
  const hasSymbols = steps.some(s => s.symbols != null);

  return (
    <>
      <div className="section-header">{title || 'Parse Trace'}</div>
      <div className="table-scroll">
        <table className="trace-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>Stack</th>
              {hasSymbols && <th>Symbols</th>}
              <th>Remaining Input</th>
              <th>Action</th>
              <th style={{ width: 50 }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {steps.map(row => {
              const meta = TYPE_META[row.type] || { label: row.type, cls: '' };
              return (
                <tr key={row.step} className={rowClass(row.type)}>
                  <td style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 11 }}>{row.step}</td>
                  <td className="mono" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.stack}</td>
                  {hasSymbols && (
                    <td className="mono" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0F6E56' }}>
                      {row.symbols ?? ''}
                    </td>
                  )}
                  <td className="mono">{row.remaining}</td>
                  <td style={{ fontSize: 11.5 }}>{row.action}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={meta.cls}>{meta.label}</span>
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
