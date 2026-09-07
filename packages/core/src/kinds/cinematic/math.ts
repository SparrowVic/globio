// Cinematic kind — physics & math foundation.
//
// This module is the shared "engine of equations" used by every cinematic
// layer. The visual look of the kind is intentionally derived rather than
// painted: every coefficient that drives surface, city-lights, network,
// arcs and borders ultimately resolves to a function of light direction,
// surface normal, view direction, density field, terminator distance,
// camera distance or interaction state.
//
// Two surfaces of this module are exported:
//
//   * Pure JS helpers — used by data preparation, geometry building and
//     uniform sync. Stable signatures; existing tests rely on the names
//     `clamp01`, `smoothstep`, `endpointFade`, `terminatorFactors`,
//     `cameraFacing`, `stableHash01`, `wrapLng`, `clampLat`,
//     `angularDistance`. New helpers are additive.
//
//   * GLSL chunks — small, self-contained snippets prepended to every
//     cinematic fragment/vertex shader so the same physical model is
//     used everywhere instead of being copy-pasted with drift. Chunk
//     names are uppercase (`GLSL_HASH`, `GLSL_FBM`, …). They are plain
//     `const` strings so tree-shaking remains predictable.

import { Vector3 } from 'three';
import type { LatLng } from '../../types';
import { latLngToVector3 } from '../../utils/coordinates';

// ────────────────────────────────────────────────────────────────────────────
// JS helpers (CPU side)
// ────────────────────────────────────────────────────────────────────────────

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const saturate = clamp01;

