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

export interface WireframeDataPacketsOptions {
  readonly color: string;
  readonly count: number;
  readonly speed: number;
  readonly trail: number;
  readonly size: number;
  readonly opacity: number;
  readonly axis: 'latitude' | 'longitude' | 'both';
}

const SURFACE_RADIUS = GLOBE_RADIUS * 1.0011;
const TRAIL_SAMPLES = 5;
const RAD_TO_DEG = 180 / Math.PI;

interface Packet {
  /** Constant-coord lat OR lng (whichever defines the line the packet walks). */
  readonly fixed: number;
  /** Travelling coord — radians. */
  travel: number;
  readonly axis: 'latitude' | 'longitude';
  readonly speedJitter: number;
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
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
};

/**
 * Data packets — small luminous blips that race along grid lines (latitude
 * parallels and/or longitude meridians) with a short fading trail. Each
 * packet is rendered as the head plus N trailing samples on the same
 * line; alpha falls off linearly from head→tail. The whole effect is one
 * `Points` mesh — `count * (1 + TRAIL_SAMPLES)` vertices, single material,
 * additive blending so trails layer cleanly when they cross.
 *
 * Builds the Tron-data-feed feel: visible *information* moving through
 * the grid, not just the grid as a static frame.
 */
export class WireframeDataPackets {
  public readonly group: Group;
  private geometry: BufferGeometry;
  private readonly material: PointsMaterial;
  private readonly texture: CanvasTexture | null;
  private positions: Float32Array;
  private alphas: Float32Array;
  private packets: Array<Packet>;
  private readonly originalColor: string;
  private readonly originalSize: number;
  private readonly originalOpacity: number;
  private speed: number;
  private trail: number;
  private axis: 'latitude' | 'longitude' | 'both';
  private points: Points;

