import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { GLOBE_RADIUS, latLngToVector3, vector3ToLatLng } from '../coordinates';

const TOLERANCE_DEG = 1e-6;

const samples: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [52.2297, 21.0122], // Warsaw
  [40.7128, -74.006], // NYC
  [-33.8688, 151.2093], // Sydney
  [-89.9, 179.9], // near south pole, near antimeridian
  [89.9, -179.9], // near north pole
];

describe('coordinates roundtrip', () => {
  it.each(samples)('latLngToVector3 → vector3ToLatLng preserves [%f, %f]', (lat, lng) => {
    const vec = latLngToVector3([lat, lng]);
    const [latBack, lngBack] = vector3ToLatLng(vec);
    expect(Math.abs(latBack - lat)).toBeLessThan(TOLERANCE_DEG);
    expect(Math.abs(lngBack - lng)).toBeLessThan(TOLERANCE_DEG);
  });

  it('latLngToVector3 places points on sphere of GLOBE_RADIUS', () => {
    for (const [lat, lng] of samples) {
      const vec = latLngToVector3([lat, lng]);
      expect(vec.length()).toBeCloseTo(GLOBE_RADIUS, 6);
    }
  });

  it('latLngToVector3 reuses target Vector3 when provided', () => {
    const target = new Vector3();
    const result = latLngToVector3([10, 20], GLOBE_RADIUS, target);
    expect(result).toBe(target);
  });
});
