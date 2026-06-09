import React from 'react';

function ItemRow({ item }) {
  const before = item.rhs.slice(0, item.dot);
  const after = item.rhs.slice(item.dot);

  return (
    <div className="item-row">
      <span className="item-rule">
        {item.lhs} → {before.length > 0 ? before.join(' ') + ' ' : ''}
        <span className="dot">•</span>
        {after.length > 0 ? ' ' + after.join(' ') : ''}
      </span>
      {item.lookahead != null && (
        <span className="lookahead">{item.lookahead}</span>
      )}
    </div>
  );
}

export default function StateCards({ states, method, mergedNames }) {
  return (
    <>
      <div className="section-header">
        {method} Item Sets ({states.length} states)
      </div>
      <div className="states-grid">
        {states.map((items, i) => (
          <div className="state-card" key={i}>
            <div className="state-card-header">I{mergedNames?.[i] ?? i}</div>
            {items.map((item, j) => (
              <ItemRow key={j} item={item} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
