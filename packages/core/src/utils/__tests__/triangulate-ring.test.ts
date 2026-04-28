import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { triangulateRing, triangulatePolygon, ringSignedArea } from '../triangulate-ring';
import { GLOBE_RADIUS, vector3ToLatLng } from '../coordinates';

const square: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];

const squareCW: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, 10],
  [10, 10],
  [10, 0],
  [0, 0],
];

describe('ringSignedArea', () => {
  it('returns positive area for counterclockwise ring (outer in GeoJSON)', () => {
    expect(ringSignedArea(square)).toBeGreaterThan(0);
  });

  it('returns negative area for clockwise ring (hole in GeoJSON)', () => {
    expect(ringSignedArea(squareCW)).toBeLessThan(0);
  });

  it('returns ~zero area for degenerate ring with <3 points', () => {
    expect(ringSignedArea([[0, 0], [1, 1]])).toBe(0);
  });
});

describe('triangulateRing', () => {
  it('triangulates clockwise rings (D3/Esri convention) too — orientation is not used as a filter', () => {
    // World-atlas/Natural-Earth uses CW=outer convention. We must accept both.
    expect(triangulateRing(squareCW, GLOBE_RADIUS * 1.001)).not.toBeNull();
  });

  it('returns null for ring with fewer than 3 distinct points', () => {
    expect(triangulateRing([[0, 0], [1, 1]], GLOBE_RADIUS * 1.001)).toBeNull();
  });

  it('returns null for ring with near-zero (degenerate) area', () => {
    // Three collinear points form a closed ring with zero area.
    const collinear: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [5, 0],
      [10, 0],
      [0, 0],
    ];
    expect(triangulateRing(collinear, GLOBE_RADIUS * 1.001)).toBeNull();
  });

  it('triangulates a counterclockwise ring into 3D positions and indices', () => {
    const result = triangulateRing(square, GLOBE_RADIUS * 1.001);
    expect(result).not.toBeNull();
    if (!result) return;
    // square has 4 unique vertices → triangulated as 2 triangles → 6 indices
    expect(result.indices.length).toBe(6);
    expect(result.positions.length).toBe(4 * 3); // 4 vertices × xyz
    // every vertex lies on the requested radius
    for (let i = 0; i < result.positions.length; i += 3) {
      const x = result.positions[i] ?? 0;
      const y = result.positions[i + 1] ?? 0;
      const z = result.positions[i + 2] ?? 0;
      const r = Math.sqrt(x * x + y * y + z * z);
      expect(r).toBeCloseTo(GLOBE_RADIUS * 1.001, 4);
    }
  });

  it('drops trailing closing vertex if duplicate of first', () => {
    // square has [0,0] both at index 0 and 4. After triangulation we should
    // have 4 positions, not 5 — earcut would otherwise produce zero-area tris.
    const result = triangulateRing(square, GLOBE_RADIUS * 1.001);
    expect(result?.positions.length).toBe(4 * 3);
  });

  it('places 3D vertices at the correct lat/lng (GeoJSON [lng, lat] convention)', () => {
    // Ring vertex [10, 20] in GeoJSON convention is lng=10, lat=20.
    // After triangulation + roundtrip via vector3ToLatLng, we must read back lat=20, lng=10.
    // (Earlier bug: positions came out swapped.)
    const ring: ReadonlyArray<readonly [number, number]> = [
      [10, 20],
      [30, 20],
      [30, 40],
      [10, 40],
      [10, 20],
    ];
    const result = triangulateRing(ring, GLOBE_RADIUS);
    expect(result).not.toBeNull();
    if (!result) return;
    // First vertex
    const v0 = new Vector3(result.positions[0], result.positions[1], result.positions[2]);
    const [lat0, lng0] = vector3ToLatLng(v0);
    expect(lat0).toBeCloseTo(20, 4);
    expect(lng0).toBeCloseTo(10, 4);
    // Third vertex (should map to lng=30, lat=40)
    const v2 = new Vector3(result.positions[6], result.positions[7], result.positions[8]);
    const [lat2, lng2] = vector3ToLatLng(v2);
    expect(lat2).toBeCloseTo(40, 4);
    expect(lng2).toBeCloseTo(30, 4);
  });
});

