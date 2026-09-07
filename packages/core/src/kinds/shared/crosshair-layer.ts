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

export interface CrosshairOptions {
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
export class CrosshairLayer {
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

  public constructor(options: CrosshairOptions) {
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
    this.tooltip.textContent = formatLatLng(latLng[0], latLng[1], this.tooltipDecimals);
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
      const k = 1 - Math.pow(1 - FOLLOW_BLEND, Math.max(0, delta * 60));
      this.tmp.copy(this.target).sub(this.current).multiplyScalar(k);
      this.current.add(this.tmp);
      if (this.current.lengthSq() < POSITION_EPSILON) this.current.copy(this.target);
      this.object.position.copy(this.current);
      this.object.lookAt(0, 0, 0);
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
      this.tooltip.textContent = formatLatLng(this.latestLat, this.latestLng, decimals);
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
 * Build the reticle geometry: a cross + (optional) inner ring + (optional)
 * cardinal tick marks at N/S/E/W just outside the ring.
 */
const buildReticle = (
  size: number,
  ringRadiusFactor: number,
  cardinalTicks: boolean,
  material: LineBasicMaterial,
): LineSegments => {
  const arms: Array<number> = [
    -size, 0, 0, size, 0, 0,
    0, -size, 0, 0, size, 0,
  ];
  const ringR = size * ringRadiusFactor;
  if (ringR > 0) {
    const ringSegs = 24;
    for (let i = 0; i < ringSegs; i++) {
      const t1 = (i / ringSegs) * Math.PI * 2;
      const t2 = ((i + 1) / ringSegs) * Math.PI * 2;
      arms.push(Math.cos(t1) * ringR, Math.sin(t1) * ringR, 0);
      arms.push(Math.cos(t2) * ringR, Math.sin(t2) * ringR, 0);
    }
  }
  if (cardinalTicks && ringR > 0) {
    // Four tiny ticks just outside the ring (15% of size length each).
    const tickLen = size * 0.15;
    const tickStart = ringR + size * 0.06;
    const tickEnd = tickStart + tickLen;
    arms.push(tickStart, 0, 0, tickEnd, 0, 0);
    arms.push(-tickStart, 0, 0, -tickEnd, 0, 0);
    arms.push(0, tickStart, 0, 0, tickEnd, 0);
    arms.push(0, -tickStart, 0, 0, -tickEnd, 0);
  }
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(arms, 3));
  return new LineSegments(geom, material);
};
