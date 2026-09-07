import { Spherical, Vector2, Vector3, type PerspectiveCamera } from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../utils/coordinates';
import { easeInOutCubic } from '../utils/easing';
import type { EasingFunction, FlyToOptions, LatLng, ZoomConfig, ZoomMode } from '../types';

export interface ControlsOptions {
  readonly camera: PerspectiveCamera;
  readonly domElement: HTMLElement;
  readonly minDistance?: number;
  readonly maxDistance?: number;
  readonly rotateSpeed?: number;
  readonly zoomSpeed?: number;
  readonly autoRotateSpeed?: number;
  readonly zoom?: ZoomConfig;
}

const SMOOTH_RATE = 12; // higher = snappier; lower = floatier

export class GlobeControls {
  private readonly spherical = new Spherical();
  private readonly targetSpherical = new Spherical();
  private readonly previousPointer = new Vector2();
  private isPointerDown = false;
  private autoRotate = false;
  private autoRotateSpeed: number;
  private zoomMode: ZoomMode;
  private zoomStrength: number;
  private smoothZoom: boolean;
  private readonly minDistance: number;
  private readonly maxDistance: number;
  private readonly rotateSpeed: number;
  private readonly zoomSpeed: number;
  private readonly tempVec = new Vector3();
  private readonly tempSpherical = new Spherical();
  private activeTween: {
    readonly startSpherical: Spherical;
    readonly endSpherical: Spherical;
    elapsed: number;
    readonly duration: number;
    readonly easing: EasingFunction;
    readonly elevation: number;
  } | null = null;

  public constructor(private readonly options: ControlsOptions) {
    this.minDistance = options.minDistance ?? 1.5;
    this.maxDistance = options.maxDistance ?? 6;
    this.rotateSpeed = options.rotateSpeed ?? 1;
    this.zoomSpeed = options.zoomSpeed ?? 1;
    this.autoRotateSpeed = options.autoRotateSpeed ?? 0.5;
    this.zoomMode = options.zoom?.mode ?? 'classic';
    this.zoomStrength = clamp01(options.zoom?.strength ?? 0.5);
    this.smoothZoom = options.zoom?.smooth ?? true;

    this.spherical.setFromVector3(options.camera.position);
    this.targetSpherical.copy(this.spherical);
    this.attachListeners();
  }

  public setAutoRotate(enabled: boolean, speed?: number): void {
    this.autoRotate = enabled;
    if (speed !== undefined) this.autoRotateSpeed = speed;
  }

  public setZoom(config: ZoomConfig): void {
    if (config.mode !== undefined) this.zoomMode = config.mode;
    if (config.strength !== undefined) this.zoomStrength = clamp01(config.strength);
    if (config.smooth !== undefined) this.smoothZoom = config.smooth;
  }

  public flyTo(position: LatLng, distance?: number, options: FlyToOptions = {}): void {
    if (options.duration !== undefined && options.duration <= 0) {
      this.jumpTo(position, distance);
      return;
    }
    const radius = clamp(
      distance ?? this.spherical.radius,
      this.minDistance,
      this.maxDistance
    );
    const targetVec = latLngToVector3(position, radius);
    const endSpherical = new Spherical().setFromVector3(targetVec);
    this.activeTween = {
      startSpherical: this.spherical.clone(),
      endSpherical,
      elapsed: 0,
      duration: options.duration ?? 1500,
      elevation: options.elevation ?? 0,
      easing: options.easing ?? easeInOutCubic,
    };
    this.targetSpherical.copy(endSpherical);
  }

  public jumpTo(position: LatLng, distance?: number): void {
    const radius = clamp(
      distance ?? this.spherical.radius,
      this.minDistance,
      this.maxDistance,
    );
    const targetVec = latLngToVector3(position, radius);
    this.spherical.setFromVector3(targetVec);
    this.targetSpherical.copy(this.spherical);
    this.activeTween = null;
    this.options.camera.position.setFromSpherical(this.spherical);
    this.options.camera.lookAt(0, 0, 0);
  }

