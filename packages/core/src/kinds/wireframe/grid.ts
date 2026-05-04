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
import { glitchEnvelope, isInGlitchBand, pulseBrightness } from './extras';

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
  readonly hierarchy?: {
    readonly enabled: boolean;
    readonly majorStepDeg: number;
    readonly majorBoost: number;
    readonly minorBoost: number;
  };
  readonly gridPulse?: {
    readonly enabled: boolean;
    readonly intervalSec: number;
    readonly speed: number;
    readonly width: number;
    readonly boost: number;
    readonly mode: 'fixed' | 'random';
    readonly originLat: number;
    readonly originLng: number;
    readonly color?: string;
  };
  readonly polePulse?: {
    readonly enabled: boolean;
    readonly intervalSec: number;
    readonly speed: number;
    readonly boost: number;
    readonly width: number;
    readonly which: 'north' | 'south' | 'both';
    readonly color?: string;
  };
}

const SAMPLE_STEP_DEG = 3;
const BASE_STEP_DEG = 15;
const DEFAULT_PULSE_HZ = 0.5;
const MAX_BRIGHTNESS = 4.0;
/** Tolerance (deg) when matching a coord to a major step ring. */
const MAJOR_EPS = 0.01;

/**
 * Build the lat/lng grid as flat Float32 segment positions plus a parallel
 * `isMajor` mask per *vertex* — the renderer scales brightness on major
 * lines so the grid reads as a hierarchy. A line is "major" when its
 * latitude (parallels) or longitude (meridians) is a multiple of
 * `majorStepDeg`. Pure helper — tests live on this so we can verify
 * density / radius / hierarchy without a GL context.
 */
