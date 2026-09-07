import { TIP_COLORS as C, TipCaption } from './tip-primitives';

const ROWS: ReadonlyArray<readonly [string, string]> = [
  ['0.25', '~2 min per turn'],
  ['0.5', '~1 min per turn'],
  ['1', '~30 s per turn'],
];

/** Speed to seconds-per-revolution, alongside the rotation axis. */
export default function AutoRotateTip() {
  return (
    <>
      <svg viewBox="0 0 270 90" role="img" aria-label="Auto-rotate speed table: 0.25 is about two minutes per turn, 0.5 one minute, 1 thirty seconds">
        <g transform="translate(46 45)">
          <circle r="34" fill="#0d1420" stroke={C.ink} strokeWidth="1.2" />
          <ellipse rx="14" ry="34" fill="none" stroke={C.atm} strokeWidth="1.2" />
          <line x1="-34" y1="0" x2="34" y2="0" stroke={C.hair} />
        </g>
        {ROWS.map(([speed, per], i) => (
          <g key={speed} transform={`translate(110 ${22 + i * 22})`}>
            <text x="0" y="0" fontSize="10" fill={C.ember} fontFamily="var(--font-mono)">
              {speed}
            </text>
            <text x="40" y="0" fontSize="10" fill={C.ink}>
              {per}
            </text>
          </g>
        ))}
      </svg>
      <TipCaption>One full turn takes about 30 / speed seconds while auto-rotation is active.</TipCaption>
    </>
  );
}
