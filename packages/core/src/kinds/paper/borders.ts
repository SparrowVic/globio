import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  PointsMaterial,
  Points,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryFeature } from '../../renderer/country-feature';
import { jitterRing, seededJitter } from './jitter';

export interface PaperStippleOptions {
  readonly enabled: boolean;
  /** Average dot every N degrees along the ring. Lower = denser. */
  readonly density: number;
  readonly size: number;
}

export interface PaperInkBleedOptions {
  readonly enabled: boolean;
  readonly color: string;
  readonly opacity: number;
  /** Outward lift of the bleed pass relative to the surface. */
  readonly spread: number;
}

export interface PaperBordersLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly opacity: number;
  readonly roughness: number;
  readonly width?: number;
  readonly stipple?: PaperStippleOptions;
  readonly inkBleed?: PaperInkBleedOptions;
}

const SURFACE_RADIUS = GLOBE_RADIUS * 1.001;
const DEFAULT_BLEED_LIFT = 0.0008; // → BLEED_RADIUS = GLOBE_RADIUS * 1.0008
const DEFAULT_BLEED_OPACITY_FACTOR = 0.35;
const DEFAULT_STIPPLE_DENSITY = 1.5; // every 1.5° of ring length
const DEFAULT_STIPPLE_SIZE = 1.0;

/**
 * Hand-drawn-feeling country borders. Ring vertices get a deterministic
 * perpendicular jitter baked in (no per-frame shader cost) before being
 * projected to 3D, then drawn as `LineSegments`. Two passes — a faint wider
 * "ink bleed" pass underneath plus a tight crisp pass on top — read like
 * a pen drawn through absorbent paper.
 *
 * Optional stipple mode swaps the crisp ink line for a dotted point cloud
 * along the same jittered ring — same hand-drawn feel, dottier vibe (pen
 * dabbed instead of dragged).
 *
 * All inputs are live-tunable. Color/opacity/width hit material uniforms
 * directly; stipple toggle and roughness rebuild geometry in place (single
 * BufferGeometry rebuild — small cost, no flicker for the rest of the scene).
 */
export class PaperBordersLayer {
  public readonly group: Group;

  // Cached construction values so live setters can rebuild geometry
  // without callers having to repass them.
  private readonly features: ReadonlyArray<CountryFeature>;
  private currentColor: string;
  private currentOpacity: number;
  private currentRoughness: number;
  private currentWidth: number;
  private stipple: PaperStippleOptions;
  private inkBleed: PaperInkBleedOptions;

  // Defaults for reset semantics (theme-driven values captured at build).
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;
  private readonly defaultRoughness: number;
  private readonly defaultWidth: number;
  private readonly defaultStipple: PaperStippleOptions;
  private readonly defaultInkBleed: PaperInkBleedOptions;

  // Materials persist across rebuilds so opacity/color updates don't churn
  // shader compilations.
  private readonly inkMaterial: LineBasicMaterial;
  private readonly bleedMaterial: LineBasicMaterial;
  private readonly stippleMaterial: PointsMaterial;

  // Per-rebuild live geometry list (disposed + replaced on geometry-baked
  // setter calls).
  private liveGeometries: Array<BufferGeometry> = [];

