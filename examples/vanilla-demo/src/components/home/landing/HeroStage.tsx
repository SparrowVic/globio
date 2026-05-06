import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRight,
  faCode,
  faGlobePointer,
  faGrid2,
  faLayerGroup,
  faRadar,
  faRoute,
  faScrollOld,
  faSparkles,
  faWandMagicSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { GlobeKind, StarfieldConfig, ThemePresetName } from '@your-globe/core';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { Aurora, FadeContent, Magnet, ShinyText, StarBorder, Threads } from '@/components/reactbits';
import { DecorationGlobe } from '@/components/shared';
import { cn } from '@/lib/utils';

interface HeroKind {
  readonly id: GlobeKind;
  readonly label: string;
  readonly theme: ThemePresetName;
  readonly accent: string;
  readonly caption: string;
}

const heroKinds: ReadonlyArray<HeroKind> = [
  { id: 'outline', label: 'Outline', theme: 'outline-dark', accent: '#fbbf24', caption: 'inked borders' },
  { id: 'dotted', label: 'Dotted', theme: 'dotted-dark', accent: '#67e8f9', caption: 'particle surface' },
  { id: 'wireframe', label: 'Wireframe', theme: 'wireframe-tron', accent: '#a78bfa', caption: 'grid topology' },
  { id: 'hologram', label: 'Hologram', theme: 'hologram-cyan', accent: '#22d3ee', caption: 'projection shell' },
  { id: 'paper', label: 'Paper', theme: 'paper-default', accent: '#f2c15b', caption: 'atlas wash' },
];

const heroStats = [
  { value: '5', label: 'visual kinds' },
  { value: '9', label: 'canonical layers' },
  { value: 'live', label: 'runtime update path' },
] as const;

const heroLayerBadges: ReadonlyArray<readonly [IconDefinition, string]> = [
  [faLayerGroup, 'canonical layers'],
  [faRoute, 'animated arcs'],
  [faRadar, 'focus pulse'],
  [faGrid2, 'data overlays'],
  [faScrollOld, 'paper atlas'],
];

