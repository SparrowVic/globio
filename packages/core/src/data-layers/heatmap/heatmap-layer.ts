import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  Color,
  CustomBlending,
  DataTexture,
  FloatType,
  LinearFilter,
  Mesh,
  NormalBlending,
  RGBAFormat,
  RedFormat,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  type Blending,
  type IUniform,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';
import { colorForValue, type ScaleConfig } from '../../data/scales';
import type {
  HeatmapContourConfig,
  HeatmapCurve,
  HeatmapCountryDomeConfig,
  HeatmapDataLayer,
  HeatmapGridConfig,
  HeatmapKernel,
  HeatmapNormalize,
  HeatmapZoomScalingConfig,
} from '../types';
import type { CountryFeature, CountryPolygon } from '../../renderer/country-feature';

const DEFAULT_RADIUS_RAD = 0.10;
/**
 * Default vertical displacement. 0 → flat colour overlay (deck.gl style),
 * which is the visually safest, most professional default. Bumps are an
 * opt-in that requires the caller to also have a high enough subdivision
 * mesh for the displaced surface to read smoothly.
 */
const DEFAULT_MAX_HEIGHT = 0;
const DEFAULT_TEXTURE_W = 2048;
const DEFAULT_TEXTURE_H = 1024;
const DEFAULT_PALETTE_STEPS = 256;
const DEFAULT_FALLBACK_COLOR = '#ffaa44';
const DEFAULT_BLUR_PASSES = 2;
const DEFAULT_RIM_FADE = 0;
const RADIUS_LIFT = 1.0006;

/**
 * SphereGeometry resolution, picked so each quad of the mesh covers ~1°
 * angular size — fine enough that any visible displacement gradient is
 * pixel-thin and the regular UV grid maps cleanly onto our equirectangular
 * density texture (no projection mismatch). Trades ~130k vertices for the
 * "no visible facets" property.
 *
 * Auto-promoted to (1024, 512) when `maxHeight > 0` so the displaced surface
 * stays smooth at the limb without the caller having to think about it.
 */
const SPHERE_FLAT_W = 256;
const SPHERE_FLAT_H = 128;
const SPHERE_DISPLACED_W = 1024;
const SPHERE_DISPLACED_H = 512;

interface ResolvedHeatmapGridConfig {
  readonly enabled: boolean;
  readonly stepDeg: number;
  readonly widthDeg: number;
  readonly opacity: number;
  readonly majorEvery: number;
  readonly majorOpacity: number;
  readonly color: string;
  readonly densityFade: number;
}

interface ResolvedHeatmapContourConfig {
  readonly enabled: boolean;
  readonly interval: number;
  readonly width: number;
  readonly opacity: number;
  readonly majorEvery: number;
  readonly majorOpacity: number;
  readonly color: string;
  readonly densityFade: number;
}

interface ResolvedHeatmapZoomScalingConfig {
  readonly enabled: boolean;
  readonly closeDistance: number;
  readonly farDistance: number;
  readonly closeHeightScale: number;
  readonly farHeightScale: number;
  readonly closeOpacityScale: number;
  readonly farOpacityScale: number;
  readonly thresholdBoost: number;
  readonly gridBoost: number;
  readonly contourBoost: number;
}

interface ResolvedHeatmapCountryDomeConfig {
  readonly enabled: boolean;
  readonly centerArea: number;
  readonly shoulderHeight: number;
  readonly edgeSteepness: number;
  readonly valuePreScale: 'linear' | 'log' | 'sqrt';
  readonly rounding: number;
  readonly perCountryNormalize: boolean;
}

const DISABLED_ZOOM_SCALING: ResolvedHeatmapZoomScalingConfig = {
  enabled: false,
  closeDistance: 1.45,
  farDistance: 3.2,
  closeHeightScale: 1,
  farHeightScale: 1,
  closeOpacityScale: 1,
  farOpacityScale: 1,
  thresholdBoost: 0,
  gridBoost: 0,
  contourBoost: 0,
};

const DISABLED_COUNTRY_DOMES: ResolvedHeatmapCountryDomeConfig = {
  enabled: false,
  centerArea: 0.55,
  shoulderHeight: 0.36,
  edgeSteepness: 2.6,
  valuePreScale: 'log',
  rounding: 1,
  perCountryNormalize: true,
};

export interface HeatmapLayerOptions {
  readonly layer: HeatmapDataLayer;
  readonly countryFeatures?: ReadonlyArray<CountryFeature>;
  /**
   * Optional override of the heatmap shader's blending mode. Pass through
   * any of three.js's blending constants. Defaults match `layer.blendMode`.
   */
  readonly blending?: number;
  readonly opacity?: number;
  readonly fallbackColor?: string;
}

/**
 * Volumetric heatmap rendered via a baked density texture + custom shader.
 *
 *   1. CPU pass: every sample contributes to a Float32Array equirect texture
 *      using the chosen kernel function. Optimised by iterating only the
 *      pixels inside each sample's radius (not the full grid per sample).
 *   2. CPU post-pass: optional separable 3×3 box blur to smooth pixel
 *      discontinuities. Cheap; makes hotspots melt into clouds.
 *   3. GPU vertex shader: each vertex looks up the texture at its lat/lng
 *      and pushes outward by `displacement(t)`. Uses the SphereGeometry's
 *      regular UV grid so the displacement field interpolates smoothly.
 *   4. GPU fragment shader: per-fragment 3D direction → equirect UV →
 *      density → palette → final colour. Computing UV per-fragment (not
 *      via interpolated vUv) sidesteps the antimeridian seam where linear
 *      vUv interpolation would wrap the wrong way and paint ghost streaks.
 */
export class HeatmapLayer {
  public readonly mesh: Mesh;
  public readonly material: ShaderMaterial;
  public readonly densityTexture: DataTexture;
  public readonly paletteTexture: DataTexture;
  public peakDensity = 0;
  private readonly geometry: SphereGeometry;
  private readonly textureWidth: number;
  private readonly textureHeight: number;
  private readonly paletteSteps: number;
  private readonly fallbackColor: string;
  private readonly countryFeaturesByKey: ReadonlyMap<string, CountryFeature>;
  private zoomScaling: ResolvedHeatmapZoomScalingConfig = DISABLED_ZOOM_SCALING;
  private lastCameraDistance = 3;
  /**
   * Hash of the bake-affecting fields from the last applyData() call —
   * `samples` reference, `kernel`, `radius`, `blurPasses`, `normalize`,
   * `absoluteMax`. Setting a layer with the same key re-uses the existing
   * density texture and only refreshes shader uniforms / palette.
   */
  private lastBakeKey = '';
  /**
   * Hash of the palette-affecting fields. The palette texture rewrite is
   * cheap (~256 entries) but worth skipping when only displacement /
   * intensity sliders move.
   */
  private lastPaletteKey = '';

  public constructor(options: HeatmapLayerOptions) {
    const { layer } = options;
    this.fallbackColor = options.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    this.textureWidth = layer.textureResolution?.width ?? DEFAULT_TEXTURE_W;
    this.textureHeight = layer.textureResolution?.height ?? DEFAULT_TEXTURE_H;
    this.paletteSteps = layer.paletteSteps ?? DEFAULT_PALETTE_STEPS;
    this.countryFeaturesByKey = buildCountryFeatureIndex(options.countryFeatures ?? []);

    const wantsDisplacement = (layer.maxHeight ?? DEFAULT_MAX_HEIGHT) > 0;
    const geomW =
      layer.meshResolution?.width ??
      (wantsDisplacement ? SPHERE_DISPLACED_W : SPHERE_FLAT_W);
    const geomH =
      layer.meshResolution?.height ??
      (wantsDisplacement ? SPHERE_DISPLACED_H : SPHERE_FLAT_H);
    this.geometry = new SphereGeometry(GLOBE_RADIUS * RADIUS_LIFT, geomW, geomH);

    // Density texture (single-channel Float32). Allocated once; we re-bake
    // its contents in-place when setData is called so the GPU upload stays
    // a single existing texture object.
    const densityData = new Float32Array(this.textureWidth * this.textureHeight);
    this.densityTexture = new DataTexture(
      densityData,
      this.textureWidth,
      this.textureHeight,
      RedFormat,
      FloatType
    );
    this.densityTexture.minFilter = LinearFilter;
    this.densityTexture.magFilter = LinearFilter;
    this.densityTexture.wrapS = RepeatWrapping;
    this.densityTexture.wrapT = ClampToEdgeWrapping;
    this.densityTexture.needsUpdate = true;

    const paletteData = new Float32Array(this.paletteSteps * 4);
    this.paletteTexture = new DataTexture(
      paletteData,
      this.paletteSteps,
      1,
      RGBAFormat,
      FloatType
    );
    this.paletteTexture.minFilter = LinearFilter;
    this.paletteTexture.magFilter = LinearFilter;
    this.paletteTexture.wrapS = ClampToEdgeWrapping;
    this.paletteTexture.wrapT = ClampToEdgeWrapping;
    this.paletteTexture.needsUpdate = true;

    const blendMode = layer.blendMode ?? 'normal';
    const blending: Blending =
      (options.blending as Blending | undefined) ??
      (blendMode === 'additive' ? AdditiveBlending : NormalBlending);
    this.zoomScaling = resolveZoomScaling(layer.zoomScaling);

    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: blending === CustomBlending ? NormalBlending : blending,
      extensions: { derivatives: true },
      uniforms: this.buildUniforms(layer, options.opacity ?? 1, blendMode),
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 5;
    // Hide the back-faces — we never see the inside of the heatmap shell
    // but stripping them halves fragment work in the displaced case.
    this.mesh.frustumCulled = true;

    this.applyData(layer);
    this.lastBakeKey = computeBakeKey(layer);
    this.lastPaletteKey = computePaletteKey(layer);
  }

