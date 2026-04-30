import type { CountryFeature, CountryPolygon } from '../../renderer/country-feature';
import type { HeatmapDataLayer } from '../types';
import type { ResolvedHeatmapCountryDomeConfig } from './config';
import { buildEdgeGrid, edgeGridDistance, rayPolygonBoundary } from './edge-grid';
import { findCountryFeature } from './country-features';
import { domeWeight } from './kernels';
import {
  DEG_TO_RAD,
  pointInPolygon,
  pointInShiftedPolygon,
  ringAreaCentroid,
  ringBounds,
  ringBoundsForPolygon,
  shiftCountryPoint,
  type RingBounds,
} from './polygon-utils';

/**
 * Paint a country-aware dome inside `polygon` into the density buffer.
 *
 * Two t-fields are computed per interior pixel and linearly blended by
 * `config.rounding`:
 *   - `t_edge = 1 − d_edge / d_max` — rounded "bubble" via the polygon's
 *     distance-to-edge field. Default (`rounding=1`).
 *   - `t_ray  = pixel_dist_from_anchor / boundary_along_ray` — polygon
 *     scaled-down shape with sharp corners (`rounding=0`).
 *
 * The shared anchor is the polygon's pole-of-inaccessibility — the pixel
 * where `d_edge` is maximal — so both fields agree on where the dome's
 * peak sits. When `rounding === 1` the ray-cast cost is skipped.
 *
 * `accumulate` is `max` instead of `+=` when `perCountryNormalize` is on,
 * to bound texture range to [0, 1] regardless of how many country
 * polygons overlap a given pixel (Vatican-in-Italy, San Marino, …).
 */