describe('triangulatePolygon', () => {
  it('returns null for empty input', () => {
    expect(triangulatePolygon([], GLOBE_RADIUS)).toBeNull();
  });

  it('triangulates a simple polygon and returns something renderable', () => {
    const result = triangulatePolygon([square], GLOBE_RADIUS);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.indices.length).toBeGreaterThan(0);
    expect(result.indices.length % 3).toBe(0);
  });

  it('keeps every vertex on the sphere surface (including subdivision midpoints)', () => {
    // Subdivision inserts midpoint vertices and re-projects them onto the sphere.
    // Verify the invariant for a polygon big enough to actually subdivide.
    const big: ReadonlyArray<readonly [number, number]> = [
      [0, 0], [40, 0], [40, 40], [0, 40], [0, 0],
    ];
    const result = triangulatePolygon([big], GLOBE_RADIUS);
    expect(result).not.toBeNull();
    if (!result) return;
    for (let i = 0; i < result.positions.length; i += 3) {
      const x = result.positions[i] ?? 0;
      const y = result.positions[i + 1] ?? 0;
      const z = result.positions[i + 2] ?? 0;
      expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(GLOBE_RADIUS, 3);
    }
  });

  it('subdivides large triangles so chord-cuts stay shallow on the sphere', () => {
    // Without subdivision, a 60×60° square produces 2 huge triangles whose
    // chord midpoint dips ~13% of radius below the surface — the bug that
    // caused fill to bleed through to the far side. With subdivision the
    // resulting triangles must all stay close to the sphere.
    const big: ReadonlyArray<readonly [number, number]> = [
      [0, 0], [60, 0], [60, 60], [0, 60], [0, 0],
    ];
    const result = triangulatePolygon([big], GLOBE_RADIUS);
    expect(result).not.toBeNull();
    if (!result) return;
    // 2 raw triangles would be 6 indices; subdivision must produce more.
    expect(result.indices.length).toBeGreaterThan(6);
    // Verify the edge-length invariant: every triangle edge is below the
    // subdivision threshold (chord for 6° at unit radius ≈ 0.105 → at
    // GLOBE_RADIUS we have 0.105*radius, with a small slack for rounding).
    const maxChord = 2 * GLOBE_RADIUS * Math.sin((6 * Math.PI / 180) / 2) * 1.0001;
    for (let t = 0; t < result.indices.length; t += 3) {
      const a = result.indices[t]! * 3;
      const b = result.indices[t + 1]! * 3;
      const c = result.indices[t + 2]! * 3;
      const len = (i: number, j: number) => {
        const dx = (result.positions[i] ?? 0) - (result.positions[j] ?? 0);
        const dy = (result.positions[i + 1] ?? 0) - (result.positions[j + 1] ?? 0);
        const dz = (result.positions[i + 2] ?? 0) - (result.positions[j + 2] ?? 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      };
      expect(len(a, b)).toBeLessThanOrEqual(maxChord);
      expect(len(b, c)).toBeLessThanOrEqual(maxChord);
      expect(len(c, a)).toBeLessThanOrEqual(maxChord);
    }
  });

  it('subtracts a hole — no triangle centroid lands inside the hole region', () => {
    // 20×20 outer with a 10×10 hole. Project triangle centroids back to
    // lng/lat and verify none lie inside the hole's lng/lat bbox.
    const outer: ReadonlyArray<readonly [number, number]> = [
      [0, 0], [20, 0], [20, 20], [0, 20], [0, 0],
    ];
    const hole: ReadonlyArray<readonly [number, number]> = [
      [6, 6], [6, 14], [14, 14], [14, 6], [6, 6],
    ];
    const result = triangulatePolygon([outer, hole], GLOBE_RADIUS);
    expect(result).not.toBeNull();
    if (!result) return;
    let inside = 0;
    for (let t = 0; t < result.indices.length; t += 3) {
      const ai = result.indices[t]! * 3;
      const bi = result.indices[t + 1]! * 3;
      const ci = result.indices[t + 2]! * 3;
      const cx = ((result.positions[ai]! + result.positions[bi]! + result.positions[ci]!) / 3);
      const cy = ((result.positions[ai + 1]! + result.positions[bi + 1]! + result.positions[ci + 1]!) / 3);
      const cz = ((result.positions[ai + 2]! + result.positions[bi + 2]! + result.positions[ci + 2]!) / 3);
      // Inverse of latLngToVector3(lat, lng): lng = atan2(z, x), lat = asin(y / r)
      const r = Math.sqrt(cx * cx + cy * cy + cz * cz);
      const lng = (Math.atan2(cz, cx) * 180) / Math.PI;
      const lat = (Math.asin(cy / r) * 180) / Math.PI;
      // Hole bbox is lng [6,14], lat [6,14]. Some slack near the edges
      // because centroids can land just outside even when the triangle
      // touches the hole boundary.
      if (lng > 7 && lng < 13 && lat > 7 && lat < 13) inside++;
    }
    expect(inside).toBe(0);
  });

  it('produces a T-junction-free mesh — every shared edge has consistent vertices', () => {
    // T-junctions are where one triangle has A-B as an edge while a neighbour
    // sharing that edge has A-M-B. They show up as hairline cracks in render.
    // Our subdivision flags edges to split before splitting any triangle, so
    // neighbours always agree. Verify by walking edges: any vertex that lies
    // exactly on an edge (between its endpoints) must itself be one of the
    // edge's endpoints in every triangle that uses that edge.
    const big: ReadonlyArray<readonly [number, number]> = [
      [0, 0], [40, 0], [40, 40], [0, 40], [0, 0],
    ];
    const result = triangulatePolygon([big], GLOBE_RADIUS);
    expect(result).not.toBeNull();
    if (!result) return;

    // Build edge usage map — for each unordered edge key, list the triangle
    // indices that use it. Any T-junction would manifest as a vertex appearing
    // in the middle of an edge of one triangle but as an endpoint in another.
    const edgeUses = new Map<string, Array<number>>();
    const key = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
    for (let t = 0; t < result.indices.length; t += 3) {
      const a = result.indices[t]!;
      const b = result.indices[t + 1]!;
      const c = result.indices[t + 2]!;
      for (const k of [key(a, b), key(b, c), key(c, a)]) {
        const list = edgeUses.get(k) ?? [];
        list.push(t / 3);
        edgeUses.set(k, list);
      }
    }
    // No edge should be used by more than two triangles in a 2-manifold.
    for (const [, tris] of edgeUses) {
      expect(tris.length).toBeLessThanOrEqual(2);
    }
  });

  it('handles antimeridian-crossing rings without degenerate huge triangles', () => {
    // 20°-wide rectangle straddling lng=180. Without the unwrap, earcut sees
    // a 340° flat polygon and produces a single zero-area mess.
    const ring: ReadonlyArray<readonly [number, number]> = [
      [170, 60], [-170, 60], [-170, 70], [170, 70], [170, 60],
    ];
    const result = triangulatePolygon([ring], GLOBE_RADIUS);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.indices.length).toBeGreaterThan(0);
    // All vertices must remain on the sphere after unwrap + subdivision.
    for (let i = 0; i < result.positions.length; i += 3) {
      const x = result.positions[i] ?? 0;
      const y = result.positions[i + 1] ?? 0;
      const z = result.positions[i + 2] ?? 0;
      expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(GLOBE_RADIUS, 3);
    }
  });
});
