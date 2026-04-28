import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../utils/coordinates';
import type { CountryFeature } from './countries-layer';

export interface CountryHighlightLayerOptions {
  readonly hoverColor: string;
  readonly hoverWidth: number;
}

/**
 * Visible hover indicator: a single LineSegments object that gets its geometry
 * rebuilt to match the currently hovered country's borders. Empty (invisible)
 * when no country is hovered.
 *
 * Sits at a slightly larger radius than the base borders layer so the highlight
 * draws on top instead of fighting with the base color via z-fighting.
 */
export class CountryHighlightLayer {
  public readonly object: LineSegments;
  private readonly material: LineBasicMaterial;
  private readonly featuresById = new Map<string, CountryFeature>();
  private currentId: string | null = null;

  public constructor(options: CountryHighlightLayerOptions) {
    this.material = new LineBasicMaterial({
      color: new Color(options.hoverColor),
      linewidth: options.hoverWidth,
      transparent: true,
      opacity: 1,
      depthTest: false,
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
    if (id === this.currentId) {
      this.object.visible = true;
      return;
    }
    const feature = this.featuresById.get(id);
    if (!feature) {
      this.clear();
      return;
    }
    this.rebuildGeometry(feature);
    this.currentId = id;
    this.object.visible = true;
  }

  public clear(): void {
    this.object.visible = false;
    this.currentId = null;
  }

  public dispose(): void {
    this.object.geometry.dispose();
    this.material.dispose();
    this.featuresById.clear();
  }

  private rebuildGeometry(feature: CountryFeature): void {
    const surfaceRadius = GLOBE_RADIUS * 1.0025;
    const positions: Array<number> = [];

    feature.coordinates.forEach((ring) => {
      if (ring.length < 2) return;
      for (let i = 0; i < ring.length - 1; i++) {
        const a = ring[i];
        const b = ring[i + 1];
        if (!a || !b) continue;
        const v1 = latLngToVector3([a[1], a[0]], surfaceRadius);
        const v2 = latLngToVector3([b[1], b[0]], surfaceRadius);
        positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    this.object.geometry.dispose();
    this.object.geometry = geometry;
  }
}
