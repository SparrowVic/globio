import type { GlobeKind, ThemePresetName } from '@your-globe/core';

export interface KindThemeEntry {
  readonly preset: ThemePresetName;
  readonly label: string;
  readonly swatch: string;
}

/**
 * Per-kind theme presets, mirrored from `THEME_PRESETS` in `@your-globe/core`.
 * Swatches are the preset's dominant accent, picked by eye so the row of dots
 * reads as the palette it switches to.
 */
export const KIND_THEMES: Readonly<Record<GlobeKind, ReadonlyArray<KindThemeEntry>>> = {
  cinematic: [
    { preset: 'cinematic-night', label: 'Night', swatch: '#f6b44d' },
    { preset: 'cinematic-day', label: 'Day', swatch: '#6fb6ff' },
    { preset: 'cinematic-dawn', label: 'Dawn', swatch: '#ff9d6a' },
    { preset: 'cinematic-noir', label: 'Noir', swatch: '#dfe6ee' },
  ],
  outline: [
    { preset: 'outline-dark', label: 'Dark', swatch: '#5b6b85' },
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

export const defaultThemeFor = (kind: GlobeKind): ThemePresetName => {
  const first = KIND_THEMES[kind][0];
  if (!first) throw new Error(`No theme registered for kind ${kind}`);
  return first.preset;
};
