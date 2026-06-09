import React from 'react';

export default function AugmentedGrammar({ productions, title }) {
  return (
    <>
      <div className="section-header">{title || 'Augmented Grammar'}</div>
      <div className="aug-grammar">
        {productions.map((p, i) => (
          <div key={i}>
            <span className="prod-num">{i}:</span>
            {p.lhs} → {p.rhs.join(' ')}
          </div>
        ))}
      </div>
    </>
  );
}
