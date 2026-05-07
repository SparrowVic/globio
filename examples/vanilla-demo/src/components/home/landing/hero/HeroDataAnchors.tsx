import { useEffect, useRef, useState } from 'react';
import type { DecorationGlobeReadyApi } from '@/components/shared';

interface Anchor {
  readonly lat: number;
  readonly lng: number;
  readonly label: string;
  readonly meta: string;
}

const ANCHORS: ReadonlyArray<Anchor> = [
  { lat: 40.7, lng: -74.0, label: 'LIVE TRACE', meta: '40.7°N · 74.0°W' },
  { lat: -23.5, lng: -46.6, label: 'SIGNAL FEED', meta: '23.5°S · 46.6°W' },
];

export interface HeroDataAnchorsProps {
  readonly api: DecorationGlobeReadyApi | null;
}

/**
 * DOM anchors pinned to lat/lng on the hero globe. Re-projects every
 * animation frame via `globe.project()` so labels track rotation.
 * Anchors on the back hemisphere fade out (project() returns null).
 *
 * Position lives in component state via `useState` so the labels
 * actually re-render — but each tick is a *throttled* update through
 * rAF, not a setState-per-frame storm.
 */
export function HeroDataAnchors({ api }: HeroDataAnchorsProps) {
  const [positions, setPositions] = useState<ReadonlyArray<readonly [number, number] | null>>([
    null,
    null,
  ]);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!api) return undefined;
    let lastTick = 0;
    const tick = (now: number) => {
      // Throttle to ~30fps — visually identical to 60fps for these labels
      // and gives back ~half the main-thread cost of the projection math.
      if (now - lastTick > 33) {
        lastTick = now;
        const next = ANCHORS.map((a) => api.project(a.lat, a.lng));
        setPositions(next);
      }
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, [api]);

  return (
    <>
      {ANCHORS.map((anchor, i) => {
        const pos = positions[i];
        if (!pos) return null;
        return (
          <div
            key={anchor.label}
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-xl border border-white/[0.14] bg-black/65 px-3 py-2 shadow-[0_12px_40px_-22px_rgba(0,0,0,1)] backdrop-blur-xl"
            style={{
              left: pos[0],
              top: pos[1],
              transition: 'opacity 200ms ease',
            }}
          >
            <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-white">
              {anchor.label}
            </div>
            <div className="mt-0.5 font-mono text-[9px] text-slate-400">{anchor.meta}</div>
            <span
              aria-hidden="true"
              className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-white/[0.14] bg-black/65"
            />
          </div>
        );
      })}
    </>
  );
}
