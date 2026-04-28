import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { latLngToVector3 } from '../../utils/coordinates';

export interface WireframeEmphasisLayerOptions {
  readonly color: string;
  readonly opacity: number;
  readonly radius: number;
}

const SAMPLE_STEP_DEG = 3;
const STRONG_LATS = [0, 23.43, -23.43] as const;
const WEAK_LNGS = [0, 180] as const;
const WEAK_OPACITY_FACTOR = 0.5;

const generateParallel = (lat: number, radius: number, out: Array<number>): void => {
  let prev = latLngToVector3([lat, -180], radius);
  for (let lng = -180 + SAMPLE_STEP_DEG; lng <= 180 + 1e-6; lng += SAMPLE_STEP_DEG) {
    const next = latLngToVector3([lat, lng], radius);
    out.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
    prev = next;
  }
};

const generateMeridian = (lng: number, radius: number, out: Array<number>): void => {
  let prev = latLngToVector3([-90, lng], radius);
  for (let lat = -90 + SAMPLE_STEP_DEG; lat <= 90 + 1e-6; lat += SAMPLE_STEP_DEG) {
    const next = latLngToVector3([lat, lng], radius);
    out.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
    prev = next;
  }
};

/**
 * Equator + tropics + prime/anti-meridian as a separate LineSegments on a
 * slightly inflated radius so they read as "above" the regular grid. Two
 * sub-meshes split by emphasis strength so we can color them differently
 * without per-vertex attributes.
 */
export class WireframeEmphasisLayer {
  public readonly group: Group;
  private readonly strongGeometry: BufferGeometry;
  private readonly weakGeometry: BufferGeometry;
  private readonly strongMaterial: LineBasicMaterial;
  private readonly weakMaterial: LineBasicMaterial;

  public constructor(options: WireframeEmphasisLayerOptions) {
    this.group = new Group();

    const strong: Array<number> = [];
    for (const lat of STRONG_LATS) generateParallel(lat, options.radius, strong);
    const weak: Array<number> = [];
    for (const lng of WEAK_LNGS) generateMeridian(lng, options.radius, weak);

    this.strongGeometry = new BufferGeometry();
    this.strongGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array(strong), 3)
    );
    this.weakGeometry = new BufferGeometry();
    this.weakGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array(weak), 3)
    );

    this.strongMaterial = new LineBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: options.opacity,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.weakMaterial = new LineBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: options.opacity * WEAK_OPACITY_FACTOR,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.group.add(new LineSegments(this.strongGeometry, this.strongMaterial));
    this.group.add(new LineSegments(this.weakGeometry, this.weakMaterial));
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.strongGeometry.dispose();
    this.weakGeometry.dispose();
    this.strongMaterial.dispose();
    this.weakMaterial.dispose();
    this.group.clear();
  }
}
