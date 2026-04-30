import { describe, expect, it } from 'vitest';
import type { ChartSeries, ChartsDataEntry, ChartsDataLayer } from '../../types';
import {
  buildGroupedBarsChart,
  buildRadialBarsChart,
  buildStackedBarsChart,
  computeGlobalValuePeak,
  computeStackedGlobalPeak,
  disposeBars,
} from '../bars-builder';

const SERIES: ReadonlyArray<ChartSeries> = [
  { key: 'a', color: '#ff0000' },
  { key: 'b', color: '#00ff00' },
  { key: 'c', color: '#0000ff' },
];

const baseLayer = (overrides: Partial<ChartsDataLayer> = {}): ChartsDataLayer => ({
  type: 'charts',
  chartType: 'bars-grouped',
  data: [],
  series: SERIES,
  ...overrides,
});

describe('buildGroupedBarsChart', () => {
  it('produces one bar per series with target heights proportional to value/peak', () => {
    const entry: ChartsDataEntry = { values: { a: 50, b: 100, c: 25 } };
    const { bars } = buildGroupedBarsChart(entry, SERIES, baseLayer({ size: 0.06, height: 0.1 }), '#fff');
    expect(bars).toHaveLength(3);
    // Peak = 100 → b's height = full 0.1, a = 0.05, c = 0.025
    expect(bars[0]!.targetHeight).toBeCloseTo(0.05, 4);
    expect(bars[1]!.targetHeight).toBeCloseTo(0.1, 4);
    expect(bars[2]!.targetHeight).toBeCloseTo(0.025, 4);
    disposeBars(bars);
  });

  it('clamps negative or missing values to 0 height', () => {
    const entry: ChartsDataEntry = { values: { a: -10, b: 5 } };
    const { bars } = buildGroupedBarsChart(entry, SERIES, baseLayer(), '#fff');
    expect(bars[0]!.targetHeight).toBe(0);
    // c key is missing → 0
    expect(bars[2]!.targetHeight).toBe(0);
    disposeBars(bars);
  });

  it('uses series color when supplied', () => {
    const entry: ChartsDataEntry = { values: { a: 1, b: 1, c: 1 } };
    const { bars } = buildGroupedBarsChart(entry, SERIES, baseLayer(), '#000');
    expect(bars[0]!.material.color.getHexString()).toBe('ff0000');
    expect(bars[1]!.material.color.getHexString()).toBe('00ff00');
    expect(bars[2]!.material.color.getHexString()).toBe('0000ff');
    disposeBars(bars);
  });

  it('can use a layer-wide peak so grouped bars are comparable across entries', () => {
    const entry: ChartsDataEntry = { values: { a: 50, b: 100, c: 25 } };
    const { bars } = buildGroupedBarsChart(
      entry,
      SERIES,
      baseLayer({ size: 0.06, height: 0.1 }),
      '#fff',
      200
    );
    expect(bars[1]!.targetHeight).toBeCloseTo(0.05, 4);
    expect(bars[1]!.seriesKey).toBe('b');
    expect(bars[1]!.seriesIndex).toBe(1);
    expect(bars[1]!.value).toBe(100);
    disposeBars(bars);
  });
});

describe('buildStackedBarsChart', () => {
  it('emits one segment per non-zero series with summed segment heights = stack height', () => {
    const entry: ChartsDataEntry = { values: { a: 30, b: 60, c: 0 } };
    const layer = baseLayer({ chartType: 'bars-stacked', size: 0.05, height: 0.1 });
    const { bars } = buildStackedBarsChart(entry, SERIES, layer, '#fff', /* globalPeak = */ 100);
    expect(bars).toHaveLength(2); // c skipped
    expect(bars[0]!.seriesKey).toBe('a');
    expect(bars[1]!.seriesKey).toBe('b');
    const totalH = bars.reduce((sum, b) => sum + b.targetHeight, 0);
    expect(totalH).toBeCloseTo(0.09, 4); // 90 / 100 × 0.1
    disposeBars(bars);
  });

  it('returns no bars when total is 0', () => {
    const entry: ChartsDataEntry = { values: { a: 0, b: 0, c: 0 } };
    const { bars } = buildStackedBarsChart(entry, SERIES, baseLayer({ chartType: 'bars-stacked' }), '#fff', 0);
    expect(bars).toHaveLength(0);
  });
});

describe('buildRadialBarsChart', () => {
  it('places bars around a circle with angles 2πi/N', () => {
    const entry: ChartsDataEntry = { values: { a: 10, b: 20, c: 30 } };
    const { bars } = buildRadialBarsChart(entry, SERIES, baseLayer({ chartType: 'radial', size: 0.06 }), '#fff');
    expect(bars).toHaveLength(3);
    // Bar 0 sits at angle 0 → x = +size/2, z = 0
    expect(bars[0]!.mesh.position.x).toBeCloseTo(0.03, 4);
    expect(bars[0]!.mesh.position.z).toBeCloseTo(0, 6);
    // Bar 1 at angle 120° → x ≈ -0.5 × 0.03, z ≈ +0.866 × 0.03
    expect(bars[1]!.mesh.position.x).toBeCloseTo(-0.015, 4);
    expect(bars[1]!.mesh.position.z).toBeCloseTo(0.026, 3);
    disposeBars(bars);
  });
});

describe('computeStackedGlobalPeak', () => {
  it('returns the largest sum across all entries', () => {
    const entries: ReadonlyArray<ChartsDataEntry> = [
      { values: { a: 1, b: 2, c: 3 } }, // 6
      { values: { a: 10, b: 20, c: 30 } }, // 60
      { values: { a: 5, b: 5, c: 5 } }, // 15
    ];
    expect(computeStackedGlobalPeak(entries, SERIES)).toBe(60);
  });

  it('returns 0 for empty data', () => {
    expect(computeStackedGlobalPeak([], SERIES)).toBe(0);
  });

  it('ignores negative / missing values when summing', () => {
    const entries: ReadonlyArray<ChartsDataEntry> = [
      { values: { a: 10, b: -5 } },
    ];
    expect(computeStackedGlobalPeak(entries, SERIES)).toBe(10);
  });
});

describe('computeGlobalValuePeak', () => {
  it('returns the largest individual series value across all entries', () => {
    const entries: ReadonlyArray<ChartsDataEntry> = [
      { values: { a: 1, b: 200, c: 3 } },
      { values: { a: 10, b: 20, c: 30 } },
    ];
    expect(computeGlobalValuePeak(entries, SERIES)).toBe(200);
  });
});
