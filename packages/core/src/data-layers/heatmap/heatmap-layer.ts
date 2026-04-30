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
  HeatmapCurve,
  HeatmapDataLayer,
  HeatmapKernel,
  HeatmapNormalize,
} from '../types';

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

export interface HeatmapLayerOptions {
  readonly layer: HeatmapDataLayer;
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

    this.material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: blending === CustomBlending ? NormalBlending : blending,
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
    return {
      uDensity: { value: this.densityTexture },
      uPalette: { value: this.paletteTexture },
      uMaxHeight: { value: layer.maxHeight ?? DEFAULT_MAX_HEIGHT },
      uIntensity: { value: layer.intensity ?? 1 },
      uThreshold: { value: layer.threshold ?? 0 },
      uCurve: { value: encodeCurve(layer.curve ?? 'smoothstep') },
      uDispCurve: {
        value: encodeCurve(layer.displacementCurve ?? layer.curve ?? 'smoothstep'),
      },
      uOpacity: { value: opacity },
      uBlendMode: { value: blendMode === 'additive' ? 1 : 0 },
      uTextureSize: { value: new Vector2(this.textureWidth, this.textureHeight) },
      uLightDir: { value: lvec },
      uShading: { value: layer.shading ?? 0.6 },
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

    for (let i = 0; i < samples.length; i++) {
      const entry = samples[i]!;
      const radius = Math.max(1e-4, entry.radius ?? defaultRadius);
      const weight = entry.weight ?? 1;
      paintSample(
        data,
        this.textureWidth,
        this.textureHeight,
        entry.position[0],
        entry.position[1],
        radius,
        entry.value * weight,
        kernel
      );
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
const computeBakeKey = (layer: HeatmapDataLayer): string => {
  const samplesId =
    `len=${layer.data.length}` +
    // Identity tag for the array — different arrays of the same length still
    // produce different keys when their first / last entries differ.
    (layer.data.length > 0
      ? `|first=${asLatLngTag(layer.data[0]!.position)}|last=${asLatLngTag(
          layer.data[layer.data.length - 1]!.position
        )}|sum0=${layer.data[0]!.value}`
      : '');
  return [
    samplesId,
    `r=${layer.radius ?? ''}`,
    `k=${layer.kernel ?? ''}`,
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
uniform float uIntensity;
uniform float uThreshold;
uniform int uCurve;
uniform int uDispCurve;

varying vec3 vDir;
varying vec3 vNormal;
varying float vShaped;

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

float displacementAtUv(vec2 uv) {
  float d = texture2D(uDensity, uv).r;
  float t = clamp(d * uIntensity, 0.0, 1.0);
  float gated = max(0.0, (t - uThreshold) / max(1e-4, 1.0 - uThreshold));
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
  if (uMaxHeight > 0.0) {
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
    float slopeE = (hR - hL) * uMaxHeight * 0.5;
    float slopeN = (hU - hD) * uMaxHeight * 0.5;
    // Tangent-space step in world units (approximation — good enough
    // for the visual cue we want).
    float texelArc = 6.2831853 / uTextureSize.x;
    vec3 grad = east * (slopeE / max(texelArc, 1e-4)) + north * (slopeN / max(texelArc, 1e-4));
    vNormal = normalize(dir - grad);
  } else {
    vNormal = dir;
  }

  vec3 displaced = position + dir * (shaped * uMaxHeight);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

// uBlendMode: 0 = normal alpha blend (vivid colour overlay, deck.gl style)
//             1 = additive (premultiply by alpha so cool regions add nothing)
const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uDensity;
uniform sampler2D uPalette;
uniform float uIntensity;
uniform float uThreshold;
uniform float uOpacity;
uniform float uShading;
uniform vec3 uLightDir;
uniform int uCurve;
uniform int uBlendMode;

varying vec3 vDir;
varying vec3 vNormal;
varying float vShaped;

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

void main() {
  vec3 dir = normalize(vDir);
  vec2 uv = dirToUv(dir);

  float d = texture2D(uDensity, uv).r;
  float t = clamp(d * uIntensity, 0.0, 1.0);
  if (t <= uThreshold) discard;
  float gated = (t - uThreshold) / max(1e-4, 1.0 - uThreshold);
  float shaped = curveFn(clamp(gated, 0.0, 1.0), uCurve);

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

  if (uBlendMode == 1) {
    gl_FragColor = vec4(shaded * shaped, col.a * shaped * uOpacity);
  } else {
    gl_FragColor = vec4(shaded, col.a * shaped * uOpacity);
  }
}
`;
