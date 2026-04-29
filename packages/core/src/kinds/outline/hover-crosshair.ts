import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Vector3,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';
import type { LatLng } from '../../types';

export interface HoverCrosshairOptions {
  readonly container: HTMLElement;
  readonly color: string;
  readonly size?: number;
  readonly opacity?: number;
}

const DEFAULT_SIZE = 0.012;
const DEFAULT_OPACITY = 0.85;
const SURFACE_LIFT = GLOBE_RADIUS * 1.0025;
const FOLLOW_BLEND = 0.8;
const POSITION_EPSILON = 1e-5;

/**
 * Pure formatter — `(52.23, 21.01) → '52.23°N, 21.01°E'`. Lat clamped to
 * [-90, 90]; lng wrapped into [-180, 180]. Zero is positive-poled (N/E)
 * to match standard mapping conventions.
 */
export const formatLatLng = (lat: number, lng: number): string => {
  const safeLat = Math.max(-90, Math.min(90, lat));
  const wrapped = ((lng + 540) % 360) - 180;
  const safeLng = wrapped === -180 ? 180 : wrapped;
  const ns = safeLat < 0 ? 'S' : 'N';
  const ew = safeLng < 0 ? 'W' : 'E';
  return `${Math.abs(safeLat).toFixed(2)}°${ns}, ${Math.abs(safeLng).toFixed(2)}°${ew}`;
};

/**
 * Tron-style targeting reticle: a 3D cross + ring tangent to the globe at
 * the cursor's surface intersection, plus a DOM lat/lng readout pinned next
 * to the cursor. The 3D mark chase-eases toward the latest hit so quick
 * cursor moves don't strobe.
 */
export class HoverCrosshairLayer {
  public readonly object: Group;
  private readonly container: HTMLElement;
  private readonly material: LineBasicMaterial;
  private readonly tooltip: HTMLDivElement;
  private readonly target = new Vector3();
  private readonly current = new Vector3();
  private readonly tmp = new Vector3();
  private active = false;
  private fadeT = 0;
  private readonly baseOpacity: number;

  public constructor(options: HoverCrosshairOptions) {
    this.container = options.container;
    this.baseOpacity = options.opacity ?? DEFAULT_OPACITY;
    const size = options.size ?? DEFAULT_SIZE;

    this.material = new LineBasicMaterial({
      color: new Color(options.color),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.object = new Group();
    this.object.renderOrder = 11;
    this.object.visible = false;
    this.object.add(buildReticle(size, this.material));

    this.tooltip = document.createElement('div');
    // Offset the readout vertically below the shared `CountryTooltip`
    // (which sits at translate(12px, 12px)) so the two cursor-anchored
    // tooltips stack rather than overlap when both are active.
    this.tooltip.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'left:0',
      'top:0',
      `color:${options.color}`,
      'font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      'font-size:11px',
      'letter-spacing:0.04em',
      'white-space:nowrap',
      'transform:translate(14px, 32px)',
      'opacity:0',
      'transition:opacity 80ms linear',
      'text-shadow:0 0 4px rgba(0,0,0,0.6)',
      'z-index:50',
    ].join(';');
    this.tooltip.textContent = '';
    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
    this.container.appendChild(this.tooltip);
  }

  public dispose(): void {
    this.material.dispose();
    this.object.traverse((obj) => {
      const seg = obj as LineSegments;
      if (seg.geometry) seg.geometry.dispose();
    });
    this.object.clear();
    this.tooltip.remove();
  }

  /** External enable/disable mirrors the kind's `setVisible` lifecycle. */
  public setEnabled(enabled: boolean): void {
    if (!enabled) this.hide();
    this.object.visible = enabled && this.active;
    this.tooltip.style.display = enabled ? '' : 'none';
  }

  public hide(): void {
    this.active = false;
  }

  public showAt(point3D: Vector3, latLng: LatLng, pixelX: number, pixelY: number): void {
    if (!this.active) {
      // Snap on first appearance so we don't slide in from origin.
      this.current.copy(point3D).setLength(SURFACE_LIFT);
    }
    this.active = true;
    this.target.copy(point3D).setLength(SURFACE_LIFT);
    this.tooltip.textContent = formatLatLng(latLng[0], latLng[1]);
    this.tooltip.style.left = `${pixelX}px`;
    this.tooltip.style.top = `${pixelY}px`;
  }

  public update(delta: number): void {
    const target = this.active ? 1 : 0;
    if (this.fadeT !== target) {
      const step = delta / 0.08;
      const dir = target > this.fadeT ? 1 : -1;
      this.fadeT = Math.max(0, Math.min(1, this.fadeT + dir * step));
    }
    this.material.opacity = this.fadeT * this.baseOpacity;
    this.tooltip.style.opacity = `${this.fadeT}`;

    if (this.active) {
      // Chase ease toward target — frame-rate independent variant of 80% blend.
      const k = 1 - Math.pow(1 - FOLLOW_BLEND, Math.max(0, delta * 60));
      this.tmp.copy(this.target).sub(this.current).multiplyScalar(k);
      this.current.add(this.tmp);
      if (this.current.lengthSq() < POSITION_EPSILON) this.current.copy(this.target);
      this.object.position.copy(this.current);
      // Orient so the reticle plane is tangent to the sphere. `lookAt`
      // uses world-space coords; `(0, 0, 0)` is the globe centre regardless
      // of any rotation applied to `globeGroup` (axisTilt). The reticle's
      // local -Z then points inward and its XY plane sits tangent.
      this.object.lookAt(0, 0, 0);
      this.object.visible = true;
    } else if (this.fadeT === 0) {
      this.object.visible = false;
    }
  }
}

const buildReticle = (size: number, material: LineBasicMaterial): LineSegments => {
  // Tiny cross + circle: cross arms run along local X/Y, circle in same plane.
  const arms: Array<number> = [
    -size, 0, 0, size, 0, 0,
    0, -size, 0, 0, size, 0,
  ];
  const ringSegs = 24;
  const ringR = size * 0.7;
  for (let i = 0; i < ringSegs; i++) {
    const t1 = (i / ringSegs) * Math.PI * 2;
    const t2 = ((i + 1) / ringSegs) * Math.PI * 2;
    arms.push(Math.cos(t1) * ringR, Math.sin(t1) * ringR, 0);
    arms.push(Math.cos(t2) * ringR, Math.sin(t2) * ringR, 0);
  }
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(arms, 3));
  return new LineSegments(geom, material);
};
