import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineSegments,
  ShaderMaterial,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { nextGlitchTime } from './hologram-extras';
import type { CountryFeature } from '../../renderer/country-feature';

export interface HologramBordersLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly intensity: number;
  readonly glitch: {
    readonly enabled: boolean;
    readonly intervalMin: number;
    readonly intervalMax: number;
    readonly amount: number;
    /** RGB channel split during glitch — adds a chromatic fringe to the shear. */
    readonly channelShift?: number;
  };
}

const BORDER_RADIUS = GLOBE_RADIUS * 1.0025;

const VERT_SHADER = /* glsl */ `
  attribute float aOffsetSeed;
  attribute float aLat;
  uniform float uGlitchPhase;
  uniform float uGlitchAmount;
  uniform float uGlitchCenterLat;
  uniform float uGlitchHalfHeight;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying float vGlitchBand;
  void main() {
    vec3 displaced = position;
    float band = 0.0;
    if (uGlitchPhase > 0.0) {
      band = step(abs(aLat - uGlitchCenterLat), uGlitchHalfHeight);
      // East-tangent in globe-local space (cross product of up × position).
      vec3 up = vec3(0.0, 1.0, 0.0);
      vec3 east = cross(up, position);
      float eastLen = length(east);
      if (eastLen > 1e-6) {
        east = east / eastLen;
        float envelope = sin(uGlitchPhase * 3.1415926);
        float seedJitter = (aOffsetSeed - 0.5) * 0.5;
        displaced = position + east * uGlitchAmount * envelope * band * (1.0 + seedJitter);
      }
    }
    vGlitchBand = band * uGlitchPhase;
    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normalize(displaced));
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAG_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uChannelShift;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying float vGlitchBand;
  void main() {
    float ndv = max(dot(normalize(vViewDir), normalize(vWorldNormal)), 0.0);
    // Soft fade-out near the silhouette so back-side borders dim gracefully.
    float facing = smoothstep(0.0, 0.35, ndv);
    vec3 rgb = uColor * uIntensity * facing;
    // Chromatic channel split — only fires inside the glitch band, peaks at
    // mid-phase. Adds a red/blue fringe to the shear which sells the "data
    // corruption" effect.
    if (vGlitchBand > 0.001 && uChannelShift > 0.001) {
      float envelope = sin(vGlitchBand * 3.1415926);
      float k = uChannelShift * envelope;
      rgb.r += k * 0.6;
      rgb.b += k * 0.4;
      rgb.g -= k * 0.2;
    }
    gl_FragColor = vec4(rgb, facing);
  }
`;

interface ActiveGlitch {
  centerLat: number;
  halfHeight: number;
  duration: number;
  age: number;
}

/**
 * Custom additive cyan border layer for the hologram kind. Renders the same
 * `CountryFeature` ring data as the base outline borders, but with a Fresnel
 * fade and band-restricted east-tangent glitch displacement on a per-vertex
 * `aOffsetSeed`. Intentionally separate from the base outline borders — the
 * hologram preset zeroes their opacity.
 *
 * Live setters expose every knob (color, intensity, glitch on/off, intervals,
 * amplitude, channel shift) so the workshop preset doesn't need a rebuild.
 */
export class HologramBordersLayer {
  public readonly group: Group;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private glitchEnabled: boolean;
  private glitchIntervalMin: number;
  private glitchIntervalMax: number;
  private glitchAmount: number;
  private currentGlitch: ActiveGlitch | null;
  private nextGlitchAt: number;
  // Cached construction-time values for reset-to-default flows.
  private readonly defaultColor: string;
  private readonly defaultIntensity: number;
  private readonly defaultAmount: number;

