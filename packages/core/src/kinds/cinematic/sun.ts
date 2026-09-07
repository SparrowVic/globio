// Cinematic sun — subsolar astronomy + a camera-facing sun disc.
//
// Two independent pieces live here:
//
//   * `CinematicSunController` owns the *direction* toward the sun and
//     writes it into `CinematicWorld` (via `setLightDirection`) so every
//     surface/city/border shader relights consistently. It never touches
//     the scene graph directly.
//
//   * `CinematicSunDiscLayer` owns the *visual* sun — a small camera-facing
//     quad rendered far along that same direction, with an HDR core built
//     to bloom under post-processing.
//
// Space conventions (see the globe assembly): `globeGroup` is rotated only
// around Z for the axis tilt; the camera orbits around it rather than the
// globe spinning under a fixed camera. A direction expressed in the globe's
// *local* frame (e.g. a subsolar lat/lng converted straight off the unit
// sphere) becomes a *world*-space direction via
// `dir.applyQuaternion(globeGroup.quaternion)`. `fixed` mode direction is
// already world-space and skips that step entirely.

import {
  AdditiveBlending,
  Color,
  Mesh,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { Object3D, PerspectiveCamera } from 'three';
import { latLngToVector3 } from '../../utils/coordinates';
import type { CinematicWorld } from './engine';
import { wrapLng } from './math';
import type { CinematicSunConfig } from '../../types/kinds';

// ────────────────────────────────────────────────────────────────────────────
// Solar math
// ────────────────────────────────────────────────────────────────────────────

export interface SubsolarPoint {
  readonly lat: number;
  readonly lng: number;
}

const MS_PER_DAY = 86400000;

const dayOfYear = (date: Date): number => {
  const startOfYearUtc = Date.UTC(date.getUTCFullYear(), 0, 1);
  const currentDayUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((currentDayUtc - startOfYearUtc) / MS_PER_DAY) + 1;
};

/**
 * Subsolar point (the lat/lng directly under the sun) for a given instant.
 *
 * `lat` is the solar declination — Cooper's approximation:
 *   declination = 23.44° · sin(2π (284 + dayOfYear) / 365)
 *
 * `lng` corrects mean solar noon by the equation of time (Spencer's
 * formula, in minutes) before converting the UTC clock into a longitude:
 *   lng = -15° · (UTCHours + eot/60 - 12)
 *
 * Returned `lng` is normalised to [-180, 180).
 */
export const computeSubsolarPoint = (date: Date): SubsolarPoint => {
  const n = dayOfYear(date);

  const lat = 23.44 * Math.sin((2 * Math.PI * (284 + n)) / 365);

  // Spencer (1971) equation of time, in minutes. `b` is the fractional
  // year angle measured from Jan 1st (n=1 ⇒ b=0).
  const b = (2 * Math.PI * (n - 1)) / 365;
  const eotMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(b) -
      0.032077 * Math.sin(b) -
      0.014615 * Math.cos(2 * b) -
      0.04089 * Math.sin(2 * b));

  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3600000;

  const rawLng = -15 * (utcHours + eotMinutes / 60 - 12);

  return { lat, lng: wrapLng(rawLng) };
};

/**
 * Resolves a `CinematicSunConfig.date`-shaped value into a concrete `Date`.
 * `undefined` and anything that fails to parse both fall back to "now"
 * rather than propagating `Invalid Date` into the solar math above.
 */
