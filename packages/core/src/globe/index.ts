// Public entry point for the globe runtime. The `createGlobe` factory
// itself lives in `create-globe.ts`; helper modules (defaults, framing,
// data-layer diff, focus-distance, internal-state) sit alongside so the
// orchestration body stays scannable.

export { createGlobe } from './create-globe';
