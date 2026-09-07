import { TIP_COLORS as C, TipCaption } from './tip-primitives';

const LEVELS: ReadonlyArray<{ readonly name: string; readonly bytes: string; readonly width: number; readonly note: string }> = [
  { name: 'low', bytes: '~90 kB', width: 40, note: 'decoration, thumbnails' },
  { name: 'medium', bytes: '~400 kB', width: 130, note: 'default, hero globes' },
  { name: 'high', bytes: 'largest', width: 220, note: 'close-ups' },
];

/** Download size per resolution, as bars. */
export default function ResolutionTip() {
  return (
    <>
      <svg viewBox="0 0 270 84" role="img" aria-label="Country geometry per resolution: low about 90 kilobytes, medium about 400, high the largest">
        {LEVELS.map((l, i) => (
          <g key={l.name} transform={`translate(0 ${8 + i * 26})`}>
            <text x="0" y="12" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">
              {l.name}
            </text>
            <rect x="46" y="3" width={l.width} height="12" rx="3" fill={i === 1 ? C.atm : 'rgba(111,180,255,0.35)'} />
            <text x={52 + l.width} y="12" fontSize="8" fill={C.mist} fontFamily="var(--font-mono)">
              {l.bytes} · {l.note}
            </text>
          </g>
        ))}
      </svg>
      <TipCaption>Fetched once and shared between globes of the same resolution; build time follows the same order.</TipCaption>
    </>
  );
}
