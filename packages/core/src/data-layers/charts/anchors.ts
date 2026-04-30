import { Matrix4, Vector3, Quaternion } from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { angularExtent, boundsCenter, computeMainRingBounds } from '../../utils/country-bounds';
import type { CountryFeature } from '../../renderer/country-feature';
import type { LatLng } from '../../types';
import type { ChartsDataEntry } from '../types';

/**
 * One chart's anchor on the globe — surface position, surface normal, and
 * a precomputed quaternion that rotates the chart's local "up" (`+Y`) onto
 * that normal. The chart builder positions a Group at `surface`, applies
 * `quaternion`, and lays out geometry in local space (X = east-ish, Y =
 * outward normal, Z = north-ish). Saves chart code from re-deriving the
 * tangent frame for every chart. Local `+Y` is outward, local `+X` follows
 * east/west tangent, and local `-Z` points roughly north.
 */
export interface ChartAnchor {
  readonly position: LatLng;
  readonly surface: Vector3;
  readonly normal: Vector3;
  readonly quaternion: Quaternion;
}

/** Local "up" axis used by every chart geometry — rotated to surface normal. */
const WORLD_NORTH = new Vector3(0, 1, 0);
/** Tiny lift to avoid z-fighting with the globe surface and any country fill. */
const ANCHOR_LIFT = 1.001;
const BASIS_MATRIX = new Matrix4();

/**
 * Resolve a `ChartsDataEntry` to a lat/lng anchor:
 *   1. explicit `entry.position` wins
 *   2. else `entry.id` looked up against the country feature index → centroid
 *   3. else returns `null` (entry skipped at build time)
 *
 * Centroid math matches `BarsLayer.resolvePosition` so an `id`-anchored
 * chart sits at the same spot as an `id`-anchored bar.
 */
export const resolveChartPosition = (
  entry: ChartsDataEntry,
  features: ReadonlyMap<string, CountryFeature>
): LatLng | null => {
  if (entry.position) return entry.position;
  if (entry.id) {
    const feature = features.get(entry.id);
    if (!feature) return null;
    const bounds = computeMainRingBounds(feature.coordinates);
    if (angularExtent(bounds) <= 0) return null;
    const [lat, lng] = boundsCenter(bounds);
    return [lat, lng];
  }
  return null;
};

/** Build a `ChartAnchor` for a resolved lat/lng. */
export const buildChartAnchor = (position: LatLng): ChartAnchor => {
  const surface = latLngToVector3(position, GLOBE_RADIUS * ANCHOR_LIFT);
  const normal = surface.clone().normalize();
  const north = WORLD_NORTH.clone().sub(normal.clone().multiplyScalar(WORLD_NORTH.dot(normal)));
  if (north.lengthSq() < 1e-8) {
    // At the poles, "north" is undefined. Use longitude's horizontal
    // tangent so the basis stays stable instead of falling back to an
    // arbitrary Quaternion.setFromUnitVectors twist.
    const lngRad = (position[1] * Math.PI) / 180;
    north.set(-Math.cos(lngRad), 0, Math.sin(lngRad));
  }
  north.normalize();
  const east = north.clone().cross(normal).normalize();
  const south = east.clone().cross(normal).normalize();
  const quaternion = new Quaternion().setFromRotationMatrix(
    BASIS_MATRIX.makeBasis(east, normal, south)
  );
  return { position, surface, normal, quaternion };
};

/**
 * Convenience: walk an entry list and return only the entries that resolve
 * to an anchor (drops un-resolved ids early so chart builders don't have
 * to re-validate).
 */
export const buildAnchorList = (
  entries: ReadonlyArray<ChartsDataEntry>,
  features: ReadonlyMap<string, CountryFeature>
): ReadonlyArray<{ readonly entry: ChartsDataEntry; readonly anchor: ChartAnchor; readonly index: number }> => {
  const out: Array<{ entry: ChartsDataEntry; anchor: ChartAnchor; index: number }> = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const pos = resolveChartPosition(entry, features);
    if (!pos) continue;
    out.push({ entry, anchor: buildChartAnchor(pos), index: i });
  }
  return out;
};
