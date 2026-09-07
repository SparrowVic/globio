import { TIP_COLORS as C, TipCaption } from './tip-primitives';

/** Framing uses the vertical field of view to reserve top and bottom margins. */
export default function FramingTip() {
  return (
    <>
      <svg viewBox="0 0 270 120" role="img" aria-label="Framing padding reserves vertical space above and below the globe. Horizontal fit depends on the canvas aspect ratio.">
        <rect x="8" y="6" width="254" height="108" rx="6" fill="none" stroke={C.hair} />
        <path d="M8 18 H262 M8 102 H262" fill="none" stroke={C.atm} strokeDasharray="3 3" />
        <circle cx="135" cy="60" r="40" fill="rgba(111,180,255,0.10)" />
        <circle cx="135" cy="60" r="34" fill="#0d1420" stroke={C.ink} strokeWidth="1.2" />
        <path d="M40 6 V18 M40 102 V114" stroke={C.ember} strokeWidth="1.4" />
        <text x="55" y="15" fontSize="8" fill={C.ember} fontFamily="var(--font-mono)">padding</text>
        <text x="55" y="112" fontSize="8" fill={C.ember} fontFamily="var(--font-mono)">padding</text>
      </svg>
      <TipCaption>Padding reserves vertical space; a narrow canvas can still clip the sides. lockZoom fixes the camera at this framing distance.</TipCaption>
    </>
  );
}
