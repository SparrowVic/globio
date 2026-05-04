/**
 * Pure helpers powering the hologram kind. Mirrors the math used inside the
 * shell + border ShaderMaterials so it can be unit-tested without a GL
 * context. The shaders themselves consume the same formulas in GLSL.
 */

/**
 * Fresnel rim factor — `pow(max(0, 1 - viewDotNormal), 2)`. Returns ~0 when
 * the surface faces the camera (viewDotNormal = 1) and ~1 at the silhouette
 * (viewDotNormal = 0). Negative inputs (back-facing) clamp to 0.
 */
export const fresnelFactor = (viewDotNormal: number): number => {
  if (viewDotNormal < 0) return 0;
  const clamped = viewDotNormal > 1 ? 1 : viewDotNormal;
  const rim = 1 - clamped;
  return rim * rim;
};

/**
 * Scanline brightness modulation — `0.6 + 0.4 * sin(uvY * freq + time * speed)`.
 * Periodic in the combined phase, output range strictly within [0.2, 1.0].
 * Tests lock a known reference at (0, freq, 0, speed) → 0.6.
 */
export const scanlineMod = (
  uvY: number,
  freq: number,
  time: number,
  speed: number
): number => 0.6 + 0.4 * Math.sin(uvY * freq + time * speed);

/**
 * Pick the next glitch trigger time relative to `now`, sampling uniformly
 * in `[intervalMin, intervalMax]`. `intervalMin === intervalMax` returns
 * exactly `now + intervalMin`. Wraps `Math.random()` in production; tests
 * inject a deterministic `rng`.
 */
export const nextGlitchTime = (
  now: number,
  intervalMin: number,
  intervalMax: number,
  rng: () => number
): number => {
  const min = Math.max(0, intervalMin);
  const max = Math.max(min, intervalMax);
  if (min === max) return now + min;
  return now + min + rng() * (max - min);
};
