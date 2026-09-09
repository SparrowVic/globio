# @globiojs/core

Framework-independent TypeScript engine for interactive 3D globes. It provides six visual kinds, markers, arcs, country interaction, data layers, stories, themes, and a shared WebGL render loop.

## Installation

```bash
npm install @globiojs/core three
```

## Usage

```ts
import { createGlobe } from '@globiojs/core';

const globe = createGlobe({
  container: document.querySelector('#globe')!,
  kind: 'cinematic',
  theme: 'cinematic-night',
  markers: [
    { id: 'warsaw', position: [52.23, 21.01], label: 'Warsaw' },
  ],
});

globe.on('markerClick', ({ marker }) => {
  console.log(marker.id);
});

globe.mount();

// Release the renderer, listeners, and WebGL resources when you are done.
globe.destroy();
```

`@globiojs/core` is the package to use with Vanilla JavaScript or TypeScript. Framework integrations are available as `@globiojs/react`, `@globiojs/vue`, and `@globiojs/angular`.

See the [GlobioJS repository](https://github.com/SparrowVic/globiojs) for the complete API guide, live demo, Studio, and examples.
