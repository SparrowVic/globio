import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faChevronRight } from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { GlobeInstance } from '@your-globe/core';
import { cn } from '@/lib/utils';

interface SceneEntry {
  readonly id: string;
  readonly label: string;
  readonly position: readonly [number, number];
  readonly meta: string;
}

const SCENES: ReadonlyArray<SceneEntry> = [
  { id: 'tokyo', label: 'Tokyo', position: [35.6, 139.7], meta: '35.6°N · 139.7°E' },
  { id: 'nyc', label: 'New York', position: [40.7, -74.0], meta: '40.7°N · 74.0°W' },
  { id: 'cairo', label: 'Cairo', position: [30.0, 31.2], meta: '30.0°N · 31.2°E' },
  { id: 'sao-paulo', label: 'São Paulo', position: [-23.5, -46.6], meta: '23.5°S · 46.6°W' },
];

const PLAY_INTERVAL_MS = 5500;

export interface StoryTimelineProps {
  readonly instance: GlobeInstance | null;
}

/**
 * Functional scene timeline: clicking a scene calls `globe.flyTo()` on
 * the underlying instance with a cinematic easing. The play button
 * cycles through scenes on a fixed interval — long enough for the camera
 * to settle plus a beat for the viewer to register the location.
 */
export function StoryTimeline({ instance }: StoryTimelineProps) {
  const [activeId, setActiveId] = useState(SCENES[0].id);
  const [playing, setPlaying] = useState(false);

  const flyTo = (entry: SceneEntry) => {
    setActiveId(entry.id);
    instance?.flyTo([entry.position[0], entry.position[1]], undefined, { duration: 2200 });
  };

  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      setActiveId((prev) => {
        const idx = SCENES.findIndex((s) => s.id === prev);
        const next = SCENES[(idx + 1) % SCENES.length];
        instance?.flyTo([next.position[0], next.position[1]], undefined, { duration: 2200 });
        return next.id;
      });
    }, PLAY_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, instance]);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
          scene timeline
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.035] px-2.5 py-1 text-[11px] text-slate-200 hover:border-white/25"
        >
          <FontAwesomeIcon icon={playing ? faPause : faPlay} className="size-3 text-amber-200" />
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto">
        {SCENES.map((s, i) => (
          <div key={s.id} className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => flyTo(s)}
              className={cn(
                'flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-all duration-200',
                activeId === s.id
                  ? 'border-amber-200/55 bg-amber-200/[0.08] shadow-[0_0_22px_-12px_rgba(251,191,36,1)]'
                  : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.2]',
              )}
            >
              <span className="text-xs font-semibold text-white">{s.label}</span>
              <span className="mt-0.5 font-mono text-[9px] text-slate-500">{s.meta}</span>
            </button>
            {i < SCENES.length - 1 && (
              <FontAwesomeIcon icon={faChevronRight} className="size-2 text-slate-600" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
