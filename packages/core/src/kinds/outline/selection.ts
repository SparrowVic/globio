import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryFeature } from '../../renderer/country-feature';

export interface OutlineSelectionLayerOptions {
  readonly hoverColor: string;
  readonly hoverWidth: number;
  readonly hoverOpacity: number;
  /**
   * When true, the highlight respects globe depth so back-side portions are
   * hidden behind the sphere. When false, the entire country outline draws
   * through the globe (x-ray feel). Default behavior is decided by globe.ts.
   */
  readonly occludeBackSide: boolean;
  /**
   * Fade-in / fade-out duration in seconds. 0 disables the tween (snap to
   * visible / hidden). Default 0.18s — fast enough to feel responsive while
   * smoothing the transition between hover targets.
   */
  readonly fadeDuration?: number;
  /**
   * World-space radius at which the highlight geometry is rebuilt. Default
   * `GLOBE_RADIUS * 1.0025` — sits ~0.25% above the base border layer to
   * avoid z-fighting on filled kinds (paper, hologram).
   *
   * For pure-line kinds like `outline`, that gap reads as a visible "ghost
   * duplicate" border floating above the real one. Pass a value equal to
   * the base border radius (or very close to it) to draw the highlight at
   * the same surface, recoloring the existing line instead of stacking a
   * second one above it.
   */
  readonly surfaceRadius?: number;
}

/**
 * Visible hover indicator: a single LineSegments object that gets its geometry
 * rebuilt to match the currently hovered country's borders. Empty (invisible)
 * when no country is hovered.
 *
 * Sits at a slightly larger radius than the base borders layer so the highlight
 * draws on top instead of fighting with the base color via z-fighting.
 */
export class OutlineSelectionLayer {
  public readonly object: LineSegments;
  private readonly material: LineBasicMaterial;
  private readonly featuresById = new Map<string, CountryFeature>();
  private readonly baseOpacity: number;
  private readonly fadeDuration: number;
  private readonly surfaceRadius: number;
  private currentId: string | null = null;
  private targetT = 0; // 0 → hidden, 1 → fully visible
  private currentT = 0;

  public constructor(options: OutlineSelectionLayerOptions) {
    this.baseOpacity = options.hoverOpacity;
    this.fadeDuration = options.fadeDuration ?? 0.18;
    this.surfaceRadius = options.surfaceRadius ?? GLOBE_RADIUS * 1.0025;
    this.material = new LineBasicMaterial({
      color: new Color(options.hoverColor),
      linewidth: options.hoverWidth,
      transparent: true,
      opacity: 0,
      depthTest: options.occludeBackSide,
    });
    this.object = new LineSegments(new BufferGeometry(), this.material);
    this.object.renderOrder = 10;
    this.object.visible = false;
  }

  public registerFeatures(features: ReadonlyArray<CountryFeature>): void {
    this.featuresById.clear();
    for (const feature of features) {
      this.featuresById.set(feature.id, feature);
    }
  }

  public showCountry(id: string): void {
    if (id !== this.currentId) {
      const feature = this.featuresById.get(id);
      if (!feature) {
        this.targetT = 0;
        return;
      }
      this.rebuildGeometry(feature);
      // When jumping between hovered countries the fade-in restart looks
      // like a flash — keep the existing visibility and just swap geometry.
      if (this.currentId !== null) this.currentT = Math.max(this.currentT, 1);
      this.currentId = id;
    }
    this.targetT = 1;
  }

  public clear(): void {
    this.targetT = 0;
    this.currentId = null;
  }

  /**
   * Live-toggle whether the highlight stroke is masked by the globe
   * sphere when the country rotates to the far hemisphere. `true` =
   * occlude (strict z-test against the sphere, hidden on far side);
   * `false` = always visible (stroke draws through). Mutates the
   * existing material — no rebuild.
   */
  public setOccludeBackSide(occlude: boolean): void {
    this.material.depthTest = occlude;
    this.material.needsUpdate = true;
  }

  /** Step the fade tween. Should be called once per render frame. */
  public update(delta: number): void {
    if (this.currentT === this.targetT) return;
    if (this.fadeDuration <= 0) {
      this.currentT = this.targetT;
    } else {
      const step = delta / this.fadeDuration;
      const dir = this.targetT > this.currentT ? 1 : -1;
      this.currentT = Math.max(0, Math.min(1, this.currentT + dir * step));
    }
    this.material.opacity = this.currentT * this.baseOpacity;
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
