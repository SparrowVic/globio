import type { GlobeKind, ThemePresetName } from '@your-globe/core';

export interface KindThemeEntry {
  readonly preset: ThemePresetName;
  readonly label: string;
  readonly swatch: string;
}

/**
 * Per-kind theme presets, picked from the actual `THEME_PRESETS` shipped
 * by `@your-globe/core`. Where a kind only has one preset today, only
 * that one is listed — additional presets land here as the engine ships
 * them. Don't invent presets; the call would log a warning at runtime.
 */
export const KIND_THEMES: Readonly<Record<GlobeKind, ReadonlyArray<KindThemeEntry>>> = {
  cinematic: [
    { preset: 'cinematic-night', label: 'Night', swatch: '#ffd36a' },
    { preset: 'cinematic-day', label: 'Day', swatch: '#6fb6ff' },
    { preset: 'cinematic-dawn', label: 'Dawn', swatch: '#ffb27a' },
    { preset: 'cinematic-noir', label: 'Noir', swatch: '#dfe6ee' },
  ],
  outline: [
    { preset: 'outline-dark', label: 'Dark', swatch: '#3b4252' },
    { preset: 'outline-cyber', label: 'Cyber', swatch: '#22d3ee' },
    { preset: 'outline-sunset', label: 'Sunset', swatch: '#fbbf24' },
    { preset: 'outline-light', label: 'Light', swatch: '#e2e8f0' },
    { preset: 'outline-monochrome', label: 'Mono', swatch: '#94a3b8' },
  ],
  dotted: [{ preset: 'dotted-dark', label: 'Dark', swatch: '#67e8f9' }],
  wireframe: [{ preset: 'wireframe-tron', label: 'Tron', swatch: '#a78bfa' }],
  hologram: [{ preset: 'hologram-cyan', label: 'Cyan', swatch: '#22d3ee' }],
  paper: [{ preset: 'paper-default', label: 'Atlas', swatch: '#f2c15b' }],
};

/**
 * Universal accent color per kind — drives the hero theme-bleed CSS
 * variable, personality row tints, layer-card swatches, etc. Independent
 * of the active theme preset (a Cyber outline still belongs to the
 * outline family chromatically).
 */
export const KIND_ACCENT: Readonly<Record<GlobeKind, string>> = {
  cinematic: '#ffd36a',
  outline: '#fbbf24',
  dotted: '#67e8f9',
  wireframe: '#a78bfa',
  hologram: '#22d3ee',
  paper: '#f2c15b',
};
