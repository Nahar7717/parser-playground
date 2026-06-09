import React from 'react';

function setStr(s) {
  if (!s || s.size === 0) return '∅';
  return '{ ' + [...s].sort().join(', ') + ' }';
}

export default function FirstFollowBox({ nonTerminals, firstSets, followSets }) {
  const nts = [...nonTerminals];

  return (
    <>
      <div className="section-header">FIRST &amp; FOLLOW Sets</div>
      <div className="ff-box">
        {nts.map(nt => (
          <div className="ff-row" key={nt}>
            <span className="ff-nt">FIRST({nt})</span>
            <span className="ff-vals">{setStr(firstSets.get(nt))}</span>
            {followSets && (
              <>
                <span className="ff-nt" style={{ marginLeft: 16 }}>FOLLOW({nt})</span>
                <span className="ff-vals">{setStr(followSets.get(nt))}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
