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
import { clampCpu, lerpCpu, smoothstepCpu } from './polygon-utils';
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
import {
  DISABLED_ANIMATION,
  animationBakeTag,
  buildEasingLut,
  easingFunctionFor,
  encodeAnimationStyle,
  entryAnimationDelaySec,
  resolveAnimationConfig,
  type ResolvedHeatmapAnimationConfig,
} from './animation';

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
   * Animation state. `animConfig` mirrors the layer's resolved animation;
   * `animElapsedSec` advances each tick when `enabled` and `trigger==='init'`.
   * `easingLut` is a 1×256 RGBA Float texture re-built whenever the easing
   * name changes; the shader samples it for per-pixel `localT` curve.
   * `delayMapTexture` is the per-pixel start-time map (allocated lazily —
   * only once any sample needs a non-zero delay; otherwise a 1×1 zero-stub
   * keeps the uniform binding type-correct).
   */
  private animConfig: ResolvedHeatmapAnimationConfig = DISABLED_ANIMATION;
  private animElapsedSec = 0;
  private animLastEasing = '';
  /**
   * Max per-pixel delay encountered during the last bake (seconds). Lets
   * `animHasMore()` keep ticking until even the most-delayed country has
   * had a chance to finish — without this, late-staggered domes would
   * never reach t=1 because the layer-wide tick would have stopped.
   */
  private animMaxPixelDelaySec = 0;
  private animLastBakeTag = '';
  private easingLut: DataTexture;
  private delayMapTexture: DataTexture;
  private delayMapData: Float32Array;
  private delayMapHasContent = false;
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

    // Easing LUT (1×256 RGBA Float). Re-encoded each time the resolved
    // animation easing changes — cheap enough we don't bother caching.
    this.animConfig = resolveAnimationConfig(layer.animation);
    const easingLutData = buildEasingLut(this.animConfig.easing) as unknown as Float32Array<ArrayBuffer>;
    this.easingLut = new DataTexture(
      easingLutData,
      256,
      1,
      RGBAFormat,
      FloatType
    );
    this.easingLut.minFilter = LinearFilter;
    this.easingLut.magFilter = LinearFilter;
    this.easingLut.wrapS = ClampToEdgeWrapping;
    this.easingLut.wrapT = ClampToEdgeWrapping;
    this.easingLut.needsUpdate = true;
    this.animLastEasing = this.animConfig.easing;

    // Delay map starts as a 1×1 zero texture so the shader sampler binding
    // is always valid; if any sample needs a non-zero delay the bake path
    // promotes this to a full-resolution Float32 R texture (see ensureDelayMap).
    this.delayMapData = new Float32Array(1);
    this.delayMapTexture = new DataTexture(
      this.delayMapData as unknown as Float32Array<ArrayBuffer>,
      1,
      1,
      RedFormat,
      FloatType
    );
    this.delayMapTexture.minFilter = LinearFilter;
    this.delayMapTexture.magFilter = LinearFilter;
    this.delayMapTexture.wrapS = RepeatWrapping;
    this.delayMapTexture.wrapT = ClampToEdgeWrapping;
    this.delayMapTexture.needsUpdate = true;

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
    const animBakeTag = animationBakeTag(layer.animation);
    const bakeChanged =
      bakeKey !== this.lastBakeKey || animBakeTag !== this.animLastBakeTag;
    if (bakeChanged) {
      this.applyData(layer);
      this.lastBakeKey = bakeKey;
      this.animLastBakeTag = animBakeTag;
      // Re-trigger the init animation when the dataset / animation timing
      // actually changed. Keeps mid-flight HUD slider tweaks (intensity,
      // curve) from re-playing the bloom every keystroke.
      const cfg = resolveAnimationConfig(layer.animation);
      if (cfg.enabled && cfg.trigger === 'init') this.animElapsedSec = 0;
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

  /**
   * Advance the mount/init animation by `deltaSec` and write `uAnimT` /
   * `uAnimTimeSec` into the shader. Cheap no-op when the animation is
   * disabled or already complete (the delay-map path can keep "completing"
   * pixels for an extra `maxDelay` window — see `animHasMore()`).
   */
  public tick(deltaSec: number): void {
    if (!this.animConfig.enabled) return;
    if (!this.animHasMore()) return;
    this.animElapsedSec += Math.max(0, deltaSec);
    const u = this.material.uniforms;
    u['uAnimTimeSec']!.value = this.animElapsedSec;
    const rawT = clampCpu(
      (this.animElapsedSec - this.animConfig.delay) / Math.max(1e-4, this.animConfig.duration),
      0,
      1
    );
    u['uAnimT']!.value = easingFunctionFor(this.animConfig.easing)(rawT);
  }

  /**
   * Restart the init animation from t=0. Storyteller hook for the future:
   * once we wire `'enter'` / `'leave'` triggers, this same path resets the
   * timeline; the `target` selector argument is reserved for the per-entry
   * variant (rebuilds the delay map masking only the matched samples).
   */
  public playAnimation(): void {
    if (!this.animConfig.enabled) return;
    this.animElapsedSec = 0;
    const u = this.material.uniforms;
    u['uAnimT']!.value = 0;
    u['uAnimTimeSec']!.value = 0;
  }

  /**
   * `true` while at least one pixel still has unfinished animation. The
   * delay-map case can run past the layer-wide window because each pixel
   * adds its own `pixelDelay`. We approximate this by tracking the max
   * delay encountered during the last bake.
   */
  private animHasMore(): boolean {
    if (!this.animConfig.enabled) return false;
    const totalSec =
      this.animConfig.delay + this.animConfig.duration + this.animMaxPixelDelaySec;
    return this.animElapsedSec < totalSec + 0.05;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.densityTexture.dispose();
    this.paletteTexture.dispose();
    this.easingLut.dispose();
    this.delayMapTexture.dispose();
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
      // Animation uniforms — `uAnimT` is the layer-wide eased value (used
      // when the delay map is absent / 1×1), `uAnimTimeSec` is real elapsed
      // time fed to the per-pixel path so delay-map pixels can reproduce
      // their own local timeline. `uHasDelayMap=0` skips the texture read.
      uDelayMap: { value: this.delayMapTexture },
      uEasingLut: { value: this.easingLut },
      uAnimEnabled: { value: this.animConfig.enabled ? 1 : 0 },
      uAnimStyle: { value: encodeAnimationStyle(this.animConfig.style) },
      uAnimHasDelayMap: { value: 0 },
      uAnimT: { value: this.animConfig.enabled ? 0 : 1 },
      uAnimTimeSec: { value: 0 },
      uAnimDurationSec: { value: this.animConfig.duration },
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
    this.applyAnimationUniforms(layer);
    this.zoomScaling = resolveZoomScaling(layer.zoomScaling);
    this.applyZoomScaling(this.lastCameraDistance);
  }

  /**
   * Reconcile the resolved animation config with the shader uniforms.
   * Re-encodes the easing LUT only when the easing name changed (cheap,
   * but no point doing it every slider movement). Toggling `enabled` mid-
   * play snaps the layer to its final state to avoid a frozen-mid-animation
   * artifact when the user disables it from the HUD.
   */
  private applyAnimationUniforms(layer: HeatmapDataLayer): void {
    const next = resolveAnimationConfig(layer.animation);
    const u = this.material.uniforms;
    u['uAnimEnabled']!.value = next.enabled ? 1 : 0;
    u['uAnimStyle']!.value = encodeAnimationStyle(next.style);
    u['uAnimDurationSec']!.value = next.duration;
    if (!next.enabled) {
      u['uAnimT']!.value = 1;
    }
    if (next.easing !== this.animLastEasing) {
      const lut = this.easingLut.image.data as unknown as Float32Array;
      lut.set(buildEasingLut(next.easing));
      this.easingLut.needsUpdate = true;
      this.animLastEasing = next.easing;
    }
    this.animConfig = next;
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
      this.resetDelayMap();
      return;
    }

    const animCfg = resolveAnimationConfig(layer.animation);
    const { entryDelaysSec, needsDelayMap, maxDelaySec } = this.computeEntryDelays(
      samples,
      animCfg
    );
    const delayMap = needsDelayMap ? this.ensureDelayMap() : undefined;

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
            countryDomes,
            delayMap,
            entryDelaysSec
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
        kernel,
        delayMap,
        entryDelaysSec?.[i]
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

    // Finalise the delay map: replace the painter's "unset" sentinel with
    // 0 (start at t=0 = follow the layer-wide bloom). Update the shader
    // toggle + remember the worst-case delay so `tick()` keeps running
    // until even the latest staggered country has had a chance to finish.
    this.finaliseDelayMap(needsDelayMap, maxDelaySec);
  }

  /**
   * Walk samples once to build the per-entry effective delay (seconds).
   * Returns `needsDelayMap=false` when every sample resolves to the same
   * delay as the layer-wide config — in that case the shader can skip the
   * delay-map texture sample and use `uAnimT` directly, saving GPU work
   * and avoiding the 8MB delay-map allocation entirely.
   */
  private computeEntryDelays(
    samples: ReadonlyArray<HeatmapDataLayer['data'][number]>,
    animCfg: ResolvedHeatmapAnimationConfig
  ): {
    readonly entryDelaysSec: ReadonlyArray<number> | undefined;
    readonly needsDelayMap: boolean;
    readonly maxDelaySec: number;
  } {
    if (!animCfg.enabled) {
      return { entryDelaysSec: undefined, needsDelayMap: false, maxDelaySec: 0 };
    }
    const delays: Array<number> = new Array(samples.length);
    let any = false;
    let maxDelay = 0;
    for (let i = 0; i < samples.length; i++) {
      const result = entryAnimationDelaySec(samples[i]!.animation, animCfg.stagger, i);
      const d = result.enabled ? result.delay : 0;
      delays[i] = d;
      if (d > 0) any = true;
      if (d > maxDelay) maxDelay = d;
    }
    return { entryDelaysSec: delays, needsDelayMap: any, maxDelaySec: maxDelay };
  }

  /**
   * Promote the 1×1 stub delay map to the full density-texture resolution
   * if it hasn't been already, fill it with the "unset" sentinel, and
   * return the writable Float32Array view. The shader's `min` rule then
   * selects the smallest written delay per pixel; pixels untouched by
   * any sample remain at the sentinel and are reset to 0 in the finalise
   * step (= "follow layer-wide bloom").
   */
  private ensureDelayMap(): Float32Array {
    const expectedLength = this.textureWidth * this.textureHeight;
    if (this.delayMapData.length !== expectedLength) {
      this.delayMapData = new Float32Array(expectedLength);
      this.delayMapTexture.dispose();
      this.delayMapTexture = new DataTexture(
        this.delayMapData as unknown as Float32Array<ArrayBuffer>,
        this.textureWidth,
        this.textureHeight,
        RedFormat,
        FloatType
      );
      this.delayMapTexture.minFilter = LinearFilter;
      this.delayMapTexture.magFilter = LinearFilter;
      this.delayMapTexture.wrapS = RepeatWrapping;
      this.delayMapTexture.wrapT = ClampToEdgeWrapping;
      this.material.uniforms['uDelayMap']!.value = this.delayMapTexture;
    }
    this.delayMapData.fill(DELAY_SENTINEL);
    return this.delayMapData;
  }

  private resetDelayMap(): void {
    if (this.delayMapHasContent) this.delayMapData.fill(0);
    this.delayMapHasContent = false;
    this.animMaxPixelDelaySec = 0;
    const u = this.material.uniforms;
    u['uAnimHasDelayMap']!.value = 0;
    this.delayMapTexture.needsUpdate = true;
  }

  private finaliseDelayMap(used: boolean, maxDelaySec: number): void {
    if (!used) {
      this.resetDelayMap();
      return;
    }
    // Replace any unwritten sentinel with 0 (= "play with the layer-wide
    // timeline"). Clamp to a reasonable upper bound so floating-point
    // garbage can't drift the shader into negative `(time - delay)` ranges.
    const buf = this.delayMapData;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i]! >= DELAY_SENTINEL_THRESHOLD) buf[i] = 0;
    }
    this.delayMapHasContent = true;
    this.animMaxPixelDelaySec = maxDelaySec;
    const u = this.material.uniforms;
    u['uAnimHasDelayMap']!.value = 1;
    this.delayMapTexture.needsUpdate = true;
  }
}

/** Sentinel meaning "no sample painted this pixel yet" — well above any
 *  reasonable delay (max 35s after clamping in resolveAnimationConfig). */
const DELAY_SENTINEL = 1e9;
const DELAY_SENTINEL_THRESHOLD = 1e6;
