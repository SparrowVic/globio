import type { TokenSet } from './types';

/**
 * Names of built-in theme presets. v0.2.x ships 5 outline-style presets;
 * future plans will add presets for dotted, paper, hologram etc.
 */
export type ThemePresetName =
  | 'outline-dark'
  | 'outline-light'
  | 'outline-sunset'
  | 'outline-cyber'
  | 'outline-monochrome';

/**
 * Frozen registry of built-in presets. Each preset is a complete TokenSet —
 * `resolveTheme()` uses it as the merge floor when `extends` is set.
 */
export const THEME_PRESETS: Readonly<Record<ThemePresetName, TokenSet>> = Object.freeze({
  'outline-dark': Object.freeze({
    'background.color': '#000010',
    'globe.surface': '#0b1d3a',
    'globe.surfaceTexture': '',
    'borders.color': '#4a9eff',
    'borders.width': 1,
    'borders.opacity': 0.85,
    'markers.defaultColor': '#ff4444',
    'atmosphere.color': '#4a9eff',
    'atmosphere.intensity': 1.2,
  }),
  'outline-light': Object.freeze({
    'background.color': '#f0f4f8',
    'globe.surface': '#dde7f0',
    'globe.surfaceTexture': '',
    'borders.color': '#3870b0',
    'borders.width': 1,
    'borders.opacity': 0.9,
    'markers.defaultColor': '#d9534f',
    'atmosphere.color': '#a8c8e8',
    'atmosphere.intensity': 0.8,
  }),
  'outline-sunset': Object.freeze({
    'background.color': '#180a1a',
    'globe.surface': '#3a1f3f',
    'globe.surfaceTexture': '',
    'borders.color': '#ffb070',
    'borders.width': 1,
    'borders.opacity': 0.85,
    'markers.defaultColor': '#ffd166',
    'atmosphere.color': '#ff7e5f',
    'atmosphere.intensity': 1.6,
  }),
  'outline-cyber': Object.freeze({
    'background.color': '#000814',
    'globe.surface': '#0a0a14',
    'globe.surfaceTexture': '',
    'borders.color': '#00f0ff',
    'borders.width': 1,
    'borders.opacity': 1,
    'markers.defaultColor': '#22ee99',
    'atmosphere.color': '#ff2bd6',
    'atmosphere.intensity': 1.4,
  }),
  'outline-monochrome': Object.freeze({
    'background.color': '#0a0a0a',
    'globe.surface': '#1a1a1a',
    'globe.surfaceTexture': '',
    'borders.color': '#cccccc',
    'borders.width': 1,
    'borders.opacity': 0.85,
    'markers.defaultColor': '#ffffff',
    'atmosphere.color': '#888888',
    'atmosphere.intensity': 0.9,
  }),
});
