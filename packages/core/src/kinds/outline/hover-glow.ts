import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryFeature } from '../../renderer/country-feature';

export interface OutlineHoverGlowLayerOptions {
  readonly color: string;
  readonly width: number;
  readonly opacity: number;
  /** Fade-in / fade-out duration in seconds. Default 0.2. */
  readonly fadeDuration?: number;
  /**
   * World-space radius the additive halo is rendered at. Default
   * `GLOBE_RADIUS * 1.0035` — ~0.35% above the surface so the glow
   * floats subtly behind the crisp highlight.
   */
  readonly surfaceRadius?: number;
}

const DEFAULT_FADE = 0.2;
const DEFAULT_GLOW_RADIUS = GLOBE_RADIUS * 1.0035;

/**
 * Soft additive halo around the hovered country's borders. Sits below the
 * crisp gold highlight (renderOrder 9 vs 10) so the gold draws on top while
 * the glow paints a wider, blurred wash behind it. Geometry is rebuilt per
 * hover; opacity is tweened on a 0→1 ease-out ramp to avoid pop-in.
 */
export class OutlineHoverGlowLayer {
  public readonly object: LineSegments;
  private readonly material: LineBasicMaterial;
  private readonly featuresById = new Map<string, CountryFeature>();
  private readonly baseOpacity: number;
  private readonly fadeDuration: number;
  private readonly surfaceRadius: number;
  private currentId: string | null = null;
  private targetT = 0;
  private currentT = 0;

  public constructor(options: OutlineHoverGlowLayerOptions) {
    this.baseOpacity = options.opacity;
    this.fadeDuration = options.fadeDuration ?? DEFAULT_FADE;
    this.surfaceRadius = options.surfaceRadius ?? DEFAULT_GLOW_RADIUS;
    this.material = new LineBasicMaterial({
      color: new Color(options.color),
      linewidth: options.width,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.object = new LineSegments(new BufferGeometry(), this.material);
    this.object.renderOrder = 9;
    this.object.visible = false;
  }

  public registerFeatures(features: ReadonlyArray<CountryFeature>): void {
    this.featuresById.clear();
    for (const feature of features) this.featuresById.set(feature.id, feature);
  }

  public showCountry(id: string): void {
    if (id !== this.currentId) {
      const feature = this.featuresById.get(id);
      if (!feature) {
        this.targetT = 0;
        return;
      }
      this.rebuildGeometry(feature);
      if (this.currentId !== null) this.currentT = Math.max(this.currentT, 1);
      this.currentId = id;
    }
    this.targetT = 1;
  }

  public clear(): void {
    this.targetT = 0;
    this.currentId = null;
  }

  public update(delta: number): void {
    if (this.currentT === this.targetT) return;
    if (this.fadeDuration <= 0) {
      this.currentT = this.targetT;
    } else {
      const step = delta / this.fadeDuration;
      const dir = this.targetT > this.currentT ? 1 : -1;
      this.currentT = Math.max(0, Math.min(1, this.currentT + dir * step));
    }
    // Quadratic ease-out feels like a soft bloom rather than a linear fade.
    const eased = this.targetT > 0
      ? 1 - (1 - this.currentT) * (1 - this.currentT)
      : this.currentT * this.currentT;
    this.material.opacity = eased * this.baseOpacity;
    this.object.visible = this.currentT > 0;
  }

  public dispose(): void {
    this.object.geometry.dispose();
    this.material.dispose();
    this.featuresById.clear();
  }

  private rebuildGeometry(feature: CountryFeature): void {
    const positions: Array<number> = [];
    feature.coordinates.forEach((ring) => {
      if (ring.length < 2) return;
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i];
        const b = ring[i + 1];
        if (!a || !b) continue;
        const v1 = latLngToVector3([a[1], a[0]], this.surfaceRadius);
        const v2 = latLngToVector3([b[1], b[0]], this.surfaceRadius);
        positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.object.geometry.dispose();
    this.object.geometry = geometry;
  }
}
