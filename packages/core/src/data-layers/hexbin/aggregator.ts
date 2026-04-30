/**
 * Spatial aggregator — bins lat/lng samples into icosphere face cells.
 *
 * For each sample we find the nearest face centroid by maximising the dot
 * product (samples and centroids both live on the unit sphere; nearest by
 * great-circle distance ↔ highest dot product). For a level-3 icosphere
 * (1280 cells) and ~10k samples that's ~13M dot products — well under
 * 100ms, so we don't need a spatial index for v1.
 */

import { latLngToVector3 } from '../../utils/coordinates';
import type { HexBinAggregateMode } from '../types';

/*
 * HexBinAggregateMode is public in ../types. Keep the implementation's
 * mode semantics in sync with that union.
 */
export interface AggregatedBins {
  /** Per-face aggregated value. NaN means "no samples" (cell is empty). */
  readonly values: Float32Array;
  /** Per-face input sample counts. Empty cells have count 0. */
  readonly sampleCounts: Uint32Array;
  /** Min/max of finite values for scale-domain auto-fitting. */
  readonly extent: readonly [number, number];
  /** Total samples that fell into a cell (for diagnostic / status display). */
  readonly samplesBinned: number;
}

interface AggregatorSample {
  readonly position: readonly [number, number];
  readonly value?: number;
}

/**
 * Find the nearest centroid (highest dot product) to a 3D unit vector.
 * Returns the centroid index — caller still has to track which face that
 * corresponds to (one centroid per face).
 */
const nearestFace = (
  centroids: Float32Array,
  x: number,
  y: number,
  z: number
): number => {
  const count = centroids.length / 3;
  let bestIdx = 0;
  let bestDot = -Infinity;
  for (let i = 0; i < count; i++) {
    const cx = centroids[i * 3]!;
    const cy = centroids[i * 3 + 1]!;
    const cz = centroids[i * 3 + 2]!;
    const dot = cx * x + cy * y + cz * z;
    if (dot > bestDot) {
      bestDot = dot;
      bestIdx = i;
    }
  }
  return bestIdx;
};

export const aggregateSamples = (
  samples: ReadonlyArray<AggregatorSample>,
  faceCentroids: Float32Array,
  mode: HexBinAggregateMode
): AggregatedBins => {
  const faceCount = faceCentroids.length / 3;
  const values = new Float32Array(faceCount);
  // Initial values per mode — sum/count/mean accumulate into 0; min/max
  // need their respective extreme starting points so the first sample wins.
  if (mode === 'max') {
    values.fill(-Infinity);
  } else if (mode === 'min') {
    values.fill(Infinity);
  } else {
    values.fill(0);
  }
  const counts = new Uint32Array(faceCount);
  // `'median'` and `'p90'` need every sample's value retained so we can
  // sort + index per cell. Built lazily so the common (cheap) modes don't
  // pay the allocation cost.
  const needsSamples = mode === 'median' || mode === 'p90';
  const perCellSamples: Array<Array<number>> = needsSamples
    ? Array.from({ length: faceCount }, () => [])
    : [];

  let binned = 0;
  const targetVec = latLngToVector3([0, 0]);
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]!;
    if (!isValidPosition(sample.position)) continue;
    const v = latLngToVector3(sample.position, 1, targetVec);
    const faceIdx = nearestFace(faceCentroids, v.x, v.y, v.z);
    const sampleValue = sample.value ?? 1;
    if (mode !== 'count' && !Number.isFinite(sampleValue)) continue;
    const valueForAggregate = mode === 'count' ? 1 : sampleValue;
    if (mode === 'max') {
      if (valueForAggregate > values[faceIdx]!) values[faceIdx] = valueForAggregate;
    } else if (mode === 'min') {
      if (valueForAggregate < values[faceIdx]!) values[faceIdx] = valueForAggregate;
    } else if (needsSamples) {
      perCellSamples[faceIdx]!.push(sampleValue);
    } else {
      values[faceIdx] = values[faceIdx]! + valueForAggregate;
    }
    counts[faceIdx] = counts[faceIdx]! + 1;
    binned++;
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < faceCount; i++) {
    const c = counts[i]!;
    if (c === 0) {
      values[i] = Number.NaN;
      continue;
    }
    if (mode === 'mean') {
      values[i] = values[i]! / c;
    } else if (mode === 'median' || mode === 'p90') {
      const arr = perCellSamples[i]!;
      arr.sort((a, b) => a - b);
      values[i] = mode === 'median' ? median(arr) : nearestRankPercentile(arr, 0.9);
    }
    // 'sum', 'count', 'max', 'min' are already in their final form.
    const v = values[i]!;
    if (Number.isFinite(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = 0;
  if (min === Infinity || max === -Infinity) {
    min = 0;
    max = 0;
  }

  return { values, sampleCounts: counts, extent: [min, max], samplesBinned: binned };
};

const isValidPosition = (position: readonly [number, number]): boolean => {
  const [lat, lng] = position;
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90;
};

const median = (sorted: ReadonlyArray<number>): number => {
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
};

const nearestRankPercentile = (sorted: ReadonlyArray<number>, p: number): number => {
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  const rank = Math.ceil(Math.max(0, Math.min(1, p)) * n);
  return sorted[Math.max(0, Math.min(n - 1, rank - 1))]!;
};
