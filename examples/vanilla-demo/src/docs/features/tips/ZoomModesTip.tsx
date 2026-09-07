import { TIP_COLORS as C, TipCaption } from './tip-primitives';

/** Three panels: what happens to the point under the cursor per zoom mode. */
export default function ZoomModesTip() {
  const panel = (x: number, title: string, arrow: 'none' | 'stay' | 'centre') => (
    <g transform={`translate(${x} 0)`}>
      <circle cx="44" cy="46" r="26" fill="none" stroke={C.hair} />
      <circle cx="44" cy="46" r="34" fill="none" stroke={C.hair} strokeDasharray="2 3" />
      <circle cx="58" cy="32" r="2.4" fill={C.ember} />
      {arrow === 'none' && <path d="M58 32 L66 22" stroke={C.mist} strokeWidth="1.2" fill="none" markerEnd="url(#tip-arrow)" />}
      {arrow === 'stay' && <circle cx="58" cy="32" r="6" fill="none" stroke={C.atm} strokeWidth="1.2" />}
      {arrow === 'centre' && <path d="M58 32 L47 43" stroke={C.atm} strokeWidth="1.2" fill="none" markerEnd="url(#tip-arrow)" />}
      <text x="44" y="94" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">
        {title}
      </text>
    </g>
  );
  return (
    <>
      <svg viewBox="0 0 270 100" role="img" aria-label="Zoom modes: classic drifts the point under the cursor, repel keeps it under the cursor, attract pulls it to the centre">
        <defs>
          <marker id="tip-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0 0 L6 3 L0 6 z" fill={C.atm} />
          </marker>
        </defs>
        {panel(0, 'classic', 'none')}
        {panel(90, 'repel', 'stay')}
        {panel(180, 'attract', 'centre')}
      </svg>
      <TipCaption>Orange: the point under the cursor before a scroll step. Blue: where it ends up.</TipCaption>
    </>
  );
}
