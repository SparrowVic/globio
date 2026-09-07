import { TIP_COLORS as C, TipCaption } from './tip-primitives';

/** Rings expanding from the centroid or from the clicked point. */
export default function FocusPulseTip() {
  const rings = (cx: number, cy: number) => [6, 13, 21].map((radius, index) => (
    <circle key={radius} cx={cx} cy={cy} r={radius} opacity={1 - index * 0.3} fill="none" stroke={C.atm} strokeWidth="1.2" />
  ));
  return (
    <>
      <svg viewBox="0 0 270 100" role="img" aria-label="Focus pulse origin: rings from the country centroid, or from the exact point that was clicked">
        <g transform="translate(6 0)">
          <path d="M20 30 L90 24 L104 60 L70 80 L28 66 Z" fill="rgba(111,180,255,0.12)" stroke={C.hair} />
          <circle cx="62" cy="52" r="2.5" fill={C.ember} />
          {rings(62, 52)}
          <text x="62" y="96" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">centroid</text>
        </g>
        <g transform="translate(140 0)">
          <path d="M20 30 L90 24 L104 60 L70 80 L28 66 Z" fill="rgba(111,180,255,0.12)" stroke={C.hair} />
          <circle cx="88" cy="36" r="2.5" fill={C.ember} />
          {rings(88, 36)}
          <text x="62" y="96" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">click</text>
        </g>
      </svg>
      <TipCaption>Each kind draws its own ring; this setting only decides where and when it fires.</TipCaption>
    </>
  );
}