  public setData(layer: HeatmapDataLayer): void {
    const bakeKey = computeBakeKey(layer);
    if (bakeKey !== this.lastBakeKey) {
      this.applyData(layer);
      this.lastBakeKey = bakeKey;
    } else {
      // Skip the (expensive) bake — only palette / shader uniforms can
      // possibly need updating in this branch.
      const paletteKey = computePaletteKey(layer);
      if (paletteKey !== this.lastPaletteKey) {
        writePalette(
          this.paletteTexture.image.data as unknown as Float32Array,
          this.paletteSteps,
          layer,
          this.fallbackColor
        );
        this.paletteTexture.needsUpdate = true;
        this.lastPaletteKey = paletteKey;
      }
    }
    this.refreshUniforms(layer);
  }

  public updateView(cameraDistance: number): void {
    this.lastCameraDistance = cameraDistance;
    this.applyZoomScaling(cameraDistance);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.densityTexture.dispose();
    this.paletteTexture.dispose();
  }

  private buildUniforms(
    layer: HeatmapDataLayer,
    opacity: number,
    blendMode: 'normal' | 'additive'
  ): Record<string, IUniform> {
    const lightDir = layer.lightDirection ?? [1, 0.6, 0.7];
    const lvec = new Vector3(lightDir[0], lightDir[1], lightDir[2]).normalize();
    const grid = resolveGridConfig(layer.grid, this.fallbackColor);
    const contours = resolveContourConfig(layer.contours, this.fallbackColor);
    return {
      uDensity: { value: this.densityTexture },
      uPalette: { value: this.paletteTexture },
      uMaxHeight: { value: layer.maxHeight ?? DEFAULT_MAX_HEIGHT },
      uZoomHeightScale: { value: 1 },
      uIntensity: { value: layer.intensity ?? 1 },
      uThreshold: { value: layer.threshold ?? 0 },
      uZoomThresholdBoost: { value: 0 },
      uCurve: { value: encodeCurve(layer.curve ?? 'smoothstep') },
      uDispCurve: {
        value: encodeCurve(layer.displacementCurve ?? layer.curve ?? 'smoothstep'),
      },
      uOpacity: { value: opacity },
      uZoomOpacityScale: { value: 1 },
      uBlendMode: { value: blendMode === 'additive' ? 1 : 0 },
      uTextureSize: { value: new Vector2(this.textureWidth, this.textureHeight) },
      uLightDir: { value: lvec },
      uShading: { value: layer.shading ?? 0.6 },
      uRimFade: { value: Math.max(0, layer.rimFade ?? DEFAULT_RIM_FADE) },
      uGridEnabled: { value: grid.enabled ? 1 : 0 },
      uGridColor: { value: new Color(grid.color) },
      uGridStepDeg: { value: grid.stepDeg },
      uGridWidthDeg: { value: grid.widthDeg },
      uGridOpacity: { value: grid.opacity },
      uGridMajorStepDeg: { value: grid.stepDeg * grid.majorEvery },
      uGridMajorOpacity: { value: grid.majorOpacity },
      uGridDensityFade: { value: grid.densityFade },
      uGridZoomScale: { value: 1 },
      uContourEnabled: { value: contours.enabled ? 1 : 0 },
      uContourColor: { value: new Color(contours.color) },
      uContourInterval: { value: contours.interval },
      uContourWidth: { value: contours.width },
      uContourOpacity: { value: contours.opacity },
      uContourMajorInterval: { value: contours.interval * contours.majorEvery },
      uContourMajorOpacity: { value: contours.majorOpacity },
      uContourDensityFade: { value: contours.densityFade },
      uContourZoomScale: { value: 1 },
    };
  }

  private refreshUniforms(layer: HeatmapDataLayer): void {
    const u = this.material.uniforms;
    u['uMaxHeight']!.value = layer.maxHeight ?? DEFAULT_MAX_HEIGHT;
    u['uIntensity']!.value = layer.intensity ?? 1;
    u['uThreshold']!.value = layer.threshold ?? 0;
    u['uCurve']!.value = encodeCurve(layer.curve ?? 'smoothstep');
    u['uDispCurve']!.value = encodeCurve(
      layer.displacementCurve ?? layer.curve ?? 'smoothstep'
    );
    const blendMode = layer.blendMode ?? 'normal';
    u['uBlendMode']!.value = blendMode === 'additive' ? 1 : 0;
    this.material.blending = blendMode === 'additive' ? AdditiveBlending : NormalBlending;
    this.material.needsUpdate = true;
    if (layer.lightDirection) {
      const v = u['uLightDir']!.value as Vector3;
      v.set(layer.lightDirection[0], layer.lightDirection[1], layer.lightDirection[2]).normalize();
    }
    if (layer.shading !== undefined) u['uShading']!.value = layer.shading;
    u['uRimFade']!.value = Math.max(0, layer.rimFade ?? DEFAULT_RIM_FADE);
    this.applyGridUniforms(layer);
    this.applyContourUniforms(layer);
    this.zoomScaling = resolveZoomScaling(layer.zoomScaling);
    this.applyZoomScaling(this.lastCameraDistance);
  }

  private applyGridUniforms(layer: HeatmapDataLayer): void {
    const grid = resolveGridConfig(layer.grid, this.fallbackColor);
    const u = this.material.uniforms;
    u['uGridEnabled']!.value = grid.enabled ? 1 : 0;
    (u['uGridColor']!.value as Color).set(grid.color);
    u['uGridStepDeg']!.value = grid.stepDeg;
    u['uGridWidthDeg']!.value = grid.widthDeg;
    u['uGridOpacity']!.value = grid.opacity;
    u['uGridMajorStepDeg']!.value = grid.stepDeg * grid.majorEvery;
    u['uGridMajorOpacity']!.value = grid.majorOpacity;
    u['uGridDensityFade']!.value = grid.densityFade;
  }

  private applyContourUniforms(layer: HeatmapDataLayer): void {
    const contours = resolveContourConfig(layer.contours, this.fallbackColor);
    const u = this.material.uniforms;
    u['uContourEnabled']!.value = contours.enabled ? 1 : 0;
    (u['uContourColor']!.value as Color).set(contours.color);
    u['uContourInterval']!.value = contours.interval;
    u['uContourWidth']!.value = contours.width;
    u['uContourOpacity']!.value = contours.opacity;
    u['uContourMajorInterval']!.value = contours.interval * contours.majorEvery;
    u['uContourMajorOpacity']!.value = contours.majorOpacity;
    u['uContourDensityFade']!.value = contours.densityFade;
  }

  private applyZoomScaling(cameraDistance: number): void {
    const u = this.material.uniforms;
    const z = this.zoomScaling;
    if (!z.enabled || !Number.isFinite(cameraDistance)) {
      u['uZoomHeightScale']!.value = 1;
      u['uZoomOpacityScale']!.value = 1;
      u['uZoomThresholdBoost']!.value = 0;
      u['uGridZoomScale']!.value = 1;
      u['uContourZoomScale']!.value = 1;
      return;
    }

    const closeFactor =
      1 - smoothstepCpu(z.closeDistance, z.farDistance, cameraDistance);
    u['uZoomHeightScale']!.value = lerpCpu(
      z.farHeightScale,
      z.closeHeightScale,
      closeFactor
    );
    u['uZoomOpacityScale']!.value = lerpCpu(
      z.farOpacityScale,
      z.closeOpacityScale,
      closeFactor
    );
    u['uZoomThresholdBoost']!.value = z.thresholdBoost * closeFactor;
    u['uGridZoomScale']!.value = 1 + z.gridBoost * closeFactor;
    u['uContourZoomScale']!.value = 1 + z.contourBoost * closeFactor;
  }

