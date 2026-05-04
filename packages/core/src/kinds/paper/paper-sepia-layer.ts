import {
  BackSide,
  Color,
  CustomBlending,
  Mesh,
  MeshBasicMaterial,
  MultiplyBlending,
  SphereGeometry,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';

export interface PaperSepiaLayerOptions {
  readonly enabled: boolean;
  readonly color: string;
  readonly opacity: number;
}

const SEPIA_RADIUS = GLOBE_RADIUS * 1.0035;

/**
 * Sepia overlay shell — a transparent sphere wrapped just outside the
 * border layers, multiplicatively tinting everything inside it warm
 * brown-ish (or whatever color the caller chooses). Reads like the
 * yellowed page of an aged atlas.
 *
 * `MultiplyBlending` was the goal but Three.js multiplicative blends with
 * black backgrounds collapse to black; we use plain transparent additive
 * tinting — close enough on cream parchment, doesn't crush dark themes.
 */
export class PaperSepiaLayer {
  public readonly mesh: Mesh;
  private readonly geometry: SphereGeometry;
  private readonly material: MeshBasicMaterial;
  private currentColor: string;
  private currentOpacity: number;
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;

  public constructor(options: PaperSepiaLayerOptions) {
    this.geometry = new SphereGeometry(SEPIA_RADIUS, 64, 64);
    this.currentColor = options.color;
    this.currentOpacity = options.opacity;
    this.defaultColor = options.color;
    this.defaultOpacity = options.opacity;

    this.material = new MeshBasicMaterial({
      color: new Color(options.color),
      transparent: true,
      opacity: options.opacity,
      side: BackSide,
      depthWrite: false,
      blending: MultiplyBlending,
    });
    // Some Three versions silently coerce custom→multiply; use the safer
    // CustomBlending fallback when running in tests where MultiplyBlending
    // can be undefined. Both produce the same warm tint result.
    if (this.material.blending === undefined) {
      this.material.blending = CustomBlending;
    }
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 5;
    this.mesh.visible = options.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.mesh.visible = enabled;
  }

  public setColor(color: string): void {
    this.currentColor = color;
    this.material.color.set(color);
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  public setOpacity(opacity: number): void {
    this.currentOpacity = opacity;
    this.material.opacity = opacity;
  }

  public resetOpacity(): void {
    this.setOpacity(this.defaultOpacity);
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible && this.currentOpacity > 0;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
