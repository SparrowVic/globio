import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { LatLng } from '../../types';

export interface FocusPulseLayerOptions {
  readonly color: string;
  readonly durationSeconds: number;
  /** Maximum simultaneous live pulses; older ones get recycled. Default 3. */
  readonly maxConcurrent?: number;
}

const PULSE_RADIUS = GLOBE_RADIUS * 1.0045;
const RING_INNER = 0.045;
const RING_OUTER = 0.055;
const SCALE_MIN = 0.4;
const SCALE_MAX = 2.5;
const DEFAULT_MAX = 3;
const UP = new Vector3(0, 1, 0);

/**
 * Pure pulse-frame math. Extracted so tests can verify lifecycle without a
 * GL context. Returns null once the pulse expires; caller hides the mesh.
 *
 * - scale is a linear lerp from SCALE_MIN to SCALE_MAX as t: 0→1.
 * - opacity is `(1 - t)^2` — quadratic fade-out, fast at the end so the
 *   ring vanishes crisply rather than dragging.
 */
export const computePulseFrame = (
  ageSeconds: number,
  durationSeconds: number
): { scale: number; opacity: number } | null => {
  if (durationSeconds <= 0) return null;
  if (ageSeconds < 0) return null;
  const t = ageSeconds / durationSeconds;
  if (t >= 1) return null;
  const scale = SCALE_MIN + (SCALE_MAX - SCALE_MIN) * t;
  const fade = 1 - t;
  return { scale, opacity: fade * fade };
};

interface PulseSlot {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  active: boolean;
  ageSeconds: number;
  durationSeconds: number;
}

/**
 * Sonar pulse pool. `spawn()` parks a pre-built ring mesh at the country
 * centroid (oriented to face outward from the sphere) and ticks it through
 * `computePulseFrame` until it expires. Up to `maxConcurrent` live pulses;
 * a new spawn over the cap recycles the oldest active slot.
 */
export class FocusPulseLayer {
  public readonly group: Group;
  private readonly slots: Array<PulseSlot> = [];
  private readonly defaultDuration: number;

  public constructor(options: FocusPulseLayerOptions) {
    this.group = new Group();
    this.defaultDuration = options.durationSeconds;
    const max = options.maxConcurrent ?? DEFAULT_MAX;
    const baseColor = new Color(options.color);
    for (let i = 0; i < max; i++) {
      const geometry = new RingGeometry(RING_INNER, RING_OUTER, 64);
      const material = new MeshBasicMaterial({
        color: baseColor.clone(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      });
      const mesh = new Mesh(geometry, material);
      mesh.visible = false;
      mesh.renderOrder = 9;
      this.slots.push({
        mesh,
        material,
        active: false,
        ageSeconds: 0,
        durationSeconds: this.defaultDuration,
      });
      this.group.add(mesh);
    }
  }

  public spawn(latLng: LatLng): void {
    const slot = this.acquireSlot();
    const surface = latLngToVector3(latLng, PULSE_RADIUS);
    slot.mesh.position.copy(surface);
    // Orient the ring so its plane is tangent to the sphere — face outward.
    const normal = surface.clone().normalize();
    const up = Math.abs(normal.dot(UP)) > 0.999 ? new Vector3(1, 0, 0) : UP;
    slot.mesh.lookAt(surface.clone().add(normal));
    slot.mesh.up.copy(up);
    slot.mesh.scale.setScalar(SCALE_MIN);
    slot.material.opacity = 1;
    slot.mesh.visible = true;
    slot.active = true;
    slot.ageSeconds = 0;
    slot.durationSeconds = this.defaultDuration;
  }

  public update(delta: number): void {
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.ageSeconds += delta;
      const frame = computePulseFrame(slot.ageSeconds, slot.durationSeconds);
      if (!frame) {
        slot.active = false;
        slot.mesh.visible = false;
        slot.material.opacity = 0;
        continue;
      }
      slot.mesh.scale.setScalar(frame.scale);
      slot.material.opacity = frame.opacity;
    }
  }

  public dispose(): void {
    for (const slot of this.slots) {
      slot.mesh.geometry.dispose();
      slot.material.dispose();
    }
    this.slots.length = 0;
    this.group.clear();
  }

  private acquireSlot(): PulseSlot {
    for (const slot of this.slots) {
      if (!slot.active) return slot;
    }
    // All slots in use — recycle the oldest (largest ageSeconds).
    let oldest = this.slots[0]!;
    for (const slot of this.slots) {
      if (slot.ageSeconds > oldest.ageSeconds) oldest = slot;
    }
    return oldest;
  }
}
