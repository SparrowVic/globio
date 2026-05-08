import { useEffect, useRef, useState } from 'react';
import type { GlobeKind, ThemePresetName } from '@your-globe/core';
import type { DecorationGlobeReadyApi } from '@/components/shared';
import { KIND_ACCENT, KIND_THEMES } from './data/kind-themes';
import { HeroLeftRail } from './hero/HeroLeftRail';
import { HeroCenterStage } from './hero/HeroCenterStage';
import { HeroRightRail } from './hero/HeroRightRail';
import { HeroStatInstruments } from './hero/HeroStatInstruments';

/**
 * Hero composition root. Owns active kind + theme state, derives the
 * accent color, applies it as a CSS variable so every accent-using
 * descendant transitions in lockstep when the user picks a different
 * kind. The globe API ref is captured for HUD anchors and any future
 * feature that wants to drive the hero globe imperatively.
 */
export function HeroStage() {
  const [activeKind, setActiveKind] = useState<GlobeKind>('cinematic');
  const [activeTheme, setActiveTheme] = useState<ThemePresetName>(KIND_THEMES.cinematic[0].preset);
  const globeApiRef = useRef<DecorationGlobeReadyApi | null>(null);
  const accent = KIND_ACCENT[activeKind];

  // When kind changes, snap theme to that kind's first preset — preset
  // names aren't shared across kinds, so the previous selection wouldn't
  // resolve cleanly anyway.
  useEffect(() => {
    setActiveTheme(KIND_THEMES[activeKind][0].preset);
  }, [activeKind]);

  return (
    <section
      className="relative isolate overflow-hidden bg-[#03060c] px-6 pb-12 pt-24 max-[1500px]:pt-20"
      style={{
        ['--hero-accent' as string]: accent,
        minHeight: 'min(110vh, 1320px)',
      }}
    >
      {/* Layered backdrop: cool radial spots + dot grid + bottom fade */}
      <div className="absolute inset-0 -z-40 bg-[radial-gradient(circle_at_48%_32%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_72%_30%,rgba(251,191,36,0.12),transparent_24%),linear-gradient(180deg,#01040a_0%,#07111c_52%,#05080f_100%)]" />
      <div className="absolute inset-0 -z-30 opacity-50 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.22)_1px,transparent_1.7px)] [background-size:46px_46px]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-[linear-gradient(180deg,transparent_0%,rgba(2,6,12,0.95)_46%,#02040a_100%)]" />

      <div className="mx-auto grid max-w-[1880px] grid-cols-[minmax(360px,420px)_minmax(560px,1fr)_minmax(360px,420px)] items-stretch gap-8 max-[1500px]:grid-cols-[minmax(300px,360px)_minmax(500px,1fr)_minmax(320px,380px)] max-[1500px]:gap-5">
        <HeroLeftRail />
        <HeroCenterStage
          activeKind={activeKind}
          activeTheme={activeTheme}
          accent={accent}
          onReady={(api) => {
            globeApiRef.current = api;
          }}
        />
        <HeroRightRail
          activeKind={activeKind}
          activeTheme={activeTheme}
          onKindChange={setActiveKind}
          onThemeChange={setActiveTheme}
        />
      </div>

      <HeroStatInstruments className="mt-10" />
    </section>
  );
}