export function HeroStage() {
  const [activeKind, setActiveKind] = useState<HeroKind>(heroKinds[1]!);
  const starfield = useMemo<StarfieldConfig>(
    () => ({
      enabled: true,
      density: 1200,
      size: 1.2,
      sizeVariety: 0.72,
      palette: ['#ffffff', '#ffe9c4', '#67e8f9', '#f472b6'],
      twinkle: { enabled: true, intensity: 0.55, speed: 0.35 },
    }),
    [],
  );

  return (
    <section className="relative isolate min-h-[100dvh] overflow-hidden px-4 pb-20 pt-28 sm:px-6 lg:pt-32">
      <div className="absolute inset-0 -z-40 bg-[radial-gradient(circle_at_20%_15%,rgba(251,191,36,0.13),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(34,211,238,0.16),transparent_34%),linear-gradient(180deg,#02030a_0%,#040711_48%,#02030a_100%)]" />
      <div className="absolute inset-0 -z-30 opacity-45">
        <Aurora colorStops={['#fbbf24', '#22d3ee', '#f472b6']} amplitude={0.55} blend={0.32} speed={0.22} />
      </div>
      <div className="absolute inset-x-0 top-0 -z-20 h-[62vh] opacity-[0.22]">
        <Threads color={[0.95, 0.82, 0.45]} amplitude={0.85} distance={0.18} enableMouseInteraction />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_34%,transparent_0%,rgba(2,3,10,0.2)_42%,#02030a_86%)]" />

      <div className="mx-auto grid min-h-[calc(100dvh-8rem)] max-w-7xl grid-cols-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative z-20 max-w-2xl">
          <FadeContent duration={700}>
            <div className="mb-6 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-1.5 text-emerald-200">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
                </span>
                live engine
              </span>
              <span className="text-slate-500">vanilla · react · vue · angular</span>
            </div>
          </FadeContent>

          <h1 className="text-balance text-7xl font-semibold leading-[0.86] tracking-tight text-white sm:text-8xl lg:text-[9.5rem]">
            Globio
          </h1>
          <FadeContent duration={800} delay={160}>
            <p className="mt-7 max-w-xl text-balance text-xl leading-relaxed text-slate-300 sm:text-2xl">
              A cinematic globe engine and visual studio for interfaces that need to feel
              authored, alive, and impossible to mistake for a stock map.
            </p>
          </FadeContent>

          <FadeContent duration={800} delay={300}>
            <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Magnet padding={60} magnetStrength={3.4}>
                <Link
                  to="/studio"
                  className="group relative inline-flex h-[52px] items-center gap-3 overflow-hidden rounded-full bg-amber-200 px-6 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_-18px_rgba(255,213,122,0.95)] transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <span className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-white/45 opacity-0 transition-all duration-700 group-hover:translate-x-[310%] group-hover:opacity-100" />
                  <FontAwesomeIcon icon={faGlobePointer} className="relative z-10 size-4" />
                  <span className="relative z-10">Open Studio</span>
                  <FontAwesomeIcon icon={faArrowUpRight} className="relative z-10 size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </Magnet>
              <StarBorder as="a" href="#kinds" color="rgba(103,232,249,0.7)" speed="7s" className="text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faSparkles} className="size-4 text-cyan-200" />
                  Explore kinds
                </span>
              </StarBorder>
            </div>
          </FadeContent>

          <FadeContent duration={800} delay={460}>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-2">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 backdrop-blur-md">
                  <div className="font-mono text-lg text-white">{stat.value}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </FadeContent>
        </div>

        <FadeContent duration={900} delay={120}>
          <div className="relative min-h-[620px]">
            <div className="absolute inset-0 rounded-[2rem] border border-white/[0.08] bg-white/[0.035] shadow-[0_30px_120px_-50px_rgba(34,211,238,0.8)] backdrop-blur-2xl" />
            <div className="absolute inset-2 overflow-hidden rounded-[1.65rem] border border-white/[0.06] bg-[#03050d]">
              <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:44px_44px]" />
              <DecorationGlobe
                key={activeKind.id}
                kind={activeKind.id}
                theme={activeKind.theme}
                speed={0.026}
                initialLat={18}
                initialLng={activeKind.id === 'paper' ? 38 : -24}
                axisTilt={23.5}
                starfield={starfield}
                atmosphere
                framingPadding={0.08}
                className="absolute inset-0 m-auto size-[min(86vmin,760px)]"
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_0%,rgba(3,5,13,0.1)_46%,rgba(3,5,13,0.88)_88%)]" />

              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                {heroKinds.map((kind) => (
                  <button
                    key={kind.id}
                    type="button"
                    onClick={() => setActiveKind(kind)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all duration-300',
                      activeKind.id === kind.id
                        ? 'bg-white/[0.12] text-white shadow-[0_0_24px_-12px_currentColor]'
                        : 'border-white/[0.08] bg-black/20 text-slate-400 hover:border-white/20 hover:text-white',
                    )}
                    style={activeKind.id === kind.id ? { borderColor: `${kind.accent}66`, color: kind.accent } : undefined}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>

              <div className="absolute bottom-4 left-4 right-4 grid gap-3 md:grid-cols-[1fr_0.86fr]">
                <div className="rounded-2xl border border-white/[0.08] bg-black/45 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <FontAwesomeIcon icon={faWandMagicSparkles} className="size-3 text-amber-200" />
                      active personality
                    </span>
                    <ShinyText text={activeKind.caption} speed={4} className="text-[11px] text-slate-300" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      ['kind', activeKind.id],
                      ['theme', activeKind.theme],
                      ['mode', 'live'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.035] p-2">
                        <div className="text-[9px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
                        <div className="mt-1 truncate font-mono text-slate-100">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-black/45 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <FontAwesomeIcon icon={faCode} className="size-3 text-cyan-200" />
                    config
                  </div>
                  <pre className="font-mono text-[11px] leading-relaxed text-slate-300">
                    <span className="text-pink-300">kind</span>: <span className="text-amber-200">'{activeKind.id}'</span>{'\n'}
                    <span className="text-pink-300">theme</span>: <span className="text-amber-200">'{activeKind.theme}'</span>{'\n'}
                    <span className="text-pink-300">layers</span>: <span className="text-emerald-200">canonical</span>
                  </pre>
                </div>
              </div>
            </div>

            <div className="absolute -right-3 top-20 hidden w-44 space-y-2 xl:block">
              {heroLayerBadges.map(([icon, label]) => (
                <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-2 text-[11px] text-slate-300 backdrop-blur-xl">
                  <FontAwesomeIcon icon={icon} className="mr-2 size-3 text-amber-200" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </FadeContent>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-1/2 hidden w-[min(920px,calc(100%-3rem))] -translate-x-1/2 translate-y-1/2 rounded-3xl border border-white/[0.08] bg-[#050812]/90 p-4 shadow-[0_28px_90px_-50px_rgba(0,0,0,1)] backdrop-blur-xl md:block">
        <div className="grid grid-cols-3 gap-3">
          {['Studio configurator', 'Kind-native layers', 'Production JSON export'].map((item, i) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/[0.035] px-4 py-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-amber-200/10 font-mono text-xs text-amber-200">0{i + 1}</span>
              <span className="text-sm text-slate-300">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
