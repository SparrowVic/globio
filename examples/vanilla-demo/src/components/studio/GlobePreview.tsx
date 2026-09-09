import { useEffect, useMemo, useRef, useState } from 'react';
import type { DataLayer, GlobeConfig, GlobeInstance } from '@your-globe/core';

import { structuralGlobeKey } from '@/configurator/builders';
import type { GlobeRuntimeConfig } from '@/configurator/types';
import { isGlobeRuntimeLoadError, loadGlobeRuntime } from '@/lib/globe-runtime';
import { studioHomeDistance } from '@/lib/studio-camera';

export interface FocusBehavior {
  readonly clickToFocus: boolean;
  readonly padding: number;
  readonly durationMs: number;
  readonly elevation: number;
  readonly pauseAutoRotate: boolean;
}

export function GlobePreview({
  config,
  themeRevision = 0,
  dataLayer,
  focus,
  onReady,
  onMessage,
  command,
}: {
  readonly config: GlobeRuntimeConfig;
  /** Rebuild edited registry tokens: theme is a construction-time core setting. */
  readonly themeRevision?: number;
  readonly dataLayer: DataLayer | null;
  readonly focus: FocusBehavior;
  readonly onReady: (ready: boolean) => void;
  readonly onMessage: (message: string) => void;
  readonly command: { readonly type: 'none' | 'replay' | 'home'; readonly nonce: number };
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failure, setFailure] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const instanceRef = useRef<GlobeInstance | null>(null);
  const configRef = useRef(config);
  const dataLayerRef = useRef(dataLayer);
  dataLayerRef.current = dataLayer;
  // Focus settings live in a ref so we can change them at any time without
  // re-subscribing the countryClick handler. The handler reads the latest
  // values at click time.
  const focusRef = useRef(focus);
  const commandRef = useRef(0);
  const resetCameraRef = useRef<((duration: number) => void) | null>(null);
  const rebuildKey = useMemo(() => `${structuralGlobeKey(config)}:${themeRevision}`, [config, themeRevision]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    onReady(false);
    setFailure(null);
    let cancelled = false;
    let activeGlobe: GlobeInstance | undefined;
    let followHome = true;
    const subscriptions: Array<() => void> = [];
    const frameHome = (duration: number) => {
      const current = configRef.current;
      activeGlobe?.flyTo(
        current.initialPosition ?? [18, 38],
        studioHomeDistance(container.clientWidth, container.clientHeight, current),
        { duration },
      );
    };
    const resetCamera = (duration: number) => { followHome = true; frameHome(duration); };
    resetCameraRef.current = resetCamera;
    const stopFollowing = () => { followHome = false; };
    container.addEventListener('pointerdown', stopFollowing, { passive: true });
    container.addEventListener('wheel', stopFollowing, { passive: true });
    let aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const resize = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      const nextAspect = container.clientWidth / container.clientHeight;
      if (Math.abs(nextAspect - aspect) > 0.02 && followHome) frameHome(0);
      aspect = nextAspect;
    });
    resize.observe(container);
    const dispose = () => {
      resize.disconnect();
      container.removeEventListener('pointerdown', stopFollowing);
      container.removeEventListener('wheel', stopFollowing);
      if (resetCameraRef.current === resetCamera) resetCameraRef.current = null;
      subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
      activeGlobe?.destroy();
      if (instanceRef.current === activeGlobe) instanceRef.current = null;
    };
    const fail = (reason: unknown) => {
      if (cancelled) return;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      dispose();
      setFailure(error);
      onReady(false);
      onMessage(error.message);
    };

    void loadGlobeRuntime().then(({ createGlobe }) => {
      if (cancelled) return;
      const globe = createGlobe({ ...configRef.current, container });
      activeGlobe = globe;
      instanceRef.current = globe;

      subscriptions.push(
        globe.on('ready', () => {
          if (cancelled) return;
          setFailure(null);
          onReady(true);
          onMessage('Globe ready');
          if (followHome) frameHome(0);
        }),
        globe.on('error', fail),
        globe.on('countryClick', (event) => {
          const f = focusRef.current;
          if (!f.clickToFocus) return;
          globe.focusOnCountry(event.country.id, {
            padding: f.padding,
            duration: f.durationMs,
            elevation: f.elevation,
            pauseAutoRotateOnFocus: f.pauseAutoRotate,
            center: event.point,
          });
          onMessage(`Focus → ${event.country.name ?? event.country.id}`);
        }),
      );
      const canvas = globe.getCanvas();
      const contextLost = () => fail(new Error('The WebGL context was lost. Try the preview again.'));
      canvas.addEventListener('webglcontextlost', contextLost);
      subscriptions.push(() => canvas.removeEventListener('webglcontextlost', contextLost));

      frameHome(0);
      globe.mount();
      // Apply the latest layer even when it changed during the runtime
      // download, or this rebuild preserved the same dataLayer reference.
      globe.setDataLayer(dataLayerRef.current);
    }).catch(fail);

    return () => {
      cancelled = true;
      dispose();
      onReady(false);
    };
  }, [onMessage, onReady, rebuildKey, attempt]);

  useEffect(() => {
    // Live-update path for the studio main globe. Mirrors the spread
    // `WorkshopPreviewGlobe` uses so config changes coming back from
    // the workshop modal (per-kind sub-trees, country fill, labels,
    // atmosphere, etc.) actually reach the running globe — without
    // the per-kind spread, dotted dot colours / hologram shell knobs
    // / paper aging marks etc. would only show up after a
    // `rebuildKey` change forced a destroy + create.
    //
    // `rebuildKey` (computed from `structuralGlobeKey`) intentionally
    // *excludes* per-kind sub-trees so a knob tweak doesn't trigger a
    // full rebuild — instead the live-update path here pushes the
    // change to the running `kindHandle` setter via core's
    // `globe.update(...)` dispatch.
    const partial: Partial<GlobeConfig> = {
      ...(config.autoRotate !== undefined ? { autoRotate: config.autoRotate } : {}),
      ...(config.zoom !== undefined ? { zoom: config.zoom } : {}),
      ...(config.minZoom !== undefined ? { minZoom: config.minZoom } : {}),
      ...(config.maxZoom !== undefined ? { maxZoom: config.maxZoom } : {}),
      ...(config.countryLabels !== undefined ? { countryLabels: config.countryLabels } : {}),
      ...(config.markers !== undefined ? { markers: config.markers } : {}),
      ...(config.htmlMarkers !== undefined ? { htmlMarkers: config.htmlMarkers } : {}),
      ...(config.arcs !== undefined ? { arcs: config.arcs } : {}),
      ...(config.starfield !== undefined ? { starfield: config.starfield } : {}),
      ...(config.atmosphere !== undefined ? { atmosphere: config.atmosphere } : {}),
      ...(config.countries !== undefined ? { countries: config.countries } : {}),
      ...(config.outline !== undefined ? { outline: config.outline } : {}),
      ...(config.focusPulse !== undefined ? { focusPulse: config.focusPulse } : {}),
      ...(config.dotted !== undefined ? { dotted: config.dotted } : {}),
      ...(config.hologram !== undefined ? { hologram: config.hologram } : {}),
      ...(config.cinematic !== undefined ? { cinematic: config.cinematic } : {}),
      ...(config.paper !== undefined ? { paper: config.paper } : {}),
      ...(config.wireframe !== undefined ? { wireframe: config.wireframe } : {}),
      ...(config.postprocessing !== undefined ? { postprocessing: config.postprocessing } : {}),
    };
    instanceRef.current?.update(partial);
  }, [
    config.autoRotate,
    config.zoom,
    config.minZoom,
    config.maxZoom,
    config.countryLabels,
    config.markers,
    config.htmlMarkers,
    config.arcs,
    config.starfield,
    config.atmosphere,
    config.countries,
    config.outline,
    config.focusPulse,
    config.dotted,
    config.hologram,
    config.cinematic,
    config.paper,
    config.wireframe,
    config.postprocessing,
  ]);

  useEffect(() => {
    instanceRef.current?.setDataLayer(dataLayer);
  }, [dataLayer]);

  useEffect(() => {
    const globe = instanceRef.current;
    if (!globe || command.nonce === commandRef.current) return;
    commandRef.current = command.nonce;
    if (command.type === 'replay') {
      const replayed = globe.playDataLayerAnimation();
      onMessage(replayed ? 'Animation replayed' : 'Layer has no replay animation');
      return;
    }
    if (command.type === 'home') {
      resetCameraRef.current?.(900);
      onMessage('Camera reset');
    }
  }, [command, onMessage]);

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#03050d]"
      data-studio-globe-host
    >
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(19,75,104,0)_0%,rgba(4,8,18,0.18)_55%,rgba(2,5,12,0.66)_100%)]" />
      {failure && <div className="absolute inset-0 flex items-center justify-center p-6">
        <section className="w-full max-w-sm rounded-lg border border-white/15 bg-[#090b10] p-5 text-slate-100" role="alert">
          <h2 className="text-base font-medium">Preview unavailable</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {isGlobeRuntimeLoadError(failure)
              ? 'The globe engine could not download. Reload the page to try again.'
              : 'The live globe could not start. Try the preview again, or choose another style.'}
          </p>
          <button type="button" className="mt-4 rounded-md border border-white/25 px-3 py-2 text-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            onClick={() => isGlobeRuntimeLoadError(failure) ? window.location.reload() : setAttempt((value) => value + 1)}>
            {isGlobeRuntimeLoadError(failure) ? 'Reload page' : 'Try preview again'}
          </button>
        </section>
      </div>}
    </div>
  );
}
