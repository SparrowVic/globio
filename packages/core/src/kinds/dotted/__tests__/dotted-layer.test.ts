import { describe, it, expect } from 'vitest';
import { pointInRing, samplePolygonInterior } from '../dotted-layer';
import type { CountryPolygon } from '../../../renderer/country-feature';

const square10: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

// Inner CW hole 4..6 in lng, 4..6 in lat
const hole4to6: ReadonlyArray<readonly [number, number]> = [
  [4, 4],
  [4, 6],
  [6, 6],
  [6, 4],
  [4, 4],
];

describe('pointInRing', () => {
  it('returns true for a point clearly inside the square', () => {
    expect(pointInRing(square10, [5, 5])).toBe(true);
  });

  it('returns false for a point clearly outside the square', () => {
    expect(pointInRing(square10, [-1, 5])).toBe(false);
    expect(pointInRing(square10, [11, 5])).toBe(false);
    expect(pointInRing(square10, [5, -1])).toBe(false);
    expect(pointInRing(square10, [5, 11])).toBe(false);
  });

  it('handles a point inside a small hole ring', () => {
    expect(pointInRing(hole4to6, [5, 5])).toBe(true);
    expect(pointInRing(hole4to6, [3, 3])).toBe(false);
  });
});

describe('samplePolygonInterior', () => {
  it('samples a predictable count for a 10x10 square at density 0.5', () => {
    const polygon: CountryPolygon = [square10];
    const samples = samplePolygonInterior(polygon, 0.5);
    // Step 0.5 across [0..10] inclusive = 21 candidates per axis = 441 total,
    // minus the boundary points that fall exactly on the ring (top + right
    // edges miss the strict half-open intersection rule), leaving the
    // strict interior. With ring [0..10) edges, the conservative count is
    // 20 * 20 = 400; we accept anything in a tight band around it.
    expect(samples.length).toBeGreaterThan(380);
    expect(samples.length).toBeLessThan(441);
  });

  it('subtracts samples that fall inside a hole', () => {
    const polygon: CountryPolygon = [square10];
    const polygonWithHole: CountryPolygon = [square10, hole4to6];
    const a = samplePolygonInterior(polygon, 0.5).length;
    const b = samplePolygonInterior(polygonWithHole, 0.5).length;
    // Hole spans 2x2 lng/lat; at step 0.5 that's roughly 4*4 = 16 grid
    // points removed. Allow some boundary slack.
    expect(b).toBeLessThan(a);
    expect(a - b).toBeGreaterThan(8);
    expect(a - b).toBeLessThan(25);
  });

  it('returns empty for degenerate polygon (no outer ring)', () => {
    expect(samplePolygonInterior([], 1)).toEqual([]);
  });

  it('returns empty when density is non-positive', () => {
    expect(samplePolygonInterior([square10], 0)).toEqual([]);
  });

  it('handles antimeridian-crossing rings by wrapping samples to [-180, 180]', () => {
    // Polygon shaped like a band crossing the antimeridian: lng ∈ {170..190}
    // expressed in geojson form (-180..180) becomes [170, -170] alternating.
    const ring: ReadonlyArray<readonly [number, number]> = [
      [170, -5],
      [-170, -5],
      [-170, 5],
      [170, 5],
      [170, -5],
    ];
    const samples = samplePolygonInterior([ring], 2);
    expect(samples.length).toBeGreaterThan(0);
    // Every returned sample must be within standard [-180, 180].
    for (const [lng] of samples) {
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    }
    // At least one sample should sit on each side of the antimeridian, since
    // the band spans both.
    const hasNeg = samples.some(([lng]) => lng < -160);
    const hasPos = samples.some(([lng]) => lng > 160);
    expect(hasNeg).toBe(true);
    expect(hasPos).toBe(true);
  });
});
