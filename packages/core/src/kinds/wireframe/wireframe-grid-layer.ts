import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineSegments,
  ShaderMaterial,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { glitchEnvelope, isInGlitchBand, pulseBrightness } from './wireframe-extras';

export interface WireframeGridLayerOptions {
  readonly color: string;
  readonly opacity: number;
  readonly density: number;
  readonly pulse: number;
  readonly pulseSpeed?: number;
  readonly radius: number;
  readonly clickPulse?: {
    readonly enabled: boolean;
    readonly color: string;
    readonly speed: number;
    readonly width: number;
    readonly boost: number;
    readonly maxConcurrent: number;
  };
  readonly glitch?: {
    readonly enabled: boolean;
    readonly intervalMin: number;
    readonly intervalMax: number;
  };
}

const SAMPLE_STEP_DEG = 3;
const BASE_STEP_DEG = 15;
const DEFAULT_PULSE_HZ = 0.5;
const MAX_BRIGHTNESS = 3.0;

/**
 * Build the lat/lng grid as flat Float32 segment positions. Pure helper —
 * tests live on this so we can verify density / radius without a GL context.
 */
export const generateGridSegments = (
  density: number,
  radius: number
): { positions: Float32Array; segmentCount: number } => {
  const safeDensity = density > 0 ? density : 1;
  const step = BASE_STEP_DEG / safeDensity;
  const positions: Array<number> = [];

  // Parallels: skip the poles (a single point — no useful circle there).
  for (let lat = -90 + step; lat <= 90 - step + 1e-6; lat += step) {
    let prev = latLngToVector3([lat, -180], radius);
    for (let lng = -180 + SAMPLE_STEP_DEG; lng <= 180 + 1e-6; lng += SAMPLE_STEP_DEG) {
      const next = latLngToVector3([lat, lng], radius);
      positions.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
      prev = next;
    }
  }

  // Meridians: half-circles pole to pole.
  for (let lng = -180; lng <= 180 - step + 1e-6; lng += step) {
    let prev = latLngToVector3([-90, lng], radius);
    for (let lat = -90 + SAMPLE_STEP_DEG; lat <= 90 + 1e-6; lat += SAMPLE_STEP_DEG) {
      const next = latLngToVector3([lat, lng], radius);
      positions.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
      prev = next;
    }
  }

  const float = new Float32Array(positions);
  return { positions: float, segmentCount: float.length / 6 };
};

interface ActivePulse {
  origin: Vector3;
  age: number;
  active: boolean;
}

interface ActiveGlitch {
  centerLat: number;
  halfHeight: number;
  shearAmount: number;
  duration: number;
  age: number;
}

const VERT_SHADER = /* glsl */ `
  attribute float aBrightness;
  varying float vBrightness;
  void main() {
    vBrightness = aBrightness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uBaseOpacity;
  uniform float uBoost;
  varying float vBrightness;
  void main() {
    float b = clamp(vBrightness, 0.0, ${MAX_BRIGHTNESS.toFixed(1)});
    vec3 rgb = uColor * (1.0 + b * uBoost);
    float alpha = clamp(uBaseOpacity + b * 0.4, 0.0, 1.0);
    gl_FragColor = vec4(rgb, alpha);
  }
`;

export class WireframeGridLayer {
  public readonly group: Group;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly baseOpacity: number;
  private readonly pulseAmplitude: number;
  private readonly pulseSpeed: number;
  private readonly basePositions: Float32Array;
  private readonly workingPositions: Float32Array;
  private readonly vertexNormals: Float32Array;
  private readonly vertexLats: Float32Array;
  private readonly tangents: Float32Array;
  private readonly brightness: Float32Array;
  private readonly radius: number;
  private readonly pulses: Array<ActivePulse>;
  private readonly clickPulseConfig: WireframeGridLayerOptions['clickPulse'] | undefined;
  private readonly glitchConfig: WireframeGridLayerOptions['glitch'] | undefined;
  private currentGlitch: ActiveGlitch | null;
  private nextGlitchTime: number;
  private positionsDirty: boolean;

