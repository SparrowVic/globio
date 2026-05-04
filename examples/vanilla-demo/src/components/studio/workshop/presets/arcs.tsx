import { useEffect, useState } from 'react';
import type { ArcConfig, GlobeInstance, LatLng } from '@your-globe/core';

import {
  ColorField,
  SelectField,
  SliderField,
  SwitchField,
  ToggleField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Arcs configurator preset.
 *
 * Cinematography: outline-dark over the Atlantic. Long-haul great
 * circles read clearly across both hemispheres; auto-rotate is slow
 * enough to watch a pulse-eased head particle complete a full cycle
 * without dizziness.
 *
 * Dataset variants — switching between fixtures on the fly:
 *  - "World hubs"     — seven long-haul connections (NYC↔LON, etc.)
 *  - "Trans-pacific"  — five cross-Pacific arcs
 *  - "Mediterranean"  — six dense short hops around the Med
 *  - "Polar"          — three over-pole connections that go *through*
 *                        the auto-rotate's view
 *  - "Webby"          — fifteen criss-crossing arcs from a hub city
 *
 * Styling knobs: width (now actually honoured — refactored to Line2 +
 * LineMaterial), apex height (auto / fixed), color, solid / dashed +
 * dash size + gap, and animated head with cycle duration + easing
 * (linear / easeInOut / pulse).
 */

interface ArcFixture {
  readonly id: string;
  readonly from: LatLng;
  readonly to: LatLng;
}

const FIXTURES: Readonly<Record<string, ReadonlyArray<ArcFixture>>> = {
  hubs: [
    { id: 'nyc-lon', from: [40.71, -74.0], to: [51.51, -0.13] },
    { id: 'tyo-sfo', from: [35.68, 139.69], to: [37.77, -122.42] },
    { id: 'syd-lax', from: [-33.87, 151.21], to: [33.94, -118.41] },
    { id: 'dxb-sea', from: [25.27, 55.3], to: [47.61, -122.33] },
    { id: 'jnb-fra', from: [-26.2, 28.04], to: [50.11, 8.68] },
    { id: 'gig-mad', from: [-22.91, -43.17], to: [40.42, -3.7] },
    { id: 'sin-ist', from: [1.35, 103.82], to: [41.01, 28.98] },
  ],
  pacific: [
    { id: 'sfo-tyo', from: [37.77, -122.42], to: [35.68, 139.69] },
    { id: 'lax-syd', from: [33.94, -118.41], to: [-33.87, 151.21] },
    { id: 'sea-hkg', from: [47.61, -122.33], to: [22.32, 114.17] },
    { id: 'yvr-icn', from: [49.28, -123.12], to: [37.45, 126.45] },
    { id: 'lim-akl', from: [-12.05, -77.04], to: [-36.85, 174.76] },
  ],
  med: [
    { id: 'rom-ist', from: [41.9, 12.5], to: [41.01, 28.98] },
    { id: 'bcn-tlv', from: [41.39, 2.16], to: [32.07, 34.78] },
    { id: 'mar-ath', from: [43.3, 5.37], to: [37.98, 23.72] },
    { id: 'mad-cai', from: [40.42, -3.7], to: [30.04, 31.24] },
    { id: 'lis-tun', from: [38.72, -9.14], to: [36.81, 10.18] },
    { id: 'mil-bey', from: [45.46, 9.19], to: [33.89, 35.5] },
  ],
  polar: [
    { id: 'jfk-hkg', from: [40.71, -74.0], to: [22.32, 114.17] },
    { id: 'ord-pek', from: [41.88, -87.63], to: [39.91, 116.4] },
    { id: 'osl-anc', from: [59.91, 10.75], to: [61.22, -149.9] },
  ],
  webby: [
    { id: 'lon-nyc', from: [51.51, -0.13], to: [40.71, -74.0] },
    { id: 'lon-cdg', from: [51.51, -0.13], to: [49.01, 2.55] },
    { id: 'lon-fra', from: [51.51, -0.13], to: [50.11, 8.68] },
    { id: 'lon-rom', from: [51.51, -0.13], to: [41.9, 12.5] },
    { id: 'lon-mad', from: [51.51, -0.13], to: [40.42, -3.7] },
    { id: 'lon-ist', from: [51.51, -0.13], to: [41.01, 28.98] },
    { id: 'lon-dxb', from: [51.51, -0.13], to: [25.27, 55.3] },
    { id: 'lon-sin', from: [51.51, -0.13], to: [1.35, 103.82] },
    { id: 'lon-tyo', from: [51.51, -0.13], to: [35.68, 139.69] },
    { id: 'lon-syd', from: [51.51, -0.13], to: [-33.87, 151.21] },
    { id: 'lon-jnb', from: [51.51, -0.13], to: [-26.2, 28.04] },
    { id: 'lon-gru', from: [51.51, -0.13], to: [-23.55, -46.63] },
    { id: 'lon-yyz', from: [51.51, -0.13], to: [43.65, -79.38] },
    { id: 'lon-mex', from: [51.51, -0.13], to: [19.43, -99.13] },
    { id: 'lon-bom', from: [51.51, -0.13], to: [19.07, 72.88] },
  ],
};

const datasetOptions = [
  { value: 'hubs', label: 'World hubs' },
  { value: 'pacific', label: 'Trans-pacific' },
  { value: 'med', label: 'Mediterranean' },
  { value: 'polar', label: 'Polar' },
  { value: 'webby', label: 'Web from London' },
] as const;

const styleOptions = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
] as const;

