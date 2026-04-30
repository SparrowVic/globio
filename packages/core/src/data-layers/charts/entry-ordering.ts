import type { HeatmapAnimationOrder } from '../types';
import type { LatLng } from '../../types';
import type { ChartAnchor } from './anchors';
import type { ChartsDataEntry, ChartSeries } from '../types';

/**
 * Compute per-entry stagger ranks. Mirrors the hex-bin `face-ordering`
 * helper but operates on `ChartsDataEntry`s (one rank per entry, not
 * per cell). The output is a number array same length as the input —
 * `ranks[i]` is the rank that should multiply the layer's `stagger` to
 * produce entry `i`'s start time.
 *
 * Orders:
 *   - sequential   — rank = index (cheap, deterministic)
 *   - radial       — angular distance from `origin` lat/lng. Entries
 *                    nearest the anchor get the smallest ranks.
 *   - value        — descending by sum of entry's series values.
 *                    Top-value entries bloom first.
 *   - reverse-value — ascending by sum (smallest first).
 *   - random       — Fisher-Yates shuffled, seeded by entry count so
 *                    the same dataset always shuffles the same way.
 */
export const computeEntryStartRanks = (
  anchors: ReadonlyArray<{ readonly entry: ChartsDataEntry; readonly anchor: ChartAnchor }>,
  series: ReadonlyArray<ChartSeries>,
  order: HeatmapAnimationOrder,
  origin: LatLng
): number[] => {
  const N = anchors.length;
  if (order === 'sequential' || N <= 1) {
    return Array.from({ length: N }, (_, i) => i);
  }
  if (order === 'random') return fisherYatesRanks(N);

  // Build sortable keys per entry.
  const keys = new Float64Array(N);
  if (order === 'radial') {
    const oLat = (origin[0] * Math.PI) / 180;
    const oLng = (origin[1] * Math.PI) / 180;
    const ox = Math.cos(oLat) * Math.cos(oLng);
    const oy = Math.sin(oLat);
    const oz = Math.cos(oLat) * Math.sin(oLng);
    for (let i = 0; i < N; i++) {
      const lat = (anchors[i]!.anchor.position[0] * Math.PI) / 180;
      const lng = (anchors[i]!.anchor.position[1] * Math.PI) / 180;
      const x = Math.cos(lat) * Math.cos(lng);
      const y = Math.sin(lat);
      const z = Math.cos(lat) * Math.sin(lng);
      const dot = Math.max(-1, Math.min(1, ox * x + oy * y + oz * z));
      keys[i] = Math.acos(dot);
    }
    return rankAscending(keys);
  }

  // value-based: total positive value across the entry's series.
  for (let i = 0; i < N; i++) {
    let sum = 0;
    const values = anchors[i]!.entry.values;
    for (const s of series) {
      const v = values[s.key];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) sum += v;
    }
    keys[i] = sum;
  }
  return order === 'value' ? rankDescending(keys) : rankAscending(keys);
};

const fisherYatesRanks = (n: number): number[] => {
  const ranks = Array.from({ length: n }, (_, i) => i);
  // Seed by length so the shuffle is deterministic per dataset size.
  let seed = (n * 9301 + 49297) >>> 0;
  const rng = (): number => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489917);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = ranks[i]!;
    ranks[i] = ranks[j]!;
    ranks[j] = tmp;
  }
  return ranks;
};

const rankAscending = (keys: Float64Array): number[] => rankBy(keys, (a, b) => a - b);
const rankDescending = (keys: Float64Array): number[] => rankBy(keys, (a, b) => b - a);

const rankBy = (
  keys: Float64Array,
  cmp: (a: number, b: number) => number
): number[] => {
  const indices = Array.from({ length: keys.length }, (_, i) => i);
  indices.sort((a, b) => cmp(keys[a]!, keys[b]!));
  const out = new Array<number>(keys.length);
  for (let r = 0; r < indices.length; r++) out[indices[r]!] = r;
  return out;
};
