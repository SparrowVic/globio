import type { PartialTokenSet } from './types';

/**
 * Names of built-in theme presets.
 *
 * Naming convention: `<kind>-<flavour>`. The `<kind>` prefix maps to the
 * default globe kind via `kinds/registry.ts → PRESET_DEFAULT_KIND`, so a
 * user picking `'dotted-dark'` gets the dotted kind automatically.
 */
export type ThemePresetName =
  | 'outline-dark'
  | 'outline-light'
  | 'outline-sunset'
  | 'outline-cyber'
  | 'outline-monochrome'
  | 'dotted-dark'
  | 'wireframe-tron';

/**
 * Built-in theme presets — each is a `Partial<TokenSet>` that only declares
 * the tokens that matter for that preset's identity. `resolveTheme()` merges
 * the partial over `DEFAULT_TOKENS` so callers always see a complete token
 * set.
 *
 * `outline-dark` matches the defaults verbatim, so it stays empty — the kind
 * dispatcher still picks `outline` for it via `PRESET_DEFAULT_KIND` and the
 * defaults supply the look. Other presets only override what differs.
 */
export const THEME_PRESETS: Readonly<Record<ThemePresetName, PartialTokenSet>> = Object.freeze({
  'outline-dark': Object.freeze({}),

  'outline-light': Object.freeze({
    'background.color': '#f0f4f8',
    'globe.surfaceColor': '#dde7f0',
    'countries.border.color': '#3870b0',
    'countries.border.opacity': 0.9,
    'countries.borderHover.color': '#1a4880',
    'countries.borderActive.color': '#000000',
    'countries.fill.defaultColor': '#a8c4d8',
    'countries.fill.opacity': 0.5,
    'countries.dotted.color': '#3870b0',
    'countries.dotted.opacity': 0.9,
    'countries.label.color': '#1a1a1a',
    'countries.label.textShadow': '0 0 4px rgba(255, 255, 255, 0.6)',
    'tooltip.backgroundColor': 'rgba(245, 248, 252, 0.95)',
    'tooltip.textColor': '#1a4880',
    'lights.ambient.intensity': 0.7,
    'lights.directional.intensity': 0.9,
    'markers.defaultColor': '#d9534f',
    'atmosphere.color': '#a8c8e8',
    'atmosphere.intensity': 0.8,
    'starfield.color': '#88a0c0',
    'starfield.density': 600,
    'starfield.size': 1.0,
    'arcs.color': '#1a4880',
    'arcs.headColor': '#d9534f',
    'wireframe.color': '#3870b0',
  }),

  'outline-sunset': Object.freeze({
    'background.color': '#1a0820',
    'globe.surfaceColor': '#3a1530',
    'countries.border.color': '#ffb070',
    'countries.borderHover.color': '#ffd166',
    'countries.borderActive.color': '#ffffff',
    'countries.fill.defaultColor': '#5a2a4f',
    'countries.fill.opacity': 0.4,
    'countries.dotted.color': '#ffd166',
    'tooltip.backgroundColor': 'rgba(40, 20, 30, 0.9)',
    'tooltip.textColor': '#ffd166',
    'markers.defaultColor': '#ff5a5a',
    'atmosphere.color': '#ff8866',
    'atmosphere.intensity': 1.4,
    'starfield.color': '#ffd9aa',
    'starfield.density': 1800,
    'starfield.size': 1.2,
    'arcs.color': '#ffd166',
    'arcs.headColor': '#ff5a5a',
    'wireframe.color': '#ffb070',
  }),

  'outline-cyber': Object.freeze({
    'background.color': '#000010',
    'globe.surfaceColor': '#001a2a',
    'countries.border.color': '#00f0ff',
    'countries.border.width': 1.5,
    'countries.borderHover.color': '#ff00ff',
    'countries.borderHover.width': 2.5,
    'countries.borderActive.color': '#22ee99',
    'countries.fill.defaultColor': '#001a2a',
    'countries.fill.opacity': 0.5,
    'countries.dotted.color': '#22ee99',
    'countries.dotted.opacity': 1,
    'tooltip.backgroundColor': 'rgba(0, 30, 30, 0.95)',
    'tooltip.textColor': '#22ee99',
    'tooltip.borderRadius': '2px',
    'lights.ambient.intensity': 0.4,
    'lights.directional.intensity': 0.6,
    'markers.defaultColor': '#22ee99',
    'atmosphere.color': '#00f0ff',
    'atmosphere.intensity': 1.6,
    'starfield.color': '#00f0ff',
    'starfield.density': 2000,
    'starfield.size': 1.6,
    'arcs.color': '#ff00ff',
    'arcs.headColor': '#22ee99',
    'wireframe.color': '#00f0ff',
  }),

  'outline-monochrome': Object.freeze({
    'background.color': '#0a0a0a',
    'globe.surfaceColor': '#1a1a1a',
    'countries.border.color': '#cccccc',
    'countries.borderHover.color': '#ffffff',
    'countries.borderHover.width': 2.5,
    'countries.borderActive.color': '#ffaa00',
    'countries.fill.defaultColor': '#2a2a2a',
    'countries.dotted.color': '#ffffff',
    'countries.dotted.opacity': 0.9,
    'tooltip.backgroundColor': 'rgba(20, 20, 20, 0.9)',
    'tooltip.textColor': '#ffffff',
    'markers.defaultColor': '#ffffff',
    'atmosphere.color': '#888888',
    'atmosphere.intensity': 0.9,
    'starfield.color': '#cccccc',
    'arcs.color': '#ffffff',
    'arcs.headColor': '#ffaa00',
    'wireframe.color': '#cccccc',
  }),

  // Dotted kind — black sphere, glowing cyan dots fill each country.
  'dotted-dark': Object.freeze({
    'background.color': '#000000',
    'globe.surfaceColor': '#000000',
    'countries.border.opacity': 0,
    'countries.fill.defaultColor': '#0a1a2a',
    'countries.fill.opacity': 0.3,
    'countries.dotted.color': '#7fdfff',
    'countries.dotted.size': 0.009,
    'countries.dotted.density': 1.5,
    'countries.dotted.opacity': 0.95,
    'countries.borderHover.color': '#7fdfff',
    'countries.borderActive.color': '#ffffff',
    'tooltip.backgroundColor': 'rgba(0, 8, 16, 0.92)',
    'tooltip.textColor': '#7fdfff',
    'lights.ambient.intensity': 0.4,
    'markers.defaultColor': '#7fdfff',
    'atmosphere.color': '#4a9eff',
    'atmosphere.intensity': 1.6,
    'starfield.color': '#ffffff',
    'starfield.density': 2200,
    'starfield.size': 1.0,
    'arcs.color': '#7fdfff',
    'arcs.headColor': '#ffffff',
  }),

  // Wireframe kind — pure lat/lng grid on black, no countries.
  'wireframe-tron': Object.freeze({
    'background.color': '#000000',
    'globe.surfaceColor': '#000000',
    'countries.border.opacity': 0,
    'countries.fill.opacity': 0,
    'countries.dotted.opacity': 0,
    'countries.borderHover.color': '#22d3ee',
    'countries.borderActive.color': '#ffffff',
    'countries.label.color': '#22d3ee',
    'countries.label.fontFamily': 'JetBrains Mono, ui-monospace, monospace',
    'countries.label.textShadow': '0 0 6px rgba(34, 211, 238, 0.8)',
    'tooltip.backgroundColor': 'rgba(0, 8, 16, 0.9)',
    'tooltip.textColor': '#22d3ee',
    'tooltip.fontFamily': 'JetBrains Mono, ui-monospace, monospace',
    'tooltip.borderRadius': '2px',
    'legend.backgroundColor': 'rgba(0, 8, 16, 0.9)',
    'legend.textColor': '#22d3ee',
    'legend.titleColor': '#ffffff',
    'legend.fontFamily': 'JetBrains Mono, ui-monospace, monospace',
    'legend.borderRadius': '2px',
    'lights.ambient.color': '#22d3ee',
    'lights.ambient.intensity': 0.5,
    'lights.directional.intensity': 0.4,
    'markers.defaultColor': '#22d3ee',
    'atmosphere.color': '#22d3ee',
    'atmosphere.intensity': 1.4,
    'starfield.color': '#22d3ee',
    'starfield.density': 1200,
    'starfield.size': 1.0,
    'arcs.color': '#22d3ee',
    'wireframe.color': '#22d3ee',
    'wireframe.opacity': 0.7,
    'wireframe.density': 1.2,
    'wireframe.pulse': 0.15,
  }),
});
