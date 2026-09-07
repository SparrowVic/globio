import { TIP_COLORS as C, TipCaption } from './tip-primitives';

/** A wide country wrapping the limb: hidden on the far side, or shown through the globe. */
export default function HoverOccludeTip() {
  const globe = (x: number, xray: boolean, title: string) => (
    <g transform={`translate(${x} 0)`}>
      <circle cx="60" cy="48" r="38" fill="#0d1420" stroke={C.ink} strokeWidth="1.2" />
      <path d="M40 30 C70 22, 96 34, 98 52" fill="none" stroke={C.atm} strokeWidth="2" />
      <path d="M98 52 C96 66, 82 78, 66 84" fill="none" stroke={C.atm} strokeWidth="2" strokeDasharray={xray ? '3 3' : undefined} opacity={xray ? 0.9 : 0.18} />
      <text x="60" y="100" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">
        {title}
      </text>
    </g>
  );
  return (
    <>
      <svg viewBox="0 0 270 106" role="img" aria-label="Hover occlusion: the far side of a hovered country is hidden by default, or drawn through the globe in x-ray mode">
        {globe(8, false, 'occlude (default)')}
        {globe(138, true, 'x-ray')}
      </svg>
      <TipCaption>hoverOccludeBackSide: false draws the whole outline, useful for wide countries near the limb.</TipCaption>
    </>
  );
}
