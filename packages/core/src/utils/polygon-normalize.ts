/**
 * Shared polygon normalisation for everything that consumes country rings in
 * the lng/lat plane — fill triangulation, picking meshes, the dotted sampler
 * and the cinematic land mask.
 *
 * world-atlas rings are valid on the sphere but awkward in the plane:
 *
 *  - Rings that cross the antimeridian (Russia, Fiji, Kiribati) jump by ~360°
 *    between consecutive vertices.
 *  - Antarctica is a polar cap. At 50 m / 10 m its outer ring runs along
 *    latitude −90 for a full turn (257 vertices that are all the same point in
 *    3D); at 110 m it closes with one edge along latitude −84.7, so the pole
 *    itself is left uncovered.
 *
 * `normalizePolygon` returns rings that are continuous in the plane (an
 * antimeridian crossing shifts later vertices by ±360°, so longitudes may
 * leave [−180, 180]) and closes a ring that circles the globe over the pole
 * it encloses, with two corner vertices on the pole. Consumers wrap
 * longitudes back with `wrapLng` when they need atlas or sample coordinates.
 */

export type LngLat = readonly [number, number];
export type Ring = ReadonlyArray<LngLat>;
export type Polygon = ReadonlyArray<Ring>;

export type PoleCap = 'north' | 'south' | null;

export interface NormalizedRing {
  /** Continuous in the plane, no closing duplicate, cap corners appended. */
  readonly ring: Ring;
  readonly cap: PoleCap;
}

export interface NormalizedPolygon {
  /** Outer ring first, then holes, all in the outer ring's longitude frame. */
  readonly rings: ReadonlyArray<Ring>;
  readonly cap: PoleCap;
}

const POLE_LAT = 89.999;
/** Longitude spacing of the vertices that close a polar cap along the pole. */
const CAP_EDGE_STEP = 2;

/** Shoelace area in the plane (sign = orientation). */
const ringArea = (ring: Ring): number => {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!a || !b) continue;
    sum += (b[0] - a[0]) * (b[1] + a[1]);
  }
  return -sum / 2;
};

/** Wrap a longitude into [−180, 180). */
export const wrapLng = (lng: number): number => ((((lng + 180) % 360) + 360) % 360) - 180;

const dropClosingDuplicate = (ring: Ring): Ring => {
  if (ring.length < 2) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first && last && first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring;
};

/**
 * Running-offset unwrap: a jump of more than 180° between consecutive
 * vertices is an antimeridian crossing, and every later vertex shifts by
 * ±360° so the ring stays continuous. Handles multiple crossings.
 */
const unwrap = (ring: Ring): Ring => {
  const first = ring[0];
  if (!first) return ring;
  const out: LngLat[] = [first];
  let offset = 0;
  for (let i = 1; i < ring.length; i++) {
    const prev = ring[i - 1];
    const curr = ring[i];
    if (!prev || !curr) continue;
    const delta = curr[0] - prev[0];
    if (delta > 180) offset -= 360;
    else if (delta < -180) offset += 360;
    out.push([curr[0] + offset, curr[1]]);
  }
  return out;
};

/**
 * Normalise one ring: drop vertices sitting on a pole (they are one point in
 * 3D and their longitudes are noise), drop the closing duplicate, unwrap the
 * antimeridian, and if the ring went once around the globe close it over the
 * pole it encloses.
 */
export const normalizeRing = (raw: Ring): NormalizedRing => {
  let touchesNorth = false;
  let touchesSouth = false;
  const kept: LngLat[] = [];
  for (const p of raw) {
    if (p[1] >= POLE_LAT) {
      touchesNorth = true;
      continue;
    }
    if (p[1] <= -POLE_LAT) {
      touchesSouth = true;
      continue;
    }
    kept.push(p);
  }
  const open = dropClosingDuplicate(kept);
  if (open.length < 3) return { ring: open, cap: null };

  const ring = unwrap(open);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (!first || !last) return { ring, cap: null };
  // A closed ring whose ends sit ~360° apart in the plane circled the globe:
  // on a sphere that means it encloses a pole.
  const circles = Math.abs(first[0] - last[0]) > 180;
  if (!circles) return { ring, cap: null };

  let latSum = 0;
  for (const p of ring) latSum += p[1];
  const cap: 'north' | 'south' = touchesSouth
    ? 'south'
    : touchesNorth
      ? 'north'
      : latSum / ring.length < 0
        ? 'south'
        : 'north';
  const poleLat = cap === 'south' ? -90 : 90;
  // Close along the pole with a vertex every few degrees rather than two
  // corners: every pole vertex is the same 3D point, but the triangulation
  // then fans from each stretch of coast straight down its own meridian.
  // With only two corners the fill's subdivision midpoints (taken in the
  // lng/lat plane) swing around the pole and the triangles overlap.
  const capEdge: LngLat[] = [];
  const dir = first[0] < last[0] ? -1 : 1;
  for (let lng = last[0]; dir < 0 ? lng > first[0] : lng < first[0]; lng += dir * CAP_EDGE_STEP) {
    capEdge.push([lng, poleLat]);
  }
  capEdge.push([first[0], poleLat]);
  return { ring: [...ring, ...capEdge], cap };
};

/**
 * Normalise an outer ring plus holes. Holes are unwrapped on their own and
 * then shifted by a multiple of 360° into the outer ring's longitude frame,
 * so a hole in an antimeridian-crossing country still lands inside it.
 */
export const normalizePolygon = (polygon: Polygon): NormalizedPolygon => {
  const outerRaw = polygon[0];
  if (!outerRaw) return { rings: [], cap: null };
  let outer = normalizeRing(outerRaw);
  let holeRings: ReadonlyArray<Ring> = polygon.slice(1);
  if (outer.ring.length < 3) {
    // world-atlas 50 m stores Antarctica as [a ring that only runs along
    // latitude -90, the coast]. Dropping the pole vertices empties that
    // first ring, so the real outer ring is the largest of the rest.
    const candidates = polygon
      .slice(1)
      .map((raw) => normalizeRing(raw))
      .filter((n) => n.ring.length >= 3);
    let best: NormalizedRing | null = null;
    let bestArea = 0;
    for (const candidate of candidates) {
      const area = Math.abs(ringArea(candidate.ring));
      if (area > bestArea) {
        best = candidate;
        bestArea = area;
      }
    }
    if (!best) return { rings: [], cap: null };
    outer = best;
    holeRings = candidates.filter((n) => n !== best).map((n) => n.ring);
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of outer.ring) {
    if (p[0] < minLng) minLng = p[0];
    if (p[0] > maxLng) maxLng = p[0];
  }

  const rings: Ring[] = [outer.ring];
  for (const holeRaw of holeRings) {
    const hole = normalizeRing(holeRaw).ring;
    const start = hole[0];
    if (hole.length < 3 || !start) continue;
    let shift = 0;
    for (let guard = 0; guard < 3 && start[0] + shift < minLng; guard++) shift += 360;
    for (let guard = 0; guard < 3 && start[0] + shift > maxLng; guard++) shift -= 360;
    rings.push(shift === 0 ? hole : hole.map((p) => [p[0] + shift, p[1]] as const));
  }
  return { rings, cap: outer.cap };
};
