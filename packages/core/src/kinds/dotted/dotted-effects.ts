/**
 * Pure math for the dotted kind's interactive effects.
 *
 * Both helpers return a unit-scaled brightness contribution. The layer sums
 * any number of active ripples + per-country flashes per vertex, then clamps
 * the total before passing it to the shader / color attribute.
 */

/**
 * Gaussian band centred on the wavefront radius. Peak == 1 when the dot
 * sits exactly on the wavefront, decays smoothly away in both directions.
 *
 * `width` is the standard-deviation-ish half-width in radians.
 */
export const rippleBrightness = (
  distance: number,
  wavefront: number,
  width: number
): number => {
  if (!Number.isFinite(distance) || !Number.isFinite(wavefront) || !Number.isFinite(width)) return 0;
  const w = width > 1e-6 ? width : 1e-6;
  const d = (distance - wavefront) / w;
  const v = Math.exp(-d * d);
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

/**
 * Exponential decay from `strength` toward 0. `decay = 0` keeps the value
 * pinned at `strength` (useful for tests / deterministic flashes).
 */
export const flashBrightness = (
  ageSeconds: number,
  decay: number,
  strength: number
): number => {
  if (!Number.isFinite(ageSeconds) || !Number.isFinite(decay) || !Number.isFinite(strength)) return 0;
  if (ageSeconds < 0) return strength;
  if (decay <= 0) return strength;
  const v = strength * Math.exp(-ageSeconds * decay);
  return Number.isFinite(v) ? v : 0;
};

/** Angular distance on the unit sphere between two normalised vectors. */
export const angularDistance = (
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number
): number => {
  const dot = ax * bx + ay * by + az * bz;
  const c = dot < -1 ? -1 : dot > 1 ? 1 : dot;
  return Math.acos(c);
};
