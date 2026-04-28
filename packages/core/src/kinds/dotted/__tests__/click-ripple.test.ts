import { describe, it, expect } from 'vitest';
import { rippleBrightness, flashBrightness, angularDistance } from '../dotted-effects';

describe('rippleBrightness', () => {
  it('peaks at ~1.0 when distance == wavefront', () => {
    expect(rippleBrightness(0.5, 0.5, 0.18)).toBeCloseTo(1.0, 5);
  });

  it('decays toward zero outside ~3*width from the wavefront', () => {
    const width = 0.18;
    const v = rippleBrightness(0.5 + 4 * width, 0.5, width);
    expect(v).toBeLessThan(1e-6);
  });

  it('is symmetric around the wavefront', () => {
    const before = rippleBrightness(0.4, 0.5, 0.1);
    const after = rippleBrightness(0.6, 0.5, 0.1);
    expect(before).toBeCloseTo(after, 6);
  });

  it('returns finite values in [0, 1] for huge / negative inputs', () => {
    const cases: ReadonlyArray<readonly [number, number, number]> = [
      [-1, 0, 0.1],
      [1e6, 0, 0.1],
      [0, -1e6, 0.1],
      [0, 0, 0],
      [Number.NaN, 0, 0.1],
      [Number.POSITIVE_INFINITY, 0, 0.1],
    ];
    for (const [d, w, width] of cases) {
      const v = rippleBrightness(d, w, width);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('narrower width → sharper falloff at the same offset', () => {
    const offset = 0.1;
    const wide = rippleBrightness(0.5 + offset, 0.5, 0.2);
    const tight = rippleBrightness(0.5 + offset, 0.5, 0.05);
    expect(tight).toBeLessThan(wide);
  });
});

describe('flashBrightness', () => {
  it('returns peak strength at age 0', () => {
    expect(flashBrightness(0, 4, 2)).toBeCloseTo(2, 6);
  });

  it('decays toward zero for large ages', () => {
    expect(flashBrightness(10, 4, 2)).toBeLessThan(1e-6);
  });

  it('decay = 0 keeps the value pinned at strength', () => {
    expect(flashBrightness(0.5, 0, 2)).toBe(2);
    expect(flashBrightness(50, 0, 2)).toBe(2);
  });

  it('half-life matches the decay constant', () => {
    // exp(-decay * t) = 0.5 → t = ln(2) / decay
    const decay = 4;
    const halfLife = Math.LN2 / decay;
    expect(flashBrightness(halfLife, decay, 2)).toBeCloseTo(1, 5);
  });

  it('handles non-finite inputs', () => {
    expect(flashBrightness(Number.NaN, 4, 2)).toBe(0);
    expect(flashBrightness(0, Number.POSITIVE_INFINITY, 2)).toBe(0);
  });
});

describe('angularDistance', () => {
  it('returns 0 for identical unit vectors', () => {
    expect(angularDistance(1, 0, 0, 1, 0, 0)).toBeCloseTo(0, 6);
  });

  it('returns ~PI for antipodal unit vectors', () => {
    expect(angularDistance(1, 0, 0, -1, 0, 0)).toBeCloseTo(Math.PI, 6);
  });

  it('returns PI/2 for orthogonal unit vectors', () => {
    expect(angularDistance(1, 0, 0, 0, 1, 0)).toBeCloseTo(Math.PI / 2, 6);
  });

  it('clamps numerically out-of-range dots to avoid NaN', () => {
    // Slightly-greater-than-1 dot from float drift — must still be 0.
    expect(angularDistance(1.0001, 0, 0, 1, 0, 0)).toBeCloseTo(0, 6);
  });
});
