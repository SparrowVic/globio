/**
 * Polygon / ring geometry helpers shared by the country dome painter.
 *
 * All inputs are GeoJSON-style `[lng, lat]` pairs (longitude first).
 * The "shifted" variants accept rings that crossed the antimeridian and
 * had their negative longitudes increased by 360 so the polygon stays
 * connected in a single 2D coordinate plane — see `shiftCountryPoint`
 * below for the same shift applied to scalar points.
 */

export interface RingBounds {
  readonly minLng: number;
  readonly maxLng: number;
  readonly minLat: number;
  readonly maxLat: number;
}

export const DEG_TO_RAD = Math.PI / 180;

export const clampCpu = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

export const lerpCpu = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstepCpu = (edge0: number, edge1: number, x: number): number => {
  if (edge0 === edge1) return x < edge0 ? 0 : 1;
  const t = clampCpu((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Axis-aligned bounding box of a single ring. */
export const ringBounds = (ring: ReadonlyArray<readonly [number, number]>): RingBounds => {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of ring) {
    if (p[0] < minLng) minLng = p[0];
    if (p[0] > maxLng) maxLng = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  return { minLng, maxLng, minLat, maxLat };
};

/**
 * Bounds of a ring after antimeridian unwrap. If the raw bounds span more
 * than 180° in lng, shift negative longitudes by +360 so the polygon
 * appears as a contiguous slice around lng = 180.
 */
export const ringBoundsForPolygon = (
  ring: ReadonlyArray<readonly [number, number]>
): RingBounds => {
  const raw = ringBounds(ring);
  if (raw.maxLng - raw.minLng <= 180) return raw;
  return ringBounds(ring.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]] as const));
};

/**
 * Even/odd point-in-polygon test. Operates on a single ring (no holes).
 * Caller is expected to combine outer + holes into the polygon-membership
 * decision (see `pointInShiftedPolygon`).
 */
export const pointInRing = (
  ring: ReadonlyArray<readonly [number, number]>,
  point: readonly [number, number]
): boolean => {
  const [x, y] = point;
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const [xi, yi] = a;
    const [xj, yj] = b;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/** Membership in `outer`-and-not-in-any-hole. Both rings must be already shifted. */
export const pointInShiftedPolygon = (
  outer: ReadonlyArray<readonly [number, number]>,
  holes: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  point: readonly [number, number]
): boolean => {
  if (!pointInRing(outer, point)) return false;
  for (const hole of holes) {
    if (pointInRing(hole, point)) return false;
  }
  return true;
};

/**
 * Antimeridian-aware membership for raw GeoJSON polygons. Detects a wrap
 * via the bounds spread, shifts both the rings and the query point as
 * needed, then defers to `pointInShiftedPolygon`.
 */
export const pointInPolygon = (
  polygon: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  point: readonly [lng: number, lat: number]
): boolean => {
  const outer = polygon[0];
  if (!outer) return false;
  const rawBounds = ringBounds(outer);
  const crossesAnti = rawBounds.maxLng - rawBounds.minLng > 180;
  const shiftRing = (ring: ReadonlyArray<readonly [number, number]>) =>
    crossesAnti
      ? ring.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]] as const)
      : ring;
  const lng = crossesAnti && point[0] < 0 ? point[0] + 360 : point[0];
  return pointInShiftedPolygon(shiftRing(outer), polygon.slice(1).map(shiftRing), [
    lng,
    point[1],
  ]);
};

/**
 * Area-weighted (Green's theorem) centroid of a single ring. Used as the
 * second-choice anchor for the dome when the user-supplied centroid lands
 * outside the polygon — handles L-shaped countries (Norway, Chile)
 * gracefully where the bbox centre would land in a fjord.
 */
export const ringAreaCentroid = (
  ring: ReadonlyArray<readonly [number, number]>
): readonly [number, number] | null => {
  let cx = 0;
  let cy = 0;
  let A = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const cross = a[0] * b[1] - b[0] * a[1];
    A += cross;
    cx += (a[0] + b[0]) * cross;
    cy += (a[1] + b[1]) * cross;
  }
  if (Math.abs(A) < 1e-12) return null;
  A *= 0.5;
  return [cx / (6 * A), cy / (6 * A)];
};

/** Clamp a `[lat, lng]` query point into a polygon's bounds (after wrap shift). */
export const shiftCountryPoint = (
  latLng: readonly [number, number],
  bounds: RingBounds,
  crossesAnti: boolean
): readonly [number, number] => {
  let lng = latLng[1];
  if (crossesAnti && lng < 0) lng += 360;
  return [
    clampCpu(lng, bounds.minLng, bounds.maxLng),
    clampCpu(latLng[0], bounds.minLat, bounds.maxLat),
  ];
};