const headEasingOptions = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeInOut', label: 'Ease' },
  { value: 'pulse', label: 'Pulse' },
] as const;

interface ArcSettings {
  readonly dataset: keyof typeof FIXTURES;
  readonly width: number;
  /** 0 → use 'auto' height (long arcs rise higher). */
  readonly height: number;
  readonly minHeight: number;
  readonly maxHeight: number;
  readonly color: string;
  readonly perArcGradient: boolean;
  readonly style: 'solid' | 'dashed';
  readonly dashSize: number;
  readonly dashGap: number;
  readonly animated: boolean;
  readonly animationDuration: number;
  readonly headEasing: 'linear' | 'easeInOut' | 'pulse';
}

/* ───────── module-scoped store ───────── */
let liveSettings: ArcSettings = {
  dataset: 'hubs',
  width: 2,
  height: 0,
  minHeight: 0.15,
  maxHeight: 0.6,
  color: '#22d3ee',
  perArcGradient: true,
  style: 'solid',
  dashSize: 0.04,
  dashGap: 0.02,
  animated: true,
  animationDuration: 2,
  headEasing: 'pulse',
};
const listeners = new Set<() => void>();
const setLiveSettings = (next: ArcSettings) => {
  liveSettings = next;
  listeners.forEach((fn) => fn());
  // Imperative push to the active preview globe — without this, the
  // workshop preview only reflected knob changes after a full save
  // (the preset's `watchedKeys` is empty so `WorkshopPreviewGlobe`'s
  // live-update effect never re-fires its `onLiveUpdate` callback).
  // Mirror the same `globe.setArcs` call `onLiveUpdate` would have
  // made so knobs propagate immediately.
  if (activeGlobe) activeGlobe.setArcs(buildArcs(next));
};

