import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobeKind, ResolutionLevel, ThemePresetName } from '@your-globe/core';
import { DecorationGlobe } from '@/components/shared';
import { enqueueIdle } from '../lib/idle-queue';
import { STAGE_ARCS, STAGE_CINEMATIC } from './stage-config';

const FADE_MS = 900;
// A layer that never reports live (WebGL hiccup) is shown anyway after this.
const LIVE_TIMEOUT_MS = 5000;
// Theme variants beyond the warm set that stay mounted (oldest evicted).
const MAX_EXTRA_LAYERS = 2;

export interface DeckEntry {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
}

interface Layer extends DeckEntry {
  readonly key: string;
  readonly live: boolean;
}

export interface GlobeDeckProps extends DeckEntry {
  readonly interactive: boolean;
  /** Entries to build ahead of time, in order, whenever the page is idle. */
  readonly warm: ReadonlyArray<DeckEntry>;
  /** Country geometry resolution per kind; undefined = core default. */
  readonly resolutionFor?: (kind: GlobeKind) => ResolutionLevel | undefined;
}

const keyOf = (entry: DeckEntry): string => `${entry.kind}/${entry.theme}`;

/**
 * A deck of globes, one per kind + theme, of which exactly one is shown.
 *
 * Building a globe blocks the main thread for 60–400 ms, so the deck never
 * builds during a scroll: chapters are warmed one at a time while the page
 * is idle, and a switch between two live layers is just a cross-fade. A
 * layer that is not shown is paused (no frame time) and hidden (no
 * compositing); it keeps its WebGL context so showing it again is free.
 */
export function GlobeDeck({ kind, theme, interactive, warm, resolutionFor }: GlobeDeckProps) {
  const activeKey = keyOf({ kind, theme });
  const [layers, setLayers] = useState<ReadonlyArray<Layer>>(() => [
    { key: activeKey, kind, theme, live: false },
  ]);
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [fadingKey, setFadingKey] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const liveResolvers = useRef(new Map<string, () => void>());
  const warmKey = useMemo(() => warm.map(keyOf).join('|'), [warm]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const addLayer = useCallback((entry: DeckEntry) => {
    setLayers((prev) => {
      const key = keyOf(entry);
      if (prev.some((l) => l.key === key)) return prev;
      return [...prev, { ...entry, key, live: false }];
    });
  }, []);

  // The requested layer must exist; it is created hidden and unpaused so it
  // can render its first frames and report live.
  useEffect(() => {
    addLayer({ kind, theme });
  }, [kind, theme, addLayer]);

  // Show the active layer as soon as it is live; the previous one fades out
  // and is paused after the fade.
  const activeLive = layers.find((l) => l.key === activeKey)?.live ?? false;
  useEffect(() => {
    if (!activeLive || shownKey === activeKey) return;
    const previous = shownKey;
    setShownKey(activeKey);
    if (previous === null) return;
    setFadingKey(previous);
    later(() => setFadingKey((current) => (current === previous ? null : current)), FADE_MS + 60);
  }, [activeLive, activeKey, shownKey, later]);

  const markLive = useCallback((key: string) => {
    setLayers((prev) => prev.map((l) => (l.key === key ? { ...l, live: true } : l)));
    liveResolvers.current.get(key)?.();
    liveResolvers.current.delete(key);
  }, []);

  // Safety net: never leave the stage blank if `ready` does not arrive.
  useEffect(() => {
    const pending = layers.filter((l) => !l.live);
    if (pending.length === 0) return undefined;
    const t = window.setTimeout(() => {
      for (const l of pending) markLive(l.key);
    }, LIVE_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [layers, markLive]);

  // Warm the remaining entries one at a time, only while idle and only once
  // every mounted layer is live (one synchronous build at a time).
  const allLive = layers.every((l) => l.live);
  useEffect(() => {
    if (!allLive) return undefined;
    const next = warm.find((entry) => !layers.some((l) => l.key === keyOf(entry)));
    if (!next) return undefined;
    const key = keyOf(next);
    const cancel = enqueueIdle(
      () =>
        new Promise<void>((resolve) => {
          liveResolvers.current.set(key, resolve);
          addLayer(next);
          // Resolve regardless so the queue never stalls on a lost layer.
          later(() => {
            liveResolvers.current.delete(key);
            resolve();
          }, LIVE_TIMEOUT_MS + 500);
        }),
    );
    return cancel;
    // `warmKey` stands in for the `warm` array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLive, layers, warmKey, addLayer, later]);

  // Evict old theme variants so a curious visitor cannot pile up contexts.
  useEffect(() => {
    const keep = new Set(warm.map(keyOf));
    keep.add(activeKey);
    if (shownKey) keep.add(shownKey);
    if (fadingKey) keep.add(fadingKey);
    const extras = layers.filter((l) => !keep.has(l.key));
    if (extras.length <= MAX_EXTRA_LAYERS) return;
    const drop = new Set(extras.slice(0, extras.length - MAX_EXTRA_LAYERS).map((l) => l.key));
    setLayers((prev) => prev.filter((l) => !drop.has(l.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, warmKey, activeKey, shownKey, fadingKey]);

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );

  return (
    <div className="relative size-full">
      {layers.map((l) => {
        const shown = l.key === shownKey;
        const fading = l.key === fadingKey;
        // A layer that is neither shown nor fading is parked: paused once it
        // is live, and removed from painting. A not-yet-live layer keeps
        // rendering (invisibly) so it can report live.
        const parked = !shown && !fading && l.live;
        const resolution = resolutionFor?.(l.kind);
        return (
          <div
            key={l.key}
            className="absolute inset-0"
            style={{
              opacity: shown ? 1 : 0,
              visibility: parked ? 'hidden' : 'visible',
              pointerEvents: shown ? 'auto' : 'none',
              transition: `opacity ${FADE_MS}ms cubic-bezier(0.2, 0.7, 0.2, 1)`,
            }}
          >
            <DecorationGlobe
              kind={l.kind}
              theme={l.theme}
              speed={0.05}
              initialLat={16}
              initialLng={-38}
              axisTilt={23.5}
              starfield={false}
              atmosphere
              framingPadding={0.04}
              interactive={interactive}
              maxFps={60}
              paused={parked}
              {...(resolution !== undefined && { resolution })}
              {...(l.kind === 'cinematic' ? { cinematic: STAGE_CINEMATIC, arcs: STAGE_ARCS } : {})}
              onLive={() => markLive(l.key)}
              className="absolute inset-0"
            />
          </div>
        );
      })}
    </div>
  );
}
