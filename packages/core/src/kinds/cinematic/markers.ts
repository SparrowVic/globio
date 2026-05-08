import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { MarkerConfig } from '../../types';

export interface CinematicMarkersLayerOptions {
  readonly maxMarkers?: number;
  readonly defaultColor: string;
  readonly defaultSize?: number;
  readonly hoverScale?: number;
}

interface MarkerSlot {
  readonly index: number;
  readonly marker: MarkerConfig;
  currentScale: number;
}

const DEFAULT_PULSE_SPEED = 1.25;
const DEFAULT_PULSE_AMPLITUDE = 0.26;
const HOVER_EASE_SECONDS = 0.16;
const MARKER_LIFT = GLOBE_RADIUS * 1.0105;

export class CinematicMarkersLayer {
  public readonly mesh: InstancedMesh;
  private readonly geometry: SphereGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly slots = new Map<string, MarkerSlot>();
  private readonly freeIndices: number[] = [];
  private readonly dummy = new Object3D();
  private readonly tempColor = new Color();
  private readonly tempVector = new Vector3();
  private readonly defaultColor: string;
  private readonly defaultSize: number;
  private readonly hoverScale: number;
  private readonly maxMarkers: number;
  private hoveredId: string | null = null;
  private elapsed = 0;
  private overlay: LineSegments | null = null;
  private overlayGeometry: BufferGeometry | null = null;
  private readonly overlayMaterial: LineBasicMaterial;
  private batchOverlayRebuild = false;

  public constructor(options: CinematicMarkersLayerOptions) {
    this.maxMarkers = options.maxMarkers ?? 10000;
    this.defaultColor = options.defaultColor;
    this.defaultSize = options.defaultSize ?? 0.012;
    this.hoverScale = options.hoverScale ?? 1.42;

    this.geometry = new SphereGeometry(1, 14, 10);
    this.material = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.mesh = new InstancedMesh(this.geometry, this.material, this.maxMarkers);
    this.mesh.name = 'CinematicMarkersLayer';
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;

    for (let i = this.maxMarkers - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }

    this.overlayMaterial = new LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.76,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }

  public setMarkers(markers: ReadonlyArray<MarkerConfig>): void {
    this.batchOverlayRebuild = true;
    this.clearAll();
    markers.forEach((marker) => this.addMarker(marker));
    this.batchOverlayRebuild = false;
    this.rebuildOverlay();
  }

  public addMarker(marker: MarkerConfig): void {
    if (this.slots.has(marker.id)) {
      this.updateMarker(marker);
      return;
    }
    const index = this.freeIndices.pop();
    if (index === undefined) {
      throw new Error(`CinematicMarkersLayer: max markers (${this.maxMarkers}) reached`);
    }
    const baseScale = this.defaultSize * (marker.size ?? 1);
    this.slots.set(marker.id, { index, marker, currentScale: baseScale });
    this.applyToInstance(index, marker, baseScale);
    this.refreshCount();
    if (!this.batchOverlayRebuild) this.rebuildOverlay();
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
    if (this.hoveredId === id) this.hoveredId = null;
    this.refreshCount();
    this.rebuildOverlay();
  }

  public getMarkerByInstanceId(instanceId: number): MarkerConfig | null {
    for (const slot of this.slots.values()) {
      if (slot.index === instanceId) return slot.marker;
    }
    return null;
  }

  public setHovered(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.rebuildOverlay();
  }

