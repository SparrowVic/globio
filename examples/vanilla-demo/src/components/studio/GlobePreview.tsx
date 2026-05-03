import { useEffect, useMemo, useRef } from 'react';
import { createGlobe, type DataLayer, type GlobeInstance } from '@your-globe/core';
import type { GlobeConfig } from '@your-globe/core';

import { structuralGlobeKey } from '@/configurator/builders';
import type { GlobeRuntimeConfig } from '@/configurator/types';

export interface FocusBehavior {
  readonly clickToFocus: boolean;
  readonly padding: number;
  readonly durationMs: number;
  readonly elevation: number;
  readonly pauseAutoRotate: boolean;
}

export function GlobePreview({
  config,
  dataLayer,
  focus,
  onReady,
  onMessage,
  command,
}: {
  readonly config: GlobeRuntimeConfig;
  readonly dataLayer: DataLayer | null;
  readonly focus: FocusBehavior;
  readonly onReady: (ready: boolean) => void;
  readonly onMessage: (message: string) => void;
  readonly command: { readonly type: 'none' | 'replay' | 'home'; readonly nonce: number };
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<GlobeInstance | null>(null);
  const configRef = useRef(config);
  // Focus settings live in a ref so we can change them at any time without
  // re-subscribing the countryClick handler. The handler reads the latest
  // values at click time.
  const focusRef = useRef(focus);
  const commandRef = useRef(0);
  const rebuildKey = useMemo(() => structuralGlobeKey(config), [config]);

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
    container.replaceChildren();
    const globe = createGlobe({ ...configRef.current, container });
    instanceRef.current = globe;

    const unsubscribeReady = globe.on('ready', () => {
      onReady(true);
      onMessage('Globe ready');
      // Fly to the configured initial position so the user's choice is
      // honored even on the first ready frame (createGlobe places the
      // camera there, but a short flyTo gives a consistent intro feel).
      const home = configRef.current.initialPosition ?? [18, 38];
      globe.flyTo(home, 2.85, { duration: 1 });
    });
    const unsubscribeError = globe.on('error', (error) => {
      onMessage(error.message);
    });
    const unsubscribeCountryClick = globe.on('countryClick', (event) => {
      const f = focusRef.current;
      if (!f.clickToFocus) return;
      globe.focusOnCountry(event.country.id, {
        padding: f.padding,
        duration: f.durationMs,
        elevation: f.elevation,
        pauseAutoRotateOnFocus: f.pauseAutoRotate,
      });
      onMessage(`Focus → ${event.country.name ?? event.country.id}`);
    });

    globe.mount();

    return () => {
      unsubscribeReady();
      unsubscribeError();
      unsubscribeCountryClick();
      globe.destroy();
      if (instanceRef.current === globe) instanceRef.current = null;
      onReady(false);
    };
  }, [onMessage, onReady, rebuildKey]);

  useEffect(() => {
    const partial: Partial<GlobeConfig> = {
      ...(config.autoRotate !== undefined ? { autoRotate: config.autoRotate } : {}),
      ...(config.zoom !== undefined ? { zoom: config.zoom } : {}),
      ...(config.minZoom !== undefined ? { minZoom: config.minZoom } : {}),
      ...(config.maxZoom !== undefined ? { maxZoom: config.maxZoom } : {}),
    };
    instanceRef.current?.update(partial);
  }, [config.autoRotate, config.zoom, config.minZoom, config.maxZoom]);

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
      const home = configRef.current.initialPosition ?? [18, 38];
      globe.flyTo(home, 2.85, { duration: 0.9 });
      onMessage('Camera reset');
    }
  }, [command, onMessage]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#03050d]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(19,75,104,0)_0%,rgba(4,8,18,0.18)_55%,rgba(2,5,12,0.66)_100%)]" />
    </div>
  );
}
