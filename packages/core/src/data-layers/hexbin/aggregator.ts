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

export type HexBinAggregateMode = 'sum' | 'count' | 'mean' | 'max';

export interface AggregatedBins {
  /** Per-face aggregated value. NaN means "no samples" (cell is empty). */
  readonly values: Float32Array;
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
  // Sum mode initialises to 0 (so empty later flips to NaN).
  // Max mode needs -Infinity so `Math.max` works.
  if (mode === 'max') {
    values.fill(-Infinity);
  } else {
    values.fill(0);
  }
  const counts = new Uint32Array(faceCount);

  let binned = 0;
  // `latLngToVector3` accepts a `target` so we reuse one Vector3 across
  // every sample (zero per-sample allocation).
  const targetVec = latLngToVector3([0, 0]);
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]!;
    const v = latLngToVector3(sample.position, 1, targetVec);
    const faceIdx = nearestFace(faceCentroids, v.x, v.y, v.z);
    const sampleValue = sample.value ?? 1;
    const valueForAggregate = mode === 'count' ? 1 : sampleValue;
    if (mode === 'max') {
      if (valueForAggregate > values[faceIdx]!) values[faceIdx] = valueForAggregate;
    } else {
      values[faceIdx] = values[faceIdx]! + valueForAggregate;
    }
    counts[faceIdx] = counts[faceIdx]! + 1;
    binned++;
  }

  // Finalise per-mode.
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
    }
    // 'sum', 'count', 'max' are already in their final form.
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

  return { values, extent: [min, max], samplesBinned: binned };
};
