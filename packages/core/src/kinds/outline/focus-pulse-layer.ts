import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
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
const SEGMENTS = 96;
/** Angular radius of the ring at scale 1.0, in radians on the sphere surface. */
const ANGULAR_RADIUS_BASE = 0.06;
/** Band thickness in radians (constant across the pulse lifetime). */
const ANGULAR_BAND = 0.013;
const SCALE_MIN = 0.4;
const SCALE_MAX = 2.5;
const DEFAULT_MAX = 3;
const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);

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
  readonly geometry: BufferGeometry;
  readonly positions: Float32Array;
  /** Centroid normal (unit vector from sphere center to surface point). */
  readonly normal: Vector3;
  /** Two orthonormal axes spanning the tangent plane at `normal`. */
  readonly tangent: Vector3;
  readonly bitangent: Vector3;
  active: boolean;
  ageSeconds: number;
  durationSeconds: number;
}

/**
 * Build the index buffer once — the inner/outer ring connectivity is fixed
 * for any pulse. For each segment i we emit two triangles forming a quad
 * that connects (i_in, i_out) → (i+1_in, i+1_out), wrapping around at the end.
 */
const buildBandIndices = (): Uint16Array => {
  const indices = new Uint16Array(SEGMENTS * 6);
  for (let i = 0; i < SEGMENTS; i++) {
    const next = (i + 1) % SEGMENTS;
    const a = i * 2;
    const b = i * 2 + 1;
    const c = next * 2;
    const d = next * 2 + 1;
    indices[i * 6 + 0] = a;
    indices[i * 6 + 1] = b;
    indices[i * 6 + 2] = c;
    indices[i * 6 + 3] = c;
    indices[i * 6 + 4] = b;
    indices[i * 6 + 5] = d;
  }
  return indices;
};

/** Pre-compute (cosθ, sinθ) for every segment to skip trig in the hot path. */
const SEG_COS = new Float32Array(SEGMENTS);
const SEG_SIN = new Float32Array(SEGMENTS);
for (let i = 0; i < SEGMENTS; i++) {
  const theta = (2 * Math.PI * i) / SEGMENTS;
  SEG_COS[i] = Math.cos(theta);
  SEG_SIN[i] = Math.sin(theta);
}

/**
 * Sonar pulse pool. `spawn(latLng)` parks a pre-built ring band at the
 * country centroid; `update(delta)` ticks it through `computePulseFrame`
 * and reshapes the band each frame as a small circle ON the sphere
 * surface. Up to `maxConcurrent` live pulses; new spawns over the cap
 * recycle the oldest active slot.
 *
 * Why "small circle on the sphere" instead of a flat tangent ring: the
 * band needs to follow the globe's curvature so it reads as a real
 * spherical artefact, not a billboard. Sampling positions as
 * `cos(α)·N + sin(α)·(cosθ·T + sinθ·B)` keeps every vertex exactly on the
 * sphere at angular radius α from the centroid; depth-test against the
 * globe surface then naturally hides the back-side half.
 */
export class FocusPulseLayer {
  public readonly group: Group;
  private readonly slots: Array<PulseSlot> = [];
  private readonly defaultDuration: number;
  private readonly indexBuffer: Uint16Array;

  public constructor(options: FocusPulseLayerOptions) {
    this.group = new Group();
    this.defaultDuration = options.durationSeconds;
    this.indexBuffer = buildBandIndices();
    const max = options.maxConcurrent ?? DEFAULT_MAX;
    const baseColor = new Color(options.color);
    for (let i = 0; i < max; i++) {
      const positions = new Float32Array(SEGMENTS * 2 * 3);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      // Index buffer is shared shape across slots — clone so each geometry
      // owns its index attribute (Three.js disposes per-geometry).
      geometry.setIndex(new BufferAttribute(this.indexBuffer.slice(), 1));
      // Bounding sphere will get out of date as we mutate positions; but
      // since the mesh sits inside the globeGroup we don't rely on the
      // computed bounding for raycasting, and we disable frustum culling
      // anyway so it doesn't disappear at oblique camera angles.
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
      mesh.frustumCulled = false;
      this.slots.push({
        mesh,
        material,
        geometry,
        positions,
        normal: new Vector3(),
        tangent: new Vector3(),
        bitangent: new Vector3(),
        active: false,
        ageSeconds: 0,
        durationSeconds: this.defaultDuration,
      });
      this.group.add(mesh);
    }
  }

