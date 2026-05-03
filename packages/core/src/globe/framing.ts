import type { PerspectiveCamera } from 'three';
import { GLOBE_RADIUS } from '../utils/coordinates';
import type { FramingConfig } from '../types';

/**
 * Atmosphere mesh sits at GLOBE_RADIUS × 1.15; its Fresnel falloff is
 * visible out to ~1.25 R. Used as the framing target so the halo doesn't
 * clip against canvas edges in transparent / decoration mode.
 */
export const HALO_RADIUS = GLOBE_RADIUS * 1.25;

/**
 * Solve the perspective equation `half_height = distance * tan(fov/2)`
 * for the camera distance that frames the visible globe (atmosphere halo
 * inclusive) with the requested padding. Returns `null` when the caller
 * didn't ask for explicit framing — caller should keep the renderer's
 * default camera distance in that case.
 */
export const computeFramedDistance = (
  framing: FramingConfig | undefined,
  camera: PerspectiveCamera,
): number | null => {
  const padding = framing?.padding;
  if (padding === undefined || padding < 0) return null;
  const fovRad = (camera.fov * Math.PI) / 180;
  return (HALO_RADIUS * (1 + padding)) / Math.tan(fovRad / 2);
};
