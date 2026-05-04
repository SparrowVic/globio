import {
  CanvasTexture,
  Color,
  Group,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';

export interface WireframeCompassMarkersOptions {
  readonly color: string;
  readonly opacity: number;
  readonly size: number;
  readonly poles: boolean;
}

interface CompassEntry {
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
}

const SURFACE_LIFT = GLOBE_RADIUS * 1.04;
const TEX_SIZE = 64;

const CARDINALS: ReadonlyArray<CompassEntry> = [
  { label: 'N', lat: 89, lng: 0 },
  { label: 'S', lat: -89, lng: 0 },
];

const EQUATORIAL: ReadonlyArray<CompassEntry> = [
  { label: 'E', lat: 0, lng: 90 },
  { label: 'W', lat: 0, lng: -90 },
  { label: '0°', lat: 0, lng: 0 },
  { label: '180°', lat: 0, lng: 180 },
];

/**
 * Cardinal-direction markers floating just above the globe surface. Built
 * as Three.js Sprites with per-letter canvas textures so they always face
 * the camera and stay legible regardless of rotation. The set is small
 * (max 6 entries) so overhead is negligible.
 *
 * The "compass" framing of the wireframe sells two things at once:
 *  1. The wireframe is *navigation-grade* (Tron data feed, command deck).
 *  2. The viewer can mentally orient the globe at a glance even when the
 *     country geometry isn't there to anchor them.
 */
export class WireframeCompassMarkers {
  public readonly group: Group;
  private readonly sprites: Array<{ readonly sprite: Sprite; readonly entry: CompassEntry }>;
  private readonly originalColor: string;
  private currentColor: string;
  private currentSize: number;
  private currentOpacity: number;
  private polesVisible: boolean;

  public constructor(options: WireframeCompassMarkersOptions) {
    this.group = new Group();
    this.originalColor = options.color;
    this.currentColor = options.color;
    this.currentSize = options.size;
    this.currentOpacity = options.opacity;
    this.polesVisible = options.poles;

    this.sprites = [];
    for (const entry of EQUATORIAL) {
      this.sprites.push(this.buildSprite(entry, true));
    }
    for (const entry of CARDINALS) {
      this.sprites.push(this.buildSprite(entry, this.polesVisible));
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    for (const { sprite } of this.sprites) {
      const mat = sprite.material as SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.group.clear();
  }

  /* ───────── live setters ───────── */

  public setColor(color: string): void {
    this.currentColor = color;
    this.refreshTextures();
  }

  public resetColor(): void {
    this.currentColor = this.originalColor;
    this.refreshTextures();
  }

  public setSize(size: number): void {
    this.currentSize = size;
    for (const { sprite } of this.sprites) {
      sprite.scale.set(size, size, 1);
    }
  }

  public setOpacity(opacity: number): void {
    this.currentOpacity = Math.max(0, Math.min(1, opacity));
    for (const { sprite } of this.sprites) {
      (sprite.material as SpriteMaterial).opacity = this.currentOpacity;
    }
  }

  public setPolesVisible(visible: boolean): void {
    this.polesVisible = visible;
    for (const { sprite, entry } of this.sprites) {
      const isPole = entry.label === 'N' || entry.label === 'S';
      if (isPole) sprite.visible = visible;
    }
  }

  /* ───────── internals ───────── */

  private buildSprite(
    entry: CompassEntry,
    initialVisible: boolean
  ): { readonly sprite: Sprite; readonly entry: CompassEntry } {
    const texture = makeLetterTexture(entry.label, this.currentColor);
    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: this.currentOpacity,
      depthWrite: false,
      depthTest: true,
      color: new Color(0xffffff),
    });
    const sprite = new Sprite(material);
    const pos = latLngToVector3([entry.lat, entry.lng], SURFACE_LIFT, new Vector3());
    sprite.position.copy(pos);
    sprite.scale.set(this.currentSize, this.currentSize, 1);
    sprite.renderOrder = 14;
    sprite.visible = initialVisible;
    this.group.add(sprite);
    return { sprite, entry };
  }

  private refreshTextures(): void {
    for (const { sprite, entry } of this.sprites) {
      const mat = sprite.material as SpriteMaterial;
      mat.map?.dispose();
      mat.map = makeLetterTexture(entry.label, this.currentColor);
      mat.needsUpdate = true;
    }
  }
}

const makeLetterTexture = (label: string, color: string): CanvasTexture => {
  if (typeof document === 'undefined') {
    // Node / SSR fallback — tiny 1x1 transparent texture so things still
    // wire up without a canvas backend.
    const fallback = new CanvasTexture({ width: 1, height: 1 } as unknown as HTMLCanvasElement);
    return fallback;
  }
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);
    ctx.font = `600 ${Math.floor(TEX_SIZE * 0.7)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = color;
    ctx.fillText(label, TEX_SIZE / 2, TEX_SIZE / 2);
    // Second pass — sharper foreground centered glyph (no shadow) so the
    // letter reads crisp even when the halo is dim.
    ctx.shadowBlur = 0;
    ctx.fillText(label, TEX_SIZE / 2, TEX_SIZE / 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};