  public constructor(options: HologramBordersLayerOptions) {
    this.group = new Group();
    this.glitchEnabled = options.glitch.enabled;
    this.glitchIntervalMin = options.glitch.intervalMin;
    this.glitchIntervalMax = options.glitch.intervalMax;
    this.glitchAmount = options.glitch.amount;

    this.defaultColor = options.color;
    this.defaultIntensity = options.intensity;
    this.defaultAmount = options.glitch.amount;

    const positions: Array<number> = [];
    const seeds: Array<number> = [];
    const lats: Array<number> = [];

    options.features.forEach((feature) => {
      feature.coordinates.forEach((ring) => {
        if (ring.length < 2) return;
        for (let i = 0; i < ring.length - 1; i++) {
          const a = ring[i];
          const b = ring[i + 1];
          if (!a || !b) continue;
          const v1 = latLngToVector3([a[1], a[0]], BORDER_RADIUS);
          const v2 = latLngToVector3([b[1], b[0]], BORDER_RADIUS);
          positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
          // Hash from coords — stable across rebuilds.
          const seed1 = hash01(a[0], a[1]);
          const seed2 = hash01(b[0], b[1]);
          seeds.push(seed1, seed2);
          lats.push(a[1], b[1]);
        }
      });
    });

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(positions), 3));
    this.geometry.setAttribute('aOffsetSeed', new Float32BufferAttribute(new Float32Array(seeds), 1));
    this.geometry.setAttribute('aLat', new Float32BufferAttribute(new Float32Array(lats), 1));

    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(options.color) },
        uIntensity: { value: options.intensity },
        uGlitchPhase: { value: 0 },
        uGlitchAmount: { value: options.glitch.amount },
        uGlitchCenterLat: { value: 0 },
        uGlitchHalfHeight: { value: 0 },
        uChannelShift: { value: options.glitch.channelShift ?? 0.5 },
      },
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const lines = new LineSegments(this.geometry, this.material);
    lines.renderOrder = 3;
    this.group.add(lines);

    this.currentGlitch = null;
    this.nextGlitchAt = this.glitchEnabled ? this.scheduleNext(0) : Infinity;
  }

  private scheduleNext(now: number): number {
    return nextGlitchTime(now, this.glitchIntervalMin, this.glitchIntervalMax, Math.random);
  }

  public update(elapsedSeconds: number, deltaSeconds: number): void {
    if (!this.glitchEnabled) {
      // Drain a residual glitch if the user toggled it off mid-shear.
      if (this.currentGlitch) {
        this.currentGlitch = null;
        this.material.uniforms['uGlitchPhase']!.value = 0;
      }
      return;
    }

    if (this.currentGlitch) {
      this.currentGlitch.age += deltaSeconds;
      const t = this.currentGlitch.age / this.currentGlitch.duration;
      if (t >= 1) {
        this.currentGlitch = null;
        this.material.uniforms['uGlitchPhase']!.value = 0;
        this.nextGlitchAt = this.scheduleNext(elapsedSeconds);
        return;
      }
      this.material.uniforms['uGlitchPhase']!.value = t;
      return;
    }

    if (elapsedSeconds >= this.nextGlitchAt) {
      // Hologram glitches: ~80–250ms, slightly more dramatic band than wireframe.
      const halfHeight = 8 + Math.random() * 18;
      this.currentGlitch = {
        centerLat: -90 + Math.random() * 180,
        halfHeight,
        duration: 0.08 + Math.random() * 0.17,
        age: 0,
      };
      this.material.uniforms['uGlitchCenterLat']!.value = this.currentGlitch.centerLat;
      this.material.uniforms['uGlitchHalfHeight']!.value = halfHeight;
      this.material.uniforms['uGlitchPhase']!.value = 0.0001;
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }

  // -----------------------------------------------------------------
  // Live setters
  // -----------------------------------------------------------------

  public setColor(color: string): void {
    if (color === '') {
      (this.material.uniforms['uColor']!.value as Color).set(this.defaultColor);
      return;
    }
    (this.material.uniforms['uColor']!.value as Color).set(color);
  }

  public setIntensity(intensity: number): void {
    this.material.uniforms['uIntensity']!.value =
      intensity > 0 ? intensity : this.defaultIntensity;
  }

  public setGlitchEnabled(enabled: boolean): void {
    if (enabled === this.glitchEnabled) return;
    this.glitchEnabled = enabled;
    if (enabled) {
      // Reschedule from "now" — borders.update() consumes elapsedSeconds
      // each tick, so passing 0 starts the countdown on next frame.
      this.nextGlitchAt = this.scheduleNext(0);
    } else {
      this.nextGlitchAt = Infinity;
    }
  }

  public setGlitchInterval(min: number, max: number): void {
    this.glitchIntervalMin = Math.max(0, min);
    this.glitchIntervalMax = Math.max(this.glitchIntervalMin, max);
  }

  public setGlitchAmount(amount: number): void {
    const next = amount > 0 ? amount : this.defaultAmount;
    this.glitchAmount = next;
    this.material.uniforms['uGlitchAmount']!.value = next;
  }

  public setGlitchChannelShift(shift: number): void {
    this.material.uniforms['uChannelShift']!.value = Math.max(0, shift);
  }
}

/** Stable [0,1] hash from a (lng, lat) pair. */
const hash01 = (lng: number, lat: number): number => {
  const x = Math.sin(lng * 12.9898 + lat * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
