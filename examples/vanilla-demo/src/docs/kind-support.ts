import type { MatrixFeature } from '@/components/docs';

/**
 * Which layers and data layers each kind renders. Layers: every kind
 * registers the shared layer classes (fill, labels, markers, arcs,
 * atmosphere, starfield, selection, focus pulse); the crosshair and the
 * border linework are the exceptions. Data layers: taken from the
 * `decorations` each kind module registers.
 */
export const KIND_LAYER_SUPPORT: ReadonlyArray<MatrixFeature> = [
  { label: 'Country borders', support: { outline: true, paper: true, cinematic: true, hologram: true, dotted: 'partial' }, note: 'Dotted stands in for borders with its dot field; Wireframe draws no countries.' },
  { label: 'Country fills and choropleth', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true } },
  { label: 'Hover and active states', support: { outline: true, dotted: true, wireframe: 'partial', hologram: true, paper: true, cinematic: true }, note: 'Wireframe marks the active country with a geodesic ring.' },
  { label: 'Country labels', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true } },
  { label: 'Markers and HTML markers', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true } },
  { label: 'Arcs', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true } },
  { label: 'Atmosphere and starfield', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true } },
  { label: 'Lat/lng crosshair', support: { outline: true, dotted: true, hologram: true, paper: true, cinematic: true } },
  { label: 'Focus pulse', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true } },
  { label: 'Post-processing', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true }, note: 'On by default for Cinematic only.' },
];

export const KIND_DATA_LAYER_SUPPORT: ReadonlyArray<MatrixFeature> = [
  { label: 'choropleth', support: { outline: true, dotted: true, cinematic: true } },
  { label: 'bars', support: { outline: true, dotted: true } },
  { label: 'extruded', support: { outline: true, dotted: true } },
  { label: 'heatmap', support: { outline: true, dotted: true, cinematic: true } },
  { label: 'hexbin', support: { outline: true } },
  { label: 'charts', support: { outline: true } },
];
