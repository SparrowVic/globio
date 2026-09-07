import { useCallback, useEffect, useRef, useState } from 'react';
import type { GlobeKind, ThemePresetName } from '@your-globe/core';
import { DecorationGlobe } from '@/components/shared';
import { STAGE_ARCS, STAGE_CINEMATIC } from './stage-config';

const FADE_MS = 900;
// If `ready` never arrives (WebGL hiccup), show the layer anyway.
const LIVE_TIMEOUT_MS = 4000;

interface Layer {
  readonly id: number;
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
  readonly live: boolean;
}

export interface GlobeCrossfadeProps {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
  readonly interactive: boolean;
}

/**
 * One visible globe at a time, swapped with a cross-fade. A kind/theme change
 * mounts the next globe invisibly on top; once it reports `onLive` (shaders
 * compiled, first frames presented) it fades in and the previous layer is
 * dropped. At most two WebGL contexts exist, and only during the fade.
 */
export function GlobeCrossfade({ kind, theme, interactive }: GlobeCrossfadeProps) {
  const [layers, setLayers] = useState<ReadonlyArray<Layer>>(() => [
    { id: 0, kind, theme, live: false },
  ]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setLayers((prev) => {
      const top = prev[prev.length - 1];
      if (top && top.kind === kind && top.theme === theme) return prev;
      // Keep only the last live layer underneath; a pending (invisible) one
      // is replaced outright so rapid scrolling never stacks contexts.
      const base = prev.filter((l) => l.live).slice(-1);
      return [...base, { id: nextId.current++, kind, theme, live: false }];
    });
  }, [kind, theme]);

  const markLive = useCallback((id: number) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, live: true } : l)));
    const t = window.setTimeout(() => {
      setLayers((prev) =>
        prev[prev.length - 1]?.id === id ? prev.filter((l) => l.id === id) : prev,
      );
    }, FADE_MS + 80);
    timers.current.push(t);
  }, []);

  useEffect(() => {
    const pending = layers.filter((l) => !l.live);
    if (pending.length === 0) return undefined;
    const t = window.setTimeout(() => {
      for (const l of pending) markLive(l.id);
    }, LIVE_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [layers, markLive]);

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );

  return (
    <div className="relative size-full">
      {layers.map((l) => (
        <div
          key={l.id}
          className="absolute inset-0"
          style={{
            opacity: l.live ? 1 : 0,
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
            {...(l.kind === 'cinematic' ? { cinematic: STAGE_CINEMATIC, arcs: STAGE_ARCS } : {})}
            onLive={() => markLive(l.id)}
            className="absolute inset-0"
          />
        </div>
      ))}
    </div>
  );
}
