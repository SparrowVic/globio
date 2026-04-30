import {
  CylinderGeometry,
  Group,
  Mesh,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { angularExtent, boundsCenter, computeMainRingBounds } from '../../utils/country-bounds';
import { colorForValue, type ScaleConfig } from '../../data/scales';
import type { CountryFeature } from '../../renderer/country-feature';
import type { LatLng } from '../../types';
import type { BarsDataEntry, BarsDataLayer } from '../types';

const DEFAULT_MIN_HEIGHT = 0.02;
const DEFAULT_MAX_HEIGHT = 0.4;
const DEFAULT_WIDTH = 0.012;
const DEFAULT_MOUNT_DURATION_MS = 700;
const DEFAULT_FALLBACK_COLOR = '#ffffff';
const RADIAL_SEGMENTS = 16;

interface BarEntry {
  readonly mesh: Mesh;
  readonly material: Material;
  readonly geometry: BufferGeometry;
  readonly targetHeight: number;
}

export interface BarsLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly layer: BarsDataLayer;
  /**
   * Per-bar material factory. Each bar gets its own instance so colors can
   * differ (or so kind-specific blending stays per-bar). The kind decorator
   * supplies this — outline returns a solid `MeshBasicMaterial`, dotted
   * returns an additive glowing one, etc.
   */
  readonly buildMaterial: (color: string) => Material;
  /**
   * Fallback color when neither `entry.color` nor `layer.scale` produces one.
   * Defaults to white. Passed by the kind so its theme tint shows through.
   */
  readonly fallbackColor?: string;
}

/**
 * Bars on the sphere — one cylinder per `BarsDataEntry`, anchored at lat/lng
 * (or country centroid resolved by id), oriented along the surface normal.
 * Height is `value`-mapped to `[height.min, height.max]`; color comes from
 * `entry.color`, the layer's `scale`, or the fallback.
 *
 * Mount animation: `'rise'` grows `mesh.scale.y` from 0 → 1 over
 * `mountDurationMs` (eased). `'none'` snaps to full height immediately.
 *
 * Each bar uses its own `CylinderGeometry` and `Material` — fine for hundreds
 * of bars; for thousands an `InstancedMesh` upgrade would be needed.
 */
export class BarsLayer {
  public readonly group: Group;
  private readonly entries: Array<BarEntry> = [];
  private readonly mountDuration: number;
  private readonly animateOnMount: 'rise' | 'none';
  private mountElapsed = 0;

  public constructor(options: BarsLayerOptions) {
    this.group = new Group();
    this.group.name = 'BarsLayer';
    this.animateOnMount = options.layer.animateOnMount ?? 'rise';
    this.mountDuration =
      Math.max(0, options.layer.mountDurationMs ?? DEFAULT_MOUNT_DURATION_MS) / 1000;
    this.build(options);
  }

  public update(delta: number): void {
    if (this.mountDuration <= 0 || this.mountElapsed >= this.mountDuration) return;
    this.mountElapsed = Math.min(this.mountDuration, this.mountElapsed + delta);
    const t = this.mountElapsed / this.mountDuration;
    // easeOutCubic — same family used elsewhere in the project for layer
    // mount-ins (looks "settled" rather than linear-fast).
    const eased = 1 - Math.pow(1 - t, 3);
    for (const entry of this.entries) {
      entry.mesh.scale.y = entry.targetHeight * eased;
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    for (const entry of this.entries) {
      entry.geometry.dispose();
      entry.material.dispose();
    }
    this.entries.length = 0;
    this.group.clear();
  }

  private build(options: BarsLayerOptions): void {
    const { layer, features, buildMaterial } = options;
    const fallback = options.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    const featuresById = new Map<string, CountryFeature>();
    for (const f of features) featuresById.set(f.id, f);

    const width = layer.width ?? DEFAULT_WIDTH;
    const minH = layer.height?.min ?? DEFAULT_MIN_HEIGHT;
    const maxH = layer.height?.max ?? DEFAULT_MAX_HEIGHT;
    const extent = computeBarExtent(layer.data);

    for (const entry of layer.data) {
      const position = resolvePosition(entry, featuresById);
      if (!position) continue;
      const surface = latLngToVector3(position, GLOBE_RADIUS);
      const normal = surface.clone().normalize();
      const targetHeight = scaleHeight(entry.value, extent, minH, maxH);
      const color = pickBarColor(entry, layer.scale, extent, fallback);

      // Cylinder of radius=barRadius, height=1, translated so its base sits
      // at the local origin (top at +Y=1). Per-mesh `scale.y = height`
      // stretches it during animation without moving the base.
      const geometry = new CylinderGeometry(
        width / 2,
        width / 2,
        1,
        RADIAL_SEGMENTS
      );
      geometry.translate(0, 0.5, 0);
      const material = buildMaterial(color);
      const mesh = new Mesh(geometry, material);
      mesh.position.copy(surface);
      mesh.quaternion.setFromUnitVectors(BAR_AXIS, normal);
      mesh.scale.y = this.animateOnMount === 'rise' && this.mountDuration > 0 ? 0 : targetHeight;
      this.group.add(mesh);
      this.entries.push({ mesh, material, geometry, targetHeight });
    }
  }
}

const BAR_AXIS = new Vector3(0, 1, 0);

const resolvePosition = (
  entry: BarsDataEntry,
  features: Map<string, CountryFeature>
): LatLng | null => {
  if (entry.position) return entry.position;
  if (entry.id) {
    const feature = features.get(entry.id);
    if (!feature) return null;
    const bounds = computeMainRingBounds(feature.coordinates);
    if (angularExtent(bounds) <= 0) return null;
    const [lat, lng] = boundsCenter(bounds);
    return [lat, lng];
  }
  return null;
};

const computeBarExtent = (
  entries: ReadonlyArray<BarsDataEntry>
): readonly [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (const e of entries) {
    if (typeof e.value !== 'number' || !Number.isFinite(e.value)) continue;
    if (e.value < min) min = e.value;
    if (e.value > max) max = e.value;
  }
  if (min === Infinity || max === -Infinity) return [0, 1];
  if (min === max) return [min, min + 1];
  return [min, max];
};

const scaleHeight = (
  value: number,
  extent: readonly [number, number],
  min: number,
  max: number
): number => {
  if (!Number.isFinite(value)) return min;
  const [lo, hi] = extent;
  const span = hi - lo;
  const t = span > 0 ? (value - lo) / span : 0;
  const clamped = Math.max(0, Math.min(1, t));
  return min + clamped * (max - min);
};

const pickBarColor = (
  entry: BarsDataEntry,
  scale: ScaleConfig | undefined,
  extent: readonly [number, number],
  fallback: string
): string => {
  if (entry.color) return entry.color;
  if (scale) {
    const c = colorForValue(scale, entry.value, extent);
    if (c) return c;
  }
  return fallback;
};
