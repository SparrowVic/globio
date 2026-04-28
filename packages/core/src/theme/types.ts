import type { ThemePresetName } from './presets';

/**
 * Token keys are dot-namespaced for grouping. v0.2 ships the minimum set
 * needed to retrofit the existing outline renderer.
 */
export type TokenKey =
  | 'background.color'
  | 'globe.surfaceColor'
  | 'globe.surfaceTextureUrl'
  | 'countries.border.color'
  | 'countries.border.width'
  | 'countries.border.opacity'
  | 'countries.borderHover.color'
  | 'countries.borderHover.width'
  | 'countries.borderHover.opacity'
  | 'countries.borderActive.color'
  | 'countries.borderActive.width'
  | 'countries.borderActive.opacity'
  | 'tooltip.backgroundColor'
  | 'tooltip.textColor'
  | 'tooltip.fontSize'
  | 'tooltip.fontFamily'
  | 'tooltip.padding'
  | 'tooltip.borderRadius'
  | 'lights.ambient.color'
  | 'lights.ambient.intensity'
  | 'lights.directional.color'
  | 'lights.directional.intensity'
  | 'markers.defaultColor'
  | 'atmosphere.color'
  | 'atmosphere.intensity';

/**
 * All tokens are either a string (color hex/rgb or texture URL) or a number.
 * Texture token uses '' to mean "no texture" — keeps the type simple.
 */
export interface TokenSet {
  readonly 'background.color': string;
  readonly 'globe.surfaceColor': string;
  readonly 'globe.surfaceTextureUrl': string;
  readonly 'countries.border.color': string;
  readonly 'countries.border.width': number;
  readonly 'countries.border.opacity': number;
  readonly 'countries.borderHover.color': string;
  readonly 'countries.borderHover.width': number;
  readonly 'countries.borderHover.opacity': number;
  readonly 'countries.borderActive.color': string;
  readonly 'countries.borderActive.width': number;
  readonly 'countries.borderActive.opacity': number;
  readonly 'tooltip.backgroundColor': string;
  readonly 'tooltip.textColor': string;
  readonly 'tooltip.fontSize': number;
  readonly 'tooltip.fontFamily': string;
  readonly 'tooltip.padding': string;
  readonly 'tooltip.borderRadius': string;
  readonly 'lights.ambient.color': string;
  readonly 'lights.ambient.intensity': number;
  readonly 'lights.directional.color': string;
  readonly 'lights.directional.intensity': number;
  readonly 'markers.defaultColor': string;
  readonly 'atmosphere.color': string;
  readonly 'atmosphere.intensity': number;
}

export type PartialTokenSet = Partial<TokenSet>;

/**
 * User-supplied theme config. `extends` selects a built-in preset (autocompletes)
 * OR a custom preset registered via `registerThemePreset()`; `tokens` overrides
 * individual values on top of that floor.
 */
export interface ThemeConfig {
  readonly extends?: ThemePresetName | (string & {});
  readonly tokens?: PartialTokenSet;
}

/** Output of `resolveTheme()` — every key present, deeply readonly. */
export type ResolvedTokens = TokenSet;

/**
 * Public theme entry point. Accepts either a preset name (shorthand) — built-in
 * or custom — or a full ThemeConfig object.
 */
export type ThemeInput = ThemePresetName | (string & {}) | ThemeConfig;