  public constructor(options: PaperBordersLayerOptions) {
    this.group = new Group();
    this.group.name = 'PaperBordersLayer';

    this.features = options.features;
    this.currentColor = options.color;
    this.currentOpacity = options.opacity;
    this.currentRoughness = options.roughness;
    this.currentWidth = options.width ?? 1;
    this.stipple = options.stipple ?? {
      enabled: false,
      density: DEFAULT_STIPPLE_DENSITY,
      size: DEFAULT_STIPPLE_SIZE,
    };
    this.inkBleed = options.inkBleed ?? {
      enabled: true,
      color: options.color,
      opacity: options.opacity * DEFAULT_BLEED_OPACITY_FACTOR,
      spread: DEFAULT_BLEED_LIFT,
    };
    this.defaultColor = this.currentColor;
    this.defaultOpacity = this.currentOpacity;
    this.defaultRoughness = this.currentRoughness;
    this.defaultWidth = this.currentWidth;
    this.defaultStipple = this.stipple;
    this.defaultInkBleed = this.inkBleed;

    this.inkMaterial = new LineBasicMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: this.currentOpacity,
      linewidth: this.currentWidth,
    });
    this.bleedMaterial = new LineBasicMaterial({
      color: this.inkBleed.color,
      transparent: true,
      opacity: this.inkBleed.enabled ? this.inkBleed.opacity : 0,
      linewidth: this.currentWidth * 1.6,
    });
    this.stippleMaterial = new PointsMaterial({
      color: this.currentColor,
      transparent: true,
      opacity: this.currentOpacity,
      size: this.stipple.size * 0.012,
      sizeAttenuation: true,
    });

    this.rebuild();
  }

  // -----------------------------------------------------------------------
  // Geometry build
  // -----------------------------------------------------------------------

  private rebuild(): void {
    // Tear down previous mesh objects + their geometries.
    for (const geom of this.liveGeometries) geom.dispose();
    this.liveGeometries = [];
    this.group.clear();

    const bleedRadius = GLOBE_RADIUS * (1 + this.inkBleed.spread);

    this.features.forEach((feature) => {
      feature.coordinates.forEach((ring, ringIdx) => {
        if (ring.length < 2) return;
        const seed = `${feature.id}#${ringIdx}`;
        const jittered = jitterRing(ring, this.currentRoughness, seed);

        if (this.stipple.enabled) {
          // Dotted line — sample points along the jittered ring at a
          // density-driven cadence, splatter them as a Points cloud.
          const positions: Array<number> = [];
          const stepDeg = Math.max(0.1, this.stipple.density);
          let acc = 0;
          for (let i = 0; i < jittered.length - 1; i++) {
            const a = jittered[i];
            const b = jittered[i + 1];
            if (!a || !b) continue;
            const segDeg = Math.hypot(b[0] - a[0], b[1] - a[1]);
            acc += segDeg;
            while (acc >= stepDeg) {
              acc -= stepDeg;
              const t = 1 - acc / segDeg;
              const lng = a[0] + (b[0] - a[0]) * t;
              const lat = a[1] + (b[1] - a[1]) * t;
              const v = latLngToVector3([lat, lng], SURFACE_RADIUS);
              // Add a tiny seeded jiggle to each dot so they don't read as
              // a perfectly-spaced printer dot trail.
              const jx = seededJitter(`${seed}.s|${i}|${positions.length}`) * 0.001;
              const jy = seededJitter(`${seed}.t|${i}|${positions.length}`) * 0.001;
              positions.push(v.x + jx, v.y + jy, v.z);
            }
          }
          if (positions.length === 0) return;
          const geom = new BufferGeometry();
          geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
          this.liveGeometries.push(geom);
          const points = new Points(geom, this.stippleMaterial);
          points.userData['countryId'] = feature.id;
          this.group.add(points);
          return;
        }

        // Solid ink path — two LineSegments passes (ink + bleed).
        const inkPositions: Array<number> = [];
        const bleedPositions: Array<number> = [];
        for (let i = 0; i < jittered.length - 1; i++) {
          const a = jittered[i];
          const b = jittered[i + 1];
          if (!a || !b) continue;
          const v1 = latLngToVector3([a[1], a[0]], SURFACE_RADIUS);
          const v2 = latLngToVector3([b[1], b[0]], SURFACE_RADIUS);
          inkPositions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
          if (this.inkBleed.enabled) {
            const w1 = latLngToVector3([a[1], a[0]], bleedRadius);
            const w2 = latLngToVector3([b[1], b[0]], bleedRadius);
            bleedPositions.push(w1.x, w1.y, w1.z, w2.x, w2.y, w2.z);
          }
        }
        if (inkPositions.length === 0) return;

        const inkGeometry = new BufferGeometry();
        inkGeometry.setAttribute('position', new Float32BufferAttribute(inkPositions, 3));
        this.liveGeometries.push(inkGeometry);
        const ink = new LineSegments(inkGeometry, this.inkMaterial);
        ink.userData['countryId'] = feature.id;

        if (this.inkBleed.enabled) {
          const bleedGeometry = new BufferGeometry();
          bleedGeometry.setAttribute(
            'position',
            new Float32BufferAttribute(bleedPositions, 3)
          );
          this.liveGeometries.push(bleedGeometry);
          const bleed = new LineSegments(bleedGeometry, this.bleedMaterial);
          bleed.userData['countryId'] = feature.id;
          this.group.add(bleed);
        }
        this.group.add(ink);
      });
    });
  }

  // -----------------------------------------------------------------------
  // Live setters
  // -----------------------------------------------------------------------

  public setColor(color: string): void {
    this.currentColor = color;
    this.inkMaterial.color.set(color);
    this.stippleMaterial.color.set(color);
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  public setOpacity(opacity: number): void {
    this.currentOpacity = opacity;
    this.inkMaterial.opacity = opacity;
    this.stippleMaterial.opacity = opacity;
    if (this.inkBleed.enabled) {
      this.bleedMaterial.opacity = this.inkBleed.opacity;
    }
  }

  public resetOpacity(): void {
    this.setOpacity(this.defaultOpacity);
  }

  public setWidth(width: number): void {
    this.currentWidth = width;
    this.inkMaterial.linewidth = width;
    this.bleedMaterial.linewidth = width * 1.6;
    this.stippleMaterial.size = this.stipple.size * 0.012 * Math.max(0.5, width);
  }

  public resetWidth(): void {
    this.setWidth(this.defaultWidth);
  }

  /**
   * Roughness is geometry-baked (per-vertex perpendicular wobble pre-
   * project) so this triggers a full geometry rebuild. Each rebuild
   * iterates ~190k vertices; still well under one frame on the desktop
   * dataset. Acceptable for a slider drag.
   */
  public setRoughness(roughness: number): void {
    if (roughness === this.currentRoughness) return;
    this.currentRoughness = roughness;
    this.rebuild();
  }

  public resetRoughness(): void {
    this.setRoughness(this.defaultRoughness);
  }

  public setStipple(next: Partial<PaperStippleOptions>): void {
    const merged: PaperStippleOptions = {
      enabled: next.enabled ?? this.stipple.enabled,
      density: next.density ?? this.stipple.density,
      size: next.size ?? this.stipple.size,
    };
    const enabledChanged = merged.enabled !== this.stipple.enabled;
    const densityChanged = merged.density !== this.stipple.density;
    this.stipple = merged;
    this.stippleMaterial.size = merged.size * 0.012 * Math.max(0.5, this.currentWidth);
    if (enabledChanged || densityChanged) {
      this.rebuild();
    }
  }

  public resetStipple(): void {
    this.setStipple(this.defaultStipple);
  }

  public setInkBleed(next: Partial<PaperInkBleedOptions>): void {
    const merged: PaperInkBleedOptions = {
      enabled: next.enabled ?? this.inkBleed.enabled,
      color: next.color ?? this.inkBleed.color,
      opacity: next.opacity ?? this.inkBleed.opacity,
      spread: next.spread ?? this.inkBleed.spread,
    };
    const wasOn = this.inkBleed.enabled;
    const spreadChanged = merged.spread !== this.inkBleed.spread;
    this.inkBleed = merged;
    this.bleedMaterial.color.set(merged.color);
    this.bleedMaterial.opacity = merged.enabled ? merged.opacity : 0;
    if (wasOn !== merged.enabled || (merged.enabled && spreadChanged)) {
      // Toggle on / off changes whether bleed lines are added at all;
      // spread changes the lift radius. Both bake into geometry.
      this.rebuild();
    }
  }

  public resetInkBleed(): void {
    this.setInkBleed(this.defaultInkBleed);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    for (const geom of this.liveGeometries) geom.dispose();
    this.liveGeometries = [];
    this.inkMaterial.dispose();
    this.bleedMaterial.dispose();
    this.stippleMaterial.dispose();
    this.group.clear();
  }
}

