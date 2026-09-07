import { TIP_COLORS as C, TipCaption } from './tip-primitives';

const LEVELS = [
  { name: 'low', source: '110m', coast: 'M8 20 L27 8 L53 17 L57 42 L37 56 L12 44 Z' },
  { name: 'medium', source: '50m', coast: 'M8 20 L19 16 L27 8 L35 13 L53 17 L49 27 L57 42 L46 43 L37 56 L27 49 L12 44 L16 34 Z' },
  { name: 'high', source: '10m', coast: 'M8 20 L14 19 L19 16 L21 10 L27 8 L30 12 L35 13 L40 11 L43 16 L53 17 L51 23 L46 25 L49 27 L47 32 L55 36 L57 42 L50 46 L46 43 L42 51 L37 56 L32 51 L27 49 L22 51 L12 44 L15 40 L13 38 L16 34 L12 28 Z' },
] as const;

/** Schematic coastline detail; dataset names come from the built-in loader. */
export default function ResolutionTip() {
  return (
    <>
      <svg viewBox="0 0 270 105" role="img" aria-label="Country resolution: low uses the 110m dataset, medium uses 50m, high uses 10m. Higher resolution preserves more coastline detail.">
        {LEVELS.map((level, index) => (
          <g key={level.name} transform={`translate(${index * 90 + 12} 0)`}>
            <path d={level.coast} fill="rgba(111,180,255,0.12)" stroke={C.atm} strokeWidth="1.2" />
            <text x="33" y="78" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">{level.name}</text>
            <text x="33" y="96" textAnchor="middle" fontSize="8" fill={C.mist}>{level.source}{level.name === 'medium' ? ' · default' : ''}</text>
          </g>
        ))}
      </svg>
      <TipCaption>Higher detail costs download, parsing, and geometry work. Globes sharing a data URL reuse the cached country data.</TipCaption>
    </>
  );
}
