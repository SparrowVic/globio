import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAperture,
  faArrowsTurnToDots,
  faBadgeCheck,
  faBullseyePointer,
  faChartMixed,
  faCircleNodes,
  faCrosshairs,
  faDrawPolygon,
  faEarthEurope,
  faLocationDot,
  faMoonStars,
  faRoute,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import { SpotlightCard } from '@/components/reactbits';
import { SectionHeader } from '@/components/shared';

const layerRows: ReadonlyArray<{
  readonly name: string;
  readonly contract: string;
  readonly icon: IconDefinition;
  readonly accent: string;
}> = [
  { name: 'labels', contract: 'DOM country labels, occlusion fade', icon: faBadgeCheck, accent: '#fbbf24' },
  { name: 'starfield', contract: 'backdrop points or constellations', icon: faMoonStars, accent: '#c084fc' },
  { name: 'atmosphere', contract: 'halo, Fresnel or material glow', icon: faEarthEurope, accent: '#67e8f9' },
  { name: 'arcs', contract: 'lat/lng route animation', icon: faRoute, accent: '#22d3ee' },
  { name: 'markers', contract: 'point data, hover and pulse', icon: faLocationDot, accent: '#fb7185' },
  { name: 'selection', contract: 'hover and pinned countries', icon: faDrawPolygon, accent: '#34d399' },
  { name: 'country-fill', contract: 'none, always, palette, data', icon: faChartMixed, accent: '#f59e0b' },
  { name: 'focus-pulse', contract: 'click/focus wavefront', icon: faBullseyePointer, accent: '#f472b6' },
  { name: 'crosshair', contract: 'HUD cursor readout', icon: faCrosshairs, accent: '#a78bfa' },
];

const kindNames = ['outline', 'dotted', 'wireframe', 'hologram', 'paper'] as const;
const matrixGridClass = 'grid grid-cols-[1.15fr_repeat(5,minmax(64px,1fr))]';

export function LayerArchitectureSection() {
  return (
    <section id="architecture" className="relative overflow-hidden py-32">
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.025)_48%,transparent_100%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <SectionHeader
              align="left"
              eyebrow="Canonical layers"
              title="Shared contract. Dedicated implementation."
              sub="The public names stay predictable, but the renderer behind each layer belongs to the active globe kind. Dotted markers do not look like outline markers; paper arcs do not behave like hologram arcs."
            />
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                ['setMarkers()', 'same API shape'],
                ['setArcs()', 'kind-native render'],
                ['setPaperConfig()', 'live subtree'],
                ['globe.update()', 'no full rebuild'],
              ].map(([label, desc]) => (
                <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="font-mono text-sm text-white">{label}</div>
                  <div className="mt-1 text-xs text-slate-500">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:hidden">
            {layerRows.map((layer) => (
              <div key={layer.name} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/25">
                    <FontAwesomeIcon icon={layer.icon} className="size-4" style={{ color: layer.accent }} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-mono text-sm text-white">{layer.name}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-500">{layer.contract}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {kindNames.map((kind) => (
                    <span
                      key={kind}
                      className="rounded-full border px-2 py-1 font-mono text-[10px]"
                      style={{ borderColor: `${layer.accent}44`, color: layer.accent, background: `${layer.accent}12` }}
                    >
                      {kind}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <SpotlightCard
            spotlightColor="rgba(251, 191, 36, 0.12)"
            className="hidden !rounded-[1.8rem] !border-white/[0.08] !bg-[#050812]/90 !p-0 md:block"
          >
            <div className="relative z-10 overflow-hidden rounded-[1.8rem]">
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                  <div className={`${matrixGridClass} border-b border-white/[0.08] bg-white/[0.035] text-[10px] uppercase tracking-[0.16em] text-slate-500`}>
                    <div className="px-4 py-3">layer</div>
                    {kindNames.map((kind) => (
                      <div key={kind} className="border-l border-white/[0.06] px-3 py-3 text-center">
                        {kind}
                      </div>
                    ))}
                  </div>

                  {layerRows.map((layer, rowIndex) => (
                    <div key={layer.name} className={`${matrixGridClass} border-b border-white/[0.055] last:border-b-0`}>
                      <div className="flex items-center gap-3 px-4 py-4">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
                          <FontAwesomeIcon icon={layer.icon} className="size-4" style={{ color: layer.accent }} />
                        </span>
                        <div className="min-w-0">
                          <div className="font-mono text-sm text-white">{layer.name}</div>
                          <div className="truncate text-xs text-slate-500">{layer.contract}</div>
                        </div>
                      </div>
                      {kindNames.map((kind, colIndex) => (
                        <div key={`${layer.name}-${kind}`} className="flex items-center justify-center border-l border-white/[0.055] px-3">
                          <span
                            className="relative flex size-6 items-center justify-center rounded-full border"
                            style={{
                              borderColor: `${layer.accent}${rowIndex === colIndex + 1 ? 'aa' : '44'}`,
                              background: rowIndex === colIndex + 1 ? `${layer.accent}1f` : 'rgba(255,255,255,0.03)',
                            }}
                          >
                            <FontAwesomeIcon icon={rowIndex % 2 === 0 ? faCircleNodes : faArrowsTurnToDots} className="size-2.5" style={{ color: layer.accent }} />
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </div>
      <FontAwesomeIcon icon={faAperture} className="pointer-events-none absolute -bottom-16 -right-12 -z-10 size-80 text-white/[0.025]" />
    </section>
  );
}
