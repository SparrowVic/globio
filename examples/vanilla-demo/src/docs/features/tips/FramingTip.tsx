import { TIP_COLORS as C, TipCaption } from './tip-primitives';

/** The globe, its halo and the padding band the canvas reserves around them. */
export default function FramingTip() {
  return (
    <>
      <svg viewBox="0 0 270 120" role="img" aria-label="Framing padding reserves a margin around the globe and its atmosphere halo">
        <rect x="8" y="6" width="254" height="108" rx="6" fill="none" stroke={C.hair} />
        <rect x="30" y="18" width="210" height="84" rx="4" fill="none" stroke={C.atm} strokeDasharray="3 3" />
        <circle cx="135" cy="60" r="46" fill="rgba(111,180,255,0.10)" />
        <circle cx="135" cy="60" r="34" fill="#0d1420" stroke={C.ink} strokeWidth="1.2" />
        <path d="M30 60 L8 60" stroke={C.ember} strokeWidth="1.4" />
        <path d="M240 60 L262 60" stroke={C.ember} strokeWidth="1.4" />
        <text x="19" y="52" textAnchor="middle" fontSize="8" fill={C.ember} fontFamily="var(--font-mono)">pad</text>
        <text x="251" y="52" textAnchor="middle" fontSize="8" fill={C.ember} fontFamily="var(--font-mono)">pad</text>
        <text x="135" y="112" textAnchor="middle" fontSize="8" fill={C.mist} fontFamily="var(--font-mono)">halo fades inside the dashed frame</text>
      </svg>
      <TipCaption>padding 0.15 to 0.25 keeps the halo off the canvas edge; lockZoom pins the camera to this frame.</TipCaption>
    </>
  );
}
