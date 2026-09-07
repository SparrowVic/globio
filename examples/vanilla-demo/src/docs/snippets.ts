import type { GlobeKind, ThemePresetName } from '@your-globe/core';
import type { FrameworkCode } from './frameworks';

/**
 * Snippets reused across the skeleton pages. The real documentation pass
 * will generate these from one config per example; for now they show what
 * the code panel looks like with all four frameworks filled in.
 */
export const QUICK_START: FrameworkCode = {
  vanilla: `import { createGlobe } from '@your-globe/core';

const globe = createGlobe({
  container: document.querySelector('#globe')!,
  kind: 'outline',
  theme: 'outline-cyber',
  autoRotate: { enabled: true, speed: 0.05 },
});

globe.mount();
globe.on('countryClick', ({ country }) => console.log(country.name));`,
  react: `import { Globe } from '@your-globe/react';

export function WorldPanel() {
  return (
    <Globe
      kind="outline"
      theme="outline-cyber"
      autoRotate={{ enabled: true, speed: 0.05 }}
      onCountryClick={({ country }) => console.log(country.name)}
    />
  );
}`,
  vue: `<script setup lang="ts">
import { VueGlobe } from '@your-globe/vue';
</script>

<template>
  <VueGlobe
    kind="outline"
    theme="outline-cyber"
    :auto-rotate="{ enabled: true, speed: 0.05 }"
    @country-click="({ country }) => console.log(country.name)"
  />
</template>`,
  angular: `import { Component } from '@angular/core';
import { GlobeComponent } from '@your-globe/angular';

@Component({
  standalone: true,
  imports: [GlobeComponent],
  template: \`
    <ng-globe
      kind="outline"
      theme="outline-cyber"
      [autoRotate]="{ enabled: true, speed: 0.05 }"
      (countryClick)="log($event.country.name)"
    />
  \`,
})
export class WorldPanelComponent {
  log(name: string) { console.log(name); }
}`,
};

export const kindSnippet = (kind: GlobeKind, theme: ThemePresetName): FrameworkCode => ({
  vanilla: `const globe = createGlobe({
  container,
  kind: '${kind}',
  theme: '${theme}',
});
globe.mount();

// Switch kinds later without remounting.
globe.update({ kind: 'dotted', theme: 'dotted-dark' });`,
  react: `<Globe kind="${kind}" theme="${theme}" />`,
  vue: `<VueGlobe kind="${kind}" theme="${theme}" />`,
  angular: `<ng-globe kind="${kind}" theme="${theme}" />`,
});

export const MARKERS: FrameworkCode = {
  vanilla: `globe.setMarkers([
  { id: 'wro', position: [51.11, 17.03], pulse: true, label: 'Wrocław' },
  { id: 'nyc', position: [40.71, -74.01], color: '#ff8a4c', size: 1.4 },
]);

globe.on('markerClick', ({ marker }) => open(marker.data?.url));`,
  react: `<Globe
  markers={[
    { id: 'wro', position: [51.11, 17.03], pulse: true, label: 'Wrocław' },
    { id: 'nyc', position: [40.71, -74.01], color: '#ff8a4c', size: 1.4 },
  ]}
  onMarkerClick={({ marker }) => open(marker.data?.url)}
/>`,
  vue: `<VueGlobe :markers="markers" @marker-click="({ marker }) => open(marker.data?.url)" />`,
  angular: `<ng-globe [markers]="markers" (markerClick)="open($event.marker.data?.url)" />`,
};

export const COUNTRY_DATA: FrameworkCode = {
  vanilla: `globe.setCountryData(
  { '616': 82, '276': 71, '840': 64, '076': 38 },
  { type: 'sequential', domain: [0, 100], range: ['#15181d', '#6fb4ff'] },
);

globe.showLegend({ type: 'sequential', domain: [0, 100], range: ['#15181d', '#6fb4ff'] });`,
  react: `<Globe
  countryData={{ '616': 82, '276': 71, '840': 64, '076': 38 }}
  scale={{ type: 'sequential', domain: [0, 100], range: ['#15181d', '#6fb4ff'] }}
/>`,
  vue: `<VueGlobe :country-data="risk" :scale="scale" />`,
  angular: `<ng-globe [countryData]="risk" [scale]="scale" />`,
};

export const EVENTS: FrameworkCode = {
  vanilla: `globe.on('countryHover', (event) => {
  tooltip.hidden = event === null;
  if (event) tooltip.textContent = event.country.name;
});

globe.on('surfaceClick', ({ lat, lng }) => globe.flyTo([lat, lng]));`,
  react: `<Globe
  onCountryHover={(event) => setHovered(event?.country.name ?? null)}
  onCountryClick={({ country }) => select(country.id)}
/>`,
  vue: `<VueGlobe @country-hover="onHover" @country-click="onClick" />`,
  angular: `<ng-globe (countryHover)="onHover($event)" (countryClick)="onClick($event)" />`,
};

