import {
  AdditiveBlending,
  Blending,
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

export interface FocusPulseBandOptions {
  readonly color: string;
  readonly durationSeconds: number;
  /** Maximum simultaneous live pulses; older ones get recycled. Default 3. */
  readonly maxConcurrent?: number;
  /**
   * Angular radius of the ring at scale=1, in radians on the sphere.
   * Default 0.06 (~3.4°). Smaller for tight, larger for sweeping.
   */
  readonly angularRadiusBase?: number;
  /** Band thickness in radians. Default 0.013 (~0.7°). */
  readonly angularBand?: number;
  /** Linear scale at t=0. Default 0.4. */
  readonly scaleMin?: number;
  /** Linear scale at t=1. Default 2.5. */
  readonly scaleMax?: number;
  /** Lift above the globe surface as a multiplier of GLOBE_RADIUS. Default 1.0045. */
  readonly radiusFactor?: number;
  /** Number of segments around the ring. Default 96. */
  readonly segments?: number;
  /**
   * Material blending mode. `AdditiveBlending` reads as a glow on dark
   * themes; for a paper / ink-on-cream look use `NormalBlending`.
   * Default AdditiveBlending.
   */
  readonly blending?: Blending;
  /** Initial alpha at t=0 (before fade-out). Default 1. */
  readonly peakOpacity?: number;
}

const DEFAULTS = {
  maxConcurrent: 3,
  angularRadiusBase: 0.06,
  angularBand: 0.013,
  scaleMin: 0.4,
  scaleMax: 2.5,
  radiusFactor: 1.0045,
  segments: 96,
  peakOpacity: 1,
};

const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);

/**
 * Pure pulse-frame math. Extracted so tests can verify lifecycle without a
 * GL context. Returns null once the pulse expires; caller hides the mesh.
 *
 * - scale is a linear lerp from scaleMin to scaleMax as t: 0→1.
 * - opacity is `peak·(1 - t)^2` — quadratic fade-out, fast at the end so
 *   the ring vanishes crisply rather than dragging.
 */
export const computePulseFrame = (
  ageSeconds: number,
  durationSeconds: number,
  scaleMin = DEFAULTS.scaleMin,
  scaleMax = DEFAULTS.scaleMax,
  peakOpacity = DEFAULTS.peakOpacity
): { scale: number; opacity: number } | null => {
  if (durationSeconds <= 0) return null;
  if (ageSeconds < 0) return null;
  const t = ageSeconds / durationSeconds;
  if (t >= 1) return null;
  const scale = scaleMin + (scaleMax - scaleMin) * t;
  const fade = 1 - t;
  return { scale, opacity: peakOpacity * fade * fade };
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
}

/**
 * Sonar pulse pool — a band of vertices sampled directly on the sphere
 * surface at constant angular distance from a centroid. As the pulse
 * lifecycles, the angular radius grows and opacity fades. Because the
 * vertices ride the sphere, the band:
 *
 * - follows the globe's curvature (no flat tangent disk look);
 * - self-occludes via depth-test as it sweeps past the silhouette.
 *
 * This is the **shared core** for the focus-pulse decoration pattern. Each
 * kind wraps it with its own colors, durations, blending mode, and
 * angular extents (see `kinds/shared/decorators/focus-pulse-decorators.ts`).
 */
export class FocusPulseBand {
  public readonly group: Group;
  private readonly slots: Array<PulseSlot> = [];
  private readonly indexBuffer: Uint16Array;
  // Mutable so live setters can mutate without rebuilding the layer.
  // Segments stays effectively immutable (geometry-baked); changing it
  // would require resampling every slot — supported via `setSegments`
  // which does an in-place layer rebuild.
  private defaultDuration: number;
  private angularRadiusBase: number;
  private angularBand: number;
  private scaleMin: number;
  private scaleMax: number;
  private peakOpacity: number;
  private radius: number;
  private segments: number;
  private segCos: Float32Array;
  private segSin: Float32Array;
  // Construction-time color cached so callers can revert via
  // `setOptions({ color: '' })` without knowing what the theme picked.
  private readonly defaultColor: string;

