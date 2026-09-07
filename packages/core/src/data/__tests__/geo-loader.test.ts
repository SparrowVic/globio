import { describe, expect, it } from 'vitest';
import { loadCountries } from '../geo-loader';

// A minimal TopoJSON topology: one square arc shared by three "countries"
// whose ids cover the cases the loader must normalise.
const topology = {
  type: 'Topology',
  objects: {
    countries: {
      type: 'GeometryCollection',
      geometries: [
        { type: 'Polygon', arcs: [[0]], id: 32, properties: { name: 'Argentina' } },
        { type: 'Polygon', arcs: [[0]], id: '840', properties: { name: 'United States' } },
        { type: 'Polygon', arcs: [[0]], id: 'XK', properties: { name: 'Kosovo' } },
        { type: 'Polygon', arcs: [[0]] },
      ],
    },
  },
  arcs: [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ],
  ],
};

const fetchFn = (async () =>
  ({ ok: true, json: async () => topology }) as unknown as Response) as unknown as typeof fetch;

describe('loadCountries', () => {
  it('normalises numeric ids to zero-padded 3-character strings', async () => {
    const features = await loadCountries({ resolution: 'low', fetchFn });
    expect(features.map((f) => f.id)).toEqual(['032', '840', 'XK', '']);
    expect(features[0]?.name).toBe('Argentina');
    expect(features[3]?.name).toBe('Unknown');
  });

  it('keeps polygon rings for every feature', async () => {
    const features = await loadCountries({ resolution: 'low', fetchFn });
    for (const f of features) {
      expect(f.polygons.length).toBe(1);
      expect(f.coordinates[0]?.length).toBe(5);
    }
  });
});
