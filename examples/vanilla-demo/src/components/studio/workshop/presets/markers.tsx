import { useEffect, useState } from 'react';
import type {
  GlobeInstance,
  HtmlMarkerConfig,
  LatLng,
  MarkerConfig,
} from '@your-globe/core';

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
 * Markers configurator preset.
 *
 * The preview drops a fixture marker set onto the user's currently-
 * configured globe (kind / theme inherited from the studio so the
 * workshop reflects what they're actually shipping). Two render modes:
 *
 *  - `dots` — the classic 3D `globe.setMarkers` instanced sphere mesh.
 *    Best for hundreds-to-thousands of points, supports per-marker
 *    pulse animation natively.
 *  - `cards` — `globe.setHtmlMarkers`, each city becomes a styled DOM
 *    card pinned to its lat/lng. Higher fidelity (typography, custom
 *    layouts) but heavier per-marker. Used for capital tours, event
 *    callouts, anything where the readout is the point.
 *
 * Datasets cover capitals, mega-cities, the Pacific rim and a Ring of
 * Fire volcanic tour — picked for variety in marker spacing + back-
 * side occlusion behaviour as the globe rotates.
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

const renderModeOptions = [
  { value: 'dots', label: '3D dots' },
  { value: 'cards', label: 'HTML cards' },
] as const;

const cardStyleOptions = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'pill', label: 'Pill' },
  { value: 'badge', label: 'Badge' },
  { value: 'callout', label: 'Callout' },
] as const;

const cardAnchorOptions = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
] as const;

interface MarkerSettings {
  readonly dataset: keyof typeof FIXTURES;
  readonly mode: 'dots' | 'cards';
  // Dot mode
  readonly size: number;
  readonly color: string;
  readonly perMarkerColor: boolean;
  readonly hoverScale: number;
  readonly pulse: boolean;
  readonly pulseSpeed: number;
  readonly pulseAmplitude: number;
  readonly pulsePhaseOffset: boolean;
  // Card mode
  readonly cardStyle: 'minimal' | 'pill' | 'badge' | 'callout';
  readonly cardAnchor: 'top' | 'center' | 'bottom';
  readonly cardOffsetY: number;
  readonly cardAccent: string;
  readonly cardHideOccluded: boolean;
}

