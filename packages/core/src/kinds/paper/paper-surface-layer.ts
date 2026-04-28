import {
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  type Texture,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';

export interface PaperSurfaceLayerOptions {
  readonly color: string;
  readonly noiseAmount: number;
  readonly radius?: number;
  readonly segments?: number;
}

const TEXTURE_W = 512;
const TEXTURE_H = 256;

/**
 * Build a procedural paper-grain CanvasTexture: cream base + clusters of
 * darker grains + a soft vignette. Cached per-layer; cheap to regenerate
 * on rebuild because canvas ops dominate, not GL upload.
 */
const createPaperTexture = (color: string, noiseAmount: number): Texture | null => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_W;
  canvas.height = TEXTURE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const base = new Color(color);
  ctx.fillStyle = `rgb(${Math.round(base.r * 255)}, ${Math.round(base.g * 255)}, ${Math.round(base.b * 255)})`;
  ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);

  const img = ctx.getImageData(0, 0, TEXTURE_W, TEXTURE_H);
  const data = img.data;
  // Per-pixel multiplicative grain. Two octaves: fine speckle + ~2px clusters.
  const amount = Math.max(0, Math.min(1, noiseAmount));
  for (let y = 0; y < TEXTURE_H; y++) {
    for (let x = 0; x < TEXTURE_W; x++) {
      const i = (y * TEXTURE_W + x) * 4;
      const fine = (Math.random() - 0.5) * amount;
      const cluster = (Math.random() - 0.5) * amount * 0.6;
      const k = 1 + fine + cluster;
      data[i] = Math.max(0, Math.min(255, (data[i] ?? 0) * k));
      data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] ?? 0) * k));
      data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] ?? 0) * k));
    }
  }
  ctx.putImageData(img, 0, 0);

  // Vignette darkens the equirectangular poles slightly — feels like the
  // sphere's edges when wrapped (which they are, projection-wise).
  const grad = ctx.createLinearGradient(0, 0, 0, TEXTURE_H);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);

  return new CanvasTexture(canvas);
};

/**
 * Cream-paper sphere overlay. Sits at `GLOBE_RADIUS * 0.999` — just outside
 * the default `globeMesh` (0.998) but inside every kind layer (≥1.0). The
 * paper texture wraps equirectangularly and reads as warm parchment.
 */
export class PaperSurfaceLayer {
  public readonly mesh: Mesh;
  private readonly geometry: SphereGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly texture: Texture | null;

  public constructor(options: PaperSurfaceLayerOptions) {
    const radius = options.radius ?? GLOBE_RADIUS * 0.999;
    const segments = options.segments ?? 64;
    this.geometry = new SphereGeometry(radius, segments, segments);
    this.texture = createPaperTexture(options.color, options.noiseAmount);
    this.material = new MeshBasicMaterial({
      color: new Color(options.color),
      ...(this.texture ? { map: this.texture } : {}),
    });
    this.mesh = new Mesh(this.geometry, this.material);
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture?.dispose();
  }
}
