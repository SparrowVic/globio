# Interactive Globe Library

Interactive 3D globe library for Angular, React and Vue, built on Three.js — six visual
kinds, nine canonical layers, data layers, a story engine and a shared HDR post-processing
pipeline, all live-updatable.

## Architecture

This is a monorepo with one framework-agnostic core and three thin framework wrappers.

```
packages/
├── core/        @your-globe/core      vanilla TS, Three.js renderer
├── react/       @your-globe/react     React 18+ wrapper
├── angular/     @your-globe/angular   Angular 17+ standalone component
└── vue/         @your-globe/vue       Vue 3 component
```

## Tech stack

- **pnpm workspaces** — package manager + monorepo
- **Turborepo** — build orchestration with cache
- **Changesets** — versioning + automated npm publishing
- **tsup** — bundler (per package)
- **TypeScript** strict mode

## Getting started

```bash
pnpm install
pnpm build
pnpm dev        # Vite demo on http://localhost:5173 (landing + /studio) with tsup --watch for core
```

## Releasing

After making changes:

```bash
pnpm changeset
```

Describe what changed, choose semver bump per package. Commit. On merge to `main`, the Release workflow opens a PR with version bumps. Merging that PR publishes to npm automatically.

## Core API

```ts
import { createGlobe } from '@your-globe/core';

const globe = createGlobe({
  container: document.getElementById('app')!,
  kind: 'cinematic',               // 'cinematic' | 'outline' | 'dotted' | 'wireframe' | 'paper' | 'hologram'
  theme: 'cinematic-night',        // built-in preset or { extends, tokens }
  markers: [{ id: '1', position: [52.23, 21.01], label: 'Warsaw' }],
  autoRotate: { enabled: true, speed: 0.5 },
  performance: { adaptiveQuality: true },
});

globe.on('markerClick', ({ marker }) => console.log(marker));
globe.on('ready', () => console.log('countries loaded, shaders compiled'));
globe.mount();

// Everything is live-updatable:
globe.update({ cinematic: { sun: { mode: 'orbit', speed: 6 } } });
```

## Kinds

Six visual personalities share one engine and the same nine canonical layers
(labels, focus pulse, starfield, selection, country fill, arcs, markers,
atmosphere, crosshair): `cinematic`, `outline`, `dotted`, `wireframe`, `paper`,
`hologram`. Data layers (`setDataLayer`: choropleth, heatmap, hexbin, charts) and
the Story API (`setStory`) work on every kind. See `FEATURES.md` for the catalog.

### Cinematic

A filmic Earth: relief and biomes from a baked terrain atlas, ice, shallows,
cloud shell with shadows, scattering atmosphere, sun disc, aurora, Milky Way,
plus data accents (network, arcs, optional city lights). Two modes with one
shader:

```ts
createGlobe({
  container,
  kind: 'cinematic',
  theme: 'cinematic-day',        // also: cinematic-night, cinematic-dawn, cinematic-noir
  cinematic: {
    sun: { mode: 'realtime' },   // 'fixed' | 'realtime' | 'orbit'
    clouds: { coverage: 0.42, shadows: true },
    aurora: { enabled: true },
    // Optional real maps (procedural look stays the default):
    textures: {
      day: '/textures/earth/earth_atmos_2048.jpg',
      night: '/textures/earth/earth_lights_2048.png',
      normal: '/textures/earth/earth_normal_2048.jpg',
      specular: '/textures/earth/earth_specular_2048.jpg',
      clouds: '/textures/earth/earth_clouds_1024.png',
    },
  },
  postprocessing: { bloom: { strength: 0.5 } }, // on by default for cinematic only
});
```

No extra dependency is needed for textures — `three` (the peer dependency) loads
them; the demo ships a 2k set under `examples/vanilla-demo/public/textures/earth`.

## React

```tsx
import { Globe } from '@your-globe/react';

<Globe
  kind="outline"
  theme="outline-dark"
  markers={[{ id: '1', position: [52.23, 21.01] }]}
  atmosphere={{ enabled: true }}
  autoRotate={{ enabled: true }}
  onMarkerClick={({ marker }) => console.log(marker)}
/>
```

## Angular

> The Angular and Vue wrappers currently expose a subset of the core config (`mode`,
> `countries`, `markers`, `atmosphere`, `autoRotate`, `performance`, `initialPosition`,
> zoom limits). `kind`, `theme`, `cinematic`, `postprocessing`, data layers and the Story
> API are available through the core API and the React wrapper (which forwards the whole
> `GlobeConfig`) until the other wrappers catch up.

```ts
import { GlobeComponent } from '@your-globe/angular';

@Component({
  imports: [GlobeComponent],
  template: `
    <ng-globe
      [countries]="{ resolution: 'medium' }"
      [markers]="markers"
      [atmosphere]="{ enabled: true }"
      [autoRotate]="{ enabled: true }"
      (markerClick)="onMarkerClick($event)"
    />
  `,
})
export class AppComponent {}
```

## Vue

```vue
<script setup lang="ts">
import { VueGlobe } from '@your-globe/vue';
</script>

<template>
  <VueGlobe
    :countries="{ resolution: 'medium' }"
    :markers="[{ id: '1', position: [52.23, 21.01] }]"
    :atmosphere="{ enabled: true }"
    :auto-rotate="{ enabled: true }"
    @marker-click="({ marker }) => console.log(marker)"
  />
</template>
```
