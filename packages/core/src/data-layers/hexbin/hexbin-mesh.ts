import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';
import { colorForValue, type ScaleConfig } from '../../data/scales';
import type { IcosphereData } from './icosphere';

/**
 * Renderable mesh for the hex-bin layer. Each icosphere face is duplicated
 * into 3 unshared vertices (so per-face colour and per-face extrusion
 * don't interpolate into neighbours), positioned at:
 *
 *   centroid + (faceVertex − centroid) × cellInset       // shrink toward centre
 *   then scaled outward by GLOBE_RADIUS × (lift + height_for_face)
 *
 * `cellInset = 1` produces a contiguous globe-shell mesh; values like 0.94
 * leave a thin gap between cells which reads as discrete bins under the
 * colour scale. Animation `t` scales the per-face extrusion factor; CPU
 * rewrites positions in-place each frame (numFaces × 3 vertices × 3 floats
 * — at level 3 that's 11.5k floats, well below 1ms on modern hardware).
 */
export interface HexBinMeshOptions {
  readonly icosphere: IcosphereData;
  /** 0..1, how much of each cell footprint remains after centroid shrink. Default 0.94. */
  readonly cellInset: number;
  /** Material opacity multiplier. Default 1. */
  readonly opacity: number;
  /** Min/max extrusion in world units (1 = globe radius). */
  readonly heightRange: { readonly min: number; readonly max: number };
  /** Outer-shell lift to avoid z-fighting with the underlying globe surface. */
  readonly lift: number;
  /** Enable cell borders (LineSegments along each triangle's 3 edges). */
  readonly border?: { readonly color: string; readonly opacity: number };
}

const SHELL_LIFT_DEFAULT = 1.001;

const _color = new Color();

/**
 * Owns the Three.js renderable for one hex-bin layer. Allocates per-face
 * vertex buffers up-front; subsequent updates re-fill the existing buffers
 * (BufferAttribute.needsUpdate = true) so we don't churn GC every time the
 * scale or values change.
 */
export class HexBinMesh {
  public readonly mesh: Mesh;
  /** Optional cell-border LineSegments — only allocated when `options.border` is supplied. */
  public readonly borderLines: LineSegments | null = null;
  private readonly geometry: BufferGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly borderGeometry: BufferGeometry | null = null;
  private readonly borderMaterial: LineBasicMaterial | null = null;
  /** Per-edge XYZ buffer (6 verts per face — 3 edges × 2 endpoints). */
  private readonly borderPositions: Float32Array | null = null;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly basePositions: Float32Array;
  private readonly faceCenters: Float32Array;
  /**
   * Per-vertex "fully bloomed" colour (RGB ×3 floats × 3 verts/face). The
   * vertex `colors` buffer is `baseColors × faceAnimScale` each frame so
   * cells visibly fade in as their stagger window opens.
   */
  private readonly baseColors: Float32Array;
  /** Per-face current extrusion height (world units, post-clamp). */
  private readonly heights: Float32Array;
  /** Per-face animation scaling [0..1] applied each tick. */
  private readonly animScale: Float32Array;
  /** Per-face visibility. Hidden cells are collapsed to a zero-area triangle. */
  private readonly visible: Uint8Array;
  private readonly faceCount: number;
  private readonly lift: number;

  public constructor(options: HexBinMeshOptions) {
    const { icosphere, cellInset, opacity, heightRange } = options;
    this.lift = options.lift ?? SHELL_LIFT_DEFAULT;
    this.faceCount = icosphere.faces.length / 3;
    const vertCount = this.faceCount * 3;

    this.basePositions = new Float32Array(vertCount * 3);
    this.faceCenters = new Float32Array(this.faceCount * 3);
    this.positions = new Float32Array(vertCount * 3);
    this.colors = new Float32Array(vertCount * 3);
    this.baseColors = new Float32Array(vertCount * 3);
    this.heights = new Float32Array(this.faceCount);
    this.animScale = new Float32Array(this.faceCount);
    this.animScale.fill(1);
    this.visible = new Uint8Array(this.faceCount);
    this.visible.fill(1);

    const verts = icosphere.vertices;
    const faces = icosphere.faces;
    const centroids = icosphere.faceCentroids;

    // Pre-compute the inset XYZ for each face vertex (centroid + (v - centroid) × inset).
    // basePositions stores these on the unit sphere; the per-frame update
    // multiplies by GLOBE_RADIUS × (lift + animScale × heightFraction) to
    // produce the final world-space position.
    for (let f = 0; f < this.faceCount; f++) {
      const cx = centroids[f * 3]!;
      const cy = centroids[f * 3 + 1]!;
      const cz = centroids[f * 3 + 2]!;
      this.faceCenters[f * 3] = cx;
      this.faceCenters[f * 3 + 1] = cy;
      this.faceCenters[f * 3 + 2] = cz;
      for (let k = 0; k < 3; k++) {
        const vIdx = faces[f * 3 + k]! * 3;
        const vx = verts[vIdx]!;
        const vy = verts[vIdx + 1]!;
        const vz = verts[vIdx + 2]!;
        let ix = cx + (vx - cx) * cellInset;
        let iy = cy + (vy - cy) * cellInset;
        let iz = cz + (vz - cz) * cellInset;
        const len = Math.sqrt(ix * ix + iy * iy + iz * iz) || 1;
        ix /= len;
        iy /= len;
        iz /= len;
        const out = (f * 3 + k) * 3;
        this.basePositions[out] = ix;
        this.basePositions[out + 1] = iy;
        this.basePositions[out + 2] = iz;
      }
    }

    // Initial position write: shell at lift + height = 0.
    this.writePositionsAtAnimT(1, heightRange);

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.geometry.computeVertexNormals();

    this.material = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: clamp01(opacity),
      side: DoubleSide,
      depthWrite: false,
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 5;

    // Optional border lines — one LineSegments mesh sharing the per-face
    // vertex layout but emitting edge pairs (3 edges × 2 endpoints per
    // face = 6 verts/face). Positions follow the cell's animated XYZ.
    if (options.border) {
      this.borderPositions = new Float32Array(this.faceCount * 6 * 3);
      this.writeBorderPositions();
      this.borderGeometry = new BufferGeometry();
      this.borderGeometry.setAttribute(
        'position',
        new BufferAttribute(this.borderPositions, 3)
      );
      this.borderMaterial = new LineBasicMaterial({
        color: options.border.color,
        transparent: true,
        opacity: clamp01(options.border.opacity),
        depthWrite: false,
      });
      this.borderLines = new LineSegments(this.borderGeometry, this.borderMaterial);
      this.borderLines.renderOrder = 6;
    }
  }

