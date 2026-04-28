import type { TokenSet } from './types';

/**
 * Built-in default tokens. Used as the merge floor by `resolveTheme()`.
 * Values mirror the original hardcoded defaults from globe.ts.
 */
export const DEFAULT_TOKENS: TokenSet = Object.freeze({
  'background.color': '#000010',
  'globe.surface': '#0b1d3a',
  'globe.surfaceTexture': '',
  'borders.color': '#4a9eff',
  'borders.width': 1,
  'borders.opacity': 0.85,
  'countries.hoverColor': '#ffd700',
  'countries.hoverWidth': 2,
  'markers.defaultColor': '#ff4444',
  'atmosphere.color': '#4a9eff',
  'atmosphere.intensity': 1.2,
});