export const paintCountryDome = (
  data: Float32Array,
  width: number,
  height: number,
  polygon: CountryPolygon,
  centerLatLng: readonly [number, number],
  value: number,
  config: ResolvedHeatmapCountryDomeConfig
): boolean => {
  const outer = polygon[0];
  if (!outer || outer.length < 3 || value <= 0) return false;
  // Per-country normalize → every country stamps to peak 1.0 regardless
  // of population (uniform colour gradient across countries). When OFF,
  // the value pre-scale (log/sqrt/linear) controls cross-country
  // brightness.
  const stampPeak = config.perCountryNormalize
    ? 1
    : applyDomeValuePreScale(value, config.valuePreScale);
  if (stampPeak <= 0) return false;
  const accumulate: (idx: number, contribution: number) => void = config.perCountryNormalize
    ? (idx, c) => {
        if (c > data[idx]!) data[idx] = c;
      }
    : (idx, c) => {
        data[idx]! += c;
      };

  const rawBounds = ringBounds(outer);
  const crossesAnti = rawBounds.maxLng - rawBounds.minLng > 180;
  const shiftRing = (ring: ReadonlyArray<readonly [number, number]>) =>
    crossesAnti
      ? ring.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]] as const)
      : ring;
  const outerShifted = shiftRing(outer);
  const holesShifted = polygon.slice(1).map(shiftRing);
  const bounds = ringBounds(outerShifted);

  const requestedCenter = shiftCountryPoint(centerLatLng, bounds, crossesAnti);
  const center = chooseInteriorDomeCenter(outerShifted, holesShifted, bounds, requestedCenter);

  const v0 = Math.max(0, Math.floor(((90 - bounds.maxLat) / 180) * height));
  const v1 = Math.min(height - 1, Math.ceil(((90 - bounds.minLat) / 180) * height));
  if (v1 < v0) return false;

  const uRanges = countryLngPixelRanges(bounds, width, crossesAnti);
  if (uRanges.length === 0) return false;

  // One cosLat per polygon (centred on the dome anchor) is good enough
  // for everything except hemisphere-spanning polygons; the
  // distance-to-edge field smooths out any small lat-dependent skew.
  const cosCenterLat = Math.max(0.08, Math.cos(center[1] * DEG_TO_RAD));
  const grid = buildEdgeGrid(outerShifted, holesShifted, bounds, cosCenterLat);
  const useRayBlend = config.rounding < 1 - 1e-4;

  // Pass 1: walk pixels in the bbox, retain only those inside the polygon
  // and record their distance to the nearest edge. Tracks the polygon's
  // inradius (deepest interior point's distance) for normalisation, plus
  // the deepest pixel's lat/lng so Pass 2 can ray-cast from there if
  // partial rounding is requested.
  const interiorIdx: Array<number> = [];
  const interiorDist: Array<number> = [];
  let maxD = 0;
  let deepestLng = bounds.minLng;
  let deepestLat = bounds.minLat;
  for (let v = v0; v <= v1; v++) {
    const pixelLat = 90 - ((v + 0.5) / height) * 180;
    const row = v * width;
    for (const [u0, u1] of uRanges) {
      for (let u = u0; u <= u1; u++) {
        const pixelLngRaw = ((u + 0.5) / width) * 360 - 180;
        const pixelLng = crossesAnti && pixelLngRaw < 0 ? pixelLngRaw + 360 : pixelLngRaw;
        if (pixelLng < bounds.minLng || pixelLng > bounds.maxLng) continue;
        if (!pointInShiftedPolygon(outerShifted, holesShifted, [pixelLng, pixelLat])) continue;
        const d = edgeGridDistance(grid, pixelLng, pixelLat);
        interiorIdx.push(row + u);
        interiorDist.push(d);
        if (d > maxD) {
          maxD = d;
          deepestLng = pixelLng;
          deepestLat = pixelLat;
        }
      }
    }
  }

  if (interiorIdx.length === 0 || maxD <= 0) return false;

  // Pass 2: paint the dome using the recorded distance field, blending
  // in the ray-cast t when partial rounding was requested.
  const invMaxD = 1 / maxD;
  const rounding = config.rounding;
  const oneMinusRounding = 1 - rounding;
  let wrote = false;
  for (let i = 0; i < interiorIdx.length; i++) {
    const idx = interiorIdx[i]!;
    const d = interiorDist[i]!;
    const tEdge = Math.min(1, Math.max(0, 1 - d * invMaxD));
    let t = tEdge;
    if (useRayBlend) {
      // Recover the pixel's lat/lng from idx — cheaper than holding a
      // 4-array per pixel from Pass 1.
      const v = Math.floor(idx / width);
      const u = idx - v * width;
      const pixelLat = 90 - ((v + 0.5) / height) * 180;
      const pixelLngRaw = ((u + 0.5) / width) * 360 - 180;
      const pixelLng = crossesAnti && pixelLngRaw < 0 ? pixelLngRaw + 360 : pixelLngRaw;
      const dxRay = (pixelLng - deepestLng) * cosCenterLat;
      const dyRay = pixelLat - deepestLat;
      const pixelDist = Math.hypot(dxRay, dyRay);
      let tRay = 0;
      if (pixelDist > 1e-6) {
        const dirX = dxRay / pixelDist;
        const dirY = dyRay / pixelDist;
        const boundary = rayPolygonBoundary(
          outerShifted,
          holesShifted,
          deepestLng,
          deepestLat,
          dirX,
          dirY,
          cosCenterLat
        );
        tRay = boundary > 1e-6 ? Math.min(1, pixelDist / boundary) : tEdge;
      }
      t = oneMinusRounding * tRay + rounding * tEdge;
    }
    const w = domeWeight(t, config);
    if (w <= 0) continue;
    accumulate(idx, stampPeak * w);
    wrote = true;
  }
  return wrote;
};

/**
 * Iterate samples that map to a country feature, paint each as a
 * polygon-bounded dome. Returns the set of sample indices that were
 * dome-painted — the caller falls back to radial paintSample for the rest.
 */
export const paintCountryDomeSamples = (
  data: Float32Array,
  width: number,
  height: number,
  samples: ReadonlyArray<HeatmapDataLayer['data'][number]>,
  featuresByKey: ReadonlyMap<string, CountryFeature>,
  config: ResolvedHeatmapCountryDomeConfig
): Set<number> => {
  const painted = new Set<number>();
  for (let i = 0; i < samples.length; i++) {
    const entry = samples[i]!;
    const feature = findCountryFeature(entry, featuresByKey);
    if (!feature) continue;
    const polygon = chooseCountryDomePolygon(feature, entry.position);
    if (!polygon) continue;
    const ok = paintCountryDome(
      data,
      width,
      height,
      polygon,
      entry.position,
      entry.value * (entry.weight ?? 1),
      config
    );
    if (ok) painted.add(i);
  }
  return painted;
};

/**
 * Pick the polygon that contains the user-supplied centroid, falling back
 * to the largest polygon by bbox area. This keeps multi-island countries
 * (Indonesia, Greece, Philippines) anchored on whatever landmass the
 * caller intended via their centroid.
 */
