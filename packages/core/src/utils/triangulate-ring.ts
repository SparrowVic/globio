import earcut from 'earcut';
import { latLngToVector3 } from './coordinates';

export interface RingTriangulation {
  /** Flat XYZ positions: [x0, y0, z0, x1, y1, z1, ...] */
  readonly positions: Float32Array;
  /** Triangle indices into the positions array */
  readonly indices: Uint32Array;
}

/**
 * If a ring crosses the antimeridian (e.g. Russia, Fiji, USA Aleutians), the
 * lng values jump from +179 to -179 between consecutive points. Earcut works
 * in flat 2D, so this jump produces giant degenerate triangles. We detect the
 * crossing and shift the negative-side points by +360 to produce a continuous
 * polygon in earcut space. The 3D back-projection via latLngToVector3 wraps
 * naturally (sin/cos are periodic), so positions remain correct on the sphere.
 *
 * Returns the (possibly shifted) ring; original ring if no crossing detected.
 */
const unwrapAntimeridian = (
  ring: ReadonlyArray<readonly [number, number]>
): ReadonlyArray<readonly [number, number]> => {
  let crosses = false;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!a || !b) continue;
    if (Math.abs(a[0] - b[0]) > 180) {
      crosses = true;
      break;
    }
  }
  if (!crosses) return ring;
  return ring.map(([lng, lat]) => [lng < 0 ? lng + 360 : lng, lat] as const);
};

/**
 * Signed area of a ring in lat/lng space using the shoelace formula.
 *
 * GeoJSON convention: outer rings are counterclockwise, holes are clockwise.
 * With our (lng=x, lat=y) interpretation, CCW yields a positive value here.
 */
export const ringSignedArea = (
  ring: ReadonlyArray<readonly [number, number]>
): number => {
  if (ring.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!a || !b) continue;
    sum += (b[0] - a[0]) * (b[1] + a[1]);
  }
  return -sum / 2;
};

const AREA_EPSILON = 1e-6;

/**
 * Triangulate a single GeoJSON ring on a sphere of given radius.
 *
 * Returns `null` for degenerate rings (<3 distinct points or near-zero area).
 * Both CCW and CW rings are triangulated — the orientation convention varies
 * across sources (GeoJSON RFC 7946 says CCW=outer, but D3/Esri/world-atlas use
 * CW=outer), and we'd lose too many real countries by filtering on it. Holes
 * therefore get triangulated as standalone meshes with their parent country's
 * id; this is a known v0.3 picking limitation around enclaves (Lesotho/Vatican).
 */
export const triangulateRing = (
  ring: ReadonlyArray<readonly [number, number]>,
  radius: number
): RingTriangulation | null => {
  if (ring.length < 4) return null;
  const area = ringSignedArea(ring);
  if (Math.abs(area) < AREA_EPSILON) return null;

  // Drop trailing closing vertex if it duplicates the first
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closes = first && last && first[0] === last[0] && first[1] === last[1];
  const opened = closes ? ring.slice(0, -1) : ring;

  if (opened.length < 3) return null;

  // Earcut expects CCW outer rings. If our input is CW (negative area), reverse
  // it — otherwise non-convex polygons get triangulated incorrectly (visible as
  // missing chunks of the country mesh).
  const open = area < 0 ? [...opened].reverse() : opened;

  // earcut expects flat 2D coords; we feed (x=lng, y=lat).
  const flat: Array<number> = [];
  for (const point of open) {
    flat.push(point[0], point[1]);
  }
  const triIndices = earcut(flat);
  if (triIndices.length === 0) return null;

  // GeoJSON ring points are [lng, lat]; latLngToVector3 expects [lat, lng].
  // Swap when mapping to 3D so vertices land at correct locations on the sphere.
  const positions = new Float32Array(open.length * 3);
  for (let i = 0; i < open.length; i++) {
    const point = open[i];
    if (!point) continue;
    const v = latLngToVector3([point[1], point[0]], radius);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }

  return {
    positions,
    indices: new Uint32Array(triIndices),
  };
};

/**
 * Triangulate a GeoJSON-style polygon (outer ring + zero or more holes) on
 * a sphere of given radius. Unlike `triangulateRing`, this:
 * - subtracts holes (so e.g. Lesotho doesn't get filled with South Africa's
 *   color when SA is colored)
 * - shifts antimeridian-crossing rings so earcut sees a continuous 2D polygon
 *
 * Returns null for degenerate input (no usable outer ring).
 */
export const triangulatePolygon = (
  rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  radius: number
): RingTriangulation | null => {
  if (rings.length === 0) return null;
  const outerRaw = rings[0];
  if (!outerRaw || outerRaw.length < 4) return null;

  // Decide whether this polygon crosses the antimeridian by looking at the
  // outer ring. Apply the same shift to all holes so they stay aligned.
  const outerShifted = unwrapAntimeridian(outerRaw);
  const shifted = outerShifted !== outerRaw;
  const holesRaw = rings.slice(1);
  const holesShifted: Array<ReadonlyArray<readonly [number, number]>> = shifted
    ? holesRaw.map((h) => h.map(([lng, lat]) => [lng < 0 ? lng + 360 : lng, lat] as const))
    : [...holesRaw];

  const outerArea = ringSignedArea(outerShifted);
  if (Math.abs(outerArea) < AREA_EPSILON) return null;

  // earcut wants outer CCW (positive area) — reverse if input is CW.
  const reverseOuter = outerArea < 0;
  const dropClose = (
    ring: ReadonlyArray<readonly [number, number]>
  ): ReadonlyArray<readonly [number, number]> => {
    const f = ring[0];
    const l = ring[ring.length - 1];
    return f && l && f[0] === l[0] && f[1] === l[1] ? ring.slice(0, -1) : ring;
  };

  const outer = dropClose(reverseOuter ? [...outerShifted].reverse() : outerShifted);
  if (outer.length < 3) return null;

  // Holes must wind opposite to outer for earcut. We mirror the same direction
  // policy: if we flipped outer, flip holes too (preserves relative orientation).
  const preparedHoles = holesShifted
    .map((h) => dropClose(reverseOuter ? [...h].reverse() : h))
    .filter((h) => h.length >= 3);

  // Build flat coordinate buffer + holeIndices (vertex offsets where each hole begins).
  const flat: Array<number> = [];
  for (const p of outer) flat.push(p[0], p[1]);
  const holeIndices: Array<number> = [];
  let cursor = outer.length;
  for (const h of preparedHoles) {
    holeIndices.push(cursor);
    for (const p of h) flat.push(p[0], p[1]);
    cursor += h.length;
  }

  const triIndices = earcut(flat, holeIndices.length > 0 ? holeIndices : undefined);
  if (triIndices.length === 0) return null;

  const totalVerts = cursor;
  const positions = new Float32Array(totalVerts * 3);
  const allRings = [outer, ...preparedHoles];
  let i = 0;
  for (const ring of allRings) {
    for (const point of ring) {
      const v = latLngToVector3([point[1], point[0]], radius);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      i++;
    }
  }

  return {
    positions,
    indices: new Uint32Array(triIndices),
  };
};
