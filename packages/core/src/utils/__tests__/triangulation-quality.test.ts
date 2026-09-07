import { describe, expect, it } from 'vitest';
import { triangulatePolygon } from '../triangulate-ring';
import { GLOBE_RADIUS } from '../coordinates';

type Ring = ReadonlyArray<readonly [number, number]>;

/** 50m-style Antarctica: a wiggly coast around -70 with a run along the pole. */
const cap = (): Ring => {
  const ring: Array<readonly [number, number]> = [[-180, -90]];
  for (let lng = 178; lng > -180; lng -= 2) ring.push([lng, -90]);
  for (let lng = -179.5; lng <= 179.5; lng += 1) {
    ring.push([lng, -70 + 3 * Math.sin(lng / 20) + 0.4 * Math.sin(lng * 1.7)]);
  }
  ring.push([-180, -90]);
  return ring;
};

/** A long, nearly straight east–west coast at 70°N with a jagged south side. */
const arcticStrip = (): Ring => {
  const ring: Array<readonly [number, number]> = [];
  for (let lng = 30; lng <= 170; lng += 1.5) ring.push([lng, 70 + 0.35 * Math.sin(lng * 0.9)]);
  for (let lng = 170; lng >= 30; lng -= 4) ring.push([lng, 60 + 2 * Math.sin(lng * 0.3)]);
  ring.push(ring[0]!);
  return ring;
};

/**
 * Count triangle pairs whose centroid lies inside another triangle, in an
 * orthographic view chosen so the region maps injectively (from below the
 * South Pole for the cap, from above the North Pole for the strip).
 */
const overlappingPairs = (positions: Float32Array, indices: Uint32Array): number => {
  const tris: Array<{ p: Array<[number, number]>; area: number }> = [];
  for (let k = 0; k < indices.length; k += 3) {
    const v = [indices[k]!, indices[k + 1]!, indices[k + 2]!].map(
      (i) => [positions[i * 3]!, positions[i * 3 + 2]!] as [number, number]
    );
    const area = Math.abs(
      (v[1]![0] - v[0]![0]) * (v[2]![1] - v[0]![1]) - (v[1]![1] - v[0]![1]) * (v[2]![0] - v[0]![0])
    ) / 2;
    tris.push({ p: v, area });
  }
  const inside = (q: [number, number], t: Array<[number, number]>): boolean => {
    const [a, b, c] = t as [[number, number], [number, number], [number, number]];
    const s1 = (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
    const s2 = (c[0] - b[0]) * (q[1] - b[1]) - (c[1] - b[1]) * (q[0] - b[0]);
    const s3 = (a[0] - c[0]) * (q[1] - c[1]) - (a[1] - c[1]) * (q[0] - c[0]);
    const eps = 1e-9;
    return (s1 > eps && s2 > eps && s3 > eps) || (s1 < -eps && s2 < -eps && s3 < -eps);
  };
  let count = 0;
  for (let i = 0; i < tris.length; i++) {
    const ti = tris[i]!;
    if (ti.area < 1e-9) continue;
    const c: [number, number] = [
      (ti.p[0]![0] + ti.p[1]![0] + ti.p[2]![0]) / 3,
      (ti.p[0]![1] + ti.p[1]![1] + ti.p[2]![1]) / 3,
    ];
    for (let j = 0; j < tris.length; j++) {
      if (j === i) continue;
      const tj = tris[j]!;
      if (tj.area < 1e-9) continue;
      if (inside(c, tj.p)) count++;
    }
  }
  return count;
};

describe('triangulatePolygon quality on the sphere', () => {
  // Ear clipping leaves long thin triangles along nearly straight coasts,
  // and on the sphere their chords can overlap their neighbours (height
  // below the chord sag). The fill layers neutralise the double blend with
  // a depth prepass, so geometry only has to keep the overlaps bounded —
  // a regression here would mean a broken normalisation or subdivision.
  it('keeps overlapping slivers bounded for a polar cap', () => {
    const tri = triangulatePolygon([cap()], GLOBE_RADIUS);
    expect(tri).not.toBeNull();
    if (!tri) return;
    const triangles = tri.indices.length / 3;
    expect(overlappingPairs(tri.positions, tri.indices)).toBeLessThan(triangles * 0.2);
  });

  it('keeps overlapping slivers bounded along a long nearly straight coast', () => {
    const tri = triangulatePolygon([arcticStrip()], GLOBE_RADIUS);
    expect(tri).not.toBeNull();
    if (!tri) return;
    const triangles = tri.indices.length / 3;
    expect(overlappingPairs(tri.positions, tri.indices)).toBeLessThan(triangles * 0.25);
  });

  it('returns radius-scaled copies of one shared unit triangulation', () => {
    const polygon = [arcticStrip()];
    const a = triangulatePolygon(polygon, GLOBE_RADIUS);
    const b = triangulatePolygon(polygon, GLOBE_RADIUS * 1.0015);
    expect(a && b).toBeTruthy();
    if (!a || !b) return;
    expect(b.indices).toBe(a.indices);
    expect(b.positions[0]).toBeCloseTo(a.positions[0]! * 1.0015, 6);
    expect(a.positions).not.toBe(b.positions);
  });
});
