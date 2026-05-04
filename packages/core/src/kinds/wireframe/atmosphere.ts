import {
  AdditiveBlending,
  BackSide,
  Blending,
  Color,
  DoubleSide,
  FrontSide,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  Side,
  SphereGeometry,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';

export interface WireframeAtmosphereOptions {
  readonly color: string;
  readonly intensity: number;
  /**
   * Mesh radius as a multiplier of `GLOBE_RADIUS`. Default 1.15 — the
   * halo extends 15% beyond the globe surface. Range 1.01..1.5 for
   * tight rim ↔ wide aurora.
   */
  readonly radiusScale?: number;
  /**
   * Fresnel exponent — controls the falloff sharpness of the rim. 0.5
   * = soft & diffuse glow that fills most of the silhouette; 4.0 =
   * razor-thin rim hugging the edge. Default 2.0.
   */
  readonly power?: number;
  /**
   * Fresnel threshold — where the rim starts. 0 means the entire
   * sphere shows tint, 1 means only the silhouette edge. Default 0.6
   * (rim begins ~40% from the centre normal towards the edge).
   */
  readonly threshold?: number;
  /**
   * Render side. `back` (default) draws on the inside of the
   * surrounding shell so it reads as a halo behind the globe; `front`
   * drops the rim onto the front-facing portion (more like a haze
   * over the planet); `double` does both for a heavier atmosphere.
   */
  readonly side?: 'back' | 'front' | 'double';
  /**
   * Blend mode. `'additive'` (default) reads as glow on dark themes;
   * `'normal'` is a flat overlay useful on cream / paper themes where
   * additive blowouts.
   */
  readonly blending?: 'additive' | 'normal';
  /**
   * Optional time-driven brightness oscillation (atmospheric "breath").
   * `enabled: false` (default) keeps the halo static.
   */
  readonly pulse?: {
    readonly enabled?: boolean;
    /** Frequency in Hz. Default 0.25 (slow, contemplative). */
    readonly speed?: number;
    /** Brightness amplitude as a fraction of base intensity. Default 0.25. */
    readonly amplitude?: number;
  };
}

const DEFAULTS = {
  radiusScale: 1.15,
  power: 2.0,
  threshold: 0.6,
  side: 'back' as const,
  blending: 'additive' as const,
};

const VERTEX_SHADER = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Two extra uniforms (uPower, uThreshold) parameterise the Fresnel
// curve. uPulseAmp + uPulseTime add a slow brightness oscillation so
// the halo can "breathe" in and out — set amp to 0 to disable.
const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uThreshold;
  uniform float uPulseAmp;
  uniform float uPulseTime;
  varying vec3 vNormal;
  void main() {
    float fres = pow(uThreshold - dot(vNormal, vec3(0.0, 0.0, 1.0)), uPower);
    float breathe = 1.0 + uPulseAmp * sin(uPulseTime);
    gl_FragColor = vec4(uColor, 1.0) * fres * uIntensity * breathe;
  }
`;

const resolveSide = (mode: WireframeAtmosphereOptions['side']): Side => {
  if (mode === 'front') return FrontSide;
  if (mode === 'double') return DoubleSide;
  return BackSide;
};

const resolveBlending = (mode: WireframeAtmosphereOptions['blending']): Blending => {
  if (mode === 'normal') return NormalBlending;
  return AdditiveBlending;
};

export class WireframeAtmosphereLayer {
  public readonly mesh: Mesh;
  private geometry: SphereGeometry;
  private readonly material: ShaderMaterial;
  // Cached construction values for reset-to-default flows.
  private readonly defaultColor: string;
  private readonly defaultIntensity: number;
  private readonly defaultPower: number;
  private readonly defaultThreshold: number;
  private readonly defaultRadiusScale: number;
  // Mutable state needed by the per-frame `update(delta)` accumulator.
  private radiusScale: number;
  private pulseEnabled: boolean;
  private pulseSpeed: number;
  private elapsedSeconds = 0;

  public constructor(options: WireframeAtmosphereOptions) {
    this.defaultColor = options.color;
    this.defaultIntensity = options.intensity;
    this.defaultPower = options.power ?? DEFAULTS.power;
    this.defaultThreshold = options.threshold ?? DEFAULTS.threshold;
    this.defaultRadiusScale = options.radiusScale ?? DEFAULTS.radiusScale;
    this.radiusScale = this.defaultRadiusScale;
    this.pulseEnabled = options.pulse?.enabled ?? false;
    this.pulseSpeed = options.pulse?.speed ?? 0.25;
    this.geometry = new SphereGeometry(GLOBE_RADIUS * this.radiusScale, 64, 64);
    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(options.color) },
        uIntensity: { value: options.intensity },
        uPower: { value: this.defaultPower },
        uThreshold: { value: this.defaultThreshold },
        uPulseAmp: { value: this.pulseEnabled ? (options.pulse?.amplitude ?? 0.25) : 0 },
        uPulseTime: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      blending: resolveBlending(options.blending),
      side: resolveSide(options.side),
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new Mesh(this.geometry, this.material);
  }

  /** Tick the brightness oscillator. Called once per render frame. */
  public update(delta: number): void {
    if (!this.pulseEnabled) return;
    this.elapsedSeconds += delta;
    const uniform = this.material.uniforms['uPulseTime'];
    if (uniform) uniform.value = this.elapsedSeconds * this.pulseSpeed * 2 * Math.PI;
  }

  public setColor(color: string): void {
    (this.material.uniforms['uColor']?.value as Color)?.set(color);
  }

  public setIntensity(intensity: number): void {
    if (this.material.uniforms['uIntensity']) {
      this.material.uniforms['uIntensity'].value = intensity;
    }
  }

  /** Live update for the Fresnel exponent. */
  public setPower(power: number): void {
    if (this.material.uniforms['uPower']) {
      this.material.uniforms['uPower'].value = power;
    }
  }

  /** Live update for the Fresnel threshold. */
  public setThreshold(threshold: number): void {
    if (this.material.uniforms['uThreshold']) {
      this.material.uniforms['uThreshold'].value = threshold;
    }
  }

  /**
   * Live update for mesh radius. Disposes the old sphere geometry and
   * builds a new one — small one-time cost (single mesh, no other
   * scene ties), no rebuild of the whole atmosphere layer.
   */
  public setRadiusScale(scale: number): void {
    if (Math.abs(this.radiusScale - scale) < 1e-4) return;
    this.radiusScale = scale;
    const next = new SphereGeometry(GLOBE_RADIUS * scale, 64, 64);
    this.geometry.dispose();
    this.geometry = next;
    this.mesh.geometry = next;
  }

  public setSide(mode: WireframeAtmosphereOptions['side']): void {
    this.material.side = resolveSide(mode);
    this.material.needsUpdate = true;
  }

  public setBlending(mode: WireframeAtmosphereOptions['blending']): void {
    this.material.blending = resolveBlending(mode);
    this.material.needsUpdate = true;
  }

  /**
   * Live update for the brightness pulse. `null` or `enabled: false`
   * freezes the halo at its current value. Otherwise drives a sin
   * oscillation around the base intensity.
   */
  public setPulse(pulse: WireframeAtmosphereOptions['pulse'] | null): void {
    const enabled = pulse?.enabled ?? false;
    this.pulseEnabled = enabled;
    if (pulse?.speed !== undefined) this.pulseSpeed = pulse.speed;
    const ampUniform = this.material.uniforms['uPulseAmp'];
    if (ampUniform) ampUniform.value = enabled ? (pulse?.amplitude ?? 0.25) : 0;
  }

  /**
   * Toggle visibility — `Object3D.visible` flip, no GPU work. Live-
   * updates the master atmosphere on/off without rebuilding.
   */
  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  /** Restore the construction-time (theme-driven) color. */
  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

  /** Restore the construction-time (theme-driven) intensity. */
  public resetIntensity(): void {
    this.setIntensity(this.defaultIntensity);
  }

  public resetPower(): void {
    this.setPower(this.defaultPower);
  }

  public resetThreshold(): void {
    this.setThreshold(this.defaultThreshold);
  }

  public resetRadiusScale(): void {
    this.setRadiusScale(this.defaultRadiusScale);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
