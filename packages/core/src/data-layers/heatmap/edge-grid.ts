import type { RingBounds } from './polygon-utils';

/**
 * Spatial hash over a polygon's outer + hole rings for fast nearest-edge
 * queries. Each cell stores indices into a flat `[a.lng, a.lat, b.lng,
 * b.lat, ...]` edge buffer; an edge is added to every cell its bounding
 * box overlaps.
 *
 * `edgeGridDistance` searches outward from the query cell ring-by-ring
 * until the running minimum distance is shorter than any unscanned cell
 * could possibly produce — typically O(constant) per query for a 16×N
 * grid even on hi-res polygons.
 */
export interface EdgeGrid {
  readonly cellSize: number;
  readonly minLng: number;
  readonly minLat: number;
  readonly cols: number;
  readonly rows: number;
  /** Per-cell list of edge indices (each edge = 4 floats in `edges`). */
  readonly cells: ReadonlyArray<Int32Array>;
  /** Flat edge buffer: `[a.lng, a.lat, b.lng, b.lat, ...]`. */
  readonly edges: Float32Array;
  /** `cos(centreLat)` — scales lng deltas to a spherical-equivalent metric. */
  readonly cosLat: number;
}

const CELL_TARGET = 16;
const MIN_CELL_SIZE_DEG = 0.1;

/**
 * Build an `EdgeGrid` covering `bounds`. `cosLat` is captured in the grid
 * so distance queries can scale lng deltas without recomputing it.
 */
export const buildEdgeGrid = (
  outer: ReadonlyArray<readonly [number, number]>,
  holes: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  bounds: RingBounds,
  cosLat: number
): EdgeGrid => {
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 1e-3);
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 1e-3);
  // Aim for ~16 cells along the longer axis; tiny polygons collapse to
  // a single cell which is also fine.
  const cellSize = Math.max(lngSpan / CELL_TARGET, latSpan / CELL_TARGET, MIN_CELL_SIZE_DEG);
  const cols = Math.max(1, Math.ceil(lngSpan / cellSize));
  const rows = Math.max(1, Math.ceil(latSpan / cellSize));
  const cellLists: Array<Array<number>> = Array.from({ length: cols * rows }, () => []);
  const edgesFlat: Array<number> = [];

  const addRing = (ring: ReadonlyArray<readonly [number, number]>) => {
    if (ring.length < 2) return;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (!a || !b) continue;
      if (a[0] === b[0] && a[1] === b[1]) continue;
      const idx = edgesFlat.length / 4;
      edgesFlat.push(a[0], a[1], b[0], b[1]);
      const minX = Math.min(a[0], b[0]);
      const maxX = Math.max(a[0], b[0]);
      const minY = Math.min(a[1], b[1]);
      const maxY = Math.max(a[1], b[1]);
      const cx0 = Math.max(0, Math.min(cols - 1, Math.floor((minX - bounds.minLng) / cellSize)));
      const cx1 = Math.max(0, Math.min(cols - 1, Math.floor((maxX - bounds.minLng) / cellSize)));
      const cy0 = Math.max(0, Math.min(rows - 1, Math.floor((minY - bounds.minLat) / cellSize)));
      const cy1 = Math.max(0, Math.min(rows - 1, Math.floor((maxY - bounds.minLat) / cellSize)));
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          cellLists[cy * cols + cx]!.push(idx);
        }
      }
    }
  };

  addRing(outer);
  for (const hole of holes) addRing(hole);

  return {
    cellSize,
    minLng: bounds.minLng,
    minLat: bounds.minLat,
    cols,
    rows,
    cells: cellLists.map((list) => Int32Array.from(list)),
    edges: Float32Array.from(edgesFlat),
    cosLat,
  };
};

/**
 * Distance from `(lng, lat)` to the nearest edge in the grid, in
 * spherical-scaled lng/lat units (lng deltas multiplied by `cosLat`).
 * Spirals outward by cell ring; terminates once `minD ≤ radius * cellSize`,
 * meaning no unscanned cell's content could be closer.
 */
export const edgeGridDistance = (grid: EdgeGrid, lng: number, lat: number): number => {
  const cosLat = grid.cosLat;
  const cx0 = Math.max(0, Math.min(grid.cols - 1, Math.floor((lng - grid.minLng) / grid.cellSize)));
  const cy0 = Math.max(0, Math.min(grid.rows - 1, Math.floor((lat - grid.minLat) / grid.cellSize)));
  const maxRadius = Math.max(grid.cols, grid.rows);
  const edges = grid.edges;
  let minD = Infinity;

  for (let radius = 0; radius <= maxRadius; radius++) {
    const x0 = Math.max(0, cx0 - radius);
    const x1 = Math.min(grid.cols - 1, cx0 + radius);
    const y0 = Math.max(0, cy0 - radius);
    const y1 = Math.min(grid.rows - 1, cy0 + radius);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (radius > 0 && Math.max(Math.abs(cx - cx0), Math.abs(cy - cy0)) < radius) {
          continue;
        }
        const cell = grid.cells[cy * grid.cols + cx]!;
        for (let i = 0; i < cell.length; i++) {
          const ei = cell[i]! * 4;
          const ax = edges[ei]!;
          const ay = edges[ei + 1]!;
          const bx = edges[ei + 2]!;
          const by = edges[ei + 3]!;
          const exSc = (bx - ax) * cosLat;
          const ey = by - ay;
          const len2 = exSc * exSc + ey * ey;
          const pxSc = (lng - ax) * cosLat;
          const py = lat - ay;
          let d: number;
          if (len2 < 1e-12) {
            d = Math.hypot(pxSc, py);
          } else {
            let s = (pxSc * exSc + py * ey) / len2;
            if (s < 0) s = 0;
            else if (s > 1) s = 1;
            const dxSc = pxSc - s * exSc;
            const dy = py - s * ey;
            d = Math.hypot(dxSc, dy);
          }
          if (d < minD) minD = d;
        }
      }
    }
    if (radius > 0 && minD <= radius * grid.cellSize) break;
  }
  return Number.isFinite(minD) ? minD : 0;
};

/**
 * First-hit distance from a 2D ray (origin in lng/lat, direction in the
 * same cos-lat-scaled metric the grid uses) to the polygon boundary.
 * Used by the dome painter when `rounding < 1` to compute the
 * polygon-shape t-field that gets blended with the rounded distance-to-edge
 * field.
 */
export const rayPolygonBoundary = (
  outer: ReadonlyArray<readonly [number, number]>,
  holes: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
  ox: number,
  oy: number,
  dirX: number,
  dirY: number,
  cosLat: number
): number => {
  let best = Infinity;
  const checkRing = (ring: ReadonlyArray<readonly [number, number]>): void => {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (!a || !b) continue;
      const ax = (a[0] - ox) * cosLat;
      const ay = a[1] - oy;
      const bx = (b[0] - ox) * cosLat;
      const by = b[1] - oy;
      const sx = bx - ax;
      const sy = by - ay;
      const denom = dirX * sy - dirY * sx;
      if (Math.abs(denom) < 1e-9) continue;
      const s = (ax * sy - ay * sx) / denom;
      const u = (ax * dirY - ay * dirX) / denom;
      if (s > 1e-5 && u >= -1e-5 && u <= 1 + 1e-5 && s < best) {
        best = s;
      }
    }
  };
  checkRing(outer);
  for (const hole of holes) checkRing(hole);
  return Number.isFinite(best) ? best : Infinity;
};