  public spawn(latLng: LatLng): void {
    const slot = this.acquireSlot();
    const surface = latLngToVector3(latLng, 1);
    slot.normal.copy(surface).normalize();
    // Pick a helper vector that's not parallel to the normal so the cross
    // product gives a stable tangent direction. UP fails near the poles.
    const helper = Math.abs(slot.normal.dot(UP)) > 0.999 ? RIGHT : UP;
    slot.tangent.crossVectors(helper, slot.normal).normalize();
    slot.bitangent.crossVectors(slot.normal, slot.tangent).normalize();
    slot.active = true;
    slot.ageSeconds = 0;
    slot.durationSeconds = this.defaultDuration;
    slot.material.opacity = 1;
    slot.mesh.visible = true;
    this.writeBand(slot, ANGULAR_RADIUS_BASE * SCALE_MIN);
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
      this.writeBand(slot, ANGULAR_RADIUS_BASE * frame.scale);
      slot.material.opacity = frame.opacity;
    }
  }

  public dispose(): void {
    for (const slot of this.slots) {
      slot.geometry.dispose();
      slot.material.dispose();
    }
    this.slots.length = 0;
    this.group.clear();
  }

  /**
   * Resample the slot's band positions so its inner edge sits at angular
   * radius `(alpha - band/2)` from the centroid and its outer edge at
   * `(alpha + band/2)`, both on the sphere surface (radius `PULSE_RADIUS`).
   */
  private writeBand(slot: PulseSlot, alpha: number): void {
    const aIn = Math.max(0, alpha - ANGULAR_BAND / 2);
    const aOut = alpha + ANGULAR_BAND / 2;
    const cIn = Math.cos(aIn);
    const sIn = Math.sin(aIn);
    const cOut = Math.cos(aOut);
    const sOut = Math.sin(aOut);
    const nx = slot.normal.x;
    const ny = slot.normal.y;
    const nz = slot.normal.z;
    const tx = slot.tangent.x;
    const ty = slot.tangent.y;
    const tz = slot.tangent.z;
    const bx = slot.bitangent.x;
    const by = slot.bitangent.y;
    const bz = slot.bitangent.z;
    const positions = slot.positions;
    for (let i = 0; i < SEGMENTS; i++) {
      const c = SEG_COS[i]!;
      const s = SEG_SIN[i]!;
      const dx = c * tx + s * bx;
      const dy = c * ty + s * by;
      const dz = c * tz + s * bz;
      const base = i * 6;
      positions[base + 0] = (cIn * nx + sIn * dx) * PULSE_RADIUS;
      positions[base + 1] = (cIn * ny + sIn * dy) * PULSE_RADIUS;
      positions[base + 2] = (cIn * nz + sIn * dz) * PULSE_RADIUS;
      positions[base + 3] = (cOut * nx + sOut * dx) * PULSE_RADIUS;
      positions[base + 4] = (cOut * ny + sOut * dy) * PULSE_RADIUS;
      positions[base + 5] = (cOut * nz + sOut * dz) * PULSE_RADIUS;
    }
    const attr = slot.geometry.attributes['position'] as BufferAttribute;
    attr.needsUpdate = true;
  }

  private acquireSlot(): PulseSlot {
    for (const slot of this.slots) {
      if (!slot.active) return slot;
    }
    let oldest = this.slots[0]!;
    for (const slot of this.slots) {
      if (slot.ageSeconds > oldest.ageSeconds) oldest = slot;
    }
    return oldest;
  }
}