export const smoothstep = (edge0: number, edge1: number, value: number): number => {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

export const endpointFade = (
  t: number,
  fade = 0.14,
): number => smoothstep(0, fade, t) * smoothstep(0, fade, 1 - t);

export const angularDistance = (from: LatLng, to: LatLng): number =>
  latLngToVector3(from, 1).angleTo(latLngToVector3(to, 1));

/**
 * Decompose a normalised normal + light vector into day / night / twilight
 * factors. The model is the canonical smoothstep-around-zero terminator:
 *
 *   day(x)      = smoothstep(-s, +s, x)^contrast
 *   twilight(x) = exp(-(x/s)^2)             (Gaussian about the terminator)
 *   night       = 1 - day
 *
 * where x = dot(normal, light) and s = `softness`. Higher softness → wider
 * blue-hour band; higher contrast → sharper day/night cutoff.
 */
export const terminatorFactors = (
  normal: Vector3,
  lightDirection: Vector3,
  softness: number,
  contrast: number,
): {
  readonly day: number;
  readonly night: number;
  readonly twilight: number;
} => {
  const light = normal.dot(lightDirection);
  const safeSoftness = Math.max(0.001, softness);
  const rawDay = smoothstep(-safeSoftness, safeSoftness, light);
  const day = Math.pow(rawDay, Math.max(0.1, contrast));
  const twilight = Math.exp(-Math.pow(light / safeSoftness, 2));
  return { day, night: 1 - day, twilight };
};

export const cameraFacing = (normal: Vector3, cameraPosition: Vector3): number =>
  clamp01(normal.dot(cameraPosition.clone().normalize()));

/**
 * FNV-1a-like deterministic hash → [0,1). Used to seed phase, randomise
 * twinkle without touching `Math.random` in build paths.
 */
export const stableHash01 = (value: string | number): number => {
  const input = String(value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
};

export const wrapLng = (lng: number): number => ((lng + 540) % 360) - 180;

export const clampLat = (lat: number): number => Math.max(-86, Math.min(86, lat));

/**
 * Planckian locus → linear sRGB. Approximation valid in the 1500K–12000K
 * range; we use it to drive city-light colour temperature so warm cluster
 * cities look ~3000K incandescent and cool capitals push toward 4500K
 * mercury-vapour. Output is normalised to a peak channel of 1.0.
 *
 * Ported from Mitchell Charity's blackbody table fit (CC0). The algorithm
 * is a piecewise polynomial approximation; full reference at
 * https://www.tannerhelland.com/2012/09/18/convert-temperature-rgb-algorithm-code.html
 * The approximation is exposed because city colour temperature lives on
 * the JS side (per-vertex attribute) but the shader-side blend uses the
 * resulting RGB triplet as a uniform-driven gradient endpoint.
 */
export const kelvinToRgb = (
  kelvin: number,
): readonly [number, number, number] => {
  const t = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708 * Math.log(t) - 161.1196;
    b = t <= 19 ? 0 : 138.5177 * Math.log(t - 10) - 305.0448;
  } else {
    r = 329.6987 * Math.pow(t - 60, -0.1332);
    g = 288.1222 * Math.pow(t - 60, -0.0755);
    b = 255;
  }
  const peak = Math.max(r, g, b, 1);
  return [
    clamp01(r / peak),
    clamp01(g / peak),
    clamp01(b / peak),
  ] as const;
};

/**
 * Geodesic Gaussian: bell curve in great-circle distance. Used to spread
 * "interaction energy" from a point of contact across the surface and to
 * weight density samples around a city anchor. `radius` is in radians.
 */
export const geodesicGaussian = (
  distanceRadians: number,
  radius: number,
): number => {
  const safe = Math.max(1e-4, radius);
  return Math.exp(-Math.pow(distanceRadians / safe, 2));
};

/**
 * Importance-sampled selection: given a list of weighted candidates and a
 * deterministic 0..1 input, return the index whose cumulative weight first
 * exceeds the input. Used to keep brighter / busier cities preferentially
 * when the requested count is below the dataset size.
 */
export const importanceSelect = (
  weights: ReadonlyArray<number>,
  uniform01: number,
): number => {
  if (weights.length === 0) return -1;
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += Math.max(0, weights[i] ?? 0);
  if (total <= 0) return Math.floor(uniform01 * weights.length);
  const target = clamp01(uniform01) * total;
  let cursor = 0;
  for (let i = 0; i < weights.length; i++) {
    cursor += Math.max(0, weights[i] ?? 0);
    if (target <= cursor) return i;
  }
  return weights.length - 1;
};

/**
 * 1D sample of a 2D density grid in equirectangular projection. The grid
 * wraps at the antimeridian and clamps at the poles. Bilinear interpolation
 * inside the grid avoids the "Voronoi blob" look that a nearest-neighbour
 * sample would produce when read from a vertex shader's mirror in JS.
 */
export const sampleDensity = (
  density: Float32Array,
  width: number,
  height: number,
  lat: number,
  lng: number,
): number => {
  const u = ((lng + 180) / 360) * width;
  const v = ((90 - lat) / 180) * height;
  const x0 = Math.floor(u);
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(v)));
  const fx = u - x0;
  const fy = v - y0;
  const x1 = x0 + 1;
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));
  const wrap = (x: number) => ((x % width) + width) % width;
  const a = density[y0 * width + wrap(x0)] ?? 0;
  const b = density[y0 * width + wrap(x1)] ?? 0;
  const c = density[y1 * width + wrap(x0)] ?? 0;
  const d = density[y1 * width + wrap(x1)] ?? 0;
  return mix(mix(a, b, fx), mix(c, d, fx), fy);
};

/**
 * Visible-hemisphere energy: sum of city importance weighted by visibility
 * from the camera. Visibility here is `max(dot(normal, camDir), 0)`, which
 * means cities directly under the camera contribute fully and cities at the
 * limb contribute nothing. The result is normalised so a globally uniform
 * dataset returns ~0.5; clusters yield >1.0 and barren views <0.3. Surface
 * shader uses this to subtly warm the atmosphere over visible hubs.
 */
export const visibleCityEnergy = (
  points: ReadonlyArray<{ readonly lat: number; readonly lng: number; readonly importance: number }>,
  cameraDirection: Vector3,
): number => {
  if (points.length === 0) return 0;
  let total = 0;
  let weight = 0;
  const tmp = new Vector3();
  for (const p of points) {
    latLngToVector3([p.lat, p.lng], 1, tmp);
    const visibility = Math.max(0, tmp.dot(cameraDirection));
    total += visibility * p.importance;
    weight += p.importance;
  }
  return weight > 0 ? total / weight : 0;
};

