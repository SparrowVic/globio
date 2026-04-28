export interface LatLngBounds {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLng: number;
  readonly maxLng: number;
}

const EMPTY: LatLngBounds = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };

/**
 * Compute the lat/lng bounding box that contains all rings.
 * Each ring is an array of `[lng, lat]` points (GeoJSON convention).
 */
export const computeBounds = (
  rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>>
): LatLngBounds => {
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let any = false;

  for (const ring of rings) {
    for (const point of ring) {
      const lng = point[0];
      const lat = point[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      any = true;
    }
  }

  if (!any) return EMPTY;
  return { minLat, maxLat, minLng, maxLng };
};

/** Center of a bounding box as `[lat, lng]`. Wraps lng back to [-180, 180]. */
export const boundsCenter = (b: LatLngBounds): readonly [number, number] => {
  let lng = (b.minLng + b.maxLng) / 2;
  while (lng > 180) lng -= 360;
  while (lng < -180) lng += 360;
  return [(b.minLat + b.maxLat) / 2, lng];
};

const ringCrossesAntimeridian = (
  ring: ReadonlyArray<readonly [number, number]>
): boolean => {
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1];
    const b = ring[i];
    if (!a || !b) continue;
    if (Math.abs(b[0] - a[0]) > 180) return true;
  }
  return false;
};

const computeBoundsForRing = (
  ring: ReadonlyArray<readonly [number, number]>
): LatLngBounds => {
  if (!ringCrossesAntimeridian(ring)) return computeBounds([ring]);
  const shifted: Array<readonly [number, number]> = [];
  for (const point of ring) {
    shifted.push([point[0] < 0 ? point[0] + 360 : point[0], point[1]]);
  }
  return computeBounds([shifted]);
};

/**
 * Maximum angular extent (in radians) — the larger of lat-extent and
 * lng-extent. Used to compute a fitting camera distance for `focusOnCountry`.
 */
export const angularExtent = (b: LatLngBounds): number => {
  const latExt = ((b.maxLat - b.minLat) * Math.PI) / 180;
  const lngExt = ((b.maxLng - b.minLng) * Math.PI) / 180;
  return Math.max(latExt, lngExt);
};

/**
 * Bounds of the *largest* ring by lat/lng-area. Used by `focusOnCountry` so
 * countries with disjoint MultiPolygons (USA with Hawaii/Alaska, Russia
 * across the antimeridian) frame on their main land mass instead of the
 * full feature bbox — which can span half the globe.
 *
 * For features with a single ring this is identical to `computeBounds`.
 * Returns the same EMPTY sentinel as `computeBounds` for empty input.
 */
export const computeMainRingBounds = (
  rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>>
): LatLngBounds => {
  let bestArea = -1;
  let bestBounds: LatLngBounds = computeBounds([]);
  for (const ring of rings) {
    const b = computeBoundsForRing(ring);
    const area = (b.maxLat - b.minLat) * (b.maxLng - b.minLng);
    if (area > bestArea) {
      bestArea = area;
      bestBounds = b;
    }
  }
  return bestBounds;
};
