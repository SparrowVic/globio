import { describe, expect, it } from 'vitest';
import { normalizePolygon, normalizeRing, wrapLng } from '../polygon-normalize';
import { triangulatePolygon } from '../triangulate-ring';
import { pointInRing, samplePolygonInterior } from '../../kinds/dotted/surface';
import { LAND_ATLAS_SIZE, rasterizeLandMask } from '../../kinds/cinematic/atlas';
import { GLOBE_RADIUS } from '../coordinates';

type Ring = ReadonlyArray<readonly [number, number]>;

/** world-atlas 50m style: a coast at ~-70 and a full run along latitude -90. */
const antarctica50m = (): Ring => {
  const ring: Array<readonly [number, number]> = [[-180, -90]];
  for (let lng = 178; lng > -180; lng -= 2) ring.push([lng, -90]);
  for (let lng = -179; lng <= 179; lng += 2) ring.push([lng, -70 + 3 * Math.sin(lng / 20)]);
  ring.push([-180, -90]);
  return ring;
};

/** world-atlas 110m style: the ring closes with one edge along latitude -84.7. */
const antarctica110m = (): Ring => [
  [-180, -84.7],
  [-170, -70],
  [-90, -72],
  [0, -69],
  [90, -71],
  [170, -70],
  [180, -84.7],
  [-180, -84.7],
];

/**
 * world-atlas 50m stores Antarctica as two rings: the first only runs along
 * latitude -90, the second is the coast (closed across the antimeridian).
 */
const antarctica50mLayout = (): ReadonlyArray<Ring> => {
  const poleRing: Array<readonly [number, number]> = [[-180, -90]];
  for (let lng = 178; lng >= -180; lng -= 2) poleRing.push([lng, -90]);
  const coast: Array<readonly [number, number]> = [];
  for (let lng = -180; lng <= 179; lng += 1) coast.push([lng, -70 + 3 * Math.sin(lng / 20)]);
  coast.push([-180, coast[0]?.[1] ?? -70]);
  return [poleRing, coast];
};

/** A 20° wide box straddling the antimeridian (Chukotka / Fiji style). */
const straddling = (): Ring => [
  [170, 60],
  [-170, 60],
  [-170, 70],
  [170, 70],
  [170, 60],
];

describe('wrapLng', () => {
  it('maps any longitude into [-180, 180)', () => {
    expect(wrapLng(185)).toBe(-175);
    expect(wrapLng(-185)).toBe(175);
    expect(wrapLng(540)).toBe(-180);
    expect(wrapLng(45)).toBe(45);
  });
});