// ────────────────────────────────────────────────────────────────────────────
// GLSL chunks (GPU side)
//
// These strings are concatenated at the top of every cinematic fragment
// shader so the model is consistent across layers. They are written in
// GLSL ES 1.0 (Three.js's default ShaderMaterial dialect) and use only
// floats / vec2 / vec3 / vec4 — no derivatives, no extensions.
// ────────────────────────────────────────────────────────────────────────────

/**
 * 2D value-noise hash + smooth bilinear interpolation. `cn_noise` returns
 * a [0,1] field; `cn_fbm` accumulates 5 octaves with halving amplitude.
 * Both are deterministic seeded by position alone.
 */
export const GLSL_NOISE = /* glsl */ `
  float cn_hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float cn_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = cn_hash(i);
    float b = cn_hash(i + vec2(1.0, 0.0));
    float c = cn_hash(i + vec2(0.0, 1.0));
    float d = cn_hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float cn_fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * cn_noise(p);
      p = p * 2.02 + vec2(11.7, 5.3);
      a *= 0.5;
    }
    return v;
  }
  // Cheaper 3-octave FBM for warp/curl fields where 5 octaves are wasted.
  float cn_fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 3; i++) {
      v += a * cn_noise(p);
      p = p * 2.13 + vec2(3.7, 9.1);
      a *= 0.5;
    }
    return v;
  }
`;

/**
 * 2D curl-noise: divergence-free vector field used to advect cloud bands
 * with a swirly, non-uniform flow that reads as wind. The math is the
 * standard "curl of FBM gradient": rotate the gradient 90° in 2D.
 */
export const GLSL_CURL = /* glsl */ `
  vec2 cn_curl(vec2 p, float t) {
    float e = 0.85;
    float n1 = cn_fbm3(p + vec2(0.0, e) + vec2(t * 0.04, 0.0));
    float n2 = cn_fbm3(p - vec2(0.0, e) + vec2(t * 0.04, 0.0));
    float n3 = cn_fbm3(p + vec2(e, 0.0) + vec2(0.0, t * 0.04));
    float n4 = cn_fbm3(p - vec2(e, 0.0) + vec2(0.0, t * 0.04));
    return normalize(vec2(n1 - n2, -(n3 - n4)) + vec2(0.0001));
  }
`;

/**
 * Day / twilight / night factors from light direction and surface normal.
 *
 * - day:      `smoothstep(-s, +s, dot)^contrast`
 * - twilight: `exp(-(dot/s)^2)`         (Gaussian band around the terminator)
 * - warmShift: 1.0 inside twilight, 0.0 deep day/night — drives the
 *               characteristic red-orange wash in the blue-hour band.
 */
export const GLSL_TERMINATOR = /* glsl */ `
  struct cn_TerminatorBands {
    float day;
    float night;
    float twilight;
    float warmShift;
  };
  cn_TerminatorBands cn_terminator(vec3 n, vec3 l, float softness, float contrast) {
    float s = max(0.001, softness);
    float k = dot(n, l);
    float rawDay = smoothstep(-s, s, k);
    float day = pow(rawDay, max(0.1, contrast));
    float tw = exp(-pow(k / s, 2.0));
    // warmShift is a tighter Gaussian than twilight so the orange wash
    // hugs the terminator strip rather than washing the whole day side.
    float warm = exp(-pow(k / (s * 0.78), 2.0)) * smoothstep(-s * 1.4, -s * 0.05, k);
    return cn_TerminatorBands(day, 1.0 - day, tw, warm);
  }
`;

/**
 * Fresnel via Schlick approximation:
 *
 *   F(theta) = F0 + (1 - F0) * (1 - cos(theta))^5
 *
 * `cn_fresnel` returns the [0,1] reflectance for a given view–normal
 * dot product; `cn_rim` returns the bare (1 - cos)^p falloff used for
 * cinematic limb glow with a tunable exponent.
 */
