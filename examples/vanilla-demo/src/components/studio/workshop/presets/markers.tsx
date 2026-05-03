import { useEffect, useState } from 'react';
import type { GlobeInstance, LatLng, MarkerConfig } from '@your-globe/core';

import {
  ColorField,
  SelectField,
  SliderField,
  SwitchField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Markers configurator preset.
 *
 * Cinematography: hologram-cyan over the Mediterranean — markers read
 * crisply against the moody silhouette, and the cluster of European
 * capitals + a few transcontinental anchors gives enough pulse / size
 * variety to see knobs land.
 *
 * Architecture mirrors `arcs.tsx`: markers are imperative API, so the
 * preset stashes its styling in a module-scoped store and surfaces it
 * via the workshop preset's `onMount` / `onLiveUpdate` hooks. Knobs-
 * Component subscribes to the same store so sliders stay in sync.
 *
 * Datasets: 4 variants spanning capitals, mega-cities, capitals + a
 * mid-Pacific anchor (so the user sees the back-side fade in real
 * time), and a "ring of fire" volcanic tour.
 */

interface MarkerFixture {
  readonly id: string;
  readonly position: LatLng;
  readonly label: string;
}

const FIXTURES: Readonly<Record<string, ReadonlyArray<MarkerFixture>>> = {
  capitals: [
    { id: 'lon', position: [51.51, -0.13], label: 'London' },
    { id: 'par', position: [48.86, 2.35], label: 'Paris' },
    { id: 'ber', position: [52.52, 13.4], label: 'Berlin' },
    { id: 'rom', position: [41.9, 12.5], label: 'Rome' },
    { id: 'mad', position: [40.42, -3.7], label: 'Madrid' },
    { id: 'ist', position: [41.01, 28.98], label: 'Istanbul' },
    { id: 'cai', position: [30.04, 31.24], label: 'Cairo' },
    { id: 'nyc', position: [40.71, -74.0], label: 'New York' },
    { id: 'rio', position: [-22.91, -43.17], label: 'Rio' },
    { id: 'tyo', position: [35.68, 139.69], label: 'Tokyo' },
    { id: 'syd', position: [-33.87, 151.21], label: 'Sydney' },
    { id: 'cpt', position: [-33.92, 18.42], label: 'Cape Town' },
  ],
  megacities: [
    { id: 'tyo', position: [35.68, 139.69], label: 'Tokyo' },
    { id: 'del', position: [28.7, 77.1], label: 'Delhi' },
    { id: 'sha', position: [31.23, 121.47], label: 'Shanghai' },
    { id: 'spa', position: [-23.55, -46.63], label: 'São Paulo' },
    { id: 'mex', position: [19.43, -99.13], label: 'Mexico City' },
    { id: 'cai', position: [30.04, 31.24], label: 'Cairo' },
    { id: 'mum', position: [19.07, 72.88], label: 'Mumbai' },
    { id: 'pek', position: [39.91, 116.4], label: 'Beijing' },
    { id: 'dhk', position: [23.81, 90.41], label: 'Dhaka' },
    { id: 'osa', position: [34.69, 135.5], label: 'Osaka' },
    { id: 'nyc', position: [40.71, -74.0], label: 'New York' },
    { id: 'kar', position: [24.86, 67.0], label: 'Karachi' },
  ],
  pacific: [
    { id: 'tyo', position: [35.68, 139.69], label: 'Tokyo' },
    { id: 'sfo', position: [37.77, -122.42], label: 'San Francisco' },
    { id: 'syd', position: [-33.87, 151.21], label: 'Sydney' },
    { id: 'akl', position: [-36.85, 174.76], label: 'Auckland' },
    { id: 'hnl', position: [21.31, -157.86], label: 'Honolulu' },
    { id: 'gua', position: [13.45, 144.79], label: 'Guam' },
    { id: 'rar', position: [-21.21, -159.78], label: 'Rarotonga' },
    { id: 'lim', position: [-12.05, -77.04], label: 'Lima' },
  ],
  ringoffire: [
    { id: 'fuji', position: [35.36, 138.73], label: 'Fuji' },
    { id: 'aso', position: [32.88, 131.1], label: 'Aso' },
    { id: 'pinatubo', position: [15.13, 120.35], label: 'Pinatubo' },
    { id: 'krakatoa', position: [-6.1, 105.42], label: 'Krakatoa' },
    { id: 'merapi', position: [-7.54, 110.45], label: 'Merapi' },
    { id: 'ruapehu', position: [-39.28, 175.57], label: 'Ruapehu' },
    { id: 'erebus', position: [-77.53, 167.17], label: 'Erebus' },
    { id: 'cotopaxi', position: [-0.68, -78.44], label: 'Cotopaxi' },
    { id: 'osorno', position: [-41.1, -72.49], label: 'Osorno' },
    { id: 'st-helens', position: [46.2, -122.18], label: 'St. Helens' },
    { id: 'rainier', position: [46.85, -121.76], label: 'Rainier' },
    { id: 'kilauea', position: [19.42, -155.29], label: 'Kīlauea' },
  ],
};

const datasetOptions = [
  { value: 'capitals', label: 'Capitals' },
  { value: 'megacities', label: 'Mega-cities' },
  { value: 'pacific', label: 'Pacific rim' },
  { value: 'ringoffire', label: 'Ring of fire' },
] as const;

interface MarkerSettings {
  readonly dataset: keyof typeof FIXTURES;
  readonly size: number;
  readonly color: string;
  readonly perMarkerColor: boolean;
  readonly pulse: boolean;
  readonly pulseSpeed: number;
  readonly pulseAmplitude: number;
  readonly showLabels: boolean;
}

/* ───────── module-scoped store ───────── */
let liveSettings: MarkerSettings = {
  dataset: 'capitals',
  size: 0.018,
  color: '#67e8f9',
  perMarkerColor: false,
  pulse: true,
  pulseSpeed: 1.5,
  pulseAmplitude: 0.4,
  showLabels: false,
};
const listeners = new Set<() => void>();
const setLiveSettings = (next: MarkerSettings) => {
  liveSettings = next;
  listeners.forEach((fn) => fn());
};

const useMarkerSettings = (): MarkerSettings => {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return liveSettings;
};

/** Per-marker rotating accent palette. */
const ACCENT_ROTATION: ReadonlyArray<string> = [
  '#67e8f9',
  '#fbbf24',
  '#f472b6',
  '#34d399',
  '#a78bfa',
  '#fde68a',
];

const buildMarkers = (s: MarkerSettings): ReadonlyArray<MarkerConfig> => {
  const fixtures = FIXTURES[s.dataset] ?? FIXTURES.capitals!;
  return fixtures.map((m, i) => ({
    id: m.id,
    position: m.position,
    color: s.perMarkerColor
      ? ACCENT_ROTATION[i % ACCENT_ROTATION.length]!
      : s.color,
    size: s.size,
    ...(s.showLabels && { label: m.label }),
    ...(s.pulse && { pulse: { speed: s.pulseSpeed, amplitude: s.pulseAmplitude } }),
  }));
};

const KnobsComponent = ({}: KnobsComponentProps) => {
  const settings = useMarkerSettings();
  return (
    <div className="space-y-4">
      <SectionHeading>Dataset</SectionHeading>
      <SelectField
        label="Fixture"
        value={settings.dataset}
        options={datasetOptions}
        onChange={(dataset) => setLiveSettings({ ...settings, dataset })}
      />

      <SectionHeading>Style</SectionHeading>
      <SliderField
        label="Size"
        value={settings.size}
        min={0.004}
        max={0.05}
        step={0.001}
        format={(value) => value.toFixed(3)}
        onChange={(size) => setLiveSettings({ ...settings, size })}
      />
      <SwitchField
        label="Per-marker accent palette"
        checked={settings.perMarkerColor}
        onChange={(perMarkerColor) => setLiveSettings({ ...settings, perMarkerColor })}
        value="Rotate through a six-color palette"
      />
      <DependsOn
        when={!settings.perMarkerColor}
        because="Disable Per-marker accent palette first."
        className="space-y-4"
      >
        <ColorField
          label="Color"
          value={settings.color}
          onChange={(color) => setLiveSettings({ ...settings, color })}
          swatches={[
            '#67e8f9',
            '#22d3ee',
            '#fbbf24',
            '#f472b6',
            '#34d399',
            '#a78bfa',
            '#ef4444',
            '#84cc16',
            '#fde68a',
            '#ffffff',
          ]}
        />
      </DependsOn>
      <SwitchField
        label="Show labels"
        checked={settings.showLabels}
        onChange={(showLabels) => setLiveSettings({ ...settings, showLabels })}
        value="Render the marker's label string above each dot"
      />

      <SectionHeading>Pulse</SectionHeading>
      <SwitchField
        label="Animated pulse"
        checked={settings.pulse}
        onChange={(pulse) => setLiveSettings({ ...settings, pulse })}
        value="Markers oscillate in size to draw attention"
      />
      <DependsOn
        when={settings.pulse}
        because="Enable pulse first."
        className="space-y-4"
      >
        <SliderField
          label="Speed"
          value={settings.pulseSpeed}
          min={0.2}
          max={4}
          step={0.1}
          format={(value) => `${value.toFixed(1)} Hz`}
          onChange={(pulseSpeed) => setLiveSettings({ ...settings, pulseSpeed })}
        />
        <SliderField
          label="Amplitude"
          value={settings.pulseAmplitude}
          min={0.05}
          max={1}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(pulseAmplitude) => setLiveSettings({ ...settings, pulseAmplitude })}
        />
      </DependsOn>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-emerald-200/70">
      {children}
    </p>
  );
}

let activeGlobe: GlobeInstance | null = null;
listeners.add(() => {
  if (activeGlobe) activeGlobe.setMarkers(buildMarkers(liveSettings));
});

const preset: PresetModule = {
  cinematography: {
    kind: 'hologram',
    theme: 'hologram-cyan',
    initialLat: 38,
    initialLng: 18,
    speed: 0.018,
    framingPadding: 0.16,
    atmosphere: true,
    starfield: true,
    tagline: 'Hologram · Mediterranean — capitals + transcontinental anchors',
  },
  KnobsComponent,
  watchedKeys: [],
  onMount: (globe) => {
    activeGlobe = globe;
    globe.setMarkers(buildMarkers(liveSettings));
  },
  onLiveUpdate: (globe) => {
    activeGlobe = globe;
    globe.setMarkers(buildMarkers(liveSettings));
  },
};

export default preset;