  public cancelTween(): void {
    if (this.activeTween) {
      this.activeTween = null;
      this.targetSpherical.copy(this.spherical);
    }
  }

  public update(deltaSeconds: number): void {
    // While a tween is active, it owns the camera. Auto-rotate and smooth-zoom are paused.
    if (this.activeTween) {
      this.activeTween.elapsed += deltaSeconds * 1000;
      const t = Math.min(1, this.activeTween.elapsed / this.activeTween.duration);
      const eased = this.activeTween.easing(t);
      const start = this.activeTween.startSpherical;
      const end = this.activeTween.endSpherical;
      // Base radius interpolation + arched elevation profile (sin(t·π) at midpoint).
      const arched = Math.sin(t * Math.PI) * this.activeTween.elevation;
      this.spherical.radius = lerp(start.radius, end.radius, eased) + arched;
      this.spherical.theta = lerpAngle(start.theta, end.theta, eased);
      this.spherical.phi = lerp(start.phi, end.phi, eased);
      if (t >= 1) this.activeTween = null;

      this.spherical.radius = clamp(this.spherical.radius, this.minDistance, this.maxDistance);
      this.spherical.phi = clamp(this.spherical.phi, 0.05, Math.PI - 0.05);
      this.options.camera.position.setFromSpherical(this.spherical);
      this.options.camera.lookAt(0, 0, 0);
      return;
    }

    // Auto-rotate updates BOTH current and target so the smooth lerp doesn't fight it.
    if (this.autoRotate && !this.isPointerDown) {
      const delta = this.autoRotateSpeed * deltaSeconds * 0.2;
      this.spherical.theta -= delta;
      this.targetSpherical.theta -= delta;
    }

    if (this.smoothZoom) {
      const t = 1 - Math.exp(-deltaSeconds * SMOOTH_RATE);
      this.spherical.radius = lerp(this.spherical.radius, this.targetSpherical.radius, t);
      this.spherical.theta = lerpAngle(this.spherical.theta, this.targetSpherical.theta, t);
      this.spherical.phi = lerp(this.spherical.phi, this.targetSpherical.phi, t);
    } else {
      this.spherical.copy(this.targetSpherical);
    }

    this.spherical.radius = clamp(this.spherical.radius, this.minDistance, this.maxDistance);
    this.spherical.phi = clamp(this.spherical.phi, 0.05, Math.PI - 0.05);
    this.options.camera.position.setFromSpherical(this.spherical);
    this.options.camera.lookAt(0, 0, 0);
  }

  public destroy(): void {
    const el = this.options.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('wheel', this.onWheel);
  }

  private attachListeners(): void {
    const el = this.options.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.cancelTween();
    this.isPointerDown = true;
    this.previousPointer.set(event.clientX, event.clientY);
    this.options.domElement.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.isPointerDown) return;
    const dx = event.clientX - this.previousPointer.x;
    const dy = event.clientY - this.previousPointer.y;
    this.previousPointer.set(event.clientX, event.clientY);

