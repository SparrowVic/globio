import { CanvasTexture, LinearFilter, RepeatWrapping } from 'three';
import type { Texture } from 'three';
import { normalizePolygon } from '../../utils/polygon-normalize';
import type { CountryFeature } from '../../renderer/country-feature';
import type { CinematicPreparedData } from './data';
import { fbm2D, ridged2D } from './noise';

export interface CinematicSurfaceAtlas {
  readonly landTexture: Texture;
  readonly densityTexture: Texture;
  readonly terrainTexture: Texture;
  dispose(): void;
}

/** Land + coast-distance atlas dimensions (equirectangular, 2:1). */
export const LAND_ATLAS_SIZE = { width: 1024, height: 512 } as const;
/** Terrain (height / moisture / ridge) atlas dimensions — same grid as the land atlas. */
// The terrain bake samples the land mask + coast field per pixel, so it must
// share the land atlas grid exactly; derive rather than duplicate the size.
export const TERRAIN_ATLAS_SIZE = LAND_ATLAS_SIZE;

const LAND_WIDTH = LAND_ATLAS_SIZE.width;
const LAND_HEIGHT = LAND_ATLAS_SIZE.height;

// Coast falloff distance, in atlas pixels, at which the land/ocean distance
// fields saturate (land atlas G/B channels reach 255; terrain coast-lift
// reaches 1.0). ~28px at 1024px wide is a little under 10° of longitude at
// the equator — wide enough to read as a coastal gradient without washing
// out small islands or peninsulas.
const COAST_FALLOFF_PX = 28;

export const buildCinematicSurfaceAtlas = (
  features: ReadonlyArray<CountryFeature>,
  prepared: CinematicPreparedData,
): CinematicSurfaceAtlas => {
  const bake = getLandBake(features);
  const land = buildLandTexture(features);
  const densityTexture = buildDensityTexture(prepared);
  if (bake.terrainCanvas === null) bake.terrainCanvas = bakeTerrainCanvas(bake.landMask, bake.landDist);
  const terrainTexture = configureTexture(new CanvasTexture(bake.terrainCanvas));
  return {
    landTexture: land.texture,
    densityTexture,
    terrainTexture,
    dispose() {
      land.texture.dispose();
      densityTexture.dispose();
      terrainTexture.dispose();
    },
  };
};

export const buildDensityTexture = (prepared: CinematicPreparedData): Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = prepared.densityWidth;
  canvas.height = prepared.densityHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[globio] unable to allocate cinematic density atlas');
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < prepared.density.length; i++) {
    const value = Math.max(0, Math.min(255, Math.round((prepared.density[i] ?? 0) * 255)));
    image.data[i * 4] = value;
    image.data[i * 4 + 1] = value;
    image.data[i * 4 + 2] = value;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return configureTexture(new CanvasTexture(canvas));
};

interface LandRaster {
  readonly texture: Texture;
  /** 1 = land, 0 = ocean; one byte per atlas pixel, row-major. */
  readonly landMask: Uint8Array;
  /**
   * Distance in pixels from each pixel to the nearest ocean pixel — 0 on
   * ocean, growing over land, clamped to `COAST_FALLOFF_PX`. Feeds both the
   * land atlas's B channel and the terrain atlas's coastal height lift.
   */
  readonly landDist: Float32Array;
}

/**
 * Rasterises every country polygon into a land mask, then derives the
 * coast distance fields and encodes everything into the land atlas texture:
 * R = land mask, G = ocean-side distance to land, B = land-side distance to
 * ocean, A = 255. Both distance channels come from a two-pass chamfer
 * transform (see `distanceTransform`) run once on the land mask and once on
 * its inverse.
 */
// The rasterise + distance-transform + terrain bake is ~150 ms of pure CPU
// work that depends only on the feature set, which every globe on a page
// shares (see geo-loader's cache). Cache the baked canvases per feature
// array; each globe still gets its own textures (GPU uploads are per
// renderer), so disposing one globe never touches another.
interface LandBake {
  readonly landCanvas: HTMLCanvasElement;
  readonly landMask: Uint8Array;
  readonly landDist: Float32Array;
  terrainCanvas: HTMLCanvasElement | null;
}
const bakeCache = new WeakMap<ReadonlyArray<CountryFeature>, LandBake>();

