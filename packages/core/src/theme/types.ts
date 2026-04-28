import type { ThemePresetName } from './presets';

/**
 * Token keys are dot-namespaced for grouping. v0.2 ships the minimum set
 * needed to retrofit the existing outline renderer.
 */
export type TokenKey =
  | 'background.color'
  | 'globe.surface'
  | 'globe.surfaceTexture'
  | 'borders.color'
  | 'borders.width'
  | 'borders.opacity'
  | 'countries.hoverColor'
  | 'countries.hoverWidth'
  | 'countries.activeColor'
  | 'countries.activeWidth'
  | 'tooltip.background'
  | 'tooltip.textColor'
  | 'markers.defaultColor'
  | 'atmosphere.color'
  | 'atmosphere.intensity';

/**
 * All tokens are either a string (color hex/rgb or texture URL) or a number.
 * Texture token uses '' to mean "no texture" — keeps the type simple.
 */
export interface TokenSet {
  readonly 'background.color': string;
  readonly 'globe.surface': string;
  readonly 'globe.surfaceTexture': string;
  readonly 'borders.color': string;
  readonly 'borders.width': number;
  readonly 'borders.opacity': number;
  readonly 'countries.hoverColor': string;
  readonly 'countries.hoverWidth': number;
  readonly 'countries.activeColor': string;
  readonly 'countries.activeWidth': number;
  readonly 'tooltip.background': string;
  readonly 'tooltip.textColor': string;
  readonly 'markers.defaultColor': string;
  readonly 'atmosphere.color': string;
  readonly 'atmosphere.intensity': number;
}

export type PartialTokenSet = Partial<TokenSet>;

/**
 * User-supplied theme config. `extends` selects a built-in preset as the
 * merge floor; `tokens` overrides individual values on top of that floor.
 */
export interface ThemeConfig {
  readonly extends?: ThemePresetName;
  readonly tokens?: PartialTokenSet;
}

/** Output of `resolveTheme()` — every key present, deeply readonly. */
export type ResolvedTokens = TokenSet;

/**
 * Public theme entry point. Accepts either a preset name (shorthand)
 * or a full ThemeConfig object.
 */
export type ThemeInput = ThemePresetName | ThemeConfig;