  /**
   * Update colours + per-face heights from new aggregated values. Empty
   * cells (NaN) get the `noData` colour when `showEmpty` is true, otherwise
   * collapse to height 0 and alpha 0.
   */
  public update(
    values: Float32Array,
    extent: readonly [number, number],
    scale: ScaleConfig | undefined,
    fallbackColor: string,
    showEmpty: boolean,
    heightRange: { readonly min: number; readonly max: number },
    noDataColor: string
  ): void {
    const span = extent[1] - extent[0];
    const degenerateExtent = Math.abs(span) < 1e-9;
    const resolvedNoDataColor = scale?.noDataColor ?? noDataColor;
    for (let f = 0; f < this.faceCount; f++) {
      const v = values[f]!;
      const empty = !Number.isFinite(v);
      let color: string;
      let normalised: number;
      if (empty) {
        if (!showEmpty) {
          this.visible[f] = 0;
          this.heights[f] = 0;
          this.writeFaceColor(f, '#000000', 0);
          continue;
        }
        this.visible[f] = 1;
        color = resolvedNoDataColor;
        normalised = 0;
      } else {
        this.visible[f] = 1;
        normalised = degenerateExtent ? 1 : (v - extent[0]) / span;
        const cell = scale ? colorForValue(scale, v, extent) : null;
        color = cell ?? scale?.noDataColor ?? fallbackColor;
      }
      normalised = Math.max(0, Math.min(1, normalised));
      const cellHeight = heightRange.min + normalised * (heightRange.max - heightRange.min);
      this.heights[f] = empty ? 0 : cellHeight;
      this.writeFaceColor(f, color, 1);
    }
    this.writePositionsAtAnimT(1, heightRange);
    (this.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
    this.writeBorderPositions();
    this.geometry.computeBoundingSphere();
  }

  /**
   * Apply per-face animation scale and rewrite positions + RGB. Called by
   * the orchestrator's tick once per frame. Per-face colour fades from
   * black (animScale=0) to its baked baseColor (animScale=1) so cells
   * visibly bloom in alongside their extrusion rise.
   */
  public applyAnimation(animScalePerFace: Float32Array, heightRange: { readonly min: number; readonly max: number }): void {
    for (let f = 0; f < this.faceCount; f++) {
      const s = animScalePerFace[f] ?? 0;
      this.animScale[f] = Number.isFinite(s) ? Math.max(0, s) : 0;
    }
    this.writePositionsAtAnimT(0, heightRange);
    for (let f = 0; f < this.faceCount; f++) {
      const s = this.animScale[f]!;
      for (let k = 0; k < 3; k++) {
        const idx = (f * 3 + k) * 3;
        this.colors[idx] = this.baseColors[idx]! * s;
        this.colors[idx + 1] = this.baseColors[idx + 1]! * s;
        this.colors[idx + 2] = this.baseColors[idx + 2]! * s;
      }
    }
    (this.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as BufferAttribute).needsUpdate = true;
    this.writeBorderPositions();
  }

  public setOpacity(opacity: number): void {
    this.material.opacity = clamp01(opacity);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.borderGeometry) this.borderGeometry.dispose();
    if (this.borderMaterial) this.borderMaterial.dispose();
  }

  /** Number of cells (= number of icosphere faces). */
  public get faceCount_(): number {
    return this.faceCount;
  }

