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
