import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
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
  readonly seriesKey: string | null;
  readonly seriesIndex: number;
  readonly value: number;
  /** Optional outline LineSegments parented to the mesh. */
  readonly border?: LineSegments;
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

  const values = positiveSeriesValues(entry, series);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const border = resolveBorder(layer);
  const group = new Group();
  group.name = innerRatio > 0 ? 'ChartsDonut' : 'ChartsPie';
  const segments: Array<PieSegmentHandle> = [];

  if (total <= 0) return { group, segments };

  // Sum of pad angles can't exceed the full circle. Cap so we never
  // produce negative segment angles when caller picks a silly padAngle.
  const totalPad = Math.min(padAngle * values.length, Math.PI * 1.9);
  const usableSweep = Math.PI * 2 - totalPad;
  const padPerGap = totalPad / values.length;

  let cursor = rotation;
  for (const { series: s, seriesIndex, value } of values) {
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
    const handleBorder = border ? attachBorder(mesh, border) : undefined;
    segments.push({
      mesh,
      material,
      geometry,
      seriesKey: s.key,
      seriesIndex,
      value,
      ...(handleBorder ? { border: handleBorder } : {}),
    });
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

const positiveSeriesValues = (
  entry: ChartsDataEntry,
  series: ReadonlyArray<ChartSeries>
): Array<{ readonly series: ChartSeries; readonly seriesIndex: number; readonly value: number }> => {
  const out: Array<{ series: ChartSeries; seriesIndex: number; value: number }> = [];
  for (let i = 0; i < series.length; i++) {
    const s = series[i]!;
    const raw = entry.values[s.key];
    const value = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
    if (value > 0) out.push({ series: s, seriesIndex: i, value });
  }
  return out;
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

/**
 * Gauge chart — semi-circle (180°) progress arc. Reads `series[0]` from
 * the entry and normalises against `layer.gaugeMax` (default 100) into a
 * fill ratio. Two donut segments are emitted:
 *  - segment 0: background arc (full 180°, neutral colour)
 *  - segment 1: foreground arc (180° × ratio, series colour)
 * Animator can drive each segment's `t` independently — by default the
 * background pops in instantly and the foreground sweeps from 0% over the
 * `animation.duration`.
 */
export const buildGaugeChart = (
  entry: ChartsDataEntry,
  series: ReadonlyArray<ChartSeries>,
  layer: ChartsDataLayer,
  fallbackColor: string
): { readonly group: Group; readonly segments: ReadonlyArray<PieSegmentHandle> } => {
  const size = layer.size ?? 0.05;
  const opacity = layer.opacity ?? 1;
  const innerRatio = clamp(layer.innerRadius ?? 0.6, MIN_INNER_RATIO, MAX_INNER_RATIO);
  const max = Math.max(1e-6, layer.gaugeMax ?? 100);
  const outerR = size / 2;
  const innerR = outerR * innerRatio;
  const bgColor = layer.gaugeBackgroundColor ?? 'rgba(255,255,255,0.15)';

  const border = resolveBorder(layer);
  const group = new Group();
  group.name = 'ChartsGauge';
  const segments: Array<PieSegmentHandle> = [];
  if (series.length === 0) return { group, segments };

  const s = series[0]!;
  const raw = entry.values[s.key];
  const value = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
  const ratio = Math.min(1, value / max);

  // Gauge sits across the upper hemisphere — start at π (left), sweep to 2π (right).
  const start = Math.PI;
  const fullSweep = Math.PI;

  // Background arc (drawn first so it's behind the fill on overlap).
  const bgGeometry = buildDonutSegmentGeometry(innerR, outerR, start, start + fullSweep);
  const bgMaterial = new MeshBasicMaterial({
    color: parseRGBA(bgColor),
    transparent: true,
    opacity: parseAlphaFromBackground(bgColor) * opacity,
    side: DoubleSide,
  });
  const bgMesh = new Mesh(bgGeometry, bgMaterial);
  bgMesh.position.y = -1e-6;
  group.add(bgMesh);
  // Background arc never gets a border — it's the "track", not the value.
  segments.push({
    mesh: bgMesh,
    material: bgMaterial,
    geometry: bgGeometry,
    seriesKey: s.key,
    seriesIndex: 0,
    value,
  });

  if (ratio > 0) {
    const fillSweep = fullSweep * ratio;
    const fillGeometry = buildDonutSegmentGeometry(innerR, outerR, start, start + fillSweep);
    const color = pickSeriesColor(s, value, max, layer, fallbackColor);
    const fillMaterial = new MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: DoubleSide,
    });
    const fillMesh = new Mesh(fillGeometry, fillMaterial);
    fillMesh.position.y = 1e-6;
    fillMesh.renderOrder = 1; // ensure on top of background
    group.add(fillMesh);
    const fillBorder = border ? attachBorder(fillMesh, border) : undefined;
    segments.push({
      mesh: fillMesh,
      material: fillMaterial,
      geometry: fillGeometry,
      seriesKey: s.key,
      seriesIndex: 0,
      value,
      ...(fillBorder ? { border: fillBorder } : {}),
    });
  }

  return { group, segments };
};

