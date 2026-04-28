import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../utils/coordinates';
import type { MarkerConfig } from '../types';

export interface MarkersLayerOptions {
  readonly maxMarkers?: number;
  readonly defaultColor: string;
  readonly defaultSize?: number;
}

interface MarkerSlot {
  readonly index: number;
  readonly marker: MarkerConfig;
}

export class MarkersLayer {
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
  private readonly maxMarkers: number;

  public constructor(options: MarkersLayerOptions) {
    this.maxMarkers = options.maxMarkers ?? 10000;
    this.defaultColor = options.defaultColor;
    this.defaultSize = options.defaultSize ?? 0.012;

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
      throw new Error(`MarkersLayer: max markers (${this.maxMarkers}) reached`);
    }
    this.slots.set(marker.id, { index, marker });
    this.applyToInstance(index, marker);
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

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }

  private updateMarker(marker: MarkerConfig): void {
    const slot = this.slots.get(marker.id);
    if (!slot) return;
    this.slots.set(marker.id, { ...slot, marker });
    this.applyToInstance(slot.index, marker);
  }

  private applyToInstance(index: number, marker: MarkerConfig): void {
    const sizeMultiplier = marker.size ?? 1;
    const finalScale = this.defaultSize * sizeMultiplier;
    const surface = latLngToVector3(marker.position, GLOBE_RADIUS, this.tempVector);

    this.dummy.position.copy(surface);
    this.dummy.scale.setScalar(finalScale);
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
