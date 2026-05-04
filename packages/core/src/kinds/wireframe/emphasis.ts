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
  /** Override the strong (equator + tropics) color. If omitted falls back to `color`. */
  readonly strongColor?: string;
  /** Override the weak (meridians) color. If omitted falls back to `color`. */
  readonly weakColor?: string;
  /** Strong-line opacity (defaults to `opacity`). */
  readonly strongOpacity?: number;
  /** Weak-line opacity factor relative to base. Default 0.5. */
  readonly weakOpacityFactor?: number;
}

const SAMPLE_STEP_DEG = 3;
const STRONG_LATS = [0, 23.43, -23.43] as const;
const WEAK_LNGS = [0, 180] as const;
const DEFAULT_WEAK_OPACITY_FACTOR = 0.5;

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
 * without per-vertex attributes. Live setters mutate the materials in
 * place — no geometry rebuild on a color/opacity change.
 */
export class WireframeEmphasisLayer {
  public readonly group: Group;
  private readonly strongGeometry: BufferGeometry;
  private readonly weakGeometry: BufferGeometry;
  private readonly strongMaterial: LineBasicMaterial;
  private readonly weakMaterial: LineBasicMaterial;
  private readonly originalColor: string;
  private readonly originalStrongColor: string;
  private readonly originalWeakColor: string;
  private baseOpacity: number;
  private weakFactor: number;

  public constructor(options: WireframeEmphasisLayerOptions) {
    this.group = new Group();
    this.originalColor = options.color;
    this.originalStrongColor = options.strongColor ?? options.color;
    this.originalWeakColor = options.weakColor ?? options.color;
    this.baseOpacity = options.strongOpacity ?? options.opacity;
    this.weakFactor = options.weakOpacityFactor ?? DEFAULT_WEAK_OPACITY_FACTOR;

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
      color: this.originalStrongColor,
      transparent: true,
      opacity: this.baseOpacity,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.weakMaterial = new LineBasicMaterial({
      color: this.originalWeakColor,
      transparent: true,
      opacity: this.baseOpacity * this.weakFactor,
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

  /* ───────── live setters ───────── */

  public setStrongColor(color: string): void {
    this.strongMaterial.color.set(color);
  }

  public resetStrongColor(): void {
    this.strongMaterial.color.set(this.originalStrongColor);
  }

  public setWeakColor(color: string): void {
    this.weakMaterial.color.set(color);
  }

  public resetWeakColor(): void {
    this.weakMaterial.color.set(this.originalWeakColor);
  }

  public setStrongOpacity(opacity: number): void {
    this.baseOpacity = Math.max(0, Math.min(1, opacity));
    this.strongMaterial.opacity = this.baseOpacity;
    this.weakMaterial.opacity = this.baseOpacity * this.weakFactor;
  }

  public setWeakOpacityFactor(factor: number): void {
    this.weakFactor = Math.max(0, Math.min(1, factor));
    this.weakMaterial.opacity = this.baseOpacity * this.weakFactor;
  }
}
