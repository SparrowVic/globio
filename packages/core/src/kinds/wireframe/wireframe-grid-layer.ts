import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';

export interface WireframeGridLayerOptions {
  readonly color: string;
  readonly opacity: number;
  readonly density: number;
  readonly pulse: number;
  readonly pulseSpeed?: number;
  readonly radius: number;
}

const SAMPLE_STEP_DEG = 3;
const BASE_STEP_DEG = 15;
const DEFAULT_PULSE_HZ = 0.5;

/**
 * Build the lat/lng grid as flat Float32 segment positions. Pure helper —
 * tests live on this so we can verify density / radius without a GL context.
 */
export const generateGridSegments = (
  density: number,
  radius: number
): { positions: Float32Array; segmentCount: number } => {
  const safeDensity = density > 0 ? density : 1;
  const step = BASE_STEP_DEG / safeDensity;
  const positions: Array<number> = [];

  // Parallels: skip the poles (a single point — no useful circle there).
  for (let lat = -90 + step; lat <= 90 - step + 1e-6; lat += step) {
    let prev = latLngToVector3([lat, -180], radius);
    for (let lng = -180 + SAMPLE_STEP_DEG; lng <= 180 + 1e-6; lng += SAMPLE_STEP_DEG) {
      const next = latLngToVector3([lat, lng], radius);
      positions.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
      prev = next;
    }
  }

  // Meridians: half-circles pole to pole.
  for (let lng = -180; lng <= 180 - step + 1e-6; lng += step) {
    let prev = latLngToVector3([-90, lng], radius);
    for (let lat = -90 + SAMPLE_STEP_DEG; lat <= 90 + 1e-6; lat += SAMPLE_STEP_DEG) {
      const next = latLngToVector3([lat, lng], radius);
      positions.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
      prev = next;
    }
  }

  const float = new Float32Array(positions);
  return { positions: float, segmentCount: float.length / 6 };
};

export class WireframeGridLayer {
  public readonly group: Group;
  private readonly geometry: BufferGeometry;
  private readonly material: LineBasicMaterial;
  private readonly baseOpacity: number;
  private readonly pulseAmplitude: number;
  private readonly pulseSpeed: number;

  public constructor(options: WireframeGridLayerOptions) {
    this.group = new Group();
    this.baseOpacity = options.opacity;
    this.pulseAmplitude = Math.max(0, Math.min(1, options.pulse));
    this.pulseSpeed = options.pulseSpeed ?? DEFAULT_PULSE_HZ;

    const { positions } = generateGridSegments(options.density, options.radius);
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    this.material = new LineBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: this.baseOpacity,
      depthWrite: false,
    });

    this.group.add(new LineSegments(this.geometry, this.material));
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /** Step the pulse animation. Call once per render frame. */
  public update(elapsedSeconds: number): void {
    if (this.pulseAmplitude <= 0) return;
    const wave = Math.sin(elapsedSeconds * this.pulseSpeed * 2 * Math.PI);
    const next = this.baseOpacity + wave * this.pulseAmplitude * this.baseOpacity;
    this.material.opacity = Math.max(0, Math.min(1, next));
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }
}

export const WIREFRAME_DEFAULT_RADIUS = GLOBE_RADIUS * 1.0005;
