import { TIP_COLORS as C, TipCaption } from './tip-primitives';

export default function SunModesTip() {
  return (
    <>
      <svg viewBox="0 0 270 106" role="img" aria-label="Sun modes: Fixed uses a direction vector, Realtime advances a simulated date, Orbit sweeps longitude at degrees per second">
        {['fixed', 'realtime', 'orbit'].map((mode, index) => (
          <g key={mode} transform={`translate(${index * 90 + 45} 44)`}>
            <circle r="21" fill="#0d1420" stroke={C.hair} />
            <path d="M0 -21 A21 21 0 0 1 0 21 Z" fill="rgba(255,138,76,0.25)" />
            <circle cx="31" cy="-16" r="4" fill={C.ember} />
            <path d="M25 -13 L14 -8" stroke={C.ember} />
            {mode === 'realtime' && <path d="M-10 -9 V0 H-3 M-16 0 A6 6 0 1 0 -10 -6" fill="none" stroke={C.atm} strokeWidth="1.3" />}
            {mode === 'orbit' && <path d="M-30 8 C-24 26 26 26 31 5 M26 8 L31 5 L33 11" fill="none" stroke={C.atm} strokeWidth="1.3" />}
            <text y="42" textAnchor="middle" fontSize="9" fill={C.ink} fontFamily="var(--font-mono)">{mode}</text>
            <text y="57" textAnchor="middle" fontSize="8" fill={C.mist}>{mode === 'fixed' ? 'direction' : mode === 'realtime' ? 'date × timeScale' : 'degrees / second'}</text>
          </g>
        ))}
      </svg>
      <TipCaption>Realtime starts from the configured date, or the current date when created. It advances with rendered time; timeScale controls that clock.</TipCaption>
    </>
  );
}
