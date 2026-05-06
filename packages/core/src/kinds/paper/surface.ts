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
  readonly vignette?: number;
  readonly fiberAmount?: number;
  readonly stainAmount?: number;
  readonly washColor?: string;
  readonly radius?: number;
  readonly segments?: number;
}

const TEXTURE_W = 512;
const TEXTURE_H = 256;
const DEFAULT_VIGNETTE = 0.18;
const DEFAULT_FIBERS = 0.45;
const DEFAULT_STAINS = 0.2;
const DEFAULT_WASH = '#e7b85f';

/**
 * Build a procedural paper-grain CanvasTexture: cream base + clusters of
 * darker grains + a soft vignette. Pure pixel ops in JS land — cheap to
 * regenerate when one of the inputs (color / noise / vignette) changes.
 */
const createPaperTexture = (
  color: string,
  noiseAmount: number,
  vignette: number,
  fiberAmount: number,
  stainAmount: number,
  washColor: string,
): Texture | null => {
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
  // Per-pixel multiplicative grain. Deterministic, so a live texture
  // rebuild changes only the knob being edited rather than flickering into
  // a brand-new sheet of paper.
  const amount = Math.max(0, Math.min(1, noiseAmount));
  for (let y = 0; y < TEXTURE_H; y++) {
    for (let x = 0; x < TEXTURE_W; x++) {
      const i = (y * TEXTURE_W + x) * 4;
      const fine = (hash2(x, y, 11) - 0.5) * amount;
      const cluster =
        (hash2(Math.floor(x / 3), Math.floor(y / 3), 29) - 0.5) * amount * 0.7;
      const fiber =
        (hash2(Math.floor(x / 34), y, 43) - 0.5) *
        Math.max(0, Math.min(1, fiberAmount)) *
        0.18;
      const k = 1 + fine + cluster + fiber;
      data[i] = Math.max(0, Math.min(255, (data[i] ?? 0) * k));
      data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] ?? 0) * k));
      data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] ?? 0) * k));
    }
  }
  ctx.putImageData(img, 0, 0);

  const fiber = Math.max(0, Math.min(1, fiberAmount));
  if (fiber > 0) {
    const rng = mulberry32(0x8f3a19);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 260; i++) {
      const x = rng() * TEXTURE_W;
      const y = rng() * TEXTURE_H;
      const len = 28 + rng() * 120;
      const sway = (rng() - 0.5) * 12;
      ctx.strokeStyle = `rgba(93, 61, 28, ${(0.018 + rng() * 0.045) * fiber})`;
      ctx.lineWidth = 0.35 + rng() * 0.9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + len * 0.33, y + sway, x + len * 0.66, y - sway, x + len, y + sway * 0.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  const stain = Math.max(0, Math.min(1, stainAmount));
  if (stain > 0) {
    const rng = mulberry32(0x61c886);
    const wash = new Color(washColor || DEFAULT_WASH);
    const washRgb = `${Math.round(wash.r * 255)}, ${Math.round(wash.g * 255)}, ${Math.round(wash.b * 255)}`;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 18; i++) {
      const x = rng() * TEXTURE_W;
      const y = rng() * TEXTURE_H;
      const rx = 22 + rng() * 78;
      const ry = 10 + rng() * 36;
      const alpha = (0.015 + rng() * 0.055) * stain;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      grad.addColorStop(0, `rgba(${washRgb}, ${alpha.toFixed(3)})`);
      grad.addColorStop(0.58, `rgba(${washRgb}, ${(alpha * 0.42).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${washRgb}, 0)`);
      ctx.translate(x, y);
      ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
      ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
  }

  // Vignette darkens the equirectangular poles slightly — feels like the
  // sphere's edges when wrapped (which they are, projection-wise).
  const v = Math.max(0, Math.min(1, vignette));
  if (v > 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, TEXTURE_H);
    grad.addColorStop(0, `rgba(0, 0, 0, ${v.toFixed(3)})`);
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(0, 0, 0, ${v.toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
  }

  return new CanvasTexture(canvas);
};

const hash2 = (x: number, y: number, seed: number): number => {
  let h = Math.imul(x ^ seed, 374761393) ^ Math.imul(y + seed, 668265263);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h, 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const mulberry32 = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Cream-paper sphere overlay. Sits at `GLOBE_RADIUS * 0.999` — just outside
 * the default `globeMesh` (0.998) but inside every kind layer (≥1.0). The
 * paper texture wraps equirectangularly and reads as warm parchment.
 *
 * All construction inputs are live-tunable through `setColor`, `setNoise`
 * and `setVignette`. Color is applied both as the material tint AND baked
 * into the canvas texture so the parchment hue actually shifts; noise and
 * vignette regenerate the canvas (cheap — single 512×256 pixel pass).
 */
export class PaperSurfaceLayer {
  public readonly mesh: Mesh;
  private readonly geometry: SphereGeometry;
  private readonly material: MeshBasicMaterial;
  private texture: Texture | null;
  private currentColor: string;
  private currentNoise: number;
  private currentVignette: number;
  private currentFiberAmount: number;
  private currentStainAmount: number;
  private currentWashColor: string;
  private readonly defaultColor: string;
  private readonly defaultNoise: number;
  private readonly defaultVignette: number;
  private readonly defaultFiberAmount: number;
  private readonly defaultStainAmount: number;
  private readonly defaultWashColor: string;

  public constructor(options: PaperSurfaceLayerOptions) {
    const radius = options.radius ?? GLOBE_RADIUS * 0.999;
    const segments = options.segments ?? 64;
    const vignette = options.vignette ?? DEFAULT_VIGNETTE;
    const fiberAmount = options.fiberAmount ?? DEFAULT_FIBERS;
    const stainAmount = options.stainAmount ?? DEFAULT_STAINS;
    const washColor = options.washColor && options.washColor !== '' ? options.washColor : DEFAULT_WASH;
    this.geometry = new SphereGeometry(radius, segments, segments);
    this.currentColor = options.color;
    this.currentNoise = options.noiseAmount;
    this.currentVignette = vignette;
    this.currentFiberAmount = fiberAmount;
    this.currentStainAmount = stainAmount;
    this.currentWashColor = washColor;
    this.defaultColor = options.color;
    this.defaultNoise = options.noiseAmount;
    this.defaultVignette = vignette;
    this.defaultFiberAmount = fiberAmount;
    this.defaultStainAmount = stainAmount;
    this.defaultWashColor = washColor;
    this.texture = createPaperTexture(
      options.color,
      options.noiseAmount,
      vignette,
      fiberAmount,
      stainAmount,
      washColor,
    );
    this.material = new MeshBasicMaterial({
      color: new Color(options.color),
      ...(this.texture ? { map: this.texture } : {}),
    });
    this.mesh = new Mesh(this.geometry, this.material);
  }

  /**
   * Repaint the texture from current color/noise/vignette state, swap it
   * onto the material, and dispose the previous one. Single canvas pass
   * + one GPU upload — no measurable hitch even when slid live.
   */
  private regenerate(): void {
    const next = createPaperTexture(
      this.currentColor,
      this.currentNoise,
      this.currentVignette,
      this.currentFiberAmount,
      this.currentStainAmount,
      this.currentWashColor,
    );
    const prev = this.texture;
    this.texture = next;
    if (next) this.material.map = next;
    this.material.color.set(this.currentColor);
    this.material.needsUpdate = true;
    prev?.dispose();
  }

  public setColor(color: string): void {
    this.currentColor = color;
    this.regenerate();
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  public setNoise(amount: number): void {
    this.currentNoise = Math.max(0, Math.min(1, amount));
    this.regenerate();
  }

  public resetNoise(): void {
    this.setNoise(this.defaultNoise);
  }

  public setVignette(amount: number): void {
    this.currentVignette = Math.max(0, Math.min(1, amount));
    this.regenerate();
  }

  public resetVignette(): void {
    this.setVignette(this.defaultVignette);
  }

  public setFiberAmount(amount: number): void {
    this.currentFiberAmount = Math.max(0, Math.min(1, amount));
    this.regenerate();
  }

  public resetFiberAmount(): void {
    this.setFiberAmount(this.defaultFiberAmount);
  }

  public setStainAmount(amount: number): void {
    this.currentStainAmount = Math.max(0, Math.min(1, amount));
    this.regenerate();
  }

  public resetStainAmount(): void {
    this.setStainAmount(this.defaultStainAmount);
  }

  public setWashColor(color: string): void {
    this.currentWashColor = color;
    this.regenerate();
  }

  public resetWashColor(): void {
    this.setWashColor(this.defaultWashColor);
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