  public constructor(options: FocusPulseBandOptions) {
    this.group = new Group();
    this.defaultDuration = options.durationSeconds;
    this.defaultColor = options.color;
    this.angularRadiusBase = options.angularRadiusBase ?? DEFAULTS.angularRadiusBase;
    this.angularBand = options.angularBand ?? DEFAULTS.angularBand;
    this.scaleMin = options.scaleMin ?? DEFAULTS.scaleMin;
    this.scaleMax = options.scaleMax ?? DEFAULTS.scaleMax;
    this.peakOpacity = options.peakOpacity ?? DEFAULTS.peakOpacity;
    this.radius = GLOBE_RADIUS * (options.radiusFactor ?? DEFAULTS.radiusFactor);
    this.segments = options.segments ?? DEFAULTS.segments;
    const blending = options.blending ?? AdditiveBlending;
    const max = options.maxConcurrent ?? DEFAULTS.maxConcurrent;

    this.segCos = new Float32Array(this.segments);
    this.segSin = new Float32Array(this.segments);
    for (let i = 0; i < this.segments; i++) {
      const theta = (2 * Math.PI * i) / this.segments;
      this.segCos[i] = Math.cos(theta);
      this.segSin[i] = Math.sin(theta);
    }

    this.indexBuffer = new Uint16Array(this.segments * 6);
    for (let i = 0; i < this.segments; i++) {
      const next = (i + 1) % this.segments;
      const a = i * 2;
      const b = i * 2 + 1;
      const c = next * 2;
      const d = next * 2 + 1;
      this.indexBuffer[i * 6 + 0] = a;
      this.indexBuffer[i * 6 + 1] = b;
      this.indexBuffer[i * 6 + 2] = c;
      this.indexBuffer[i * 6 + 3] = c;
      this.indexBuffer[i * 6 + 4] = b;
      this.indexBuffer[i * 6 + 5] = d;
    }

    const baseColor = new Color(options.color);
    for (let i = 0; i < max; i++) {
      const positions = new Float32Array(this.segments * 2 * 3);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(this.indexBuffer.slice(), 1));
      const material = new MeshBasicMaterial({
        color: baseColor.clone(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: DoubleSide,
        blending,
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
      });
      this.group.add(mesh);
    }
  }

  public spawn(latLng: LatLng): void {
    const slot = this.acquireSlot();
    const surface = latLngToVector3(latLng, 1);
    slot.normal.copy(surface).normalize();
    const helper = Math.abs(slot.normal.dot(UP)) > 0.999 ? RIGHT : UP;
    slot.tangent.crossVectors(helper, slot.normal).normalize();
    slot.bitangent.crossVectors(slot.normal, slot.tangent).normalize();
    slot.active = true;
    slot.ageSeconds = 0;
    slot.material.opacity = this.peakOpacity;
    slot.mesh.visible = true;
    this.writeBand(slot, this.angularRadiusBase * this.scaleMin);
  }

