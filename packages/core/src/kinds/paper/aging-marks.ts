import {
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { seededJitter } from './jitter';

export interface PaperAgingMarksOptions {
  readonly enabled: boolean;
  readonly count: number;
  readonly color: string;
  readonly intensity: number;
  /** Deterministic seed so marks don't move between rebuilds. */
  readonly seed: number;
}

const MARKS_RADIUS = GLOBE_RADIUS * 1.0015;
const MAX_MARKS = 24;

/**
 * Tea-stain blotches scattered across the parchment surface — small
 * brown discs with feathered edges, sized + placed deterministically
 * from a numeric seed so the same seed always produces the same
 * arrangement.
 *
 * Capped at 24 marks for performance — each mark is a 16-segment
 * circle, so worst-case ~400 triangles. Trivial cost.
 */
export class PaperAgingMarks {
  public readonly group: Group;
  private readonly material: MeshBasicMaterial;
  private liveMeshes: Array<{ mesh: Mesh; geometry: CircleGeometry }> = [];

  private currentCount: number;
  private currentSeed: number;
  private currentIntensity: number;
  private currentColor: string;
  private currentEnabled: boolean;
  private readonly defaultCount: number;
  private readonly defaultSeed: number;
  private readonly defaultIntensity: number;
  private readonly defaultColor: string;

  public constructor(options: PaperAgingMarksOptions) {
    this.group = new Group();
    this.group.name = 'PaperAgingMarks';
    this.currentCount = options.count;
    this.currentSeed = options.seed;
    this.currentIntensity = options.intensity;
    this.currentColor = options.color;
    this.currentEnabled = options.enabled;
    this.defaultCount = options.count;
    this.defaultSeed = options.seed;
    this.defaultIntensity = options.intensity;
    this.defaultColor = options.color;

    this.material = new MeshBasicMaterial({
      color: new Color(options.color),
      transparent: true,
      opacity: options.intensity,
      side: DoubleSide,
      depthWrite: false,
    });
    this.rebuild();
    this.group.visible = options.enabled;
  }

  private rebuild(): void {
    for (const { mesh, geometry } of this.liveMeshes) {
      mesh.removeFromParent();
      geometry.dispose();
    }
    this.liveMeshes = [];

    const count = Math.max(0, Math.min(MAX_MARKS, Math.round(this.currentCount)));
    for (let i = 0; i < count; i++) {
      const key = `aging|${this.currentSeed}|${i}`;
      // seededJitter is in [-0.5, 0.5]; remap to lat/lng.
      const lat = seededJitter(`${key}|lat`) * 160; // ±80
      const lng = seededJitter(`${key}|lng`) * 360; // ±180
      // Size in radians on the sphere — 0.5°..3°.
      const sizeRad = ((seededJitter(`${key}|size`) + 0.5) * 2.5 + 0.5) * (Math.PI / 180);
      const radius = sizeRad * GLOBE_RADIUS;

      const geometry = new CircleGeometry(radius, 16);
      const mesh = new Mesh(geometry, this.material);
      const pos = latLngToVector3([lat, lng], MARKS_RADIUS);
      mesh.position.copy(pos);
      // Orient the disc so its normal points away from the globe center.
      const outward = pos.clone().normalize();
      mesh.lookAt(new Vector3(0, 0, 0));
      mesh.rotateY(Math.PI);
      // Tiny per-mark spin so the discs don't all align.
      mesh.rotateZ(seededJitter(`${key}|rot`) * Math.PI * 2);
      // Slight per-mark scale variation.
      const scale = 1 + seededJitter(`${key}|s2`) * 0.5;
      mesh.scale.setScalar(scale);
      // Keep the unused outward var meaningful for future shading hooks.
      void outward;

      this.group.add(mesh);
      this.liveMeshes.push({ mesh, geometry });
    }
  }

  public setEnabled(enabled: boolean): void {
    this.currentEnabled = enabled;
    this.group.visible = enabled;
  }

  public setColor(color: string): void {
    this.currentColor = color;
    this.material.color.set(color);
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  public setIntensity(intensity: number): void {
    this.currentIntensity = Math.max(0, Math.min(1, intensity));
    this.material.opacity = this.currentIntensity;
  }

  public resetIntensity(): void {
    this.setIntensity(this.defaultIntensity);
  }

  public setCount(count: number): void {
    if (count === this.currentCount) return;
    this.currentCount = Math.max(0, Math.min(MAX_MARKS, Math.round(count)));
    this.rebuild();
  }

  public resetCount(): void {
    this.setCount(this.defaultCount);
  }

  public setSeed(seed: number): void {
    if (seed === this.currentSeed) return;
    this.currentSeed = seed;
    this.rebuild();
  }

  public resetSeed(): void {
    this.setSeed(this.defaultSeed);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible && this.currentEnabled;
  }

  public dispose(): void {
    for (const { geometry } of this.liveMeshes) geometry.dispose();
    this.liveMeshes = [];
    this.material.dispose();
    this.group.clear();
  }
}
