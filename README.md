# GlobioJS

Interactive 3D globe library for Angular, React and Vue, built on Three.js — six visual
kinds, nine canonical layers, data layers, a story engine and a shared HDR post-processing
pipeline. Supported runtime settings update in place; construction settings require a new instance.

## Architecture

This is a monorepo with one framework-agnostic core and three thin framework wrappers.

```
packages/
├── core/        @globiojs/core      vanilla TS, Three.js renderer
├── react/       @globiojs/react     React 18+ wrapper
├── angular/     @globiojs/angular   Angular 17+ standalone component
├── vue/         @globiojs/vue       Vue 3 component
└── globiojs/    globiojs           convenient Vanilla entry point
```

## Tech stack

- **pnpm workspaces** — package manager + monorepo
- **Turborepo** — build orchestration with cache
- **Changesets** — versioning + automated npm publishing
- **tsup** — core, React, Vue and Vanilla alias; **ng-packagr** — Angular Package Format
- **TypeScript** strict mode

## Getting started

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm test:packages
```

## Releasing

After making changes:

```bash
pnpm changeset
```

Describe the change and select the version bump. The version workflow prepares a release PR. Publishing is a separate manual workflow after review, using npm trusted publishing. See [the release guide](docs/RELEASING.md) for first-publication setup and the exact process.

The public website, Studio and documentation live in [SparrowVic/globiojs-site](https://github.com/SparrowVic/globiojs-site). This library workspace installs and runs without Font Awesome credentials.

## Core API

```ts
import { createGlobe } from '@globiojs/core';

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

// Supported cinematic settings update live:
globe.update({ cinematic: { sun: { mode: 'orbit', speed: 6 } } });

// Keep a globe warm without spending frames on it (e.g. behind a cross-fade):
globe.setPaused(true);
```

Every globe on a page shares one animation-frame loop; globes that scroll out of view or
sit in a hidden tab pause automatically when `performance.pauseWhenHidden` is enabled (the default).
Building geometry and allocating rendering resources can block the main thread; the engine records User
Timing measures (`globiojs:construct`, `globiojs:countries-load`, `globiojs:kind-build`,
`globiojs:shader-compile`, `globiojs:mount-to-ready`) so you
can see it in DevTools or read it with `performance.getEntriesByType('measure')`.

## Kinds

Six visual personalities share one engine and the same nine canonical layers
(labels, focus pulse, starfield, selection, country fill, arcs, markers,
atmosphere, crosshair): `cinematic`, `outline`, `dotted`, `wireframe`, `paper`,
`hologram`. The crosshair is available on all except Wireframe; its shared settings
remain under `outline.hoverCrosshair`. Story playback works on every kind; Wireframe
requires flyTo scenes because it does not build country picking or country focus.

Data layers have a single slot and the following rendering support:

| Data layer | Outline | Dotted | Cinematic | Wireframe / Paper / Hologram |
|---|:---:|:---:|:---:|:---:|
| Choropleth (`setCountryData` included) | Yes | Yes | Yes | No |
| Bars / extruded countries | Yes | Yes | No | No |
| Heatmap | Yes | Yes | Yes | No |
| Hexbin / charts | Yes | No | No | No |

Unsupported layers log a warning and do not render. `countries.fill` is available on Outline, Dotted and Cinematic. Paper uses its own
`paper.fill` controls; Wireframe and Hologram do not mount country fills. See `FEATURES.md` for the catalog and [the documentation](https://globiojs.dev/docs)
for working examples, reference tables and Studio guidance.

Kind, theme, country resolution, framing, camera limits and renderer options are
chosen when the instance is created. `update()` accepts their types but does not
recreate these resources. Destroy and recreate the globe to change them; remount
framework components when changing construction settings.

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
them; the [website repository](https://github.com/SparrowVic/globiojs-site) ships a 2k set under `public/textures/earth`.

## React

```tsx
import { Globe } from '@globiojs/react';

<Globe
  kind="outline"
  theme="outline-dark"
  markers={[{ id: '1', position: [52.23, 21.01] }]}
  atmosphere={{ enabled: true }}
  autoRotate={{ enabled: true }}
  onMarkerClick={({ marker }) => console.log(marker)}
/>
```

All three wrappers forward every `GlobeConfig` key (the list lives in
`GLOBE_CONFIG_KEYS`, exported from the core) and expose every globe event. Anything
imperative — `flyTo`, `focusOnCountry`, `setStory`, `showLegend`, data layers — goes
through the instance: `ref.current.getInstance()` in React, `getInstance()` on the
component ref in Vue and on the `GlobeComponent` in Angular.

## Angular

```ts
import { Component } from '@angular/core';
import { GlobeComponent } from '@globiojs/angular';
import type { MarkerConfig, MarkerEvent } from '@globiojs/core';

@Component({
  standalone: true,
  imports: [GlobeComponent],
  template: `
    <ng-globe
      kind="outline"
      theme="outline-dark"
      [countries]="{ resolution: 'medium' }"
      [markers]="markers"
      [atmosphere]="{ enabled: true }"
      [autoRotate]="{ enabled: true }"
      (markerClick)="onMarkerClick($event)"
    />
  `,
})
export class AppComponent {
  markers: ReadonlyArray<MarkerConfig> = [{ id: 'waw', position: [52.23, 21.01], label: 'Warsaw' }];
  onMarkerClick(event: MarkerEvent) { console.log(event.marker); }
}
```

## Vue

```vue
<script setup lang="ts">
import { VueGlobe } from '@globiojs/vue';
</script>

<template>
  <VueGlobe
    kind="outline"
    theme="outline-dark"
    :countries="{ resolution: 'medium' }"
    :markers="[{ id: '1', position: [52.23, 21.01] }]"
    :atmosphere="{ enabled: true }"
    :auto-rotate="{ enabled: true }"
    @marker-click="({ marker }) => console.log(marker)"
  />
</template>
```

## Documentation checks

```bash
pnpm docs:extract
pnpm docs:check
```

The versioned API manifest is published as `@globiojs/core/docs/api.json`, including config keys, event contracts, wrapper surfaces and supported data layers. Regenerate it whenever the public API changes. The website consumes this manifest from its installed core version and checks its examples against real package declarations.

## License

MIT © Wiktor Wróbel.
