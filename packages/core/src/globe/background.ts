import type { GlobeConfig, GlobeImageExportOptions } from '../types';

/** Maximum supported fade width: at 0.5 the backdrop reaches full opacity at the centre. */
export const MAX_BACKGROUND_EDGE_FADE = 0.5;

/** Resolve the live canvas fill, including the legacy `transparent` alias. */
export const resolveCanvasBackground = (
  config: Pick<GlobeConfig, 'background' | 'transparent'>,
  themeColor: string,
): string | null => {
  const canvas = config.background?.canvas;
  if (canvas === 'transparent') return null;
  if (canvas === 'theme') return themeColor;
  if (canvas !== undefined) return canvas;
  return config.transparent === true ? null : themeColor;
};

/** Clamp config and export inputs so shader `smoothstep` always receives a valid width. */
export const resolveBackgroundEdgeFade = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.min(MAX_BACKGROUND_EDGE_FADE, Math.max(0, value));
};

/** Resolve an export-only fill. `undefined` and `'current'` retain the live canvas. */
export const resolveExportBackground = (
  value: GlobeImageExportOptions['background'],
  themeColor: string,
): string | null | undefined => {
  if (value === undefined || value === 'current') return undefined;
  if (value === 'transparent') return null;
  if (value === 'theme') return themeColor;
  return value;
};
