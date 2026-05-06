import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowUpRight,
  faCircleDashed,
  faGrid,
  faGrid2,
  faRadar,
  faScrollOld,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { GlobeKind } from '@your-globe/core';
import type { ReactElement } from 'react';

import {
  DottedPreview,
  HologramPreview,
  OutlinePreview,
  PaperPreview,
  WireframePreview,
} from '@/components/home/KindPreviews';
import { SpotlightCard } from '@/components/reactbits';
import { SectionHeader } from '@/components/shared';
import { cn } from '@/lib/utils';

const kindCards: ReadonlyArray<{
  readonly id: GlobeKind;
  readonly name: string;
  readonly icon: IconDefinition;
  readonly accent: string;
  readonly role: string;
  readonly description: string;
  readonly layers: ReadonlyArray<string>;
  readonly preview: ReactElement;
}> = [
  {
    id: 'outline',
    name: 'Outline',
    icon: faCircleDashed,
    accent: '#fbbf24',
    role: 'Editorial command center',
    description: 'Clean borders, crisp fills, tooltips, focus pulse, and country selection tuned for serious dashboards.',
    layers: ['borders', 'labels', 'pulse'],
    preview: <OutlinePreview />,
  },
  {
    id: 'dotted',
    name: 'Dotted',
    icon: faGrid,
    accent: '#67e8f9',
    role: 'Particle radar atlas',
    description: 'A surface of living dots with radar markers, particle arcs, edge-aware country states, and constellation stars.',
    layers: ['dot field', 'beacons', 'streams'],
    preview: <DottedPreview />,
  },
  {
    id: 'hologram',
    name: 'Hologram',
    icon: faRadar,
    accent: '#22d3ee',
    role: 'Projection instrument',
    description: 'Scanlines, chromatic rim, projector hum, glitch bursts, and luminous interaction layers for sci-fi interfaces.',
    layers: ['scan', 'glitch', 'rim'],
    preview: <HologramPreview />,
  },
  {
    id: 'paper',
    name: 'Paper',
    icon: faScrollOld,
    accent: '#f2c15b',
    role: 'Educational atlas',
    description: 'Textured ocean paper, pastel land wash, ink borders, compass marks, and map-grade labels for warm learning apps.',
    layers: ['ocean hatch', 'ink', 'wash'],
    preview: <PaperPreview />,
  },
  {
    id: 'wireframe',
    name: 'Wireframe',
    icon: faGrid2,
    accent: '#a78bfa',
    role: 'Topological skeleton',
    description: 'A grid-first globe with hierarchy beams, data packets, compass ticks, and structural pulse effects.',
    layers: ['grid', 'packets', 'beams'],
    preview: <WireframePreview />,
  },
];

export function KindShowcaseSection() {
  return (
    <section id="kinds" className="relative py-32">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.08),transparent_28%),radial-gradient(circle_at_88%_50%,rgba(34,211,238,0.1),transparent_32%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Visual system"
          title="Five globe kinds. Zero pasted-on layers."
          sub="Every kind ships its own implementation of the canonical layers, so markers, arcs, labels, selection and focus effects speak the same visual language as the base globe."
        />

        <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-6">
          {kindCards.map((kind, index) => (
            <SpotlightCard
              key={kind.id}
              spotlightColor={toRgba(kind.accent, 0.2)}
              className={cn(
                'group h-full !rounded-[1.6rem] !border-white/[0.07] !bg-[#050812]/85 !p-0',
                index < 3 ? 'lg:col-span-2' : 'lg:col-span-3',
              )}
            >
              <Link to={`/studio?kind=${kind.id}`} className="relative z-10 flex h-full min-h-[390px] flex-col overflow-hidden rounded-[1.6rem]">
                <div className="relative h-44 overflow-hidden border-b border-white/[0.06] bg-black/35">
                  <div className="absolute inset-0 opacity-80">{kind.preview}</div>
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 opacity-40"
                    style={{ background: `radial-gradient(circle at 50% 45%, ${kind.accent}33, transparent 62%)` }}
                  />
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/35 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-300 backdrop-blur-md">
                    <FontAwesomeIcon icon={kind.icon} className="size-3" style={{ color: kind.accent }} />
                    {kind.name}
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4 text-[11px] uppercase tracking-[0.22em]" style={{ color: kind.accent }}>
                    {kind.role}
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight text-white">{kind.name} globe</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{kind.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {kind.layers.map((layer) => (
                      <span key={layer} className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[11px] text-slate-300">
                        {layer}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-8 text-sm">
                    <span className="text-slate-300 transition-colors group-hover:text-white">Open in Studio</span>
                    <span className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
                      <FontAwesomeIcon icon={faArrowUpRight} className="size-3" style={{ color: kind.accent }} />
                    </span>
                  </div>
                </div>
              </Link>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </section>
  );
}

const toRgba = (hex: string, alpha: number): `rgba(${number}, ${number}, ${number}, ${number})` => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