export const resolveSunDate = (input: Date | string | number | undefined): Date => {
  if (input === undefined) return new Date();
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? new Date() : new Date(input.getTime());
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

/**
 * Returns `value` if it's a positive finite number, otherwise `fallback`.
 * Centralises the "non-positive numeric config is a sentinel for the
 * default" convention used throughout this file (`speed`, `timeScale`,
 * disc `size`/`glare`/`distance`). Numeric comparison against `undefined`
 * is always `false`, so an optional field can be passed straight through
 * without a separate `!== undefined` guard.
 */
const positiveOr = (value: number | undefined, fallback: number): number =>
  value !== undefined && value > 0 ? value : fallback;

// ────────────────────────────────────────────────────────────────────────────
// Sun controller — direction only, no scene-graph objects of its own.
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIME_SCALE = 1;
const DEFAULT_SPEED = 6; // degrees/sec ⇒ one full sweep every 60s

export interface CinematicSunControllerOptions {
  readonly globeGroup: Object3D;
  readonly world: CinematicWorld;
  readonly config?: CinematicSunConfig;
  /** World-space direction toward the sun used by `fixed` mode's default. */
  readonly fallbackDirection: readonly [number, number, number];
}

/**
 * Drives `CinematicWorld.setLightDirection` from one of three modes:
 *
 *  - `fixed` — a constant world-space direction (`config.direction`,
 *    falling back to `fallbackDirection`). `update()` is a no-op; the
 *    direction is only (re)computed when `setConfig` is called.
 *  - `realtime` — the subsolar point tracks `config.date` plus simulated
 *    time accumulated since `mode`/`date` was last (re-)anchored, advanced
 *    each `update(delta)` by `delta * timeScale` seconds.
 *  - `orbit` — a time-lapse sweep: longitude regresses at `speed`°/s while
 *    latitude stays pinned to the declination of `config.date` (the
 *    declination itself drifts too slowly to matter over a demo sweep).
 *
 * `setConfig` only re-anchors the realtime clock and the orbit sweep's
 * starting longitude/latitude when the partial actually changes `mode` or
 * `date` (compared against the current state — not merely present in the
 * partial). Changes to `speed`, `timeScale`, `direction`, or any disc-only
 * field (`color`/`size`/`glare`/`visible`, bundled into the same
 * `CinematicSunConfig` for the wiring layer's convenience) never reset an
 * in-progress sweep or the realtime clock. A `timeScale` change only
 * affects time accumulated *after* the call, so the simulated instant
 * stays continuous across the edit and only the rate changes.
 */
export class CinematicSunController {
  private readonly globeGroup: Object3D;
  private readonly world: CinematicWorld;
  private readonly fallbackDirection: readonly [number, number, number];

  private mode: 'fixed' | 'realtime' | 'orbit' = 'fixed';
  private directionOverride: readonly [number, number, number] | null = null;
  private baseDate: Date = new Date();
  private timeScale = DEFAULT_TIME_SCALE;
  private speed = DEFAULT_SPEED;

  private realtimeSimulatedMs = 0;
  private orbitLat = 0;
  private orbitLng = 0;
  private subsolar: SubsolarPoint | null = null;

  private readonly direction = new Vector3();
  private readonly scratch = new Vector3();

  public constructor(options: CinematicSunControllerOptions) {
    this.globeGroup = options.globeGroup;
    this.world = options.world;
    this.fallbackDirection = options.fallbackDirection;
    this.applyConfig(options.config);
  }

  public setConfig(partial: CinematicSunConfig): void {
    this.applyConfig(partial);
  }

  public update(delta: number): void {
    if (this.mode === 'fixed') return;

    if (this.mode === 'realtime') {
      this.realtimeSimulatedMs += delta * this.timeScale * 1000;
    } else {
      this.orbitLng = wrapLng(this.orbitLng - this.speed * delta);
    }
    this.pushDirection();
  }

  /** World-space unit vector toward the sun — the live internal vector; read-only, do not mutate. */
  public getDirection(): Vector3 {
    return this.direction;
  }

  public getSubsolarPoint(): SubsolarPoint | null {
    return this.subsolar;
  }

  public getMode(): 'fixed' | 'realtime' | 'orbit' {
    return this.mode;
  }

  private applyConfig(partial: CinematicSunConfig | undefined): void {
    const previousMode = this.mode;
    const previousBaseDateMs = this.baseDate.getTime();

    if (partial?.mode !== undefined) this.mode = partial.mode;
    if (partial?.date !== undefined) this.baseDate = resolveSunDate(partial.date);
    if (partial?.timeScale !== undefined) {
      this.timeScale = positiveOr(partial.timeScale, DEFAULT_TIME_SCALE);
    }
    if (partial?.speed !== undefined) {
      this.speed = positiveOr(partial.speed, DEFAULT_SPEED);
    }
    if (partial?.direction !== undefined) this.directionOverride = partial.direction;

    // Re-anchor the realtime clock and the orbit sweep's starting point
    // ONLY when a time-defining field was actually present in `partial`
    // *and* it changed something relative to the current state. A bare
    // echo of the current mode/date, or unrelated tweaks (`speed`,
    // `timeScale`, `direction`, disc styling), must never interrupt an
    // in-progress sweep or reset the realtime baseline. `timeScale`
    // changes need no re-anchor at all: `realtimeSimulatedMs` (see
    // `update()`) only accumulates at whatever rate was current at the
    // time, so leaving it untouched here keeps the simulated instant
    // continuous and simply changes the rate going forward.
    const modeChanged = partial?.mode !== undefined && this.mode !== previousMode;
    const dateChanged =
      partial?.date !== undefined && this.baseDate.getTime() !== previousBaseDateMs;
    if (modeChanged || dateChanged) {
      this.realtimeSimulatedMs = 0;
      const anchor = computeSubsolarPoint(this.baseDate);
      this.orbitLat = anchor.lat;
      this.orbitLng = anchor.lng;
    }

    this.pushDirection();
  }

  private pushDirection(): void {
    switch (this.mode) {
      case 'fixed': {
        const source = this.directionOverride ?? this.fallbackDirection;
        this.direction.set(source[0], source[1], source[2]);
        if (this.direction.lengthSq() < 1e-6) {
          this.direction.set(
            this.fallbackDirection[0],
            this.fallbackDirection[1],
            this.fallbackDirection[2],
          );
        }
        this.direction.normalize();
        this.subsolar = null;
        break;
      }
      case 'realtime': {
        const effectiveDate = new Date(this.baseDate.getTime() + this.realtimeSimulatedMs);
        const point = computeSubsolarPoint(effectiveDate);
        this.subsolar = point;
        this.applySubsolarDirection(point.lat, point.lng);
        break;
      }
      case 'orbit': {
        const point: SubsolarPoint = { lat: this.orbitLat, lng: this.orbitLng };
        this.subsolar = point;
        this.applySubsolarDirection(point.lat, point.lng);
        break;
      }
    }

    this.world.setLightDirection([this.direction.x, this.direction.y, this.direction.z]);
  }

  private applySubsolarDirection(lat: number, lng: number): void {
    latLngToVector3([lat, lng], 1, this.scratch);
    this.scratch.applyQuaternion(this.globeGroup.quaternion);
    this.direction.copy(this.scratch).normalize();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Sun disc — a camera-facing HDR quad rendered along the light direction.
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_DISTANCE = 24;
const DEFAULT_SIZE = 1;
const DEFAULT_GLARE = 1;
const DEFAULT_COLOR = '#fff4d6';
// Unit quad half-size at scale 1; `setSize` scales the object so the
// effective half-size is `QUAD_HALF_SIZE * size`, matching the brief.
const QUAD_HALF_SIZE = 0.9;

const SUN_DISC_VERTEX_SHADER = /* glsl */ `
  precision mediump float;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SUN_DISC_FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  uniform vec3 uColor;
  uniform float uGlare;
  uniform float uTime;

  varying vec2 vUv;

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float d = length(uv);

    // HDR core — deliberately > 1.0 so bloom picks it up.
    float core = smoothstep(0.32, 0.08, d) * 4.0;
    float corona = pow(max(0.0, 1.0 - d), 6.0) * uGlare * 1.4;
    float rays = 0.12 * uGlare
      * pow(abs(cos(atan(uv.y, uv.x) * 6.0 + uTime * 0.15)), 18.0)
      * (1.0 - d);

    vec3 color = uColor * (core + corona + rays);
    float alpha = clamp(dot(color, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
    if (alpha < 0.002) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

export interface CinematicSunDiscOptions {
  readonly color: string;
  readonly size: number;
  readonly glare: number;
  /** World units from the parent's origin. Default 24. */
  readonly distance?: number;
}

/**
 * A single camera-facing quad standing in for the sun. `sync()` places it
 * `distance` units out along a world-space direction (typically
 * `CinematicSunController.getDirection()`) and orients it to face the
 * camera; call it once per frame before rendering. `update()` only
 * advances the shimmer clock.
 */
export class CinematicSunDiscLayer {
  public readonly object: Object3D;
  private readonly geometry: PlaneGeometry;
  private readonly material: ShaderMaterial;
  private readonly defaultColor: string;
  private readonly distance: number;

  private readonly tmpQuat = new Quaternion();
  private readonly tmpVec = new Vector3();

  public constructor(options: CinematicSunDiscOptions) {
    this.defaultColor = options.color !== '' ? options.color : DEFAULT_COLOR;
    this.distance = positiveOr(options.distance, DEFAULT_DISTANCE);

    this.geometry = new PlaneGeometry(QUAD_HALF_SIZE * 2, QUAD_HALF_SIZE * 2);
    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(this.defaultColor) },
        uGlare: { value: positiveOr(options.glare, DEFAULT_GLARE) },
        uTime: { value: 0 },
      },
      vertexShader: SUN_DISC_VERTEX_SHADER,
      fragmentShader: SUN_DISC_FRAGMENT_SHADER,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const mesh = new Mesh(this.geometry, this.material);
    mesh.name = 'CinematicSunDiscLayer';
    mesh.frustumCulled = false;
    mesh.renderOrder = 1;
    mesh.scale.setScalar(positiveOr(options.size, DEFAULT_SIZE));
    this.object = mesh;
  }

  /**
   * Positions and orients the disc for this frame. `worldDirection` is a
   * world-space unit vector toward the sun; `parent` is whatever `object`
   * has been added to (its world rotation is inverted so the world-space
   * placement lands correctly in `object`'s local space).
   */
  public sync(worldDirection: Vector3, camera: PerspectiveCamera, parent: Object3D): void {
    const parentWorldQuatInverse = parent.getWorldQuaternion(this.tmpQuat).invert();

    this.tmpVec
      .copy(worldDirection)
      .applyQuaternion(parentWorldQuatInverse)
      .multiplyScalar(this.distance);
    this.object.position.copy(this.tmpVec);

    this.object.quaternion.copy(parentWorldQuatInverse).multiply(camera.quaternion);
  }

  public update(elapsedSeconds: number): void {
    this.material.uniforms['uTime']!.value = elapsedSeconds;
  }

  public setColor(color: string): void {
    (this.material.uniforms['uColor']!.value as Color).set(color === '' ? this.defaultColor : color);
  }

  public setSize(size: number): void {
    this.object.scale.setScalar(positiveOr(size, DEFAULT_SIZE));
  }

  public setGlare(glare: number): void {
    this.material.uniforms['uGlare']!.value = positiveOr(glare, DEFAULT_GLARE);
  }

  public setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
