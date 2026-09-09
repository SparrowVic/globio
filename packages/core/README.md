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

// Blend the canvas into a page while keeping the globe's atmosphere/glow.
globe.update({
  background: { canvas: 'transparent', edgeFade: 0.18 },
  starfield: { enabled: false },
});

// Export an alpha PNG without changing the live preview. The starfield,
// cinematic Milky Way, and dotted constellation lines are omitted only from
// this frame; the atmosphere and other globe layers remain visible.
const transparentPng = await globe.toImage({
  width: 1200,
  height: 1200,
  background: 'transparent',
  includeBackdrop: false,
});

// Release the renderer, listeners, and WebGL resources when you are done.
globe.destroy();
```

`background.canvas` accepts `'theme'`, `'transparent'`, or a CSS colour.
Canvas fill is independent from `starfield`: disabling the starfield removes
all celestial backdrop content, including the cinematic Milky Way, while the
globe's atmosphere and glow remain. The older `transparent` boolean continues
to work as an alias for `background.canvas: 'transparent'`.

`@globiojs/core` is the package to use with Vanilla JavaScript or TypeScript. Framework integrations are available as `@globiojs/react`, `@globiojs/vue`, and `@globiojs/angular`.

See the [GlobioJS repository](https://github.com/SparrowVic/globiojs) for the complete API guide, live demo, Studio, and examples.
