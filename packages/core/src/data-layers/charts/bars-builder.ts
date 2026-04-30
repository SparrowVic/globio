import {
  BoxGeometry,
  Group,
  type LineSegments,
  Mesh,
  MeshBasicMaterial,
  type Material,
} from 'three';
import { colorForValue } from '../../data/scales';
import type { ChartSeries, ChartsDataEntry, ChartsDataLayer } from '../types';
import { attachBorder, disposeBorder, resolveBorder } from './borders';

/**
 * Per-chart bar mesh handle — kept by the orchestrator so `tick(t)` can
 * scale individual bars on the Y axis (rise from base, like `BarsLayer`)
 * and toggle material opacity for the fade portion of the animation.
 *
 * `targetHeight` is in world units already (size×layer.height pre-baked
 * here so the tick loop is just `mesh.scale.y = targetHeight × t`).
 */
export interface BarHandle {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly geometry: BoxGeometry;
  readonly targetHeight: number;
  readonly seriesKey: string;
  readonly seriesIndex: number;
  readonly value: number;
  /** Optional outline LineSegments parented to the mesh. */
  readonly border?: LineSegments;
}

/**
 * Build a grouped bar chart: N parallel bars on the X axis, each rises
 * from the local Y=0 plane. Returns the parent Group plus per-bar handles
 * for the animator. Bars sit in local frame (`+Y` = outward normal); the
 * chart's anchor positions / orients the Group.
 *
 * Layout: total chart width = `size`, divided into N bars with a 15% gap
 * between each. Negative values clamp to 0 so the bar collapses, matching
 * `ChartsDataLayer`'s "non-negative semantics" docstring.
 * Height scale can be supplied by the layer orchestrator; when omitted,
 * the chart falls back to its local peak for standalone builder use/tests.
 *
 * Color resolution per bar (in priority order):
 *   1. `series.color` — explicit per-series colour
 *   2. `entry.values[series.key]` mapped through `layer.scale` if present
 *   3. fallback colour
 */
export const buildGroupedBarsChart = (
  entry: ChartsDataEntry,
  series: ReadonlyArray<ChartSeries>,
  layer: ChartsDataLayer,
  fallbackColor: string,
  globalPeak = 0
): { readonly group: Group; readonly bars: ReadonlyArray<BarHandle> } => {
  const size = layer.size ?? 0.05;
  const maxHeight = layer.height ?? 0.08;
  const opacity = layer.opacity ?? 1;
  const seriesCount = Math.max(1, series.length);
  const gap = 0.15;
  const slotWidth = size / seriesCount;
  const barWidth = slotWidth * (1 - gap);
  const depth = barWidth;

  const totalWidth = slotWidth * seriesCount;
  const left = -totalWidth / 2 + slotWidth / 2;

  const peak = globalPeak > 0 ? globalPeak : computePeakValue(entry, series);
  const safePeak = peak > 0 ? peak : 1;
  const border = resolveBorder(layer);

  const group = new Group();
  group.name = 'ChartsBarsGrouped';
  const bars: Array<BarHandle> = [];

  for (let i = 0; i < seriesCount; i++) {
    const s = series[i]!;
    const raw = entry.values[s.key];
    const value = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
    const targetHeight = (value / safePeak) * maxHeight;
    const color = pickSeriesColor(s, value, peak, layer, fallbackColor);

    const geometry = new BoxGeometry(barWidth, 1, depth);
    geometry.translate(0, 0.5, 0); // base sits at local origin
    const material = new MeshBasicMaterial({ color, transparent: true, opacity });
    const mesh = new Mesh(geometry, material);
    mesh.position.x = left + i * slotWidth;
    mesh.scale.y = targetHeight; // animator overrides this each frame
    group.add(mesh);
    const handleBorder = border ? attachBorder(mesh, border) : undefined;
    bars.push({
      mesh,
      material,
      geometry,
      targetHeight,
      seriesKey: s.key,
      seriesIndex: i,
      value,
      ...(handleBorder ? { border: handleBorder } : {}),
    });
  }
  return { group, bars };
};

/**
 * Stacked bar chart — single column, one segment per series stacked along
 * the local Y axis. Each segment's height is proportional to its value
 * relative to the chart's max-of-totals (so all charts in a layer share a
 * comparable Y scale). Bars rise as a stack: at `t=0.5` the bottom half
 * of the stack is visible, segments above haven't entered yet.
 *
 * The animator scales the parent group's Y by `t` AND clips opacity per
 * segment based on whether `t × totalHeight` has reached that segment's
 * top — the visual reads as "stack growing upward through segments" rather
 * than "stack uniformly stretching". v1: simpler — uniform Y scale on the
 * group; we can add per-segment reveal later if useful.
 */
