import { TIP_COLORS as C, TipCaption } from './tip-primitives';

export default function ArcHeightTip() {
  return (
    <>
      <svg viewBox="0 0 270 104" role="img" aria-label="Automatic arc height: nearby endpoints form a lower arc; distant endpoints form a higher arc, within minHeight and maxHeight">
        {[{ x: 65, halfWidth: 15, top: 21, label: 'short route' }, { x: 205, halfWidth: 27, top: -8, label: 'long route' }].map(({ x, halfWidth, top, label }) => (
          <g key={label}>
            <circle cx={x} cy="63" r="31" fill="#0d1420" stroke={C.hair} />
            <path d={`M${x - halfWidth} ${63 - Math.sqrt(31 ** 2 - halfWidth ** 2)} Q${x} ${top} ${x + halfWidth} ${63 - Math.sqrt(31 ** 2 - halfWidth ** 2)}`} fill="none" stroke={C.atm} strokeWidth="1.8" />
            <circle cx={x - halfWidth} cy={63 - Math.sqrt(31 ** 2 - halfWidth ** 2)} r="2.5" fill={C.ember} />
            <circle cx={x + halfWidth} cy={63 - Math.sqrt(31 ** 2 - halfWidth ** 2)} r="2.5" fill={C.ember} />
            <text x={x} y="102" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">{label}</text>
          </g>
        ))}
      </svg>
      <TipCaption>height: 'auto' grows with angular distance, bounded by minHeight and maxHeight. A numeric height fixes the apex above the surface.</TipCaption>
    </>
  );
}