const useArcSettings = (): ArcSettings => {
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

/**
 * "Per-arc gradient" rotates through a small accent palette so a
 * dataset reads as multiple distinct routes. When off, every arc uses
 * the master color. Picked the cyan family + amber + pink so it works
 * on both dark and light themes.
 */
const ACCENT_ROTATION: ReadonlyArray<string> = [
  '#22d3ee',
  '#67e8f9',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
];

const buildArcs = (s: ArcSettings): ReadonlyArray<ArcConfig> => {
  const fixtures = FIXTURES[s.dataset] ?? FIXTURES.hubs!;
  return fixtures.map((arc, i) => ({
    id: arc.id,
    from: arc.from,
    to: arc.to,
    width: s.width,
    height: s.height === 0 ? 'auto' : s.height,
    minHeight: s.minHeight,
    maxHeight: s.maxHeight,
    color: s.perArcGradient
      ? ACCENT_ROTATION[i % ACCENT_ROTATION.length]!
      : s.color,
    style: s.style,
    ...(s.style === 'dashed' ? { dashSize: s.dashSize, dashGap: s.dashGap } : {}),
    ...(s.animated
      ? {
          animated: true,
          animationDuration: s.animationDuration,
          headEasing: s.headEasing,
        }
      : {}),
  }));
};

const KnobsComponent = ({}: KnobsComponentProps) => {
  const settings = useArcSettings();
  return (
    <div className="space-y-4">
      <SectionHeading>Dataset</SectionHeading>
      <SelectField
        label="Fixture"
        value={settings.dataset}
        options={datasetOptions}
        onChange={(dataset) => setLiveSettings({ ...settings, dataset })}
      />

      <SectionHeading>Stroke</SectionHeading>
      <SliderField
        label="Width"
        value={settings.width}
        min={0.5}
        max={8}
        step={0.25}
        format={(value) => `${value.toFixed(2)} px`}
        onChange={(width) => setLiveSettings({ ...settings, width })}
      />
      <SwitchField
        label="Per-arc accent gradient"
        checked={settings.perArcGradient}
        onChange={(perArcGradient) => setLiveSettings({ ...settings, perArcGradient })}
        value="Rotate through a five-color accent palette"
      />
      <DependsOn
        when={!settings.perArcGradient}
        because="Disable Per-arc accent gradient first."
        className="space-y-4"
      >
        <ColorField
          label="Master color"
          value={settings.color}
          onChange={(color) => setLiveSettings({ ...settings, color })}
          swatches={[
            '#22d3ee',
            '#67e8f9',
            '#a78bfa',
            '#f472b6',
            '#fbbf24',
            '#ef4444',
            '#34d399',
            '#84cc16',
            '#fde68a',
            '#ffffff',
          ]}
        />
      </DependsOn>

      <SectionHeading>Curve</SectionHeading>
      <SliderField
        label="Apex height"
        value={settings.height}
        min={0}
        max={1}
        step={0.05}
        format={(value) => (value === 0 ? 'auto' : value.toFixed(2))}
        onChange={(height) => setLiveSettings({ ...settings, height })}
      />
      <DependsOn
        when={settings.height === 0}
        because="Switch Apex height to 'auto' first."
        className="space-y-4"
      >
        <SliderField
          label="Min auto height"
          value={settings.minHeight}
          min={0}
          max={0.5}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(minHeight) => setLiveSettings({ ...settings, minHeight })}
        />
        <SliderField
          label="Max auto height"
          value={settings.maxHeight}
          min={0.1}
          max={1.2}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(maxHeight) => setLiveSettings({ ...settings, maxHeight })}
        />
      </DependsOn>

      <SectionHeading>Line style</SectionHeading>
      <ToggleField
        label="Style"
        value={settings.style}
        options={styleOptions}
        onChange={(style) => setLiveSettings({ ...settings, style })}
      />
      <DependsOn
        when={settings.style === 'dashed'}
        because="Switch to dashed style first."
        className="space-y-4"
      >
        <SliderField
          label="Dash size"
          value={settings.dashSize}
          min={0.005}
          max={0.2}
          step={0.005}
          format={(value) => value.toFixed(3)}
          onChange={(dashSize) => setLiveSettings({ ...settings, dashSize })}
        />
        <SliderField
          label="Dash gap"
          value={settings.dashGap}
          min={0.005}
          max={0.2}
          step={0.005}
          format={(value) => value.toFixed(3)}
          onChange={(dashGap) => setLiveSettings({ ...settings, dashGap })}
        />
      </DependsOn>

      <SectionHeading>Animation</SectionHeading>
      <SwitchField
        label="Animated head"
        checked={settings.animated}
        onChange={(animated) => setLiveSettings({ ...settings, animated })}
        value="Travelling particle along the arc"
      />
      <DependsOn
        when={settings.animated}
        because="Enable Animated head first."
        className="space-y-4"
      >
        <SliderField
          label="Cycle duration"
          value={settings.animationDuration}
          min={0.4}
          max={6}
          step={0.1}
          format={(value) => `${value.toFixed(1)} s`}
          onChange={(animationDuration) => setLiveSettings({ ...settings, animationDuration })}
        />
        <ToggleField
          label="Head easing"
          value={settings.headEasing}
          options={headEasingOptions}
          onChange={(headEasing) => setLiveSettings({ ...settings, headEasing })}
        />
      </DependsOn>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-cyan-200/70">
      {children}
    </p>
  );
}

let activeGlobe: GlobeInstance | null = null;
listeners.add(() => {
  if (activeGlobe) activeGlobe.setArcs(buildArcs(liveSettings));
});

const preset: PresetModule = {
  cinematography: {
    initialLat: 30,
    initialLng: -30,
    speed: 0.014,
    framingPadding: 0.18,
    atmosphere: true,
    starfield: true,
    tagline: 'Atlantic — long-haul great circles arc across the globe',
  },
  KnobsComponent,
  watchedKeys: [],
  onMount: (globe) => {
    activeGlobe = globe;
    globe.setArcs(buildArcs(liveSettings));
  },
  onLiveUpdate: (globe) => {
    activeGlobe = globe;
    globe.setArcs(buildArcs(liveSettings));
  },
};

export default preset;
