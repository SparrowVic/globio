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

/** Center of a bounding box as `[lat, lng]`. */
export const boundsCenter = (b: LatLngBounds): readonly [number, number] => [
  (b.minLat + b.maxLat) / 2,
  (b.minLng + b.maxLng) / 2,
];

/**
 * Maximum angular extent (in radians) — the larger of lat-extent and
 * lng-extent. Used to compute a fitting camera distance for `focusOnCountry`.
 */
export const angularExtent = (b: LatLngBounds): number => {
  const latExt = ((b.maxLat - b.minLat) * Math.PI) / 180;
  const lngExt = ((b.maxLng - b.minLng) * Math.PI) / 180;
  return Math.max(latExt, lngExt);
};
