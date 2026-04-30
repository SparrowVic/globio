import { describe, expect, it } from 'vitest';
import type { ChartSeries, ChartsDataEntry, ChartsDataLayer } from '../../types';
import {
  buildDonutChart,
  buildGaugeChart,
  buildPieChart,
  buildSunburstChart,
  disposePieSegments,
} from '../pie-builder';

const SERIES: ReadonlyArray<ChartSeries> = [
  { key: 'a', color: '#ff0000' },
  { key: 'b', color: '#00ff00' },
  { key: 'c', color: '#0000ff' },
];

const baseLayer = (overrides: Partial<ChartsDataLayer> = {}): ChartsDataLayer => ({
  type: 'charts',
  chartType: 'pie',
  data: [],
  series: SERIES,
  ...overrides,
});

describe('pie / donut segment metadata', () => {
  it('skips zero-value segments without shifting hover payload keys', () => {
    const entry: ChartsDataEntry = { values: { a: 10, b: 0, c: 30 } };
    const { segments } = buildPieChart(entry, SERIES, baseLayer(), '#fff');
    expect(segments).toHaveLength(2);
    expect(segments.map((s) => s.seriesKey)).toEqual(['a', 'c']);
    expect(segments.map((s) => s.seriesIndex)).toEqual([0, 2]);
    expect(segments.map((s) => s.value)).toEqual([10, 30]);
    disposePieSegments(segments);
  });

  it('keeps the same metadata for donut segments', () => {
    const entry: ChartsDataEntry = { values: { a: 0, b: 20, c: 5 } };
    const { segments } = buildDonutChart(
      entry,
      SERIES,
      baseLayer({ chartType: 'donut' }),
      '#fff'
    );
    expect(segments.map((s) => s.seriesKey)).toEqual(['b', 'c']);
    expect(segments.map((s) => s.seriesIndex)).toEqual([1, 2]);
    disposePieSegments(segments);
  });
});

describe('gauge segment metadata', () => {
  it('maps both the track and fill to the gauge series', () => {
    const entry: ChartsDataEntry = { values: { kpi: 42 } };
    const series: ReadonlyArray<ChartSeries> = [{ key: 'kpi', color: '#65d18a' }];
    const { segments } = buildGaugeChart(
      entry,
      series,
      baseLayer({ chartType: 'gauge', series, gaugeMax: 100 }),
      '#fff'
    );
    expect(segments).toHaveLength(2);
    expect(segments.map((s) => s.seriesKey)).toEqual(['kpi', 'kpi']);
    expect(segments.map((s) => s.seriesIndex)).toEqual([0, 0]);
    expect(segments.map((s) => s.value)).toEqual([42, 42]);
    disposePieSegments(segments);
  });
});

describe('sunburst segment metadata', () => {
  it('marks the core as aggregate and preserves outer segment series keys', () => {
    const entry: ChartsDataEntry = { values: { a: 10, b: 0, c: 30 } };
    const { segments } = buildSunburstChart(
      entry,
      SERIES,
      baseLayer({ chartType: 'sunburst' }),
      '#fff'
    );
    expect(segments).toHaveLength(3);
    expect(segments[0]!.seriesKey).toBeNull();
    expect(segments[0]!.seriesIndex).toBe(-1);
    expect(segments[0]!.value).toBe(40);
    expect(segments.slice(1).map((s) => s.seriesKey)).toEqual(['a', 'c']);
    expect(segments.slice(1).map((s) => s.seriesIndex)).toEqual([0, 2]);
    disposePieSegments(segments);
  });
});
