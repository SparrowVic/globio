import {
  BufferAttribute,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Mesh,
  Vector3,
  type Material,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { colorForValue, type ScaleConfig } from '../../data/scales';
import type { HeatmapDataEntry, HeatmapDataLayer } from '../types';

const DEFAULT_RADIUS_RAD = 0.06; // ~3.4°
const DEFAULT_MAX_HEIGHT = 0.25;
const DEFAULT_SUBDIVISIONS = 5;

export interface HeatmapLayerOptions {
  readonly layer: HeatmapDataLayer;
  /**
   * Material factory. The mesh is created with `vertexColors: true` so the
   * material itself just needs to be one of the vertex-color-aware variants
   * (`MeshBasicMaterial`, `MeshLambertMaterial`, …). Color comes per-vertex.
   */
  readonly buildMaterial: () => Material;
  /** Color used when no scale is configured. */
  readonly fallbackColor?: string;
}

/**
 * Volumetric heatmap. An icosphere is subdivided to yield a smooth set of
 * vertices wrapping the globe. For each vertex we compute a density value
 * by summing each sample's value weighted by `exp(-d²/r²)` where `d` is the
 * angular distance from sample to vertex and `r` is the layer's radius.
 * Density then drives:
 *   - `position += normal * (density / peakDensity) * maxHeight`
 *   - per-vertex color via `scale` (or fallback) on density / peak.
 *
 * Static once built — no per-frame work needed; setData rebuilds positions
 * and colors in place against the same geometry.
 */
export class HeatmapLayer {
  public readonly mesh: Mesh;
  private readonly geometry: IcosahedronGeometry;
  private readonly material: Material;
  private readonly basePositions: Float32Array;
  private readonly normals: Float32Array;
  private readonly maxHeight: number;
  private readonly radiusRad: number;
  private readonly fallbackColor: string;
  private scale: ScaleConfig | undefined;

  public constructor(options: HeatmapLayerOptions) {
    const subdivisions = options.layer.subdivisions ?? DEFAULT_SUBDIVISIONS;
    this.maxHeight = options.layer.maxHeight ?? DEFAULT_MAX_HEIGHT;
    this.radiusRad = options.layer.radius ?? DEFAULT_RADIUS_RAD;
    this.fallbackColor = options.fallbackColor ?? '#ffaa44';
    this.scale = options.layer.scale;

    this.geometry = new IcosahedronGeometry(GLOBE_RADIUS, subdivisions);
    const positionAttr = this.geometry.getAttribute('position') as BufferAttribute;
    const verts = positionAttr.array as Float32Array;
    this.basePositions = new Float32Array(verts);
    this.normals = computeNormals(this.basePositions);

    const colors = new Float32Array(verts.length);
    this.geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

    this.material = options.buildMaterial();
    const safe = this.material as Material & { vertexColors?: boolean; transparent?: boolean };
    safe.vertexColors = true;
    if (safe.transparent === undefined) safe.transparent = true;
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 5;

    this.applyData(options.layer.data);
  }

  public setData(layer: HeatmapDataLayer): void {
    this.scale = layer.scale;
    this.applyData(layer.data);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private applyData(samples: ReadonlyArray<HeatmapDataEntry>): void {
    const verts = this.basePositions;
    const normals = this.normals;
    const positionAttr = this.geometry.getAttribute('position') as BufferAttribute;
    const colorAttr = this.geometry.getAttribute('color') as BufferAttribute;
    const livePositions = positionAttr.array as Float32Array;
    const liveColors = colorAttr.array as Float32Array;

    if (samples.length === 0) {
      // Reset to base sphere with fallback color.
      const c = new Color(this.fallbackColor);
      for (let i = 0; i < verts.length; i += 3) {
        livePositions[i] = verts[i]!;
        livePositions[i + 1] = verts[i + 1]!;
        livePositions[i + 2] = verts[i + 2]!;
        liveColors[i] = c.r;
        liveColors[i + 1] = c.g;
        liveColors[i + 2] = c.b;
      }
      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      return;
    }

    // Pre-compute sample directions (unit vectors on globe) and value range.
    const sampleDirs = new Float32Array(samples.length * 3);
    let valueMin = Infinity;
    let valueMax = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      const entry = samples[i]!;
      const v = latLngToVector3(entry.position, 1);
      sampleDirs[i * 3] = v.x;
      sampleDirs[i * 3 + 1] = v.y;
      sampleDirs[i * 3 + 2] = v.z;
      if (entry.value < valueMin) valueMin = entry.value;
      if (entry.value > valueMax) valueMax = entry.value;
    }
    if (valueMin === Infinity) {
      valueMin = 0;
      valueMax = 1;
    }
    const extent: readonly [number, number] =
      valueMin === valueMax ? [valueMin, valueMin + 1] : [valueMin, valueMax];

    // Pass 1: density per vertex (and find peak).
    const densities = new Float32Array(verts.length / 3);
    let peak = 0;
    const r2 = this.radiusRad * this.radiusRad;
    // cosine cutoff: if dot < cos(3*radius) the contribution is negligible.
    const cutoffDot = Math.cos(this.radiusRad * 3);
    for (let vi = 0; vi < verts.length; vi += 3) {
      const nx = normals[vi]!;
      const ny = normals[vi + 1]!;
      const nz = normals[vi + 2]!;
      let sum = 0;
      for (let si = 0; si < samples.length; si++) {
        const sx = sampleDirs[si * 3]!;
        const sy = sampleDirs[si * 3 + 1]!;
        const sz = sampleDirs[si * 3 + 2]!;
        const dot = nx * sx + ny * sy + nz * sz;
        if (dot < cutoffDot) continue;
        const ang = Math.acos(Math.min(1, Math.max(-1, dot)));
        const w = Math.exp(-(ang * ang) / r2);
        sum += samples[si]!.value * w;
      }
      densities[vi / 3] = sum;
      if (sum > peak) peak = sum;
    }
    if (peak <= 0) peak = 1;

    // Pass 2: write displaced positions + colors.
    const fallback = new Color(this.fallbackColor);
    for (let vi = 0; vi < verts.length; vi += 3) {
      const idx = vi / 3;
      const density = densities[idx]!;
      const t = density / peak;
      const offset = t * this.maxHeight;
      livePositions[vi] = verts[vi]! + normals[vi]! * offset;
      livePositions[vi + 1] = verts[vi + 1]! + normals[vi + 1]! * offset;
      livePositions[vi + 2] = verts[vi + 2]! + normals[vi + 2]! * offset;

      let color: Color;
      if (this.scale) {
        // Map density (in original sample units) through the scale.
        const scaledValue = extent[0] + t * (extent[1] - extent[0]);
        const c = colorForValue(this.scale, scaledValue, extent);
        color = c ? new Color(c) : fallback;
      } else {
        // Tint from dim → fallback as density rises.
        color = fallback.clone().multiplyScalar(0.2 + 0.8 * t);
      }
      liveColors[vi] = color.r;
      liveColors[vi + 1] = color.g;
      liveColors[vi + 2] = color.b;
    }
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}

const computeNormals = (positions: Float32Array): Float32Array => {
  const normals = new Float32Array(positions.length);
  const v = new Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    v.set(positions[i]!, positions[i + 1]!, positions[i + 2]!).normalize();
    normals[i] = v.x;
    normals[i + 1] = v.y;
    normals[i + 2] = v.z;
  }
  return normals;
};
