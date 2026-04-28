import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { triangulateRing, ringSignedArea } from '../triangulate-ring';
import { GLOBE_RADIUS, vector3ToLatLng } from '../coordinates';

const square: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

const squareCW: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, 10],
  [10, 10],
  [10, 0],
  [0, 0],
];

describe('ringSignedArea', () => {
  it('returns positive area for counterclockwise ring (outer in GeoJSON)', () => {
    expect(ringSignedArea(square)).toBeGreaterThan(0);
  });

  it('returns negative area for clockwise ring (hole in GeoJSON)', () => {
    expect(ringSignedArea(squareCW)).toBeLessThan(0);
  });

  it('returns ~zero area for degenerate ring with <3 points', () => {
    expect(ringSignedArea([[0, 0], [1, 1]])).toBe(0);
  });
});

describe('triangulateRing', () => {
  it('triangulates clockwise rings (D3/Esri convention) too — orientation is not used as a filter', () => {
    // World-atlas/Natural-Earth uses CW=outer convention. We must accept both.
    expect(triangulateRing(squareCW, GLOBE_RADIUS * 1.001)).not.toBeNull();
  });

  it('returns null for ring with fewer than 3 distinct points', () => {
    expect(triangulateRing([[0, 0], [1, 1]], GLOBE_RADIUS * 1.001)).toBeNull();
  });

  it('returns null for ring with near-zero (degenerate) area', () => {
    // Three collinear points form a closed ring with zero area.
    const collinear: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [5, 0],
      [10, 0],
      [0, 0],
    ];
    expect(triangulateRing(collinear, GLOBE_RADIUS * 1.001)).toBeNull();
  });

  it('triangulates a counterclockwise ring into 3D positions and indices', () => {
    const result = triangulateRing(square, GLOBE_RADIUS * 1.001);
    expect(result).not.toBeNull();
    if (!result) return;
    // square has 4 unique vertices → triangulated as 2 triangles → 6 indices
    expect(result.indices.length).toBe(6);
    expect(result.positions.length).toBe(4 * 3); // 4 vertices × xyz
    // every vertex lies on the requested radius
    for (let i = 0; i < result.positions.length; i += 3) {
      const x = result.positions[i] ?? 0;
      const y = result.positions[i + 1] ?? 0;
      const z = result.positions[i + 2] ?? 0;
      const r = Math.sqrt(x * x + y * y + z * z);
      expect(r).toBeCloseTo(GLOBE_RADIUS * 1.001, 4);
    }
  });

  it('drops trailing closing vertex if duplicate of first', () => {
    // square has [0,0] both at index 0 and 4. After triangulation we should
    // have 4 positions, not 5 — earcut would otherwise produce zero-area tris.
    const result = triangulateRing(square, GLOBE_RADIUS * 1.001);
    expect(result?.positions.length).toBe(4 * 3);
  });

  it('places 3D vertices at the correct lat/lng (GeoJSON [lng, lat] convention)', () => {
    // Ring vertex [10, 20] in GeoJSON convention is lng=10, lat=20.
    // After triangulation + roundtrip via vector3ToLatLng, we must read back lat=20, lng=10.
    // (Earlier bug: positions came out swapped.)
    const ring: ReadonlyArray<readonly [number, number]> = [
      [10, 20],
      [30, 20],
      [30, 40],
      [10, 40],
      [10, 20],
    ];
    const result = triangulateRing(ring, GLOBE_RADIUS);
    expect(result).not.toBeNull();
    if (!result) return;
    // First vertex
    const v0 = new Vector3(result.positions[0], result.positions[1], result.positions[2]);
    const [lat0, lng0] = vector3ToLatLng(v0);
    expect(lat0).toBeCloseTo(20, 4);
    expect(lng0).toBeCloseTo(10, 4);
    // Third vertex (should map to lng=30, lat=40)
    const v2 = new Vector3(result.positions[6], result.positions[7], result.positions[8]);
    const [lat2, lng2] = vector3ToLatLng(v2);
    expect(lat2).toBeCloseTo(40, 4);
    expect(lng2).toBeCloseTo(30, 4);
  });
});
