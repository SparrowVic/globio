import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  NormalBlending,
  Object3D,
  Points,
  PointsMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { MarkerConfig } from '../../types';

export interface PaperMarkersLayerOptions {
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
const MARKER_LIFT = GLOBE_RADIUS * 1.0045;
const PIN_HEIGHT = 0.07;
const LABEL_WIDTH = 0.075;
const LABEL_HEIGHT = 0.026;

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

export class PaperMarkersLayer {
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
  private overlay: LineSegments | null = null;
  private overlayGeometry: BufferGeometry | null = null;
  private pinHeads: Points | null = null;
  private pinHeadsGeometry: BufferGeometry | null = null;
  private readonly overlayMaterial: LineBasicMaterial;
  private readonly pinHeadsMaterial: PointsMaterial;
  private batchOverlayRebuild = false;

  public constructor(options: PaperMarkersLayerOptions) {
    this.maxMarkers = options.maxMarkers ?? 10000;
    this.defaultColor = options.defaultColor;
    this.defaultSize = options.defaultSize ?? 0.012;
    this.hoverScale = options.hoverScale ?? 1.5;

    this.geometry = new SphereGeometry(1, 10, 10);
    this.material = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: NormalBlending,
    });
    this.mesh = new InstancedMesh(this.geometry, this.material, this.maxMarkers);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 8;

    for (let i = this.maxMarkers - 1; i >= 0; i--) {
      this.freeIndices.push(i);
    }

    this.overlayMaterial = new LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: NormalBlending,
    });
    this.pinHeadsMaterial = new PointsMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      size: 0.018,
      sizeAttenuation: true,
      depthWrite: false,
      blending: NormalBlending,
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
      throw new Error(`PaperMarkersLayer: max markers (${this.maxMarkers}) reached`);
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

  /**
   * Mark a single marker as hovered (or none with `null`). The hovered
   * marker eases up to `hoverScale × baseSize`; previously hovered marker
   * eases back down.
   */
  public setHovered(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.rebuildOverlay();
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
      const hoverScale = slot.marker.hoverScale ?? this.hoverScale;
      const target = id === this.hoveredId ? pulsed * hoverScale : pulsed;
      const next = slot.currentScale + (target - slot.currentScale) * k;
      const changed = Math.abs(next - slot.currentScale) > 1e-6 || pulse !== null;
      slot.currentScale = next;
      if (changed) {
        this.applyToInstance(slot.index, slot.marker, slot.currentScale);
      }
    });
  }

  public dispose(): void {
    this.disposeOverlay();
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
    this.overlayMaterial.dispose();
    this.pinHeadsMaterial.dispose();
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
    this.dummy.scale.setScalar(scale * 1.15);
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

    const linePositions: number[] = [];
    const lineColors: number[] = [];
    const headPositions: number[] = [];
    const headColors: number[] = [];
    const center = new Vector3();
    const normal = new Vector3();
    const tangent = new Vector3();
    const bitangent = new Vector3();
    const top = new Vector3();
    const a = new Vector3();
    const b = new Vector3();
    const color = new Color();
    const hover = new Color('#1f1408');
    const paperWhite = new Color('#fff5d6');

    const pushLine = (from: Vector3, to: Vector3, c: Color): void => {
      linePositions.push(from.x, from.y, from.z, to.x, to.y, to.z);
      lineColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    };

    this.slots.forEach((slot, id) => {
      const isHovered = id === this.hoveredId;
      color.set(slot.marker.color ?? this.defaultColor);
      const draw = isHovered ? hover.copy(color).lerp(paperWhite, 0.35) : color;
      latLngToVector3(slot.marker.position, MARKER_LIFT, center);
      normal.copy(center).normalize();
      buildBasis(normal, tangent, bitangent);
      const baseSize = this.defaultSize * (slot.marker.size ?? 1);
      const hoverScale = slot.marker.hoverScale ?? this.hoverScale;
      const lift = PIN_HEIGHT + baseSize * (isHovered ? hoverScale * 3.2 : 2.4);
      top.copy(normal).multiplyScalar(MARKER_LIFT + lift);

      pushLine(center, top, draw);
      const labelW = LABEL_WIDTH * (isHovered ? 1.18 : 1);
      const labelH = LABEL_HEIGHT * (isHovered ? 1.15 : 1);
      a.copy(top).addScaledVector(tangent, labelW * -0.5).addScaledVector(bitangent, labelH * -0.5);
      b.copy(top).addScaledVector(tangent, labelW * 0.5).addScaledVector(bitangent, labelH * -0.5);
      pushLine(a, b, draw);
      a.copy(top).addScaledVector(tangent, labelW * 0.5).addScaledVector(bitangent, labelH * -0.5);
      b.copy(top).addScaledVector(tangent, labelW * 0.5).addScaledVector(bitangent, labelH * 0.5);
      pushLine(a, b, draw);
      a.copy(top).addScaledVector(tangent, labelW * 0.5).addScaledVector(bitangent, labelH * 0.5);
      b.copy(top).addScaledVector(tangent, labelW * -0.5).addScaledVector(bitangent, labelH * 0.5);
      pushLine(a, b, draw);
      a.copy(top).addScaledVector(tangent, labelW * -0.5).addScaledVector(bitangent, labelH * 0.5);
      b.copy(top).addScaledVector(tangent, labelW * -0.5).addScaledVector(bitangent, labelH * -0.5);
      pushLine(a, b, draw);

      const tick = labelH * 0.6;
      pushLine(
        a.copy(top).addScaledVector(tangent, -tick),
        b.copy(top).addScaledVector(tangent, tick),
        draw,
      );
      pushLine(
        a.copy(top).addScaledVector(bitangent, -tick),
        b.copy(top).addScaledVector(bitangent, tick),
        draw,
      );

      headPositions.push(top.x, top.y, top.z);
      headColors.push(draw.r, draw.g, draw.b);
    });

    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new Float32BufferAttribute(lineColors, 3));
    this.overlayGeometry = lineGeometry;
    this.overlay = new LineSegments(lineGeometry, this.overlayMaterial);
    this.overlay.renderOrder = 9;
    this.overlay.frustumCulled = false;
    this.mesh.add(this.overlay);

    const headGeometry = new BufferGeometry();
    headGeometry.setAttribute('position', new Float32BufferAttribute(headPositions, 3));
    headGeometry.setAttribute('color', new Float32BufferAttribute(headColors, 3));
    this.pinHeadsGeometry = headGeometry;
    this.pinHeads = new Points(headGeometry, this.pinHeadsMaterial);
    this.pinHeads.renderOrder = 10;
    this.pinHeads.frustumCulled = false;
    this.mesh.add(this.pinHeads);
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
    if (this.pinHeads) {
      this.mesh.remove(this.pinHeads);
      this.pinHeads = null;
    }
    if (this.pinHeadsGeometry) {
      this.pinHeadsGeometry.dispose();
      this.pinHeadsGeometry = null;
    }
  }
}

const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);

const buildBasis = (normal: Vector3, tangent: Vector3, bitangent: Vector3): void => {
  const helper = Math.abs(normal.dot(UP)) > 0.96 ? RIGHT : UP;
  tangent.crossVectors(helper, normal).normalize();
  bitangent.crossVectors(normal, tangent).normalize();
};
