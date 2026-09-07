import type { ArcConfig, GlobeInstance, MarkerConfig, ScaleConfig, StoryConfig } from '@your-globe/core';
import type { FrameworkCode } from './frameworks';

/**
 * The data and setup behind each recipe's live preview. The code panels
 * on the recipe pages show the same values, so what the reader sees is
 * what the snippet produces.
 */

// ---- Choropleth dashboard --------------------------------------------------
export const DASHBOARD_DATA: Readonly<Record<string, { readonly value: number }>> = {
  '616': { value: 82 }, // Poland
  '276': { value: 71 }, // Germany
  '250': { value: 64 }, // France
  '724': { value: 58 }, // Spain
  '840': { value: 66 }, // United States
  '076': { value: 38 }, // Brazil
  '356': { value: 44 }, // India
  '392': { value: 77 }, // Japan
  '036': { value: 61 }, // Australia
  '710': { value: 33 }, // South Africa
};
export const DASHBOARD_SCALE: ScaleConfig = { type: 'sequential', palette: 'viridis', domain: [0, 100] };

export const dashboardSetup = (globe: GlobeInstance): (() => void) => {
  globe.setCountryData(DASHBOARD_DATA, DASHBOARD_SCALE);
  globe.showLegend(DASHBOARD_SCALE, { title: 'Index', position: 'bottom-left', format: (v) => `${v}%` });
  const off = globe.on('countryClick', ({ country }) => {
    globe.setActiveCountry(globe.getActiveCountry() === country.id ? null : country.id);
  });
  return () => {
    off();
    globe.hideLegend();
    globe.setCountryData(null);
  };
};

export const DASHBOARD_CODE: FrameworkCode = {
  vanilla: `import { createGlobe } from '@your-globe/core';

const scale = { type: 'sequential', palette: 'viridis', domain: [0, 100] } as const;
const values = { '616': { value: 82 }, '276': { value: 71 }, '840': { value: 66 }, '076': { value: 38 } };

const globe = createGlobe({
  container: document.querySelector('#globe')!,
  kind: 'outline',
  theme: 'outline-dark',
  countryData: values,
  countries: { fill: { hoverColor: '#dcebff', hoverOpacity: 0.35 } },
});
globe.mount();

globe.on('ready', () => {
  globe.setCountryData(values, scale);
  globe.showLegend(scale, { title: 'Index', position: 'bottom-left', format: (v) => \`\${v}%\` });
});

globe.on('countryClick', ({ country }) => {
  globe.setActiveCountry(globe.getActiveCountry() === country.id ? null : country.id);
  renderPanel(country, values[country.id]?.value);
});

// New numbers arrive: fills tween, nothing is rebuilt.
socket.on('update', (next) => globe.setCountryData(next, scale));`,
  react: `import { useRef } from 'react';
import { Globe, type GlobeHandle } from '@your-globe/react';

const scale = { type: 'sequential', palette: 'viridis', domain: [0, 100] } as const;

export function Dashboard({ values }) {
  const ref = useRef<GlobeHandle>(null);
  return (
    <Globe
      kind="outline"
      theme="outline-dark"
      countryData={values}
      onReady={() => {
        const globe = ref.current?.getInstance();
        globe?.setCountryData(values, scale);
        globe?.showLegend(scale, { title: 'Index', position: 'bottom-left' });
      }}
      onCountryClick={({ country }) => ref.current?.getInstance()?.setActiveCountry(country.id)}
      ref={ref}
    />
  );
}`,
  vue: `<script setup lang="ts">
import { ref } from 'vue';
import { VueGlobe } from '@your-globe/vue';
const globeRef = ref();
const scale = { type: 'sequential', palette: 'viridis', domain: [0, 100] } as const;
const onReady = () => {
  const globe = globeRef.value?.getInstance();
  globe?.setCountryData(values, scale);
  globe?.showLegend(scale, { title: 'Index' });
};
</script>

<template>
  <VueGlobe ref="globeRef" kind="outline" theme="outline-dark" :country-data="values" @ready="onReady"
    @country-click="({ country }) => globeRef?.getInstance()?.setActiveCountry(country.id)" />
</template>`,
  angular: `@Component({
  standalone: true,
  imports: [GlobeComponent],
  template: \`<ng-globe kind="outline" theme="outline-dark" [countryData]="values" (ready)="onReady()" (countryClick)="select($event)" />\`,
})
export class DashboardComponent {
  @ViewChild(GlobeComponent) globe!: GlobeComponent;
  scale = { type: 'sequential', palette: 'viridis', domain: [0, 100] } as const;
  onReady() {
    const g = this.globe.getInstance();
    g?.setCountryData(this.values, this.scale);
    g?.showLegend(this.scale, { title: 'Index' });
  }
  select(e: CountryEvent) { this.globe.getInstance()?.setActiveCountry(e.country.id); }
}`,
};

