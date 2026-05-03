import { useEffect, useState } from 'react';
import type { GlobeInstance, LatLng, MarkerConfig } from '@your-globe/core';

import { SliderField, SwitchField } from '@/components/shared/controls';
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
 * capitals + a few transcontinental anchors gives the user enough
 * pulse/size variety to see knobs land.
 *
 * Architecture mirrors `arcs.tsx`: markers are imperative API, so the
 * preset stashes its styling in a module-scoped store, hooks
 * onMount / onLiveUpdate to push `globe.setMarkers(...)`, and KnobsCom-
 * ponent subscribes to the same store so sliders stay in sync.
 *
 * Dataset is 12 capitals/landmarks: a balance of dense Europe + sparse
 * outliers (Cairo, Tokyo, Sydney, NYC, Rio) so spacing reads at any
 * camera angle.
 */

interface MarkerFixture {
  readonly id: string;
  readonly position: LatLng;
  readonly label: string;
}

const FIXTURE: ReadonlyArray<MarkerFixture> = [
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
];

interface MarkerSettings {
  readonly size: number;
  readonly color: string;
  readonly pulse: boolean;
  readonly pulseSpeed: number;
  readonly pulseAmplitude: number;
  readonly showLabels: boolean;
}

/* ───────── module-scoped store ───────── */
let liveSettings: MarkerSettings = {
  size: 0.018,
  color: '#67e8f9',
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

const buildMarkers = (s: MarkerSettings): ReadonlyArray<MarkerConfig> =>
  FIXTURE.map((m) => ({
    id: m.id,
    position: m.position,
    color: s.color,
    size: s.size,
    ...(s.showLabels && { label: m.label }),
    ...(s.pulse && { pulse: { speed: s.pulseSpeed, amplitude: s.pulseAmplitude } }),
  }));

const PALETTE: ReadonlyArray<{ readonly value: string; readonly label: string }> = [
  { value: '#67e8f9', label: 'Cyan' },
  { value: '#fbbf24', label: 'Amber' },
  { value: '#f472b6', label: 'Pink' },
  { value: '#34d399', label: 'Emerald' },
  { value: '#a78bfa', label: 'Violet' },
  { value: '#ffffff', label: 'White' },
];

/* ───────── knobs UI ───────── */

const KnobsComponent = ({}: KnobsComponentProps) => {
  const settings = useMarkerSettings();
  return (
    <div className="space-y-4">
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
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-300/80">
          Color
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setLiveSettings({ ...settings, color: c.value })}
              className={`group relative flex h-8 items-center justify-center rounded-md border transition-all ${
                settings.color === c.value
                  ? 'border-white/60 ring-1 ring-white/30'
                  : 'border-white/10 hover:border-white/30'
              }`}
              style={{ background: `${c.value}26` }}
              aria-label={c.label}
              title={c.label}
            >
              <span
                className="size-3 rounded-full"
                style={{ background: c.value, boxShadow: `0 0 8px ${c.value}99` }}
              />
            </button>
          ))}
        </div>
      </div>
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

/* ───────── live globe instance bridge ───────── */
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
  // No GlobeSettings keys — markers styling lives outside state.globe.
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
