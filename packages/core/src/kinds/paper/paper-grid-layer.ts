import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';

export interface PaperGridLayerOptions {
  readonly color: string;
  readonly opacity: number;
}

const GRID_RADIUS = GLOBE_RADIUS * 1.0004;
const SAMPLE_STEP_DEG = 4;
const STEP_DEG = 15;

/**
 * Faint warm-grey atlas registration grid. Equirectangular lat/lng lines
 * sampled at a coarse density so they read as a printed grid behind the
 * land, not a sci-fi wireframe. No animation, no shader — just static
 * `LineSegments` at low opacity.
 */
export class PaperGridLayer {
  public readonly group: Group;
  private readonly geometry: BufferGeometry;
  private readonly material: LineBasicMaterial;

  public constructor(options: PaperGridLayerOptions) {
    this.group = new Group();
    this.group.name = 'PaperGridLayer';

    const positions: Array<number> = [];
    for (let lat = -90 + STEP_DEG; lat <= 90 - STEP_DEG + 1e-6; lat += STEP_DEG) {
      let prev = latLngToVector3([lat, -180], GRID_RADIUS);
      for (let lng = -180 + SAMPLE_STEP_DEG; lng <= 180 + 1e-6; lng += SAMPLE_STEP_DEG) {
        const next = latLngToVector3([lat, lng], GRID_RADIUS);
        positions.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
        prev = next;
      }
    }
    for (let lng = -180; lng <= 180 - STEP_DEG + 1e-6; lng += STEP_DEG) {
      let prev = latLngToVector3([-90, lng], GRID_RADIUS);
      for (let lat = -90 + SAMPLE_STEP_DEG; lat <= 90 + 1e-6; lat += SAMPLE_STEP_DEG) {
        const next = latLngToVector3([lat, lng], GRID_RADIUS);
        positions.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
        prev = next;
      }
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new Float32BufferAttribute(new Float32Array(positions), 3)
    );
    this.material = new LineBasicMaterial({
      color: options.color,
      transparent: true,
      opacity: options.opacity,
      depthWrite: false,
    });

    this.group.add(new LineSegments(this.geometry, this.material));
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
