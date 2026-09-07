import { TIP_COLORS as C, TipCaption } from './tip-primitives';

/** A frame timeline that stops while the globe is hidden and resumes without a jump. */
export default function PausingTip() {
  const ticks = Array.from({ length: 22 }, (_, i) => i);
  return (
    <>
      <svg viewBox="0 0 270 70" role="img" aria-label="Frames are drawn while visible, none while hidden, and drawing resumes when the globe is visible again">
        <rect x="88" y="10" width="76" height="34" rx="4" fill="rgba(255,138,76,0.10)" stroke="rgba(255,138,76,0.5)" strokeDasharray="3 3" />
        <text x="126" y="8" textAnchor="middle" fontSize="8" fill={C.ember} fontFamily="var(--font-mono)">hidden</text>
        {ticks.map((i) => {
          const x = 14 + i * 11.5;
          const hidden = x > 90 && x < 160;
          return <rect key={i} x={x} y={hidden ? 30 : 16} width="6" height={hidden ? 2 : 20} rx="1" fill={hidden ? C.hair : C.atm} />;
        })}
        <text x="14" y="62" fontSize="8" fill={C.mist} fontFamily="var(--font-mono)">frames drawn</text>
        <text x="256" y="62" textAnchor="end" fontSize="8" fill={C.mist} fontFamily="var(--font-mono)">resumes in step</text>
      </svg>
      <TipCaption>Automatic for off-screen globes and hidden tabs; setPaused() does the same on demand.</TipCaption>
    </>
  );
}
