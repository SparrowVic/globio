export type StudioFramework = 'vanilla' | 'react' | 'vue' | 'angular';

export const STUDIO_FRAMEWORKS: readonly {
  readonly id: StudioFramework;
  readonly label: string;
  readonly filename: string;
  readonly installCommand: string;
}[] = [
  { id: 'vanilla', label: 'Vanilla', filename: 'globe.ts', installCommand: 'npm install @your-globe/core three' },
  { id: 'react', label: 'React', filename: 'MyGlobe.tsx', installCommand: 'npm install @your-globe/core @your-globe/react three' },
  { id: 'vue', label: 'Vue', filename: 'MyGlobe.vue', installCommand: 'npm install @your-globe/core @your-globe/vue three' },
  { id: 'angular', label: 'Angular', filename: 'my-globe.component.ts', installCommand: 'npm install @your-globe/core @your-globe/angular three' },
];

const configImports = `import type { DataLayer, GlobeConfig } from '@your-globe/core';
import configuration from './globe-config.json';`;

const configDeclaration = `// Save the companion runtime JSON next to this file.
// Enable resolveJsonModule in tsconfig.json.
const config = configuration as unknown as {
  readonly globe: Omit<GlobeConfig, 'container'>;
  readonly dataLayer: DataLayer | null;
};`;

const assetNote = `// If cinematic.textures is enabled, copy the Earth maps from the
// demo's public/textures/earth directory to your app's public/textures/earth.
// The JSON keeps those asset URLs relative to your own site.
`;

const angularInputs = [
  'mode', 'kind', 'theme', 'countries', 'countryLabels', 'autoRotate',
  'atmosphere', 'starfield', 'focusPulse', 'dotted', 'outline', 'hologram',
  'cinematic', 'paper', 'wireframe', 'postprocessing', 'axisTilt', 'zoom',
  'performance', 'initialPosition', 'minZoom', 'maxZoom', 'arcs', 'markers', 'htmlMarkers',
];

/** Each integration uses the actual wrapper props/inputs and imperative data-layer API. */
export const generateStudioCode = (framework: StudioFramework): string => {
  if (framework === 'vanilla') {
    return `import { createGlobe } from '@your-globe/core';
${configImports}

${configDeclaration}
${assetNote}
// Call this with a visible container that has an explicit height, for example
// <div id="globe" style="width:100%;height:600px"></div>.
export function mountGlobe(container: HTMLElement): () => void {
  const globe = createGlobe({ ...config.globe, container });
  const offReady = globe.on('ready', () => globe.setDataLayer(config.dataLayer));
  const offError = globe.on('error', (error) => console.error('Globe failed to load:', error));
  globe.mount();

  // Call the returned cleanup when your page or component unmounts.
  return () => {
    offReady();
    offError();
    globe.destroy();
  };
}

const container = document.getElementById('globe');
if (container) {
  const dispose = mountGlobe(container);
  window.addEventListener('pagehide', (event) => {
    if (!event.persisted) dispose();
  });
}
`;
  }

  if (framework === 'react') {
    return `'use client';

import { useRef } from 'react';
import { Globe, type GlobeHandle } from '@your-globe/react';
${configImports}

${configDeclaration}
${assetNote}
export default function MyGlobe() {
  const globe = useRef<GlobeHandle>(null);

  // The wrapper mounts the engine and destroys it when React unmounts.
  return (
    <Globe
      ref={globe}
      {...config.globe}
      style={{ width: '100%', height: '600px' }}
      onReady={() => globe.current?.getInstance()?.setDataLayer(config.dataLayer)}
      onError={(error) => console.error('Globe failed to load:', error)}
    />
  );
}
`;
  }

  if (framework === 'vue') {
    return `<script setup lang="ts">
import { ref } from 'vue';
import { VueGlobe } from '@your-globe/vue';
import type { GlobeInstance } from '@your-globe/core';
${configImports}

${configDeclaration}
${assetNote}
const globe = ref<{ getInstance(): GlobeInstance | null } | null>(null);
const onReady = () => globe.value?.getInstance()?.setDataLayer(config.dataLayer);
const onError = (error: Error) => console.error('Globe failed to load:', error);
// VueGlobe owns engine mounting and destroys it before unmount.
</script>

<template>
  <div style="width: 100%; height: 600px">
    <VueGlobe ref="globe" v-bind="config.globe" @ready="onReady" @error="onError" />
  </div>
</template>
`;
  }

  return `import { Component, ViewChild } from '@angular/core';
import { GlobeComponent } from '@your-globe/angular';
${configImports}

${configDeclaration}
${assetNote}
@Component({
  selector: 'app-my-globe',
  standalone: true,
  imports: [GlobeComponent],
  template: \`
    <ng-globe
${angularInputs.map((key) => `      [${key}]="globeConfig.${key}"`).join('\n')}
      (ready)="onReady()"
      (globeError)="onError($event)"
    />
  \`,
  styles: [':host { display: block; width: 100%; height: 600px; }'],
})
export class MyGlobeComponent {
  @ViewChild(GlobeComponent) private globe?: GlobeComponent;
  readonly globeConfig = config.globe;

  onReady(): void {
    this.globe?.getInstance()?.setDataLayer(config.dataLayer);
  }

  onError(error: Error): void {
    console.error('Globe failed to load:', error);
  }

  // GlobeComponent mounts outside Angular's zone and destroys the engine
  // in its own ngOnDestroy, including active data layers and listeners.
}
`;
};