export const FLY_TO: FrameworkCode = {
  vanilla: `globe.flyTo([52.23, 21.01], 2.4, {
  duration: 1400,
  easing: easeInOutCubic,
  onComplete: () => globe.setActiveCountry('616'),
});

globe.focusOnCountry('036', { padding: 0.2 });`,
  react: `const ref = useRef<GlobeHandle>(null);
ref.current?.instance.flyTo([52.23, 21.01], 2.4, { duration: 1400 });`,
  vue: `const globe = ref<InstanceType<typeof VueGlobe>>();
globe.value?.instance.flyTo([52.23, 21.01], 2.4, { duration: 1400 });`,
  angular: `@ViewChild(GlobeComponent) globe!: GlobeComponent;
this.globe.instance.flyTo([52.23, 21.01], 2.4, { duration: 1400 });`,
};

export const INSTALL: Readonly<Record<'npm' | 'pnpm' | 'yarn', string>> = {
  npm: 'npm i @your-globe/core three',
  pnpm: 'pnpm add @your-globe/core three',
  yarn: 'yarn add @your-globe/core three',
};

export const ARCS: FrameworkCode = {
  vanilla: `globe.setArcs([
  { id: 'wro-nyc', from: [51.11, 17.03], to: [40.71, -74.01], height: 'auto', animated: true },
  { id: 'wro-tyo', from: [51.11, 17.03], to: [35.68, 139.69], style: 'dashed', color: '#ff8a4c' },
]);`,
  react: `<Globe arcs={[{ id: 'wro-nyc', from: [51.11, 17.03], to: [40.71, -74.01], height: 'auto', animated: true }]} />`,
  vue: `<VueGlobe :arcs="arcs" />`,
  angular: `<ng-globe [arcs]="arcs" />`,
};

export const LABELS: FrameworkCode = {
  vanilla: `const globe = createGlobe({
  container,
  countryLabels: { enabled: true, minScreenSize: 80, labels: { '276': 'Deutschland' } },
});

// Later, without remounting:
globe.setCountryLabelsEnabled(false);
globe.setCountryLabels({ '616': 'Polska', '276': 'Niemcy' });`,
  react: `<Globe countryLabels={{ enabled: true, minScreenSize: 80, labels: { '276': 'Deutschland' } }} />`,
  vue: `<VueGlobe :country-labels="{ enabled: true, minScreenSize: 80 }" />`,
  angular: `<ng-globe [countryLabels]="{ enabled: true, minScreenSize: 80 }" />`,
};

export const LEGEND: FrameworkCode = {
  vanilla: `const scale = { type: 'sequential', palette: 'viridis', domain: [0, 100] } as const;

globe.setCountryData(values, scale);
globe.showLegend(scale, { title: 'Index', position: 'bottom-left', format: (v) => \`\${v}%\` });

// Remove it again:
globe.hideLegend();`,
  react: `const globe = ref.current?.getInstance();
globe?.showLegend(scale, { title: 'Index', position: 'bottom-left' });`,
  vue: `globeRef.value?.getInstance()?.showLegend(scale, { title: 'Index' });`,
  angular: `this.globe.getInstance()?.showLegend(scale, { title: 'Index' });`,
};

export const DATA_LAYER: FrameworkCode = {
  vanilla: `globe.setDataLayer({
  type: 'bars',
  data: [
    { id: '616', value: 38 },
    { position: [40.71, -74.01], value: 8.3, color: '#ff8a4c' },
  ],
  scale: { type: 'sequential', palette: 'blues' },
  height: { min: 0.02, max: 0.35 },
  animateOnMount: 'rise',
});

// One layer at a time; null removes it.
globe.setDataLayer(null);`,
  react: `useEffect(() => {
  ref.current?.getInstance()?.setDataLayer({ type: 'heatmap', data: points, kernel: 'gaussian' });
}, [points]);`,
  vue: `watchEffect(() => globeRef.value?.getInstance()?.setDataLayer({ type: 'hexbin', data: samples, resolution: 3 }));`,
  angular: `ngAfterViewInit() {
  this.globe.getInstance()?.setDataLayer({ type: 'charts', chartType: 'donut', data: this.charts, series: this.series });
}`,
};

