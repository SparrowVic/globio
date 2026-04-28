/**
 * Pure helpers powering the wireframe extras (click pulse, equator
 * emphasis, glitch). Extracted so they can be unit-tested without a GL
 * context — the layers in this folder import + use them at runtime.
 */

const EQUATOR_EPS = 0.5;
const TROPIC_LAT = 23.43;
const TROPIC_EPS = 0.5;
const MERIDIAN_EPS = 0.5;

/**
 * Gaussian brightness profile of a single click pulse, evaluated at a
 * vertex `angularDistance` away from the click point. The wavefront sits
 * at `wavefront` radians; vertices on the front peak at ~1, vertices well
 * inside or ahead of it fall off to ~0. `width` is the band half-width
 * (one σ of the gaussian).
 */
export const pulseBrightness = (
  angularDistance: number,
  wavefront: number,
  width: number
): number => {
  const w = width > 0 ? width : 1e-6;
  const x = (angularDistance - wavefront) / w;
  return Math.exp(-x * x);
};

/**
 * Tag a (lat, lng) coordinate as belonging to a geographic emphasis line.
 * - 'equator' — within EQUATOR_EPS° of lat 0
 * - 'tropic'  — within TROPIC_EPS° of lat ±23.43
 * - 'meridian' — within MERIDIAN_EPS° of lng 0 or |lng|≈180
 *
 * Returns null otherwise. Equator wins over meridian at (0, 0); the order
 * here matches the "stronger emphasis first" check in the layer.
 */
export const isInEmphasisBand = (
  lat: number,
  lng: number
): 'equator' | 'tropic' | 'meridian' | null => {
  if (Math.abs(lat) < EQUATOR_EPS) return 'equator';
  if (Math.abs(Math.abs(lat) - TROPIC_LAT) < TROPIC_EPS) return 'tropic';
  if (Math.abs(lng) < MERIDIAN_EPS) return 'meridian';
  if (Math.abs(Math.abs(lng) - 180) < MERIDIAN_EPS) return 'meridian';
  return null;
};

/**
 * Whether `lat` falls inside a glitch band centered at `glitchCenter` with
 * the given half-height (degrees).
 */
export const isInGlitchBand = (
  lat: number,
  glitchCenter: number,
  halfHeight: number
): boolean => Math.abs(lat - glitchCenter) <= halfHeight;

/**
 * Sin-bell time profile — `t` in [0, 1] over the glitch lifetime. Peaks at
 * 1.0 mid-life, returns to 0 at both ends.
 */
export const glitchEnvelope = (t: number): number => {
  if (t <= 0 || t >= 1) return 0;
  return Math.sin(t * Math.PI);
};
