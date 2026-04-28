import type { ResolutionLevel } from '../types';
import type { CountryFeature } from '../renderer/countries-layer';

const RESOLUTION_URLS: Record<ResolutionLevel, string> = {
  low: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
  medium: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json',
  high: 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-10m.json',
};

interface TopoJsonObject {
  readonly type: string;
  readonly objects: { readonly countries: { readonly geometries: ReadonlyArray<unknown> } };
}

export interface GeoLoaderOptions {
  readonly resolution: ResolutionLevel;
  readonly customUrl?: string;
  readonly fetchFn?: typeof fetch;
}

export const loadCountries = async (
  options: GeoLoaderOptions
): Promise<ReadonlyArray<CountryFeature>> => {
  const { feature } = await import('topojson-client');
  const url = options.customUrl ?? RESOLUTION_URLS[options.resolution];
  const fetcher = options.fetchFn ?? fetch;

  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`Failed to load countries data: ${response.status}`);
  }
  const topology = (await response.json()) as TopoJsonObject;
  const geo = feature(topology as never, topology.objects.countries as never) as unknown as {
    readonly type: string;
    readonly features: ReadonlyArray<{
      readonly id?: string | number;
      readonly properties?: { readonly name?: string };
      readonly geometry: {
        readonly type: 'Polygon' | 'MultiPolygon';
        readonly coordinates: ReadonlyArray<unknown>;
      };
    }>;
  };

  return geo.features.map((f) => normalizeFeature(f));
};

const normalizeFeature = (raw: {
  readonly id?: string | number;
  readonly properties?: { readonly name?: string };
  readonly geometry: {
    readonly type: 'Polygon' | 'MultiPolygon';
    readonly coordinates: ReadonlyArray<unknown>;
  };
}): CountryFeature => {
  const polygons: Array<ReadonlyArray<ReadonlyArray<readonly [number, number]>>> = [];

  if (raw.geometry.type === 'Polygon') {
    polygons.push(
      raw.geometry.coordinates as ReadonlyArray<ReadonlyArray<readonly [number, number]>>
    );
  } else if (raw.geometry.type === 'MultiPolygon') {
    (raw.geometry.coordinates as ReadonlyArray<ReadonlyArray<ReadonlyArray<readonly [number, number]>>>).forEach(
      (polygon) => polygons.push(polygon)
    );
  }

  // Flat ring list for layers that don't care about hole structure.
  const rings: Array<ReadonlyArray<readonly [number, number]>> = [];
  for (const polygon of polygons) {
    for (const ring of polygon) rings.push(ring);
  }

  return {
    id: String(raw.id ?? ''),
    name: raw.properties?.name ?? 'Unknown',
    coordinates: rings,
    polygons,
  };
};