// ---- Flight routes ---------------------------------------------------------
export const HUBS: ReadonlyArray<MarkerConfig> = [
  { id: 'waw', position: [52.17, 20.97], label: 'Warsaw', pulse: true, color: '#ff8a4c' },
  { id: 'lhr', position: [51.47, -0.46], label: 'London' },
  { id: 'jfk', position: [40.64, -73.78], label: 'New York' },
  { id: 'dxb', position: [25.25, 55.36], label: 'Dubai' },
  { id: 'sin', position: [1.36, 103.99], label: 'Singapore' },
  { id: 'hnd', position: [35.55, 139.78], label: 'Tokyo' },
];
export const ROUTES: ReadonlyArray<ArcConfig> = [
  { id: 'waw-lhr', from: [52.17, 20.97], to: [51.47, -0.46], height: 'auto', animated: true },
  { id: 'waw-jfk', from: [52.17, 20.97], to: [40.64, -73.78], height: 'auto', animated: true, animationDuration: 3 },
  { id: 'waw-dxb', from: [52.17, 20.97], to: [25.25, 55.36], height: 'auto', animated: true },
  { id: 'dxb-sin', from: [25.25, 55.36], to: [1.36, 103.99], height: 'auto', style: 'dashed' },
  { id: 'sin-hnd', from: [1.36, 103.99], to: [35.55, 139.78], height: 'auto', animated: true, headEasing: 'easeInOut' },
];

export const routesSetup = (globe: GlobeInstance): (() => void) => {
  globe.setMarkers(HUBS);
  globe.setArcs(ROUTES);
  return () => {
    globe.setArcs([]);
    globe.setMarkers([]);
  };
};

export const ROUTES_CODE: FrameworkCode = {
  vanilla: `const hubs = [
  { id: 'waw', position: [52.17, 20.97], label: 'Warsaw', pulse: true, color: '#ff8a4c' },
  { id: 'lhr', position: [51.47, -0.46], label: 'London' },
  { id: 'jfk', position: [40.64, -73.78], label: 'New York' },
  { id: 'dxb', position: [25.25, 55.36], label: 'Dubai' },
];
const routes = [
  { id: 'waw-lhr', from: [52.17, 20.97], to: [51.47, -0.46], height: 'auto', animated: true },
  { id: 'waw-jfk', from: [52.17, 20.97], to: [40.64, -73.78], height: 'auto', animated: true, animationDuration: 3 },
  { id: 'waw-dxb', from: [52.17, 20.97], to: [25.25, 55.36], height: 'auto', style: 'dashed' },
];

const globe = createGlobe({ container, kind: 'outline', theme: 'outline-cyber', markers: hubs, arcs: routes });
globe.mount();

globe.on('markerHover', (e) => (tooltip.textContent = e ? e.marker.label ?? '' : ''));
globe.on('markerClick', ({ marker }) => globe.focusOnCountry(countryOf(marker.id), { padding: 0.3 }));`,
  react: `<Globe
  kind="outline"
  theme="outline-cyber"
  markers={hubs}
  arcs={routes}
  onMarkerHover={(e) => setHovered(e?.marker.label ?? null)}
/>`,
  vue: `<VueGlobe kind="outline" theme="outline-cyber" :markers="hubs" :arcs="routes" @marker-hover="onHover" />`,
  angular: `<ng-globe kind="outline" theme="outline-cyber" [markers]="hubs" [arcs]="routes" (markerHover)="onHover($event)" />`,
};

