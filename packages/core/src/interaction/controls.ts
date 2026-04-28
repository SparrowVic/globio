import { Spherical, Vector2, Vector3, type PerspectiveCamera } from 'three';
import { GLOBE_RADIUS } from '../utils/coordinates';
import type { ZoomConfig, ZoomMode } from '../types';

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

export class GlobeControls {
  private readonly spherical = new Spherical();
  private readonly previousPointer = new Vector2();
  private isPointerDown = false;
  private autoRotate = false;
  private autoRotateSpeed: number;
  private zoomMode: ZoomMode;
  private zoomStrength: number;
  private readonly minDistance: number;
  private readonly maxDistance: number;
  private readonly rotateSpeed: number;
  private readonly zoomSpeed: number;
  private readonly tempVec = new Vector3();
  private readonly tempSpherical = new Spherical();

  public constructor(private readonly options: ControlsOptions) {
    this.minDistance = options.minDistance ?? 1.5;
    this.maxDistance = options.maxDistance ?? 6;
    this.rotateSpeed = options.rotateSpeed ?? 1;
    this.zoomSpeed = options.zoomSpeed ?? 1;
    this.autoRotateSpeed = options.autoRotateSpeed ?? 0.5;
    this.zoomMode = options.zoom?.mode ?? 'classic';
    this.zoomStrength = clamp01(options.zoom?.strength ?? 0.5);

    this.spherical.setFromVector3(options.camera.position);
    this.attachListeners();
  }

  public setAutoRotate(enabled: boolean, speed?: number): void {
    this.autoRotate = enabled;
    if (speed !== undefined) this.autoRotateSpeed = speed;
  }

  public setZoom(config: ZoomConfig): void {
    if (config.mode !== undefined) this.zoomMode = config.mode;
    if (config.strength !== undefined) this.zoomStrength = clamp01(config.strength);
  }

  public update(deltaSeconds: number): void {
    if (this.autoRotate && !this.isPointerDown) {
      this.spherical.theta -= this.autoRotateSpeed * deltaSeconds * 0.2;
    }
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
    this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi));
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
    this.spherical.theta -= (2 * Math.PI * dx * this.rotateSpeed) / clientWidth;
    this.spherical.phi -= (Math.PI * dy * this.rotateSpeed) / clientHeight;
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.isPointerDown = false;
    if (this.options.domElement.hasPointerCapture(event.pointerId)) {
      this.options.domElement.releasePointerCapture(event.pointerId);
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const factor = Math.exp((event.deltaY * this.zoomSpeed) / 500);

    if (this.zoomMode === 'classic' || this.zoomStrength <= 0) {
      this.spherical.radius *= factor;
      return;
    }

    const cursorNdc = this.eventToNdc(event);
    const worldPoint = cursorNdc ? this.raycastSphere(cursorNdc) : null;

    this.spherical.radius *= factor;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    if (!worldPoint || !cursorNdc) return;

    if (this.zoomMode === 'repel') {
      this.applyRepel(worldPoint, cursorNdc);
    } else {
      this.applyAttract(worldPoint, factor);
    }
  };

  /**
   * Repel mode: cursor stays anchored to the same world point. Iterates an
   * NDC-delta correction to converge the projected position of `worldPoint`
   * onto `cursorNdc`. With strength=1 ~3-4 iterations reach <0.0005 NDC error.
   */
  private applyRepel(worldPoint: Vector3, cursorNdc: Vector2): void {
    const camera = this.options.camera;
    const fovHalfV = (camera.fov * Math.PI) / 360;
    const fovHalfH = Math.atan(Math.tan(fovHalfV) * camera.aspect);

    for (let i = 0; i < 4; i++) {
      camera.position.setFromSpherical(this.spherical);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      this.tempVec.copy(worldPoint).project(camera);
      const dx = cursorNdc.x - this.tempVec.x;
      const dy = cursorNdc.y - this.tempVec.y;

      if (Math.abs(dx) < 0.0005 && Math.abs(dy) < 0.0005) break;

      this.spherical.theta -= dx * fovHalfH * this.zoomStrength;
      this.spherical.phi -= dy * fovHalfV * this.zoomStrength;
      this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi));
    }
  }

  /**
   * Attract mode: pull camera angles toward the spherical of `worldPoint` so
   * that point migrates toward the center of the screen. Step size is
   * proportional to zoom amount × strength so each scroll feels natural.
   */
  private applyAttract(worldPoint: Vector3, factor: number): void {
    if (factor >= 1) return; // only attract on zoom-in
    this.tempSpherical.setFromVector3(worldPoint);
    const alpha = clamp01((1 - factor) * this.zoomStrength * 2);
    this.spherical.theta = lerpAngle(this.spherical.theta, this.tempSpherical.theta, alpha);
    this.spherical.phi = lerp(this.spherical.phi, this.tempSpherical.phi, alpha);
    this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi));
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

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpAngle = (a: number, b: number, t: number): number => {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
};
