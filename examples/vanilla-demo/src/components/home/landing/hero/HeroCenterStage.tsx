import { useState } from 'react';
import type { GlobeKind, StarfieldConfig, ThemePresetName } from '@your-globe/core';
import { DecorationGlobe, type DecorationGlobeReadyApi } from '@/components/shared';
import { HeroOrbitRig } from './HeroOrbitRig';
import { HeroFloorGlow } from './HeroFloorGlow';
import { HeroHudReadout } from './HeroHudReadout';
import { HeroDataAnchors } from './HeroDataAnchors';

const HERO_STARFIELD: StarfieldConfig = {
  enabled: true,
  density: 1500,
  size: 1.05,
  sizeVariety: 0.74,
  palette: ['#ffffff', '#ffe9c4', '#67e8f9', '#f472b6', '#86efac'],
  twinkle: { enabled: true, intensity: 0.58, speed: 0.34 },
};

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

  return (
    <div
      className="relative z-10 mx-auto flex w-full items-center justify-center self-center"
      style={{ height: 'clamp(560px, 64vh, 780px)' }}
    >
      <HeroOrbitRig accent={accent} />
      <HeroFloorGlow accent={accent} />

      <div
        className="absolute left-1/2 top-1/2 size-[min(56vw,760px)] -translate-x-1/2 -translate-y-1/2"
        style={{
          WebkitMaskImage:
            'radial-gradient(circle closest-side at center, #000 0%, #000 68%, transparent 100%)',
          maskImage:
            'radial-gradient(circle closest-side at center, #000 0%, #000 68%, transparent 100%)',
        }}
      >
        <DecorationGlobe
          key={`${activeKind}-${activeTheme}`}
          kind={activeKind}
          theme={activeTheme}
          speed={0.018}
          initialLat={13}
          initialLng={initialLng}
          axisTilt={23.5}
          starfield={HERO_STARFIELD}
          atmosphere
          framingPadding={0.02}
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

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,transparent_50%,rgba(3,6,12,0.42)_80%,transparent_100%)]" />
    </div>
  );
}
