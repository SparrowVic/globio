import { useEffect, useRef, useState } from 'react';
import { createGlobe, type GlobeInstance } from '@your-globe/core';

import { buildGlobeConfig } from '@/configurator/builders';
import type { ConfiguratorState, GlobeSettings } from '@/configurator/types';
import type { PreviewCinematography } from './configurators';

export interface WorkshopPreviewGlobeProps {
  /** Cinematography preset — kind, theme, framing, initial position, etc. */
  readonly cinematography: PreviewCinematography;
  /**
   * The current full configurator state. We pull the user's actual
   * `state.globe` settings (labels, pulse, hover, etc.) and merge them
   * with the cinematography so the preview reflects what they're tuning
   * right now — that's the whole point of Workshop's deep-dive mode.
   */
  readonly state: ConfiguratorState;
  /**
   * Subset of GlobeSettings keys the active configurator owns. Changes to
   * these keys re-create the preview globe instance (most globe config
   * fields aren't live-updatable). Changes outside this set are ignored
   * — keeps the preview from thrashing on unrelated state mutations.
   *
   * Pass an empty array to never re-create after mount (useful for
   * coming-soon presets that just want a static cinematic).
   */
  readonly watchedKeys: ReadonlyArray<keyof GlobeSettings>;
  readonly className?: string;
}

/**
 * Globe instance built from the *user's* `state.globe` (so it shows
 * exactly what Labels / Pulse / Stars / etc. settings produce) but with
 * the **cinematography preset's** kind / theme / framing / initial
 * position swapped in so the preview frames the configurator's effect
 * for clarity.
 *
 * Re-creates the underlying globe whenever any field in `watchedKeys`
 * changes — most `createGlobe` config is read once at construction. The
 * preset declares which keys it cares about (e.g. labels preset watches
 * `countryLabels`, `labelMinScreenSize`, `labelHaloEnabled`, …).
 *
 * Decoration semantics: country hover / clicks disabled, no data layer,
 * no focus-pulse-from-click. The user is editing here, not interacting
 * with the preview.
 */
export function WorkshopPreviewGlobe({
  cinematography,
  state,
  watchedKeys,
  className,
}: WorkshopPreviewGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<GlobeInstance | null>(null);

  // Build the watch signature from the keys this preset cares about.
  // Stringifying gives a stable dep that React can compare reliably,
  // even when a key holds an object (label halo, etc.).
  const watchSignature = watchedKeys
    .map((key) => `${String(key)}=${JSON.stringify(state.globe[key])}`)
    .join('|');

  // Debounce the rebuild signature: rapid successive changes (e.g. a
  // user dragging a slider) shouldn't tear down + recreate the globe
  // instance on every frame. We hold the last *settled* signature for
  // 200ms; only when it stops changing do we rebuild.
  const [debouncedSignature, setDebouncedSignature] = useState(watchSignature);
  useEffect(() => {
    if (debouncedSignature === watchSignature) return undefined;
    const t = window.setTimeout(() => setDebouncedSignature(watchSignature), 200);
    return () => window.clearTimeout(t);
  }, [watchSignature, debouncedSignature]);

  // Briefly dim the container during a rebuild so the destroy + create
  // flash doesn't read as a hard "pop". The dip is centred on the
  // moment debouncedSignature settles (which is when the rebuild
  // useEffect actually fires) — opacity drops to ~0.45 over 120ms,
  // rebuild happens, then fades back to 1 over 220ms.
  const [rebuildPulse, setRebuildPulse] = useState(false);
  useEffect(() => {
    setRebuildPulse(true);
    const t = window.setTimeout(() => setRebuildPulse(false), 240);
    return () => window.clearTimeout(t);
  }, [debouncedSignature]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    // Build a full GlobeConfig from current state (so labels / pulse /
    // hover / etc. settings flow through) then layer the cinematography
    // overrides on top — cinematography always wins on visual identity
    // (kind / theme / framing / initial position) so the preview stays
    // composed regardless of what the user has set in main.
    const baseConfig = buildGlobeConfig(state);
    const globe = createGlobe({
      ...baseConfig,
      container,
      // Cinematography wins on visual identity — kind / theme / framing
      // / initial position keep the preview composed regardless of what
      // the user has set in main.
      kind: cinematography.kind,
      theme: cinematography.theme,
      transparent: true,
      framing: { padding: cinematography.framingPadding ?? 0.18, lockZoom: true },
      atmosphere: { enabled: cinematography.atmosphere ?? true },
      starfield:
        cinematography.starfield === false
          ? { enabled: false }
          : (baseConfig.starfield ?? { enabled: true }),
      autoRotate: { enabled: true, speed: cinematography.speed ?? 0.04 },
      initialPosition: [cinematography.initialLat, cinematography.initialLng],
      // Everything else flows through from the user's settings — that's
      // what the user is editing. Hover, focus-pulse origin, surface-
      // click pulse spawning, etc. all reflect their current choices.
      countries: { ...baseConfig.countries, hoverOccludeBackSide: state.globe.hoverOccludeBackSide },
    });
    instanceRef.current = globe;
    globe.mount();

    return () => {
      globe.destroy();
      if (instanceRef.current === globe) instanceRef.current = null;
    };
    // We rebuild the instance only when the cinematography preset itself
    // changes or one of the watched keys does. Other state mutations
    // (e.g. user toggling a control unrelated to this configurator) are
    // intentionally ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cinematography.kind,
    cinematography.theme,
    cinematography.initialLat,
    cinematography.initialLng,
    cinematography.speed,
    cinematography.framingPadding,
    cinematography.atmosphere,
    cinematography.starfield,
    debouncedSignature,
  ]);

  return (
    <div
      ref={containerRef}
      data-workshop-preview-host=""
      className={className}
      style={{
        opacity: rebuildPulse ? 0.45 : 1,
        transition: rebuildPulse
          ? 'opacity 120ms ease-out'
          : 'opacity 220ms ease-out',
      }}
      // Pointer events stay enabled so the user's hover / surface-click
      // settings can fire (Hover preset needs hover, Pulse preset wants
      // click → spawn pulse). Click-to-focus stays disabled because the
      // preview's `WorkshopPreviewGlobe` doesn't register a countryClick
      // handler — that's a feature of the demo's main `GlobePreview`,
      // not a property of `createGlobe` itself.
      //
      // The data-attribute lets `capturePreviewGlobe()` find this canvas
      // without ref-prop-drilling — used to snapshot the preview into
      // the closing bridge so the workshop collapse reads as a single,
      // continuous globe travelling back to the main stage.
    />
  );
}
