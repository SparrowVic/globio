import { describe, it, expect } from 'vitest';
import { computeBounds, boundsCenter, angularExtent, computeMainRingBounds } from '../country-bounds';

const square: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [10, 0],
  [10, 20],
  [0, 20],
  [0, 0],
];

const offsetTriangle: ReadonlyArray<readonly [number, number]> = [
  [-50, 30],
  [-40, 30],
  [-45, 35],
  [-50, 30],
];

describe('computeBounds', () => {
  it('computes bbox for a single ring', () => {
    const b = computeBounds([square]);
    expect(b.minLng).toBe(0);
    expect(b.maxLng).toBe(10);
    expect(b.minLat).toBe(0);
    expect(b.maxLat).toBe(20);
  });

  it('unions bboxes across multiple rings', () => {
    const b = computeBounds([square, offsetTriangle]);
    expect(b.minLng).toBe(-50);
    expect(b.maxLng).toBe(10);
    expect(b.minLat).toBe(0);
    expect(b.maxLat).toBe(35);
  });

  it('returns NaN-free empty-bounds sentinel for empty input', () => {
    const b = computeBounds([]);
    expect(Number.isFinite(b.minLat)).toBe(true);
    expect(Number.isFinite(b.maxLat)).toBe(true);
  });
});

describe('boundsCenter', () => {
  it('returns midpoint as [lat, lng]', () => {
    const b = computeBounds([square]);
    const [lat, lng] = boundsCenter(b);
    expect(lat).toBe(10);
    expect(lng).toBe(5);
  });
});

describe('angularExtent', () => {
  it('returns max of (lat-extent, lng-extent) in radians', () => {
    const b = computeBounds([square]);
    const ext = angularExtent(b);
    expect(ext).toBeCloseTo((20 * Math.PI) / 180, 6);
  });

  it('returns 0 for degenerate (zero-area) bounds', () => {
    const point: ReadonlyArray<readonly [number, number]> = [[5, 5], [5, 5]];
    const b = computeBounds([point]);
    expect(angularExtent(b)).toBe(0);
  });

  it('treats Antarctica-like bbox as a south polar cap, not a 360° band', () => {
    // Antarctica: ring wraps the south pole, bbox spans the full lng range
    // and reaches lat -90. Naive angularExtent would say "360° wide" — useless
    // for camera framing. With the cap heuristic we return the cap's diameter
    // (twice the polar offset).
    const antarcticaBounds = { minLat: -90, maxLat: -65, minLng: -180, maxLng: 180 };
    const ext = angularExtent(antarcticaBounds);
    // 2 × (90 + -65) = 50 degrees of arc
    expect(ext).toBeCloseTo((50 * Math.PI) / 180, 6);
  });

  it('treats a north polar cap analogously', () => {
    const arcticBounds = { minLat: 70, maxLat: 90, minLng: -180, maxLng: 180 };
    const ext = angularExtent(arcticBounds);
    // 2 × (90 - 70) = 40 degrees of arc
    expect(ext).toBeCloseTo((40 * Math.PI) / 180, 6);
  });
});

describe('boundsCenter', () => {
  it('snaps a south polar cap center to the south pole', () => {
    const antarctic = { minLat: -90, maxLat: -65, minLng: -180, maxLng: 180 };
    expect(boundsCenter(antarctic)).toEqual([-90, 0]);
  });

  it('snaps a north polar cap center to the north pole', () => {
    const arctic = { minLat: 70, maxLat: 90, minLng: -180, maxLng: 180 };
    expect(boundsCenter(arctic)).toEqual([90, 0]);
  });
});

describe('computeMainRingBounds', () => {
  it('returns the bounds of the single ring when only one is provided', () => {
    const b = computeMainRingBounds([square]);
    expect(b).toEqual(computeBounds([square]));
  });

  it('picks the larger-area ring out of multiple disjoint rings', () => {
    // square has 200° area; offsetTriangle has 50° area → square wins.
    const b = computeMainRingBounds([offsetTriangle, square]);
    expect(b).toEqual(computeBounds([square]));
  });

  it('frames mainland for USA-like feature (continental + far island)', () => {
    const continental: ReadonlyArray<readonly [number, number]> = [
      [-125, 25],
      [-65, 25],
      [-65, 50],
      [-125, 50],
      [-125, 25],
    ];
    const hawaii: ReadonlyArray<readonly [number, number]> = [
      [-160, 19],
      [-155, 19],
      [-155, 22],
      [-160, 22],
      [-160, 19],
    ];
    const main = computeMainRingBounds([continental, hawaii]);
    expect(main.minLng).toBe(-125);
    expect(main.maxLng).toBe(-65);
  });
});