export const GLSL_FRESNEL = /* glsl */ `
  float cn_fresnel(float ndv, float f0) {
    float c = clamp(1.0 - ndv, 0.0, 1.0);
    return f0 + (1.0 - f0) * pow(c, 5.0);
  }
  float cn_rim(float ndv, float power) {
    return pow(clamp(1.0 - ndv, 0.0, 1.0), max(0.35, power));
  }
`;

/**
 * Rayleigh + Mie phase functions. Rayleigh dominates the day-side blue
 * scatter; Mie-with-anisotropy `g` produces the forward-scatter halo that
 * sits over the terminator. We only need the angular phase term — the
 * full integral over depth is approximated by the rim falloff.
 *
 *   P_R(mu) = 0.75 * (1 + mu^2)
 *   P_M(mu) = ((1-g^2) / (1 + g^2 - 2*g*mu)^(3/2)) * (3 / (4*pi))
 */
export const GLSL_SCATTERING = /* glsl */ `
  float cn_rayleighPhase(float mu) {
    return 0.75 * (1.0 + mu * mu);
  }
  float cn_miePhase(float mu, float g) {
    float g2 = g * g;
    float denom = 1.0 + g2 - 2.0 * g * mu;
    return (1.0 - g2) / max(0.0001, pow(denom, 1.5)) * 0.07957747; // /(4*pi)
  }
  // Dominant atmospheric tint per band. Day atmosphere skews cyan-blue,
  // twilight terminator skews warm, night gets a deep indigo halo.
  vec3 cn_atmosphereTint(float day, float twilight, float warmShift) {
    vec3 dayTint = vec3(0.46, 0.72, 1.00);
    vec3 twiTint = vec3(1.00, 0.55, 0.26);
    vec3 nightTint = vec3(0.14, 0.24, 0.46);
    return mix(nightTint, dayTint, day) + twiTint * warmShift * 0.32 + twiTint * twilight * 0.10;
  }
`;

/**
 * Fake sub-surface scattering for ocean depth: Beer–Lambert along the view
 * vector, parameterised by depth (0 at coast, 1 mid-ocean) and the surface
 * extinction coefficient. Produces the characteristic "dark abyss" look
 * away from coasts without an actual depth texture.
 */
export const GLSL_DEEP_OCEAN = /* glsl */ `
  vec3 cn_oceanDepth(vec3 shallow, vec3 abyss, float depth, float extinction) {
    float t = 1.0 - exp(-extinction * depth);
    return mix(shallow, abyss, clamp(t, 0.0, 1.0));
  }
`;

/**
 * Sample density atlas with manual bilinear filtering and longitude wrap.
 * Three's `RepeatWrapping` already handles the wrap, but we still want
 * a manual fallback for environments where `texture2D` LOD is sketchy on
 * mobile drivers — the explicit form is also clearer to read.
 */
export const GLSL_DENSITY = /* glsl */ `
  float cn_sampleDensity(sampler2D atlas, vec2 uv) {
    return texture2D(atlas, fract(uv)).r;
  }
`;

/**
 * Distance-field coastline: 1 along the coast, 0 away. Computed from the
 * absolute gradient of the land mask in atlas-UV space. Texel size is
 * passed as a uniform so the same chunk works for atlases of any size.
 */
export const GLSL_COAST = /* glsl */ `
  float cn_coast(sampler2D landAtlas, vec2 uv, vec2 texel) {
    float dx = abs(
      texture2D(landAtlas, uv + vec2(texel.x, 0.0)).r -
      texture2D(landAtlas, uv - vec2(texel.x, 0.0)).r
    );
    float dy = abs(
      texture2D(landAtlas, uv + vec2(0.0, texel.y)).r -
      texture2D(landAtlas, uv - vec2(0.0, texel.y)).r
    );
    return smoothstep(0.05, 0.62, max(dx, dy));
  }
`;

