import { TIP_COLORS as C, TipCaption } from './tip-primitives';

/** Rings expanding from the centroid or from the clicked point. */
export default function FocusPulseTip() {
  const ring = (cx: number, cy: number, delay: string) => (
    <circle cx={cx} cy={cy} r="4" fill="none" stroke={C.atm} strokeWidth="1.2">
      <animate attributeName="r" values="4;22" dur="2.4s" begin={delay} repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.9;0" dur="2.4s" begin={delay} repeatCount="indefinite" />
    </circle>
  );
  return (
    <>
      <svg viewBox="0 0 270 100" role="img" aria-label="Focus pulse origin: rings from the country centroid, or from the exact point that was clicked">
        <g transform="translate(6 0)">
          <path d="M20 30 L90 24 L104 60 L70 80 L28 66 Z" fill="rgba(111,180,255,0.12)" stroke={C.hair} />
          <circle cx="62" cy="52" r="2.5" fill={C.ember} />
          {ring(62, 52, '0s')}
          <text x="62" y="96" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">centroid</text>
        </g>
        <g transform="translate(140 0)">
          <path d="M20 30 L90 24 L104 60 L70 80 L28 66 Z" fill="rgba(111,180,255,0.12)" stroke={C.hair} />
          <circle cx="88" cy="36" r="2.5" fill={C.ember} />
          {ring(88, 36, '0.8s')}
          <text x="62" y="96" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">click</text>
        </g>
      </svg>
      <TipCaption>Each kind draws its own ring; this setting only decides where and when it fires.</TipCaption>
    </>
  );
}
