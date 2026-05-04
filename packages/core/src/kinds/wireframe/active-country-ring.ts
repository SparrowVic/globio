import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import {
  angularExtent,
  boundsCenter,
  computeMainRingBounds,
} from '../../utils/country-bounds';
import { ringRadiusForExtent } from './active-ring-extras';
import type { CountryFeature } from '../../renderer/country-feature';

export interface ActiveCountryRingOptions {
  readonly color: string;
  readonly opacity: number;
  /** Fraction of ring radius — inner edge is `radius * (1 - thickness)`. */
  readonly thickness: number;
  /** Multiplier on the country's angular radius for ring sizing. */
  readonly padding: number;
  /** Outward rotation speed around the surface normal (rad/sec). */
  readonly rotationSpeed: number;
}

const SURFACE_RADIUS = GLOBE_RADIUS * 1.0015;
const FADE_DURATION_SECONDS = 0.25;
const RADIAL_SEGMENTS = 96;
// Cap the ring at a reasonable physical size — a country spanning a hemisphere
// would otherwise produce a ring as big as the sphere itself.
const MIN_RADIUS = GLOBE_RADIUS * 0.04;
const MAX_RADIUS = GLOBE_RADIUS * 0.85;

/**
 * Glowing geodesic ring centered on the active country's centroid. Sized
 * lazily — geometry is only rebuilt when the active id changes — and fades
 * in/out via a tween on `material.opacity`. Slowly rotates around its
 * outward normal so it reads as "alive" without being noisy.
 */
export class ActiveCountryRing {
  public readonly group: Group;
  private readonly featuresById: Map<string, CountryFeature> = new Map();
  private readonly material: MeshBasicMaterial;
  private readonly options: {
    color: string;
    opacity: number;
    thickness: number;
    padding: number;
    rotationSpeed: number;
  };
  private readonly originalColor: string;
  private readonly originalOpacity: number;
  private baseOpacity: number;
  private mesh: Mesh | null = null;
  private currentId: string | null = null;
  private targetT = 0;
  private currentT = 0;

  public constructor(options: ActiveCountryRingOptions) {
    this.group = new Group();
    this.options = { ...options };
    this.originalColor = options.color;
    this.originalOpacity = options.opacity;
    this.baseOpacity = options.opacity;
    this.material = new MeshBasicMaterial({
      color: new Color(options.color),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
      side: 2, // DoubleSide — read either way through the sphere
    });
  }

  public registerFeatures(features: ReadonlyArray<CountryFeature>): void {
    this.featuresById.clear();
    for (const f of features) this.featuresById.set(f.id, f);
  }

  public setCountry(id: string | null): void {
    if (id === null) {
      this.targetT = 0;
      this.currentId = null;
      return;
    }
    if (id === this.currentId && this.mesh) {
      this.targetT = 1;
      return;
    }
    const feature = this.featuresById.get(id);
    if (!feature) {
      this.targetT = 0;
      return;
    }
    this.rebuildForFeature(feature);
    this.currentId = id;
    this.targetT = 1;
  }

  public update(delta: number): void {
    if (this.currentT === this.targetT && !this.mesh) return;

    if (this.currentT !== this.targetT) {
      const step = delta / FADE_DURATION_SECONDS;
      const dir = this.targetT > this.currentT ? 1 : -1;
      this.currentT = Math.max(0, Math.min(1, this.currentT + dir * step));
      this.material.opacity = this.currentT * this.baseOpacity;
      if (this.currentT === 0 && this.targetT === 0) {
        this.disposeMesh();
        return;
      }
    }

    if (this.mesh) {
      this.mesh.rotation.z += this.options.rotationSpeed * delta;
    }
  }

  public dispose(): void {
    this.disposeMesh();
    this.material.dispose();
    this.featuresById.clear();
  }

  /* ───────── live setters ───────── */

  public setColor(color: string): void {
    this.material.color.set(color);
  }

  public resetColor(): void {
    this.material.color.set(this.originalColor);
  }

  public setOpacity(opacity: number): void {
    this.baseOpacity = Math.max(0, Math.min(1, opacity));
    this.material.opacity = this.currentT * this.baseOpacity;
  }

  public resetOpacity(): void {
    this.baseOpacity = this.originalOpacity;
    this.material.opacity = this.currentT * this.baseOpacity;
  }

  public setRotationSpeed(speed: number): void {
    this.options.rotationSpeed = speed;
  }

  /**
   * Padding changes — needs a geometry rebuild for the active country, so
   * we re-trigger the build path if a country is currently active. Inactive
   * → no-op until the next setCountry(id) call.
   */
  public setPadding(padding: number): void {
    if (padding === this.options.padding) return;
    this.options.padding = padding;
    if (this.currentId) {
      const feature = this.featuresById.get(this.currentId);
      if (feature) this.rebuildForFeature(feature);
    }
  }

  private rebuildForFeature(feature: CountryFeature): void {
    const bounds = computeMainRingBounds(feature.coordinates);
    const extent = angularExtent(bounds);
    const rawRadius = ringRadiusForExtent(extent, this.options.padding, GLOBE_RADIUS);
    const radius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, rawRadius));
    const inner = Math.max(radius * 0.001, radius * (1 - this.options.thickness));
    const center = boundsCenter(bounds);

    this.disposeMesh();
    const geometry = new RingGeometry(inner, radius, RADIAL_SEGMENTS);
    const mesh = new Mesh(geometry, this.material);
    const pos = latLngToVector3([center[0], center[1]], SURFACE_RADIUS, new Vector3());
    mesh.position.copy(pos);
    // Orient the ring so its surface normal points outward (away from globe
    // center). lookAt aims local -Z at the target — passing the origin makes
    // the ring lie tangent to the sphere with +Z facing outward.
    mesh.lookAt(0, 0, 0);
    mesh.renderOrder = 12;
    this.group.add(mesh);
    this.mesh = mesh;
  }

  private disposeMesh(): void {
    if (!this.mesh) return;
    this.group.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh = null;
  }
}
