import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import {
  faArrowUpRight,
  faDatabase,
  faGaugeHigh,
  faLayerPlus,
  faPaintbrushPencil,
  faRocketLaunch,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { ScrollVelocity, SpotlightCard, StarBorder } from '@/components/reactbits';
import { SectionHeader } from '@/components/shared';
import { CodePlayground } from './api/CodePlayground';
import { UseCaseChips } from './atoms';

const apiHighlights: ReadonlyArray<{
  readonly icon: IconDefinition;
  readonly title: string;
  readonly copy: string;
  readonly accent: string;
}> = [
  {
    icon: faLayerPlus,
    title: 'Canonical layer contracts',
    copy: 'setMarkers, setArcs, selection state, and fill data stay familiar while every kind owns its renderer.',
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
    copy: 'Per-kind setters patch materials, buffers, and DOM overlays without tearing down the scene.',
    accent: '#f472b6',
  },
  {
    icon: faDatabase,
    title: 'Data-ready visuals',
    copy: 'Markers, arcs, choropleths, labels, and focus states are wired for dashboards and storytelling.',
    accent: '#34d399',
  },
];

export function ApiSection() {
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
              sub="Globio is built for product code: typed config trees, framework adapters, runtime updates, and layer registries that keep the creative surface explicit."
            />

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {apiHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl"
                >
                  <span className="mb-4 flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
                    <FontAwesomeIcon icon={item.icon} className="size-4" style={{ color: item.accent }} />
                  </span>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.copy}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <StarBorder
                as={Link}
                to="/studio"
                color="rgba(251, 191, 36, 0.8)"
                speed="7s"
                className="text-sm font-semibold"
              >
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

          <SpotlightCard
            spotlightColor="rgba(251, 191, 36, 0.12)"
            className="!rounded-[2rem] !border-white/[0.08] !bg-[#050812]/90 !p-0"
          >
            <CodePlayground />
          </SpotlightCard>
        </div>

        <div className="mt-16">
          <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            built for
          </div>
          <UseCaseChips variant="compact" />
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] py-5">
          <ScrollVelocity
            texts={[
              <span key="a" className="text-white/75">
                VANILLA TYPESCRIPT · REACT · VUE · ANGULAR · STUDIO EXPORT · RUNTIME API ·{' '}
              </span>,
              <span key="b" className="text-amber-200/70">
                OUTLINE · DOTTED · WIREFRAME · HOLOGRAM · PAPER · CANONICAL LAYERS ·{' '}
              </span>,
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
