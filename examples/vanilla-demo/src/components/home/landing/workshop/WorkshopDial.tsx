import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface WorkshopDialProps {
  readonly label: string;
  readonly value: number; // 0..100
  readonly icon: IconDefinition;
  readonly color: string;
}

/**
 * Circular gauge replacing the previous progress-bar styling. Reads as
 * a piece of cockpit instrumentation rather than a generic progress
 * indicator. The drop-shadow on the live arc creates the soft glow
 * around active dials in the workshop mockup.
 */
export function WorkshopDial({ label, value, icon, color }: WorkshopDialProps) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="flex items-center gap-3">
        <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0">
          <circle cx="28" cy="28" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="3" fill="none" />
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 28 28)"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-300">
            <FontAwesomeIcon icon={icon} className="size-3" style={{ color }} />
            {label}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-500">{value}%</div>
        </div>
      </div>
    </div>
  );
}
