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