  private applyData(layer: HeatmapDataLayer): void {
    const samples = layer.data;
    const data = this.densityTexture.image.data as unknown as Float32Array;
    data.fill(0);
    if (samples.length === 0) {
      this.densityTexture.needsUpdate = true;
      this.peakDensity = 0;
      writePalette(this.paletteTexture.image.data as unknown as Float32Array, this.paletteSteps, layer, this.fallbackColor);
      this.paletteTexture.needsUpdate = true;
      return;
    }

    const defaultRadius = layer.radius ?? DEFAULT_RADIUS_RAD;
    const kernel = layer.kernel ?? 'gaussian';
    const countryDomes = resolveCountryDomeConfig(layer.countryDomes);
    const countryPainted =
      countryDomes.enabled && this.countryFeaturesByKey.size > 0
        ? paintCountryDomeSamples(
            data,
            this.textureWidth,
            this.textureHeight,
            samples,
            this.countryFeaturesByKey,
            countryDomes
          )
        : EMPTY_SAMPLE_SET;
    // When per-country normalize is on, clamp every fallback radial stamp
    // to 1.0 so micro-states whose polygons aren't in the low-res country
    // dataset (Singapore, Bahrain, Malta, Vatican …) hit the same texture
    // peak as the dome-painted countries. Without this their raw `value`
    // (e.g. Singapore=5.9 for population in millions) blows past the
    // dome peak of 1.0 and drags every country into the dim end of the
    // palette via the global normalize step.
    const radialPerCountry = countryDomes.enabled && countryDomes.perCountryNormalize;
    for (let i = 0; i < samples.length; i++) {
      if (countryPainted.has(i)) continue;
      const entry = samples[i]!;
      const radius = Math.max(1e-4, entry.radius ?? defaultRadius);
      const weight = entry.weight ?? 1;
      const stampValue = radialPerCountry ? 1 : entry.value * weight;
      paintSample(
        data,
        this.textureWidth,
        this.textureHeight,
        entry.position[0],
        entry.position[1],
        radius,
        stampValue,
        kernel
      );
    }

    // Per-country normalize hard cap — radial paintSample uses `+=`, so
    // overlapping kernels from neighbouring micro-states could in theory
    // poke a pixel above the dome peak of 1.0. Clamp once across the
    // whole buffer before blur so the texture stays in [0, 1] and the
    // global normalize step doesn't dim every country.
    if (radialPerCountry) {
      for (let i = 0; i < data.length; i++) {
        if (data[i]! > 1) data[i] = 1;
      }
    }

    // Post-bake blur — smooths any pixel-level discontinuities that the
    // baker left between adjacent samples or at kernel edges. Keep the
    // pass count low (default 2) so kernel shape stays recognisable.
    const blurPasses = Math.max(0, layer.blurPasses ?? DEFAULT_BLUR_PASSES);
    if (blurPasses > 0) {
      blurDensity(data, this.textureWidth, this.textureHeight, blurPasses);
    }

    let peak = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i]!;
      if (v > peak) peak = v;
    }
    this.peakDensity = peak;

    const normalize: HeatmapNormalize = layer.normalize ?? 'peak';
    if (normalize === 'peak' && peak > 0) {
      const inv = 1 / peak;
      for (let i = 0; i < data.length; i++) data[i] = data[i]! * inv;
    } else if (normalize === 'log' && peak > 0) {
      const denom = Math.log1p(peak);
      const invDenom = denom > 0 ? 1 / denom : 0;
      for (let i = 0; i < data.length; i++) data[i] = Math.log1p(data[i]!) * invDenom;
    } else if (normalize === 'absolute') {
      const max = Math.max(1e-9, layer.absoluteMax ?? peak);
      const inv = 1 / max;
      for (let i = 0; i < data.length; i++) data[i] = Math.min(1, data[i]! * inv);
    }
    this.densityTexture.needsUpdate = true;

    writePalette(
      this.paletteTexture.image.data as unknown as Float32Array,
      this.paletteSteps,
      layer,
      this.fallbackColor
    );
    this.paletteTexture.needsUpdate = true;
  }
}

const encodeCurve = (curve: HeatmapCurve): number => {
  switch (curve) {
    case 'linear':
      return 0;
    case 'smoothstep':
      return 1;
    case 'cubic':
      return 2;
    case 'sqrt':
      return 3;
  }
};

const resolveGridConfig = (
  input: HeatmapDataLayer['grid'],
  fallbackColor: string
): ResolvedHeatmapGridConfig => {
  if (!input) {
    return {
      enabled: false,
      stepDeg: 8,
      widthDeg: 0.16,
      opacity: 0,
      majorEvery: 4,
      majorOpacity: 0,
      color: fallbackColor,
      densityFade: 0.28,
    };
  }
  const cfg: HeatmapGridConfig = input === true ? {} : input;
  return {
    enabled: cfg.enabled ?? true,
    stepDeg: clampCpu(cfg.stepDeg ?? 8, 2, 45),
    widthDeg: clampCpu(cfg.widthDeg ?? 0.16, 0.02, 2),
    opacity: clampCpu(cfg.opacity ?? 0.14, 0, 1),
    majorEvery: Math.max(1, Math.round(cfg.majorEvery ?? 4)),
    majorOpacity: clampCpu(cfg.majorOpacity ?? 0.24, 0, 1),
    color: cfg.color ?? fallbackColor,
    densityFade: clampCpu(cfg.densityFade ?? 0.28, 0.02, 1),
  };
};

const resolveContourConfig = (
  input: HeatmapDataLayer['contours'],
  fallbackColor: string
): ResolvedHeatmapContourConfig => {
  if (!input) {
    return {
      enabled: false,
      interval: 0.08,
      width: 0.006,
      opacity: 0,
      majorEvery: 4,
      majorOpacity: 0,
      color: fallbackColor,
      densityFade: 0.04,
    };
  }
  const cfg: HeatmapContourConfig = input === true ? {} : input;
  return {
    enabled: cfg.enabled ?? true,
    interval: clampCpu(cfg.interval ?? 0.08, 0.015, 0.5),
    width: clampCpu(cfg.width ?? 0.006, 0.001, 0.08),
    opacity: clampCpu(cfg.opacity ?? 0.22, 0, 1),
    majorEvery: Math.max(1, Math.round(cfg.majorEvery ?? 4)),
    majorOpacity: clampCpu(cfg.majorOpacity ?? 0.38, 0, 1),
    color: cfg.color ?? fallbackColor,
    densityFade: clampCpu(cfg.densityFade ?? 0.04, 0, 1),
  };
};

const resolveZoomScaling = (
  input: HeatmapDataLayer['zoomScaling']
): ResolvedHeatmapZoomScalingConfig => {
  if (input === undefined || input === false) return DISABLED_ZOOM_SCALING;
  const cfg: HeatmapZoomScalingConfig = input;
  if (cfg.enabled === false) return DISABLED_ZOOM_SCALING;
  const closeDistance = cfg.closeDistance ?? 1.45;
  const farDistance = Math.max(closeDistance + 0.001, cfg.farDistance ?? 3.2);
  return {
    enabled: true,
    closeDistance,
    farDistance,
    closeHeightScale: clampCpu(cfg.closeHeightScale ?? 0.55, 0.05, 2),
    farHeightScale: clampCpu(cfg.farHeightScale ?? 1, 0.05, 2),
    closeOpacityScale: clampCpu(cfg.closeOpacityScale ?? 0.86, 0, 2),
    farOpacityScale: clampCpu(cfg.farOpacityScale ?? 1, 0, 2),
    thresholdBoost: clampCpu(cfg.thresholdBoost ?? 0.04, 0, 0.5),
    gridBoost: clampCpu(cfg.gridBoost ?? 0.45, 0, 2),
    contourBoost: clampCpu(cfg.contourBoost ?? 0.35, 0, 2),
  };
};

const resolveCountryDomeConfig = (
  input: HeatmapDataLayer['countryDomes']
): ResolvedHeatmapCountryDomeConfig => {
  if (input === undefined || input === false) return DISABLED_COUNTRY_DOMES;
  const cfg: HeatmapCountryDomeConfig = input === true ? {} : input;
  if (cfg.enabled === false) return DISABLED_COUNTRY_DOMES;
  return {
    enabled: true,
    centerArea: clampCpu(cfg.centerArea ?? 0.55, 0.12, 0.85),
    shoulderHeight: clampCpu(cfg.shoulderHeight ?? 0.36, 0.05, 0.98),
    edgeSteepness: clampCpu(cfg.edgeSteepness ?? 2.6, 0.5, 8),
    valuePreScale: cfg.valuePreScale ?? 'log',
    rounding: clampCpu(cfg.rounding ?? 1, 0, 1),
    perCountryNormalize: cfg.perCountryNormalize ?? true,
  };
};

const countryDomeKey = (input: HeatmapDataLayer['countryDomes']): string => {
  if (!input) return 'off';
  if (input === true) return 'on';
  return [
    input.enabled === false ? 'off' : 'on',
    input.centerArea ?? '',
    input.shoulderHeight ?? '',
    input.edgeSteepness ?? '',
    input.valuePreScale ?? '',
    input.rounding ?? '',
    input.perCountryNormalize === false ? 'mag' : 'norm',
  ].join(',');
};

const clampCpu = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

const lerpCpu = (a: number, b: number, t: number): number => a + (b - a) * t;

