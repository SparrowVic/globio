import {
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  SphereGeometry,
  TextureLoader,
  type Texture,
  type Material,
} from 'three';
import { GLOBE_RADIUS } from '../utils/coordinates';

export interface GlobeMeshOptions {
  readonly color: string;
  readonly textureUrl?: string;
  readonly segments?: number;
}

export class GlobeMesh {
  public readonly mesh: Mesh;
  private texture: Texture | null = null;
  private readonly material: Material;
  private readonly geometry: SphereGeometry;

  public constructor(private readonly options: GlobeMeshOptions) {
    const segments = options.segments ?? 64;
    this.geometry = new SphereGeometry(GLOBE_RADIUS * 0.998, segments, segments);

    if (options.textureUrl) {
      this.material = new MeshPhongMaterial({ color: new Color(options.color) });
      this.loadTexture(options.textureUrl);
    } else {
      this.material = new MeshBasicMaterial({ color: new Color(options.color) });
    }

    this.mesh = new Mesh(this.geometry, this.material);
  }

  public setColor(color: string): void {
    if ('color' in this.material && this.material.color instanceof Color) {
      this.material.color.set(color);
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture?.dispose();
  }

  private loadTexture(url: string): void {
    const loader = new TextureLoader();
    loader.load(url, (texture) => {
      this.texture = texture;
      if (this.material instanceof MeshPhongMaterial) {
        this.material.map = texture;
        this.material.needsUpdate = true;
      }
    });
  }
}
