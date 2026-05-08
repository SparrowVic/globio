import type {
  CinematicCityLightDatum,
  CinematicDataset,
  CinematicRouteDatum,
  CinematicRouteEndpoint,
} from '../../types/kinds';
import type { LatLng } from '../../types';
import { CINEMATIC_CITY_NODES, hash01 } from './city-data';
import { clampLat, stableHash01, wrapLng } from './math';

export interface CinematicCityPoint {
  readonly id: string;
  readonly lat: number;
  readonly lng: number;
  readonly value: number;
  readonly radius: number;
  readonly temperature: number;
  readonly importance: number;
  readonly color?: string;
  readonly group?: string;
  readonly payload?: unknown;
}

export interface CinematicRoute {
  readonly id: string;
  readonly from: LatLng;
  readonly to: LatLng;
  readonly value: number;
  readonly width: number;
  readonly color?: string;
  readonly speed: number;
  readonly height: number;
  readonly phase: number;
  readonly payload?: unknown;
}

export interface CinematicPreparedData {
  readonly cityPoints: ReadonlyArray<CinematicCityPoint>;
  readonly routes: ReadonlyArray<CinematicRoute>;
  readonly density: Float32Array;
  readonly densityWidth: number;
  readonly densityHeight: number;
  readonly maxDensity: number;
}

export interface CinematicDataOptions {
  readonly cityCount: number;
  readonly maxRoutes: number;
}

const DEFAULT_ROUTE_IDS: ReadonlyArray<readonly [string, string]> = [
  ['new-york', 'london'],
  ['new-york', 'los-angeles'],
  ['new-york', 'toronto'],
  ['new-york', 'chicago'],
  ['new-york', 'washington'],
  ['washington', 'atlanta'],
  ['new-york', 'miami'],
  ['chicago', 'toronto'],
  ['chicago', 'los-angeles'],
  ['chicago', 'dallas'],
  ['chicago', 'mexico-city'],
  ['dallas', 'atlanta'],
  ['dallas', 'mexico-city'],
  ['miami', 'mexico-city'],
  ['miami', 'bogota'],
  ['miami', 'sao-paulo'],
  ['toronto', 'london'],
  ['seattle', 'san-francisco'],
  ['seattle', 'tokyo'],
  ['san-francisco', 'los-angeles'],
  ['los-angeles', 'tokyo'],
  ['los-angeles', 'sydney'],
  ['los-angeles', 'mexico-city'],
  ['mexico-city', 'sao-paulo'],
  ['mexico-city', 'bogota'],
  ['bogota', 'lima'],
  ['lima', 'santiago'],
  ['santiago', 'buenos-aires'],
  ['mexico-city', 'buenos-aires'],
  ['sao-paulo', 'buenos-aires'],
  ['sao-paulo', 'lagos'],
  ['sao-paulo', 'johannesburg'],
  ['buenos-aires', 'johannesburg'],
  ['london', 'paris'],
  ['london', 'berlin'],
  ['london', 'madrid'],
  ['paris', 'rome'],
  ['berlin', 'moscow'],
  ['rome', 'cairo'],
  ['cairo', 'dubai'],
  ['cairo', 'lagos'],
  ['lagos', 'johannesburg'],
  ['istanbul', 'dubai'],
  ['istanbul', 'moscow'],
  ['dubai', 'mumbai'],
  ['mumbai', 'delhi'],
  ['delhi', 'bangkok'],
  ['bangkok', 'singapore'],
  ['singapore', 'jakarta'],
  ['hong-kong', 'shanghai'],
  ['hong-kong', 'singapore'],
  ['shanghai', 'beijing'],
  ['shanghai', 'seoul'],
  ['seoul', 'tokyo'],
  ['tokyo', 'osaka'],
  ['tokyo', 'sydney'],
  ['sydney', 'melbourne'],
];