  public constructor(options: WireframeDataPacketsOptions) {
    this.group = new Group();
    this.originalColor = options.color;
    this.originalSize = options.size;
    this.originalOpacity = options.opacity;
    this.speed = options.speed;
    this.trail = Math.max(0, options.trail);
    this.axis = options.axis;

    this.packets = [];
    for (let i = 0; i < Math.max(0, Math.floor(options.count)); i++) {
      this.packets.push(this.spawn());
    }

    const samples = 1 + TRAIL_SAMPLES;
    this.positions = new Float32Array(this.packets.length * samples * 3);
    this.alphas = new Float32Array(this.packets.length * samples);
    this.writePositions();

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aAlpha', new Float32BufferAttribute(this.alphas, 1));

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
    // Use onBeforeCompile to inject per-vertex alpha — PointsMaterial
    // doesn't expose attributes natively. Modulate point size in the
    // vertex shader (so trail samples shrink rather than vanish) and
    // multiply diffuseColor.a in the fragment shader before the
    // opaque_fragment chunk writes gl_FragColor.
    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>\nattribute float aAlpha;\nvarying float vAlpha;`
        )
        .replace(
          'gl_PointSize = size;',
          `vAlpha = aAlpha;\ngl_PointSize = size * aAlpha;`
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying float vAlpha;`)
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( diffuse, opacity * vAlpha );'
        );
    };

    this.points = new Points(this.geometry, this.material);
    this.points.renderOrder = 10;
    this.group.add(this.points);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public update(delta: number): void {
    if (this.packets.length === 0) return;
    const wrap = (v: number, lo: number, hi: number): number => {
      const span = hi - lo;
      let r = ((v - lo) % span + span) % span;
      return r + lo;
    };
    for (const p of this.packets) {
      p.travel += delta * this.speed * p.speedJitter;
      // Wrap coordinates so packets keep racing without escaping. Latitude
      // packets travel along longitude (-π, π); longitude packets travel
      // along latitude (-π/2, π/2) and bounce back rather than flip pole.
      if (p.axis === 'latitude') {
        p.travel = wrap(p.travel, -Math.PI, Math.PI);
      } else {
        // Bounce at the poles to avoid degenerate samples.
        const PI_2 = Math.PI / 2;
        if (p.travel > PI_2 || p.travel < -PI_2) {
          // Mirror in place so we keep moving; just flip the jitter sign
          // by re-randomising it on the rebound.
          p.travel = Math.max(-PI_2 + 0.01, Math.min(PI_2 - 0.01, p.travel));
          (p as { speedJitter: number }).speedJitter = -p.speedJitter;
        }
      }
    }
    this.writePositions();
    const posAttr = this.geometry.getAttribute('position');
    posAttr.needsUpdate = true;
    const alphaAttr = this.geometry.getAttribute('aAlpha');
    alphaAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture?.dispose();
    this.group.clear();
  }

  /* ───────── live setters ───────── */

  public setColor(color: string): void {
    this.material.color.set(color);
  }

  public resetColor(): void {
    this.material.color.set(this.originalColor);
  }

  public setSize(size: number): void {
    this.material.size = size;
  }

  public resetSize(): void {
    this.material.size = this.originalSize;
  }

  public setOpacity(opacity: number): void {
    this.material.opacity = Math.max(0, Math.min(1, opacity));
  }

  public resetOpacity(): void {
    this.material.opacity = this.originalOpacity;
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public setTrail(trail: number): void {
    this.trail = Math.max(0, trail);
  }

  public setAxis(axis: 'latitude' | 'longitude' | 'both'): void {
    if (axis === this.axis) return;
    this.axis = axis;
    // Re-spawn each packet so its axis matches the new constraint.
    for (let i = 0; i < this.packets.length; i++) this.packets[i] = this.spawn();
  }

  public setCount(count: number): void {
    const target = Math.max(0, Math.floor(count));
    if (target === this.packets.length) return;
    if (target > this.packets.length) {
      while (this.packets.length < target) this.packets.push(this.spawn());
    } else {
      this.packets.length = target;
    }
    const samples = 1 + TRAIL_SAMPLES;
    this.positions = new Float32Array(this.packets.length * samples * 3);
    this.alphas = new Float32Array(this.packets.length * samples);
    this.writePositions();
    const oldGeometry = this.geometry;
    const next = new BufferGeometry();
    next.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    next.setAttribute('aAlpha', new Float32BufferAttribute(this.alphas, 1));
    this.geometry = next;
    this.points.geometry = next;
    oldGeometry.dispose();
  }

  /* ───────── internals ───────── */

  private spawn(): Packet {
    const axis: 'latitude' | 'longitude' =
      this.axis === 'both' ? (Math.random() < 0.5 ? 'latitude' : 'longitude') : this.axis;
    // For latitude packets the *fixed* coord is a parallel (lat in deg),
    // chosen on a "major-friendly" 15°-step ladder so packets ride the
    // grid lines rather than between them.
    const stepDeg = 15;
    const fixed =
      axis === 'latitude'
        ? Math.floor((Math.random() * 12 - 6)) * stepDeg + (Math.random() < 0.5 ? stepDeg / 2 : 0)
        : Math.floor((Math.random() * 24 - 12)) * stepDeg;
    const travel =
      axis === 'latitude'
        ? Math.random() * Math.PI * 2 - Math.PI
        : Math.random() * Math.PI - Math.PI / 2;
    return {
      fixed,
      travel,
      axis,
      speedJitter: 0.7 + Math.random() * 0.6,
    };
  }

  private writePositions(): void {
    const trailSpread = this.trail; // radians spread tail over
    let v = 0;
    let a = 0;
    for (const p of this.packets) {
      // Head + TRAIL_SAMPLES trailing samples behind it on the same line.
      for (let s = 0; s <= TRAIL_SAMPLES; s++) {
        const off = trailSpread > 0 ? (-s / TRAIL_SAMPLES) * trailSpread : 0;
        const t = p.travel + off * Math.sign(p.speedJitter);
        let lat: number;
        let lng: number;
        if (p.axis === 'latitude') {
          lat = p.fixed;
          lng = t * RAD_TO_DEG;
        } else {
          lat = t * RAD_TO_DEG;
          lng = p.fixed;
        }
        const pos = latLngToVector3([lat, lng], SURFACE_RADIUS);
        this.positions[v++] = pos.x;
        this.positions[v++] = pos.y;
        this.positions[v++] = pos.z;
        // Linear falloff head→tail; head at full alpha = 1, tail at 0.
        this.alphas[a++] = 1 - s / (TRAIL_SAMPLES + 1);
      }
    }
  }
}
