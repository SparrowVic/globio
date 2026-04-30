/**
 * Icosphere geometry generator for the hex-bin data layer.
 *
 * Starts from the 12 vertices / 20 faces of a regular icosahedron and
 * subdivides each face into 4 by inserting midpoints (re-projected onto
 * the unit sphere). Subdivision count `N` therefore yields `20 × 4^N`
 * faces:
 *
 *   level 0 → 20 · 1 → 80 · 2 → 320 · 3 → 1280 · 4 → 5120 · 5 → 20480
 *
 * The result is memoised at module scope (level 0..5) so successive
 * `setData` calls with the same resolution skip re-tessellation.
 */

const GOLDEN = (1 + Math.sqrt(5)) / 2;

export interface IcosphereData {
  readonly level: number;
  /** Flat XYZ buffer; 3 floats per vertex. */
  readonly vertices: Float32Array;
  /** Each face = 3 vertex indices into `vertices`. */
  readonly faces: Uint32Array;
  /** Face centroids on the unit sphere; 3 floats per face. */
  readonly faceCentroids: Float32Array;
  /** Per-face latitude/longitude in degrees, useful for spatial bbox prefilters. */
  readonly faceLatLng: Float32Array; // 2 floats per face: [lat, lng, lat, lng, ...]
}

const cache = new Map<number, IcosphereData>();

const MAX_LEVEL = 5;

const clampLevel = (level: number): number => {
  if (!Number.isFinite(level)) return 3;
  const i = Math.round(level);
  if (i < 0) return 0;
  if (i > MAX_LEVEL) return MAX_LEVEL;
  return i;
};

/** Build (and cache) the icosphere geometry for a given subdivision level. */
export const buildIcosphere = (level: number): IcosphereData => {
  const lvl = clampLevel(level);
  const cached = cache.get(lvl);
  if (cached) return cached;
  const built = build(lvl);
  cache.set(lvl, built);
  return built;
};

const build = (level: number): IcosphereData => {
  const { vertices, faces } = buildBaseIcosahedron();
  let verts = vertices;
  let tris = faces;
  for (let i = 0; i < level; i++) {
    const subdivided = subdivide(verts, tris);
    verts = subdivided.vertices;
    tris = subdivided.faces;
  }

  const faceCount = tris.length / 3;
  const centroids = new Float32Array(faceCount * 3);
  const latLng = new Float32Array(faceCount * 2);
  for (let i = 0; i < faceCount; i++) {
    const a = tris[i * 3]! * 3;
    const b = tris[i * 3 + 1]! * 3;
    const c = tris[i * 3 + 2]! * 3;
    let cx = (verts[a]! + verts[b]! + verts[c]!) / 3;
    let cy = (verts[a + 1]! + verts[b + 1]! + verts[c + 1]!) / 3;
    let cz = (verts[a + 2]! + verts[b + 2]! + verts[c + 2]!) / 3;
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
    cx /= len;
    cy /= len;
    cz /= len;
    centroids[i * 3] = cx;
    centroids[i * 3 + 1] = cy;
    centroids[i * 3 + 2] = cz;
    // Convert back to lat/lng using the same convention as
    // utils/coordinates.ts vector3ToLatLng.
    const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, cy))) * 180) / Math.PI;
    const lngRaw = (Math.atan2(cz, -cx) * 180) / Math.PI - 180;
    const lng = ((lngRaw + 540) % 360) - 180;
    latLng[i * 2] = lat;
    latLng[i * 2 + 1] = lng;
  }

  return {
    level,
    vertices: verts,
    faces: tris,
    faceCentroids: centroids,
    faceLatLng: latLng,
  };
};

const buildBaseIcosahedron = (): {
  vertices: Float32Array;
  faces: Uint32Array;
} => {
  // 12 vertices of an icosahedron, normalised to the unit sphere.
  const t = GOLDEN;
  const raw: ReadonlyArray<readonly [number, number, number]> = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  const vertices = new Float32Array(raw.length * 3);
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i]!;
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    vertices[i * 3] = v[0] / len;
    vertices[i * 3 + 1] = v[1] / len;
    vertices[i * 3 + 2] = v[2] / len;
  }

  // 20 faces — standard icosahedron index list.
  const faceIndices: ReadonlyArray<readonly [number, number, number]> = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const faces = new Uint32Array(faceIndices.length * 3);
  for (let i = 0; i < faceIndices.length; i++) {
    const f = faceIndices[i]!;
    faces[i * 3] = f[0];
    faces[i * 3 + 1] = f[1];
    faces[i * 3 + 2] = f[2];
  }
  return { vertices, faces };
};

/**
 * One subdivision pass — replace every triangle (a,b,c) with 4 new ones by
 * inserting midpoints (normalised onto the sphere): (a, ab, ac), (ab, b, bc),
 * (ac, bc, c), (ab, bc, ac). Edge midpoints are deduped via an unordered
 * `min_max` key map so neighbouring triangles share the same vertex
 * (no T-junctions / crack artefacts).
 */
const subdivide = (
  vertices: Float32Array,
  faces: Uint32Array
): { vertices: Float32Array; faces: Uint32Array } => {
  const oldVertCount = vertices.length / 3;
  const oldFaceCount = faces.length / 3;
  // 4× faces, ≤ 4× vertex count (some midpoints are shared so the actual
  // count is lower; we resize at the end).
  const midpointCache = new Map<number, number>();
  const newVerts: Array<number> = [];
  for (let i = 0; i < vertices.length; i++) newVerts.push(vertices[i]!);

  const midpoint = (i: number, j: number): number => {
    const key = i < j ? i * oldVertCount * 4 + j : j * oldVertCount * 4 + i;
    const cached = midpointCache.get(key);
    if (cached !== undefined) return cached;
    const ax = vertices[i * 3]!;
    const ay = vertices[i * 3 + 1]!;
    const az = vertices[i * 3 + 2]!;
    const bx = vertices[j * 3]!;
    const by = vertices[j * 3 + 1]!;
    const bz = vertices[j * 3 + 2]!;
    let mx = (ax + bx) * 0.5;
    let my = (ay + by) * 0.5;
    let mz = (az + bz) * 0.5;
    const len = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
    mx /= len;
    my /= len;
    mz /= len;
    const idx = newVerts.length / 3;
    newVerts.push(mx, my, mz);
    midpointCache.set(key, idx);
    return idx;
  };

  const newFaces = new Uint32Array(oldFaceCount * 4 * 3);
  for (let i = 0; i < oldFaceCount; i++) {
    const a = faces[i * 3]!;
    const b = faces[i * 3 + 1]!;
    const c = faces[i * 3 + 2]!;
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ac = midpoint(a, c);
    const o = i * 12;
    newFaces[o] = a;
    newFaces[o + 1] = ab;
    newFaces[o + 2] = ac;
    newFaces[o + 3] = ab;
    newFaces[o + 4] = b;
    newFaces[o + 5] = bc;
    newFaces[o + 6] = ac;
    newFaces[o + 7] = bc;
    newFaces[o + 8] = c;
    newFaces[o + 9] = ab;
    newFaces[o + 10] = bc;
    newFaces[o + 11] = ac;
  }

  return {
    vertices: new Float32Array(newVerts),
    faces: newFaces,
  };
};
