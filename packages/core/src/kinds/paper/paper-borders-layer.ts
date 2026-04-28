import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryFeature } from '../../renderer/country-feature';
import { jitterRing } from './paper-jitter';

export interface PaperBordersLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly opacity: number;
  readonly roughness: number;
}

const SURFACE_RADIUS = GLOBE_RADIUS * 1.001;
const BLEED_RADIUS = GLOBE_RADIUS * 1.0008;
const BLEED_OPACITY_FACTOR = 0.35;

/**
 * Hand-drawn-feeling country borders. Ring vertices get a deterministic
 * perpendicular jitter baked in (no per-frame shader cost) before being
 * projected to 3D, then drawn as `LineSegments`. Two passes — a faint wider
 * "ink bleed" pass underneath plus a tight crisp pass on top — read like
 * a pen drawn through absorbent paper.
 */
export class PaperBordersLayer {
  public readonly group: Group;
  private readonly geometries: Array<BufferGeometry> = [];
  private readonly materials: Array<LineBasicMaterial> = [];

  public constructor(options: PaperBordersLayerOptions) {
    this.group = new Group();
    this.group.name = 'PaperBordersLayer';

    const bleedMaterial = new LineBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: options.opacity * BLEED_OPACITY_FACTOR,
    });
    const inkMaterial = new LineBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: options.opacity,
    });
    this.materials.push(bleedMaterial, inkMaterial);

    options.features.forEach((feature) => {
      feature.coordinates.forEach((ring, ringIdx) => {
        if (ring.length < 2) return;
        const seed = `${feature.id}#${ringIdx}`;
        const jittered = jitterRing(ring, options.roughness, seed);

        const inkPositions: Array<number> = [];
        const bleedPositions: Array<number> = [];
        for (let i = 0; i < jittered.length - 1; i++) {
          const a = jittered[i];
          const b = jittered[i + 1];
          if (!a || !b) continue;
          const v1 = latLngToVector3([a[1], a[0]], SURFACE_RADIUS);
          const v2 = latLngToVector3([b[1], b[0]], SURFACE_RADIUS);
          inkPositions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
          const w1 = latLngToVector3([a[1], a[0]], BLEED_RADIUS);
          const w2 = latLngToVector3([b[1], b[0]], BLEED_RADIUS);
          bleedPositions.push(w1.x, w1.y, w1.z, w2.x, w2.y, w2.z);
        }
        if (inkPositions.length === 0) return;

        const inkGeometry = new BufferGeometry();
        inkGeometry.setAttribute('position', new Float32BufferAttribute(inkPositions, 3));
        const bleedGeometry = new BufferGeometry();
        bleedGeometry.setAttribute('position', new Float32BufferAttribute(bleedPositions, 3));
        this.geometries.push(inkGeometry, bleedGeometry);

        const bleed = new LineSegments(bleedGeometry, bleedMaterial);
        bleed.userData['countryId'] = feature.id;
        const ink = new LineSegments(inkGeometry, inkMaterial);
        ink.userData['countryId'] = feature.id;
        this.group.add(bleed);
        this.group.add(ink);
      });
    });
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.group.clear();
  }
}