/* ───────── module-scoped store ───────── */
let liveSettings: MarkerSettings = {
  dataset: 'capitals',
  mode: 'dots',
  size: 1.5,
  color: '#67e8f9',
  perMarkerColor: false,
  hoverScale: 1.5,
  pulse: true,
  pulseSpeed: 1.5,
  pulseAmplitude: 0.4,
  pulsePhaseOffset: true,
  cardStyle: 'pill',
  cardAnchor: 'bottom',
  cardOffsetY: -8,
  cardAccent: '#67e8f9',
  cardHideOccluded: true,
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

/** Six-color rotation for per-marker accent mode. */
const ACCENT_ROTATION: ReadonlyArray<string> = [
  '#67e8f9',
  '#fbbf24',
  '#f472b6',
  '#34d399',
  '#a78bfa',
  '#fde68a',
];

const buildDots = (s: MarkerSettings): ReadonlyArray<MarkerConfig> => {
  const fixtures = FIXTURES[s.dataset] ?? FIXTURES.capitals!;
  return fixtures.map((m, i) => {
    const phaseShift = s.pulsePhaseOffset ? i * 0.18 : 0;
    return {
      id: m.id,
      position: m.position,
      color: s.perMarkerColor
        ? ACCENT_ROTATION[i % ACCENT_ROTATION.length]!
        : s.color,
      // marker.size is a *multiplier* of MarkersLayer.defaultSize
      // (~0.012 in the layer). 1.0 = layer default, 2.0 = double, etc.
      size: s.size,
      ...(s.pulse
        ? {
            pulse: {
              speed: s.pulseSpeed,
              amplitude: s.pulseAmplitude,
              // phase offset is per-marker but the type doesn't expose
              // it; we work around by jiggering speed slightly per
              // index so the field doesn't pulse in unison.
              ...(phaseShift !== 0
                ? { speed: s.pulseSpeed * (1 + phaseShift * 0.04) }
                : {}),
            },
          }
        : {}),
    };
  });
};

const buildCards = (s: MarkerSettings): ReadonlyArray<HtmlMarkerConfig> => {
  const fixtures = FIXTURES[s.dataset] ?? FIXTURES.capitals!;
  return fixtures.map((m) => ({
    id: m.id,
    position: m.position,
    content: () => makeCardElement(m.label, s.cardStyle, s.cardAccent),
    anchor: s.cardAnchor,
    offset: [0, s.cardOffsetY] as const,
    hideWhenOccluded: s.cardHideOccluded,
  }));
};

/**
 * Hand-built DOM card variants. Inline-styled to avoid the workshop
 * preset shipping a CSS module — the fixture is small so the verbosity
 * stays bounded. Each style is a different visual register so a user
 * can pick which feels right for their data.
 */
function makeCardElement(label: string, style: MarkerSettings['cardStyle'], accent: string): HTMLElement {
  const el = document.createElement('div');
  el.style.pointerEvents = 'none';
  el.style.userSelect = 'none';
  el.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';
  el.style.whiteSpace = 'nowrap';
  el.style.transformOrigin = 'center bottom';
  if (style === 'minimal') {
    el.textContent = label;
    el.style.color = '#ffffff';
    el.style.fontSize = '11px';
    el.style.fontWeight = '500';
    el.style.letterSpacing = '0.03em';
    el.style.textShadow = '0 1px 4px rgba(0, 0, 0, 0.7)';
  } else if (style === 'pill') {
    el.textContent = label;
    el.style.color = '#0a0d18';
    el.style.background = accent;
    el.style.fontSize = '10.5px';
    el.style.fontWeight = '600';
    el.style.letterSpacing = '0.04em';
    el.style.padding = '3px 8px';
    el.style.borderRadius = '999px';
    el.style.boxShadow = `0 0 12px ${accent}88, 0 1px 3px rgba(0,0,0,0.4)`;
  } else if (style === 'badge') {
    el.style.background = 'rgba(10, 13, 24, 0.9)';
    el.style.border = `1px solid ${accent}`;
    el.style.padding = '4px 10px';
    el.style.borderRadius = '6px';
    el.style.boxShadow = `0 0 14px ${accent}55`;
    const dot = document.createElement('span');
    dot.style.display = 'inline-block';
    dot.style.width = '6px';
    dot.style.height = '6px';
    dot.style.borderRadius = '50%';
    dot.style.background = accent;
    dot.style.marginRight = '6px';
    dot.style.verticalAlign = 'middle';
    dot.style.boxShadow = `0 0 6px ${accent}`;
    const text = document.createElement('span');
    text.textContent = label;
    text.style.color = '#ffffff';
    text.style.fontSize = '10.5px';
    text.style.fontWeight = '500';
    text.style.letterSpacing = '0.04em';
    text.style.verticalAlign = 'middle';
    el.appendChild(dot);
    el.appendChild(text);
  } else {
    // callout
    el.style.background = 'rgba(10, 13, 24, 0.92)';
    el.style.border = `1px solid ${accent}66`;
    el.style.padding = '6px 10px 7px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = `0 8px 24px -6px rgba(0,0,0,0.6), 0 0 16px ${accent}33`;
    el.style.position = 'relative';
    const tag = document.createElement('div');
    tag.textContent = 'CITY';
    tag.style.color = accent;
    tag.style.fontSize = '8.5px';
    tag.style.fontWeight = '600';
    tag.style.letterSpacing = '0.18em';
    tag.style.marginBottom = '2px';
    const text = document.createElement('div');
    text.textContent = label;
    text.style.color = '#ffffff';
    text.style.fontSize = '12px';
    text.style.fontWeight = '600';
    text.style.letterSpacing = '0.02em';
    el.appendChild(tag);
    el.appendChild(text);
    // little tail
    const tail = document.createElement('span');
    tail.style.cssText = [
      'position:absolute',
      'left:50%',
      'bottom:-4px',
      'transform:translateX(-50%) rotate(45deg)',
      'width:6px',
      'height:6px',
      'background:rgba(10,13,24,0.92)',
      `border-right:1px solid ${accent}66`,
      `border-bottom:1px solid ${accent}66`,
    ].join(';');
    el.appendChild(tail);
  }
  return el;
}

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

      <SectionHeading>Render mode</SectionHeading>
      <ToggleField
        label="Mode"
        value={settings.mode}
        options={renderModeOptions}
        onChange={(mode) => setLiveSettings({ ...settings, mode })}
      />

      <DependsOn
        when={settings.mode === 'dots'}
        because="Switch to 3D dots mode."
        className="space-y-4"
      >
        <SectionHeading>Dot style</SectionHeading>
        <SliderField
          label="Size"
          value={settings.size}
          min={0.4}
          max={6}
          step={0.1}
          format={(value) => `×${value.toFixed(1)}`}
          onChange={(size) => setLiveSettings({ ...settings, size })}
        />
        <SliderField
          label="Hover scale"
          value={settings.hoverScale}
          min={1}
          max={3}
          step={0.1}
          format={(value) => `×${value.toFixed(1)}`}
          onChange={(hoverScale) => setLiveSettings({ ...settings, hoverScale })}
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
          <SwitchField
            label="Per-marker phase offset"
            checked={settings.pulsePhaseOffset}
            onChange={(pulsePhaseOffset) => setLiveSettings({ ...settings, pulsePhaseOffset })}
            value="Stagger pulses so the field doesn't strobe in unison"
          />
        </DependsOn>
      </DependsOn>

      <DependsOn
        when={settings.mode === 'cards'}
        because="Switch to HTML cards mode."
        className="space-y-4"
      >
        <SectionHeading>Card style</SectionHeading>
        <ToggleField
          label="Variant"
          value={settings.cardStyle}
          options={cardStyleOptions}
          onChange={(cardStyle) => setLiveSettings({ ...settings, cardStyle })}
        />
        <ColorField
          label="Accent color"
          value={settings.cardAccent}
          onChange={(cardAccent) => setLiveSettings({ ...settings, cardAccent })}
          swatches={[
            '#67e8f9',
            '#fbbf24',
            '#f472b6',
            '#34d399',
            '#a78bfa',
            '#ef4444',
            '#84cc16',
            '#fde68a',
            '#ffffff',
            '#22d3ee',
          ]}
        />

        <SectionHeading>Position</SectionHeading>
        <ToggleField
          label="Anchor"
          value={settings.cardAnchor}
          options={cardAnchorOptions}
          onChange={(cardAnchor) => setLiveSettings({ ...settings, cardAnchor })}
        />
        <SliderField
          label="Vertical offset"
          value={settings.cardOffsetY}
          min={-40}
          max={40}
          step={1}
          format={(value) => `${value} px`}
          onChange={(cardOffsetY) => setLiveSettings({ ...settings, cardOffsetY })}
        />
        <SwitchField
          label="Hide on far hemisphere"
          checked={settings.cardHideOccluded}
          onChange={(cardHideOccluded) => setLiveSettings({ ...settings, cardHideOccluded })}
          value="Fade out cards rotated to the back of the globe"
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
const pushDataset = (globe: GlobeInstance, s: MarkerSettings) => {
  if (s.mode === 'dots') {
    globe.setHtmlMarkers([]);
    globe.setMarkers(buildDots(s));
  } else {
    globe.setMarkers([]);
    globe.setHtmlMarkers(buildCards(s));
  }
};
listeners.add(() => {
  if (activeGlobe) pushDataset(activeGlobe, liveSettings);
});

const preset: PresetModule = {
  cinematography: {
    initialLat: 38,
    initialLng: 18,
    speed: 0.018,
    framingPadding: 0.16,
    atmosphere: true,
    starfield: true,
    tagline: 'Mediterranean — capitals + transcontinental anchors',
  },
  KnobsComponent,
  watchedKeys: [],
  onMount: (globe) => {
    activeGlobe = globe;
    pushDataset(globe, liveSettings);
  },
  onLiveUpdate: (globe) => {
    activeGlobe = globe;
    pushDataset(globe, liveSettings);
  },
};

export default preset;