export const STORY: FrameworkCode = {
  vanilla: `globe.setStory({
  autoPlay: true,
  loop: true,
  scenes: [
    { id: 'intro', duration: 4000, autoRotate: true, flyTo: { position: [20, 0], distance: 3.2 } },
    { id: 'poland', duration: 5000, focusOnCountry: '616', activeCountry: '616', transitionElevation: 0.4,
      popup: { position: [52.23, 21.01], content: '<strong>Warsaw</strong>' } },
    { id: 'japan', duration: 5000, focusOnCountry: { id: '392', padding: 0.25 }, activeCountry: '392' },
  ],
});

globe.on('sceneEnter', ({ scene, index }) => setCaption(scene.id, index));
globe.nextScene();`,
  react: `const globe = ref.current?.getInstance();
globe?.setStory(story);
globe?.playStory();`,
  vue: `globeRef.value?.getInstance()?.setStory(story);`,
  angular: `this.globe.getInstance()?.setStory(story);`,
};

export const AUTO_ROTATE: FrameworkCode = {
  vanilla: `const globe = createGlobe({
  container,
  autoRotate: { enabled: true, speed: 0.6 },
});

// Pause and resume at runtime:
globe.update({ autoRotate: { enabled: false } });`,
  react: `<Globe autoRotate={{ enabled: playing, speed: 0.6 }} />`,
  vue: `<VueGlobe :auto-rotate="{ enabled: playing, speed: 0.6 }" />`,
  angular: `<ng-globe [autoRotate]="{ enabled: playing, speed: 0.6 }" />`,
};

export const ZOOM: FrameworkCode = {
  vanilla: `createGlobe({
  container,
  zoom: { mode: 'repel', strength: 0.8, smooth: true },
  minZoom: 1.6,
  maxZoom: 4,
});

// A decoration that never zooms and lets the page scroll through it:
createGlobe({ container, framing: { padding: 0.2, lockZoom: true } });`,
  react: `<Globe zoom={{ mode: 'repel', strength: 0.8 }} minZoom={1.6} maxZoom={4} />`,
  vue: `<VueGlobe :zoom="{ mode: 'repel', strength: 0.8 }" :min-zoom="1.6" :max-zoom="4" />`,
  angular: `<ng-globe [zoom]="{ mode: 'repel', strength: 0.8 }" [minZoom]="1.6" [maxZoom]="4" />`,
};

export const POSITION: FrameworkCode = {
  vanilla: `createGlobe({
  container,
  initialPosition: [52, 20],   // Europe faces the camera on mount
  axisTilt: 23.5,              // Earth-like tilt, visual only
  framing: { padding: 0.18 },  // room for the atmosphere halo
});`,
  react: `<Globe initialPosition={[52, 20]} axisTilt={23.5} framing={{ padding: 0.18 }} />`,
  vue: `<VueGlobe :initial-position="[52, 20]" :axis-tilt="23.5" :framing="{ padding: 0.18 }" />`,
  angular: `<ng-globe [initialPosition]="[52, 20]" [axisTilt]="23.5" [framing]="{ padding: 0.18 }" />`,
};

export const SELECTION: FrameworkCode = {
  vanilla: `globe.on('countryClick', ({ country }) => {
  globe.setActiveCountry(globe.getActiveCountry() === country.id ? null : country.id);
});

createGlobe({
  container,
  countries: { hoverEnabled: true, hoverOccludeBackSide: false },
  focusPulse: { origin: 'click', pulseOnSurfaceClick: true },
});`,
  react: `<Globe
  countries={{ hoverEnabled: true }}
  focusPulse={{ origin: 'click' }}
  onCountryClick={({ country }) => ref.current?.getInstance()?.setActiveCountry(country.id)}
/>`,
  vue: `<VueGlobe :countries="{ hoverEnabled: true }" @country-click="({ country }) => globeRef?.getInstance()?.setActiveCountry(country.id)" />`,
  angular: `<ng-globe [countries]="{ hoverEnabled: true }" (countryClick)="globe.getInstance()?.setActiveCountry($event.country.id)" />`,
};

export const PROJECTION: FrameworkCode = {
  vanilla: `const place = () => {
  const px = globe.project(52.23, 21.01);
  label.hidden = px === null;                 // behind the globe or off-canvas
  if (px) label.style.transform = \`translate(\${px[0]}px, \${px[1]}px)\`;
  requestAnimationFrame(place);
};
place();

// A PNG of the current frame, e.g. for a share card:
const dataUrl = await globe.toImage({ width: 1200, height: 630 });`,
  react: `const px = ref.current?.getInstance()?.project(52.23, 21.01);`,
  vue: `const px = globeRef.value?.getInstance()?.project(52.23, 21.01);`,
  angular: `const px = this.globe.getInstance()?.project(52.23, 21.01);`,
};