/**
 * Sunburst chart — two concentric rings. Outer ring = series segments
 * (same proportion math as pie/donut). Inner ring = a single full circle
 * coloured by the sum total mapped through `layer.scale`, providing a
 * cross-entry total readout that the outer ring can't show.
 *
 * v1: two-level, fixed split at half radius. Future: arbitrary nesting
 * via `series[i].parent` would unlock real hierarchical sunbursts.
 */
export const buildSunburstChart = (
  entry: ChartsDataEntry,
  series: ReadonlyArray<ChartSeries>,
  layer: ChartsDataLayer,
  fallbackColor: string
): { readonly group: Group; readonly segments: ReadonlyArray<PieSegmentHandle> } => {
  const size = layer.size ?? 0.05;
  const opacity = layer.opacity ?? 1;
  const padAngle = Math.max(0, layer.padAngle ?? 0);
  const rotation = layer.rotation ?? 0;
  const outerR = size / 2;
  // Outer ring spans 50%..100% of radius; inner ring 0..50% (filled disc).
  const outerInnerR = outerR * 0.55;
  const innerR = outerR * 0.5;

  const values = positiveSeriesValues(entry, series);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const border = resolveBorder(layer);
  const group = new Group();
  group.name = 'ChartsSunburst';
  const segments: Array<PieSegmentHandle> = [];
  if (total <= 0) return { group, segments };

  // Inner core — full disc, coloured by the sum mapped through `scale`.
  // Falls back to the first series' colour when no scale is present.
  const coreColor =
    layer.scale && (layer.scale.type === 'sequential' || layer.scale.type === 'diverging')
      ? colorForValue(layer.scale, total, [0, Math.max(total, 1)]) ?? fallbackColor
      : series[0]?.color ?? fallbackColor;
  const coreGeometry = buildPieSegmentGeometry(innerR, 0, Math.PI * 2);
  const coreMaterial = new MeshBasicMaterial({
    color: coreColor,
    transparent: true,
    opacity,
    side: DoubleSide,
  });
  const coreMesh = new Mesh(coreGeometry, coreMaterial);
  group.add(coreMesh);
  const coreBorder = border ? attachBorder(coreMesh, border) : undefined;
  segments.push({
    mesh: coreMesh,
    material: coreMaterial,
    geometry: coreGeometry,
    seriesKey: null,
    seriesIndex: -1,
    value: total,
    ...(coreBorder ? { border: coreBorder } : {}),
  });

  // Outer ring — series segments at outerInnerR..outerR.
  const totalPad = Math.min(padAngle * values.length, Math.PI * 1.9);
  const usableSweep = Math.PI * 2 - totalPad;
  const padPerGap = totalPad / Math.max(1, values.length);
  let cursor = rotation;
  for (const { series: s, seriesIndex, value } of values) {
    const sweep = (value / total) * usableSweep;
    const startAngle = cursor;
    const endAngle = cursor + sweep;
    cursor = endAngle + padPerGap;
    const geometry = buildDonutSegmentGeometry(outerInnerR, outerR, startAngle, endAngle);
    const color = pickSeriesColor(s, value, total, layer, fallbackColor);
    const material = new MeshBasicMaterial({ color, transparent: true, opacity, side: DoubleSide });
    const mesh = new Mesh(geometry, material);
    group.add(mesh);
    const segBorder = border ? attachBorder(mesh, border) : undefined;
    segments.push({
      mesh,
      material,
      geometry,
      seriesKey: s.key,
      seriesIndex,
      value,
      ...(segBorder ? { border: segBorder } : {}),
    });
  }
  return { group, segments };
};

/**
 * Best-effort `rgba(...)`/`#hex`/named-colour parser into the hex form
 * that MeshBasicMaterial wants. Returns the raw input when not an rgba()
 * — Three.js's color parser handles all the other cases natively.
 */
const parseRGBA = (input: string): string => {
  const m = input.match(/rgba?\(([^)]+)\)/i);
  if (!m) return input;
  const parts = m[1]!.split(',').map((p) => parseFloat(p.trim()));
  const r = Math.round(parts[0] ?? 0);
  const g = Math.round(parts[1] ?? 0);
  const b = Math.round(parts[2] ?? 0);
  return `rgb(${r}, ${g}, ${b})`;
};

const parseAlphaFromBackground = (input: string): number => {
  const m = input.match(/rgba?\(([^)]+)\)/i);
  if (!m) return 1;
  const parts = m[1]!.split(',').map((p) => parseFloat(p.trim()));
  return parts[3] ?? 1;
};

/** Free per-segment GPU resources. */
export const disposePieSegments = (segments: ReadonlyArray<PieSegmentHandle>): void => {
  for (const seg of segments) {
    disposeBorder(seg.border);
    seg.geometry.dispose();
    (seg.material as Material).dispose();
  }
}
