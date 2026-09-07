import { TIP_COLORS as C, TipCaption } from './tip-primitives';

const RATIOS: ReadonlyArray<{ readonly label: string; readonly cells: number; readonly cost: string }> = [
  { label: '1×', cells: 1, cost: '1× pixels' },
  { label: '1.5×', cells: 1.5, cost: '2.25×' },
  { label: '2×', cells: 2, cost: '4×' },
];

/** Pixel ratio squared is the fill cost. */
export default function PixelRatioTip() {
  return (
    <>
      <svg viewBox="0 0 270 96" role="img" aria-label="Pixel ratio cost: 1 times draws one unit of pixels, 1.5 draws 2.25, 2 draws 4">
        {RATIOS.map((r, i) => {
          const size = 22 * r.cells;
          const x = 14 + i * 88;
          return (
            <g key={r.label} transform={`translate(${x} 0)`}>
              <rect x={0} y={60 - size} width={size} height={size} fill="rgba(111,180,255,0.18)" stroke={C.atm} />
              <text x={size / 2} y="76" textAnchor="middle" fontSize="10" fill={C.ink} fontFamily="var(--font-mono)">
                {r.label}
              </text>
              <text x={size / 2} y="90" textAnchor="middle" fontSize="8" fill={C.mist} fontFamily="var(--font-mono)">
                {r.cost}
              </text>
            </g>
          );
        })}
      </svg>
      <TipCaption>'auto' picks min(devicePixelRatio, 2); adaptive quality lowers it on slow frames.</TipCaption>
    </>
  );
}
