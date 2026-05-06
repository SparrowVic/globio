import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngular, faGithub, faJs, faReact, faVuejs } from '@fortawesome/free-brands-svg-icons';
import {
  faArrowUpRight,
  faBolt,
  faBrowser,
  faCode,
  faDatabase,
  faGaugeHigh,
  faLayerPlus,
  faPaintbrushPencil,
  faRocketLaunch,
  faSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { ScrollVelocity, SpotlightCard, StarBorder } from '@/components/reactbits';
import { SectionHeader } from '@/components/shared';
import { cn } from '@/lib/utils';

interface CodeTab {
  readonly id: string;
  readonly label: string;
  readonly icon: IconDefinition;
  readonly code: string;
}

const codeTabs: ReadonlyArray<CodeTab> = [
  {
    id: 'vanilla',
    label: 'Vanilla',
    icon: faJs,
    code: `import { createGlobe } from '@your-globe/core';

const globe = createGlobe({
  container,
  kind: 'hologram',
  theme: 'hologram-cyan',
  arcs: { enabled: true, animationSpeed: 1.2 },
  markers: { enabled: true, hoverScale: 1.35 },
});

globe.mount();
globe.update({ kind: 'paper', theme: 'paper-default' });`,
  },
  {
    id: 'react',
    label: 'React',
    icon: faReact,
    code: `function IntelligenceGlobe({ dataset }) {
  return (
    <Globe
      kind="dotted"
      theme="dotted-dark"
      markers={{ points: dataset.cities, pulse: true }}
      arcs={{ routes: dataset.routes, colorMode: 'velocity' }}
      countryFill={{ mode: 'data', data: dataset.risk }}
    />
  );
}`,
  },
  {
    id: 'vue',
    label: 'Vue',
    icon: faVuejs,
    code: `<Globe
  kind="paper"
  theme="paper-default"
  :country-fill="{ mode: 'palette', palette }"
  :labels="{ enabled: true, density: 'featured' }"
  :focus-pulse="{ enabled: true, texture: 'ink-ring' }"
/>`,
  },
  {
    id: 'angular',
    label: 'Angular',
    icon: faAngular,
    code: `<globio-globe
  [kind]="'wireframe'"
  [theme]="'wireframe-tron'"
  [arcs]="networkRoutes"
  [markers]="edgeNodes"
  (countryClick)="selectCountry($event)"
/>`,
  },
];

const apiHighlights: ReadonlyArray<{
  readonly icon: IconDefinition;
  readonly title: string;
  readonly copy: string;
  readonly accent: string;
}> = [
  {
    icon: faLayerPlus,
    title: 'Canonical layer contracts',
    copy: 'setMarkers, setArcs, selection state and fill data stay familiar while every kind owns its renderer.',
    accent: '#67e8f9',
  },
  {
    icon: faPaintbrushPencil,
    title: 'Theme token fallback',
    copy: 'Empty string and non-positive sentinels let configurators override or snap back to the active preset.',
    accent: '#fbbf24',
  },
  {
    icon: faGaugeHigh,
    title: 'Live updates first',
    copy: 'Per-kind setters patch materials, buffers and DOM overlays without tearing down the scene.',
    accent: '#f472b6',
  },
  {
    icon: faDatabase,
    title: 'Data-ready visuals',
    copy: 'Markers, arcs, choropleths, labels and focus states are wired for dashboards and storytelling.',
    accent: '#34d399',
  },
];

export function ApiSection() {
  const [activeTab, setActiveTab] = useState<CodeTab>(codeTabs[0]!);

  return (
    <section id="api" className="relative overflow-hidden py-32">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_8%_35%,rgba(34,211,238,0.1),transparent_28%),radial-gradient(circle_at_90%_20%,rgba(251,191,36,0.08),transparent_32%)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <SectionHeader
              align="left"
              eyebrow="Developer surface"
              title="A visual beast with a boringly predictable API."
              sub="Globio is built for product code: typed config trees, framework adapters, runtime updates and layer registries that keep the creative surface explicit."
            />

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {apiHighlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl">
                  <span className="mb-4 flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
                    <FontAwesomeIcon icon={item.icon} className="size-4" style={{ color: item.accent }} />
                  </span>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.copy}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <StarBorder as={Link} to="/studio" color="rgba(251, 191, 36, 0.8)" speed="7s" className="text-sm font-semibold">
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faRocketLaunch} className="size-4 text-amber-200" />
                  Launch Studio
                </span>
              </StarBorder>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.035] px-5 text-sm font-semibold text-slate-200 backdrop-blur-md transition-all hover:border-white/[0.18] hover:bg-white/[0.06]"
              >
                <FontAwesomeIcon icon={faGithub} className="size-4" />
                GitHub
                <FontAwesomeIcon icon={faArrowUpRight} className="size-3 opacity-60" />
              </a>
            </div>
          </div>

          <SpotlightCard spotlightColor="rgba(251, 191, 36, 0.12)" className="!rounded-[2rem] !border-white/[0.08] !bg-[#050812]/90 !p-0">
              <div className="relative overflow-hidden rounded-[2rem]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.035] px-4 py-3">
                  <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    <FontAwesomeIcon icon={faCode} className="size-3 text-amber-200" />
                    typed config
                  </div>
                  <div className="flex rounded-full border border-white/[0.08] bg-black/25 p-1">
                    {codeTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          'inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs transition-all duration-250',
                          activeTab.id === tab.id ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-200',
                        )}
                      >
                        <FontAwesomeIcon icon={tab.icon} className="size-3" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative min-h-[430px] overflow-hidden bg-[#02030a] p-5">
                  <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.12)_1px,transparent_1.4px)] [background-size:18px_18px]" />
                  <pre className="relative z-10 overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/45 p-5 font-mono text-[12px] leading-relaxed text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-xl sm:text-sm">
                    <code>{activeTab.code}</code>
                  </pre>

                  <div className="relative z-10 mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      [faBrowser, 'adapters', 'vanilla/react/vue/angular'],
                      [faBolt, 'updates', 'runtime partial config'],
                      [faSparkles, 'tokens', 'theme-aware defaults'],
                    ].map(([icon, label, copy]) => (
                      <div key={label as string} className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4">
                        <FontAwesomeIcon icon={icon as IconDefinition} className="mb-3 size-4 text-cyan-200" />
                        <div className="font-mono text-xs text-white">{label as string}</div>
                        <div className="mt-1 text-xs text-slate-500">{copy as string}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SpotlightCard>
        </div>

        <div className="mt-20 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] py-5">
          <ScrollVelocity
            texts={[
              <span key="a" className="text-white/75">VANILLA TYPESCRIPT · REACT · VUE · ANGULAR · STUDIO EXPORT · RUNTIME API · </span>,
              <span key="b" className="text-amber-200/70">OUTLINE · DOTTED · WIREFRAME · HOLOGRAM · PAPER · CANONICAL LAYERS · </span>,
            ]}
            velocity={42}
            numCopies={4}
            className="px-6 text-2xl font-semibold uppercase tracking-[0.18em] sm:text-4xl"
            scrollerClassName="!text-4xl !leading-[3rem] md:!text-6xl md:!leading-[5rem]"
          />
        </div>
      </div>
    </section>
  );
}
