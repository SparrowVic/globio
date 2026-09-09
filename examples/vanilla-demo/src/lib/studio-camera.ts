import type { GlobeConfig } from '@your-globe/core';

/** Fit the globe and atmosphere into the narrower canvas dimension. */
export function studioHomeDistance(
  width: number,
  height: number,
  limits: Pick<GlobeConfig, 'minZoom' | 'maxZoom'> = {},
): number {
  // SceneManager uses a 45-degree vertical field of view. The visible
  // atmosphere reaches roughly 1.25 globe radii; leave 6% breathing room.
  const verticalHalfFov = Math.PI / 8;
  const aspect = width > 0 && height > 0 ? width / height : 1;
  const halfFov = Math.atan(Math.tan(verticalHalfFov) * Math.min(1, aspect));
  const distance = (1.25 * 1.06) / Math.sin(halfFov);
  return Math.min(limits.maxZoom ?? 7.5, Math.max(limits.minZoom ?? 1.25, distance));
}