const chooseCountryDomePolygon = (
  feature: CountryFeature,
  center: readonly [number, number]
): CountryPolygon | null => {
  let largest: CountryPolygon | null = null;
  let largestArea = -1;
  for (const polygon of feature.polygons) {
    if (polygon.length === 0) continue;
    if (pointInPolygon(polygon, [center[1], center[0]])) return polygon;
    const area = polygonAreaScore(polygon);
    if (area > largestArea) {
      largestArea = area;
      largest = polygon;
    }
  }
  return largest;
};

const polygonAreaScore = (polygon: CountryPolygon): number => {
  const outer = polygon[0];
  if (!outer) return 0;
  const bounds = ringBoundsForPolygon(outer);
  const midLat = (bounds.minLat + bounds.maxLat) * 0.5;
  return (
    Math.max(0, bounds.maxLat - bounds.minLat) *
    Math.max(0, bounds.maxLng - bounds.minLng) *
    Math.max(0.2, Math.cos(midLat * DEG_TO_RAD))
  );
};

const applyDomeValuePreScale = (
  value: number,
  mode: ResolvedHeatmapCountryDomeConfig['valuePreScale']
): number => {
  if (value <= 0) return 0;
  switch (mode) {
    case 'log':
      return Math.log1p(value);
    case 'sqrt':
      return Math.sqrt(value);
    case 'linear':
    default:
      return value;
  }
};

/**
 * Pick a dome-anchor inside the polygon. Strategy:
 *  1. If the user-supplied centroid is inside the polygon, use it.
 *  2. Else try the area-weighted centroid (fast, lands deep in compact
 *     shapes; helps L-shaped countries like Norway / Chile).
 *  3. Else bbox centre.
 *  4. Else grid search for the closest interior point to the request.
 */
const chooseInteriorDomeCenter = (
  outer: ReadonlyArray<readonly [number, number]>,
  holes: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  bounds: RingBounds,
  requested: readonly [number, number]
): readonly [number, number] => {
  if (pointInShiftedPolygon(outer, holes, requested)) return requested;

  const areaC = ringAreaCentroid(outer);
  if (areaC && pointInShiftedPolygon(outer, holes, areaC)) return areaC;

  const bboxCenter = [
    (bounds.minLng + bounds.maxLng) * 0.5,
    (bounds.minLat + bounds.maxLat) * 0.5,
  ] as const;
  if (pointInShiftedPolygon(outer, holes, bboxCenter)) return bboxCenter;

  let best: readonly [number, number] | null = null;
  let bestD2 = Infinity;
  const cols = 18;
  const rows = 18;
  for (let iy = 0; iy <= rows; iy++) {
    const lat = bounds.minLat + ((bounds.maxLat - bounds.minLat) * iy) / rows;
    for (let ix = 0; ix <= cols; ix++) {
      const lng = bounds.minLng + ((bounds.maxLng - bounds.minLng) * ix) / cols;
      const p = [lng, lat] as const;
      if (!pointInShiftedPolygon(outer, holes, p)) continue;
      const dx = lng - requested[0];
      const dy = lat - requested[1];
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = p;
      }
    }
  }
  return best ?? bboxCenter;
};

/**
 * U-pixel ranges to iterate for a country's bbox. Wraps via two ranges
 * `[leftStart, width-1]` + `[0, rightEnd]` when the polygon was unwrapped
 * across the antimeridian, so the painter visits the right ones in a
 * single nested loop.
 */
const countryLngPixelRanges = (
  bounds: RingBounds,
  width: number,
  crossesAnti: boolean
): ReadonlyArray<readonly [number, number]> => {
  const lngToU = (lng: number): number =>
    Math.floor((((lng + 180) / 360) * width + width) % width);
  const clampU = (u: number): number => Math.max(0, Math.min(width - 1, u));
  if (!crossesAnti) {
    return [
      [
        clampU(lngToU(bounds.minLng)),
        clampU(Math.ceil(((bounds.maxLng + 180) / 360) * width)),
      ],
    ];
  }
  const leftStart = clampU(lngToU(bounds.minLng));
  const rightEnd = clampU(Math.ceil(((bounds.maxLng - 360 + 180) / 360) * width));
  return [
    [leftStart, width - 1],
    [0, rightEnd],
  ];
};
