import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRight,
  faCrosshairs,
  faGaugeHigh,
  faGlobePointer,
  faLayerGroup,
  faPalette,
  faRadar,
  faRoute,
  faShieldCheck,
  faSliders,
  faSparkles,
  faStars,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { GlobeKind, StarfieldConfig, ThemePresetName } from '@your-globe/core';

import { DecorationGlobe } from '@/components/shared';

interface BoardKind {
  readonly id: GlobeKind;
  readonly label: string;
  readonly theme: ThemePresetName;
  readonly accent: string;
}

const boardKinds: ReadonlyArray<BoardKind> = [
  { id: 'outline', label: 'Outline', theme: 'outline-sunset', accent: '#fbbf24' },
  { id: 'dotted', label: 'Dotted', theme: 'dotted-dark', accent: '#67e8f9' },
  { id: 'wireframe', label: 'Wireframe', theme: 'wireframe-tron', accent: '#a78bfa' },
  { id: 'hologram', label: 'Hologram', theme: 'hologram-cyan', accent: '#22d3ee' },
  { id: 'paper', label: 'Paper', theme: 'paper-default', accent: '#f2c15b' },
];

const timelineItems: ReadonlyArray<{
  readonly icon: IconDefinition;
  readonly title: string;
  readonly copy: string;
}> = [
  { icon: faGlobePointer, title: 'Drop-in API', copy: 'Three lines to a globe.' },
  { icon: faSliders, title: 'Deeply customizable', copy: '30+ configs, live updates.' },
  { icon: faLayerGroup, title: 'Any framework', copy: 'Vanilla, React, Vue, Angular.' },
  { icon: faGaugeHigh, title: 'Production ready', copy: 'Tree-shakeable & tiny.' },
];

const studioControls = [
  { label: 'Atmosphere', icon: faStars, active: false },
  { label: 'Arcs', icon: faRoute, active: true },
  { label: 'Markers', icon: faRadar, active: false },
  { label: 'Labels', icon: faCrosshairs, active: false },
  { label: 'Country Fill', icon: faPalette, active: false },
  { label: 'Selection', icon: faShieldCheck, active: false },
] as const;

const boardStarfield: StarfieldConfig = {
  enabled: true,
  density: 550,
  size: 0.9,
  sizeVariety: 0.65,
  palette: ['#ffffff', '#ffe9c4', '#67e8f9'],
  twinkle: { enabled: true, intensity: 0.42, speed: 0.28 },
};

const miniStarfield: StarfieldConfig = { enabled: false };

const trustMarks = ['Caldera', 'spacely', 'Fintek', 'Northstar', 'echo3'] as const;

