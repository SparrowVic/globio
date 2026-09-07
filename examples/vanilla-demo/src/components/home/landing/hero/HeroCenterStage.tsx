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
  const initialLng = activeKind === 'cinematic' ? -66 : activeKind === 'paper' ? -62 : -42;
  const initialLat = activeKind === 'cinematic' ? 32 : 13;
  const heroArcs = useMemo(
    () => buildHeroArcs(activeKind, accent),
    [activeKind, accent],
  );
  const cinematic = useMemo<CinematicConfig | undefined>(
    () =>
      activeKind === 'cinematic'
        ? {
            quality: 'ultra',
            reactivity: {
              lightInfluence: 1,
              cameraInfluence: 1,
              densityInfluence: 1,
              terminatorBoost: 1.28,
              horizonGlow: 1.34,
              atmosphericScatter: 1.38,
              surfaceMicroDetail: 1.22,
              cityNightResponse: 1.34,
              orbitalFlow: 1.08,
            },
            surface: {
              lightingMode: 'hero',
              lightDirection: [-0.68, 0.72, 0.22],
              terminatorSoftness: 0.34,
              terminatorContrast: 1.58,
              keyIntensity: 1.54,
              fillIntensity: 0.1,
              rimIntensity: 1.12,
              rimPower: 2.18,
              specularIntensity: 0.92,
              oceanSheen: 0.58,
              relief: 1.1,
              shallows: 0.65,
            },
            // Fixed sun keeps the marketing terminator parked where the
            // light direction above puts it — no drifting day/night line
            // while the hero auto-rotates.
            sun: {
              mode: 'fixed',
              visible: true,
              glare: 0.9,
            },
            clouds: {
              enabled: true,
              coverage: 0.46,
              opacity: 0.8,
              shadows: true,
            },
            aurora: {
              enabled: true,
              intensity: 0.7,
            },
            // The hero shows the procedural planet; the Earth 2k texture set is a
            // Studio toggle (mode b) rather than the landing default.
            textures: null,
            cityLights: {
              enabled: true,
              intensity: 1.62,
              count: 11800,
              size: 0.0056,
              twinkle: true,
            },
            network: {
              enabled: true,
              opacity: 0.19,
              maxConnections: 58,
              pulseSpeed: 0.26,
            },
            borders: {
              enabled: true,
              intensity: 1.08,
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
          initialLat={initialLat}
          initialLng={initialLng}
          axisTilt={23.5}
          starfield={false}
          arcs={heroArcs}
          atmosphere
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