export const prepareCinematicData = (
  dataset: CinematicDataset | null | undefined,
  options: CinematicDataOptions,
): CinematicPreparedData => {
  const cityPoints =
    dataset?.cityLights && dataset.cityLights.length > 0
      ? normalizeCityData(dataset.cityLights, options.cityCount)
      : buildFallbackCityPoints(options.cityCount);
  const routes =
    dataset?.routes && dataset.routes.length > 0
      ? normalizeRoutes(dataset.routes, cityPoints, options.maxRoutes)
      : buildFallbackRoutes(cityPoints, options.maxRoutes);
  const densityInfo = buildDensityGrid(cityPoints, 256, 128);
  return {
    cityPoints,
    routes,
    ...densityInfo,
  };
};

export const normalizeCityData = (
  input: ReadonlyArray<CinematicCityLightDatum>,
  limit: number,
): ReadonlyArray<CinematicCityPoint> => {
  const sorted = [...input]
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .sort((a, b) => (b.importance ?? b.value ?? 1) - (a.importance ?? a.value ?? 1));
  const capped = sorted.slice(0, Math.max(0, Math.floor(limit || sorted.length)));
  return capped.map((point, index) => ({
    id: point.id ?? `city-${index}`,
    lat: clampLat(point.lat),
    lng: wrapLng(point.lng),
    value: Math.max(0.001, point.value ?? point.importance ?? 1),
    radius: Math.max(0.05, point.radius ?? 0.65),
    temperature: Math.max(0, Math.min(1, point.temperature ?? 0.62)),
    importance: Math.max(0.001, point.importance ?? point.value ?? 1),
    ...(point.color !== undefined && { color: point.color }),
    ...(point.group !== undefined && { group: point.group }),
    ...(point.payload !== undefined && { payload: point.payload }),
  }));
};

export const buildFallbackCityPoints = (count: number): ReadonlyArray<CinematicCityPoint> => {
  const totalWeight = CINEMATIC_CITY_NODES.reduce((sum, node) => sum + node.weight, 0);
  const points: CinematicCityPoint[] = [];
  const safeCount = Math.max(0, Math.floor(count));
  for (let i = 0; i < safeCount; i++) {
    const node = chooseFallbackNode(hash01(i * 7.13 + 3.1) * totalWeight);
    const r1 = hash01(i * 11.77 + 0.4);
    const r2 = hash01(i * 19.31 + 2.9);
    const r3 = hash01(i * 23.61 + 7.4);
    const r4 = hash01(i * 29.27 + 1.8);
    const angle = r1 * Math.PI * 2;
    const distance = Math.pow(r2, 1.42) * node.spread * 1.85;
    const lat = clampLat(node.lat + Math.cos(angle) * distance);
    const lngScale = Math.max(0.22, Math.cos((lat * Math.PI) / 180));
    const lng = wrapLng(node.lng + (Math.sin(angle) * distance) / lngScale);
    points.push({
      id: `${node.id}-${i}`,
      lat,
      lng,
      value: 0.24 + Math.pow(1 - r2, 1.55) * 0.42 + Math.pow(r4, 5) * 0.62,
      radius: node.spread,
      temperature: 0.42 + r3 * 0.4,
      importance: node.weight * (0.72 + r4 * 0.55),
      group: node.id,
    });
  }
  return points;
};

export const normalizeRoutes = (
  routes: ReadonlyArray<CinematicRouteDatum>,
  cityPoints: ReadonlyArray<CinematicCityPoint>,
  limit: number,
): ReadonlyArray<CinematicRoute> => {
  const byId = buildPointIndex(cityPoints);
  const normalized: CinematicRoute[] = [];
  routes.slice(0, Math.max(0, Math.floor(limit || routes.length))).forEach((route, index) => {
    const from = resolveEndpoint(route.from, byId);
    const to = resolveEndpoint(route.to, byId);
    if (!from || !to) return;
    const id = route.id ?? `route-${index}`;
    normalized.push({
      id,
      from,
      to,
      value: Math.max(0.001, route.value ?? 1),
      width: Math.max(0.1, route.width ?? route.value ?? 1),
      ...(route.color !== undefined && { color: route.color }),
      speed: Math.max(0.01, route.speed ?? 0.22 + stableHash01(id) * 0.34),
      height: Math.max(0.001, route.height ?? 0.012),
      phase: route.phase ?? stableHash01(`${id}:phase`),
      ...(route.payload !== undefined && { payload: route.payload }),
    });
  });
  return normalized;
};

