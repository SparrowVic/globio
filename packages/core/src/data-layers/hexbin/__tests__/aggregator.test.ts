import { describe, expect, it } from 'vitest';
import { aggregateSamples } from '../aggregator';
import { buildIcosphere } from '../icosphere';

const ico = buildIcosphere(2); // 320 cells — small enough that lookups are obvious

describe('aggregateSamples', () => {
  it('sums values that fall in the same cell', () => {
    const samples = [
      { position: [0, 0] as const, value: 1 },
      { position: [0.5, 0.5] as const, value: 2 },
      { position: [-0.5, -0.5] as const, value: 3 },
    ];
    const bins = aggregateSamples(samples, ico.faceCentroids, 'sum');
    let totalFinite = 0;
    for (let i = 0; i < bins.values.length; i++) {
      const v = bins.values[i]!;
      if (Number.isFinite(v)) totalFinite += v;
    }
    expect(totalFinite).toBeCloseTo(6, 5);
    expect(bins.samplesBinned).toBe(3);
  });

  it('counts samples ignoring their value when mode is "count"', () => {
    const samples = [
      { position: [0, 0] as const, value: 999 },
      { position: [0, 0.1] as const, value: 999 },
      { position: [0, 0.2] as const, value: 999 },
    ];
    const bins = aggregateSamples(samples, ico.faceCentroids, 'count');
    let total = 0;
    for (let i = 0; i < bins.values.length; i++) {
      const v = bins.values[i]!;
      if (Number.isFinite(v)) total += v;
    }
    expect(total).toBeCloseTo(3, 5);
  });

  it('takes max of values when mode is "max"', () => {
    const samples = [
      { position: [0, 0] as const, value: 5 },
      { position: [0, 0] as const, value: 100 },
      { position: [0, 0] as const, value: 50 },
    ];
    const bins = aggregateSamples(samples, ico.faceCentroids, 'max');
    let max = -Infinity;
    for (let i = 0; i < bins.values.length; i++) {
      const v = bins.values[i]!;
      if (Number.isFinite(v) && v > max) max = v;
    }
    expect(max).toBe(100);
  });

  it('computes mean correctly when mode is "mean"', () => {
    const samples = [
      { position: [0, 0] as const, value: 10 },
      { position: [0, 0] as const, value: 20 },
      { position: [0, 0] as const, value: 30 },
    ];
    const bins = aggregateSamples(samples, ico.faceCentroids, 'mean');
    let foundMean = NaN;
    for (let i = 0; i < bins.values.length; i++) {
      const v = bins.values[i]!;
      if (Number.isFinite(v)) foundMean = v;
    }
    expect(foundMean).toBeCloseTo(20, 5);
  });

  it('marks empty cells as NaN and reports finite extent', () => {
    const samples = [{ position: [0, 0] as const, value: 7 }];
    const bins = aggregateSamples(samples, ico.faceCentroids, 'sum');
    let nanCount = 0;
    for (let i = 0; i < bins.values.length; i++) {
      if (!Number.isFinite(bins.values[i]!)) nanCount++;
    }
    expect(nanCount).toBe(ico.faceCentroids.length / 3 - 1);
    expect(bins.extent[0]).toBe(7);
    expect(bins.extent[1]).toBe(7);
  });

  it('treats missing value as 1 (so count mode + sum mode match for value-less data)', () => {
    const samples = [
      { position: [0, 0] as const },
      { position: [0, 0] as const },
    ];
    const bins = aggregateSamples(samples, ico.faceCentroids, 'sum');
    let total = 0;
    for (let i = 0; i < bins.values.length; i++) {
      const v = bins.values[i]!;
      if (Number.isFinite(v)) total += v;
    }
    expect(total).toBeCloseTo(2, 5);
  });

  it('takes min of values when mode is "min"', () => {
    const samples = [
      { position: [0, 0] as const, value: 5 },
      { position: [0, 0] as const, value: 100 },
      { position: [0, 0] as const, value: 50 },
    ];
    const bins = aggregateSamples(samples, ico.faceCentroids, 'min');
    let min = Infinity;
    for (let i = 0; i < bins.values.length; i++) {
      const v = bins.values[i]!;
      if (Number.isFinite(v) && v < min) min = v;
    }
    expect(min).toBe(5);
  });

  it('computes median (P50) per cell', () => {
    const samples = [
      { position: [0, 0] as const, value: 1 },
      { position: [0, 0] as const, value: 5 },
      { position: [0, 0] as const, value: 100 },
    ];
    const bins = aggregateSamples(samples, ico.faceCentroids, 'median');
    let found = NaN;
    for (let i = 0; i < bins.values.length; i++) {
      if (Number.isFinite(bins.values[i]!)) found = bins.values[i]!;
    }
    expect(found).toBe(5);
  });

  it('computes p90 per cell', () => {
    const samples = [
      { position: [0, 0] as const, value: 1 },
      { position: [0, 0] as const, value: 2 },
      { position: [0, 0] as const, value: 3 },
      { position: [0, 0] as const, value: 4 },
      { position: [0, 0] as const, value: 5 },
      { position: [0, 0] as const, value: 6 },
      { position: [0, 0] as const, value: 7 },
      { position: [0, 0] as const, value: 8 },
      { position: [0, 0] as const, value: 9 },
      { position: [0, 0] as const, value: 100 },
    ];
    const bins = aggregateSamples(samples, ico.faceCentroids, 'p90');
    let found = NaN;
    for (let i = 0; i < bins.values.length; i++) {
      if (Number.isFinite(bins.values[i]!)) found = bins.values[i]!;
    }
    // p90 of 10 samples = index floor(10 × 0.9) = 9 → value 100.
    expect(found).toBe(100);
  });

  it('reports samplesBinned == samples.length even when many samples land in the same cell', () => {
    const samples = Array.from({ length: 50 }, () => ({
      position: [0, 0] as const,
      value: 1,
    }));
    const bins = aggregateSamples(samples, ico.faceCentroids, 'sum');
    expect(bins.samplesBinned).toBe(50);
  });
});
