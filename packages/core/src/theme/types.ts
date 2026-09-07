import type { ThemePresetName } from './presets';

/** Dot-namespaced keys for shared visual styling and the six rendering kinds. */
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
 * Complete set of string, number and boolean theme tokens. Resolve a preset and overrides over the
 * base tokens; not every token is consumed by every kind.
 */
export interface TokenSet {
  /**
   * Canvas clear color when transparent rendering is disabled. Base value '#000010'; presets may
   * override it.
   */
  readonly 'background.color': string;
  /**
   * Base sphere material color for kinds that retain the shared surface. Base value '#0b1d3a';
   * presets may override it.
   */
  readonly 'globe.surfaceColor': string;
  /**
   * Base sphere texture URL; an empty string leaves the sphere untextured. Base value ''; presets
   * may override it.
   */
  readonly 'globe.surfaceTextureUrl': string;
  /** Base outline-country border color. Base value '#4a9eff'; presets may override it. */
  readonly 'countries.border.color': string;
  /**
   * Requested base outline width; actual wide-line support depends on WebGL. Base value 1; presets
   * may override it.
   */
  readonly 'countries.border.width': number;
  /** Base outline-country border opacity. Base value 0.85; presets may override it. */
  readonly 'countries.border.opacity': number;
  /** Hovered-country stroke tint. Base value '#ffd700'; presets may override it. */
  readonly 'countries.borderHover.color': string;
  /** Hovered-country stroke width in CSS pixels. Base value 2; presets may override it. */
  readonly 'countries.borderHover.width': number;
  /** Hovered-country stroke opacity. Base value 1; presets may override it. */
  readonly 'countries.borderHover.opacity': number;
  /** Outline hover-halo tint. Base value '#ffd700'; presets may override it. */
  readonly 'countries.borderHover.glowColor': string;
  /** Outline hover-halo width in CSS pixels. Base value 6; presets may override it. */
  readonly 'countries.borderHover.glowWidth': number;
  /** Outline hover-halo opacity. Base value 0.45; presets may override it. */
  readonly 'countries.borderHover.glowOpacity': number;
  /**
   * Pinned-country stroke tint and default outline focus-ring tint. Base value '#ffffff'; presets
   * may override it.
   */
  readonly 'countries.borderActive.color': string;
  /** Pinned-country stroke width in CSS pixels. Base value 3; presets may override it. */
  readonly 'countries.borderActive.width': number;
  /** Pinned-country stroke opacity. Base value 1; presets may override it. */
  readonly 'countries.borderActive.opacity': number;
  /**
   * Fallback country-fill tint when no entry or palette color applies. Base value '#1a3a6e'; presets
   * may override it.
   */
  readonly 'countries.fill.defaultColor': string;
  /** Fallback country-fill opacity. Base value 0.4; presets may override it. */
  readonly 'countries.fill.opacity': number;
  /** Base color of the dotted surface field. Base value '#7fdfff'; presets may override it. */
  readonly 'countries.dotted.color': string;
  /** Base surface-dot size before effect multipliers. Base value 0.008; presets may override it. */
  readonly 'countries.dotted.size': number;
  /**
   * Angular latitude spacing in degrees between surface-dot samples; lower values produce more dots.
   * Base value 1.5; presets may override it.
   */
  readonly 'countries.dotted.density': number;
  /** Base surface-dot opacity. Base value 0.95; presets may override it. */
  readonly 'countries.dotted.opacity': number;
  /** Brightness added at a click-ripple wavefront. Base value 1.5; presets may override it. */
  readonly 'countries.dotted.rippleBoost': number;
  /** Click-ripple angular speed in radians per second. Base value 1.2; presets may override it. */
  readonly 'countries.dotted.rippleSpeed': number;
  /** Click-ripple band width in radians. Base value 0.18; presets may override it. */
  readonly 'countries.dotted.rippleWidth': number;
  /** Country-data flash tint. Base value '#ffffff'; presets may override it. */
  readonly 'countries.dotted.flashColor': string;
  /** Initial brightness boost when a country value changes. Base value 2.0; presets may override it. */
  readonly 'countries.dotted.flashStrength': number;
  /** Exponential country-data flash decay rate per second. Base value 4; presets may override it. */
  readonly 'countries.dotted.flashDecay': number;
  /** Ambient drift-wave brightness amplitude. Base value 0.15; presets may override it. */
  readonly 'countries.dotted.driftAmplitude': number;
  /** Ambient drift-wave phase speed in radians per second. Base value 0.4; presets may override it. */
  readonly 'countries.dotted.driftSpeed': number;
  /** Spatial frequency of the ambient drift wave. Base value 3.0; presets may override it. */
  readonly 'countries.dotted.driftFreq': number;
  /**
   * Ambient drift direction; ns uses north/south and ew uses east/west. Base value 'ns'; presets may
   * override it.
   */
  readonly 'countries.dotted.driftAxis': string;
  /** Dot-size multiplier while a country is hovered. Base value 1.3; presets may override it. */
  readonly 'countries.dotted.hoverScale': number;
  /** Brightness added to dots in the hovered country. Base value 0.7; presets may override it. */
  readonly 'countries.dotted.hoverBrightnessBoost': number;
  /** Dot hover transition duration in seconds. Base value 0.25; presets may override it. */
  readonly 'countries.dotted.hoverDuration': number;
  /** Country-label text color. Base value '#ffffff'; presets may override it. */
  readonly 'countries.label.color': string;
  /** Country-label font size in CSS pixels. Base value 11; presets may override it. */
  readonly 'countries.label.fontSize': number;
  /** Country-label CSS font-family. Base value 'system-ui, sans-serif'; presets may override it. */
  readonly 'countries.label.fontFamily': string;
  /** Country-label CSS font-weight. Base value '500'; presets may override it. */
  readonly 'countries.label.fontWeight': string;
  /**
   * Country-label CSS text-shadow unless a label halo overrides it. Base value '0 0 4px rgba(0, 0,
   * 0, 0.7)'; presets may override it.
   */
  readonly 'countries.label.textShadow': string;
  /**
   * Country and marker tooltip background color. Base value 'rgba(10, 14, 30, 0.85)'; presets may
   * override it.
   */
  readonly 'tooltip.backgroundColor': string;
  /** Country and marker tooltip body-text color. Base value '#ffd700'; presets may override it. */
  readonly 'tooltip.textColor': string;
  /** Country and marker tooltip font size in CSS pixels. Base value 12; presets may override it. */
  readonly 'tooltip.fontSize': number;
  /**
   * Country and marker tooltip CSS font-family. Base value 'system-ui, sans-serif'; presets may
   * override it.
   */
  readonly 'tooltip.fontFamily': string;
  /** Country and marker tooltip CSS padding. Base value '4px 8px'; presets may override it. */
  readonly 'tooltip.padding': string;
  /** Country and marker tooltip CSS border-radius. Base value '4px'; presets may override it. */
  readonly 'tooltip.borderRadius': string;
  /** Legend background color. Base value 'rgba(10, 14, 30, 0.85)'; presets may override it. */
  readonly 'legend.backgroundColor': string;
  /** Legend body-text color. Base value '#cfd8e3'; presets may override it. */
  readonly 'legend.textColor': string;
  /** Legend title color. Base value '#ffffff'; presets may override it. */
  readonly 'legend.titleColor': string;
  /** Legend font size in CSS pixels. Base value 11; presets may override it. */
  readonly 'legend.fontSize': number;
  /** Legend CSS font-family. Base value 'system-ui, sans-serif'; presets may override it. */
  readonly 'legend.fontFamily': string;
  /** Legend CSS padding. Base value '8px 10px'; presets may override it. */
  readonly 'legend.padding': string;
  /** Legend CSS border-radius. Base value '6px'; presets may override it. */
  readonly 'legend.borderRadius': string;
  /**
   * Three.js ambient scene-light color; shader-driven kinds also have their own lighting controls.
   * Base value '#ffffff'; presets may override it.
   */
  readonly 'lights.ambient.color': string;
  /** Three.js ambient scene-light intensity. Base value 0.6; presets may override it. */
  readonly 'lights.ambient.intensity': number;
  /**
   * Three.js directional scene-light color; shader-driven kinds also have their own lighting
   * controls. Base value '#ffffff'; presets may override it.
   */
  readonly 'lights.directional.color': string;
  /** Three.js directional scene-light intensity. Base value 0.8; presets may override it. */
  readonly 'lights.directional.intensity': number;
  /** Fallback color for markers without a per-marker color. Base value '#ff4444'; presets may override it. */
  readonly 'markers.defaultColor': string;
  /** Fallback tint of the active kind's atmosphere layer. Base value '#4a9eff'; presets may override it. */
  readonly 'atmosphere.color': string;
  /** Fallback atmosphere brightness. Base value 1.2; presets may override it. */
  readonly 'atmosphere.intensity': number;
  /** Fallback star color when no star palette is supplied. Base value '#ffffff'; presets may override it. */
  readonly 'starfield.color': string;
  /** Number of background stars. Base value 1500; presets may override it. */
  readonly 'starfield.density': number;
  /** Base star size in CSS pixels. Base value 1.4; presets may override it. */
  readonly 'starfield.size': number;
  /** Fallback arc-line color. Base value '#ffd700'; presets may override it. */
  readonly 'arcs.color': string;
  /** Fallback arc-line width in CSS pixels. Base value 1.5; presets may override it. */
  readonly 'arcs.width': number;
  /** Arc-line opacity. Base value 0.9; presets may override it. */
  readonly 'arcs.opacity': number;
  /** Color of the moving particle on animated arcs. Base value '#ffffff'; presets may override it. */
  readonly 'arcs.headColor': string;
  /** Moving arc-particle radius in world units. Base value 0.012; presets may override it. */
  readonly 'arcs.headSize': number;
  /** Base latitude/longitude grid tint. Base value '#22d3ee'; presets may override it. */
  readonly 'wireframe.color': string;
  /** Base latitude/longitude grid opacity. Base value 0.55; presets may override it. */
  readonly 'wireframe.opacity': number;
  /**
   * Grid density multiplier; larger values reduce angular spacing between lines. Base value 1;
   * presets may override it.
   */
  readonly 'wireframe.density': number;
  /**
   * Ambient grid-brightness pulse amplitude; 0 disables the oscillation. Base value 0; presets may
   * override it.
   */
  readonly 'wireframe.pulse': number;
  /** Default click and autonomous grid-pulse tint. Base value '#22d3ee'; presets may override it. */
  readonly 'wireframe.pulseColor': string;
  /** Click-pulse angular expansion speed in radians per second. Base value 1.5; presets may override it. */
  readonly 'wireframe.pulseSpeed': number;
  /** Click-pulse band width in radians. Base value 0.18; presets may override it. */
  readonly 'wireframe.pulseWidth': number;
  /** Click-pulse peak brightness boost. Base value 2.5; presets may override it. */
  readonly 'wireframe.pulseBoost': number;
  /**
   * Tint of the geographic-emphasis lines and equator beam. Base value '#7ff0ff'; presets may
   * override it.
   */
  readonly 'wireframe.equatorColor': string;
  /** Geographic-emphasis line opacity. Base value 0.85; presets may override it. */
  readonly 'wireframe.equatorOpacity': number;
  /** Show the equator, tropics and principal meridians. Base value true; presets may override it. */
  readonly 'wireframe.emphasisEnabled': boolean;
  /** Enable intermittent grid distortions. Base value true; presets may override it. */
  readonly 'wireframe.glitchEnabled': boolean;
  /** Minimum delay between grid glitches in seconds. Base value 5; presets may override it. */
  readonly 'wireframe.glitchIntervalMin': number;
  /** Maximum delay between grid glitches in seconds. Base value 15; presets may override it. */
  readonly 'wireframe.glitchIntervalMax': number;
  /** Pinned-country ring tint. Base value '#22d3ee'; presets may override it. */
  readonly 'wireframe.activeRingColor': string;
  /** Pinned-country ring opacity. Base value 0.7; presets may override it. */
  readonly 'wireframe.activeRingOpacity': number;
  /** Pinned-country ring thickness. Base value 0.015; presets may override it. */
  readonly 'wireframe.activeRingThickness': number;
  /** Pinned-country ring rotation in radians per second. Base value 0.5; presets may override it. */
  readonly 'wireframe.activeRingRotationSpeed': number;
  /** Multiplier on the pinned country's angular radius. Base value 1.2; presets may override it. */
  readonly 'wireframe.activeRingPadding': number;
  /** Pole-to-pole particle-stream tint. Base value '#67e8f9'; presets may override it. */
  readonly 'wireframe.streamColor': string;
  /** Number of pole-stream particles. Base value 16; presets may override it. */
  readonly 'wireframe.streamCount': number;
  /** Pole-stream particle size in world units. Base value 0.012; presets may override it. */
  readonly 'wireframe.streamSize': number;
  /** Pole-stream southward speed in radians per second. Base value 0.6; presets may override it. */
  readonly 'wireframe.streamSpeed': number;
  /** Pole-stream opacity. Base value 0.85; presets may override it. */
  readonly 'wireframe.streamOpacity': number;
  /** Parchment sphere base color. Base value '#d7e2d2'; presets may override it. */
  readonly 'paper.surfaceColor': string;
  /** Grain intensity baked into the parchment texture. Base value 0.06; presets may override it. */
  readonly 'paper.surfaceNoiseAmount': number;
  /** Paper country-border ink tint. Base value '#5b3a1f'; presets may override it. */
  readonly 'paper.borderColor': string;
  /** Paper country-border opacity. Base value 0.85; presets may override it. */
  readonly 'paper.borderOpacity': number;
  /**
   * Deterministic perpendicular jitter strength for paper country borders. Base value 0.12; presets
   * may override it.
   */
  readonly 'paper.borderRoughness': number;
  /** Base paper country-wash tint. Base value '#ecd28c'; presets may override it. */
  readonly 'paper.fillColor': string;
  /** Base paper country-wash opacity. Base value 0.78; presets may override it. */
  readonly 'paper.fillOpacity': number;
  /** Paper latitude/longitude grid ink tint. Base value '#bfa974'; presets may override it. */
  readonly 'paper.gridColor': string;
  /** Minor paper grid-line opacity. Base value 0.18; presets may override it. */
  readonly 'paper.gridOpacity': number;
  /** Hologram shell tint and fallback glow color. Base value '#4dd0e1'; presets may override it. */
  readonly 'hologram.color': string;
  /** Base hologram shell opacity. Base value 0.18; presets may override it. */
  readonly 'hologram.shellOpacity': number;
  /** Hologram Fresnel rim brightness. Base value 1.4; presets may override it. */
  readonly 'hologram.rimGlow': number;
  /** Spatial frequency of hologram scanline stripes. Base value 240; presets may override it. */
  readonly 'hologram.scanlineFreq': number;
  /** Hologram scanline phase speed in radians per second. Base value 1.5; presets may override it. */
  readonly 'hologram.scanlineSpeed': number;
  /** Hologram country-border tint. Base value '#67e8f9'; presets may override it. */
  readonly 'hologram.borderColor': string;
  /** Hologram country-border brightness. Base value 1.6; presets may override it. */
  readonly 'hologram.borderIntensity': number;
  /** Border shear amplitude during hologram glitches. Base value 0.025; presets may override it. */
  readonly 'hologram.glitchAmount': number;
  /** Minimum wait between hologram glitches in seconds. Base value 4; presets may override it. */
  readonly 'hologram.glitchIntervalMin': number;
  /** Maximum wait between hologram glitches in seconds. Base value 9; presets may override it. */
  readonly 'hologram.glitchIntervalMax': number;
  /** Hologram outer-halo opacity. Base value 0.12; presets may override it. */
  readonly 'hologram.outerGlowOpacity': number;
  /** Cinematic ocean base color. Base value '#021018'; presets may override it. */
  readonly 'cinematic.oceanColor': string;
  /** Cinematic land base color and country-fill fallback. Base value '#7a5328'; presets may override it. */
  readonly 'cinematic.landColor': string;
  /** Cinematic cloud-shell tint. Base value '#cfeeff'; presets may override it. */
  readonly 'cinematic.cloudColor': string;
  /** Night-side surface tint. Base value '#01040a'; presets may override it. */
  readonly 'cinematic.nightColor': string;
  /**
   * World-space X component of the default cinematic light vector. Base value -0.62; presets may
   * override it.
   */
  readonly 'cinematic.lightDirectionX': number;
  /**
   * World-space Y component of the default cinematic light vector. Base value 0.55; presets may
   * override it.
   */
  readonly 'cinematic.lightDirectionY': number;
  /**
   * World-space Z component of the default cinematic light vector. Base value 0.55; presets may
   * override it.
   */
  readonly 'cinematic.lightDirectionZ': number;
  /** Softness of the cinematic day/night transition. Base value 0.42; presets may override it. */
  readonly 'cinematic.terminatorSoftness': number;
  /** Contrast of the cinematic day/night transition. Base value 1.45; presets may override it. */
  readonly 'cinematic.terminatorContrast': number;
  /** Directional surface key-light intensity. Base value 1.6; presets may override it. */
  readonly 'cinematic.keyIntensity': number;
  /** Surface fill-light intensity. Base value 0.1; presets may override it. */
  readonly 'cinematic.fillIntensity': number;
  /** Surface rim-light tint. Base value '#9bdaff'; presets may override it. */
  readonly 'cinematic.rimColor': string;
  /** Surface rim-light intensity. Base value 1.42; presets may override it. */
  readonly 'cinematic.rimIntensity': number;
  /**
   * Surface rim-light falloff exponent; higher values produce a narrower highlight. Base value 2.55;
   * presets may override it.
   */
  readonly 'cinematic.rimPower': number;
  /** Surface specular-highlight intensity. Base value 0.95; presets may override it. */
  readonly 'cinematic.specularIntensity': number;
  /** Base city-light tint mixed with per-city temperature. Base value '#ffe5a8'; presets may override it. */
  readonly 'cinematic.cityLightColor': string;
  /** City-light brightness. Base value 1.4; presets may override it. */
  readonly 'cinematic.cityLightIntensity': number;
  /** Cinematic route-network tint. Base value '#f7c466'; presets may override it. */
  readonly 'cinematic.networkColor': string;
  /** Cinematic route-network opacity. Base value 0.22; presets may override it. */
  readonly 'cinematic.networkOpacity': number;
  /** Cinematic border and focus-ring tint. Base value '#f6b44d'; presets may override it. */
  readonly 'cinematic.borderColor': string;
  /** Cinematic country-border brightness. Base value 1.08; presets may override it. */
  readonly 'cinematic.borderIntensity': number;
  /** Polar ice and snow tint. Base value '#dcefff'; presets may override it. */
  readonly 'cinematic.iceColor': string;
  /** Vegetation biome tint. Base value '#2f5a2c'; presets may override it. */
  readonly 'cinematic.vegetationColor': string;
  /** Desert biome tint. Base value '#c9a266'; presets may override it. */
  readonly 'cinematic.desertColor': string;
  /** Coastal shallow-water tint. Base value '#1f8fa8'; presets may override it. */
  readonly 'cinematic.shallowWaterColor': string;
  /** Lower auroral-curtain tint. Base value '#4dffa6'; presets may override it. */
  readonly 'cinematic.auroraColor': string;
  /** Upper auroral-curtain tint. Base value '#8d5cff'; presets may override it. */
  readonly 'cinematic.auroraTopColor': string;
  /** Moonlight tint on the night side. Base value '#a9c4ff'; presets may override it. */
  readonly 'cinematic.moonColor': string;
  /** Sun-disc and directional-light tint. Base value '#fff1c9'; presets may override it. */
  readonly 'cinematic.sunColor': string;
  /**
   * Surface saturation multiplier; 0 is monochrome and 1 preserves the base saturation. Base value
   * 1; presets may override it.
   */
  readonly 'cinematic.saturation': number;
}

/** Sparse theme-token overrides; omitted or undefined entries retain the base or preset value. */
export type PartialTokenSet = Partial<TokenSet>;

/**
 * User-supplied theme config. `extends` selects a built-in preset (autocompletes)
 * OR a custom preset registered via `registerThemePreset()`; `tokens` overrides
 * individual values on top of that floor.
 */
export interface ThemeConfig {
  /** Built-in or registered preset name. An unknown name falls back to base tokens. */
  readonly extends?: ThemePresetName | (string & {});
  /** Per-token overrides applied after the preset; undefined values are ignored. */
  readonly tokens?: PartialTokenSet;
}

/** Output of `resolveTheme()` — every key present, deeply readonly. */
export type ResolvedTokens = TokenSet;

/**
 * Public theme entry point. Accepts either a preset name (shorthand) — built-in
 * or custom — or a full ThemeConfig object.
 */
export type ThemeInput = ThemePresetName | (string & {}) | ThemeConfig;
