import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from 'three';

export interface StarfieldLayerOptions {
  readonly count: number;
  readonly color: string;
  readonly size: number;
  /** Sphere radius the stars are placed on. Default 30 (well outside camera). */
  readonly radius?: number;
}

/**
 * Procedural starfield rendered as a `THREE.Points` cloud on a large sphere
 * surrounding the scene. Stars are uniformly distributed (using inverse-CDF
 * for cos(phi) to avoid pole clustering) and use `sizeAttenuation: false`
 * so they keep a constant pixel size regardless of camera distance.
 */
export class StarfieldLayer {
  public readonly object: Points;
  private readonly geometry: BufferGeometry;
  private readonly material: PointsMaterial;

  public constructor(options: StarfieldLayerOptions) {
    const radius = options.radius ?? 30;
    const positions = new Float32Array(options.count * 3);
    for (let i = 0; i < options.count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.material = new PointsMaterial({
      color: new Color(options.color),
      size: options.size,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
    });
    this.object = new Points(this.geometry, this.material);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