const smoothstepCpu = (edge0: number, edge1: number, x: number): number => {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clampCpu((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

const EMPTY_SAMPLE_SET = new Set<number>();
const DEG_TO_RAD = Math.PI / 180;

const COUNTRY_NAME_ALIASES: Readonly<Record<string, string>> = {
  bosniaandherzegovina: 'bosniaandherz',
  centralafricanrepublic: 'centralafricanrep',
  czechrepublic: 'czechia',
  democraticrepublicofthecongo: 'demrepcongo',
  dominicanrepublic: 'dominicanrep',
  drcongo: 'demrepcongo',
  equatorialguinea: 'eqguinea',
  northmacedonia: 'macedonia',
  republicofthecongo: 'congo',
  solomonislands: 'solomonis',
  southsudan: 'ssudan',
  unitedstates: 'unitedstatesofamerica',
  unitedstatesofamerica: 'unitedstatesofamerica',
};

interface RingBounds {
  readonly minLng: number;
  readonly maxLng: number;
  readonly minLat: number;
  readonly maxLat: number;
}

const buildCountryFeatureIndex = (
  features: ReadonlyArray<CountryFeature>
): ReadonlyMap<string, CountryFeature> => {
  const out = new Map<string, CountryFeature>();
  const add = (key: string | undefined, feature: CountryFeature): void => {
    if (!key) return;
    const raw = key.trim();
    if (!raw) return;
    out.set(raw, feature);
    out.set(countryKey(raw), feature);
    if (/^\d+$/.test(raw)) out.set(String(Number(raw)), feature);
  };
  for (const feature of features) {
    add(feature.id, feature);
    add(feature.name, feature);
  }
  return out;
};

const countryKey = (value: string): string => {
  const normal = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return COUNTRY_NAME_ALIASES[normal] ?? normal;
};

const findCountryFeature = (
  entry: HeatmapDataLayer['data'][number],
  featuresByKey: ReadonlyMap<string, CountryFeature>
): CountryFeature | null => {
  if (entry.id) {
    const byId = featuresByKey.get(entry.id) ?? featuresByKey.get(countryKey(entry.id));
    if (byId) return byId;
  }
  if (entry.name) {
    const byName = featuresByKey.get(entry.name) ?? featuresByKey.get(countryKey(entry.name));
    if (byName) return byName;
  }
  return null;
};

const paintCountryDomeSamples = (
  data: Float32Array,
  width: number,
  height: number,
  samples: ReadonlyArray<HeatmapDataLayer['data'][number]>,
  featuresByKey: ReadonlyMap<string, CountryFeature>,
  config: ResolvedHeatmapCountryDomeConfig
): Set<number> => {
  const painted = new Set<number>();
  for (let i = 0; i < samples.length; i++) {
    const entry = samples[i]!;
    const feature = findCountryFeature(entry, featuresByKey);
    if (!feature) continue;
    const polygon = chooseCountryDomePolygon(feature, entry.position);
    if (!polygon) continue;
    const ok = paintCountryDome(
      data,
      width,
      height,
      polygon,
      entry.position,
      entry.value * (entry.weight ?? 1),
      config
    );
    if (ok) painted.add(i);
  }
  return painted;
};

const chooseCountryDomePolygon = (
  feature: CountryFeature,
  center: readonly [number, number]
): CountryPolygon | null => {
  let largest: CountryPolygon | null = null;
  let largestArea = -1;
  for (const polygon of feature.polygons) {
    if (polygon.length === 0) continue;
    if (pointInPolygon(polygon, [center[1], center[0]])) return polygon;
    const area = polygonAreaScore(polygon);
    if (area > largestArea) {
      largestArea = area;
      largest = polygon;
    }
  }
  return largest;
};

const polygonAreaScore = (polygon: CountryPolygon): number => {
  const outer = polygon[0];
  if (!outer) return 0;
  const bounds = ringBoundsForPolygon(outer);
  const midLat = (bounds.minLat + bounds.maxLat) * 0.5;
  return (
    Math.max(0, bounds.maxLat - bounds.minLat) *
    Math.max(0, bounds.maxLng - bounds.minLng) *
    Math.max(0.2, Math.cos(midLat * DEG_TO_RAD))
  );
};

const applyDomeValuePreScale = (
  value: number,
  mode: ResolvedHeatmapCountryDomeConfig['valuePreScale']
): number => {
  if (value <= 0) return 0;
  switch (mode) {
    case 'log':
      return Math.log1p(value);
    case 'sqrt':
      return Math.sqrt(value);
    case 'linear':
    default:
      return value;
  }
};

const paintCountryDome = (
  data: Float32Array,
  width: number,
  height: number,
  polygon: CountryPolygon,
  centerLatLng: readonly [number, number],
  value: number,
  config: ResolvedHeatmapCountryDomeConfig
): boolean => {
  const outer = polygon[0];
  if (!outer || outer.length < 3 || value <= 0) return false;
  // Pre-scale the country's stamp magnitude (raw value) so per-country
  // gradients stay linear-shaped after the global density normalize step.
  // Without this, a global `log` normalize compresses values >> 1 into
  // a flat-top plateau across most of the country, which makes large
  // countries look like rectangular slabs instead of domes.
  if (value <= 0) return false;
  // Per-country normalize — every country's dome stamps to the same peak
  // (1.0) regardless of population, so big and small countries share the
  // exact same colour gradient and contour pattern. Cross-country
  // magnitude is dropped from the texture; the caller can convey it via
  // separate channels (height, opacity, palette tint) if needed.
  const stampPeak = config.perCountryNormalize
    ? 1
    : applyDomeValuePreScale(value, config.valuePreScale);
  if (stampPeak <= 0) return false;
  // When per-country normalize is on, multiple countries whose polygons
  // overlap (border imprecision, enclaves like Vatican / San Marino,
  // disputed regions) would otherwise SUM their dome stamps at shared
  // pixels — a single dome peaks at 1.0, so 3 overlapping domes would
  // produce a pixel value of 3.0. The global normalize step then divides
  // every pixel by that overlap peak, dimming every country including
  // the non-overlapping ones into invisibility. Using `max` per pixel
  // instead of `+=` keeps the texture range bounded to [0, 1] regardless
  // of overlap density.
  const accumulate: (idx: number, contribution: number) => void = config.perCountryNormalize
    ? (idx, c) => {
        if (c > data[idx]!) data[idx] = c;
      }
    : (idx, c) => {
        data[idx]! += c;
      };

  const rawBounds = ringBounds(outer);
  const crossesAnti = rawBounds.maxLng - rawBounds.minLng > 180;
  const shiftRing = (ring: ReadonlyArray<readonly [number, number]>) =>
    crossesAnti
      ? ring.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]] as const)
      : ring;
  const outerShifted = shiftRing(outer);
  const holesShifted = polygon.slice(1).map(shiftRing);
  const bounds = ringBounds(outerShifted);

  const requestedCenter = shiftCountryPoint(centerLatLng, bounds, crossesAnti);
  const center = chooseInteriorDomeCenter(outerShifted, holesShifted, bounds, requestedCenter);
  const centerLat = center[1];

  const v0 = Math.max(0, Math.floor(((90 - bounds.maxLat) / 180) * height));
  const v1 = Math.min(height - 1, Math.ceil(((90 - bounds.minLat) / 180) * height));
  if (v1 < v0) return false;

  const uRanges = countryLngPixelRanges(bounds, width, crossesAnti);
  if (uRanges.length === 0) return false;

  // Spherical scaling — lng deltas at this latitude shrink by cos(lat).
  // Using one cosLat per polygon (centred on the dome anchor) is a fine
  // approximation for everything except hemisphere-spanning polygons; the
  // distance-to-edge field is already smooth so a small lat-dependent
  // skew is invisible.
  const cosCenterLat = Math.max(0.08, Math.cos(centerLat * DEG_TO_RAD));

  // Two t-fields are computed per interior pixel and linearly blended by
  // `config.rounding`:
  //   - t_edge = 1 − d_edge / d_max     (rounded bubble; default rounding=1)
  //   - t_ray  = pixel_dist_from_anchor / boundary_along_ray
  //              (polygon-shape with sharp corners; rounding=0)
  // The shared anchor is the polygon's pole-of-inaccessibility — the
  // pixel where d_edge is maximal — so both fields agree on where the
  // dome's peak sits. When `rounding === 1` the ray-cast cost is skipped
  // entirely (the default fast path for new heat maps).
  const grid = buildEdgeGrid(outerShifted, holesShifted, bounds, cosCenterLat);
  const useRayBlend = config.rounding < 1 - 1e-4;

  // Pass 1: walk pixels in the bbox, retain only those inside the polygon
  // and record their distance to the nearest edge. Tracks the polygon's
  // inradius (= deepest interior point's distance) for normalisation, and
  // the lat/lng of that deepest point so Pass 2 can ray-cast from it when
  // a partial-rounding blend is requested.
  const interiorIdx: Array<number> = [];
  const interiorDist: Array<number> = [];
  let maxD = 0;
  let deepestLng = bounds.minLng;
  let deepestLat = bounds.minLat;
  for (let v = v0; v <= v1; v++) {
    const pixelLat = 90 - ((v + 0.5) / height) * 180;
    const row = v * width;
    for (const [u0, u1] of uRanges) {
      for (let u = u0; u <= u1; u++) {
        const pixelLngRaw = ((u + 0.5) / width) * 360 - 180;
        const pixelLng = crossesAnti && pixelLngRaw < 0 ? pixelLngRaw + 360 : pixelLngRaw;
        if (pixelLng < bounds.minLng || pixelLng > bounds.maxLng) continue;
        if (!pointInShiftedPolygon(outerShifted, holesShifted, [pixelLng, pixelLat])) continue;
        const d = edgeGridDistance(grid, pixelLng, pixelLat);
        interiorIdx.push(row + u);
        interiorDist.push(d);
        if (d > maxD) {
          maxD = d;
          deepestLng = pixelLng;
          deepestLat = pixelLat;
        }
      }
    }
  }

  if (interiorIdx.length === 0 || maxD <= 0) return false;

  // Pass 2: paint the dome using the recorded distance field, mixing in
  // the ray-cast t when the user requested less-than-full rounding.
  const invMaxD = 1 / maxD;
  const rounding = config.rounding;
  const oneMinusRounding = 1 - rounding;
  let wrote = false;
  for (let i = 0; i < interiorIdx.length; i++) {
    const idx = interiorIdx[i]!;
    const d = interiorDist[i]!;
    const tEdge = Math.min(1, Math.max(0, 1 - d * invMaxD));
    let t = tEdge;
    if (useRayBlend) {
      // Recover the pixel's lat/lng from idx — cheaper than holding a
      // 4-array per pixel.
      const v = Math.floor(idx / width);
      const u = idx - v * width;
      const pixelLat = 90 - ((v + 0.5) / height) * 180;
      const pixelLngRaw = ((u + 0.5) / width) * 360 - 180;
      const pixelLng = crossesAnti && pixelLngRaw < 0 ? pixelLngRaw + 360 : pixelLngRaw;
      const dxRay = (pixelLng - deepestLng) * cosCenterLat;
      const dyRay = pixelLat - deepestLat;
      const pixelDist = Math.hypot(dxRay, dyRay);
      let tRay = 0;
      if (pixelDist > 1e-6) {
        const dirX = dxRay / pixelDist;
        const dirY = dyRay / pixelDist;
        const boundary = rayPolygonBoundary(
          outerShifted,
          holesShifted,
          deepestLng,
          deepestLat,
          dirX,
          dirY,
          cosCenterLat
        );
        if (boundary > 1e-6) {
          tRay = Math.min(1, pixelDist / boundary);
        } else {
          tRay = tEdge;
        }
      }
      t = oneMinusRounding * tRay + rounding * tEdge;
    }
    const w = domeWeight(t, config);
    if (w <= 0) continue;
    accumulate(idx, stampPeak * w);
    wrote = true;
  }
  return wrote;
};

