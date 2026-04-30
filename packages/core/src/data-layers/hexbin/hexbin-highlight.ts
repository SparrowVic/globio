import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';

/**
 * Single-triangle overlay placed on top of the currently hovered cell.
 * Built once with a 3-vertex `BufferGeometry`; on hover we copy the
 * cell's world-space corners (slightly lifted along the surface normal
 * so it doesn't z-fight with the underlying cell) into our position
 * buffer and toggle visibility. No raycasting / no event plumbing —
 * the layer drives this from its own pointer handlers.
 */
export class HexBinHighlight {
  public readonly mesh: Mesh;
  private readonly geometry: BufferGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly positions: Float32Array;
  private liftOffset: number;
  private currentFace = -1;
  /** Latest corner snapshot used by `refreshFromHover()` after animation. */
  private readonly lastCorners = new Float32Array(9);
  private hasCorners = false;

  public constructor(options: {
    readonly color: string;
    readonly opacity: number;
    readonly liftOffset: number;
  }) {
    this.liftOffset = nonNegative(options.liftOffset, 0);
    this.positions = new Float32Array(9);
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.material = new MeshBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: clamp01(options.opacity),
      side: DoubleSide,
      depthWrite: false,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 7;
    this.mesh.visible = false;
  }

  /** Show the highlight on `faceIndex` using `corners` (9 floats, 3 verts × XYZ). */
  public showFace(faceIndex: number, corners: Float32Array): void {
    this.currentFace = faceIndex;
    this.lastCorners.set(corners);
    this.hasCorners = true;
    this.writeLifted();
    this.mesh.visible = true;
  }

  /** Hide the highlight without disposing the mesh. */
  public hide(): void {
    this.currentFace = -1;
    this.hasCorners = false;
    this.mesh.visible = false;
  }

  public get faceIndex(): number {
    return this.currentFace;
  }

  public updateStyle(options: {
    readonly color: string;
    readonly opacity: number;
    readonly liftOffset: number;
  }): void {
    this.material.color.set(options.color);
    this.material.opacity = clamp01(options.opacity);
    this.liftOffset = nonNegative(options.liftOffset, this.liftOffset);
    this.refreshFromHover();
  }

  /** Re-write positions from the cached corners — called after animation tick. */
  public refreshFromHover(): void {
    if (!this.hasCorners || !this.mesh.visible) return;
    this.writeLifted();
  }

  /** Update the cached corners to a new snapshot from the mesh. */
  public updateCorners(corners: Float32Array): void {
    this.lastCorners.set(corners);
    this.writeLifted();
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private writeLifted(): void {
    // Push each corner outward along its own radial direction by `liftOffset`.
    // (Faces are roughly tangent to the sphere, so radial = unit length of
    // the corner vector for a sphere-centred globe.)
    const v = SCRATCH_VEC;
    for (let i = 0; i < 3; i++) {
      const idx = i * 3;
      v.set(this.lastCorners[idx]!, this.lastCorners[idx + 1]!, this.lastCorners[idx + 2]!);
      const len = v.length();
      if (len > 1e-6) {
        const factor = (len + this.liftOffset) / len;
        this.positions[idx] = v.x * factor;
        this.positions[idx + 1] = v.y * factor;
        this.positions[idx + 2] = v.z * factor;
      } else {
        this.positions[idx] = v.x;
        this.positions[idx + 1] = v.y;
        this.positions[idx + 2] = v.z;
      }
    }
    (this.geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
  }
}

const SCRATCH_VEC = new Vector3();

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
};

const nonNegative = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, value);
};