describe('normalizeRing', () => {
  it('leaves an ordinary ring alone except for the closing duplicate', () => {
    const { ring, cap } = normalizeRing([[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]);
    expect(cap).toBeNull();
    expect(ring).toEqual([[10, 10], [20, 10], [20, 20], [10, 20]]);
  });

  it('unwraps an antimeridian crossing into a continuous ring', () => {
    const { ring, cap } = normalizeRing(straddling());
    expect(cap).toBeNull();
    expect(ring.map((p) => p[0])).toEqual([170, 190, 190, 170]);
  });

  it('closes a 50m-style Antarctica over the South Pole and drops the pole run', () => {
    const { ring, cap } = normalizeRing(antarctica50m());
    expect(cap).toBe('south');
    // The cap closes along the pole with a vertex every couple of degrees.
    const poleVertices = ring.filter((p) => p[1] === -90);
    expect(poleVertices.length).toBeGreaterThanOrEqual(2);
    expect(poleVertices.length).toBeLessThanOrEqual(200);
    expect(ring.some((p) => p[1] < -89.999 && p[1] > -90)).toBe(false);
    expect(pointInRing(ring, [0, -89])).toBe(true);
    expect(pointInRing(ring, [120, -80])).toBe(true);
    expect(pointInRing(ring, [0, -60])).toBe(false);
  });

  it('extends a 110m-style Antarctica (closed at -84.7) down to the pole', () => {
    const { ring, cap } = normalizeRing(antarctica110m());
    expect(cap).toBe('south');
    expect(pointInRing(ring, [0, -89.5])).toBe(true);
    expect(pointInRing(ring, [-100, -86])).toBe(true);
  });
});

describe('normalizePolygon', () => {
  it('promotes the coast when the first ring only runs along the pole (50m layout)', () => {
    const { rings, cap } = normalizePolygon(antarctica50mLayout());
    expect(cap).toBe('south');
    expect(rings.length).toBe(1);
    const outer = rings[0];
    expect(outer).toBeDefined();
    if (!outer) return;
    expect(outer.filter((p) => p[1] === -90).length).toBeGreaterThanOrEqual(2);
    expect(pointInRing(outer, [0, -89])).toBe(true);
    expect(pointInRing(outer, [90, -80])).toBe(true);
    expect(pointInRing(outer, [0, -60])).toBe(false);
  });

  it('shifts a hole into the frame of an antimeridian-crossing outer ring', () => {
    const hole: Ring = [[-175, 63], [-172, 63], [-172, 66], [-175, 66], [-175, 63]];
    const { rings } = normalizePolygon([straddling(), hole]);
    expect(rings.length).toBe(2);
    expect(rings[1]?.map((p) => p[0])).toEqual([185, 188, 188, 185]);
  });
});

describe('consumers of the normalised polygon', () => {
  it('triangulates Antarctica in every world-atlas layout with vertices on the sphere', () => {
    for (const polygon of [[antarctica50m()], [antarctica110m()], antarctica50mLayout()]) {
      const tri = triangulatePolygon(polygon, GLOBE_RADIUS);
      expect(tri).not.toBeNull();
      if (!tri) continue;
      expect(tri.indices.length).toBeGreaterThan(30);
      let lowest = 0;
      for (let i = 0; i < tri.positions.length; i += 3) {
        const x = tri.positions[i] ?? 0;
        const y = tri.positions[i + 1] ?? 0;
        const z = tri.positions[i + 2] ?? 0;
        expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(GLOBE_RADIUS, 3);
        lowest = Math.min(lowest, y);
      }
      // The mesh reaches the pole itself (y = -R), not just the coast.
      expect(lowest).toBeCloseTo(-GLOBE_RADIUS, 2);
    }
  });

  it('samples dots across the whole cap and wraps longitudes', () => {
    const samples = samplePolygonInterior([antarctica50m()], 2);
    expect(samples.length).toBeGreaterThan(200);
    expect(samples.some(([, lat]) => lat <= -88)).toBe(true);
    // Rows thin out towards the pole so dots stay evenly spaced on the sphere:
    // the -88 row carries far fewer dots than the -72 row.
    const count = (lat: number) => samples.filter(([, l]) => l === lat).length;
    expect(count(-88)).toBeLessThan(count(-72) / 4);
    for (const [lng, lat] of samples) {
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThan(180);
      expect(Math.abs(lat)).toBeLessThanOrEqual(89.5);
    }
  });

  it('rasterises the cap as land down to the last atlas row', () => {
    const feature = {
      id: '010',
      name: 'Antarctica',
      coordinates: [antarctica110m()],
      polygons: [[antarctica110m()]],
    };
    const mask = rasterizeLandMask([feature]);
    const { width, height } = LAND_ATLAS_SIZE;
    const rowAt = (lat: number) => Math.floor(((90 - lat) / 180) * height);
    const rowSum = (row: number) => {
      let n = 0;
      for (let x = 0; x < width; x++) n += mask[row * width + x] ?? 0;
      return n;
    };
    expect(rowSum(height - 1)).toBe(width); // -89.8°: all land
    expect(rowSum(rowAt(-86))).toBe(width); // below the closing edge: all land
    expect(rowSum(rowAt(-80))).toBeGreaterThan(width * 0.95); // between the coast edges
    expect(rowSum(rowAt(-50))).toBe(0); // open ocean
  });

  it('rasterises an antimeridian-crossing box on both sides of the seam', () => {
    const feature = { id: 'x', name: 'x', coordinates: [straddling()], polygons: [[straddling()]] };
    const mask = rasterizeLandMask([feature]);
    const { width, height } = LAND_ATLAS_SIZE;
    const row = Math.floor(((90 - 65) / 180) * height);
    const xAt = (lng: number) => Math.floor(((lng + 180) / 360) * width);
    expect(mask[row * width + xAt(175)]).toBe(1);
    expect(mask[row * width + xAt(-175)]).toBe(1);
    expect(mask[row * width + xAt(0)]).toBe(0);
  });
});