/**
 * ACES-fit tone curve (Narkowicz approximation) — fast, single-MAD form.
 * We apply it at the very end of the surface shader so additive city
 * lights and rim halos do not blow out into clipped white but instead
 * roll off into film-like highlights.
 */
export const GLSL_TONE = /* glsl */ `
  vec3 cn_aces(vec3 x) {
    const float a = 2.51;
    const float b = 0.03;
    const float c = 2.43;
    const float d = 0.59;
    const float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }
  vec3 cn_exposeAndTone(vec3 color, float exposure) {
    return cn_aces(color * exposure);
  }
`;

/**
 * Convenience: derive a stable per-fragment hash from `(lat, lng)` for
 * deterministic shimmer / phase. Avoids `Math.random()`-style spatial
 * noise that would flicker between draw calls.
 */
export const GLSL_FRAGHASH = /* glsl */ `
  float cn_fragHash(vec2 ll) {
    vec3 p3 = fract(vec3(ll.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
`;

/**
 * Seamless 3D value noise on the unit sphere. The 2D `cn_noise` family
 * takes lat/lng-derived coordinates and therefore has a seam at the
 * antimeridian; anything that must wrap cleanly around the planet
 * (clouds, aurora, climate noise, ocean waves) samples these instead.
 * `octaves` is dynamic (GLSL ES 3.00 loop with early break) so the
 * quality tier can trade detail for speed.
 */
export const GLSL_NOISE3 = /* glsl */ `
  float cn_hash3(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float cn_noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = cn_hash3(i);
    float n100 = cn_hash3(i + vec3(1.0, 0.0, 0.0));
    float n010 = cn_hash3(i + vec3(0.0, 1.0, 0.0));
    float n110 = cn_hash3(i + vec3(1.0, 1.0, 0.0));
    float n001 = cn_hash3(i + vec3(0.0, 0.0, 1.0));
    float n101 = cn_hash3(i + vec3(1.0, 0.0, 1.0));
    float n011 = cn_hash3(i + vec3(0.0, 1.0, 1.0));
    float n111 = cn_hash3(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }
  float cn_fbm3d(vec3 p, int octaves) {
    float v = 0.0;
    float a = 0.5;
    float norm = 0.0;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      v += a * cn_noise3(p);
      norm += a;
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v / max(norm, 0.0001);
  }
  // Ridged variant: sharp crests, used for mountain belts and cloud
  // filaments.
  float cn_ridged3d(vec3 p, int octaves) {
    float v = 0.0;
    float a = 0.5;
    float norm = 0.0;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      float n = 1.0 - abs(2.0 * cn_noise3(p) - 1.0);
      v += a * n * n;
      norm += a;
      p = p * 2.11 + vec3(4.1, 2.7, 8.3);
      a *= 0.5;
    }
    return v / max(norm, 0.0001);
  }
`;

/**
 * Cloud coverage field on the unit sphere. Shared by the cloud shell
 * (colour) and the surface (shadows) so the shadow always sits under the
 * cloud that casts it. Domain-warped fbm + a tropical convergence band.
 *
 *   coverage  0..1 fraction of sky covered
 *   speed     advection multiplier
 *   softness  0 = hard-edged cumulus, 1 = hazy stratus
 *   quality   the shared `uQuality` scalar; octave counts step down with it
 */
