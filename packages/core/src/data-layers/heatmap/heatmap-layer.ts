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

  public constructor(options: HeatmapLayerOptions) {
    const { layer } = options;
    this.fallbackColor = options.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    this.textureWidth = layer.textureResolution?.width ?? DEFAULT_TEXTURE_W;
    this.textureHeight = layer.textureResolution?.height ?? DEFAULT_TEXTURE_H;
    this.paletteSteps = layer.paletteSteps ?? DEFAULT_PALETTE_STEPS;

    const wantsDisplacement = (layer.maxHeight ?? DEFAULT_MAX_HEIGHT) > 0;
    const geomW = wantsDisplacement ? SPHERE_DISPLACED_W : SPHERE_FLAT_W;
    const geomH = wantsDisplacement ? SPHERE_DISPLACED_H : SPHERE_FLAT_H;
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
  }

  public setData(layer: HeatmapDataLayer): void {
    this.applyData(layer);
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
    return {
      uDensity: { value: this.densityTexture },
      uPalette: { value: this.paletteTexture },
      uMaxHeight: { value: layer.maxHeight ?? DEFAULT_MAX_HEIGHT },
      uIntensity: { value: layer.intensity ?? 1 },
      uThreshold: { value: layer.threshold ?? 0 },
      uCurve: { value: encodeCurve(layer.curve ?? 'smoothstep') },
      uOpacity: { value: opacity },
      uBlendMode: { value: blendMode === 'additive' ? 1 : 0 },
      uTextureSize: { value: new Vector2(this.textureWidth, this.textureHeight) },
    };
  }

  private refreshUniforms(layer: HeatmapDataLayer): void {
    const u = this.material.uniforms;
    u['uMaxHeight']!.value = layer.maxHeight ?? DEFAULT_MAX_HEIGHT;
    u['uIntensity']!.value = layer.intensity ?? 1;
    u['uThreshold']!.value = layer.threshold ?? 0;
    u['uCurve']!.value = encodeCurve(layer.curve ?? 'smoothstep');
    const blendMode = layer.blendMode ?? 'normal';
    u['uBlendMode']!.value = blendMode === 'additive' ? 1 : 0;
    this.material.blending = blendMode === 'additive' ? AdditiveBlending : NormalBlending;
    this.material.needsUpdate = true;
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
 * Stamp a single sample's kernel into the density buffer. Only iterates
 * pixels inside the sample's lat/lng bounding box.
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

  const r2 = radiusRad * radiusRad;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const cosLatExact = Math.cos((lat * Math.PI) / 180);

  for (let v = v0; v <= v1; v++) {
    const pixelLat = 90 - ((v + 0.5) / height) * 180;
    const sinPL = Math.sin((pixelLat * Math.PI) / 180);
    const cosPL = Math.cos((pixelLat * Math.PI) / 180);
    for (let du = -duPx; du <= duPx; du++) {
      let u = Math.floor(cu + du);
      if (u < 0) u += width;
      else if (u >= width) u -= width;
      const pixelLng = ((u + 0.5) / width) * 360 - 180;
      const dLng = ((pixelLng - lng) * Math.PI) / 180;
      const cosD = sinLat * sinPL + cosLatExact * cosPL * Math.cos(dLng);
      const ang = Math.acos(Math.max(-1, Math.min(1, cosD)));
      if (ang > radiusRad) continue;
      const w = applyKernel(kernel, ang, radiusRad, r2);
      if (w <= 0) continue;
      data[v * width + u]! += value * w;
    }
  }
};

const applyKernel = (
  kernel: HeatmapKernel,
  ang: number,
  radius: number,
  r2: number
): number => {
  const u = ang / radius;
  switch (kernel) {
    case 'gaussian':
      return Math.exp(-(ang * ang) / (r2 * 0.25));
    case 'epanechnikov':
      return Math.max(0, 1 - u * u);
    case 'quartic': {
      const t = 1 - u * u;
      return t > 0 ? t * t : 0;
    }
    case 'uniform':
      return u <= 1 ? 1 : 0;
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
const VERTEX_SHADER = /* glsl */ `
uniform sampler2D uDensity;
uniform float uMaxHeight;
uniform float uIntensity;
uniform float uThreshold;
uniform int uCurve;

varying vec3 vDir;
varying float vShaped;

float curveFn(float v, int curveCode) {
  if (curveCode == 0) return v;
  if (curveCode == 1) return v * v * (3.0 - 2.0 * v);
  if (curveCode == 2) return v * v * v;
  return sqrt(v);
}

vec2 dirToUv(vec3 dir) {
  float lat = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  float lng = degrees(atan(dir.z, -dir.x));
  return vec2((lng + 180.0) / 360.0, (90.0 - lat) / 180.0);
}

void main() {
  vec3 dir = normalize(position);
  vDir = dir;
  vec2 uv = dirToUv(dir);

  float d = texture2D(uDensity, uv).r;
  float t = clamp(d * uIntensity, 0.0, 1.0);
  float gated = max(0.0, (t - uThreshold) / max(1e-4, 1.0 - uThreshold));
  float shaped = curveFn(gated, uCurve);
  vShaped = shaped;

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
uniform int uCurve;
uniform int uBlendMode;

varying vec3 vDir;
varying float vShaped;

float curveFn(float v, int curveCode) {
  if (curveCode == 0) return v;
  if (curveCode == 1) return v * v * (3.0 - 2.0 * v);
  if (curveCode == 2) return v * v * v;
  return sqrt(v);
}

vec2 dirToUv(vec3 dir) {
  float lat = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  float lng = degrees(atan(dir.z, -dir.x));
  return vec2((lng + 180.0) / 360.0, (90.0 - lat) / 180.0);
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

  if (uBlendMode == 1) {
    // Additive — colour is premultiplied by intensity so cool regions
    // contribute ~0 and peaks glow vividly.
    gl_FragColor = vec4(col.rgb * shaped, col.a * shaped * uOpacity);
  } else {
    // Normal blend — keep colour saturated, fade opacity by shaped.
    // This preserves the palette's vibrance and produces the classic
    // deck.gl / Mapbox heatmap look.
    gl_FragColor = vec4(col.rgb, col.a * shaped * uOpacity);
  }
}
`;