// ---- Story-driven landing --------------------------------------------------
export const LANDING_STORY: StoryConfig = {
  autoPlay: true,
  loop: true,
  scenes: [
    { id: 'poland', duration: 5000, focusOnCountry: { id: '616', padding: 0.3 }, activeCountry: '616', transitionElevation: 0.3 },
    { id: 'japan', duration: 5000, focusOnCountry: { id: '392', padding: 0.3 }, activeCountry: '392', transitionElevation: 0.5 },
    { id: 'brazil', duration: 5000, focusOnCountry: { id: '076', padding: 0.3 }, activeCountry: '076', transitionElevation: 0.4 },
  ],
};

export const storySetup = (globe: GlobeInstance): (() => void) => {
  globe.setStory(LANDING_STORY);
  return () => globe.setStory(null);
};

export const STORY_CODE: FrameworkCode = {
  vanilla: `const captions = { poland: 'Where it started', japan: 'First customer abroad', brazil: 'Today: three continents' };

const globe = createGlobe({ container, kind: 'cinematic', theme: 'cinematic-dawn', autoRotate: { enabled: true, speed: 0.2 } });
globe.mount();

globe.on('ready', () => globe.setStory({
  autoPlay: true,
  loop: true,
  scenes: [
    { id: 'poland', duration: 5000, focusOnCountry: { id: '616', padding: 0.3 }, activeCountry: '616', transitionElevation: 0.3 },
    { id: 'japan', duration: 5000, focusOnCountry: { id: '392', padding: 0.3 }, activeCountry: '392', transitionElevation: 0.5 },
    { id: 'brazil', duration: 5000, focusOnCountry: { id: '076', padding: 0.3 }, activeCountry: '076', transitionElevation: 0.4 },
  ],
}));

globe.on('sceneEnter', ({ scene }) => (caption.textContent = captions[scene.id]));
next.addEventListener('click', () => globe.nextScene());`,
  react: `<Globe
  kind="cinematic"
  theme="cinematic-dawn"
  onReady={() => ref.current?.getInstance()?.setStory(story)}
  onSceneEnter={({ scene }) => setCaption(captions[scene.id])}
  ref={ref}
/>`,
  vue: `<VueGlobe ref="globeRef" kind="cinematic" theme="cinematic-dawn"
  @ready="globeRef?.getInstance()?.setStory(story)"
  @scene-enter="({ scene }) => (caption = captions[scene.id])" />`,
  angular: `<ng-globe kind="cinematic" theme="cinematic-dawn" (ready)="globe.getInstance()?.setStory(story)" (sceneEnter)="caption = captions[$event.scene.id]" />`,
};

// ---- Hero globe ------------------------------------------------------------
export const HERO_CODE: FrameworkCode = {
  vanilla: `const globe = createGlobe({
  container: document.querySelector('#hero-globe')!,
  kind: 'cinematic',
  theme: 'cinematic-night',
  transparent: true,                      // the page gradient shows through
  framing: { padding: 0.2, lockZoom: true }, // room for the halo; wheel scrolls the page
  autoRotate: { enabled: true, speed: 0.08 },
  countries: { resolution: 'low', hoverEnabled: false },
  starfield: { enabled: true, density: 1800 },
  performance: { maxFps: 30, pauseWhenHidden: true, adaptiveQuality: true },
});
globe.mount();
globe.on('ready', () => hero.classList.add('is-live')); // fade the canvas in on the first real frame`,
  react: `<Globe
  kind="cinematic"
  theme="cinematic-night"
  transparent
  framing={{ padding: 0.2, lockZoom: true }}
  autoRotate={{ enabled: true, speed: 0.08 }}
  countries={{ resolution: 'low', hoverEnabled: false }}
  performance={{ maxFps: 30, pauseWhenHidden: true }}
  onReady={() => setLive(true)}
  className={live ? 'opacity-100' : 'opacity-0'}
/>`,
  vue: `<VueGlobe kind="cinematic" theme="cinematic-night" transparent :framing="{ padding: 0.2, lockZoom: true }"
  :auto-rotate="{ enabled: true, speed: 0.08 }" :countries="{ resolution: 'low', hoverEnabled: false }" @ready="live = true" />`,
  angular: `<ng-globe kind="cinematic" theme="cinematic-night" [transparent]="true" [framing]="{ padding: 0.2, lockZoom: true }"
  [autoRotate]="{ enabled: true, speed: 0.08 }" [countries]="{ resolution: 'low', hoverEnabled: false }" (ready)="live = true" />`,
};