export const PERFORMANCE: FrameworkCode = {
  vanilla: `createGlobe({
  container,
  countries: { resolution: 'low' },            // decorative globes
  performance: { maxFps: 30, pixelRatio: 1, adaptiveQuality: true, pauseWhenHidden: true },
});

// Keep a globe warm behind a cross-fade without spending frames:
globe.setPaused(true);`,
  react: `<Globe countries={{ resolution: 'low' }} performance={{ maxFps: 30, adaptiveQuality: true }} />`,
  vue: `<VueGlobe :countries="{ resolution: 'low' }" :performance="{ maxFps: 30 }" />`,
  angular: `<ng-globe [countries]="{ resolution: 'low' }" [performance]="{ maxFps: 30 }" />`,
};

export const TIMING: FrameworkCode = {
  vanilla: `globe.on('ready', () => {
  for (const m of performance.getEntriesByType('measure')) {
    if (m.name.startsWith('globio:')) console.log(m.name, Math.round(m.duration), 'ms');
  }
});
// globio:construct · globio:countries-load · globio:kind-build · globio:shader-compile · globio:mount-to-ready`,
};

export const THEME_EXTEND: FrameworkCode = {
  vanilla: `import { createGlobe, registerThemePreset } from '@your-globe/core';

// Extend inline…
createGlobe({
  container,
  kind: 'outline',
  theme: {
    extends: 'outline-cyber',
    tokens: { 'countries.border.color': '#6fb4ff', 'background.color': '#050608' },
  },
});

// …or register once and use by name everywhere.
registerThemePreset('brand-night', { 'background.color': '#050608', 'countries.border.color': '#6fb4ff' });
createGlobe({ container, kind: 'outline', theme: 'brand-night' });`,
  react: `<Globe kind="outline" theme={{ extends: 'outline-cyber', tokens: { 'countries.border.color': '#6fb4ff' } }} />`,
  vue: `<VueGlobe kind="outline" :theme="{ extends: 'outline-cyber', tokens }" />`,
  angular: `<ng-globe kind="outline" [theme]="{ extends: 'outline-cyber', tokens }" />`,
};

export const ATMOSPHERE: FrameworkCode = {
  vanilla: `createGlobe({
  container,
  atmosphere: { enabled: true, color: '#6fb4ff', intensity: 1.2, radiusScale: 1.18, power: 2.2, pulse: { enabled: true, speed: 0.2 } },
  starfield: { enabled: true, density: 2400, twinkle: { enabled: true, intensity: 0.4 } },
  transparent: true,
});`,
  react: `<Globe atmosphere={{ intensity: 1.2, radiusScale: 1.18 }} starfield={{ density: 2400 }} transparent />`,
  vue: `<VueGlobe :atmosphere="{ intensity: 1.2 }" :starfield="{ density: 2400 }" transparent />`,
  angular: `<ng-globe [atmosphere]="{ intensity: 1.2 }" [starfield]="{ density: 2400 }" [transparent]="true" />`,
};

export const COUNTRIES_STYLE: FrameworkCode = {
  vanilla: `createGlobe({
  container,
  countries: {
    resolution: 'medium',
    hoverEnabled: true,
    borderHover: { color: '#dcebff', width: 1.6, glowColor: '#6fb4ff', glowWidth: 4 },
    borderActive: { color: '#ff8a4c', width: 2 },
    fill: { mode: 'palette', palette: ['#15181d', '#1b2130', '#22283a'], hoverColor: '#2a3550' },
  },
});`,
  react: `<Globe countries={{ resolution: 'medium', borderActive: { color: '#ff8a4c' }, fill: { mode: 'always', defaultColor: '#15181d' } }} />`,
  vue: `<VueGlobe :countries="{ resolution: 'medium', fill: { mode: 'always', defaultColor: '#15181d' } }" />`,
  angular: `<ng-globe [countries]="{ resolution: 'medium', fill: { mode: 'always', defaultColor: '#15181d' } }" />`,
};

export const POSTFX: FrameworkCode = {
  vanilla: `createGlobe({
  container,
  kind: 'cinematic',
  postprocessing: {
    enabled: true,
    exposure: 1.05,
    bloom: { strength: 0.5, threshold: 0.75, radius: 0.6 },
    streak: { enabled: true, strength: 0.2 },
    vignette: { strength: 0.3 },
    grain: { enabled: false },
  },
});`,
  react: `<Globe kind="cinematic" postprocessing={{ bloom: { strength: 0.5 }, grain: { enabled: false } }} />`,
  vue: `<VueGlobe kind="cinematic" :postprocessing="{ bloom: { strength: 0.5 } }" />`,
  angular: `<ng-globe kind="cinematic" [postprocessing]="{ bloom: { strength: 0.5 } }" />`,
};
