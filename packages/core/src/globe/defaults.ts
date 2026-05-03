import { PRESET_DEFAULT_KIND } from '../kinds/registry';
import type { GlobeKind } from '../kinds/types';
import type {
  CountriesConfig,
  GlobeConfig,
  PerformanceConfig,
} from '../types';

/**
 * Defaults applied when the caller doesn't provide a `performance` block.
 * `pixelRatio: 'auto'` lets the renderer pick min(devicePixelRatio, 2);
 * `adaptiveQuality: true` lets it dial that down on slow frames.
 */
export const DEFAULT_PERFORMANCE: Required<PerformanceConfig> = {
  antialias: true,
  pixelRatio: 'auto',
  maxFps: 60,
  adaptiveQuality: true,
};

/**
 * Defaults for the country interaction surface. Picking + hover are on by
 * default since most demos want them; turn off for purely-decorative globes.
 */
export const DEFAULT_COUNTRIES: Required<CountriesConfig> = {
  resolution: 'medium',
  hoverEnabled: true,
  hoverOccludeBackSide: true,
};

/**
 * Decide the active globe kind:
 * 1. explicit `config.kind` wins
 * 2. else, look up the active theme preset in `PRESET_DEFAULT_KIND`
 * 3. else, fall back to `'outline'`
 *
 * The preset name is read off `theme: 'name'` shorthand or
 * `theme: { extends: 'name' }`. Pure custom themes with no preset and no
 * explicit kind get `'outline'`.
 */
export const resolveActiveKind = (config: GlobeConfig): GlobeKind => {
  if (config.kind) return config.kind;
  const theme = config.theme;
  let presetName: string | undefined;
  if (typeof theme === 'string') presetName = theme;
  else if (theme && typeof theme === 'object' && 'extends' in theme) {
    presetName = theme.extends as string | undefined;
  }
  if (presetName && presetName in PRESET_DEFAULT_KIND) {
    return PRESET_DEFAULT_KIND[presetName as keyof typeof PRESET_DEFAULT_KIND];
  }
  return 'outline';
};
