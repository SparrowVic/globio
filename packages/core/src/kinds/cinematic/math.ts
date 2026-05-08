import { Vector3 } from 'three';
import type { LatLng } from '../../types';
import { latLngToVector3 } from '../../utils/coordinates';

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const saturate = clamp01;

export const smoothstep = (edge0: number, edge1: number, value: number): number => {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const endpointFade = (
  t: number,
  fade = 0.14,
): number => smoothstep(0, fade, t) * smoothstep(0, fade, 1 - t);

export const angularDistance = (from: LatLng, to: LatLng): number =>
  latLngToVector3(from, 1).angleTo(latLngToVector3(to, 1));

export const terminatorFactors = (
  normal: Vector3,
  lightDirection: Vector3,
  softness: number,
  contrast: number,
): {
  readonly day: number;
  readonly night: number;
  readonly twilight: number;
} => {
  const light = normal.dot(lightDirection);
  const safeSoftness = Math.max(0.001, softness);
  const rawDay = smoothstep(-safeSoftness, safeSoftness, light);
  const day = Math.pow(rawDay, Math.max(0.1, contrast));
  const twilight = Math.exp(-Math.pow(light / safeSoftness, 2));
  return {
    day,
    night: 1 - day,
    twilight,
  };
};

export const cameraFacing = (normal: Vector3, cameraPosition: Vector3): number =>
  clamp01(normal.dot(cameraPosition.clone().normalize()));

export const stableHash01 = (value: string | number): number => {
  const input = String(value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
};

export const wrapLng = (lng: number): number => ((lng + 540) % 360) - 180;

export const clampLat = (lat: number): number => Math.max(-86, Math.min(86, lat));