// ---- Live data feed --------------------------------------------------------
const FEED_CITIES: ReadonlyArray<{ readonly id: string; readonly position: readonly [number, number]; readonly label: string }> = [
  { id: 'wro', position: [51.11, 17.03], label: 'Wrocław' },
  { id: 'ber', position: [52.52, 13.41], label: 'Berlin' },
  { id: 'lis', position: [38.72, -9.14], label: 'Lisbon' },
  { id: 'nyc', position: [40.71, -74.01], label: 'New York' },
  { id: 'sao', position: [-23.55, -46.63], label: 'São Paulo' },
  { id: 'lag', position: [6.52, 3.38], label: 'Lagos' },
  { id: 'nbo', position: [-1.29, 36.82], label: 'Nairobi' },
  { id: 'del', position: [28.61, 77.21], label: 'Delhi' },
  { id: 'sha', position: [31.23, 121.47], label: 'Shanghai' },
  { id: 'syd', position: [-33.87, 151.21], label: 'Sydney' },
  { id: 'tor', position: [43.65, -79.38], label: 'Toronto' },
  { id: 'mex', position: [19.43, -99.13], label: 'Mexico City' },
];

export const feedSetup = (globe: GlobeInstance): (() => void) => {
  const live: string[] = [];
  let n = 0;
  const tick = () => {
    const city = FEED_CITIES[n % FEED_CITIES.length];
    if (!city) return;
    n += 1;
    const id = `${city.id}-${n}`;
    globe.addMarker({ id, position: city.position, label: city.label, pulse: { speed: 2, amplitude: 0.6 }, color: '#ff8a4c', size: 1.2 });
    live.push(id);
    while (live.length > 8) {
      const oldest = live.shift();
      if (oldest) globe.removeMarker(oldest);
    }
  };
  tick();
  const timer = window.setInterval(tick, 1100);
  return () => {
    window.clearInterval(timer);
    globe.setMarkers([]);
  };
};

export const FEED_CODE: FrameworkCode = {
  vanilla: `const globe = createGlobe({ container, kind: 'dotted', theme: 'dotted-dark', autoRotate: { enabled: true, speed: 0.15 } });
globe.mount();

const live: string[] = [];
const MAX = 8;

source.addEventListener('message', (event) => {
  const { id, lat, lng, city } = JSON.parse(event.data);
  globe.addMarker({ id, position: [lat, lng], label: city, pulse: { speed: 2, amplitude: 0.6 }, color: '#ff8a4c', size: 1.2 });
  live.push(id);
  while (live.length > MAX) globe.removeMarker(live.shift()!);   // keep the newest eight
});`,
  react: `useEffect(() => {
  const globe = ref.current?.getInstance();
  if (!globe) return;
  const live: string[] = [];
  const onMessage = (e: MessageEvent) => {
    const { id, lat, lng, city } = JSON.parse(e.data);
    globe.addMarker({ id, position: [lat, lng], label: city, pulse: true });
    live.push(id);
    while (live.length > 8) globe.removeMarker(live.shift()!);
  };
  source.addEventListener('message', onMessage);
  return () => source.removeEventListener('message', onMessage);
}, [ready]);`,
  vue: `watch(ready, () => {
  const globe = globeRef.value?.getInstance();
  source.onmessage = (e) => globe?.addMarker({ ...JSON.parse(e.data), pulse: true });
});`,
  angular: `onReady() {
  const globe = this.globe.getInstance();
  this.source.onmessage = (e) => globe?.addMarker({ ...JSON.parse(e.data), pulse: true });
}`,
};
