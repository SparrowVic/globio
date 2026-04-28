import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Points,
  PointsMaterial,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { stepParticleLat } from './active-ring-extras';

export interface PoleStreamsOptions {
  readonly color: string;
  readonly count: number;
  readonly size: number;
  /** Southward angular speed in radians/sec. */
  readonly speed: number;
  readonly opacity: number;
}

const SURFACE_RADIUS = GLOBE_RADIUS * 1.0008;
const SPAWN_LAT_DEG = 89;
const DESPAWN_LAT_DEG = -89;
const RAD_TO_DEG = 180 / Math.PI;
const SPEED_VARIATION = 0.2;

interface Particle {
  lat: number;
  lng: number;
  /** Per-particle speed in radians/sec — varied ±SPEED_VARIATION around base. */
  speed: number;
}

const createSoftDotTexture = (): CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
};

/**
 * Pole-to-pole particle streams. Each particle sits on a fixed random
 * meridian and travels southward at constant angular velocity (with mild
 * per-particle jitter so they don't move in lockstep). On crossing the
 * southern threshold it respawns at the north with a new random meridian.
 *
 * Implemented as a single `Points` object with a per-frame position-attribute
 * rewrite — count is small (≤64 in practice) so the cost is negligible.
 */
export class PoleStreams {
  public readonly group: Group;
  private readonly geometry: BufferGeometry;
  private readonly material: PointsMaterial;
  private readonly texture: CanvasTexture | null;
  private readonly positions: Float32Array;
  private readonly particles: Array<Particle>;
  private readonly baseSpeed: number;

  public constructor(options: PoleStreamsOptions) {
    this.group = new Group();
    const count = Math.max(0, Math.floor(options.count));
    this.baseSpeed = options.speed;
    this.positions = new Float32Array(count * 3);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.spawn());
    }
    this.writePositions();

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));

    this.texture = createSoftDotTexture();
    this.material = new PointsMaterial({
      color: new Color(options.color),
      size: options.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: options.opacity,
      depthWrite: false,
      blending: AdditiveBlending,
      ...(this.texture && { map: this.texture }),
    });

    const points = new Points(this.geometry, this.material);
    points.renderOrder = 9;
    this.group.add(points);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public update(delta: number): void {
    if (this.particles.length === 0) return;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]!;
      const speedDeg = p.speed * RAD_TO_DEG;
      const next = stepParticleLat(p.lat, speedDeg, delta, SPAWN_LAT_DEG, DESPAWN_LAT_DEG);
      if (next === SPAWN_LAT_DEG && p.lat !== SPAWN_LAT_DEG) {
        // Respawn — randomise lng + speed for variety.
        const fresh = this.spawn();
        p.lat = fresh.lat;
        p.lng = fresh.lng;
        p.speed = fresh.speed;
      } else {
        p.lat = next;
      }
    }
    this.writePositions();
    const attr = this.geometry.getAttribute('position');
    attr.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture?.dispose();
    this.group.clear();
  }

  private spawn(): Particle {
    const jitter = 1 + (Math.random() * 2 - 1) * SPEED_VARIATION;
    return {
      lat: SPAWN_LAT_DEG,
      lng: Math.random() * 360 - 180,
      speed: this.baseSpeed * jitter,
    };
  }

  private writePositions(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]!;
      const v = latLngToVector3([p.lat, p.lng], SURFACE_RADIUS);
      this.positions[i * 3] = v.x;
      this.positions[i * 3 + 1] = v.y;
      this.positions[i * 3 + 2] = v.z;
    }
  }
}
