import type { EasingFunction } from '../types';

/** Identity easing — constant velocity. */
export const linear: EasingFunction = (t) => t;

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
