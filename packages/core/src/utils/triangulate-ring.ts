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

/**
 * Triangulate a single GeoJSON ring on a sphere of given radius.
 *
 * Returns `null` for hole rings (clockwise) or degenerate rings (<3 distinct points).
 * For valid rings, returns 3D positions (mapped via lat/lng → Vector3) and triangle
 * indices ready for `BufferGeometry`.
 */
export const triangulateRing = (
  ring: ReadonlyArray<readonly [number, number]>,
  radius: number
): RingTriangulation | null => {
  if (ring.length < 4) return null;
  if (ringSignedArea(ring) <= 0) return null;

  // Drop trailing closing vertex if it duplicates the first
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closes = first && last && first[0] === last[0] && first[1] === last[1];
  const open = closes ? ring.slice(0, -1) : ring;

  if (open.length < 3) return null;

  // earcut expects flat 2D coords; we use [lng, lat] (x=lng, y=lat).
  const flat: Array<number> = [];
  for (const point of open) {
    flat.push(point[1], point[0]);
  }
  const triIndices = earcut(flat);
  if (triIndices.length === 0) return null;

  const positions = new Float32Array(open.length * 3);
  for (let i = 0; i < open.length; i++) {
    const point = open[i];
    if (!point) continue;
    const v = latLngToVector3([point[0], point[1]], radius);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
  }

  return {
    positions,
    indices: new Uint32Array(triIndices),
  };
};