/**
 * First-hit distance from a 2D ray (origin in lng/lat, direction in
 * cos-lat-scaled space) to the polygon boundary. Used by the dome painter
 * when `rounding < 1` to compute the polygon-shape t-field.
 */
const rayPolygonBoundary = (
  outer: ReadonlyArray<readonly [number, number]>,
  holes: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  ox: number,
  oy: number,
  dirX: number,
  dirY: number,
  cosLat: number
): number => {
  let best = Infinity;
  const checkRing = (ring: ReadonlyArray<readonly [number, number]>): void => {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (!a || !b) continue;
      const ax = (a[0] - ox) * cosLat;
      const ay = a[1] - oy;
      const bx = (b[0] - ox) * cosLat;
      const by = b[1] - oy;
      const sx = bx - ax;
      const sy = by - ay;
      const denom = dirX * sy - dirY * sx;
      if (Math.abs(denom) < 1e-9) continue;
      const s = (ax * sy - ay * sx) / denom;
      const u = (ax * dirY - ay * dirX) / denom;
      if (s > 1e-5 && u >= -1e-5 && u <= 1 + 1e-5 && s < best) {
        best = s;
      }
    }
  };
  checkRing(outer);
  for (const hole of holes) checkRing(hole);
  return Number.isFinite(best) ? best : Infinity;
};

interface EdgeGrid {
  readonly cellSize: number;
  readonly minLng: number;
  readonly minLat: number;
  readonly cols: number;
  readonly rows: number;
  /** Per-cell list of edge indices (4 floats per edge in `edges`). */
  readonly cells: ReadonlyArray<Int32Array>;
  /** Flat edge buffer: [a.lng, a.lat, b.lng, b.lat, ...]. */
  readonly edges: Float32Array;
  /** cos(centreLat) — used to scale lng differences to spherical-equivalent. */
  readonly cosLat: number;
}

/**
 * Build a spatial hash over the polygon's outer + hole rings. Each cell
 * holds the indices of edges whose bounding box overlaps the cell.
 * `edgeGridDistance` searches outward from the cell containing the query
 * point, terminating once the current min distance is shorter than any
 * unscanned cell could produce. Typical cost per query is O(constant).
 */
const buildEdgeGrid = (
  outer: ReadonlyArray<readonly [number, number]>,
  holes: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  bounds: RingBounds,
  cosLat: number
): EdgeGrid => {
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 1e-3);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 1e-3);
  // Aim for ~16 cells along the longer axis. 16 keeps each cell holding
  // a handful of edges for typical countries; very small polygons get
  // a coarser grid (one cell) which is also fine.
  const cellSize = Math.max(lngSpan / 16, latSpan / 16, 0.1);
  const cols = Math.max(1, Math.ceil(lngSpan / cellSize));
  const rows = Math.max(1, Math.ceil(latSpan / cellSize));
  const cellSize2 = cellSize; // for clarity
  const cellLists: Array<Array<number>> = Array.from({ length: cols * rows }, () => []);
  const edgesFlat: Array<number> = [];

  const addRing = (ring: ReadonlyArray<readonly [number, number]>) => {
    if (ring.length < 2) return;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (!a || !b) continue;
      if (a[0] === b[0] && a[1] === b[1]) continue; // skip degenerate
      const idx = edgesFlat.length / 4;
      edgesFlat.push(a[0], a[1], b[0], b[1]);
      const minX = Math.min(a[0], b[0]);
      const maxX = Math.max(a[0], b[0]);
      const minY = Math.min(a[1], b[1]);
      const maxY = Math.max(a[1], b[1]);
      const cx0 = Math.max(0, Math.min(cols - 1, Math.floor((minX - bounds.minLng) / cellSize2)));
      const cx1 = Math.max(0, Math.min(cols - 1, Math.floor((maxX - bounds.minLng) / cellSize2)));
      const cy0 = Math.max(0, Math.min(rows - 1, Math.floor((minY - bounds.minLat) / cellSize2)));
      const cy1 = Math.max(0, Math.min(rows - 1, Math.floor((maxY - bounds.minLat) / cellSize2)));
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          cellLists[cy * cols + cx]!.push(idx);
        }
      }
    }
  };

  addRing(outer);
  for (const hole of holes) addRing(hole);

  const cells: Array<Int32Array> = cellLists.map((list) => Int32Array.from(list));
  return {
    cellSize,
    minLng: bounds.minLng,
    minLat: bounds.minLat,
    cols,
    rows,
    cells,
    edges: Float32Array.from(edgesFlat),
    cosLat,
  };
};

/**
 * Distance from `(lng, lat)` to the nearest edge in the grid, using
 * spherical-scaled lng deltas. Spirals outward by cell ring until the
 * current min is provably smaller than anything in unscanned cells.
 */
const edgeGridDistance = (grid: EdgeGrid, lng: number, lat: number): number => {
  const cosLat = grid.cosLat;
  const cx0 = Math.max(0, Math.min(grid.cols - 1, Math.floor((lng - grid.minLng) / grid.cellSize)));
  const cy0 = Math.max(0, Math.min(grid.rows - 1, Math.floor((lat - grid.minLat) / grid.cellSize)));
  const maxRadius = Math.max(grid.cols, grid.rows);
  const edges = grid.edges;
  let minD = Infinity;

  for (let radius = 0; radius <= maxRadius; radius++) {
    const x0 = Math.max(0, cx0 - radius);
    const x1 = Math.min(grid.cols - 1, cx0 + radius);
    const y0 = Math.max(0, cy0 - radius);
    const y1 = Math.min(grid.rows - 1, cy0 + radius);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        // Only scan the ring at this radius; interior cells were scanned
        // in earlier iterations.
        if (
          radius > 0 &&
          Math.max(Math.abs(cx - cx0), Math.abs(cy - cy0)) < radius
        ) {
          continue;
        }
        const cell = grid.cells[cy * grid.cols + cx]!;
        for (let i = 0; i < cell.length; i++) {
          const ei = cell[i]! * 4;
          const ax = edges[ei]!;
          const ay = edges[ei + 1]!;
          const bx = edges[ei + 2]!;
          const by = edges[ei + 3]!;
          const exSc = (bx - ax) * cosLat;
          const ey = by - ay;
          const len2 = exSc * exSc + ey * ey;
          const pxSc = (lng - ax) * cosLat;
          const py = lat - ay;
          let d: number;
          if (len2 < 1e-12) {
            d = Math.hypot(pxSc, py);
          } else {
            let s = (pxSc * exSc + py * ey) / len2;
            if (s < 0) s = 0;
            else if (s > 1) s = 1;
            const dxSc = pxSc - s * exSc;
            const dy = py - s * ey;
            d = Math.hypot(dxSc, dy);
          }
          if (d < minD) minD = d;
        }
      }
    }
    // After scanning the ring at `radius`, anything in unscanned rings is
    // at least `radius * cellSize` away in the spherical-scaled metric we
    // measure with. Once minD is below that, we're done.
    if (radius > 0 && minD <= radius * grid.cellSize) break;
  }
  return Number.isFinite(minD) ? minD : 0;
};

