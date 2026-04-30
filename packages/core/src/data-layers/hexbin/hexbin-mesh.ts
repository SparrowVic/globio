import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
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
  /** 0..1, how much each cell shrinks toward its centroid. Default 0.94. */
  readonly cellInset: number;
  /** Material opacity multiplier. Default 1. */
  readonly opacity: number;
  /** Colour for cells with no samples (when `showEmpty` is true). */
  readonly noDataColor: string;
  /** Min/max extrusion in world units (1 = globe radius). */
  readonly heightRange: { readonly min: number; readonly max: number };
  /** Outer-shell lift to avoid z-fighting with the underlying globe surface. */
  readonly lift: number;
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
  private readonly geometry: BufferGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly basePositions: Float32Array;
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
  private readonly faceCount: number;
  private readonly lift: number;

  public constructor(options: HexBinMeshOptions) {
    const { icosphere, cellInset, opacity, heightRange } = options;
    this.lift = SHELL_LIFT_DEFAULT;
    this.faceCount = icosphere.faces.length / 3;
    const vertCount = this.faceCount * 3;

    this.basePositions = new Float32Array(vertCount * 3);
    this.positions = new Float32Array(vertCount * 3);
    this.colors = new Float32Array(vertCount * 3);
    this.baseColors = new Float32Array(vertCount * 3);
    this.heights = new Float32Array(this.faceCount);
    this.animScale = new Float32Array(this.faceCount);
    this.animScale.fill(1);

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
      for (let k = 0; k < 3; k++) {
        const vIdx = faces[f * 3 + k]! * 3;
        const vx = verts[vIdx]!;
        const vy = verts[vIdx + 1]!;
        const vz = verts[vIdx + 2]!;
        const ix = cx + (vx - cx) * cellInset;
        const iy = cy + (vy - cy) * cellInset;
        const iz = cz + (vz - cz) * cellInset;
        const out = (f * 3 + k) * 3;
        this.basePositions[out] = ix;
        this.basePositions[out + 1] = iy;
        this.basePositions[out + 2] = iz;
      }
    }

    // Initial position write: shell at lift + height = 0.
    this.writePositionsAtAnimT(1, heightRange);

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    this.geometry.computeVertexNormals();

    this.material = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity,
      side: DoubleSide,
      depthWrite: false,
    });

    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 5;
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
    const span = Math.max(1e-9, extent[1] - extent[0]);
    for (let f = 0; f < this.faceCount; f++) {
      const v = values[f]!;
      const empty = !Number.isFinite(v);
      let color: string;
      let normalised: number;
      if (empty) {
        if (!showEmpty) {
          this.heights[f] = 0;
          this.writeFaceColor(f, '#000000', 0);
          continue;
        }
        color = noDataColor;
        normalised = 0;
      } else {
        normalised = (v - extent[0]) / span;
        const cell = scale ? colorForValue(scale, v, extent) : null;
        color = cell ?? fallbackColor;
      }
      const cellHeight = heightRange.min + normalised * (heightRange.max - heightRange.min);
      this.heights[f] = empty ? 0 : cellHeight;
      this.writeFaceColor(f, color, 1);
    }
    this.writePositionsAtAnimT(1, heightRange);
    (this.geometry.getAttribute('position') as Float32BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as Float32BufferAttribute).needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  /**
   * Apply per-face animation scale and rewrite positions + RGB. Called by
   * the orchestrator's tick once per frame. Per-face colour fades from
   * black (animScale=0) to its baked baseColor (animScale=1) so cells
   * visibly bloom in alongside their extrusion rise.
   */
  public applyAnimation(animScalePerFace: Float32Array, heightRange: { readonly min: number; readonly max: number }): void {
    this.animScale.set(animScalePerFace);
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
    (this.geometry.getAttribute('position') as Float32BufferAttribute).needsUpdate = true;
    (this.geometry.getAttribute('color') as Float32BufferAttribute).needsUpdate = true;
  }

  public setOpacity(opacity: number): void {
    this.material.opacity = opacity;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
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