export const buildStackedBarsChart = (
  entry: ChartsDataEntry,
  series: ReadonlyArray<ChartSeries>,
  layer: ChartsDataLayer,
  fallbackColor: string,
  globalPeak: number
): { readonly group: Group; readonly bars: ReadonlyArray<BarHandle> } => {
  const size = layer.size ?? 0.05;
  const maxHeight = layer.height ?? 0.08;
  const opacity = layer.opacity ?? 1;
  const barWidth = size;
  const depth = barWidth;

  const totalValue = sumValues(entry, series);
  const safePeak = globalPeak > 0 ? globalPeak : 1;
  const stackHeight = (totalValue / safePeak) * maxHeight;
  const border = resolveBorder(layer);

  const group = new Group();
  group.name = 'ChartsBarsStacked';
  const bars: Array<BarHandle> = [];

  if (totalValue <= 0) return { group, bars };

  let cursor = 0;
  for (let i = 0; i < series.length; i++) {
    const s = series[i]!;
    const raw = entry.values[s.key];
    const value = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
    if (value <= 0) continue;
    const segHeight = (value / totalValue) * stackHeight;
    const color = pickSeriesColor(s, value, totalValue, layer, fallbackColor);
    const geometry = new BoxGeometry(barWidth, 1, depth);
    geometry.translate(0, 0.5, 0);
    const material = new MeshBasicMaterial({ color, transparent: true, opacity });
    const mesh = new Mesh(geometry, material);
    mesh.position.y = cursor;
    mesh.scale.y = segHeight;
    group.add(mesh);
    const handleBorder = border ? attachBorder(mesh, border) : undefined;
    bars.push({
      mesh,
      material,
      geometry,
      targetHeight: segHeight,
      seriesKey: s.key,
      seriesIndex: i,
      value,
      ...(handleBorder ? { border: handleBorder } : {}),
    });
    cursor += segHeight;
  }
  return { group, bars };
};

/**
 * Radial bars: N bars around a circle, each rising on the local Y axis.
 * Bar `i` is rotated `i × 2π/N` around the Y axis and pushed out by
 * `size/2` along the rotated radius. Heights are value-mapped against
 * the layer-wide max by default, so magnitudes remain comparable across
 * anchors. Best for "categorical-ordered" series like months.
 */
export const buildRadialBarsChart = (
  entry: ChartsDataEntry,
  series: ReadonlyArray<ChartSeries>,
  layer: ChartsDataLayer,
  fallbackColor: string,
  globalPeak = 0
): { readonly group: Group; readonly bars: ReadonlyArray<BarHandle> } => {
  const size = layer.size ?? 0.05;
  const maxHeight = layer.height ?? 0.08;
  const opacity = layer.opacity ?? 1;
  const seriesCount = Math.max(1, series.length);
  const radius = size / 2;
  const barWidth = (size * Math.PI) / (seriesCount * 2.4);
  const depth = barWidth;

  const peak = globalPeak > 0 ? globalPeak : computePeakValue(entry, series);
  const safePeak = peak > 0 ? peak : 1;
  const border = resolveBorder(layer);

  const group = new Group();
  group.name = 'ChartsBarsRadial';
  const bars: Array<BarHandle> = [];

  for (let i = 0; i < seriesCount; i++) {
    const s = series[i]!;
    const raw = entry.values[s.key];
    const value = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
    const targetHeight = (value / safePeak) * maxHeight;
    const color = pickSeriesColor(s, value, peak, layer, fallbackColor);

    const geometry = new BoxGeometry(barWidth, 1, depth);
    geometry.translate(0, 0.5, 0);
    const material = new MeshBasicMaterial({ color, transparent: true, opacity });
    const mesh = new Mesh(geometry, material);
    const angle = (i / seriesCount) * Math.PI * 2;
    mesh.position.x = Math.cos(angle) * radius;
    mesh.position.z = Math.sin(angle) * radius;
    mesh.rotation.y = -angle;
    mesh.scale.y = targetHeight;
    group.add(mesh);
    const handleBorder = border ? attachBorder(mesh, border) : undefined;
    bars.push({
      mesh,
      material,
      geometry,
      targetHeight,
      seriesKey: s.key,
      seriesIndex: i,
      value,
      ...(handleBorder ? { border: handleBorder } : {}),
    });
  }
  return { group, bars };
};

const sumValues = (entry: ChartsDataEntry, series: ReadonlyArray<ChartSeries>): number => {
  let sum = 0;
  for (const s of series) {
    const raw = entry.values[s.key];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) sum += raw;
  }
  return sum;
};

const computePeakValue = (entry: ChartsDataEntry, series: ReadonlyArray<ChartSeries>): number => {
  let peak = 0;
  for (const s of series) {
    const raw = entry.values[s.key];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > peak) peak = raw;
  }
  return peak;
};

const pickSeriesColor = (
  series: ChartSeries,
  value: number,
  extentMax: number,
  layer: ChartsDataLayer,
  fallbackColor: string
): string => {
  if (series.color) return series.color;
  if (layer.scale) {
    const c = colorForValue(layer.scale, value, [0, Math.max(extentMax, 1)]);
    if (c) return c;
  }
  return fallbackColor;
};

/**
 * Walk the layer's data once to find the peak total — used by the stacked
 * builder so every chart's stack height is comparable across the layer.
 * Iterating data twice is cheap (10²–10³ entries × ≤10 series).
 */
export const computeStackedGlobalPeak = (
  data: ReadonlyArray<ChartsDataEntry>,
  series: ReadonlyArray<ChartSeries>
): number => {
  let peak = 0;
  for (const entry of data) {
    const sum = sumValues(entry, series);
    if (sum > peak) peak = sum;
  }
  return peak;
};

/**
 * Largest individual series value across the whole layer. Grouped/radial
 * bars use this as their default height domain so two countries with
 * values 10 and 100 do not both render a full-height local maximum.
 */
export const computeGlobalValuePeak = (
  data: ReadonlyArray<ChartsDataEntry>,
  series: ReadonlyArray<ChartSeries>
): number => {
  let peak = 0;
  for (const entry of data) {
    const v = computePeakValue(entry, series);
    if (v > peak) peak = v;
  }
  return peak;
};

/**
 * Dispose handles for a built chart — geometry + material are owned by
 * the chart, the orchestrator's dispose path calls this for each.
 */
export const disposeBars = (bars: ReadonlyArray<BarHandle>): void => {
  for (const bar of bars) {
    disposeBorder(bar.border);
    bar.geometry.dispose();
    (bar.material as Material).dispose();
  }
};
