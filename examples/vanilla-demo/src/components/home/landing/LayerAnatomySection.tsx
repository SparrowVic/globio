import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAperture,
  faBadgeCheck,
  faBullseyePointer,
  faChartMixed,
  faCrosshairs,
  faDrawPolygon,
  faEarthEurope,
  faLocationDot,
  faMoonStars,
  faRoute,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { SectionHeader } from '@/components/shared';
import { LayerCard } from './anatomy/LayerCard';
import { AnatomyDiagram } from './anatomy/AnatomyDiagram';

interface LayerSpec {
  readonly name: string;
  readonly contract: string;
  readonly icon: IconDefinition;
  readonly accent: string;
}

const LAYERS: ReadonlyArray<LayerSpec> = [
  { name: 'starfield', contract: 'Backdrop points or constellations.', icon: faMoonStars, accent: '#c084fc' },
  { name: 'atmosphere', contract: 'Halo, fresnel, or material glow.', icon: faEarthEurope, accent: '#67e8f9' },
  { name: 'country-fill', contract: 'None, always, palette, or data.', icon: faChartMixed, accent: '#f59e0b' },
  { name: 'arcs', contract: 'Lat/lng route animation.', icon: faRoute, accent: '#22d3ee' },
  { name: 'markers', contract: 'Point data with hover and pulse.', icon: faLocationDot, accent: '#fb7185' },
  { name: 'selection', contract: 'Hover and pinned country state.', icon: faDrawPolygon, accent: '#34d399' },
  { name: 'labels', contract: 'DOM country labels with occlusion.', icon: faBadgeCheck, accent: '#fbbf24' },
  { name: 'focus-pulse', contract: 'Click and focus wavefront.', icon: faBullseyePointer, accent: '#f472b6' },
  { name: 'crosshair', contract: 'HUD cursor readout.', icon: faCrosshairs, accent: '#a78bfa' },
];

export function LayerAnatomySection() {
  return (
    <section id="architecture" className="relative overflow-hidden py-28">
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.025)_48%,transparent_100%)]" />

      <div className="mx-auto max-w-[1480px] px-6">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <SectionHeader
              align="left"
              eyebrow="Canonical layers"
              title="Nine layers. Owned by every kind."
              sub="The public names stay predictable, the renderer behind each layer belongs to the active kind. Dotted markers don't look like outline markers, paper arcs don't behave like hologram arcs."
            />
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                ['setMarkers()', 'same API shape'],
                ['setArcs()', 'kind-native render'],
                ['setCountryData()', 'choropleth path'],
                ['globe.update()', 'no full rebuild'],
              ].map(([label, desc]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4"
                >
                  <div className="font-mono text-sm text-white">{label}</div>
                  <div className="mt-1 text-xs text-slate-500">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {LAYERS.map((layer) => (
              <LayerCard key={layer.name} {...layer} />
            ))}
          </div>
        </div>

        <AnatomyDiagram className="mt-20" />
      </div>

      <FontAwesomeIcon
        icon={faAperture}
        className="pointer-events-none absolute -bottom-16 -right-12 -z-10 size-80 text-white/[0.025]"
      />
    </section>
  );
}
