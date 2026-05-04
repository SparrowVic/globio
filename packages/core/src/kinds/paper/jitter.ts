/**
 * Pure helpers for the paper kind's hand-drawn border look. Country ring
 * vertices get a tiny perpendicular wobble baked in BEFORE projecting to 3D,
 * so the line never sits on a perfect great-circle. Determinism is keyed off
 * a string seed so re-renders produce the same noise (no flicker).
 */

/**
 * 32-bit FNV-1a hash of a string. Stable across calls + platforms.
 */
const fnv1a = (key: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
};

/**
 * Seeded pseudo-random in [-0.5, 0.5] from a stringified key. Same key
 * always produces the same number — used to bake stable per-vertex jitter.
 */
export const seededJitter = (key: string): number => {
  const h = fnv1a(key);
  // Map 32-bit unsigned hash to [0, 1), then shift to [-0.5, 0.5].
  return h / 0xffffffff - 0.5;
};

/**
 * Wavelength of the value noise that drives the border wobble, in
 * degrees of lng/lat. ~4° picks one peak/trough roughly every country
 * width — adjacent ring vertices (typically <1° apart in source
 * GeoJSON) sample positions close in noise space, so the line wobbles
 * smoothly instead of zig-zagging vertex-to-vertex.
 */
const NOISE_WAVELENGTH_DEG = 4;

/**
 * Bilinear value noise in lng/lat space. Returns a smooth scalar in
 * [-0.5, 0.5] — same range as `seededJitter` but spatially correlated:
 * two query points within the wavelength share most of their corner
 * samples, so the noise drifts continuously instead of jumping at
 * every vertex.
 */
const valueNoise2D = (lng: number, lat: number, seed: string): number => {
  const w = NOISE_WAVELENGTH_DEG;
  const ix = Math.floor(lng / w);
  const iy = Math.floor(lat / w);
  const fx = lng / w - ix;
  const fy = lat / w - iy;
  const v00 = seededJitter(`${seed}|${ix},${iy}`);
  const v10 = seededJitter(`${seed}|${ix + 1},${iy}`);
  const v01 = seededJitter(`${seed}|${ix},${iy + 1}`);
  const v11 = seededJitter(`${seed}|${ix + 1},${iy + 1}`);
  // Smoothstep in each axis — softens the bilinear seams so we don't
  // see the underlying noise grid even at high roughness.
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = v00 * (1 - sx) + v10 * sx;
  const b = v01 * (1 - sx) + v11 * sx;
  return a * (1 - sy) + b * sy;
};

/**
 * Apply per-vertex jitter perpendicular to the segment direction (lng/lat
 * 2D space). `roughnessDegrees` caps the wobble amplitude (each vertex
 * shifts by `valueNoise2D() * roughnessDegrees` along the perpendicular).
 *
 * Pre-redesign this used `seededJitter` keyed by the vertex coordinate,
 * which gave every vertex an *independent* random offset. On long
 * straight borders (Egypt/Sudan, US/Canada parallels) that read as
 * mechanical high-frequency zig-zags rather than hand-drawn ink, since
 * adjacent vertices alternate uncorrelated random shifts. Switching to
 * spatial value noise keeps neighbouring vertices close in noise space
 * and gives the soft drifting wobble the paper kind was meant to have.
 */
export const jitterRing = (
  ring: ReadonlyArray<readonly [number, number]>,
  roughnessDegrees: number,
  seed: string
): ReadonlyArray<readonly [number, number]> => {
  if (roughnessDegrees === 0 || ring.length < 2) return ring;
  const out: Array<readonly [number, number]> = new Array(ring.length);
  for (let i = 0; i < ring.length; i++) {
    const v = ring[i]!;
    // Perpendicular = rotate segment direction 90°. Use neighbour pair if
    // available; fall back to next/prev at the endpoints so closed rings
    // still get a sensible perpendicular at the seam.
    const a = ring[i - 1] ?? ring[ring.length - 1] ?? v;
    const b = ring[i + 1] ?? ring[0] ?? v;
    const dLng = b[0] - a[0];
    const dLat = b[1] - a[1];
    const len = Math.hypot(dLng, dLat) || 1;
    const px = dLat / len;
    const py = -dLng / len;
    const j = valueNoise2D(v[0], v[1], seed) * roughnessDegrees;
    out[i] = [v[0] + px * j, v[1] + py * j] as const;
  }
  return out;
};
