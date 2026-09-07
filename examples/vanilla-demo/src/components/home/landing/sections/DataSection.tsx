import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPause, faPlay } from '@fortawesome/sharp-solid-svg-icons';
import type { GlobeInstance } from '@your-globe/core';
import { DecorationGlobe } from '@/components/shared';
import { cn } from '@/lib/utils';
import { CodeBlock, SectionHeading } from '../atoms';
import { useCoarsePointer } from '../hooks/use-coarse-pointer';
import { useInViewport } from '../hooks/use-in-viewport';
import { ARCS, MARKERS, POPULATION, SCALE, SNIPPET, STOPS, TOUR } from '../data/tour';
import { enqueueIdle } from '../lib/idle-queue';

const API_ROWS: ReadonlyArray<{ readonly call: string; readonly what: string }> = [
  { call: 'setCountryData(values, scale)', what: 'Choropleth with sequential, diverging, threshold or categorical scales and a built-in legend.' },
  { call: 'setMarkers([…])', what: 'Instanced pins with pulse, hover scale, labels and tooltips.' },
  { call: 'setArcs([…])', what: 'Animated routes: solid or dashed, auto height, three head easings.' },
  { call: 'setHtmlMarkers([…])', what: 'Your own DOM on the surface, hidden when it rotates behind the planet.' },
  { call: "setDataLayer({ type: 'hexbin' })", what: 'Hexbin, bars, extruded, heatmap and chart layers on any kind.' },
  { call: 'setStory({ scenes })', what: 'Fly, focus, popups, timing and easing per scene. Play, pause, jump.' },
  { call: "on('countryClick', …)", what: 'Country, marker, surface and scene events, all typed.' },
];

/** A live outline globe carrying a choropleth, markers, arcs and a four-stop story. */
export function DataSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const near = useInViewport(sectionRef, { rootMargin: '40% 0px 40% 0px', once: true });
  const coarse = useCoarsePointer();
  // The globe mounts once — when the section comes near, or earlier during
  // idle time — and then stays: the core pauses it while it is off-screen,
  // and never rebuilding it keeps fast scrolling free of long tasks.
  const [mounted, setMounted] = useState(false);
  const [instance, setInstance] = useState<GlobeInstance | null>(null);
  const [scene, setScene] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  useEffect(() => {
    if (mounted) return undefined;
    // Let the planet stage warm its chapters first.
    let cancelQueue: (() => void) | null = null;
    const t = window.setTimeout(() => {
      cancelQueue = enqueueIdle(() => {
        setMounted(true);
      });
    }, 3000);
    return () => {
      window.clearTimeout(t);
      cancelQueue?.();
    };
  }, [mounted]);

  useEffect(() => {
    if (!instance) return undefined;
    const offEnter = instance.on('sceneEnter', ({ scene: s }) => setScene(s.id));
    return () => {
      offEnter();
    };
  }, [instance]);

  const jumpTo = (id: string): void => {
    if (!instance) return;
    instance.goToScene(id);
    setScene(id);
  };
  const togglePlay = (): void => {
    if (!instance) return;
    if (instance.isStoryPlaying()) {
      instance.pauseStory();
      setPlaying(false);
    } else {
      instance.playStory();
      setPlaying(true);
    }
  };

  return (
    <section ref={sectionRef} id="data" className="relative py-28 md:py-36" aria-label="Data layers">
      <div className="wrap grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="min-w-0 lg:sticky lg:top-28">
          <SectionHeading
            eyebrow="globe.setCountryData()"
            title="Data lives on the surface."
            lead="Every layer is one call on the instance and works on every kind. Fills, pins, routes, your own HTML, and a story that flies between them."
            leadClassName="max-w-[34rem]"
          />
          <dl className="reveal reveal-d3 mt-9 divide-y divide-[var(--hair)] border-y border-[var(--hair)]">
            {API_ROWS.map((row) => (
              <div key={row.call} className="grid gap-1 py-3.5 sm:grid-cols-[minmax(0,15rem)_1fr] sm:gap-6">
                <dt className="t-mono text-[var(--ice)]">{row.call}</dt>
                <dd className="t-body">{row.what}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="reveal card relative aspect-square overflow-hidden rounded-[24px] lg:aspect-[7/6]">
            {mounted && (
              <DecorationGlobe
                kind="outline"
                theme="outline-dark"
                speed={0.02}
                initialLat={18}
                initialLng={24}
                starfield={false}
                atmosphere
                framingPadding={0.1}
                interactive={!coarse}
                maxFps={60}
                resolution="low"
                onReady={({ instance: globe }) => {
                  globe.setCountryData(POPULATION, SCALE);
                  globe.setMarkers(MARKERS);
                  globe.setArcs(ARCS);
                  globe.setStory(TOUR);
                  setInstance(globe);
                }}
                className="absolute inset-0"
              />
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="pointer-events-auto flex flex-wrap gap-1.5 rounded-full border border-[var(--hair)] bg-[rgba(5,6,8,0.7)] p-1 backdrop-blur-md">
                {STOPS.map((stop) => (
                  <button
                    key={stop.id}
                    type="button"
                    onClick={() => jumpTo(stop.id)}
                    disabled={!instance}
                    className={cn('tab', scene === stop.id && 'is-active')}
                  >
                    {stop.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={togglePlay}
                disabled={!instance}
                className="btn btn-ghost btn-sm pointer-events-auto bg-[rgba(5,6,8,0.7)] backdrop-blur-md"
              >
                <FontAwesomeIcon icon={playing ? faPause : faPlay} className="size-2.5" />
                {playing ? 'Pause tour' : 'Play tour'}
              </button>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-[var(--hair)] bg-[rgba(5,6,8,0.7)] px-3.5 py-2.5 backdrop-blur-md">
              <div className="t-mono text-[var(--mist)]">population · millions</div>
              <div className="mt-2 h-1.5 w-40 rounded-full" style={{ background: 'linear-gradient(90deg, #6fb4ff, #ff8a4c)' }} />
              <div className="t-mono mt-1.5 flex justify-between text-[var(--ice)]">
                <span>0</span>
                <span>1500</span>
              </div>
            </div>

            {!instance && mounted && (
              <div className="t-mono pointer-events-none absolute inset-0 flex items-center justify-center text-[var(--mist)]">
                loading countries…
              </div>
            )}
          </div>
          <CodeBlock code={SNIPPET} title="data.ts" className="reveal reveal-d1" />
        </div>
      </div>
    </section>
  );
}
