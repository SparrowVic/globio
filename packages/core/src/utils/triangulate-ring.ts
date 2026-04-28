import earcut from 'earcut';
import { latLngToVector3 } from './coordinates';

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
