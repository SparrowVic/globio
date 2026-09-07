import { TIP_COLORS as C, TipCaption } from './tip-primitives';

const MODES: ReadonlyArray<{ readonly name: string; readonly fills: ReadonlyArray<string> }> = [
  { name: 'none', fills: ['transparent', 'transparent', 'transparent'] },
  { name: 'always', fills: ['#243046', '#243046', '#243046'] },
  { name: 'palette', fills: ['#243046', '#2f3d5c', '#3b4c72'] },
  { name: 'data', fills: ['#1e3a5f', '#2d6db3', '#6fb4ff'] },
];

/** Four modes of the country fill layer, as three neighbouring countries. */
export default function FillModesTip() {
  return (
    <>
      <svg viewBox="0 0 270 92" role="img" aria-label="Fill modes: none, one colour for all, a palette by index, or colours from data">
        {MODES.map((m, i) => (
          <g key={m.name} transform={`translate(${6 + i * 66} 8)`}>
            <path d="M4 14 L30 6 L34 34 L10 40 Z" fill={m.fills[0]} stroke={C.hair} />
            <path d="M30 6 L56 12 L52 38 L34 34 Z" fill={m.fills[1]} stroke={C.hair} />
            <path d="M10 40 L34 34 L52 38 L40 60 L14 58 Z" fill={m.fills[2]} stroke={C.hair} />
            <text x="30" y="78" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">
              {m.name}
            </text>
          </g>
        ))}
      </svg>
      <TipCaption>setCountryData() switches the layer to data; hover and active colours recolour one country on top.</TipCaption>
    </>
  );
}
