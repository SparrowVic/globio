import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Material,
} from 'three';
import { colorForValue } from '../../data/scales';
import type { ChartSeries, ChartsDataEntry, ChartsDataLayer } from '../types';

/**
 * Pie / donut renderer — one segment per series, area proportional to the
 * series value. Both modes share an annulus-shaped triangulation routine;
 * the donut's inner radius is `outerRadius × innerRadiusFraction`.
 *
 * Geometry lies in the local XZ plane (so the chart is "flat" against the
 * globe surface after the anchor's quaternion rotates the parent group).
 * Optional `faceCamera` mode is implemented by the orchestrator (re-orients
 * the parent group toward the camera each frame); the geometry itself
 * doesn't care about camera direction.
 *
 * Per-segment animation: the orchestrator scales the parent group XYZ by
 * `t` (chart pops in from a point). Stagger lives at the chart-anchor
 * level rather than per-segment for v1 — adding per-segment reveal would
 * mean rebuilding geometry each frame which we want to avoid.
 */
export interface PieSegmentHandle {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly geometry: BufferGeometry;
}

const ARC_STEPS_PER_RADIAN = 24; // ≈ 1 vertex per 2.4° — smooth enough for a 50px chart at zoom-out.
const MIN_ARC_STEPS = 6;
const MIN_INNER_RATIO = 0;
const MAX_INNER_RATIO = 0.95;

export const buildPieChart = (
  entry: ChartsDataEntry,
  series: ReadonlyArray<ChartSeries>,
  layer: ChartsDataLayer,
  fallbackColor: string
): { readonly group: Group; readonly segments: ReadonlyArray<PieSegmentHandle> } => {
  return buildAnnulus(entry, series, layer, fallbackColor, 0);
};

export const buildDonutChart = (
  entry: ChartsDataEntry,
  series: ReadonlyArray<ChartSeries>,
  layer: ChartsDataLayer,
  fallbackColor: string
): { readonly group: Group; readonly segments: ReadonlyArray<PieSegmentHandle> } => {
  const ratio = clamp(layer.innerRadius ?? 0.45, MIN_INNER_RATIO, MAX_INNER_RATIO);
  return buildAnnulus(entry, series, layer, fallbackColor, ratio);
};

/**
 * Triangulate one ring segment as a flat fan (pie) or quad strip (donut).
 * The segment's geometry has its own `BufferGeometry` so a single
 * `MeshBasicMaterial` per segment can carry the segment's colour /
 * opacity without per-vertex colour buffers.
 */
const buildAnnulus = (
  entry: ChartsDataEntry,
  series: ReadonlyArray<ChartSeries>,
  layer: ChartsDataLayer,
  fallbackColor: string,
  innerRatio: number
): { readonly group: Group; readonly segments: ReadonlyArray<PieSegmentHandle> } => {
  const size = layer.size ?? 0.05;
  const opacity = layer.opacity ?? 1;
  const padAngle = Math.max(0, layer.padAngle ?? 0);
  const rotation = layer.rotation ?? 0;
  const outerR = size / 2;
  const innerR = outerR * innerRatio;

  const total = sumPositive(entry, series);
  const group = new Group();
  group.name = innerRatio > 0 ? 'ChartsDonut' : 'ChartsPie';
  const segments: Array<PieSegmentHandle> = [];

  if (total <= 0) return { group, segments };

  // Sum of pad angles can't exceed the full circle. Cap so we never
  // produce negative segment angles when caller picks a silly padAngle.
  const totalPad = Math.min(padAngle * series.length, Math.PI * 1.9);
  const usableSweep = Math.PI * 2 - totalPad;
  const padPerGap = totalPad / series.length;

  let cursor = rotation;
  for (const s of series) {
    const raw = entry.values[s.key];
    const value = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
    if (value <= 0) {
      cursor += padPerGap;
      continue;
    }
    const sweep = (value / total) * usableSweep;
    const startAngle = cursor;
    const endAngle = cursor + sweep;
    cursor = endAngle + padPerGap;

    const geometry = innerRatio > 0
      ? buildDonutSegmentGeometry(innerR, outerR, startAngle, endAngle)
      : buildPieSegmentGeometry(outerR, startAngle, endAngle);
    const color = pickSeriesColor(s, value, total, layer, fallbackColor);
    const material = new MeshBasicMaterial({ color, transparent: true, opacity, side: DoubleSide });
    const mesh = new Mesh(geometry, material);
    group.add(mesh);
    segments.push({ mesh, material, geometry });
  }
  return { group, segments };
};

/**
 * Triangle fan from origin to an arc — first vertex is centre, then
 * `steps + 1` arc vertices. Triangle list `[0, i, i+1]` for every step.
 */
const buildPieSegmentGeometry = (
  outerR: number,
  startAngle: number,
  endAngle: number
): BufferGeometry => {
  const sweep = endAngle - startAngle;
  const steps = Math.max(MIN_ARC_STEPS, Math.ceil(sweep * ARC_STEPS_PER_RADIAN));
  const positions = new Float32Array((steps + 2) * 3);
  // Centre vertex.
  positions[0] = 0;
  positions[1] = 0;
  positions[2] = 0;
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (i / steps) * sweep;
    const idx = (i + 1) * 3;
    positions[idx] = Math.cos(a) * outerR;
    positions[idx + 1] = 0;
    positions[idx + 2] = Math.sin(a) * outerR;
  }
  const indices = new Uint16Array(steps * 3);
  for (let i = 0; i < steps; i++) {
    indices[i * 3] = 0;
    indices[i * 3 + 1] = i + 1;
    indices[i * 3 + 2] = i + 2;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(Array.from(indices));
  geometry.computeVertexNormals();
  return geometry;
};

/**
 * Quad strip between inner / outer arcs — `steps + 1` inner verts and
 * `steps + 1` outer verts; each step emits two triangles for the quad.
 */
const buildDonutSegmentGeometry = (
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): BufferGeometry => {
  const sweep = endAngle - startAngle;
  const steps = Math.max(MIN_ARC_STEPS, Math.ceil(sweep * ARC_STEPS_PER_RADIAN));
  const positions = new Float32Array((steps + 1) * 2 * 3);
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (i / steps) * sweep;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const innerIdx = i * 6;
    positions[innerIdx] = cos * innerR;
    positions[innerIdx + 1] = 0;
    positions[innerIdx + 2] = sin * innerR;
    positions[innerIdx + 3] = cos * outerR;
    positions[innerIdx + 4] = 0;
    positions[innerIdx + 5] = sin * outerR;
  }
  const indices = new Uint16Array(steps * 6);
  for (let i = 0; i < steps; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices[i * 6] = a;
    indices[i * 6 + 1] = c;
    indices[i * 6 + 2] = b;
    indices[i * 6 + 3] = b;
    indices[i * 6 + 4] = c;
    indices[i * 6 + 5] = d;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(Array.from(indices));
  geometry.computeVertexNormals();
  return geometry;
};

const sumPositive = (entry: ChartsDataEntry, series: ReadonlyArray<ChartSeries>): number => {
  let sum = 0;
  for (const s of series) {
    const raw = entry.values[s.key];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) sum += raw;
  }
  return sum;
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

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Free per-segment GPU resources. */
export const disposePieSegments = (segments: ReadonlyArray<PieSegmentHandle>): void => {
  for (const seg of segments) {
    seg.geometry.dispose();
    (seg.material as Material).dispose();
  }
}
