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
   * GlobeSettings keys whose changes should be pushed to the *running*
   * globe instance via `globe.update()` — the engine mutates relevant
   * layers in place (label thresholds, starfield uniforms, …). No
   * destroy + create, no flash. Most knobs sit here.
   *
   * Pass an empty array to never react to state changes after mount.
   */
  readonly watchedKeys: ReadonlyArray<keyof GlobeSettings>;
  /**
   * Subset of watchedKeys that the core engine *cannot yet* live-update,
   * so changes to these still require a full rebuild (destroy + create).
   * Use sparingly — every entry here is a moment of preview flicker for
   * the user. Empty by default. Add a knob when its live setter doesn't
   * exist yet, remove it once the core lands the setter.
   */
  readonly rebuildKeys?: ReadonlyArray<keyof GlobeSettings>;
  /**
   * Optional imperative mount hook — fires once per (re)build, after
   * `globe.mount()`. Used by arcs / markers presets to drop a fixture
   * dataset onto the fresh instance via `globe.setArcs / setMarkers`.
   */
  readonly onMount?: (globe: GlobeInstance, state: ConfiguratorState) => void;
  /**
   * Optional imperative live-update hook — fires on every watched-key
   * change *after* `globe.update()`. Used by arcs / markers presets to
   * push the dataset back through with the latest styling.
   */
  readonly onLiveUpdate?: (globe: GlobeInstance, state: ConfiguratorState) => void;
  readonly className?: string;
}

/**
 * Globe instance built from the *user's* `state.globe` (so it shows
 * exactly what Labels / Pulse / Stars / etc. settings produce) but with
 * the **cinematography preset's** kind / theme / framing / initial
 * position swapped in so the preview frames the configurator's effect
 * for clarity.
 *
 * Two effects:
 *  - Mount effect rebuilds the globe instance only when *cinematography*
 *    or a `rebuildKeys` field changes. These are the bits that the core
 *    engine reads at construction time.
 *  - Live-update effect calls `globe.update(buildGlobeConfig(state))`
 *    on every `watchSignature` change. The engine mutates the relevant
 *    layers in place — labels move/fade/halo without a single flash.
 *
 * Decoration semantics: country hover / clicks disabled, no data layer,
 * no focus-pulse-from-click. The user is editing here, not interacting.
 */
export function WorkshopPreviewGlobe({
  cinematography,
  state,
  watchedKeys,
  rebuildKeys,
  onMount,
  onLiveUpdate,
  className,
}: WorkshopPreviewGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<GlobeInstance | null>(null);

  // Stable signature for any *live-updatable* key. Whenever this string
  // changes we push the new config into the running globe via update().
  const watchSignature = watchedKeys
    .map((key) => `${String(key)}=${JSON.stringify(state.globe[key])}`)
    .join('|');

  // Stable signature for the *rebuild* subset only — destroying and
  // recreating the globe is expensive, so we limit rebuilds to fields
  // the engine can't live-update yet.
  const rebuildSignature = (rebuildKeys ?? [])
    .map((key) => `${String(key)}=${JSON.stringify(state.globe[key])}`)
    .join('|');

  // Debounce *only* the rebuild path — dragging a slider that triggers
  // a rebuild key would otherwise destroy + create the globe on every
  // tick. Live updates run undebounced (they're cheap field/uniform
  // mutations).
  const [debouncedRebuildSignature, setDebouncedRebuildSignature] = useState(rebuildSignature);
  useEffect(() => {
    if (debouncedRebuildSignature === rebuildSignature) return undefined;
    const t = window.setTimeout(() => setDebouncedRebuildSignature(rebuildSignature), 200);
    return () => window.clearTimeout(t);
  }, [rebuildSignature, debouncedRebuildSignature]);

  // ── Mount effect ──────────────────────────────────────────
  // Builds the globe instance. Re-runs only when cinematography or a
  // rebuild-required field changes. Everything else flows through the
  // live-update effect below.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const baseConfig = buildGlobeConfig(state);
    const globe = createGlobe({
      ...baseConfig,
      container,
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
      countries: { ...baseConfig.countries, hoverOccludeBackSide: state.globe.hoverOccludeBackSide },
    });
    instanceRef.current = globe;
    globe.mount();

    // Imperative drop — presets that drive the preview through API
    // (arcs / markers / etc.) seed their fixture dataset here.
    onMount?.(globe, state);

    return () => {
      globe.destroy();
      if (instanceRef.current === globe) instanceRef.current = null;
    };
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
    debouncedRebuildSignature,
  ]);

  // ── Live update effect ───────────────────────────────────
  // Pushes the latest config into the running globe whenever a watched
  // key changes. The engine handles the diff per layer (labels mutate
  // thresholds, starfield mutates uniforms or rebuilds the points
  // cloud in-place — see core's `update()` switch).
  useEffect(() => {
    const globe = instanceRef.current;
    if (!globe) return;
    const baseConfig = buildGlobeConfig(state);
    globe.update({
      ...(baseConfig.countryLabels !== undefined
        ? { countryLabels: baseConfig.countryLabels }
        : {}),
      ...(baseConfig.starfield !== undefined ? { starfield: baseConfig.starfield } : {}),
      ...(baseConfig.atmosphere !== undefined ? { atmosphere: baseConfig.atmosphere } : {}),
      ...(baseConfig.countries !== undefined ? { countries: baseConfig.countries } : {}),
      ...(baseConfig.outline !== undefined ? { outline: baseConfig.outline } : {}),
      ...(baseConfig.focusPulse !== undefined
        ? { focusPulse: baseConfig.focusPulse }
        : {}),
    });
    // Imperative live update — arcs / markers presets re-push their
    // fixture dataset with the latest styling so changes (width,
    // animation, etc.) propagate without rebuilding the globe.
    onLiveUpdate?.(globe, state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchSignature]);

  return (
    <div
      ref={containerRef}
      data-workshop-preview-host=""
      className={className}
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
