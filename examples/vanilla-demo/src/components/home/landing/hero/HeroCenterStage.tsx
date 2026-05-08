import { useMemo, useState } from 'react';
import type { ArcConfig, CinematicConfig, GlobeKind, ThemePresetName } from '@your-globe/core';
import { DecorationGlobe, type DecorationGlobeReadyApi } from '@/components/shared';
import { HeroHudReadout } from './HeroHudReadout';
import { HeroDataAnchors } from './HeroDataAnchors';

export interface HeroCenterStageProps {
  readonly activeKind: GlobeKind;
  readonly activeTheme: ThemePresetName;
  readonly accent: string;
  readonly onReady?: (api: DecorationGlobeReadyApi) => void;
}

export function HeroCenterStage({
  activeKind,
  activeTheme,
  accent,
  onReady,
}: HeroCenterStageProps) {
  const [api, setApi] = useState<DecorationGlobeReadyApi | null>(null);
  const initialLng = activeKind === 'paper' ? -62 : -42;
  const heroArcs = useMemo(
    () => buildHeroArcs(activeKind, accent),
    [activeKind, accent],
  );
  const cinematic = useMemo<CinematicConfig | undefined>(
    () =>
      activeKind === 'cinematic'
        ? {
            surface: {
              lightingMode: 'hero',
              lightDirection: [-0.52, 0.74, 0.36],
              terminatorSoftness: 0.38,
              terminatorContrast: 1.42,
              keyIntensity: 1.38,
              fillIntensity: 0.16,
              rimIntensity: 0.76,
              rimPower: 2.65,
              specularIntensity: 0.82,
              cloudOpacity: 0.16,
              oceanSheen: 0.44,
            },
            cityLights: {
              enabled: true,
              intensity: 1.5,
              count: 8200,
              size: 0.0068,
              twinkle: true,
            },
            network: {
              enabled: true,
              opacity: 0.28,
              maxConnections: 46,
              pulseSpeed: 0.28,
            },
            borders: {
              enabled: true,
              intensity: 0.86,
            },
          }
        : undefined,
    [activeKind],
  );

  return (
    <div
      className="relative z-10 mx-auto flex w-full items-center justify-center self-center"
      style={{ height: 'clamp(640px, 72vh, 900px)' }}
    >
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: 'clamp(700px, 68vw, 940px)',
          height: 'clamp(700px, 68vw, 940px)',
        }}
      >
        <DecorationGlobe
          key={`${activeKind}-${activeTheme}`}
          kind={activeKind}
          theme={activeTheme}
          speed={0.055}
          initialLat={13}
          initialLng={initialLng}
          axisTilt={23.5}
          starfield={false}
          arcs={heroArcs}
          atmosphere={activeKind !== 'cinematic'}
          cinematic={cinematic}
          framingPadding={0.06}
          interactive
          onReady={(readyApi) => {
            setApi(readyApi);
            onReady?.(readyApi);
          }}
          className="absolute inset-0"
        />
      </div>

      <HeroHudReadout />
      <HeroDataAnchors api={api} />
    </div>
  );
}

function buildHeroArcs(kind: GlobeKind, accent: string): ReadonlyArray<ArcConfig> {
  const cyan = kind === 'paper' ? '#2f7f95' : '#67e8f9';
  const rose = kind === 'paper' ? '#b85d3d' : '#f472b6';
  const green = kind === 'paper' ? '#4d8f69' : '#86efac';

  return [
    {
      id: 'hero-new-york-sao-paulo',
      from: [40.7128, -74.006],
      to: [-23.5505, -46.6333],
      color: accent,
      width: 1.7,
      height: 'auto',
      minHeight: 0.08,
      maxHeight: 0.24,
      animated: true,
      animationDuration: 2.6,
      headEasing: 'pulse',
    },
    {
      id: 'hero-reykjavik-lagos',
      from: [64.1466, -21.9426],
      to: [6.5244, 3.3792],
      color: cyan,
      width: 1.35,
      height: 'auto',
      minHeight: 0.06,
      maxHeight: 0.2,
      style: 'dashed',
      dashSize: 0.035,
      dashGap: 0.022,
      animated: true,
      animationDuration: 3.2,
      headEasing: 'easeInOut',
    },
    {
      id: 'hero-lisbon-cape-town',
      from: [38.7223, -9.1393],
      to: [-33.9249, 18.4241],
      color: rose,
      width: 1.2,
      height: 0.18,
      animated: true,
      animationDuration: 3.6,
      headEasing: 'linear',
    },
    {
      id: 'hero-mexico-cairo',
      from: [19.4326, -99.1332],
      to: [30.0444, 31.2357],
      color: green,
      width: 1.1,
      height: 'auto',
      minHeight: 0.07,
      maxHeight: 0.22,
      style: 'dashed',
      dashSize: 0.03,
      dashGap: 0.018,
      animated: true,
      animationDuration: 4.1,
      headEasing: 'pulse',
    },
  ];
}