const countryLngPixelRanges = (
  bounds: RingBounds,
  width: number,
  crossesAnti: boolean
): ReadonlyArray<readonly [number, number]> => {
  const lngToU = (lng: number): number =>
    Math.floor((((lng + 180) / 360) * width + width) % width);
  const clampU = (u: number): number => Math.max(0, Math.min(width - 1, u));
  if (!crossesAnti) {
    return [[clampU(lngToU(bounds.minLng)), clampU(Math.ceil(((bounds.maxLng + 180) / 360) * width))]];
  }
  const leftStart = clampU(lngToU(bounds.minLng));
  const rightEnd = clampU(Math.ceil(((bounds.maxLng - 360 + 180) / 360) * width));
  return [
    [leftStart, width - 1],
    [0, rightEnd],
  ];
};

const shiftCountryPoint = (
  latLng: readonly [number, number],
  bounds: RingBounds,
  crossesAnti: boolean
): readonly [number, number] => {
  let lng = latLng[1];
  if (crossesAnti && lng < 0) lng += 360;
  return [
    clampCpu(lng, bounds.minLng, bounds.maxLng),
    clampCpu(latLng[0], bounds.minLat, bounds.maxLat),
  ];
};

const ringAreaCentroid = (
  ring: ReadonlyArray<readonly [number, number]>
): readonly [number, number] | null => {
  let cx = 0;
  let cy = 0;
  let A = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const cross = a[0] * b[1] - b[0] * a[1];
    A += cross;
    cx += (a[0] + b[0]) * cross;
    cy += (a[1] + b[1]) * cross;
  }
  if (Math.abs(A) < 1e-12) return null;
  A *= 0.5;
  return [cx / (6 * A), cy / (6 * A)];
};

/**
 * Pick a dome-anchor inside the polygon. Strategy:
 *  1. If the user-supplied centroid is inside the polygon AND not in a
 *     pinched corner, use it — it's the caller's intentional placement.
 *  2. Else try the area-weighted centroid (fast, good for convex-ish
 *     countries; lands deep in the polygon for compact shapes).
 *  3. Else the bbox centre, then a grid search for the closest interior
 *     point to the user request.
 *
 * The area centroid is preferred over the bbox centre because for L-shaped
 * countries (Norway, Chile) the bbox centre often lands in ocean. The area
 * centroid is biased toward the geometric mass and tends to stay inside.
 */
const chooseInteriorDomeCenter = (
  outer: ReadonlyArray<readonly [number, number]>,
  holes: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  bounds: RingBounds,
  requested: readonly [number, number]
): readonly [number, number] => {
  if (pointInShiftedPolygon(outer, holes, requested)) return requested;

  const areaC = ringAreaCentroid(outer);
  if (areaC && pointInShiftedPolygon(outer, holes, areaC)) return areaC;

  const bboxCenter = [
    (bounds.minLng + bounds.maxLng) * 0.5,
    (bounds.minLat + bounds.maxLat) * 0.5,
  ] as const;
  if (pointInShiftedPolygon(outer, holes, bboxCenter)) return bboxCenter;

  let best: readonly [number, number] | null = null;
  let bestD2 = Infinity;
  const cols = 18;
  const rows = 18;
  for (let iy = 0; iy <= rows; iy++) {
    const lat = bounds.minLat + ((bounds.maxLat - bounds.minLat) * iy) / rows;
    for (let ix = 0; ix <= cols; ix++) {
      const lng = bounds.minLng + ((bounds.maxLng - bounds.minLng) * ix) / cols;
      const p = [lng, lat] as const;
      if (!pointInShiftedPolygon(outer, holes, p)) continue;
      const dx = lng - requested[0];
      const dy = lat - requested[1];
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = p;
      }
    }
  }
  return best ?? bboxCenter;
};

const ringBoundsForPolygon = (ring: ReadonlyArray<readonly [number, number]>): RingBounds => {
  const raw = ringBounds(ring);
  if (raw.maxLng - raw.minLng <= 180) return raw;
  return ringBounds(ring.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]] as const));
};

const pointInPolygon = (
  polygon: CountryPolygon,
  point: readonly [lng: number, lat: number]
): boolean => {
  const outer = polygon[0];
  if (!outer) return false;
  const rawBounds = ringBounds(outer);
  const crossesAnti = rawBounds.maxLng - rawBounds.minLng > 180;
  const shiftRing = (ring: ReadonlyArray<readonly [number, number]>) =>
    crossesAnti
      ? ring.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]] as const)
      : ring;
  const lng = crossesAnti && point[0] < 0 ? point[0] + 360 : point[0];
  return pointInShiftedPolygon(shiftRing(outer), polygon.slice(1).map(shiftRing), [
    lng,
    point[1],
  ]);
};

const pointInShiftedPolygon = (
  outer: ReadonlyArray<readonly [number, number]>,
  holes: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  point: readonly [number, number]
): boolean => {
  if (!pointInRing(outer, point)) return false;
  for (const hole of holes) {
    if (pointInRing(hole, point)) return false;
  }
  return true;
};