const getLandBake = (features: ReadonlyArray<CountryFeature>): LandBake => {
  const cached = bakeCache.get(features);
  if (cached) return cached;
  const bake = bakeLand(features);
  bakeCache.set(features, bake);
  return bake;
};

const buildLandTexture = (features: ReadonlyArray<CountryFeature>): LandRaster => {
  const bake = getLandBake(features);
  return {
    texture: configureTexture(new CanvasTexture(bake.landCanvas)),
    landMask: bake.landMask,
    landDist: bake.landDist,
  };
};

const bakeLand = (features: ReadonlyArray<CountryFeature>): LandBake => {
  const landMask = rasterizeLandMask(features);

  // Distance to the nearest LAND pixel — 0 exactly on land, grows over ocean.
  const oceanDist = distanceTransform(landMask, LAND_WIDTH, LAND_HEIGHT, COAST_FALLOFF_PX);

  // Distance to the nearest OCEAN pixel — 0 exactly on ocean, grows over land.
  const oceanMask = new Uint8Array(LAND_WIDTH * LAND_HEIGHT);
  for (let i = 0; i < landMask.length; i++) oceanMask[i] = landMask[i] ? 0 : 1;
  const landDist = distanceTransform(oceanMask, LAND_WIDTH, LAND_HEIGHT, COAST_FALLOFF_PX);

  const canvas = document.createElement('canvas');
  canvas.width = LAND_WIDTH;
  canvas.height = LAND_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[globio] unable to allocate cinematic land atlas');
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < landMask.length; i++) {
    const index = i * 4;
    image.data[index] = landMask[i] ? 255 : 0;
    // oceanDist is already exactly 0 at every land pixel (distance to the
    // nearest land pixel — itself — is 0), so G reads 0 on land with no
    // extra branch needed.
    image.data[index + 1] = normalizeCoastDistance(oceanDist[i] ?? 0);
    // landDist is already exactly 0 at every ocean pixel, for the same
    // reason, so B reads 0 on ocean.
    image.data[index + 2] = normalizeCoastDistance(landDist[i] ?? 0);
    image.data[index + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { landCanvas: canvas, landMask, landDist, terrainCanvas: null };
};

const normalizeCoastDistance = (distancePx: number): number =>
  Math.round(Math.min(distancePx / COAST_FALLOFF_PX, 1) * 255);

// ────────────────────────────────────────────────────────────────────────────
// Chamfer distance transform
// ────────────────────────────────────────────────────────────────────────────

const CHAMFER_ORTHOGONAL = 3;
const CHAMFER_DIAGONAL = 4;

/**
 * Two-pass chamfer (3-4) distance transform. For every pixel, returns the
 * approximate Euclidean distance (in pixels) to the nearest pixel where
 * `mask` is non-zero — exactly 0 at mask pixels themselves. Wraps
 * horizontally (the atlas is an equirectangular projection — the
 * antimeridian is a seam, not an edge) and clamps vertically (the poles
 * really are edges — no wraparound top-to-bottom). Distances are capped at
 * `maxDistancePx` so pixels arbitrarily far from any mask pixel (e.g.
 * mid-ocean) still resolve to a well-defined, saturated value.
 */
const distanceTransform = (
  mask: Uint8Array,
  width: number,
  height: number,
  maxDistancePx: number,
): Float32Array => {
  const size = width * height;
  const dist = new Float32Array(size);
  for (let i = 0; i < size; i++) dist[i] = mask[i] ? 0 : Infinity;

  const wrapX = (x: number): number => (x + width) % width;

  // Forward pass: top-left → bottom-right. Pulls from the neighbours
  // already visited in raster-scan order (left, up, up-left, up-right).
  for (let y = 0; y < height; y++) {
    const row = y * width;
    const rowAbove = row - width;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      let best = dist[i] ?? Infinity;
      const left = row + wrapX(x - 1);
      best = Math.min(best, (dist[left] ?? Infinity) + CHAMFER_ORTHOGONAL);
      if (y > 0) {
        const up = rowAbove + x;
        best = Math.min(best, (dist[up] ?? Infinity) + CHAMFER_ORTHOGONAL);
        const upLeft = rowAbove + wrapX(x - 1);
        best = Math.min(best, (dist[upLeft] ?? Infinity) + CHAMFER_DIAGONAL);
        const upRight = rowAbove + wrapX(x + 1);
        best = Math.min(best, (dist[upRight] ?? Infinity) + CHAMFER_DIAGONAL);
      }
      dist[i] = best;
    }
  }

  // Backward pass: bottom-right → top-left. Mirrors the forward pass using
  // the neighbours it doesn't cover (right, down, down-left, down-right).
  for (let y = height - 1; y >= 0; y--) {
    const row = y * width;
    const rowBelow = row + width;
    for (let x = width - 1; x >= 0; x--) {
      const i = row + x;
      let best = dist[i] ?? Infinity;
      const right = row + wrapX(x + 1);
      best = Math.min(best, (dist[right] ?? Infinity) + CHAMFER_ORTHOGONAL);
      if (y < height - 1) {
        const down = rowBelow + x;
        best = Math.min(best, (dist[down] ?? Infinity) + CHAMFER_ORTHOGONAL);
        const downLeft = rowBelow + wrapX(x - 1);
        best = Math.min(best, (dist[downLeft] ?? Infinity) + CHAMFER_DIAGONAL);
        const downRight = rowBelow + wrapX(x + 1);
        best = Math.min(best, (dist[downRight] ?? Infinity) + CHAMFER_DIAGONAL);
      }
      dist[i] = best;
    }
  }

  // Chamfer units → approximate pixel distance, capped at maxDistancePx.
  for (let i = 0; i < size; i++) {
    const px = (dist[i] ?? 0) / CHAMFER_ORTHOGONAL;
    dist[i] = px > maxDistancePx ? maxDistancePx : px;
  }
  return dist;
};