export const GLSL_CLOUDS = /* glsl */ `
  float cn_clouds(vec3 dir, float time, float coverage, float speed, float softness, float quality) {
    int warpOct = quality > 0.8 ? 3 : 2;
    int baseOct = quality > 1.0 ? 6 : (quality > 0.8 ? 5 : 4);
    int ridgeOct = quality > 1.0 ? 4 : (quality > 0.8 ? 3 : 2);
    float t = time * speed;
    vec3 drift = vec3(t * 0.011, t * 0.0025, -t * 0.008);
    // ~5 cycles around the sphere ⇒ cloud systems of continental-fraction
    // size (real fronts are 1000–3000 km), not hemisphere-sized masses.
    vec3 p = dir * 5.2 + drift;
    vec3 warp = vec3(
      cn_fbm3d(p * 0.55 + vec3(3.7, 1.2, 9.4), warpOct),
      cn_fbm3d(p * 0.55 + vec3(8.1, 6.3, 2.2), warpOct),
      cn_fbm3d(p * 0.55 + vec3(1.9, 7.7, 4.8), warpOct)
    ) - 0.5;
    float base = cn_fbm3d(p + warp * 0.8, baseOct);
    float detail = cn_ridged3d(dir * 16.0 - warp * 1.4 + drift * 1.8, ridgeOct);
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    float itcz = exp(-pow(lat / 0.13, 2.0)) * 0.20;
    float midlat = exp(-pow((abs(lat) - 0.95) / 0.32, 2.0)) * 0.08;
    // Field statistics: base ≈ N(0.5, 0.1), detail (ridged) ≈ 0.35 mean,
    // so n sits around 0.45 with clear troughs; the threshold maps
    // coverage roughly onto the covered fraction of the sphere.
    float n = base * 0.74 + detail * 0.22 + itcz + midlat;
    float threshold = 0.74 - clamp(coverage, 0.0, 1.0) * 0.58;
    float edge = mix(0.035, 0.20, clamp(softness, 0.0, 1.0));
    float c = smoothstep(threshold - edge, threshold + edge * 0.8, n);
    c = clamp((c - 0.08) / 0.92, 0.0, 1.0);
    return c * c * (3.0 - 2.0 * c) * (0.5 + 0.5 * c);
  }
`;

/**
 * Auroral oval. Returns vec2(intensity, verticalMix): intensity in [0,1]
 * peaks in curtains along the oval centred `latCenter` radians from the
 * geomagnetic pole (tilted ~11° toward 72°W); verticalMix is 0 on the
 * equatorward edge (green) and 1 poleward (violet top).
 */
export const GLSL_AURORA = /* glsl */ `
  vec2 cn_aurora(vec3 dir, float time, float speed, float latCenter) {
    // Geomagnetic north pole (80.7N, 72.7W) in the surface's local frame:
    // local = (cos(lat)cos(lng), sin(lat), -cos(lat)sin(lng)).
    const vec3 magPole = vec3(0.04799, 0.98687, 0.15421);
    const vec3 magE1 = vec3(0.95500, 0.0, -0.29675);   // perpendicular reference
    vec3 magE2 = normalize(cross(magPole, magE1));
    float magLat = asin(clamp(dot(dir, magPole), -1.0, 1.0));
    float phi = atan(dot(dir, magE2), dot(dir, magE1));
    float a = abs(magLat);
    float band = exp(-pow((a - latCenter) / 0.075, 2.0));
    float t = time * speed;
    float curtains = cn_fbm3d(vec3(phi * 2.6 + t * 0.06, a * 18.0, t * 0.021), 4);
    curtains = pow(smoothstep(0.38, 0.86, curtains), 1.5);
    float flicker = cn_noise3(vec3(phi * 44.0 + t * 0.45, a * 30.0, t * 0.3));
    float intensity = band * (curtains * 0.85 + flicker * curtains * 0.35);
    float vertical = smoothstep(latCenter - 0.05, latCenter + 0.09, a);
    return vec2(intensity, vertical);
  }
`;

/**
 * The cinematic shader prelude: everything above, in the order shaders
 * expect. Concatenated to the top of every fragment shader that uses
 * cinematic physics. Vertex shaders that need only `cn_fragHash` /
 * `cn_terminator` can include the same prelude — unused functions are
 * eliminated by the GLSL compiler.
 */
export const GLSL_CINEMATIC_PRELUDE =
  GLSL_NOISE + GLSL_NOISE3 + GLSL_CURL + GLSL_TERMINATOR + GLSL_FRESNEL +
  GLSL_SCATTERING + GLSL_DEEP_OCEAN + GLSL_DENSITY + GLSL_COAST +
  GLSL_TONE + GLSL_FRAGHASH + GLSL_CLOUDS + GLSL_AURORA;