  public update(delta: number): void {
    this.elapsed += delta;
    if (this.slots.size === 0) return;
    const k = Math.min(1, delta / HOVER_EASE_SECONDS);
    let changedAny = false;
    this.slots.forEach((slot, id) => {
      const baseScale = this.defaultSize * (slot.marker.size ?? 1);
      const pulse = pulseParams(slot.marker.pulse);
      const pulsed = pulse
        ? baseScale * (1 + pulse.amplitude * Math.sin(this.elapsed * pulse.speed * Math.PI * 2))
        : baseScale;
      const hoverScale = slot.marker.hoverScale ?? this.hoverScale;
      const target = id === this.hoveredId ? pulsed * hoverScale : pulsed;
      const next = slot.currentScale + (target - slot.currentScale) * k;
      const changed = Math.abs(next - slot.currentScale) > 1e-6 || pulse !== null;
      slot.currentScale = next;
      if (changed) {
        this.applyToInstance(slot.index, slot.marker, next);
        changedAny = true;
      }
    });
    if (changedAny) {
      this.overlayMaterial.opacity = 0.66 + 0.1 * Math.sin(this.elapsed * 2.4);
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
    this.disposeOverlay();
    this.overlayMaterial.dispose();
  }

  private updateMarker(marker: MarkerConfig): void {
    const slot = this.slots.get(marker.id);
    if (!slot) return;
    const baseScale = this.defaultSize * (marker.size ?? 1);
    this.slots.set(marker.id, { ...slot, marker, currentScale: baseScale });
    this.applyToInstance(slot.index, marker, baseScale);
    this.rebuildOverlay();
  }

  private applyToInstance(index: number, marker: MarkerConfig, scale: number): void {
    const surface = latLngToVector3(marker.position, MARKER_LIFT, this.tempVector);
    this.dummy.position.copy(surface);
    this.dummy.scale.setScalar(scale);
    this.dummy.lookAt(0, 0, 0);
    this.dummy.updateMatrix();

    this.mesh.setMatrixAt(index, this.dummy.matrix);
    this.tempColor.set(marker.color ?? this.defaultColor);
    this.mesh.setColorAt(index, this.tempColor);
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
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
    this.disposeOverlay();
  }

  private refreshCount(): void {
    if (this.slots.size === 0) {
      this.mesh.count = 0;
      return;
    }
    let maxIndex = 0;
    this.slots.forEach((slot) => {
      maxIndex = Math.max(maxIndex, slot.index);
    });
    this.mesh.count = maxIndex + 1;
  }

  private rebuildOverlay(): void {
    this.disposeOverlay();
    if (this.slots.size === 0) return;

    const positions: number[] = [];
    const colors: number[] = [];
    const center = new Vector3();
    const normal = new Vector3();
    const tangent = new Vector3();
    const bitangent = new Vector3();
    const tmpA = new Vector3();
    const tmpB = new Vector3();
    const color = new Color();
    const white = new Color('#fff6d8');

    const pushSegment = (a: Vector3, b: Vector3, c: Color): void => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    };

    const pushRing = (
      origin: Vector3,
      radius: number,
      segments: number,
      drawColor: Color,
      gapEvery: number,
    ): void => {
      for (let i = 0; i < segments; i++) {
        if (gapEvery > 0 && i % gapEvery === gapEvery - 1) continue;
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        tmpA
          .copy(origin)
          .addScaledVector(tangent, Math.cos(a0) * radius)
          .addScaledVector(bitangent, Math.sin(a0) * radius);
        tmpB
          .copy(origin)
          .addScaledVector(tangent, Math.cos(a1) * radius)
          .addScaledVector(bitangent, Math.sin(a1) * radius);
        pushSegment(tmpA, tmpB, drawColor);
      }
    };

    this.slots.forEach((slot, id) => {
      const drawColor = color
        .set(slot.marker.color ?? this.defaultColor)
        .lerp(white, id === this.hoveredId ? 0.42 : 0.12);
      latLngToVector3(slot.marker.position, MARKER_LIFT, center);
      normal.copy(center).normalize();
      buildBasis(normal, tangent, bitangent);
      const size = this.defaultSize * (slot.marker.size ?? 1);
      const radius = 0.008 + size * 0.85;
      const hover = id === this.hoveredId;
      pushRing(center, radius, 24, drawColor, hover ? 0 : 5);
      pushRing(center, radius * 1.75, 32, drawColor, hover ? 0 : 4);
      pushSegment(
        tmpA.copy(center).addScaledVector(tangent, -radius * 0.62),
        tmpB.copy(center).addScaledVector(tangent, radius * 0.62),
        drawColor,
      );
      pushSegment(
        tmpA.copy(center).addScaledVector(bitangent, -radius * 0.62),
        tmpB.copy(center).addScaledVector(bitangent, radius * 0.62),
        drawColor,
      );
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    this.overlayGeometry = geometry;
    this.overlay = new LineSegments(geometry, this.overlayMaterial);
    this.overlay.name = 'CinematicMarkersLayerOverlay';
    this.overlay.frustumCulled = false;
    this.overlay.renderOrder = 11;
    this.mesh.add(this.overlay);
  }

  private disposeOverlay(): void {
    if (this.overlay) {
      this.mesh.remove(this.overlay);
      this.overlay = null;
    }
    if (this.overlayGeometry) {
      this.overlayGeometry.dispose();
      this.overlayGeometry = null;
    }
  }
}

const pulseParams = (
  pulse: MarkerConfig['pulse'],
): { speed: number; amplitude: number } | null => {
  if (!pulse) return null;
  if (pulse === true) return { speed: DEFAULT_PULSE_SPEED, amplitude: DEFAULT_PULSE_AMPLITUDE };
  return {
    speed: pulse.speed ?? DEFAULT_PULSE_SPEED,
    amplitude: pulse.amplitude ?? DEFAULT_PULSE_AMPLITUDE,
  };
};

const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);

const buildBasis = (normal: Vector3, tangent: Vector3, bitangent: Vector3): void => {
  const helper = Math.abs(normal.dot(UP)) > 0.96 ? RIGHT : UP;
  tangent.crossVectors(helper, normal).normalize();
  bitangent.crossVectors(normal, tangent).normalize();
};