    const { clientWidth, clientHeight } = this.options.domElement;
    const deltaTheta = (2 * Math.PI * dx * this.rotateSpeed) / clientWidth;
    const deltaPhi = (Math.PI * dy * this.rotateSpeed) / clientHeight;
    // Drag updates BOTH current and target so smooth lerp doesn't undo the drag.
    this.spherical.theta -= deltaTheta;
    this.spherical.phi -= deltaPhi;
    this.targetSpherical.theta -= deltaTheta;
    this.targetSpherical.phi -= deltaPhi;
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.isPointerDown = false;
    if (this.options.domElement.hasPointerCapture(event.pointerId)) {
      this.options.domElement.releasePointerCapture(event.pointerId);
    }
  };

  private onWheel = (event: WheelEvent): void => {
    // Zoom locked (`framing.lockZoom` or minZoom === maxZoom): the wheel
    // cannot change anything, so let the page scroll instead of swallowing
    // the event — decoration globes sitting under a scrolling page would
    // otherwise trap the cursor.
    if (this.minDistance >= this.maxDistance) return;
    this.cancelTween();
    event.preventDefault();
    const factor = Math.exp((event.deltaY * this.zoomSpeed) / 500);

    this.targetSpherical.radius = clamp(
      this.targetSpherical.radius * factor,
      this.minDistance,
      this.maxDistance
    );

    if (this.zoomMode === 'classic' || this.zoomStrength <= 0) return;

    const cursorNdc = this.eventToNdc(event);
    const worldPoint = cursorNdc ? this.raycastSphere(cursorNdc) : null;
    if (!worldPoint || !cursorNdc) return;

    if (this.zoomMode === 'repel') {
      this.applyRepelToTarget(worldPoint, cursorNdc);
    } else {
      this.applyAttractToTarget(worldPoint, factor);
    }
  };

  /**
   * Repel mode (operates on targetSpherical): iteratively rotate target angles
   * so that, at the target radius, worldPoint projects onto cursorNdc. Camera
   * is temporarily moved into the target state for projection math, then
   * restored — the actual rendered position is updated next frame in update().
   */
  private applyRepelToTarget(worldPoint: Vector3, cursorNdc: Vector2): void {
    const camera = this.options.camera;
    const fovHalfV = (camera.fov * Math.PI) / 360;
    const fovHalfH = Math.atan(Math.tan(fovHalfV) * camera.aspect);
    const savedPos = this.tempVec.copy(camera.position);

    for (let i = 0; i < 4; i++) {
      camera.position.setFromSpherical(this.targetSpherical);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      const projected = new Vector3().copy(worldPoint).project(camera);
      const dx = cursorNdc.x - projected.x;
      const dy = cursorNdc.y - projected.y;

      if (Math.abs(dx) < 0.0005 && Math.abs(dy) < 0.0005) break;

      this.targetSpherical.theta -= dx * fovHalfH * this.zoomStrength;
      this.targetSpherical.phi -= dy * fovHalfV * this.zoomStrength;
      this.targetSpherical.phi = clamp(this.targetSpherical.phi, 0.05, Math.PI - 0.05);
    }

    camera.position.copy(savedPos);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  }

  /**
   * Attract mode (operates on targetSpherical): pull target angles toward the
   * spherical of `worldPoint` so it migrates toward screen center.
   */
  private applyAttractToTarget(worldPoint: Vector3, factor: number): void {
    if (factor >= 1) return; // only attract on zoom-in
    this.tempSpherical.setFromVector3(worldPoint);
    const alpha = clamp01((1 - factor) * this.zoomStrength * 2);
    this.targetSpherical.theta = lerpAngle(this.targetSpherical.theta, this.tempSpherical.theta, alpha);
    this.targetSpherical.phi = lerp(this.targetSpherical.phi, this.tempSpherical.phi, alpha);
    this.targetSpherical.phi = clamp(this.targetSpherical.phi, 0.05, Math.PI - 0.05);
  }

  private eventToNdc(event: WheelEvent): Vector2 | null {
    const rect = this.options.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return new Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private raycastSphere(ndc: Vector2): Vector3 | null {
    const cameraPos = this.options.camera.position;
    const rayDir = new Vector3(ndc.x, ndc.y, 0.5).unproject(this.options.camera).sub(cameraPos).normalize();

    const b = cameraPos.dot(rayDir);
    const c = cameraPos.lengthSq() - GLOBE_RADIUS * GLOBE_RADIUS;
    const disc = b * b - c;
    if (disc < 0) return null;

    const t = -b - Math.sqrt(disc);
    if (t < 0) return null;

    return cameraPos.clone().add(rayDir.multiplyScalar(t));
  }
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpAngle = (a: number, b: number, t: number): number => {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
};
