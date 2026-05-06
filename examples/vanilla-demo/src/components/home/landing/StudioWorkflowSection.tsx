import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faBracketsCurly,
  faCrosshairs,
  faDiagramProject,
  faFilm,
  faGaugeHigh,
  faLayerGroup,
  faRadar,
  faRoute,
  faSliders,
  faSparkles,
  faWandMagicSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { StarfieldConfig } from '@your-globe/core';

import { ShinyText, SpotlightCard } from '@/components/reactbits';
import { DecorationGlobe, SectionHeader } from '@/components/shared';

const workflowSteps: ReadonlyArray<{
  readonly icon: IconDefinition;
  readonly title: string;
  readonly copy: string;
  readonly accent: string;
}> = [
  {
    icon: faSliders,
    title: 'Studio',
    copy: 'Full-screen composer with live kind, theme, layers, data and per-kind subtrees.',
    accent: '#fbbf24',
  },
  {
    icon: faFilm,
    title: 'Workshop',
    copy: 'Layer-focused cinematography, watched keys, rebuild keys and saved presets.',
    accent: '#67e8f9',
  },
  {
    icon: faBracketsCurly,
    title: 'Runtime API',
    copy: 'The same config flows through globe.update() without replacing the whole scene.',
    accent: '#f472b6',
  },
];

const layerDials = [
  { label: 'arcs', value: 78, icon: faRoute, color: '#22d3ee' },
  { label: 'markers', value: 64, icon: faRadar, color: '#67e8f9' },
  { label: 'focus', value: 86, icon: faBolt, color: '#f472b6' },
  { label: 'crosshair', value: 52, icon: faCrosshairs, color: '#a78bfa' },
] as const;

const studioStarfield: StarfieldConfig = {
  enabled: true,
  density: 700,
  size: 1.1,
  sizeVariety: 0.7,
  palette: ['#ffffff', '#ffe9c4', '#67e8f9'],
  twinkle: { enabled: true, intensity: 0.42, speed: 0.32 },
};

export function StudioWorkflowSection() {
  return (
    <section id="studio" className="relative overflow-hidden py-32">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_20%_18%,rgba(244,114,182,0.09),transparent_31%),radial-gradient(circle_at_78%_62%,rgba(251,191,36,0.09),transparent_34%)]" />
      <div className="absolute left-1/2 top-0 -z-10 h-full w-px bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <SectionHeader
            align="left"
            eyebrow="Creator workflow"
            title="A studio for designing globes, not guessing JSON."
            sub="The demo is the control room for the engine: global knobs, kind-specific panels, workshop presets, and the same live update path your app uses in production."
          />

          <div className="mt-10 grid gap-3">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.16]">
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1 opacity-70"
                  style={{ background: step.accent }}
                />
                <div className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/30">
                    <FontAwesomeIcon icon={step.icon} className="size-4" style={{ color: step.accent }} />
                  </span>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] text-slate-500">0{index + 1}</span>
                      <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-400">{step.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <SpotlightCard spotlightColor="rgba(103, 232, 249, 0.12)" className="!rounded-[2rem] !border-white/[0.08] !bg-[#050812]/90 !p-0">
            <div className="relative overflow-hidden rounded-[2rem]">
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.035] px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-rose-400/80" />
                  <span className="size-2.5 rounded-full bg-amber-300/80" />
                  <span className="size-2.5 rounded-full bg-emerald-300/80" />
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                  <FontAwesomeIcon icon={faDiagramProject} className="size-3 text-cyan-200" />
                  live update graph
                </div>
              </div>

              <div className="grid min-h-[560px] lg:grid-cols-[210px_1fr]">
                <aside className="border-b border-white/[0.08] bg-black/20 p-4 lg:border-b-0 lg:border-r">
                  <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    <span>Workshop</span>
                    <ShinyText text="watched" speed={3.5} className="text-cyan-200" />
                  </div>
                  <div className="space-y-3">
                    {layerDials.map((dial) => (
                      <div key={dial.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 text-xs text-slate-300">
                            <FontAwesomeIcon icon={dial.icon} className="size-3" style={{ color: dial.color }} />
                            {dial.label}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">{dial.value}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full" style={{ width: `${dial.value}%`, background: dial.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="relative min-h-[520px] overflow-hidden bg-[#02030a]">
                  <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:36px_36px]" />
                  <DecorationGlobe
                    kind="paper"
                    theme="paper-default"
                    speed={0.018}
                    initialLat={14}
                    initialLng={31}
                    starfield={studioStarfield}
                    atmosphere
                    framingPadding={0.13}
                    className="absolute inset-0 m-auto size-[min(68vmin,560px)]"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(2,3,10,0.18)_52%,#02030a_92%)]" />

                  <div className="absolute left-5 top-5 rounded-2xl border border-amber-200/20 bg-black/45 p-4 backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-amber-200">
                      <FontAwesomeIcon icon={faWandMagicSparkles} className="size-3" />
                      active preset
                    </div>
                    <div className="mt-2 font-mono text-sm text-white">paper.education.atlas</div>
                    <div className="mt-3 flex gap-2">
                      {['texture', 'labels', 'fill'].map((chip) => (
                        <span key={chip} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] text-slate-400">
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="absolute bottom-5 right-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/45 text-center backdrop-blur-xl">
                    {[
                      ['kinds', 5],
                      ['layers', 9],
                      ['fps', 60],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-20 border-l border-white/[0.06] px-4 py-3 first:border-l-0">
                        <div className="font-mono text-xl text-white">{value}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px animate-[home-scan-x_5.5s_linear_infinite] bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent" />
                </div>
              </div>

              <div className="grid border-t border-white/[0.08] bg-white/[0.025] md:grid-cols-3">
                {[
                  [faLayerGroup, 'kindHandle.layers', 'constructor registry'],
                  [faSparkles, 'theme tokens', 'sentinel fallback'],
                  [faGaugeHigh, 'runtime setters', 'no scene reset'],
                ].map(([icon, label, copy]) => (
                  <div key={label as string} className="border-t border-white/[0.06] p-4 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0">
                    <FontAwesomeIcon icon={icon as IconDefinition} className="mb-3 size-4 text-amber-200" />
                    <div className="font-mono text-xs text-white">{label as string}</div>
                    <div className="mt-1 text-xs text-slate-500">{copy as string}</div>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>
      </div>
    </section>
  );
}
