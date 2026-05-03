import { useEffect, useState } from 'react';
import type { ArcConfig, GlobeInstance, LatLng } from '@your-globe/core';

import { SliderField, SwitchField, ToggleField } from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Arcs configurator preset.
 *
 * Cinematography: outline-dark over the Atlantic so a few long-haul
 * great-circles read clearly across both hemispheres. Slow rotate so
 * the user can watch any animated head particle complete a full cycle
 * without dizziness.
 *
 * Architecture note: arcs aren't part of `GlobeSettings` — they're
 * imperative API. This preset keeps its styling knobs in a module-
 * scoped store (preview is single-instance) and surfaces them through
 * the workshop preset's `onMount` / `onLiveUpdate` hooks which re-push
 * `globe.setArcs(...)` with the latest config. KnobsComponent
 * subscribes to the same store so sliders stay in sync.
 *
 * Dataset is a fixed seven-arc fixture spanning major city pairs
 * (NYC↔LON, TYO↔SFO, SYD↔LAX, DXB↔SEA, JNB↔FRA, GIG↔MAD, SIN↔IST).
 * Picked for visual variety: long over-pole hops + transcons + short
 * european jumps.
 */

interface ArcFixture {
  readonly id: string;
  readonly from: LatLng;
  readonly to: LatLng;
}

const FIXTURE: ReadonlyArray<ArcFixture> = [
  { id: 'nyc-lon', from: [40.71, -74.0], to: [51.51, -0.13] },
  { id: 'tyo-sfo', from: [35.68, 139.69], to: [37.77, -122.42] },
  { id: 'syd-lax', from: [-33.87, 151.21], to: [33.94, -118.41] },
  { id: 'dxb-sea', from: [25.27, 55.3], to: [47.61, -122.33] },
  { id: 'jnb-fra', from: [-26.2, 28.04], to: [50.11, 8.68] },
  { id: 'gig-mad', from: [-22.91, -43.17], to: [40.42, -3.7] },
  { id: 'sin-ist', from: [1.35, 103.82], to: [41.01, 28.98] },
];

interface ArcSettings {
  readonly width: number;
  /** 0 → use 'auto' height (long arcs rise higher). */
  readonly height: number;
  readonly style: 'solid' | 'dashed';
  readonly dashSize: number;
  readonly dashGap: number;
  readonly animated: boolean;
  readonly animationDuration: number;
  readonly headEasing: 'linear' | 'easeInOut' | 'pulse';
}

const styleOptions = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
] as const;

const headEasingOptions = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeInOut', label: 'Ease' },
  { value: 'pulse', label: 'Pulse' },
] as const;

/* ───────── module-scoped store ───────── */
// Single preview at a time → a single shared cell + listener set is
// enough. KnobsComponent subscribes to re-render; preset hooks read
// it to drive globe.setArcs(...).
let liveSettings: ArcSettings = {
  width: 1.6,
  height: 0,
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

const buildArcs = (s: ArcSettings): ReadonlyArray<ArcConfig> =>
  FIXTURE.map((arc) => ({
    id: arc.id,
    from: arc.from,
    to: arc.to,
    width: s.width,
    height: s.height === 0 ? 'auto' : s.height,
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

/* ───────── knobs UI ───────── */

const KnobsComponent = ({}: KnobsComponentProps) => {
  const settings = useArcSettings();
  return (
    <div className="space-y-4">
      <SectionHeading>Stroke</SectionHeading>
      <SliderField
        label="Width"
        value={settings.width}
        min={0.4}
        max={4}
        step={0.1}
        format={(value) => `${value.toFixed(1)} px`}
        onChange={(width) => setLiveSettings({ ...settings, width })}
      />
      <SliderField
        label="Apex height"
        value={settings.height}
        min={0}
        max={1}
        step={0.05}
        format={(value) => (value === 0 ? 'auto' : value.toFixed(2))}
        onChange={(height) => setLiveSettings({ ...settings, height })}
      />

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

/* ───────── live globe instance bridge ───────── */
// Stash the active globe so the listener-driven push can reach it
// even between WorkshopPreviewGlobe re-renders. Resets on mount
// (each fresh build hands us a new instance).
let activeGlobe: GlobeInstance | null = null;
listeners.add(() => {
  if (activeGlobe) activeGlobe.setArcs(buildArcs(liveSettings));
});

const preset: PresetModule = {
  cinematography: {
    kind: 'outline',
    theme: 'outline-dark',
    initialLat: 30,
    initialLng: -30,
    speed: 0.014,
    framingPadding: 0.18,
    atmosphere: true,
    starfield: true,
    tagline: 'Outline · Atlantic — long-haul great circles arc across the globe',
  },
  KnobsComponent,
  // No GlobeSettings keys — arcs styling lives outside state.globe.
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
