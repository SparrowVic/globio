import type { PerspectiveCamera } from 'three';
import { angularExtent, type LatLngBounds } from '../utils/country-bounds';

/**
 * Compute camera radius such that the angular extent fits inside the
 * limiting field-of-view dimension with the given padding. Exact geometry:
 * tan(theta_screen) = R_g * sin(g/2) / (R - R_g * cos(g/2)).
 */
export const computeFocusDistance = (
  bounds: LatLngBounds,
  camera: PerspectiveCamera,
  padding: number,
  globeRadius: number,
  fallbackRadius: number,
): number => {
  const gamma = angularExtent(bounds);
  if (gamma <= 0) return fallbackRadius;
  const fovV = (camera.fov * Math.PI) / 180;
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * camera.aspect);
  const limitingFov = Math.min(fovV, fovH);
  const targetScreen = ((1 - 2 * padding) * limitingFov) / 2;
  const tanT = Math.tan(targetScreen);
  if (tanT <= 0) return fallbackRadius;
  return (globeRadius * Math.sin(gamma / 2)) / tanT + globeRadius * Math.cos(gamma / 2);
};