export const buildFallbackRoutes = (
  cityPoints: ReadonlyArray<CinematicCityPoint>,
  limit: number,
): ReadonlyArray<CinematicRoute> => {
  const byGroup = new Map<string, CinematicCityPoint>();
  for (const point of cityPoints) {
    if (!point.group || byGroup.has(point.group)) continue;
    byGroup.set(point.group, point);
  }
  return DEFAULT_ROUTE_IDS.slice(0, Math.max(0, Math.floor(limit))).flatMap(
    ([fromId, toId], index) => {
      const from = byGroup.get(fromId);
      const to = byGroup.get(toId);
      if (!from || !to) return [];
      const phase = stableHash01(`${fromId}-${toId}`);
      return [
        {
          id: `${fromId}-${toId}`,
          from: [from.lat, from.lng],
          to: [to.lat, to.lng],
          value: 0.55 + phase * 0.95,
          width: 0.65 + phase * 1.2,
          speed: 0.18 + phase * 0.42,
          height: 0.01 + phase * 0.012,
          phase: stableHash01(index),
        },
      ];
    },
  );
};

export const buildDensityGrid = (
  points: ReadonlyArray<CinematicCityPoint>,
  width: number,
  height: number,
): {
  readonly density: Float32Array;
  readonly densityWidth: number;
  readonly densityHeight: number;
  readonly maxDensity: number;
} => {
  const density = new Float32Array(width * height);
  for (const point of points) {
    const cx = Math.floor(((point.lng + 180) / 360) * width);
    const cy = Math.floor(((90 - point.lat) / 180) * height);
    const radius = Math.max(1, Math.ceil(point.radius * 0.45));
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const px = (cx + x + width) % width;
        const py = Math.max(0, Math.min(height - 1, cy + y));
        const dist = Math.sqrt(x * x + y * y) / radius;
        const falloff = Math.max(0, 1 - dist);
        const idx = py * width + px;
        density[idx] = (density[idx] ?? 0) + point.importance * falloff * falloff;
      }
    }
  }
  let maxDensity = 0;
  for (let i = 0; i < density.length; i++) {
    maxDensity = Math.max(maxDensity, density[i] ?? 0);
  }
  if (maxDensity > 0) {
    for (let i = 0; i < density.length; i++) {
      density[i] = Math.pow((density[i] ?? 0) / maxDensity, 0.55);
    }
    maxDensity = 1;
  }
  return {
    density,
    densityWidth: width,
    densityHeight: height,
    maxDensity,
  };
};

const chooseFallbackNode = (target: number) => {
  let cursor = 0;
  for (const node of CINEMATIC_CITY_NODES) {
    cursor += node.weight;
    if (target <= cursor) return node;
  }
  return CINEMATIC_CITY_NODES[CINEMATIC_CITY_NODES.length - 1]!;
};

const buildPointIndex = (
  points: ReadonlyArray<CinematicCityPoint>,
): ReadonlyMap<string, CinematicCityPoint> => {
  const byId = new Map<string, CinematicCityPoint>();
  for (const point of points) {
    byId.set(point.id, point);
    if (point.group && !byId.has(point.group)) byId.set(point.group, point);
  }
  for (const node of CINEMATIC_CITY_NODES) {
    if (!byId.has(node.id)) {
      byId.set(node.id, {
        id: node.id,
        lat: node.lat,
        lng: node.lng,
        value: node.weight,
        radius: node.spread,
        temperature: 0.62,
        importance: node.weight,
        group: node.id,
      });
    }
  }
  return byId;
};

const resolveEndpoint = (
  endpoint: CinematicRouteEndpoint,
  byId: ReadonlyMap<string, CinematicCityPoint>,
): LatLng | null => {
  if (typeof endpoint === 'string') {
    const point = byId.get(endpoint);
    return point ? [point.lat, point.lng] : null;
  }
  if (Array.isArray(endpoint)) {
    return [clampLat(endpoint[0] ?? 0), wrapLng(endpoint[1] ?? 0)];
  }
  const objectEndpoint = endpoint as { readonly lat: number; readonly lng: number };
  return [clampLat(objectEndpoint.lat), wrapLng(objectEndpoint.lng)];
};
