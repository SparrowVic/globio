import earcut from 'earcut';
import { latLngToVector3 } from './coordinates';
import { normalizePolygon, normalizeRing } from './polygon-normalize';

export interface RingTriangulation {
  /** Flat XYZ positions: [x0, y0, z0, x1, y1, z1, ...] */
  readonly positions: Float32Array;
  /** Triangle indices into the positions array */
  readonly indices: Uint32Array;
}

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
/** Vertices at or beyond this latitude are treated as sitting on a pole. */
const POLE_LAT = 89.999;


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
  // Unwrap the antimeridian, drop pole vertices and the closing duplicate,
  // close polar caps — see utils/polygon-normalize.ts.
  const opened = normalizeRing(ring).ring;
  if (opened.length < 3) return null;
  const area = ringSignedArea(opened);
  if (Math.abs(area) < AREA_EPSILON) return null;

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
 * Edge-aware subdivision of a triangulation that keeps the polygon outline in
 * lng/lat space (so country borders stay piecewise-linear, not bowed by great
 * circles) while ensuring every 3D edge stays below `maxAngle` on the sphere.
 *
 * Why edge-aware (1/2/3-edge splits) and not always 4-way? With 4-way split
 * we'd insert midpoints on all three edges of a triangle, including the ones
 * that didn't actually need it. Adjacent triangles sharing those short edges
 * wouldn't insert their own midpoints, and the resulting T-junctions show up
 * as hairline cracks in the rendered fill. Splitting only the edges that are
 * actually long, with a shared edge cache, guarantees neighbours agree on
 * vertex positions — no T-junctions.
 *
 * Why subdivide in 2D instead of 3D? Midpoints in 3D (chord midpoint
 * normalised to sphere = great-circle midpoint) follow geodesics. For a long
 * east-west edge along a parallel that's not the equator, the geodesic bows
 * polewards — pulling the rendered boundary off the country's actual outline.
 * Subdividing in lng/lat space and projecting once at the end keeps the
 * boundary exactly where the source data places it.
 */
const subdivideTriangulation = (
  verts2D: Array<[number, number]>,
  indices: Array<number>,
  radius: number,
  maxAngle: number,
  maxLevels: number
): { verts2D: Array<[number, number]>; indices: Array<number> } => {
  const maxChord = 2 * radius * Math.sin(maxAngle / 2);
  const maxChordSq = maxChord * maxChord;

  const edgeKey = (a: number, b: number): string => (a < b ? `${a}_${b}` : `${b}_${a}`);

  // Shared across all levels so split midpoints are stable through repeated
  // refinement and adjacent triangles never disagree.
  const midCache = new Map<string, number>();

  const project = (lng: number, lat: number): { x: number; y: number; z: number } => {
    const v = latLngToVector3([lat, lng], radius);
    return { x: v.x, y: v.y, z: v.z };
  };

  const distSq3D = (i1: number, i2: number): number => {
    const a = verts2D[i1];
    const b = verts2D[i2];
    if (!a || !b) return 0;
    const p1 = project(a[0], a[1]);
    const p2 = project(b[0], b[1]);
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return dx * dx + dy * dy + dz * dz;
  };

  const isPole = (v: [number, number]): boolean => Math.abs(v[1]) >= POLE_LAT;

  const midpoint = (i1: number, i2: number): number => {
    const key = edgeKey(i1, i2);
    const cached = midCache.get(key);
    if (cached !== undefined) return cached;
    const a = verts2D[i1];
    const b = verts2D[i2];
    if (!a || !b) return i1;
    // Longitude is meaningless on a pole: the geodesic from a vertex to the
    // pole is that vertex's own meridian, so the midpoint keeps its
    // longitude instead of averaging in a pole vertex's arbitrary one
    // (which bowed the polar-cap fan sideways into overlapping slivers).
    const lng = isPole(a) ? b[0] : isPole(b) ? a[0] : (a[0] + b[0]) / 2;
    verts2D.push([lng, (a[1] + b[1]) / 2]);
    const newIdx = verts2D.length - 1;
    midCache.set(key, newIdx);
    return newIdx;
  };

  for (let level = 0; level < maxLevels; level++) {
    // First pass: identify every edge whose 3D chord exceeds threshold. By
    // computing this from the edge endpoints (not from individual triangles),
    // any two triangles sharing the same edge make the same decision — so
    // splits propagate consistently and T-junctions can't form.
    const splits = new Set<string>();
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t]!;
      const b = indices[t + 1]!;
      const c = indices[t + 2]!;
      if (distSq3D(a, b) > maxChordSq) splits.add(edgeKey(a, b));
      if (distSq3D(b, c) > maxChordSq) splits.add(edgeKey(b, c));
      if (distSq3D(c, a) > maxChordSq) splits.add(edgeKey(c, a));
    }
    if (splits.size === 0) break;

    // Second pass: rebuild the triangle list, splitting each triangle based
    // on which of its edges were marked. Three split patterns: 1-edge → 2
    // sub-tris (bisection); 2-edge → 3 sub-tris (fan from corner with both
    // splits); 3-edge → 4 sub-tris (full midpoint refinement).
    const next: Array<number> = [];
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t]!;
      const b = indices[t + 1]!;
      const c = indices[t + 2]!;
      const sAB = splits.has(edgeKey(a, b));
      const sBC = splits.has(edgeKey(b, c));
      const sCA = splits.has(edgeKey(c, a));
      const count = (sAB ? 1 : 0) + (sBC ? 1 : 0) + (sCA ? 1 : 0);

      if (count === 0) {
        next.push(a, b, c);
      } else if (count === 3) {
        const ab = midpoint(a, b);
        const bc = midpoint(b, c);
        const ca = midpoint(c, a);
        next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
      } else if (count === 2) {
        if (sAB && sBC) {
          const ab = midpoint(a, b);
          const bc = midpoint(b, c);
          next.push(ab, b, bc, a, ab, bc, a, bc, c);
        } else if (sBC && sCA) {
          const bc = midpoint(b, c);
          const ca = midpoint(c, a);
          next.push(bc, c, ca, b, bc, ca, b, ca, a);
        } else {
          // sCA && sAB
          const ca = midpoint(c, a);
          const ab = midpoint(a, b);
          next.push(ca, ab, a, b, c, ab, ab, c, ca);
        }
      } else if (sAB) {
        const ab = midpoint(a, b);
        next.push(a, ab, c, ab, b, c);
      } else if (sBC) {
        const bc = midpoint(b, c);
        next.push(a, b, bc, a, bc, c);
      } else {
        const ca = midpoint(c, a);
        next.push(a, b, ca, ca, b, c);
      }
    }
    indices = next;
  }

  return { verts2D, indices };
};