const pointInRing = (
  ring: ReadonlyArray<readonly [number, number]>,
  point: readonly [number, number]
): boolean => {
  const [x, y] = point;
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const [xi, yi] = a;
    const [xj, yj] = b;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const ringBounds = (ring: ReadonlyArray<readonly [number, number]>): RingBounds => {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of ring) {
    if (p[0] < minLng) minLng = p[0];
    if (p[0] > maxLng) maxLng = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  return { minLng, maxLng, minLat, maxLat };
};

const domeWeight = (
  t: number,
  config: Pick<ResolvedHeatmapCountryDomeConfig, 'centerArea' | 'shoulderHeight' | 'edgeSteepness'>
): number => {
  if (t >= 1) return 0;
  const crownRadius = Math.sqrt(config.centerArea);
  if (t <= crownRadius) {
    const q = t / Math.max(1e-6, crownRadius);
    const rounded = q * q * (3 - 2 * q);
    return 1 - (1 - config.shoulderHeight) * rounded;
  }
  const q = (t - crownRadius) / Math.max(1e-6, 1 - crownRadius);
  const wall = 1 - q * q * (3 - 2 * q);
  return config.shoulderHeight * Math.pow(Math.max(0, wall), config.edgeSteepness);
};

/**
 * Bake-key — a hash of every layer field that affects the density texture
 * contents. If two consecutive setData() calls produce the same key, we
 * skip the (expensive) paintSample loop and re-use the existing texture.
 * Slider drags on intensity / threshold / curve / palette / displacement
 * therefore stay buttery: only shader uniforms get touched.
 *
 * `data` is compared by reference — heavy datasets (USGS-30k) are usually
 * the same array between slider ticks, so this is the right unit.
 */
const sampleArrayIds = new WeakMap<ReadonlyArray<HeatmapDataLayer['data'][number]>, number>();
let nextSampleArrayId = 1;

const getSampleArrayId = (
  samples: ReadonlyArray<HeatmapDataLayer['data'][number]>
): number => {
  const existing = sampleArrayIds.get(samples);
  if (existing !== undefined) return existing;
  const id = nextSampleArrayId++;
  sampleArrayIds.set(samples, id);
  return id;
};

const computeBakeKey = (layer: HeatmapDataLayer): string => {
  const samplesId =
    `id=${getSampleArrayId(layer.data)}|len=${layer.data.length}` +
    // Debug-friendly content tags. The weak-map id is the actual identity
    // guard; these keep the key readable in traces.
    (layer.data.length > 0
      ? `|first=${asLatLngTag(layer.data[0]!.position)}|last=${asLatLngTag(
          layer.data[layer.data.length - 1]!.position
        )}|sum0=${layer.data[0]!.value}`
      : '');
  return [
    samplesId,
    `r=${layer.radius ?? ''}`,
    `k=${layer.kernel ?? ''}`,
    `cd=${countryDomeKey(layer.countryDomes)}`,
    `b=${layer.blurPasses ?? ''}`,
    `n=${layer.normalize ?? ''}`,
    `m=${layer.absoluteMax ?? ''}`,
    `tw=${layer.textureResolution?.width ?? ''}`,
    `th=${layer.textureResolution?.height ?? ''}`,
  ].join('|');
};

const computePaletteKey = (layer: HeatmapDataLayer): string => {
  const s = layer.scale;
  if (!s) return 'none';
  if (s.type === 'sequential' || s.type === 'diverging') {
    return `${s.type}|${stringifyPalette(s.palette)}`;
  }
  if (s.type === 'threshold') {
    return `threshold|${s.thresholds.join(',')}|${s.colors.join(',')}`;
  }
  return `categorical|${Object.keys(s.colors).join(',')}|${Object.values(s.colors).join(',')}`;
};

const stringifyPalette = (p: unknown): string =>
  Array.isArray(p) ? p.join(',') : String(p ?? '');

const asLatLngTag = (p: readonly [number, number]): string =>
  `${p[0].toFixed(3)},${p[1].toFixed(3)}`;

/**
 * Stamp a single sample's kernel into the density buffer. Only iterates
 * pixels inside the sample's lat/lng bounding box.
 *
 * Hot loop optimisations:
 *  - distance test uses cosine of the angle (dot product) instead of
 *    `Math.acos` — cuts ~70% of the per-pixel cost in profiling.
 *  - kernel weights are computed from squared chord length `c² = 2(1-cosD)`
 *    rather than great-circle arc length, removing another `acos` from the
 *    Gaussian / quartic path. The mapping `c² ↔ ang²` is monotonic on
 *    [0, π], so the kernel curve preserves shape — the visual difference
 *    is sub-pixel even at huge radii.
 */
const paintSample = (
  data: Float32Array,
  width: number,
  height: number,
  lat: number,
  lng: number,
  radiusRad: number,
  value: number,
  kernel: HeatmapKernel
): void => {
  const cu = ((lng + 180) / 360) * width;
  const cv = ((90 - lat) / 180) * height;
  const radiusDeg = (radiusRad * 180) / Math.PI;

  const dvPx = Math.ceil((radiusDeg / 180) * height);
  const v0 = Math.max(0, Math.floor(cv - dvPx));
  const v1 = Math.min(height - 1, Math.ceil(cv + dvPx));

  const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const duDeg = radiusDeg / cosLat;
  const duPx = Math.ceil((duDeg / 360) * width);

  const sinLat = Math.sin((lat * Math.PI) / 180);
  const cosLatExact = Math.cos((lat * Math.PI) / 180);

  // Chord cutoff — c² when the angle equals radiusRad. Pixels beyond this
  // are skipped without an acos call.
  const cosR = Math.cos(radiusRad);
  const chordSqMax = 2 * (1 - cosR); // = (2 sin(r/2))²
  const invChordSqMax = chordSqMax > 0 ? 1 / chordSqMax : 0;

  // Pre-compute deg→rad scaling so the inner loop avoids repeated *π/180.
  const degToRad = Math.PI / 180;
  const lngRad = lng * degToRad;

  for (let v = v0; v <= v1; v++) {
    const pixelLat = 90 - ((v + 0.5) / height) * 180;
    const pLatRad = pixelLat * degToRad;
    const sinPL = Math.sin(pLatRad);
    const cosPL = Math.cos(pLatRad);
    const rowOffset = v * width;
    for (let du = -duPx; du <= duPx; du++) {
      let u = Math.floor(cu + du);
      if (u < 0) u += width;
      else if (u >= width) u -= width;
      const pLngRad = ((u + 0.5) / width) * 2 * Math.PI - Math.PI;
      const cosD = sinLat * sinPL + cosLatExact * cosPL * Math.cos(pLngRad - lngRad);
      // Cheap reject — anything beyond the kernel radius is skipped without
      // ever touching acos / sqrt.
      if (cosD < cosR) continue;
      const chordSq = 2 * (1 - cosD);
      const t2 = chordSq * invChordSqMax; // (chord/maxChord)² ∈ [0, 1]
      const w = applyKernelChord(kernel, t2);
      if (w <= 0) continue;
      data[rowOffset + u]! += value * w;
    }
  }
};

/**
 * Kernel evaluated against a squared-chord ratio t² ∈ [0, 1] (0 at the
 * sample centre, 1 at the radius cutoff). Avoids acos in the hot path.
 *
 * Gaussian uses `exp(-4 t²)` so the kernel falls to ~0.018 at the cutoff,
 * matching the previous angular-distance implementation closely. Other
 * kernels use the same shape parametrisation as before with t = sqrt(t²).
 */
const applyKernelChord = (kernel: HeatmapKernel, t2: number): number => {
  switch (kernel) {
    case 'gaussian':
      return Math.exp(-4 * t2);
    case 'epanechnikov':
      return Math.max(0, 1 - t2);
    case 'quartic': {
      const k = 1 - t2;
      return k > 0 ? k * k : 0;
    }
    case 'dome':
      return domeWeight(Math.sqrt(Math.max(0, t2)), {
        centerArea: 0.5,
        shoulderHeight: 0.52,
        edgeSteepness: 2.2,
      });
    case 'uniform':
      return t2 <= 1 ? 1 : 0;
  }
};

/**
 * Separable 3-tap box blur applied N times. Three iterations approximate a
 * Gaussian close enough for our taste. Wraps in U (longitude) and clamps in
 * V (latitude), matching the texture's wrap modes.
 */
const blurDensity = (
  data: Float32Array,
  width: number,
  height: number,
  passes: number
): void => {
  const tmp = new Float32Array(data.length);
  for (let pass = 0; pass < passes; pass++) {
    // Horizontal — wraps longitude.
    for (let v = 0; v < height; v++) {
      const row = v * width;
      for (let u = 0; u < width; u++) {
        const um = u === 0 ? width - 1 : u - 1;
        const up = u === width - 1 ? 0 : u + 1;
        tmp[row + u] = (data[row + um]! + data[row + u]! + data[row + up]!) / 3;
      }
    }
    // Vertical — clamps latitude.
    for (let v = 0; v < height; v++) {
      const vm = v === 0 ? 0 : v - 1;
      const vp = v === height - 1 ? height - 1 : v + 1;
      for (let u = 0; u < width; u++) {
        data[v * width + u] =
          (tmp[vm * width + u]! + tmp[v * width + u]! + tmp[vp * width + u]!) / 3;
      }
    }
  }
};

const writePalette = (
  data: Float32Array,
  steps: number,
  layer: HeatmapDataLayer,
  fallback: string
): void => {
  const fallbackColor = new Color(fallback);
  const tmp = new Color();
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1);
    let resolved: Color;
    if (layer.scale) {
      const sample = sampleScaleAtT(layer.scale, t);
      if (sample) {
        tmp.set(sample);
        resolved = tmp;
      } else {
        resolved = fallbackColor;
      }
    } else {
      resolved = fallbackColor;
    }
    data[i * 4 + 0] = resolved.r;
    data[i * 4 + 1] = resolved.g;
    data[i * 4 + 2] = resolved.b;
    data[i * 4 + 3] = 1;
  }
};

const sampleScaleAtT = (scale: ScaleConfig, t: number): string | null => {
  if (scale.type === 'sequential' || scale.type === 'diverging') {
    return colorForValue(scale, t, [0, 1]);
  }
  if (scale.type === 'threshold') {
    let bucket = 0;
    for (const th of scale.thresholds) {
      if (t < th) break;
      bucket++;
    }
    return scale.colors[bucket] ?? scale.colors[scale.colors.length - 1] ?? null;
  }
  const keys = Object.keys(scale.colors);
  if (keys.length === 0) return null;
  const idx = Math.min(keys.length - 1, Math.floor(t * keys.length));
  return scale.colors[keys[idx]!] ?? null;
};

