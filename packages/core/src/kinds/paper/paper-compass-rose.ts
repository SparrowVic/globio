import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';

export interface PaperCompassRoseOptions {
  readonly enabled: boolean;
  readonly lat: number;
  readonly lng: number;
  readonly color: string;
  readonly opacity: number;
  /** Angular radius in degrees (great-circle arc). Default 8°. */
  readonly size: number;
}

const COMPASS_RADIUS = GLOBE_RADIUS * 1.0006;

/**
 * Compass rose rendered on the parchment surface as a tangent-plane line
 * drawing — eight cardinal points (N / NE / E / SE / S / SW / W / NW),
 * a star-shaped frame, and a fleur-de-lis-style north tip.
 *
 * Anchored at a chosen lat/lng (default North Atlantic, like real
 * 16th-century atlases). The rose is built once in tangent space at the
 * anchor, projected to world coordinates via `latLngToVector3` for each
 * point — keeps the rose's outline geographically anchored when the
 * camera orbits.
 */
export class PaperCompassRose {
  public readonly group: Group;
  private readonly material: LineBasicMaterial;
  private readonly geometry: BufferGeometry;
  private currentLat: number;
  private currentLng: number;
  private currentSize: number;
  private currentColor: string;
  private currentOpacity: number;
  private readonly defaultLat: number;
  private readonly defaultLng: number;
  private readonly defaultSize: number;
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;

  public constructor(options: PaperCompassRoseOptions) {
    this.group = new Group();
    this.group.name = 'PaperCompassRose';
    this.currentLat = options.lat;
    this.currentLng = options.lng;
    this.currentSize = options.size;
    this.currentColor = options.color;
    this.currentOpacity = options.opacity;
    this.defaultLat = options.lat;
    this.defaultLng = options.lng;
    this.defaultSize = options.size;
    this.defaultColor = options.color;
    this.defaultOpacity = options.opacity;

    this.material = new LineBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: this.currentOpacity,
      depthWrite: false,
    });
    this.geometry = new BufferGeometry();

    this.rebuild();
    this.group.visible = options.enabled;
  }

  /**
   * Build the rose geometry. We work in a local tangent frame at
   * (lat, lng): two basis vectors `east` and `north`, then project
   * each tangent-plane point back onto the sphere by re-evaluating
   * lat/lng via small-angle approximation.
   */
  private rebuild(): void {
    const positions: Array<number> = [];
    const sizeRad = (this.currentSize * Math.PI) / 180;

    // For each rose point we compute (lat, lng) offsets in degrees from
    // the anchor by treating sizeRad as a small-angle offset along the
    // tangent. This is good enough at <20° rose sizes, which is all we
    // expect for an atlas watermark.
    const ptAt = (rx: number, ry: number): Vector3 => {
      // rx/ry are unit-circle coords. Multiply by sizeRad → tangent
      // offset; convert tangent offset → lat/lng diff.
      const dLatRad = ry * sizeRad;
      const dLat = (dLatRad * 180) / Math.PI;
      const cosLat = Math.cos((this.currentLat * Math.PI) / 180);
      const dLngRad = rx * sizeRad / Math.max(0.05, cosLat);
      const dLng = (dLngRad * 180) / Math.PI;
      return latLngToVector3(
        [this.currentLat + dLat, this.currentLng + dLng],
        COMPASS_RADIUS
      );
    };

    const pushSegment = (a: Vector3, b: Vector3): void => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    };

    // Outer circle — 64 segments.
    const center = ptAt(0, 0);
    const outerR = 1.0;
    const innerR = 0.42;
    const ringR = 0.85;
    let prev = ptAt(outerR, 0);
    const SEG = 64;
    for (let i = 1; i <= SEG; i++) {
      const t = (i / SEG) * Math.PI * 2;
      const next = ptAt(outerR * Math.cos(t), outerR * Math.sin(t));
      pushSegment(prev, next);
      prev = next;
    }
    // Inner ring — 32 segments.
    prev = ptAt(ringR, 0);
    for (let i = 1; i <= 32; i++) {
      const t = (i / 32) * Math.PI * 2;
      const next = ptAt(ringR * Math.cos(t), ringR * Math.sin(t));
      pushSegment(prev, next);
      prev = next;
    }

    // Eight points of the rose (N, NE, E, SE, S, SW, W, NW).
    const angles = Array.from({ length: 8 }, (_, k) => (k / 8) * Math.PI * 2);
    for (const a of angles) {
      const tipX = outerR * Math.cos(a);
      const tipY = outerR * Math.sin(a);
      // Two flank points to close the diamond shape.
      const flankL = (a + Math.PI / 8 + Math.PI / 16) - Math.PI / 16;
      const flankR = (a - Math.PI / 8 - Math.PI / 16) + Math.PI / 16;
      const fl = ptAt(innerR * Math.cos(flankL), innerR * Math.sin(flankL));
      const fr = ptAt(innerR * Math.cos(flankR), innerR * Math.sin(flankR));
      const tip = ptAt(tipX, tipY);
      pushSegment(center, tip);
      pushSegment(fl, tip);
      pushSegment(fr, tip);
      pushSegment(fl, fr);
    }

    // North fleur-de-lis flourish — small extra triangle above the N tip.
    const nTip = ptAt(0, outerR);
    const nFleur = ptAt(0, outerR * 1.18);
    const nL = ptAt(-0.07, outerR * 1.05);
    const nR = ptAt(0.07, outerR * 1.05);
    pushSegment(nTip, nFleur);
    pushSegment(nL, nFleur);
    pushSegment(nR, nFleur);
    pushSegment(nL, nR);

    // Cardinal "N" mark — small segment above the fleur, two strokes.
    const nA = ptAt(-0.05, outerR * 1.32);
    const nB = ptAt(-0.05, outerR * 1.5);
    const nC = ptAt(0.05, outerR * 1.32);
    const nD = ptAt(0.05, outerR * 1.5);
    pushSegment(nA, nB);
    pushSegment(nB, nC);
    pushSegment(nC, nD);

    // Build the geometry.
    this.geometry.dispose();
    const fresh = new BufferGeometry();
    fresh.setAttribute('position', new Float32BufferAttribute(positions, 3));
    // Replace internals.
    (this as { geometry: BufferGeometry }).geometry = fresh;

    // Re-assemble the group.
    this.group.clear();
    this.group.add(new LineSegments(fresh, this.material));
  }

  public setEnabled(enabled: boolean): void {
    this.group.visible = enabled;
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

  public setPosition(lat: number, lng: number): void {
    this.currentLat = lat;
    this.currentLng = lng;
    this.rebuild();
  }

  public resetPosition(): void {
    this.setPosition(this.defaultLat, this.defaultLng);
  }

  public setSize(size: number): void {
    if (size === this.currentSize) return;
    this.currentSize = Math.max(1, size);
    this.rebuild();
  }

  public resetSize(): void {
    this.setSize(this.defaultSize);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }
}
