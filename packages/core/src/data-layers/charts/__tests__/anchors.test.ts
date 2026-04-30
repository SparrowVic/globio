import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { CountryFeature } from '../../../renderer/country-feature';
import type { ChartsDataEntry } from '../../types';
import { buildChartAnchor, resolveChartPosition } from '../anchors';

const makeFeature = (id: string, name: string, ring: ReadonlyArray<readonly [number, number]>): CountryFeature => ({
  id,
  name,
  coordinates: [ring],
  polygons: [[ring]],
});

const ringSquare = (centerLng: number, centerLat: number, half: number): ReadonlyArray<readonly [number, number]> => [
  [centerLng - half, centerLat - half],
  [centerLng + half, centerLat - half],
  [centerLng + half, centerLat + half],
  [centerLng - half, centerLat + half],
  [centerLng - half, centerLat - half],
];

describe('resolveChartPosition', () => {
  const features = new Map<string, CountryFeature>();
  features.set('PL', makeFeature('PL', 'Poland', ringSquare(20, 52, 3)));

  it('returns explicit position when present', () => {
    const entry: ChartsDataEntry = { position: [1, 2], values: { a: 1 } };
    expect(resolveChartPosition(entry, features)).toEqual([1, 2]);
  });

  it('falls back to country centroid by id', () => {
    const entry: ChartsDataEntry = { id: 'PL', values: { a: 1 } };
    const res = resolveChartPosition(entry, features);
    expect(res).not.toBeNull();
    if (res) {
      expect(res[0]).toBeCloseTo(52, 0);
      expect(res[1]).toBeCloseTo(20, 0);
    }
  });

  it('returns null when neither is present or id is unknown', () => {
    expect(resolveChartPosition({ values: {} }, features)).toBeNull();
    expect(resolveChartPosition({ id: 'XX', values: {} }, features)).toBeNull();
  });
});

describe('buildChartAnchor', () => {
  it('puts surface vector on the globe radius shell (≈ 1.0 × GLOBE_RADIUS lift)', () => {
    const a = buildChartAnchor([0, 0]);
    // surface should be a non-zero vector and the normal should be unit length
    expect(a.surface.length()).toBeGreaterThan(0.5);
    expect(a.normal.length()).toBeCloseTo(1, 5);
  });

  it('quaternion rotates local +Y onto the surface normal', () => {
    const a = buildChartAnchor([45, 90]);
    const out = new Vector3(0, 1, 0).applyQuaternion(a.quaternion);
    expect(out.length()).toBeCloseTo(1, 5);
    expect(out.x).toBeCloseTo(a.normal.x, 5);
    expect(out.y).toBeCloseTo(a.normal.y, 5);
    expect(out.z).toBeCloseTo(a.normal.z, 5);
  });

  it('keeps local -Z roughly north at the equator', () => {
    const a = buildChartAnchor([0, 0]);
    const localNorth = new Vector3(0, 0, -1).applyQuaternion(a.quaternion);
    expect(localNorth.y).toBeGreaterThan(0.99);
  });

  it('produces consistent surface for equator (lat=0, lng=0)', () => {
    const a = buildChartAnchor([0, 0]);
    // [0,0] → Vector3 along +X axis (per latLngToVector3 convention)
    expect(a.normal.y).toBeCloseTo(0, 5);
  });

  it('north pole anchors point +Y', () => {
    const a = buildChartAnchor([90, 0]);
    expect(a.normal.y).toBeCloseTo(1, 4);
  });
});