export function KindShowcaseSection() {
  return (
    <section id="kinds" className="relative overflow-hidden bg-[#02050b] px-6 pb-28 pt-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_74%_18%,rgba(251,191,36,0.1),transparent_28%),linear-gradient(180deg,#02050b_0%,#07111b_46%,#02050b_100%)]" />

      <div className="mx-auto grid max-w-[1880px] grid-cols-[300px_1.35fr_1.25fr_420px] gap-4">
        <Panel className="min-h-[330px] p-6">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Built for developers</h2>
            <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Timeline
            </span>
          </div>
          <div className="relative space-y-7">
            <span className="absolute bottom-7 left-5 top-5 w-px bg-gradient-to-b from-amber-300 via-amber-300/50 to-transparent" />
            {timelineItems.map((item) => (
              <div key={item.title} className="relative flex gap-4">
                <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-amber-200/45 bg-amber-200/10 text-amber-200 shadow-[0_0_24px_-12px_rgba(251,191,36,1)]">
                  <FontAwesomeIcon icon={item.icon} className="size-4" />
                </span>
                <div>
                  <div className="font-semibold text-white">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-400">{item.copy}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="min-h-[330px] p-6">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Five visual personalities</h2>
            <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Kinds
            </span>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {boardKinds.map((kind) => (
              <Link key={kind.id} to={`/studio?kind=${kind.id}`} className="group text-center">
                <div className="relative mx-auto size-32 overflow-hidden rounded-full border border-white/[0.1] bg-black/35 shadow-[0_22px_60px_-30px_rgba(0,0,0,1)]">
                  <DecorationGlobe
                    kind={kind.id}
                    theme={kind.theme}
                    speed={0.012}
                    initialLat={14}
                    initialLng={kind.id === 'paper' ? -32 : -44}
                    starfield={miniStarfield}
                    atmosphere
                    framingPadding={0.02}
                    className="absolute inset-0"
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/[0.08]" />
                </div>
                <div className="mt-5 font-semibold" style={{ color: kind.accent }}>
                  {kind.label}
                </div>
                <span className="mx-auto mt-3 block h-1 w-16 rounded-full opacity-70 transition-all group-hover:w-24" style={{ background: kind.accent }} />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel id="workshop" className="min-h-[330px] overflow-hidden p-0">
          <div className="grid h-full grid-cols-[190px_1fr_230px]">
            <aside className="border-r border-white/[0.08] bg-black/20 p-5">
              <div className="mb-4 text-xs uppercase tracking-[0.18em] text-slate-500">Interactive Studio</div>
              <div className="space-y-2">
                {studioControls.map((control) => (
                  <div
                    key={control.label}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                      control.active ? 'bg-white/[0.09] text-white' : 'text-slate-400'
                    }`}
                  >
                    <FontAwesomeIcon icon={control.icon} className="size-3.5 text-slate-500" />
                    {control.label}
                  </div>
                ))}
              </div>
            </aside>

            <div className="relative overflow-hidden bg-[#03070f]">
              <DecorationGlobe
                kind="outline"
                theme="outline-sunset"
                speed={0.017}
                initialLat={12}
                initialLng={-46}
                starfield={boardStarfield}
                atmosphere
                framingPadding={0.02}
                className="absolute inset-0 m-auto size-[340px]"
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(3,7,15,0.1)_52%,#03070f_96%)]" />
              <span className="absolute left-1/2 top-1/2 h-[210px] w-[430px] -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-[50%] border border-amber-200/55" />
              <span className="absolute left-[34%] top-[56%] size-5 rounded-full border border-pink-300 bg-pink-400/50 shadow-[0_0_22px_rgba(244,114,182,0.9)]" />
            </div>

            <aside className="border-l border-white/[0.08] bg-black/20 p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Arcs</span>
                <FontAwesomeIcon icon={faArrowUpRight} className="size-3 text-slate-500" />
              </div>
              {[
                ['Enabled', 'on'],
                ['Style', 'Signal Orbit'],
                ['Color', '#FFC857'],
                ['Thickness', '1.6'],
                ['Glow', '0.8'],
              ].map(([label, value]) => (
                <div key={label} className="mb-3 flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-xs">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-mono text-slate-200">{value}</span>
                </div>
              ))}
              <Link to="/studio" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-200 px-4 py-3 text-sm font-semibold text-slate-950">
                View in Studio
                <FontAwesomeIcon icon={faArrowUpRight} className="size-3" />
              </Link>
            </aside>
          </div>
        </Panel>

        <Panel id="features" className="min-h-[330px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Simple. Powerful. Typed.</h2>
            <span className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              API preview
            </span>
          </div>
          <pre className="h-[210px] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/45 p-4 font-mono text-[12px] leading-relaxed text-slate-300">
            <span className="text-emerald-300">type</span> <span className="text-amber-200">GlobeConfig</span> = {'{'}{'\n'}
            {'  '}kind: <span className="text-amber-200">'outline'</span> | <span className="text-amber-200">'dotted'</span> | ...{'\n'}
            {'  '}theme?: <span className="text-cyan-200">string</span>{'\n'}
            {'  '}autoRotate?: <span className="text-cyan-200">boolean</span>{'\n'}
            {'  '}layers?: {'{'}{'\n'}
            {'    '}markers?: MarkersConfig{'\n'}
            {'    '}arcs?: ArcsConfig{'\n'}
            {'    '}labels?: LabelsConfig{'\n'}
            {'  }'}{'\n'}
            {'}'}
          </pre>
          <Link to="/studio" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-200">
            Explore full API
            <FontAwesomeIcon icon={faArrowUpRight} className="size-3" />
          </Link>
        </Panel>
      </div>

      <div className="mx-auto mt-5 max-w-[1880px] rounded-3xl border border-white/[0.08] bg-white/[0.025] px-10 py-6">
        <div className="grid grid-cols-[1fr_repeat(5,180px)_1fr] items-center gap-6 text-slate-500">
          <div className="text-sm">Trusted in production by teams around the world.</div>
          {trustMarks.map((mark) => (
            <div key={mark} className="text-center text-xl font-semibold tracking-wide text-slate-400">
              {mark}
            </div>
          ))}
          <div className="flex items-center justify-end gap-2 text-amber-200">
            {Array.from({ length: 5 }).map((_, index) => (
              <FontAwesomeIcon key={index} icon={faSparkles} className="size-4" />
            ))}
            <span className="ml-2 text-sm text-slate-400">4.9 from 1,240+ devs</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({
  children,
  className = '',
  id,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly id?: string;
}) {
  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[#07111c]/72 shadow-[0_24px_80px_-55px_rgba(34,211,238,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(251,191,36,0.1),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(34,211,238,0.12),transparent_28%)]" />
      {children}
    </div>
  );
}
