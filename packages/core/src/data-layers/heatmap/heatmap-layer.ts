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
import type { HeatmapDataLayer, HeatmapNormalize } from '../types';
import type { CountryFeature } from '../../renderer/country-feature';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './shaders';
import { encodeCurve } from './kernels';
import { lerpCpu, smoothstepCpu } from './polygon-utils';
import { writePalette } from './palette';
import { computeBakeKey, computePaletteKey } from './bake-keys';
import {
  DISABLED_ZOOM_SCALING,
  resolveContourConfig,
  resolveCountryDomeConfig,
  resolveGridConfig,
  resolveZoomScaling,
  type ResolvedHeatmapZoomScalingConfig,
} from './config';
import { blurDensity, paintSample } from './radial-baker';
import { paintCountryDomeSamples } from './country-dome';
import { buildCountryFeatureIndex } from './country-features';

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

const EMPTY_SAMPLE_SET = new Set<number>();

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