  /**
   * World-space XYZ at the centroid of cell `f` after animation/extrusion.
   * Used by the highlight overlay so it sits flush on top of the hovered
   * cell's centre. Returns into a 3-tuple via the supplied scratch array.
   */
  public getFaceCenter(f: number, out: [number, number, number]): void {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < 3; k++) {
      const idx = (f * 3 + k) * 3;
      cx += this.positions[idx]!;
      cy += this.positions[idx + 1]!;
      cz += this.positions[idx + 2]!;
    }
    out[0] = cx / 3;
    out[1] = cy / 3;
    out[2] = cz / 3;
  }

  /**
   * World-space corner positions of cell `f` after animation. Caller passes
   * a Float32Array of length 9 (3 verts × 3 floats) which gets filled in
   * place. Used by the highlight overlay to copy the cell's exact triangle.
   */
  public getFaceCorners(f: number, out: Float32Array): void {
    for (let k = 0; k < 9; k++) out[k] = this.positions[f * 9 + k]!;
  }

  public isFaceVisible(f: number): boolean {
    return f >= 0 && f < this.faceCount && this.visible[f] !== 0;
  }

  /** Refresh border line positions from the current animated mesh state. */
  private writeBorderPositions(): void {
    if (!this.borderPositions) return;
    for (let f = 0; f < this.faceCount; f++) {
      const base = f * 9;
      const out = f * 18;
      // Edge 0-1
      this.borderPositions[out + 0] = this.positions[base + 0]!;
      this.borderPositions[out + 1] = this.positions[base + 1]!;
      this.borderPositions[out + 2] = this.positions[base + 2]!;
      this.borderPositions[out + 3] = this.positions[base + 3]!;
      this.borderPositions[out + 4] = this.positions[base + 4]!;
      this.borderPositions[out + 5] = this.positions[base + 5]!;
      // Edge 1-2
      this.borderPositions[out + 6] = this.positions[base + 3]!;
      this.borderPositions[out + 7] = this.positions[base + 4]!;
      this.borderPositions[out + 8] = this.positions[base + 5]!;
      this.borderPositions[out + 9] = this.positions[base + 6]!;
      this.borderPositions[out + 10] = this.positions[base + 7]!;
      this.borderPositions[out + 11] = this.positions[base + 8]!;
      // Edge 2-0
      this.borderPositions[out + 12] = this.positions[base + 6]!;
      this.borderPositions[out + 13] = this.positions[base + 7]!;
      this.borderPositions[out + 14] = this.positions[base + 8]!;
      this.borderPositions[out + 15] = this.positions[base + 0]!;
      this.borderPositions[out + 16] = this.positions[base + 1]!;
      this.borderPositions[out + 17] = this.positions[base + 2]!;
    }
    if (this.borderGeometry) {
      (this.borderGeometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
    }
  }

  /**
   * Re-write every vertex's XYZ from `basePositions × (lift + height × scale)`.
   *  - `_unused` parameter kept symmetrical with applyAnimation's signature.
   *  - Positions are scaled by `GLOBE_RADIUS` so the buffer holds final
   *    world-space coords (no group-level scale needed at the call site).
   */
  private writePositionsAtAnimT(
    _initialFlag: number,
    _heightRange: { readonly min: number; readonly max: number }
  ): void {
    const lift = this.lift;
    for (let f = 0; f < this.faceCount; f++) {
      const h = this.heights[f]! * this.animScale[f]!;
      const radial = GLOBE_RADIUS * (lift + h);
      if (this.visible[f] === 0) {
        const c = f * 3;
        const x = this.faceCenters[c]! * GLOBE_RADIUS * lift;
        const y = this.faceCenters[c + 1]! * GLOBE_RADIUS * lift;
        const z = this.faceCenters[c + 2]! * GLOBE_RADIUS * lift;
        for (let k = 0; k < 3; k++) {
          const idx = (f * 3 + k) * 3;
          this.positions[idx] = x;
          this.positions[idx + 1] = y;
          this.positions[idx + 2] = z;
        }
        continue;
      }
      for (let k = 0; k < 3; k++) {
        const idx = (f * 3 + k) * 3;
        this.positions[idx] = this.basePositions[idx]! * radial;
        this.positions[idx + 1] = this.basePositions[idx + 1]! * radial;
        this.positions[idx + 2] = this.basePositions[idx + 2]! * radial;
      }
    }
  }

  /**
   * Write a face's BASE colour (the "fully bloomed" target). Per-frame
   * `applyAnimation` multiplies by `animScale` to get the visible colour.
   * `alpha` lets `update()` zero out empty cells so they stay invisible
   * regardless of animation state.
   */
  private writeFaceColor(face: number, color: string, alpha: number): void {
    _color.set(color);
    const r = _color.r * alpha;
    const g = _color.g * alpha;
    const b = _color.b * alpha;
    for (let k = 0; k < 3; k++) {
      const idx = (face * 3 + k) * 3;
      this.baseColors[idx] = r;
      this.baseColors[idx + 1] = g;
      this.baseColors[idx + 2] = b;
      // Mirror into the live colour buffer at full intensity so static
      // (animation-disabled) layers render correctly without a tick().
      this.colors[idx] = r;
      this.colors[idx + 1] = g;
      this.colors[idx + 2] = b;
    }
  }
}

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
};
