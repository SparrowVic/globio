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
 * Apply per-vertex jitter perpendicular to the segment direction (lng/lat
 * 2D space). `roughnessDegrees` caps the wobble amplitude (each vertex
 * shifts by `seededJitter() * roughnessDegrees` along the perpendicular).
 * First and last vertices get the same treatment as inner ones — closed
 * rings still close because the seed key is per-vertex-position.
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
    const j = seededJitter(`${seed}|${v[0].toFixed(4)},${v[1].toFixed(4)}`) * roughnessDegrees;
    out[i] = [v[0] + px * j, v[1] + py * j] as const;
  }
  return out;
};
