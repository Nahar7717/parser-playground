/**
 * SyntaxTreeSVG — renders the annotated regex syntax tree.
 *
 * Props:
 *   treeNodes  : node[]    all nodes (with _x, _y set by layoutNode)
 *   treeEdges  : { from, to }[]
 *   treeW, treeH : number
 *   fpMap      : Map<pos, Set<pos>>   followpos
 *   posSymbol  : Map<pos, char>
 */
import React from 'react';

const R = 26; // circle radius

// Human-readable label for each node type
function nodeLabel(n) {
  switch (n.t) {
    case 'leaf': return n.sym;
    case 'cat':  return '·';
    case 'alt':  return '|';
    case 'star': return '*';
    case 'plus': return '+';
    case 'opt':  return '?';
    default:     return n.t;
  }
}

// Small annotation text below / around circle
function Annotation({ n }) {
  const lines = [];
  if (n.t === 'leaf') {
    lines.push(`pos=${n.pos}`);
  }
  const fp = n.fp ? [...n.fp].sort((a,b)=>a-b).join(',') : '';
  const lp = n.lp ? [...n.lp].sort((a,b)=>a-b).join(',') : '';
  const nullable = n.nullable ? 'T' : 'F';

  return (
    <g>
      {/* nullable badge */}
      <text x={n._x} y={n._y + R + 12}
        textAnchor="middle" fontSize={9}
        fill="var(--color-text-secondary)"
        fontFamily="system-ui,sans-serif">
        n={nullable}
      </text>
      {/* firstpos */}
      <text x={n._x} y={n._y + R + 23}
        textAnchor="middle" fontSize={9}
        fill="#185FA5"
        fontFamily="'Menlo','Consolas',monospace">
        {fp ? `fp={${fp}}` : ''}
      </text>
      {/* lastpos */}
      <text x={n._x} y={n._y + R + 34}
        textAnchor="middle" fontSize={9}
        fill="#0F6E56"
        fontFamily="'Menlo','Consolas',monospace">
        {lp ? `lp={${lp}}` : ''}
      </text>
    </g>
  );
}

export default function SyntaxTreeSVG({ treeNodes, treeEdges, treeW, treeH }) {
  return (
    <>
      <div className="section-header">Syntax Tree (annotated)</div>
      <div className="automaton-wrap">
        <svg width={treeW} height={treeH + 20} style={{ display: 'block' }}>
          {/* Edges first (behind nodes) */}
          {treeEdges.map((e, i) => (
            <line key={i}
              x1={e.from._x} y1={e.from._y}
              x2={e.to._x}   y2={e.to._y}
              stroke="var(--color-border)"
              strokeWidth={1.5}
            />
          ))}

          {/* Nodes */}
          {treeNodes.map((n, i) => {
            const isLeaf = n.t === 'leaf';
            const strokeColor = isLeaf ? '#0F6E56' : '#533AB7';
            return (
              <g key={i}>
                <circle cx={n._x} cy={n._y} r={R}
                  fill="var(--color-bg-secondary)"
                  stroke={strokeColor} strokeWidth={1.5} />
                <text x={n._x} y={n._y} textAnchor="middle" dominantBaseline="middle"
                  fontSize={isLeaf ? 14 : 16}
                  fontWeight={600}
                  fontFamily="'Menlo','Consolas',monospace"
                  fill={strokeColor}>
                  {nodeLabel(n)}
                </text>
                <Annotation n={n} />
              </g>
            );
          })}
        </svg>
      </div>
    </>
  );
}
