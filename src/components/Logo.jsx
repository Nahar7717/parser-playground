export default function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ── Arrowhead marker ── */}
      <defs>
        <marker id="logo-arr" viewBox="0 0 8 8" refX="7" refY="4"
          markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M1 1.5L7 4L1 6.5" stroke="#185FA5" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </marker>
        <marker id="logo-arr-teal" viewBox="0 0 8 8" refX="7" refY="4"
          markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M1 1.5L7 4L1 6.5" stroke="#0F6E56" strokeWidth="1.4"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </marker>
      </defs>

      {/* ── Start arrow into q0 ── */}
      <line x1="2" y1="32" x2="11" y2="32"
        stroke="#185FA5" strokeWidth="1.5" markerEnd="url(#logo-arr)" />

      {/* ── q0 (start state, blue) ── */}
      <circle cx="20" cy="32" r="9" stroke="#185FA5" strokeWidth="2" fill="#0d1117" />
      <text x="20" y="32" textAnchor="middle" dominantBaseline="middle"
        fontSize="6.5" fontWeight="700" fontFamily="monospace" fill="#185FA5">q0</text>

      {/* ── q0 → q1 (forward, straight) ── */}
      <line x1="29" y1="32" x2="37" y2="32"
        stroke="#185FA5" strokeWidth="1.4" markerEnd="url(#logo-arr)" />

      {/* ── q1 (middle state, purple) ── */}
      <circle cx="46" cy="32" r="9" stroke="#533AB7" strokeWidth="1.8" fill="#0d1117" />
      <text x="46" y="32" textAnchor="middle" dominantBaseline="middle"
        fontSize="6.5" fontWeight="700" fontFamily="monospace" fill="#533AB7">q1</text>

      {/* ── q0 → q1 back arc (over the top) ── */}
      <path d="M 22 23 Q 33 6 44 23"
        stroke="#0F6E56" strokeWidth="1.4" fill="none" markerEnd="url(#logo-arr-teal)" />

      {/* ── LR dot (red) on the back arc ── */}
      <circle cx="33" cy="10" r="2.5" fill="#E24B4A" />

      {/* ── q1 self-loop ── */}
      <path d="M 42 23 C 36 10 56 10 50 23"
        stroke="#533AB7" strokeWidth="1.3" fill="none" markerEnd="url(#logo-arr)" />

      {/* ── q2 (accept state, teal, double ring) — bottom left ── */}
      <circle cx="20" cy="52" r="9"  stroke="#0F6E56" strokeWidth="1.8" fill="#0d1117" />
      <circle cx="20" cy="52" r="6"  stroke="#0F6E56" strokeWidth="1"   fill="none" />
      <text x="20" y="52" textAnchor="middle" dominantBaseline="middle"
        fontSize="6.5" fontWeight="700" fontFamily="monospace" fill="#0F6E56">q2</text>

      {/* ── q1 → q2 (going down-left) ── */}
      <path d="M 38 38 Q 32 52 29 52"
        stroke="#185FA5" strokeWidth="1.4" fill="none" markerEnd="url(#logo-arr)" />
    </svg>
  );
}
