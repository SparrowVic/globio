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
  'countries.hoverOpacity': 1,
  'countries.activeColor': '#ffffff',
  'countries.activeWidth': 3,
  'countries.activeOpacity': 1,
  'tooltip.background': 'rgba(10, 14, 30, 0.85)',
  'tooltip.textColor': '#ffd700',
  'tooltip.fontSize': 12,
  'tooltip.fontFamily': 'system-ui, sans-serif',
  'tooltip.padding': '4px 8px',
  'tooltip.borderRadius': '4px',
  'lights.ambient.color': '#ffffff',
  'lights.ambient.intensity': 0.6,
  'lights.directional.color': '#ffffff',
  'lights.directional.intensity': 0.8,
  'markers.defaultColor': '#ff4444',
  'atmosphere.color': '#4a9eff',
  'atmosphere.intensity': 1.2,
});
