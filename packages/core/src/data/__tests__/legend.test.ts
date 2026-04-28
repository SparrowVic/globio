import { describe, it, expect } from 'vitest';
import { computeLegendTicks } from '../legend';

describe('computeLegendTicks', () => {
  it('returns evenly-spaced ticks inclusive of both endpoints', () => {
    expect(computeLegendTicks([0, 100], 5)).toEqual([0, 25, 50, 75, 100]);
  });

  it('clamps tick count to at least 2 (otherwise the bar has no labels)', () => {
    expect(computeLegendTicks([0, 100], 1)).toEqual([0, 100]);
    expect(computeLegendTicks([0, 100], 0)).toEqual([0, 100]);
  });

  it('returns a single value when domain is a point', () => {
    expect(computeLegendTicks([42, 42], 5)).toEqual([42]);
  });

  it('handles negative domains and asymmetric ranges', () => {
    expect(computeLegendTicks([-10, 30], 5)).toEqual([-10, 0, 10, 20, 30]);
  });

  it('rounds the count down to an integer', () => {
    // 4.7 → floor → 4 ticks
    expect(computeLegendTicks([0, 30], 4.7)).toEqual([0, 10, 20, 30]);
  });
});
