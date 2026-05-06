import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRight,
  faBolt,
  faBracketsCurly,
  faCheck,
  faCode,
  faCopy,
  faCube,
  faGaugeHigh,
  faGlobePointer,
  faGrid2,
  faLayerGroup,
  faPlay,
  faSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { GlobeKind, StarfieldConfig, ThemePresetName } from '@your-globe/core';

import { DecorationGlobe } from '@/components/shared';
import { cn } from '@/lib/utils';

interface HeroKind {
  readonly id: GlobeKind;
  readonly label: string;
  readonly theme: ThemePresetName;
  readonly accent: string;
  readonly caption: string;
  readonly description: string;
}

const heroKinds: ReadonlyArray<HeroKind> = [
  {
    id: 'outline',
    label: 'Outline',
    theme: 'outline-sunset',
    accent: '#fbbf24',
    caption: 'Crisp borders & glow',
    description: 'Editorial command center',
  },
  {
    id: 'dotted',
    label: 'Dotted',
    theme: 'dotted-dark',
    accent: '#67e8f9',
    caption: 'Stippled data feel',
    description: 'Particle radar atlas',
  },
  {
    id: 'wireframe',
    label: 'Wireframe',
    theme: 'wireframe-tron',
    accent: '#a78bfa',
    caption: 'Pure topology',
    description: 'Structural mesh globe',
  },
  {
    id: 'hologram',
    label: 'Hologram',
    theme: 'hologram-cyan',
    accent: '#22d3ee',
    caption: 'Futuristic scanlines',
    description: 'Projection instrument',
  },
  {
    id: 'paper',
    label: 'Paper',
    theme: 'paper-default',
    accent: '#f2c15b',
    caption: 'Atlas & ink texture',
    description: 'Educational atlas',
  },
];

const proofItems: ReadonlyArray<readonly [IconDefinition, string]> = [
  [faBracketsCurly, 'TypeScript first'],
  [faCube, 'Tree-shakeable'],
  [faGaugeHigh, '60 FPS engine'],
];

const statItems: ReadonlyArray<{
  readonly icon: IconDefinition;
  readonly value: string;
  readonly label: string;
}> = [
  { icon: faGrid2, value: '5', label: 'Visual kinds' },
  { icon: faLayerGroup, value: '30+', label: 'Layers & effects' },
  { icon: faBolt, value: '100%', label: 'TypeScript' },
  { icon: faGaugeHigh, value: '60 FPS', label: 'WebGL engine' },
  { icon: faCheck, value: '0', label: 'Dependencies' },
  { icon: faSparkles, value: 'MIT', label: 'Open source' },
];

const heroStarfield: StarfieldConfig = {
  enabled: true,
  density: 1500,
  size: 1.05,
  sizeVariety: 0.74,
  palette: ['#ffffff', '#ffe9c4', '#67e8f9', '#f472b6', '#86efac'],
  twinkle: { enabled: true, intensity: 0.58, speed: 0.34 },
};

const miniStarfield: StarfieldConfig = { enabled: false };

const focusLabels = [
  { label: 'New York', meta: '40.7 N, 74.0 W', className: 'left-[56%] top-[31%]' },
  { label: 'Sao Paulo', meta: '23.5 S, 46.6 W', className: 'left-[64%] top-[68%]' },
] as const;

