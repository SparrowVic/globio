# Interactive Globe Library

Interactive 3D globe library for Angular, React and Vue, built on Three.js.

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
pnpm dev
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
  countries: { resolution: 'medium', style: 'borders' },
  markers: [{ id: '1', position: [52.23, 21.01], label: 'Warsaw' }],
  atmosphere: { enabled: true },
  autoRotate: { enabled: true, speed: 0.5 },
  performance: { adaptiveQuality: true },
});

globe.on('markerClick', ({ marker }) => console.log(marker));
globe.mount();
```

## React

```tsx
import { Globe } from '@your-globe/react';

<Globe
  countries={{ style: 'borders' }}
  markers={[{ id: '1', position: [52.23, 21.01] }]}
  atmosphere={{ enabled: true }}
  autoRotate={{ enabled: true }}
  onMarkerClick={({ marker }) => console.log(marker)}
/>
```

## Angular

```ts
import { GlobeComponent } from '@your-globe/angular';

@Component({
  imports: [GlobeComponent],
  template: `
    <ng-globe
      [countries]="{ style: 'borders' }"
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
    :countries="{ style: 'borders' }"
    :markers="[{ id: '1', position: [52.23, 21.01] }]"
    :atmosphere="{ enabled: true }"
    :auto-rotate="{ enabled: true }"
    @marker-click="({ marker }) => console.log(marker)"
  />
</template>
```
