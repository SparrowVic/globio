import { Spherical, Vector2, type PerspectiveCamera } from 'three';

export interface ControlsOptions {
  readonly camera: PerspectiveCamera;
  readonly domElement: HTMLElement;
  readonly minDistance?: number;
  readonly maxDistance?: number;
  readonly rotateSpeed?: number;
  readonly zoomSpeed?: number;
  readonly autoRotateSpeed?: number;
}

export class GlobeControls {
  private readonly spherical = new Spherical();
  private readonly target = new Vector2();
  private readonly previousPointer = new Vector2();
  private isPointerDown = false;
  private autoRotate = false;
  private autoRotateSpeed: number;
  private readonly minDistance: number;
  private readonly maxDistance: number;
  private readonly rotateSpeed: number;
  private readonly zoomSpeed: number;

  public constructor(private readonly options: ControlsOptions) {
    this.minDistance = options.minDistance ?? 1.5;
    this.maxDistance = options.maxDistance ?? 6;
    this.rotateSpeed = options.rotateSpeed ?? 1;
    this.zoomSpeed = options.zoomSpeed ?? 1;
    this.autoRotateSpeed = options.autoRotateSpeed ?? 0.5;

    this.spherical.setFromVector3(options.camera.position);
    this.attachListeners();
  }

  public setAutoRotate(enabled: boolean, speed?: number): void {
    this.autoRotate = enabled;
    if (speed !== undefined) this.autoRotateSpeed = speed;
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
    this.spherical.radius *= factor;
  };
}