export const generateGridSegments = (
  density: number,
  radius: number,
  majorStepDeg = 30
): {
  positions: Float32Array;
  isMajor: Float32Array;
  segmentCount: number;
} => {
  const safeDensity = density > 0 ? density : 1;
  const step = BASE_STEP_DEG / safeDensity;
  const safeMajor = Math.max(step, majorStepDeg);
  const positions: Array<number> = [];
  const major: Array<number> = [];

  const isMajorAngle = (deg: number): boolean => {
    const m = Math.abs(deg) % safeMajor;
    return m < MAJOR_EPS || Math.abs(m - safeMajor) < MAJOR_EPS;
  };

  // Parallels: skip the poles (a single point — no useful circle there).
  for (let lat = -90 + step; lat <= 90 - step + 1e-6; lat += step) {
    const isMaj = isMajorAngle(lat) ? 1 : 0;
    let prev = latLngToVector3([lat, -180], radius);
    for (let lng = -180 + SAMPLE_STEP_DEG; lng <= 180 + 1e-6; lng += SAMPLE_STEP_DEG) {
      const next = latLngToVector3([lat, lng], radius);
      positions.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
      major.push(isMaj, isMaj);
      prev = next;
    }
  }

  // Meridians: half-circles pole to pole.
  for (let lng = -180; lng <= 180 - step + 1e-6; lng += step) {
    const isMaj = isMajorAngle(lng) ? 1 : 0;
    let prev = latLngToVector3([-90, lng], radius);
    for (let lat = -90 + SAMPLE_STEP_DEG; lat <= 90 + 1e-6; lat += SAMPLE_STEP_DEG) {
      const next = latLngToVector3([lat, lng], radius);
      positions.push(prev.x, prev.y, prev.z, next.x, next.y, next.z);
      major.push(isMaj, isMaj);
      prev = next;
    }
  }

  const float = new Float32Array(positions);
  return {
    positions: float,
    isMajor: new Float32Array(major),
    segmentCount: float.length / 6,
  };
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
  attribute float aMajor;
  varying float vBrightness;
  varying float vMajor;
  void main() {
    vBrightness = aBrightness;
    vMajor = aMajor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uBaseOpacity;
  uniform float uBoost;
  uniform float uMajorBoost;
  uniform float uMinorBoost;
  uniform float uHierarchy;
  varying float vBrightness;
  varying float vMajor;
  void main() {
    float b = clamp(vBrightness, 0.0, ${MAX_BRIGHTNESS.toFixed(1)});
    float lineFactor = mix(1.0, mix(uMinorBoost, uMajorBoost, vMajor), uHierarchy);
    vec3 rgb = uColor * (lineFactor + b * uBoost);
    float alpha = clamp(uBaseOpacity * lineFactor + b * 0.4, 0.0, 1.0);
    gl_FragColor = vec4(rgb, alpha);
  }
`;

/**
 * The live wireframe grid renderer. Per-vertex brightness drives the
 * shader's pulse highlight; per-vertex `aMajor` (0/1) lets the fragment
 * apply a hierarchy boost. The grid layer also owns the "click pulse" pool
 * (also re-used by the autonomous grid pulse + pole pulse), so all three
 * pulse families share the same gaussian wavefront accumulation in a
 * single per-frame sweep.
 */
export class WireframeGridLayer {
  public readonly group: Group;
  private geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private baseOpacity: number;
  private originalBaseOpacity: number;
  private pulseAmplitude: number;
  private pulseSpeed: number;
  private density: number;
  private majorStepDeg: number;
  private majorBoost: number;
  private minorBoost: number;
  private hierarchyEnabled: boolean;
  private basePositions: Float32Array;
  private workingPositions: Float32Array;
  private vertexNormals: Float32Array;
  private vertexLats: Float32Array;
  private tangents: Float32Array;
  private brightness: Float32Array;
  private isMajor: Float32Array;
  private readonly radius: number;
  private readonly pulses: Array<ActivePulse>;
  private clickPulseConfig: WireframeGridLayerOptions['clickPulse'] | undefined;
  private clickPulseEnabled: boolean;
  private glitchConfig: WireframeGridLayerOptions['glitch'] | undefined;
  private currentGlitch: ActiveGlitch | null;
  private nextGlitchTime: number;
  private positionsDirty: boolean;
  private mesh: LineSegments;
  private gridPulseConfig: WireframeGridLayerOptions['gridPulse'] | undefined;
  private nextGridPulseTime: number;
  private polePulseConfig: WireframeGridLayerOptions['polePulse'] | undefined;
  private nextPolePulseTime: number;

  public constructor(options: WireframeGridLayerOptions) {
    this.group = new Group();
    this.baseOpacity = options.opacity;
    this.originalBaseOpacity = options.opacity;
    this.pulseAmplitude = Math.max(0, Math.min(1, options.pulse));
    this.pulseSpeed = options.pulseSpeed ?? DEFAULT_PULSE_HZ;
    this.radius = options.radius;
    this.density = options.density;
    this.clickPulseConfig = options.clickPulse;
    this.clickPulseEnabled = options.clickPulse?.enabled ?? false;
    this.glitchConfig = options.glitch;
    this.gridPulseConfig = options.gridPulse;
    this.polePulseConfig = options.polePulse;

    const hierarchy = options.hierarchy;
    this.hierarchyEnabled = hierarchy?.enabled ?? true;
    this.majorStepDeg = hierarchy?.majorStepDeg ?? 30;
    this.majorBoost = hierarchy?.majorBoost ?? 1.6;
    this.minorBoost = hierarchy?.minorBoost ?? 0.85;

    const { positions, isMajor } = generateGridSegments(
      this.density,
      this.radius,
      this.majorStepDeg
    );
    this.basePositions = positions;
    this.isMajor = isMajor;
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
    this.geometry.setAttribute('aMajor', new Float32BufferAttribute(this.isMajor, 1));

    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(options.color) },
        uBaseOpacity: { value: this.baseOpacity },
        uBoost: { value: this.clickPulseConfig?.boost ?? 0 },
        uMajorBoost: { value: this.majorBoost },
        uMinorBoost: { value: this.minorBoost },
        uHierarchy: { value: this.hierarchyEnabled ? 1 : 0 },
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

    this.nextGridPulseTime = this.gridPulseConfig?.enabled
      ? this.scheduleGridPulse(0)
      : Infinity;
    this.nextPolePulseTime = this.polePulseConfig?.enabled
      ? this.schedulePolePulse(0)
      : Infinity;

    this.mesh = new LineSegments(this.geometry, this.material);
    this.group.add(this.mesh);
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
    if (!this.clickPulseEnabled) return;
    this.spawnPulseAt(point);
  }

  /** Internal: spawn a wavefront from any sphere-local origin point. */
  private spawnPulseAt(origin: Vector3): void {
    let target = this.pulses.find((p) => !p.active);
    if (!target) {
      target = this.pulses[0]!;
      for (const p of this.pulses) if (p.age > target.age) target = p;
    }
    target.origin.copy(origin).normalize();
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

  private scheduleGridPulse(now: number): number {
    const cfg = this.gridPulseConfig;
    if (!cfg?.enabled) return Infinity;
    const interval = Math.max(0.2, cfg.intervalSec);
    return now + interval;
  }

  private schedulePolePulse(now: number): number {
    const cfg = this.polePulseConfig;
    if (!cfg?.enabled) return Infinity;
    const interval = Math.max(0.2, cfg.intervalSec);
    return now + interval;
  }

  /** Step the pulse animation. Call once per render frame. */
  public update(elapsedSeconds: number, deltaSeconds = 0): void {
    // Token-driven global sin pulse on opacity (preserved from original).
    if (this.pulseAmplitude > 0) {
      const wave = Math.sin(elapsedSeconds * this.pulseSpeed * 2 * Math.PI);
      const next = this.baseOpacity + wave * this.pulseAmplitude * this.baseOpacity;
      this.material.uniforms['uBaseOpacity']!.value = Math.max(0, Math.min(1, next));
    } else {
      this.material.uniforms['uBaseOpacity']!.value = this.baseOpacity;
    }

    this.tickAutonomousPulses(elapsedSeconds);
    this.updateClickPulses(deltaSeconds);
    this.updateGlitch(elapsedSeconds, deltaSeconds);
  }

  private tickAutonomousPulses(elapsed: number): void {
    if (this.gridPulseConfig?.enabled && elapsed >= this.nextGridPulseTime) {
      this.fireGridPulse();
      this.nextGridPulseTime = this.scheduleGridPulse(elapsed);
    }
    if (this.polePulseConfig?.enabled && elapsed >= this.nextPolePulseTime) {
      this.firePolePulse();
      this.nextPolePulseTime = this.schedulePolePulse(elapsed);
    }
  }

  private fireGridPulse(): void {
    const cfg = this.gridPulseConfig;
    if (!cfg) return;
    let lat: number;
    let lng: number;
    if (cfg.mode === 'random') {
      // Uniform distribution on a sphere via inverse-CDF on cos(lat).
      const u = Math.random() * 2 - 1;
      lat = (Math.asin(u) * 180) / Math.PI;
      lng = Math.random() * 360 - 180;
    } else {
      lat = cfg.originLat;
      lng = cfg.originLng;
    }
    const origin = latLngToVector3([lat, lng], 1, new Vector3());
    this.spawnPulseAt(origin);
  }

  private firePolePulse(): void {
    const cfg = this.polePulseConfig;
    if (!cfg) return;
    if (cfg.which === 'north' || cfg.which === 'both') {
      this.spawnPulseAt(new Vector3(0, 1, 0));
    }
    if (cfg.which === 'south' || cfg.which === 'both') {
      this.spawnPulseAt(new Vector3(0, -1, 0));
    }
  }

  private updateClickPulses(delta: number): void {
    const cfg = this.clickPulseConfig;
    if (!cfg) return;

    let anyActive = false;
    const cutoff = Math.PI + cfg.width * 4;
    for (const p of this.pulses) {
      if (!p.active) continue;
      p.age += delta;
      if (p.age * cfg.speed > cutoff) {
        p.active = false;
        continue;
      }
      anyActive = true;
    }

    if (!anyActive) {
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
    if (!cfg?.enabled) {
      // If we just disabled, snap geometry back.
      if (this.positionsDirty) this.resetPositions();
      return;
    }

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

  /* ───────────── live setters ───────────── */

  public setColor(hex: string): void {
    this.material.uniforms['uColor']!.value.set(hex);
  }

  public setOpacity(opacity: number): void {
    this.baseOpacity = Math.max(0, Math.min(1, opacity));
    this.originalBaseOpacity = this.baseOpacity;
    this.material.uniforms['uBaseOpacity']!.value = this.baseOpacity;
  }

  public resetOpacity(): void {
    this.baseOpacity = this.originalBaseOpacity;
    this.material.uniforms['uBaseOpacity']!.value = this.baseOpacity;
  }

  public setPulse(amount: number): void {
    this.pulseAmplitude = Math.max(0, Math.min(1, amount));
  }

  public setPulseSpeed(hz: number): void {
    this.pulseSpeed = Math.max(0, hz);
  }

  /**
   * Density change requires a geometry rebuild — we reallocate the
   * positions/normals/tangents arrays + the GPU attributes. Cheap when
   * compared to a full globe rebuild because no other layer is touched.
   */
  public setDensity(density: number): void {
    if (density === this.density) return;
    this.density = density;
    this.rebuildGridGeometry();
  }

  public setHierarchy(enabled: boolean): void {
    this.hierarchyEnabled = enabled;
    this.material.uniforms['uHierarchy']!.value = enabled ? 1 : 0;
  }

  public setMajorStepDeg(deg: number): void {
    if (deg === this.majorStepDeg) return;
    this.majorStepDeg = Math.max(1, deg);
    this.rebuildGridGeometry();
  }

  public setMajorBoost(boost: number): void {
    this.majorBoost = boost;
    this.material.uniforms['uMajorBoost']!.value = boost;
  }

  public setMinorBoost(boost: number): void {
    this.minorBoost = boost;
    this.material.uniforms['uMinorBoost']!.value = boost;
  }

  /** Mutate click-pulse knobs in place. Pool size only changes if `maxConcurrent` differs. */
  public setClickPulseConfig(next: Partial<NonNullable<WireframeGridLayerOptions['clickPulse']>>): void {
    if (!this.clickPulseConfig) {
      this.clickPulseConfig = {
        enabled: next.enabled ?? false,
        color: next.color ?? '#ffffff',
        speed: next.speed ?? 1.5,
        width: next.width ?? 0.18,
        boost: next.boost ?? 2.5,
        maxConcurrent: next.maxConcurrent ?? 4,
      };
    }
    const cur = this.clickPulseConfig;
    const merged = {
      enabled: next.enabled ?? cur.enabled,
      color: next.color ?? cur.color,
      speed: next.speed ?? cur.speed,
      width: next.width ?? cur.width,
      boost: next.boost ?? cur.boost,
      maxConcurrent: next.maxConcurrent ?? cur.maxConcurrent,
    };
    this.clickPulseConfig = merged;
    this.clickPulseEnabled = merged.enabled;
    this.material.uniforms['uBoost']!.value = merged.boost;
    if (merged.maxConcurrent > this.pulses.length) {
      const need = merged.maxConcurrent - this.pulses.length;
      for (let i = 0; i < need; i++) {
        this.pulses.push({ origin: new Vector3(), age: 0, active: false });
      }
    } else if (merged.maxConcurrent < this.pulses.length) {
      this.pulses.length = Math.max(1, merged.maxConcurrent);
    }
  }

  public setGlitchConfig(next: Partial<NonNullable<WireframeGridLayerOptions['glitch']>>): void {
    if (!this.glitchConfig) {
      this.glitchConfig = {
        enabled: next.enabled ?? false,
        intervalMin: next.intervalMin ?? 5,
        intervalMax: next.intervalMax ?? 15,
      };
    } else {
      this.glitchConfig = {
        enabled: next.enabled ?? this.glitchConfig.enabled,
        intervalMin: next.intervalMin ?? this.glitchConfig.intervalMin,
        intervalMax: next.intervalMax ?? this.glitchConfig.intervalMax,
      };
    }
    if (!this.glitchConfig.enabled) {
      this.currentGlitch = null;
      this.nextGlitchTime = Infinity;
      if (this.positionsDirty) this.resetPositions();
    } else if (this.nextGlitchTime === Infinity) {
      this.nextGlitchTime = this.scheduleGlitch(0);
    }
  }

  public setGridPulseConfig(next: Partial<NonNullable<WireframeGridLayerOptions['gridPulse']>>): void {
    const prev = this.gridPulseConfig ?? {
      enabled: false,
      intervalSec: 4,
      speed: 1.2,
      width: 0.16,
      boost: 1.8,
      mode: 'fixed' as const,
      originLat: 0,
      originLng: 0,
    };
    this.gridPulseConfig = {
      enabled: next.enabled ?? prev.enabled,
      intervalSec: next.intervalSec ?? prev.intervalSec,
      speed: next.speed ?? prev.speed,
      width: next.width ?? prev.width,
      boost: next.boost ?? prev.boost,
      mode: next.mode ?? prev.mode,
      originLat: next.originLat ?? prev.originLat,
      originLng: next.originLng ?? prev.originLng,
      ...(next.color !== undefined ? { color: next.color } : prev.color !== undefined ? { color: prev.color } : {}),
    };
    if (!this.gridPulseConfig.enabled) {
      this.nextGridPulseTime = Infinity;
    } else if (this.nextGridPulseTime === Infinity) {
      this.nextGridPulseTime = this.scheduleGridPulse(0);
    }
  }

  public setPolePulseConfig(next: Partial<NonNullable<WireframeGridLayerOptions['polePulse']>>): void {
    const prev = this.polePulseConfig ?? {
      enabled: false,
      intervalSec: 5,
      speed: 1.0,
      boost: 1.5,
      width: 0.15,
      which: 'both' as const,
    };
    this.polePulseConfig = {
      enabled: next.enabled ?? prev.enabled,
      intervalSec: next.intervalSec ?? prev.intervalSec,
      speed: next.speed ?? prev.speed,
      boost: next.boost ?? prev.boost,
      width: next.width ?? prev.width,
      which: next.which ?? prev.which,
      ...(next.color !== undefined ? { color: next.color } : prev.color !== undefined ? { color: prev.color } : {}),
    };
    if (!this.polePulseConfig.enabled) {
      this.nextPolePulseTime = Infinity;
    } else if (this.nextPolePulseTime === Infinity) {
      this.nextPolePulseTime = this.schedulePolePulse(0);
    }
  }

  /**
   * Density / majorStepDeg trigger this — we rebuild the segment buffer +
   * caches in place and swap the BufferGeometry on the existing mesh. The
   * material is preserved, no GPU material churn.
   */
  private rebuildGridGeometry(): void {
    const { positions, isMajor } = generateGridSegments(
      this.density,
      this.radius,
      this.majorStepDeg
    );
    this.basePositions = positions;
    this.isMajor = isMajor;
    this.workingPositions = new Float32Array(positions);
    const vertexCount = positions.length / 3;
    this.vertexNormals = new Float32Array(positions.length);
    this.vertexLats = new Float32Array(vertexCount);
    this.tangents = new Float32Array(positions.length);
    this.brightness = new Float32Array(vertexCount);
    this.precomputeVertexData();

    const oldGeometry = this.geometry;
    const next = new BufferGeometry();
    next.setAttribute('position', new Float32BufferAttribute(this.workingPositions, 3));
    next.setAttribute('aBrightness', new Float32BufferAttribute(this.brightness, 1));
    next.setAttribute('aMajor', new Float32BufferAttribute(this.isMajor, 1));
    this.geometry = next;
    this.mesh.geometry = next;
    oldGeometry.dispose();
    this.positionsDirty = false;
  }
}

export const WIREFRAME_DEFAULT_RADIUS = GLOBE_RADIUS * 1.0005;
