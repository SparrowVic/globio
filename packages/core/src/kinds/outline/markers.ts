import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { MarkerConfig } from '../../types';

export interface OutlineMarkersLayerOptions {
  readonly maxMarkers?: number;
  readonly defaultColor: string;
  readonly defaultSize?: number;
  /**
   * Multiplier applied to a marker's size when hovered. Default 1.5.
   * The change is animated via a 0.15s ease toward the target scale.
   */
  readonly hoverScale?: number;
}

interface MarkerSlot {
  readonly index: number;
  readonly marker: MarkerConfig;
  /** Currently rendered scale (eased toward target). */
  currentScale: number;
}

const DEFAULT_PULSE_SPEED = 1.5;
const DEFAULT_PULSE_AMPLITUDE = 0.4;
const HOVER_EASE_SECONDS = 0.15;

/** Resolve a per-marker `pulse` config to concrete params, or null if disabled. */
const pulseParams = (
  pulse: MarkerConfig['pulse']
): { speed: number; amplitude: number } | null => {
  if (!pulse) return null;
  if (pulse === true) return { speed: DEFAULT_PULSE_SPEED, amplitude: DEFAULT_PULSE_AMPLITUDE };
  return {
    speed: pulse.speed ?? DEFAULT_PULSE_SPEED,
    amplitude: pulse.amplitude ?? DEFAULT_PULSE_AMPLITUDE,
  };
};

export class OutlineMarkersLayer {
  public readonly mesh: InstancedMesh;
  private readonly geometry: SphereGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly slots = new Map<string, MarkerSlot>();
  private readonly freeIndices: Array<number> = [];
  private readonly dummy = new Object3D();
  private readonly tempColor = new Color();
  private readonly tempVector = new Vector3();
  private readonly defaultColor: string;
  private readonly defaultSize: number;
  private readonly hoverScale: number;
  private readonly maxMarkers: number;
  private hoveredId: string | null = null;
  private elapsed = 0;

  public constructor(options: OutlineMarkersLayerOptions) {
    this.maxMarkers = options.maxMarkers ?? 10000;
    this.defaultColor = options.defaultColor;
    this.defaultSize = options.defaultSize ?? 0.012;
    this.hoverScale = options.hoverScale ?? 1.5;

    this.geometry = new SphereGeometry(1, 8, 8);
    this.material = new MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new InstancedMesh(this.geometry, this.material, this.maxMarkers);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    for (let i = this.maxMarkers - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }
  }

  public setMarkers(markers: ReadonlyArray<MarkerConfig>): void {
    this.clearAll();
    markers.forEach((marker) => this.addMarker(marker));
  }

  public addMarker(marker: MarkerConfig): void {
    if (this.slots.has(marker.id)) {
      this.updateMarker(marker);
      return;
    }
    const index = this.freeIndices.pop();
    if (index === undefined) {
      throw new Error(`OutlineMarkersLayer: max markers (${this.maxMarkers}) reached`);
    }
    const baseScale = this.defaultSize * (marker.size ?? 1);
    this.slots.set(marker.id, { index, marker, currentScale: baseScale });
    this.applyToInstance(index, marker, baseScale);
    this.refreshCount();
  }

  public removeMarker(id: string): void {
    const slot = this.slots.get(id);
    if (!slot) return;
    this.dummy.position.set(0, 0, 0);
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(slot.index, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.slots.delete(id);
    this.freeIndices.push(slot.index);
    this.refreshCount();
  }

  public getMarkerByInstanceId(instanceId: number): MarkerConfig | null {
    for (const slot of this.slots.values()) {
      if (slot.index === instanceId) return slot.marker;
    }
    return null;
  }

  /**
   * Mark a single marker as hovered (or none with `null`). The hovered
   * marker eases up to `hoverScale × baseSize`; previously hovered marker
   * eases back down.
   */
  public setHovered(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
  }

  /** Step pulse and hover-ease tweens. Should be called once per render frame. */
  public update(delta: number): void {
    this.elapsed += delta;
    if (this.slots.size === 0) return;
    const k = Math.min(1, delta / HOVER_EASE_SECONDS);
    this.slots.forEach((slot, id) => {
      const baseScale = this.defaultSize * (slot.marker.size ?? 1);
      const pulse = pulseParams(slot.marker.pulse);
      const pulsed = pulse
        ? baseScale * (1 + pulse.amplitude * Math.sin(this.elapsed * pulse.speed * 2 * Math.PI))
        : baseScale;
      const target = id === this.hoveredId ? pulsed * this.hoverScale : pulsed;
      const next = slot.currentScale + (target - slot.currentScale) * k;
      const changed = Math.abs(next - slot.currentScale) > 1e-6 || pulse !== null;
      slot.currentScale = next;
      if (changed) {
        this.applyToInstance(slot.index, slot.marker, slot.currentScale);
      }
    });
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }

  private updateMarker(marker: MarkerConfig): void {
    const slot = this.slots.get(marker.id);
    if (!slot) return;
    const baseScale = this.defaultSize * (marker.size ?? 1);
    this.slots.set(marker.id, { ...slot, marker, currentScale: baseScale });
    this.applyToInstance(slot.index, marker, baseScale);
  }

  private applyToInstance(index: number, marker: MarkerConfig, scale: number): void {
    const surface = latLngToVector3(marker.position, GLOBE_RADIUS, this.tempVector);

    this.dummy.position.copy(surface);
    this.dummy.scale.setScalar(scale);
    this.dummy.lookAt(0, 0, 0);
    this.dummy.updateMatrix();

    this.mesh.setMatrixAt(index, this.dummy.matrix);
    this.tempColor.set(marker.color ?? this.defaultColor);
    this.mesh.setColorAt(index, this.tempColor);

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  private clearAll(): void {
    const zero = new Matrix4().makeScale(0, 0, 0);
    this.slots.forEach((slot) => {
      this.mesh.setMatrixAt(slot.index, zero);
      this.freeIndices.push(slot.index);
    });
    this.slots.clear();
    this.mesh.instanceMatrix.needsUpdate = true;
    this.refreshCount();
  }

  private refreshCount(): void {
    this.mesh.count = this.slots.size;
  }
}
