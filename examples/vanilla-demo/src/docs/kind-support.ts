import type { MatrixFeature } from '@/components/docs';

/** Actual mounted layers and registered data decorators, not only declared layer classes. */
export const KIND_LAYER_SUPPORT: ReadonlyArray<MatrixFeature> = [
  { label: 'Country borders', support: { outline: true, paper: true, cinematic: true, hologram: true }, note: 'Dotted uses dot hover/active feedback; Wireframe has no base country borders.' },
  { label: 'Country fills (countries.fill)', support: { outline: true, dotted: true, cinematic: true }, note: 'Paper has a separate paper.fill layer; Wireframe and Hologram do not mount the shared fill.' },
  { label: 'Country hover and focusOnCountry', support: { outline: true, dotted: true, hologram: true, paper: true, cinematic: true }, note: 'Wireframe does not build country picking; use flyTo for camera movement.' },
  { label: 'Active country', support: { outline: true, dotted: true, wireframe: true, hologram: true, paper: true, cinematic: true }, note: 'Wireframe marks the active country with a geodesic ring.' },
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
