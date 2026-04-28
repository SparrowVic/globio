import { Vector3 } from 'three';
import type { LatLng } from '../types';

export const GLOBE_RADIUS = 1;

export const latLngToVector3 = (
  position: LatLng,
  radius: number = GLOBE_RADIUS,
  target?: Vector3
): Vector3 => {
  const [lat, lng] = position;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return target ? target.set(x, y, z) : new Vector3(x, y, z);
};

export const vector3ToLatLng = (vector: Vector3): LatLng => {
  const normalized = vector.clone().normalize();
  const lat = 90 - (Math.acos(normalized.y) * 180) / Math.PI;
  const lng = ((Math.atan2(normalized.z, -normalized.x) * 180) / Math.PI) - 180;
  return [lat, ((lng + 540) % 360) - 180];
};

export const isPointVisibleFromCamera = (
  pointOnSphere: Vector3,
  cameraPosition: Vector3
): boolean => {
  const cameraDirection = cameraPosition.clone().normalize();
  return pointOnSphere.dot(cameraDirection) > 0;
};
