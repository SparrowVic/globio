import type { HeatmapAnimationOrder } from '../types';
import type { LatLng } from '../../types';

/**
 * Compute the per-face animation start time (seconds) given the chosen
 * stagger order. Returns `delay + rank × stagger` per face, where `rank`
 * is determined by `order`:
 *
 *   - sequential   — face index (cheapest, deterministic)
 *   - radial       — angular distance from `origin` lat/lng
 *   - value        — descending by `values[face]`; NaN cells last
 *   - reverse-value — ascending by `values[face]`; NaN cells last
 *   - random       — Fisher-Yates shuffled index, seeded by face count
 *                    so it's deterministic across re-bakes of the same data
 *
 * Values that are NaN (empty cells) get pushed to the end of any
 * value-based sort so they bloom together at the end (or never, if the
 * caller clamps them).
 */
export const buildFaceStartTimes = (
  faceCount: number,
  values: Float32Array,
  faceLatLng: Float32Array,
  delay: number,
  stagger: number,
  order: HeatmapAnimationOrder,
  origin: LatLng,
  out: Float32Array
): void => {
  if (out.length !== faceCount) {
    throw new Error(`buildFaceStartTimes: out buffer mismatch (${out.length} vs ${faceCount})`);
  }
  if (stagger <= 0 || order === 'sequential') {
    for (let f = 0; f < faceCount; f++) out[f] = delay + f * stagger;
    return;
  }

  const rank = new Float32Array(faceCount);
  if (order === 'radial') {
    fillRadialRank(faceCount, faceLatLng, origin, rank);
  } else if (order === 'random') {
    fillRandomRank(faceCount, rank);
  } else {
    fillValueRank(faceCount, values, order === 'value' ? 'desc' : 'asc', rank);
  }
  for (let f = 0; f < faceCount; f++) {
    out[f] = delay + rank[f]! * stagger;
  }
};

const fillRadialRank = (
  faceCount: number,
  faceLatLng: Float32Array,
  origin: LatLng,
  out: Float32Array
): void => {
  // Angular distance via dot product of unit vectors. Since face count
  // tops out at 20480 the O(N log N) sort is fine.
  const distances = new Float32Array(faceCount);
  const oLat = (origin[0] * Math.PI) / 180;
  const oLng = (origin[1] * Math.PI) / 180;
  const ox = Math.cos(oLat) * Math.cos(oLng);
  const oy = Math.sin(oLat);
  const oz = Math.cos(oLat) * Math.sin(oLng);
  for (let f = 0; f < faceCount; f++) {
    const fLat = (faceLatLng[f * 2]! * Math.PI) / 180;
    const fLng = (faceLatLng[f * 2 + 1]! * Math.PI) / 180;
    const fx = Math.cos(fLat) * Math.cos(fLng);
    const fy = Math.sin(fLat);
    const fz = Math.cos(fLat) * Math.sin(fLng);
    const dot = Math.max(-1, Math.min(1, ox * fx + oy * fy + oz * fz));
    distances[f] = Math.acos(dot);
  }
  rankByValue(distances, 'asc', out);
};

const fillValueRank = (
  faceCount: number,
  values: Float32Array,
  direction: 'asc' | 'desc',
  out: Float32Array
): void => {
  const finite = new Float32Array(faceCount);
  for (let f = 0; f < faceCount; f++) {
    const v = values[f]!;
    finite[f] = Number.isFinite(v) ? v : direction === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  rankByValue(finite, direction, out);
};

const fillRandomRank = (faceCount: number, out: Float32Array): void => {
  // Seed = faceCount so the same resolution always produces the same
  // shuffle order — the bloom looks identical between re-renders.
  const ranks = new Array<number>(faceCount);
  for (let i = 0; i < faceCount; i++) ranks[i] = i;
  let seed = (faceCount * 9301 + 49297) >>> 0;
  const rng = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489917);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
  for (let i = faceCount - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = ranks[i]!;
    ranks[i] = ranks[j]!;
    ranks[j] = tmp;
  }
  for (let i = 0; i < faceCount; i++) out[i] = ranks[i]!;
};

/**
 * Rank values 0..N-1 such that the smallest (asc) / largest (desc) gets
 * rank 0. Stable enough for our staggered animations where ties are rare.
 */
const rankByValue = (values: Float32Array, direction: 'asc' | 'desc', out: Float32Array): void => {
  const indices = new Array<number>(values.length);
  for (let i = 0; i < values.length; i++) indices[i] = i;
  if (direction === 'asc') {
    indices.sort((a, b) => values[a]! - values[b]!);
  } else {
    indices.sort((a, b) => values[b]! - values[a]!);
  }
  for (let r = 0; r < indices.length; r++) {
    out[indices[r]!] = r;
  }
};