// ────────────────────────────────────────────────────────────────────────────
// Terrain atlas (height / moisture / ridge mask)
// ────────────────────────────────────────────────────────────────────────────

const bakeTerrainCanvas = (landMask: Uint8Array, landDist: Float32Array): HTMLCanvasElement => {
  const width = TERRAIN_ATLAS_SIZE.width;
  const height = TERRAIN_ATLAS_SIZE.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[globio] unable to allocate cinematic terrain atlas');
  const image = ctx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    const lat = yToLat(y + 0.5);
    const latRad = (lat * Math.PI) / 180;
    // Longitude lines converge toward the poles; without this the fbm
    // fields visibly stretch/compress near lat ±90. Flooring at 0.25 keeps
    // the effective x frequency from collapsing to zero at the pole itself.
    const lngFreqScale = Math.max(0.25, Math.cos(latRad));
    const yn = lat / 40;
    const rowBase = y * width;

    for (let x = 0; x < width; x++) {
      const i = rowBase + x;
      const lng = xToLng(x + 0.5);
      const xn = (lng / 40) * lngFreqScale;

      const continent = fbm2D(xn * 3, yn * 3, 4, 11);
      const mountains = ridged2D(xn * 9, yn * 9, 5, 23);
      const belt = smoothstepLocal(0.45, 0.8, fbm2D(xn * 2.2, yn * 2.2, 3, 37));
      const moisture = fbm2D(xn * 4.5, yn * 4.5, 4, 53);

      const isLand = (landMask[i] ?? 0) !== 0 ? 1 : 0;
      const landDist01 = clamp01Local((landDist[i] ?? 0) / COAST_FALLOFF_PX);
      const coastLift = clampLocal(landDist01 * 1.8, 0.15, 1);
      const heightValue = clamp01Local(
        (continent * 0.55 + mountains * 0.75 * belt) * isLand * coastLift,
      );
      const ridge = clamp01Local(mountains * belt);

      const index = i * 4;
      image.data[index] = Math.round(heightValue * 255);
      image.data[index + 1] = Math.round(clamp01Local(moisture) * 255);
      image.data[index + 2] = Math.round(ridge * 255);
      image.data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
};

const clamp01Local = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

const clampLocal = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

const smoothstepLocal = (edge0: number, edge1: number, value: number): number => {
  const t = clamp01Local((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const configureTexture = (texture: Texture): Texture => {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

/**
 * Rasterise every country polygon into a 1 = land / 0 = ocean byte mask on
 * the atlas grid (row-major, `y * LAND_WIDTH + x`). Pure — no DOM — so it
 * can be benchmarked and tested outside a browser.
 */
export const rasterizeLandMask = (features: ReadonlyArray<CountryFeature>): Uint8Array => {
  const landMask = new Uint8Array(LAND_WIDTH * LAND_HEIGHT);
  for (const feature of features) {
    for (const polygon of feature.polygons) {
      rasterizePolygon(landMask, polygon);
    }
  }
  return landMask;
};

/**
 * Scanline polygon fill with the even/odd rule.
 *
 * For every atlas row inside the polygon's latitude range we collect the
 * longitudes at which the ring edges (outer ring + holes, all in the same
 * antimeridian-shifted space) cross the row's centre latitude, sort them,
 * and fill the pixels whose centre lies between successive pairs. Even/odd
 * makes holes fall out naturally — a hole edge toggles the inside state
 * exactly like an outer edge — and the crossing predicate is the same one
 * the ray-casting point-in-ring test uses, so the mask is identical to the
 * previous per-pixel scan for well-formed GeoJSON (outer ring + disjoint
 * holes); only the cost changes, from O(bbox pixels × ring vertices) to
 * O(edges × rows each edge spans). Note the rule itself is even/odd over
 * all rings, whereas the old test was outer-minus-holes — they only differ
 * for nested or overlapping holes, which country data never contains.
 *
 * Rings come pre-normalised (utils/polygon-normalize.ts): antimeridian
 * crossings are unwrapped so the fill runs in a continuous longitude space
 * (pixel indices wrap back into the atlas), and Antarctica arrives closed
 * over the South Pole, so the cap is land all the way down.
 */
const rasterizePolygon = (
  mask: Uint8Array,
  polygon: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
): void => {
  const normalized = normalizePolygon(polygon);
  const outer = normalized.rings[0];
  if (!outer || outer.length < 3) return;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of outer) {
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  const yStart = clampPixelY(latToY(maxLat));
  const yEnd = clampPixelY(latToY(minLat));
  if (yEnd < yStart) return;
  const rowCount = yEnd - yStart + 1;
  const crossings: Array<number[] | undefined> = new Array<number[] | undefined>(rowCount);

  for (const ring of normalized.rings) {
    const n = ring.length;
    if (n < 2) continue;
    for (let i = 0; i < n; i++) {
      const a = ring[i]!;
      const b = ring[(i + 1) % n]!;
      const lat0 = a[1];
      const lat1 = b[1];
      if (lat0 === lat1) continue; // horizontal edges never straddle a row centre
      const lng0 = a[0];
      const lng1 = b[0];
      const latHi = lat0 > lat1 ? lat0 : lat1;
      const latLo = lat0 > lat1 ? lat1 : lat0;
      // Rows whose centre latitude lies in [latLo, latHi): latToY is
      // decreasing in latitude, so that is y in (latToY(latHi) - 0.5,
      // latToY(latLo) - 0.5].
      const rowFirst = Math.max(yStart, Math.floor(latToY(latHi) - 0.5) + 1);
      const rowLast = Math.min(yEnd, Math.floor(latToY(latLo) - 0.5));
      const slope = (lng1 - lng0) / (lat1 - lat0);
      for (let y = rowFirst; y <= rowLast; y++) {
        const latC = yToLat(y + 0.5);
        // Same half-open predicate as the ray-casting test — guards the
        // float boundaries of the row range above.
        if ((lat0 > latC) === (lat1 > latC)) continue;
        const px = lngToX(lng0 + (latC - lat0) * slope);
        const row = y - yStart;
        const bucket = crossings[row];
        if (bucket === undefined) crossings[row] = [px];
        else bucket.push(px);
      }
    }
  }

  for (let row = 0; row < rowCount; row++) {
    const xs = crossings[row];
    if (xs === undefined || xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    const rowOffset = (yStart + row) * LAND_WIDTH;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = xs[k]!;
      const xb = xs[k + 1]!;
      // Pixel i is inside when xa <= i + 0.5 < xb.
      const first = Math.ceil(xa - 0.5);
      const last = Math.ceil(xb - 0.5) - 1;
      for (let i = first; i <= last; i++) {
        mask[rowOffset + (((i % LAND_WIDTH) + LAND_WIDTH) % LAND_WIDTH)] = 1;
      }
    }
  }
};

const lngToX = (lng: number): number => ((lng + 180) / 360) * LAND_WIDTH;

const xToLng = (x: number): number => (x / LAND_WIDTH) * 360 - 180;

const latToY = (lat: number): number => ((90 - lat) / 180) * LAND_HEIGHT;

const yToLat = (y: number): number => 90 - (y / LAND_HEIGHT) * 180;


const clampPixelY = (value: number): number =>
  Math.max(0, Math.min(LAND_HEIGHT - 1, Math.floor(value)));