  public constructor(options: WireframeGridLayerOptions) {
    this.group = new Group();
    this.baseOpacity = options.opacity;
    this.pulseAmplitude = Math.max(0, Math.min(1, options.pulse));
    this.pulseSpeed = options.pulseSpeed ?? DEFAULT_PULSE_HZ;
    this.radius = options.radius;
    this.clickPulseConfig = options.clickPulse;
    this.glitchConfig = options.glitch;

    const { positions } = generateGridSegments(options.density, options.radius);
    this.basePositions = positions;
    this.workingPositions = new Float32Array(positions);
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(this.workingPositions, 3));

    const vertexCount = positions.length / 3;
    this.vertexNormals = new Float32Array(positions.length);
    this.vertexLats = new Float32Array(vertexCount);
    this.tangents = new Float32Array(positions.length);
    this.brightness = new Float32Array(vertexCount);
    this.precomputeVertexData();
    this.geometry.setAttribute('aBrightness', new Float32BufferAttribute(this.brightness, 1));

    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(options.color) },
        uBaseOpacity: { value: this.baseOpacity },
        uBoost: { value: this.clickPulseConfig?.boost ?? 0 },
      },
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.pulses = [];
    const max = Math.max(1, this.clickPulseConfig?.maxConcurrent ?? 4);
    for (let i = 0; i < max; i++) {
      this.pulses.push({ origin: new Vector3(), age: 0, active: false });
    }

    this.currentGlitch = null;
    this.nextGlitchTime = this.glitchConfig?.enabled ? this.scheduleGlitch(0) : Infinity;
    this.positionsDirty = false;

    this.group.add(new LineSegments(this.geometry, this.material));
  }

  /**
   * Cache per-vertex direction (sphere-normalised) + lat (deg) + east-tangent
   * direction up-front. These are stable across the lifetime of the layer
   * and are reused every frame by the pulse + glitch passes.
   */
  private precomputeVertexData(): void {
    const v = new Vector3();
    const east = new Vector3();
    const up = new Vector3(0, 1, 0);
    const r = this.radius || 1;
    for (let i = 0, vi = 0; i < this.basePositions.length; i += 3, vi++) {
      const x = this.basePositions[i] ?? 0;
      const y = this.basePositions[i + 1] ?? 0;
      const z = this.basePositions[i + 2] ?? 0;
      this.vertexNormals[i] = x / r;
      this.vertexNormals[i + 1] = y / r;
      this.vertexNormals[i + 2] = z / r;
      const ny = y / r;
      this.vertexLats[vi] = 90 - (Math.acos(Math.max(-1, Math.min(1, ny))) * 180) / Math.PI;
      v.set(x, y, z);
      east.crossVectors(up, v);
      const len = east.length();
      if (len > 1e-6) east.divideScalar(len);
      else east.set(1, 0, 0);
      this.tangents[i] = east.x;
      this.tangents[i + 1] = east.y;
      this.tangents[i + 2] = east.z;
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Spawn a click pulse at `point` (globe-local space). Recycles the oldest
   * slot when full. No-op when click-pulse is disabled.
   */
  public spawnClickPulse(point: Vector3): void {
    if (!this.clickPulseConfig?.enabled) return;
    let target = this.pulses.find((p) => !p.active);
    if (!target) {
      // Recycle the oldest (largest age).
      target = this.pulses[0]!;
      for (const p of this.pulses) if (p.age > target.age) target = p;
    }
    target.origin.copy(point).normalize();
    target.age = 0;
    target.active = true;
  }

  private scheduleGlitch(now: number): number {
    const cfg = this.glitchConfig;
    if (!cfg) return Infinity;
    const min = Math.max(0, cfg.intervalMin);
    const max = Math.max(min + 0.001, cfg.intervalMax);
    return now + min + Math.random() * (max - min);
  }

  /** Step the pulse animation. Call once per render frame. */
  public update(elapsedSeconds: number, deltaSeconds = 0): void {
    // Token-driven global sin pulse on opacity (preserved from original).
    if (this.pulseAmplitude > 0) {
      const wave = Math.sin(elapsedSeconds * this.pulseSpeed * 2 * Math.PI);
      const next = this.baseOpacity + wave * this.pulseAmplitude * this.baseOpacity;
      this.material.uniforms['uBaseOpacity']!.value = Math.max(0, Math.min(1, next));
    }

    this.updateClickPulses(deltaSeconds);
    this.updateGlitch(elapsedSeconds, deltaSeconds);
  }

  private updateClickPulses(delta: number): void {
    const cfg = this.clickPulseConfig;
    if (!cfg) return;

    let anyActive = false;
    for (const p of this.pulses) {
      if (!p.active) continue;
      p.age += delta;
      if (p.age * cfg.speed > Math.PI + cfg.width * 4) {
        p.active = false;
        continue;
      }
      anyActive = true;
    }

    if (!anyActive) {
      // Snap brightness to zero in one pass if previous frame had pulses.
      let needed = false;
      for (let i = 0; i < this.brightness.length; i++) {
        if (this.brightness[i] !== 0) {
          this.brightness[i] = 0;
          needed = true;
        }
      }
      if (needed) {
        const attr = this.geometry.getAttribute('aBrightness');
        attr.needsUpdate = true;
      }
      return;
    }

    const width = cfg.width;
    const vertexCount = this.brightness.length;
    for (let i = 0; i < vertexCount; i++) {
      const ix = i * 3;
      const nx = this.vertexNormals[ix] ?? 0;
      const ny = this.vertexNormals[ix + 1] ?? 0;
      const nz = this.vertexNormals[ix + 2] ?? 0;
      let total = 0;
      for (const p of this.pulses) {
        if (!p.active) continue;
        const dot = Math.max(-1, Math.min(1, nx * p.origin.x + ny * p.origin.y + nz * p.origin.z));
        const dist = Math.acos(dot);
        const wavefront = p.age * cfg.speed;
        total += pulseBrightness(dist, wavefront, width);
      }
      this.brightness[i] = total > MAX_BRIGHTNESS ? MAX_BRIGHTNESS : total;
    }
    const attr = this.geometry.getAttribute('aBrightness');
    attr.needsUpdate = true;
  }

  private updateGlitch(elapsed: number, delta: number): void {
    const cfg = this.glitchConfig;
    if (!cfg?.enabled) return;

    if (this.currentGlitch) {
      this.currentGlitch.age += delta;
      if (this.currentGlitch.age >= this.currentGlitch.duration) {
        this.currentGlitch = null;
        this.resetPositions();
        this.nextGlitchTime = this.scheduleGlitch(elapsed);
        return;
      }
      this.applyGlitch();
      return;
    }

    if (elapsed >= this.nextGlitchTime) {
      const halfHeight = 5 + Math.random() * 10;
      this.currentGlitch = {
        centerLat: -90 + Math.random() * 180,
        halfHeight,
        shearAmount: 0.005 + Math.random() * 0.01,
        duration: 0.08 + Math.random() * 0.1,
        age: 0,
      };
    }
  }

  private applyGlitch(): void {
    const g = this.currentGlitch;
    if (!g) return;
    const t = g.age / g.duration;
    const env = glitchEnvelope(t);
    const offset = g.shearAmount * env;
    if (offset === 0 && !this.positionsDirty) return;

    for (let i = 0, vi = 0; i < this.basePositions.length; i += 3, vi++) {
      const lat = this.vertexLats[vi] ?? 0;
      if (isInGlitchBand(lat, g.centerLat, g.halfHeight)) {
        this.workingPositions[i] = (this.basePositions[i] ?? 0) + (this.tangents[i] ?? 0) * offset;
        this.workingPositions[i + 1] =
          (this.basePositions[i + 1] ?? 0) + (this.tangents[i + 1] ?? 0) * offset;
        this.workingPositions[i + 2] =
          (this.basePositions[i + 2] ?? 0) + (this.tangents[i + 2] ?? 0) * offset;
      } else if (this.positionsDirty) {
        this.workingPositions[i] = this.basePositions[i] ?? 0;
        this.workingPositions[i + 1] = this.basePositions[i + 1] ?? 0;
        this.workingPositions[i + 2] = this.basePositions[i + 2] ?? 0;
      }
    }
    this.positionsDirty = true;
    const posAttr = this.geometry.getAttribute('position');
    posAttr.needsUpdate = true;
  }

  private resetPositions(): void {
    if (!this.positionsDirty) return;
    this.workingPositions.set(this.basePositions);
    this.positionsDirty = false;
    const posAttr = this.geometry.getAttribute('position');
    posAttr.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }
}

export const WIREFRAME_DEFAULT_RADIUS = GLOBE_RADIUS * 1.0005;
