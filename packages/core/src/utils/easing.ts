import type { EasingFunction, EasingName } from '../types';

/** Identity easing — constant velocity. */
export const linear: EasingFunction = (t) => t;

/** Slow start, fast finish. Good for "drop" feeling. */
export const easeInCubic: EasingFunction = (t) => t * t * t;

/** Fast start, slow finish. Good for "throw" feeling. */
export const easeOutCubic: EasingFunction = (t) => {
  const u = 1 - t;
  return 1 - u * u * u;
};

/**
 * Slow start, fast middle, slow finish — the most natural-feeling default for
 * camera flights between two settled positions.
 */
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Resolve a CSS-like easing name to its function. Returns undefined for
 * undefined input so callers can default themselves. Pass through functions.
 */
export const resolveEasing = (
  e: EasingFunction | EasingName | undefined
): EasingFunction | undefined => {
  if (typeof e === 'function') return e;
  if (e === 'linear') return linear;
  if (e === 'easeIn') return easeInCubic;
  if (e === 'easeOut') return easeOutCubic;
  if (e === 'easeInOut') return easeInOutCubic;
  return undefined;
};
