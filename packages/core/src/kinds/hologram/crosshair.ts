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

export interface HologramCrosshairOptions {
  readonly container: HTMLElement;
  readonly color: string;
  readonly size?: number;
  readonly opacity?: number;
  /**
   * Inner ring radius as a fraction of the cross arm length. 0 = no
   * ring (just the cross), 0.7 (default) = ring fits inside the
   * crosshair's diagonal envelope, 1.0 = ring touches arm endpoints.
   */
  readonly ringRadiusFactor?: number;
  /**
   * If true (default), small N/S/E/W tick marks are drawn just outside
   * the ring at each cardinal direction — extra visual targeting cue.
   */
  readonly cardinalTicks?: boolean;
  /**
   * If true (default), a DOM tooltip near the cursor shows the lat/
   * lng readout. Disable for a pure visual reticle.
   */
  readonly tooltip?: boolean;
  /** Decimal places in the lat/lng readout. Default 2. */
  readonly tooltipDecimals?: number;
}

const DEFAULT_SIZE = 0.012;
const DEFAULT_OPACITY = 0.85;
const DEFAULT_RING_FACTOR = 0.7;
const SURFACE_LIFT = GLOBE_RADIUS * 1.0025;
const FOLLOW_BLEND = 0.8;
const POSITION_EPSILON = 1e-5;
const ROTATE_SPEED = 0.72;

/**
 * Pure formatter — `(52.23, 21.01) → '52.23°N, 21.01°E'`. Lat clamped to
 * [-90, 90]; lng wrapped into [-180, 180]. Zero is positive-poled (N/E)
 * to match standard mapping conventions.
 */
export const formatLatLng = (lat: number, lng: number, decimals = 2): string => {
  const safeLat = Math.max(-90, Math.min(90, lat));
  const wrapped = ((lng + 540) % 360) - 180;
  const safeLng = wrapped === -180 ? 180 : wrapped;
  const ns = safeLat < 0 ? 'S' : 'N';
  const ew = safeLng < 0 ? 'W' : 'E';
  return `${Math.abs(safeLat).toFixed(decimals)}°${ns}, ${Math.abs(safeLng).toFixed(decimals)}°${ew}`;
};

/**
 * Tron-style targeting reticle: a 3D cross + ring tangent to the globe at
 * the cursor's surface intersection, plus a DOM lat/lng readout pinned next
 * to the cursor. The 3D mark chase-eases toward the latest hit so quick
 * cursor moves don't strobe.
 */
export class HologramCrosshairLayer {
  public readonly object: Group;
  private readonly container: HTMLElement;
  private readonly material: LineBasicMaterial;
  private readonly tooltip: HTMLDivElement;
  private readonly target = new Vector3();
  private readonly current = new Vector3();
  private readonly tmp = new Vector3();
  private active = false;
  private fadeT = 0;
  private baseOpacity: number;
  // Mutable so live setters can mutate without rebuilding the layer.
  private size: number;
  private ringRadiusFactor: number;
  private cardinalTicks: boolean;
  private tooltipEnabled: boolean;
  private tooltipDecimals: number;
  private latestLat = 0;
  private latestLng = 0;
  private elapsed = 0;