  public update(delta: number): void {
    for (const slot of this.slots) {
      if (!slot.active) continue;
      slot.ageSeconds += delta;
      const frame = computePulseFrame(
        slot.ageSeconds,
        this.defaultDuration,
        this.scaleMin,
        this.scaleMax,
        this.peakOpacity
      );
      if (!frame) {
        slot.active = false;
        slot.mesh.visible = false;
        slot.material.opacity = 0;
        continue;
      }
      this.writeBand(slot, this.angularRadiusBase * frame.scale);
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
   * Live update for scalar fields. Each is mutated in place and the
   * existing render loop picks up the new value on the next frame —
   * no geometry rebuild, no slot reset, in-flight pulses keep their
   * current age but interpolate against the new bounds.
   *
   * Note: `segments` is geometry-baked. Pass it here and we'll do an
   * in-place slot rebuild (cheap — single-digit ms — but it does
   * cancel any in-flight pulses).
   */
  public setOptions(partial: {
    readonly durationSeconds?: number;
    readonly angularRadiusBase?: number;
    readonly angularBand?: number;
    readonly scaleMin?: number;
    readonly scaleMax?: number;
    readonly peakOpacity?: number;
    readonly radiusFactor?: number;
    readonly segments?: number;
    readonly color?: string;
  }): void {
    if (partial.durationSeconds !== undefined) this.defaultDuration = partial.durationSeconds;
    if (partial.angularRadiusBase !== undefined) this.angularRadiusBase = partial.angularRadiusBase;
    if (partial.angularBand !== undefined) this.angularBand = partial.angularBand;
    if (partial.scaleMin !== undefined) this.scaleMin = partial.scaleMin;
    if (partial.scaleMax !== undefined) this.scaleMax = partial.scaleMax;
    if (partial.peakOpacity !== undefined) this.peakOpacity = partial.peakOpacity;
    if (partial.radiusFactor !== undefined) this.radius = GLOBE_RADIUS * partial.radiusFactor;
    if (partial.color !== undefined) {
      // Empty string = reset to construction-time (theme) color.
      const target = partial.color === '' ? this.defaultColor : partial.color;
      const next = new Color(target);
      for (const slot of this.slots) slot.material.color.copy(next);
    }
    if (partial.segments !== undefined && partial.segments !== this.segments) {
      this.rebuildGeometry(partial.segments);
    }
  }

  /**
   * Rebuild every slot's geometry for a new segment count. Cancels any
   * in-flight pulses (they restart cleanly on the next spawn). Cheap
   * because the slot pool is small (3 by default).
   */
  private rebuildGeometry(segments: number): void {
    this.segments = segments;
    this.segCos = new Float32Array(segments);
    this.segSin = new Float32Array(segments);
    for (let i = 0; i < segments; i++) {
      const theta = (2 * Math.PI * i) / segments;
      this.segCos[i] = Math.cos(theta);
      this.segSin[i] = Math.sin(theta);
    }
    const newIndex = new Uint16Array(segments * 6);
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments;
      const a = i * 2;
      const b = i * 2 + 1;
      const c = next * 2;
      const d = next * 2 + 1;
      newIndex[i * 6 + 0] = a;
      newIndex[i * 6 + 1] = b;
      newIndex[i * 6 + 2] = c;
      newIndex[i * 6 + 3] = c;
      newIndex[i * 6 + 4] = b;
      newIndex[i * 6 + 5] = d;
    }
    for (const slot of this.slots) {
      slot.geometry.dispose();
      const positions = new Float32Array(segments * 2 * 3);
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(positions, 3));
      geometry.setIndex(new BufferAttribute(newIndex.slice(), 1));
      slot.mesh.geometry = geometry;
      // Replace the slot's positions reference + geometry while keeping
      // the same slot identity (so in-flight pulses don't crash). They
      // get cancelled here.
      (slot as { positions: Float32Array }).positions = positions;
      (slot as { geometry: BufferGeometry }).geometry = geometry;
      slot.active = false;
      slot.mesh.visible = false;
      slot.material.opacity = 0;
    }
  }

  private writeBand(slot: PulseSlot, alpha: number): void {
    const aIn = Math.max(0, alpha - this.angularBand / 2);
    const aOut = alpha + this.angularBand / 2;
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
    const r = this.radius;
    for (let i = 0; i < this.segments; i++) {
      const c = this.segCos[i]!;
      const s = this.segSin[i]!;
      const dx = c * tx + s * bx;
      const dy = c * ty + s * by;
      const dz = c * tz + s * bz;
      const base = i * 6;
      positions[base + 0] = (cIn * nx + sIn * dx) * r;
      positions[base + 1] = (cIn * ny + sIn * dy) * r;
      positions[base + 2] = (cIn * nz + sIn * dz) * r;
      positions[base + 3] = (cOut * nx + sOut * dx) * r;
      positions[base + 4] = (cOut * ny + sOut * dy) * r;
      positions[base + 5] = (cOut * nz + sOut * dz) * r;
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
