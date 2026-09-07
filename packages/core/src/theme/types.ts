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
  | 'countries.borderHover.glowColor'
  | 'countries.borderHover.glowWidth'
  | 'countries.borderHover.glowOpacity'
  | 'countries.borderActive.color'
  | 'countries.borderActive.width'
  | 'countries.borderActive.opacity'
  | 'countries.fill.defaultColor'
  | 'countries.fill.opacity'
  | 'countries.dotted.color'
  | 'countries.dotted.size'
  | 'countries.dotted.density'
  | 'countries.dotted.opacity'
  | 'countries.dotted.rippleBoost'
  | 'countries.dotted.rippleSpeed'
  | 'countries.dotted.rippleWidth'
  | 'countries.dotted.flashColor'
  | 'countries.dotted.flashStrength'
  | 'countries.dotted.flashDecay'
  | 'countries.dotted.driftAmplitude'
  | 'countries.dotted.driftSpeed'
  | 'countries.dotted.driftFreq'
  | 'countries.dotted.driftAxis'
  | 'countries.dotted.hoverScale'
  | 'countries.dotted.hoverBrightnessBoost'
  | 'countries.dotted.hoverDuration'
  | 'countries.label.color'
  | 'countries.label.fontSize'
  | 'countries.label.fontFamily'
  | 'countries.label.fontWeight'
  | 'countries.label.textShadow'
  | 'tooltip.backgroundColor'
  | 'tooltip.textColor'
  | 'tooltip.fontSize'
  | 'tooltip.fontFamily'
  | 'tooltip.padding'
  | 'tooltip.borderRadius'
  | 'legend.backgroundColor'
  | 'legend.textColor'
  | 'legend.titleColor'
  | 'legend.fontSize'
  | 'legend.fontFamily'
  | 'legend.padding'
  | 'legend.borderRadius'
  | 'lights.ambient.color'
  | 'lights.ambient.intensity'
  | 'lights.directional.color'
  | 'lights.directional.intensity'
  | 'markers.defaultColor'
  | 'atmosphere.color'
  | 'atmosphere.intensity'
  | 'starfield.color'
  | 'starfield.density'
  | 'starfield.size'
  | 'arcs.color'
  | 'arcs.width'
  | 'arcs.opacity'
  | 'arcs.headColor'
  | 'arcs.headSize'
  | 'wireframe.color'
  | 'wireframe.opacity'
  | 'wireframe.density'
  | 'wireframe.pulse'
  | 'wireframe.pulseColor'
  | 'wireframe.pulseSpeed'
  | 'wireframe.pulseWidth'
  | 'wireframe.pulseBoost'
  | 'wireframe.equatorColor'
  | 'wireframe.equatorOpacity'
  | 'wireframe.emphasisEnabled'
  | 'wireframe.glitchEnabled'
  | 'wireframe.glitchIntervalMin'
  | 'wireframe.glitchIntervalMax'
  | 'wireframe.activeRingColor'
  | 'wireframe.activeRingOpacity'
  | 'wireframe.activeRingThickness'
  | 'wireframe.activeRingRotationSpeed'
  | 'wireframe.activeRingPadding'
  | 'wireframe.streamColor'
  | 'wireframe.streamCount'
  | 'wireframe.streamSize'
  | 'wireframe.streamSpeed'
  | 'wireframe.streamOpacity'
  | 'paper.surfaceColor'
  | 'paper.surfaceNoiseAmount'
  | 'paper.borderColor'
  | 'paper.borderOpacity'
  | 'paper.borderRoughness'
  | 'paper.fillColor'
  | 'paper.fillOpacity'
  | 'paper.gridColor'
  | 'paper.gridOpacity'
  | 'hologram.color'
  | 'hologram.shellOpacity'
  | 'hologram.rimGlow'
  | 'hologram.scanlineFreq'
  | 'hologram.scanlineSpeed'
  | 'hologram.borderColor'
  | 'hologram.borderIntensity'
  | 'hologram.glitchAmount'
  | 'hologram.glitchIntervalMin'
  | 'hologram.glitchIntervalMax'
  | 'hologram.outerGlowOpacity'
  | 'cinematic.oceanColor'
  | 'cinematic.landColor'
  | 'cinematic.cloudColor'
  | 'cinematic.nightColor'
  | 'cinematic.lightDirectionX'
  | 'cinematic.lightDirectionY'
  | 'cinematic.lightDirectionZ'
  | 'cinematic.terminatorSoftness'
  | 'cinematic.terminatorContrast'
  | 'cinematic.keyIntensity'
  | 'cinematic.fillIntensity'
  | 'cinematic.rimColor'
  | 'cinematic.rimIntensity'
  | 'cinematic.rimPower'
  | 'cinematic.specularIntensity'
  | 'cinematic.cityLightColor'
  | 'cinematic.cityLightIntensity'
  | 'cinematic.networkColor'
  | 'cinematic.networkOpacity'
  | 'cinematic.borderColor'
  | 'cinematic.borderIntensity'
  | 'cinematic.iceColor'
  | 'cinematic.vegetationColor'
  | 'cinematic.desertColor'
  | 'cinematic.shallowWaterColor'
  | 'cinematic.auroraColor'
  | 'cinematic.auroraTopColor'
  | 'cinematic.moonColor'
  | 'cinematic.sunColor'
  | 'cinematic.saturation';

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
  readonly 'countries.borderHover.glowColor': string;
  readonly 'countries.borderHover.glowWidth': number;
  readonly 'countries.borderHover.glowOpacity': number;
  readonly 'countries.borderActive.color': string;
  readonly 'countries.borderActive.width': number;
  readonly 'countries.borderActive.opacity': number;
  readonly 'countries.fill.defaultColor': string;
  readonly 'countries.fill.opacity': number;
  readonly 'countries.dotted.color': string;
  readonly 'countries.dotted.size': number;
  readonly 'countries.dotted.density': number;
  readonly 'countries.dotted.opacity': number;
  readonly 'countries.dotted.rippleBoost': number;
  readonly 'countries.dotted.rippleSpeed': number;
  readonly 'countries.dotted.rippleWidth': number;
  readonly 'countries.dotted.flashColor': string;
  readonly 'countries.dotted.flashStrength': number;
  readonly 'countries.dotted.flashDecay': number;
  readonly 'countries.dotted.driftAmplitude': number;
  readonly 'countries.dotted.driftSpeed': number;
  readonly 'countries.dotted.driftFreq': number;
  readonly 'countries.dotted.driftAxis': string;
  readonly 'countries.dotted.hoverScale': number;
  readonly 'countries.dotted.hoverBrightnessBoost': number;
  readonly 'countries.dotted.hoverDuration': number;
  readonly 'countries.label.color': string;
  readonly 'countries.label.fontSize': number;
  readonly 'countries.label.fontFamily': string;
  readonly 'countries.label.fontWeight': string;
  readonly 'countries.label.textShadow': string;
  readonly 'tooltip.backgroundColor': string;
  readonly 'tooltip.textColor': string;
  readonly 'tooltip.fontSize': number;
  readonly 'tooltip.fontFamily': string;
  readonly 'tooltip.padding': string;
  readonly 'tooltip.borderRadius': string;
  readonly 'legend.backgroundColor': string;
  readonly 'legend.textColor': string;
  readonly 'legend.titleColor': string;
  readonly 'legend.fontSize': number;
  readonly 'legend.fontFamily': string;
  readonly 'legend.padding': string;
  readonly 'legend.borderRadius': string;
  readonly 'lights.ambient.color': string;
  readonly 'lights.ambient.intensity': number;
  readonly 'lights.directional.color': string;
  readonly 'lights.directional.intensity': number;
  readonly 'markers.defaultColor': string;
  readonly 'atmosphere.color': string;
  readonly 'atmosphere.intensity': number;
  readonly 'starfield.color': string;
  readonly 'starfield.density': number;
  readonly 'starfield.size': number;
  readonly 'arcs.color': string;
  readonly 'arcs.width': number;
  readonly 'arcs.opacity': number;
  readonly 'arcs.headColor': string;
  readonly 'arcs.headSize': number;
  readonly 'wireframe.color': string;
  readonly 'wireframe.opacity': number;
  readonly 'wireframe.density': number;
  readonly 'wireframe.pulse': number;
  readonly 'wireframe.pulseColor': string;
  readonly 'wireframe.pulseSpeed': number;
  readonly 'wireframe.pulseWidth': number;
  readonly 'wireframe.pulseBoost': number;
  readonly 'wireframe.equatorColor': string;
  readonly 'wireframe.equatorOpacity': number;
  readonly 'wireframe.emphasisEnabled': boolean;
  readonly 'wireframe.glitchEnabled': boolean;
  readonly 'wireframe.glitchIntervalMin': number;
  readonly 'wireframe.glitchIntervalMax': number;
  readonly 'wireframe.activeRingColor': string;
  readonly 'wireframe.activeRingOpacity': number;
  readonly 'wireframe.activeRingThickness': number;
  readonly 'wireframe.activeRingRotationSpeed': number;
  readonly 'wireframe.activeRingPadding': number;
  readonly 'wireframe.streamColor': string;
  readonly 'wireframe.streamCount': number;
  readonly 'wireframe.streamSize': number;
  readonly 'wireframe.streamSpeed': number;
  readonly 'wireframe.streamOpacity': number;
  readonly 'paper.surfaceColor': string;
  readonly 'paper.surfaceNoiseAmount': number;
  readonly 'paper.borderColor': string;
  readonly 'paper.borderOpacity': number;
  readonly 'paper.borderRoughness': number;
  readonly 'paper.fillColor': string;
  readonly 'paper.fillOpacity': number;
  readonly 'paper.gridColor': string;
  readonly 'paper.gridOpacity': number;
  readonly 'hologram.color': string;
  readonly 'hologram.shellOpacity': number;
  readonly 'hologram.rimGlow': number;
  readonly 'hologram.scanlineFreq': number;
  readonly 'hologram.scanlineSpeed': number;
  readonly 'hologram.borderColor': string;
  readonly 'hologram.borderIntensity': number;
  readonly 'hologram.glitchAmount': number;
  readonly 'hologram.glitchIntervalMin': number;
  readonly 'hologram.glitchIntervalMax': number;
  readonly 'hologram.outerGlowOpacity': number;
  readonly 'cinematic.oceanColor': string;
  readonly 'cinematic.landColor': string;
  readonly 'cinematic.cloudColor': string;
  readonly 'cinematic.nightColor': string;
  readonly 'cinematic.lightDirectionX': number;
  readonly 'cinematic.lightDirectionY': number;
  readonly 'cinematic.lightDirectionZ': number;
  readonly 'cinematic.terminatorSoftness': number;
  readonly 'cinematic.terminatorContrast': number;
  readonly 'cinematic.keyIntensity': number;
  readonly 'cinematic.fillIntensity': number;
  readonly 'cinematic.rimColor': string;
  readonly 'cinematic.rimIntensity': number;
  readonly 'cinematic.rimPower': number;
  readonly 'cinematic.specularIntensity': number;
  readonly 'cinematic.cityLightColor': string;
  readonly 'cinematic.cityLightIntensity': number;
  readonly 'cinematic.networkColor': string;
  readonly 'cinematic.networkOpacity': number;
  readonly 'cinematic.borderColor': string;
  readonly 'cinematic.borderIntensity': number;
  readonly 'cinematic.iceColor': string;
  readonly 'cinematic.vegetationColor': string;
  readonly 'cinematic.desertColor': string;
  readonly 'cinematic.shallowWaterColor': string;
  readonly 'cinematic.auroraColor': string;
  readonly 'cinematic.auroraTopColor': string;
  readonly 'cinematic.moonColor': string;
  readonly 'cinematic.sunColor': string;
  /** Surface colour saturation multiplier (1 = natural, 0 = monochrome). */
  readonly 'cinematic.saturation': number;
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