  public constructor(options: HologramCrosshairOptions) {
    this.container = options.container;
    this.baseOpacity = options.opacity ?? DEFAULT_OPACITY;
    this.size = options.size ?? DEFAULT_SIZE;
    this.ringRadiusFactor = options.ringRadiusFactor ?? DEFAULT_RING_FACTOR;
    this.cardinalTicks = options.cardinalTicks ?? true;
    this.tooltipEnabled = options.tooltip ?? true;
    this.tooltipDecimals = options.tooltipDecimals ?? 2;

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
    this.object.add(buildReticle(this.size, this.ringRadiusFactor, this.cardinalTicks, this.material));

    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'left:0',
      'top:0',
      `color:${options.color}`,
      'background:rgba(3,18,28,0.58)',
      `border:1px solid ${options.color}66`,
      'padding:3px 7px',
      'border-radius:2px',
      'font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      'font-size:11px',
      'letter-spacing:0.12em',
      'white-space:nowrap',
      'transform:translate(14px, 32px)',
      'opacity:0',
      'transition:opacity 80ms linear',
      `box-shadow:0 0 14px ${options.color}33, inset 0 0 10px ${options.color}1f`,
      'text-shadow:0 0 7px currentColor',
      'text-transform:uppercase',
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

  public setEnabled(enabled: boolean): void {
    if (!enabled) this.hide();
    this.object.visible = enabled && this.active;
    this.tooltip.style.display = enabled && this.tooltipEnabled ? '' : 'none';
  }

  public hide(): void {
    this.active = false;
  }

  public showAt(point3D: Vector3, latLng: LatLng, pixelX: number, pixelY: number): void {
    if (!this.active) {
      this.current.copy(point3D).setLength(SURFACE_LIFT);
    }
    this.active = true;
    this.target.copy(point3D).setLength(SURFACE_LIFT);
    this.latestLat = latLng[0];
    this.latestLng = latLng[1];
    this.tooltip.textContent = `HOLO ${formatLatLng(latLng[0], latLng[1], this.tooltipDecimals)}`;
    this.tooltip.style.left = `${pixelX}px`;
    this.tooltip.style.top = `${pixelY}px`;
  }

  public update(delta: number): void {
    this.elapsed += delta;
    const target = this.active ? 1 : 0;
    if (this.fadeT !== target) {
      const step = delta / 0.08;
      const dir = target > this.fadeT ? 1 : -1;
      this.fadeT = Math.max(0, Math.min(1, this.fadeT + dir * step));
    }
    const projectorFlicker = 0.78 + 0.22 * Math.sin(this.elapsed * 18);
    this.material.opacity = this.fadeT * this.baseOpacity * projectorFlicker;
    this.tooltip.style.opacity = `${this.fadeT}`;

    if (this.active) {
      const k = 1 - Math.pow(1 - FOLLOW_BLEND, Math.max(0, delta * 60));
      this.tmp.copy(this.target).sub(this.current).multiplyScalar(k);
      this.current.add(this.tmp);
      if (this.current.lengthSq() < POSITION_EPSILON) this.current.copy(this.target);
      this.object.position.copy(this.current);
      this.object.lookAt(0, 0, 0);
      this.object.rotateZ(this.elapsed * ROTATE_SPEED);
      this.object.visible = true;
    } else if (this.fadeT === 0) {
      this.object.visible = false;
    }
  }

  /* ───────── live setters ───────── */

  /** Mutate the reticle line color without rebuilding. */
  public setColor(color: string): void {
    this.material.color.set(color);
    this.tooltip.style.color = color;
    this.tooltip.style.borderColor = `${color}66`;
    this.tooltip.style.boxShadow = `0 0 14px ${color}33, inset 0 0 10px ${color}1f`;
  }

  /** Mutate the base opacity multiplier (effective only while reticle is active). */
  public setOpacity(opacity: number): void {
    this.baseOpacity = opacity;
  }

  /**
   * Live update for the reticle size. Cheap geometry rebuild — single
   * LineSegments mesh, ~32 line segments, no GPU buffer churn.
   */
  public setSize(size: number): void {
    this.size = size;
    this.rebuildReticle();
  }

  /** Live update for the inner ring radius factor. */
  public setRingRadiusFactor(factor: number): void {
    this.ringRadiusFactor = factor;
    this.rebuildReticle();
  }

  /** Live toggle for the N/S/E/W cardinal tick marks. */
  public setCardinalTicks(enabled: boolean): void {
    this.cardinalTicks = enabled;
    this.rebuildReticle();
  }

  /** Live toggle for the lat/lng DOM tooltip. */
  public setTooltipVisible(visible: boolean): void {
    this.tooltipEnabled = visible;
    this.tooltip.style.display = visible ? '' : 'none';
  }

  /** Live update for the lat/lng readout precision. */
  public setTooltipDecimals(decimals: number): void {
    this.tooltipDecimals = decimals;
    if (this.active) {
      this.tooltip.textContent = `HOLO ${formatLatLng(this.latestLat, this.latestLng, decimals)}`;
    }
  }

  private rebuildReticle(): void {
    // Dispose existing geometries and rebuild from scratch — small
    // single mesh, this is a cheap operation.
    const old = this.object.children[0] as LineSegments | undefined;
    if (old) {
      old.geometry.dispose();
      this.object.remove(old);
    }
    this.object.add(
      buildReticle(this.size, this.ringRadiusFactor, this.cardinalTicks, this.material),
    );
  }
}

/**
 * Build the hologram reticle geometry: square projection brackets, a
 * broken calibration ring, scan gates, and optional cardinal ticks. It
 * intentionally avoids the outline kind's simple cross+circle silhouette.
 */
const buildReticle = (
  size: number,
  ringRadiusFactor: number,
  cardinalTicks: boolean,
  material: LineBasicMaterial,
): LineSegments => {
  const arms: Array<number> = [];
  const push = (x1: number, y1: number, x2: number, y2: number): void => {
    arms.push(x1, y1, 0, x2, y2, 0);
  };

  const gate = size * 0.36;
  push(-gate, 0, gate, 0);
  push(0, -gate, 0, gate);

  const box = size * 1.18;
  const corner = size * 0.34;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      push(sx * box, sy * box, sx * (box - corner), sy * box);
      push(sx * box, sy * box, sx * box, sy * (box - corner));
    }
  }

  const ringR = size * ringRadiusFactor;
  if (ringR > 0) {
    const ringSegs = 28;
    for (let i = 0; i < ringSegs; i++) {
      if (i % 4 === 1) continue;
      const t1 = (i / ringSegs) * Math.PI * 2;
      const t2 = ((i + 1) / ringSegs) * Math.PI * 2;
      push(Math.cos(t1) * ringR, Math.sin(t1) * ringR, Math.cos(t2) * ringR, Math.sin(t2) * ringR);
    }
  }
  if (cardinalTicks && ringR > 0) {
    const tickLen = size * 0.24;
    const tickStart = ringR + size * 0.08;
    const tickEnd = tickStart + tickLen;
    push(tickStart, 0, tickEnd, 0);
    push(-tickStart, 0, -tickEnd, 0);
    push(0, tickStart, 0, tickEnd);
    push(0, -tickStart, 0, -tickEnd);

    const scan = size * 1.42;
    push(-scan, size * 0.16, -size * 0.62, size * 0.16);
    push(size * 0.62, -size * 0.16, scan, -size * 0.16);
  }
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(arms, 3));
  return new LineSegments(geom, material);
};
