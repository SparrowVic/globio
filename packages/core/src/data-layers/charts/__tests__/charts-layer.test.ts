import { describe, expect, it } from 'vitest';
import type { CountryFeature } from '../../../renderer/country-feature';
import type { ChartsDataLayer } from '../../types';
import { ChartsLayer } from '../charts-layer';

const makeFeature = (id: string, name: string, centerLng: number, centerLat: number): CountryFeature => {
  const half = 1;
  const ring: ReadonlyArray<readonly [number, number]> = [
    [centerLng - half, centerLat - half],
    [centerLng + half, centerLat - half],
    [centerLng + half, centerLat + half],
    [centerLng - half, centerLat + half],
    [centerLng - half, centerLat - half],
  ];
  return {
    id,
    name,
    coordinates: [ring],
    polygons: [[ring]],
  };
};

const baseLayer = (overrides: Partial<ChartsDataLayer> = {}): ChartsDataLayer => ({
  type: 'charts',
  chartType: 'bars-grouped',
  series: [{ key: 'v', color: '#ffffff' }],
  data: [
    { id: 'UNKNOWN', values: { v: 1 } },
    { id: 'PL', values: { v: 2 } },
    { id: 'DE', values: { v: 3 } },
  ],
  animation: { duration: 1000, stagger: 100, easing: 'linear' },
  ...overrides,
});

describe('ChartsLayer', () => {
  it('uses visible-anchor ranks for stagger but preserves original data indices', () => {
    const layer = new ChartsLayer({
      layer: baseLayer(),
      countryFeatures: [
        makeFeature('PL', 'Poland', 20, 52),
        makeFeature('DE', 'Germany', 10, 51),
      ],
    });

    const instances = (layer as unknown as {
      instances: ReadonlyArray<{ readonly entryIndex: number; readonly startSec: number }>;
    }).instances;

    expect(instances.map((i) => i.entryIndex)).toEqual([1, 2]);
    expect(instances.map((i) => i.startSec)).toEqual([0, 0.1]);
    layer.dispose();
  });
});