/**
 * Triangulate a GeoJSON-style polygon (outer ring + zero or more holes) on
 * a sphere of given radius. Unlike `triangulateRing`, this:
 * - subtracts holes (so e.g. Lesotho doesn't get filled with South Africa's
 *   color when SA is colored)
 * - normalises rings first (utils/polygon-normalize.ts): antimeridian
 *   crossings are unwrapped, holes follow the outer ring's frame, and a ring
 *   that circles the globe is closed over the pole it encloses — so
 *   Antarctica fills all the way to the South Pole at every resolution
 * - subdivides oversized triangles in lng/lat space, edge-aware, so the
 *   country boundary stays piecewise-linear and there are no T-junction
 *   cracks between adjacent sub-triangles
 *
 * Returns null for degenerate input (no usable outer ring).
 */
export const triangulatePolygon = (
  rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  radius: number
): RingTriangulation | null => {
  if (rings.length === 0) return null;
  // Country polygons are shared, immutable arrays (one set per resolution
  // for the whole page), and every consumer — fills, picking meshes,
  // extruded data layers, every globe instance — wants the same
  // triangulation at a different radius. Triangulate once on the unit
  // sphere and scale; the subdivision threshold is an angle, so the result
  // is radius-independent.
  let unit = unitCache.get(rings);
  if (unit === undefined) {
    unit = triangulatePolygonUnit(rings);
    unitCache.set(rings, unit);
  }
  if (!unit) return null;
  if (radius === 1) return unit;
  const positions = new Float32Array(unit.positions.length);
  for (let i = 0; i < positions.length; i++) positions[i] = unit.positions[i]! * radius;
  return { positions, indices: unit.indices };
};

const unitCache = new WeakMap<
  ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  RingTriangulation | null
>();

const triangulatePolygonUnit = (
  rings: ReadonlyArray<ReadonlyArray<readonly [number, number]>>
): RingTriangulation | null => {
  const radius = 1;
  const normalized = normalizePolygon(rings);
  const outerNormalized = normalized.rings[0];
  if (!outerNormalized || outerNormalized.length < 3) return null;

  const outerArea = ringSignedArea(outerNormalized);
  if (Math.abs(outerArea) < AREA_EPSILON) return null;

  const reverseOuter = outerArea < 0;
  const outer = reverseOuter ? [...outerNormalized].reverse() : outerNormalized;

  const preparedHoles = normalized.rings
    .slice(1)
    .map((h) => (reverseOuter ? [...h].reverse() : h))
    .filter((h) => h.length >= 3);

  // Build flat coordinate buffer + holeIndices for earcut.
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

  // Subdivide in 2D lng/lat space (preserves boundary), measuring chord on the
  // sphere. ~6° max edge keeps each triangle's chord well within the 0.0008R
  // fill lift so the mesh stays above the globe surface even for big countries.
  const verts2D: Array<[number, number]> = [];
  for (let i = 0; i < flat.length; i += 2) {
    verts2D.push([flat[i]!, flat[i + 1]!]);
  }
  const subdivided = subdivideTriangulation(
    verts2D,
    Array.from(triIndices),
    radius,
    (6 * Math.PI) / 180,
    8
  );

  const positions = new Float32Array(subdivided.verts2D.length * 3);
  for (let i = 0; i < subdivided.verts2D.length; i++) {
    const point = subdivided.verts2D[i]!;
    const v = latLngToVector3([point[1], point[0]], radius);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }

  return {
    positions,
    indices: new Uint32Array(subdivided.indices),
  };
};
