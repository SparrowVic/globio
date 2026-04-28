import { describe, it, expect } from 'vitest';
import { computeBounds, boundsCenter, angularExtent } from '../country-bounds';

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
});