export function HeroStage() {
  const [activeKind, setActiveKind] = useState<HeroKind>(heroKinds[0]!);
  const initialLng = useMemo(() => (activeKind.id === 'paper' ? -62 : -42), [activeKind.id]);

  return (
    <section className="relative isolate min-h-[960px] overflow-hidden bg-[#03060c] px-6 pb-10 pt-24 max-[1500px]:min-h-[880px] max-[1500px]:pt-20">
      <div className="absolute inset-0 -z-40 bg-[radial-gradient(circle_at_48%_32%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_72%_30%,rgba(251,191,36,0.14),transparent_24%),linear-gradient(180deg,#01040a_0%,#07111c_52%,#05080f_100%)]" />
      <div className="absolute inset-0 -z-30 opacity-55 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.28)_1px,transparent_1.7px)] [background-size:46px_46px]" />
      <div className="absolute inset-x-0 top-0 -z-20 h-[74%] bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,6,12,0.12)_48%,#03060c_86%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-[260px] bg-[radial-gradient(ellipse_at_50%_100%,rgba(148,163,184,0.2),transparent_58%),linear-gradient(180deg,transparent_0%,rgba(2,6,12,0.95)_46%,#02040a_100%)]" />
      <div className="absolute bottom-[118px] left-1/2 -z-10 h-24 w-[120vw] -translate-x-1/2 rounded-[50%] border-t border-amber-200/20 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent)] opacity-60 blur-[1px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 -z-10 h-44 bg-[linear-gradient(135deg,rgba(255,255,255,0.09)_0_1px,transparent_1px_34px),radial-gradient(ellipse_at_center,rgba(251,191,36,0.1),transparent_55%)] opacity-55 [clip-path:polygon(0_58%,8%_48%,17%_60%,25%_44%,37%_55%,50%_38%,61%_52%,73%_42%,85%_55%,100%_36%,100%_100%,0_100%)]" />

      <div className="mx-auto grid min-h-[820px] max-w-[1880px] grid-cols-[minmax(330px,430px)_minmax(560px,1fr)_minmax(330px,420px)] items-center gap-8 max-[1500px]:min-h-[720px] max-[1500px]:grid-cols-[minmax(280px,350px)_minmax(500px,1fr)_minmax(300px,380px)] max-[1500px]:gap-5">
        <div className="relative z-20 pt-14">
          <div className="mb-8 inline-flex overflow-hidden rounded-full border border-white/[0.12] bg-white/[0.045] p-1 text-xs text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/15 px-3 py-1.5 font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
              </span>
              Live
            </span>
            <span className="px-3 py-1.5">Five visual personalities</span>
          </div>

          <h1 className="max-w-[520px] text-balance text-[clamp(4rem,5vw,5.3rem)] font-semibold leading-[0.96] tracking-tight text-white">
            The world is your <span className="text-amber-300 drop-shadow-[0_0_28px_rgba(251,191,36,0.55)]">canvas.</span>
          </h1>
          <p className="mt-8 max-w-[420px] text-xl leading-relaxed text-slate-300">
            Globio is a modern 3D globe library and studio. Five stunning styles. Deep customization. Framework-agnostic. Production ready.
          </p>

          <div className="mt-10 flex items-center gap-4">
            <Link
              to="/studio"
              className="group inline-flex h-[58px] items-center gap-3 overflow-hidden rounded-full bg-amber-200 px-7 text-sm font-semibold text-slate-950 shadow-[0_20px_70px_-18px_rgba(251,191,36,0.95)] transition-transform hover:-translate-y-0.5"
            >
              <FontAwesomeIcon icon={faGlobePointer} className="size-4" />
              Open Studio
              <FontAwesomeIcon icon={faArrowUpRight} className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
            <a
              href="#kinds"
              className="inline-flex h-[58px] items-center gap-3 rounded-full border border-white/[0.13] bg-white/[0.035] px-7 text-sm font-semibold text-slate-200 backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/[0.065]"
            >
              <FontAwesomeIcon icon={faPlay} className="size-3.5 text-cyan-200" />
              Explore kinds
            </a>
          </div>

          <div className="mt-11 flex flex-wrap gap-8 text-sm text-slate-400">
            {proofItems.map(([icon, label]) => (
              <span key={label} className="inline-flex items-center gap-3">
                <FontAwesomeIcon icon={icon} className="size-4 text-slate-200" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 h-[720px] origin-center max-[1500px]:h-[650px] max-[1500px]:scale-[0.86]">
          <div className="absolute left-1/2 top-1/2 size-[830px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10" />
          <div className="absolute left-1/2 top-1/2 size-[940px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/10" />
          <div className="absolute left-1/2 top-1/2 h-[650px] w-[980px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-200/16" />
          <div className="absolute left-1/2 top-1/2 h-[510px] w-[980px] -translate-x-1/2 -translate-y-1/2 rotate-[-17deg] rounded-[50%] border border-amber-200/45 shadow-[0_0_36px_-18px_rgba(251,191,36,0.95)]" />
          <div className="absolute left-1/2 top-1/2 h-[470px] w-[1040px] -translate-x-1/2 -translate-y-1/2 rotate-[20deg] rounded-[50%] border border-cyan-300/40 shadow-[0_0_32px_-18px_rgba(103,232,249,0.95)]" />
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rotate-[45deg] rounded-[50%] border border-fuchsia-300/34 shadow-[0_0_34px_-20px_rgba(244,114,182,0.9)]" />

          {[
            'left-[18%] top-[31%] bg-cyan-300',
            'left-[79%] top-[26%] bg-amber-200',
            'left-[16%] top-[62%] bg-fuchsia-300',
            'left-[72%] top-[70%] bg-emerald-300',
          ].map((className) => (
            <span key={className} className={cn('absolute z-20 size-3 rounded-full shadow-[0_0_22px_currentColor]', className)} />
          ))}

          <div
            className="absolute left-1/2 top-1/2 size-[min(56vw,780px)] -translate-x-1/2 -translate-y-1/2"
            style={{
              WebkitMaskImage: 'radial-gradient(circle closest-side at center, #000 0%, #000 68%, transparent 100%)',
              maskImage: 'radial-gradient(circle closest-side at center, #000 0%, #000 68%, transparent 100%)',
            }}
          >
            <DecorationGlobe
              key={activeKind.id}
              kind={activeKind.id}
              theme={activeKind.theme}
              speed={0.018}
              initialLat={13}
              initialLng={initialLng}
              axisTilt={23.5}
              starfield={heroStarfield}
              atmosphere
              framingPadding={0.02}
              className="absolute inset-0"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,transparent_50%,rgba(3,6,12,0.42)_80%,transparent_100%)]" />

          {focusLabels.map((item) => (
            <div
              key={item.label}
              className={cn('absolute z-30 rounded-xl border border-white/[0.12] bg-black/45 px-3 py-2 text-xs text-slate-300 shadow-[0_12px_40px_-22px_rgba(0,0,0,1)] backdrop-blur-xl', item.className)}
            >
              <div className="font-semibold text-white">{item.label}</div>
              <div className="mt-0.5 font-mono text-[10px] text-slate-400">{item.meta}</div>
            </div>
          ))}
        </div>

        <div className="relative z-20 grid gap-5 pt-16 max-[1500px]:gap-3 max-[1500px]:pt-8">
          <div className="grid gap-3 max-[1500px]:gap-2">
            {heroKinds.map((kind) => (
              <button
                key={kind.id}
                type="button"
                onClick={() => setActiveKind(kind)}
                className={cn(
                  'group grid grid-cols-[76px_1fr] items-center gap-4 rounded-2xl border bg-white/[0.035] p-3 text-left backdrop-blur-xl transition-all duration-300 max-[1500px]:grid-cols-[62px_1fr] max-[1500px]:gap-3 max-[1500px]:rounded-xl max-[1500px]:p-2.5',
                  activeKind.id === kind.id
                    ? 'border-amber-200/65 shadow-[0_0_34px_-14px_rgba(251,191,36,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'border-white/[0.12] hover:border-white/25 hover:bg-white/[0.055]',
                )}
              >
                <span className="relative block size-[68px] overflow-hidden rounded-2xl border border-white/[0.1] bg-black/35 max-[1500px]:size-14 max-[1500px]:rounded-xl">
                  <DecorationGlobe
                    kind={kind.id}
                    theme={kind.theme}
                    speed={0.012}
                    initialLat={12}
                    initialLng={kind.id === 'paper' ? -30 : -44}
                    starfield={miniStarfield}
                    atmosphere
                    framingPadding={0.04}
                    className="absolute inset-0"
                  />
                </span>
                <span>
                  <span className="block text-base font-semibold text-white">{kind.label}</span>
                  <span className="mt-1 block text-sm text-slate-400">{kind.caption}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-white/[0.12] bg-[#07111c]/80 p-4 shadow-[0_22px_70px_-40px_rgba(34,211,238,0.7)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex rounded-full border border-white/[0.08] bg-black/30 p-1 text-xs">
                {['Vanilla', 'React', 'Vue'].map((tab, index) => (
                  <span key={tab} className={cn('rounded-full px-3 py-1.5', index === 0 ? 'bg-amber-200/12 text-amber-200' : 'text-slate-500')}>
                    {tab}
                  </span>
                ))}
              </div>
              <FontAwesomeIcon icon={faCode} className="size-4 text-cyan-200" />
            </div>
            <pre className="rounded-2xl border border-white/[0.08] bg-black/45 p-4 font-mono text-[12px] leading-relaxed text-slate-300 max-[1500px]:max-h-[210px] max-[1500px]:overflow-hidden max-[1500px]:text-[11px]">
              <span className="text-cyan-200">import</span> {'{ createGlobe }'}{'\n'}
              <span className="text-cyan-200">from</span> <span className="text-amber-200">'@your-globe/core'</span>{'\n\n'}
              <span className="text-slate-500">const</span> globe = createGlobe({'{'}{'\n'}
              {'  '}kind: <span className="text-amber-200">'{activeKind.id}'</span>,{'\n'}
              {'  '}theme: <span className="text-amber-200">'{activeKind.theme}'</span>,{'\n'}
              {'  '}autoRotate: {'{ enabled: true }'}{'\n'}
              {'}'}){'\n\n'}
              globe.mount()
            </pre>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-2 text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
                7.4 kB min+gzip
              </span>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.045] px-3 py-2 text-slate-300">
                <FontAwesomeIcon icon={faCopy} className="size-3" />
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 mx-auto -mt-20 max-w-[1500px] rounded-3xl border border-white/[0.12] bg-[#09131f]/80 px-6 py-5 shadow-[0_24px_80px_-45px_rgba(34,211,238,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        <div className="grid grid-cols-6 divide-x divide-white/[0.08]">
          {statItems.map((stat) => (
            <div key={stat.label} className="flex items-center justify-center gap-4 px-5">
              <FontAwesomeIcon icon={stat.icon} className="size-7 text-amber-200" />
              <div>
                <div className="text-2xl font-semibold text-white">{stat.value}</div>
                <div className="mt-0.5 text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