// IMPORTANT: pass per-vertex 3D DIRECTION (not UV) and let the fragment
// recompute UV per-pixel. Linear vUv interpolation breaks at the
// antimeridian seam — neighbouring vertices land at u≈0 and u≈1, the
// linear lerp goes through u=0.5 (Greenwich) and the fragment ends up
// sampling density at completely the wrong meridian. Direction is
// continuous in 3D and atan2(z,-x) handles the wrap automatically.
//
// The vertex shader uses uDispCurve (decoupled from colour curve) so 3D
// peaks can stay smooth (smoothstep / sqrt) even when the colour ramp is
// sharp (cubic). It also samples four neighbouring texels to derive an
// analytical surface normal, used for Lambert shading in the fragment.
const VERTEX_SHADER = /* glsl */ `
uniform sampler2D uDensity;
uniform vec2 uTextureSize;
uniform float uMaxHeight;
uniform float uZoomHeightScale;
uniform float uIntensity;
uniform float uThreshold;
uniform float uZoomThresholdBoost;
uniform int uCurve;
uniform int uDispCurve;

varying vec3 vDir;
varying vec3 vNormal;
varying float vShaped;
varying float vRadialFacing;

float curveFn(float v, int curveCode) {
  if (curveCode == 0) return v;
  if (curveCode == 1) return v * v * (3.0 - 2.0 * v);
  if (curveCode == 2) return v * v * v;
  return sqrt(v);
}

vec2 dirToUv(vec3 dir) {
  float lat = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  float theta = degrees(atan(dir.z, -dir.x));
  return vec2(theta / 360.0, (90.0 - lat) / 180.0);
}

// Intensity is applied as a gamma-style curve t = pow(d, 1/intensity)
// instead of a linear multiply. With per-country normalisation, every
// country's dome stamps already span [0, 1], so a linear d * intensity
// would clamp the entire crown to 1.0 (sharp flat plateau colour) for
// every country whenever intensity > 1. Gamma boosts mid-tones while
// keeping the peak at exactly 1.0 — visible gradient even for big
// populated countries.
float applyIntensity(float d, float intensity) {
  if (intensity <= 0.0) return 0.0;
  if (abs(intensity - 1.0) < 1e-4) return clamp(d, 0.0, 1.0);
  return clamp(pow(clamp(d, 0.0, 1.0), 1.0 / intensity), 0.0, 1.0);
}

float displacementAtUv(vec2 uv) {
  float d = texture2D(uDensity, uv).r;
  float t = applyIntensity(d, uIntensity);
  float threshold = clamp(uThreshold + uZoomThresholdBoost, 0.0, 0.95);
  float gated = max(0.0, (t - threshold) / max(1e-4, 1.0 - threshold));
  return curveFn(gated, uDispCurve);
}

void main() {
  vec3 dir = normalize(position);
  vDir = dir;
  vec2 uv = dirToUv(dir);

  float shaped = displacementAtUv(uv);
  vShaped = shaped;

  // Analytical surface normal — sample displacement at four neighbours,
  // build tangent-space gradients, derive normal as (radial - gradient).
  // Without this the displaced surface is unlit and looks like a flat
  // colour decal rather than 3D terrain.
  float maxHeight = uMaxHeight * uZoomHeightScale;
  if (maxHeight > 0.0) {
    vec2 dx = vec2(1.0 / uTextureSize.x, 0.0);
    vec2 dy = vec2(0.0, 1.0 / uTextureSize.y);
    float hL = displacementAtUv(uv - dx);
    float hR = displacementAtUv(uv + dx);
    float hU = displacementAtUv(uv - dy);
    float hD = displacementAtUv(uv + dy);
    // Tangent basis on the sphere at this point.
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), dir));
    vec3 north = normalize(cross(dir, east));
    // dx samples are 1 texel apart on the sphere; convert to world units.
    // East step covers (2π / W) rad longitude, scaled by cos(lat) via
    // the implicit equirect compression — but since we want a relative
    // gradient, the absolute scale just becomes part of the slope and
    // cancels out via final normalisation. We multiply by maxHeight so
    // the gradient magnitude tracks the actual displacement.
    float slopeE = (hR - hL) * maxHeight * 0.5;
    float slopeN = (hU - hD) * maxHeight * 0.5;
    // Tangent-space step in world units (approximation — good enough
    // for the visual cue we want).
    float texelArc = 6.2831853 / uTextureSize.x;
    vec3 grad = east * (slopeE / max(texelArc, 1e-4)) + north * (slopeN / max(texelArc, 1e-4));
    vNormal = normalize(dir - grad);
  } else {
    vNormal = dir;
  }

  vec3 displaced = position + dir * (shaped * maxHeight);
  vNormal = normalize((modelMatrix * vec4(vNormal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vec3 worldRadial = normalize((modelMatrix * vec4(dir, 0.0)).xyz);
  vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
  vRadialFacing = max(0.0, dot(worldRadial, viewDir));
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

// uBlendMode: 0 = normal alpha blend (vivid colour overlay, deck.gl style)
//             1 = additive (premultiply by alpha so cool regions add nothing)
const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uDensity;
uniform sampler2D uPalette;
uniform float uIntensity;
uniform float uThreshold;
uniform float uZoomThresholdBoost;
uniform float uOpacity;
uniform float uZoomOpacityScale;
uniform float uShading;
uniform vec3 uLightDir;
uniform float uRimFade;
uniform int uGridEnabled;
uniform vec3 uGridColor;
uniform float uGridStepDeg;
uniform float uGridWidthDeg;
uniform float uGridOpacity;
uniform float uGridMajorStepDeg;
uniform float uGridMajorOpacity;
uniform float uGridDensityFade;
uniform float uGridZoomScale;
uniform int uContourEnabled;
uniform vec3 uContourColor;
uniform float uContourInterval;
uniform float uContourWidth;
uniform float uContourOpacity;
uniform float uContourMajorInterval;
uniform float uContourMajorOpacity;
uniform float uContourDensityFade;
uniform float uContourZoomScale;
uniform int uCurve;
uniform int uBlendMode;

varying vec3 vDir;
varying vec3 vNormal;
varying float vShaped;
varying float vRadialFacing;

float curveFn(float v, int curveCode) {
  if (curveCode == 0) return v;
  if (curveCode == 1) return v * v * (3.0 - 2.0 * v);
  if (curveCode == 2) return v * v * v;
  return sqrt(v);
}

vec2 dirToUv(vec3 dir) {
  float lat = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  float theta = degrees(atan(dir.z, -dir.x));
  return vec2(theta / 360.0, (90.0 - lat) / 180.0);
}

float gridLine(float coord, float stepDeg, float widthDeg) {
  float stepSafe = max(stepDeg, 0.001);
  float d = abs(fract(coord / stepSafe + 0.5) - 0.5) * stepSafe;
  float aa = max(fwidth(coord), 0.015);
  return 1.0 - smoothstep(widthDeg, widthDeg + aa, d);
}

float gridMask(vec3 dir, float shaped) {
  if (uGridEnabled == 0) return 0.0;
  float lat = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  float lng = degrees(atan(dir.z, -dir.x));
  float minor = max(
    gridLine(lat, uGridStepDeg, uGridWidthDeg),
    gridLine(lng, uGridStepDeg, uGridWidthDeg)
  );
  float major = max(
    gridLine(lat, uGridMajorStepDeg, uGridWidthDeg * 1.45),
    gridLine(lng, uGridMajorStepDeg, uGridWidthDeg * 1.45)
  );
  float densityGate = mix(
    0.28,
    1.0,
    smoothstep(0.0, max(0.001, uGridDensityFade), shaped)
  );
  return max(minor * uGridOpacity, major * uGridMajorOpacity) * densityGate * uGridZoomScale;
}

float contourLine(float value, float interval, float width) {
  float safeInterval = max(interval, 0.001);
  float d = abs(fract(value / safeInterval + 0.5) - 0.5) * safeInterval;
  float aa = max(fwidth(value), 0.0015);
  return 1.0 - smoothstep(width, width + aa, d);
}

float contourMask(float shaped) {
  if (uContourEnabled == 0) return 0.0;
  if (shaped <= uContourDensityFade) return 0.0;
  float densityGate = smoothstep(uContourDensityFade, min(1.0, uContourDensityFade + 0.12), shaped);
  float minor = contourLine(shaped, uContourInterval, uContourWidth);
  float major = contourLine(shaped, uContourMajorInterval, uContourWidth * 1.5);
  return max(minor * uContourOpacity, major * uContourMajorOpacity) * densityGate * uContourZoomScale;
}

void main() {
  vec3 dir = normalize(vDir);
  vec2 uv = dirToUv(dir);

  float d = texture2D(uDensity, uv).r;
  // Gamma-style intensity (matches the vertex shader). Linear * intensity
  // would clip the entire dome crown to 1.0 under per-country normalize.
  float t;
  if (uIntensity <= 0.0) {
    t = 0.0;
  } else if (abs(uIntensity - 1.0) < 1e-4) {
    t = clamp(d, 0.0, 1.0);
  } else {
    t = clamp(pow(clamp(d, 0.0, 1.0), 1.0 / uIntensity), 0.0, 1.0);
  }
  float threshold = clamp(uThreshold + uZoomThresholdBoost, 0.0, 0.95);
  float gated = max(0.0, (t - threshold) / max(1e-4, 1.0 - threshold));
  float shaped = curveFn(clamp(gated, 0.0, 1.0), uCurve);
  float rim = uRimFade <= 0.0 ? 1.0 : smoothstep(0.0, uRimFade, vRadialFacing);
  if (rim <= 0.001) discard;

  vec4 col = texture2D(uPalette, vec2(shaped, 0.5));

  // Lambert-style shading on the displaced surface — gives the 3D peaks
  // visible volume instead of looking like flat decals. Skipped (lambert
  // = 1) when uShading is 0 or the normal collapses to the radial
  // direction (flat regions).
  vec3 normal = normalize(vNormal);
  float lambert = max(0.0, dot(normal, normalize(uLightDir)));
  // Soft floor so shadowed slopes don't go fully black.
  lambert = mix(1.0, mix(0.45, 1.0, lambert), uShading);

  vec3 shaded = col.rgb * lambert;
  float grid = clamp(gridMask(dir, shaped) * rim, 0.0, 0.85);
  float contour = clamp(contourMask(shaped) * rim, 0.0, 0.9);
  if (shaped <= 0.001 && grid <= 0.001 && contour <= 0.001) discard;
  shaded = mix(shaded, uGridColor, min(0.85, grid * 1.05));
  shaded = mix(shaded, uContourColor, contour);

  float alpha = col.a * shaped * uOpacity * uZoomOpacityScale * rim;
  alpha = max(alpha, grid * 0.82);
  alpha = max(alpha, contour * 0.9);
  if (uBlendMode == 1) {
    gl_FragColor = vec4(shaded * shaped, alpha);
  } else {
    gl_FragColor = vec4(shaded, alpha);
  }
}
`;
