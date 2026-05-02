import { useEffect, useMemo, useRef } from 'react';
import { createGlobe, type DataLayer, type GlobeInstance } from '@your-globe/core';
import type { GlobeConfig } from '@your-globe/core';

import { structuralGlobeKey } from '@/configurator/builders';
import type { GlobeRuntimeConfig } from '@/configurator/types';

export function GlobePreview({
  config,
  dataLayer,
  onReady,
  onMessage,
  command,
}: {
  readonly config: GlobeRuntimeConfig;
  readonly dataLayer: DataLayer | null;
  readonly onReady: (ready: boolean) => void;
  readonly onMessage: (message: string) => void;
  readonly command: { readonly type: 'none' | 'replay' | 'home'; readonly nonce: number };
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<GlobeInstance | null>(null);
  const configRef = useRef(config);
  const commandRef = useRef(0);
  const rebuildKey = useMemo(() => structuralGlobeKey(config), [config]);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

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
      globe.flyTo([18, 38], 2.85, { duration: 1 });
    });
    const unsubscribeError = globe.on('error', (error) => {
      onMessage(error.message);
    });

    globe.mount();

    return () => {
      unsubscribeReady();
      unsubscribeError();
      globe.destroy();
      if (instanceRef.current === globe) instanceRef.current = null;
      onReady(false);
    };
  }, [onMessage, onReady, rebuildKey]);

  useEffect(() => {
    const partial: Partial<GlobeConfig> = {
      ...(config.autoRotate !== undefined ? { autoRotate: config.autoRotate } : {}),
      ...(config.zoom !== undefined ? { zoom: config.zoom } : {}),
    };
    instanceRef.current?.update(partial);
  }, [config.autoRotate, config.zoom]);

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
      globe.flyTo([18, 38], 2.85, { duration: 0.9 });
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
