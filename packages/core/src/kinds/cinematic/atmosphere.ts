// Cinematic atmosphere — a single-scattering shell instead of the shared
// Fresnel halo.
//
// Every fragment on the (front-facing) shell casts the camera ray through
// the atmosphere: it enters at the fragment, and exits either where it
// leaves the shell (halo ring outside the silhouette) or where it hits
// the planet (haze over the disc). The path is sampled at a handful of
// points; each sample contributes density × sunlight × tint, where
//
//   * density falls off exponentially with altitude (`power` steepens it),
//   * sunlight comes from the shared terminator function so the halo is
//     blue on the day limb, orange in the twilight band and dark at
//     night (plus a faint airglow so the limb never fully disappears),
//   * the tint blends day → twilight colour as the sun drops toward the
//     local horizon (Rayleigh extinction reddening),
//
// and the summed in-scatter is weighted by Rayleigh + Mie phase terms so
// looking toward the sun produces the forward-scatter glare real
// atmospheres show. An aurora glow at auroral latitudes reads the same
// `cn_aurora()` band the surface draws.
//
// The class keeps the `AtmosphereLayer` public surface so the shared
// globe wiring (`create-globe.ts`) needs no changes: `color` → tint,
// `intensity` → strength, `radiusScale` → shell radius, `power` →
// density falloff, `pulse` → breathe.

import {
  AdditiveBlending,
  Blending,
  Color,
  FrontSide,
  Matrix3,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';
import type { CinematicAtmosphereConfig } from '../../types/kinds';
import type { OutlineAtmosphereOptions } from '../outline/atmosphere';
import type { CinematicWorld } from './engine';
import { GLSL_CINEMATIC_PRELUDE } from './math';
import {
  applyCinematicUniforms,
  cloneCinematicUniforms,
  createCinematicUniforms,
  syncCinematicUniforms,
  type CinematicUniforms,
} from './shader-uniforms';

const DEFAULTS = {
  radiusScale: 1.075,
  power: 2.0,
  threshold: 0.6,
  scatterStrength: 1,
  mieStrength: 1,
  dayColor: '#6fb6ff',
  twilightColor: '#ff8a3d',
  nightColor: '#24365f',
  airglow: 0.18,
};

const VERTEX_SHADER = /* glsl */ `
  precision highp float;
  varying vec3 vWorldPos;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  ${GLSL_CINEMATIC_PRELUDE}

  uniform vec3  uTint;
  uniform float uIntensity;
  uniform float uFalloff;
  uniform float uPulseAmp;
  uniform float uPulseTime;
  uniform float uPlanetRadius;
  uniform float uShellRadius;
  uniform float uScatterStrength;
  uniform float uMieStrength;
  uniform vec3  uDayColor;
  uniform vec3  uTwilightColor;
  uniform vec3  uNightColor;
  uniform float uAirglow;
  uniform mat3  uWorldToLocal;
  uniform vec3  uLightDirection;
  uniform float uTerminatorSoftness;
  uniform float uTerminatorContrast;
  uniform float uAtmosphericScatter;
  uniform float uHorizonGlow;
  uniform float uTime;
  uniform float uAuroraIntensity;
  uniform float uAuroraSpeed;
  uniform float uAuroraLatitude;
  uniform vec3  uAuroraColor;
  uniform vec3  uAuroraTopColor;
  uniform float uInteractionEnergy;

  varying vec3 vWorldPos;

  const int SAMPLES = 6;

  void main() {
    vec3 ro = cameraPosition;
    vec3 rd = normalize(vWorldPos - ro);
    vec3 sun = normalize(uLightDirection);

    // Ray / shell and ray / planet intersections (sphere at the origin).
    float b = dot(ro, rd);
    float c = dot(ro, ro);
    float discShell = max(b * b - (c - uShellRadius * uShellRadius), 0.0);
    float sq = sqrt(discShell);
    float tEnter = max(-b - sq, 0.0);
    float tExit = -b + sq;
    float discPlanet = b * b - (c - uPlanetRadius * uPlanetRadius);
    float hitsPlanet = step(0.0, discPlanet);
    float tGround = -b - sqrt(max(discPlanet, 0.0));
    tExit = mix(tExit, tGround, hitsPlanet);
    float pathLen = max(tExit - tEnter, 0.0);
    float shellDepth = max(uShellRadius - uPlanetRadius, 0.0001);

    vec3 inscatter = vec3(0.0);
    float night = 0.0;
    float mu = dot(rd, sun);
    for (int i = 0; i < SAMPLES; i++) {
      float t = tEnter + pathLen * (float(i) + 0.5) / float(SAMPLES);
      vec3 p = ro + rd * t;
      vec3 up = normalize(p);
      float alt = clamp((length(p) - uPlanetRadius) / shellDepth, 0.0, 1.0);
      float density = exp(-alt * uFalloff * 2.2);
      float elev = dot(up, sun);
      cn_TerminatorBands tb = cn_terminator(up, sun, uTerminatorSoftness * 1.35, uTerminatorContrast);
      vec3 tint = mix(uTwilightColor, uDayColor, smoothstep(-0.08, 0.42, elev));
      inscatter += density * tint * (tb.day * 0.9 + tb.twilight * 0.55);
      night += density * (1.0 - tb.day);
    }
    // Rays that hit the planet only cross the shell once (haze over the
    // disc); weight them down so the disc stays crisp and the glow lives
    // on the limb, where the path runs through the whole shell.
    float limbness = smoothstep(0.15, 1.0, pathLen / (shellDepth * 2.4));
    float hazeWeight = mix(0.14, 1.0, limbness);
    float norm = pathLen / shellDepth / float(SAMPLES) * hazeWeight;
    inscatter *= norm;
    night *= norm;

    float rayleigh = cn_rayleighPhase(mu) * 0.85;
    float mie = cn_miePhase(mu, 0.76) * 3.2 * uMieStrength;
    vec3 color = inscatter * (rayleigh + mie) * uScatterStrength * uAtmosphericScatter;

    // Faint night-side airglow so the limb keeps its silhouette.
    color += uNightColor * night * uAirglow * 0.6;

    // Aurora glow around the auroral oval, strongest near the limb where
    // the curtains stack up along the line of sight.
    if (uAuroraIntensity > 0.001) {
      vec3 closest = ro + rd * max(-b, 0.0);
      vec3 localDir = normalize(uWorldToLocal * normalize(closest));
      vec2 au = cn_aurora(localDir, uTime, uAuroraSpeed, uAuroraLatitude);
      vec3 auroraColor = mix(uAuroraColor, uAuroraTopColor, au.y);
      float limb = smoothstep(0.2, 1.0, pathLen / shellDepth);
      color += auroraColor * au.x * uAuroraIntensity * night * limb * 0.35;
    }

    float breathe = 1.0 + uPulseAmp * sin(uPulseTime);
    color *= uTint * uIntensity * breathe * (0.85 + 0.15 * uHorizonGlow);
    color += color * uInteractionEnergy * 0.12;

    gl_FragColor = vec4(color, clamp(dot(color, vec3(0.3333)), 0.0, 1.0));
  }
`;

const resolveBlending = (mode: OutlineAtmosphereOptions['blending']): Blending =>
  mode === 'normal' ? NormalBlending : AdditiveBlending;

export class CinematicAtmosphereLayer {
  public readonly mesh: Mesh;
  private geometry: SphereGeometry;
  private readonly material: ShaderMaterial;
  private readonly uniforms: CinematicUniforms;
  private readonly defaultColor: string;
  private readonly defaultIntensity: number;
  private readonly defaultPower: number;
  private readonly defaultThreshold: number;
  private readonly defaultRadiusScale: number;
  private readonly worldToLocal = new Matrix3();
  private radiusScale: number;
  private pulseEnabled: boolean;
  private pulseSpeed: number;
  private elapsedSeconds = 0;
  private world: CinematicWorld | null = null;

  public constructor(options: OutlineAtmosphereOptions) {
    this.defaultColor = options.color;
    this.defaultIntensity = options.intensity;
    this.defaultPower = options.power ?? DEFAULTS.power;
    this.defaultThreshold = options.threshold ?? DEFAULTS.threshold;
    this.defaultRadiusScale =
      options.radiusScale !== undefined && options.radiusScale > 1
        ? options.radiusScale
        : DEFAULTS.radiusScale;
    this.radiusScale = this.defaultRadiusScale;
    this.pulseEnabled = options.pulse?.enabled ?? false;
    this.pulseSpeed = options.pulse?.speed ?? 0.25;
    this.uniforms = createCinematicUniforms();
    this.geometry = new SphereGeometry(GLOBE_RADIUS * this.radiusScale, 96, 96);
    this.material = new ShaderMaterial({
      uniforms: {
        ...cloneCinematicUniforms(this.uniforms),
        uTint: { value: new Color(options.color) },
        uIntensity: { value: options.intensity },
        uFalloff: { value: this.defaultPower },
        uPulseAmp: { value: this.pulseEnabled ? (options.pulse?.amplitude ?? 0.25) : 0 },
        uPulseTime: { value: 0 },
        uPlanetRadius: { value: GLOBE_RADIUS },
        uShellRadius: { value: GLOBE_RADIUS * this.radiusScale },
        uScatterStrength: { value: DEFAULTS.scatterStrength },
        uMieStrength: { value: DEFAULTS.mieStrength },
        uDayColor: { value: new Color(DEFAULTS.dayColor) },
        uTwilightColor: { value: new Color(DEFAULTS.twilightColor) },
        uNightColor: { value: new Color(DEFAULTS.nightColor) },
        uAirglow: { value: DEFAULTS.airglow },
        uWorldToLocal: { value: this.worldToLocal },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      blending: resolveBlending(options.blending),
      side: FrontSide,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'CinematicAtmosphereLayer';
    this.mesh.renderOrder = 4;
  }

  public setWorld(world: CinematicWorld): void {
    this.world = world;
  }

  /** Tick the breathe oscillator and pull the shared world uniforms. */
  public update(delta: number): void {
    if (this.world) syncCinematicUniforms(this.uniforms, this.world.uniforms);
    applyCinematicUniforms(this.material, this.uniforms);
    this.mesh.updateMatrixWorld();
    this.worldToLocal.setFromMatrix4(this.mesh.matrixWorld).invert();
    if (!this.pulseEnabled) return;
    this.elapsedSeconds += delta;
    this.material.uniforms['uPulseTime']!.value = this.elapsedSeconds * this.pulseSpeed * 2 * Math.PI;
  }

  /** Cinematic-only scattering knobs (`config.cinematic.atmosphere`). */
  public setScatter(config: CinematicAtmosphereConfig): void {
    const u = this.material.uniforms;
    if (config.scatterStrength !== undefined) {
      u['uScatterStrength']!.value =
        config.scatterStrength >= 0 ? config.scatterStrength : DEFAULTS.scatterStrength;
    }
    if (config.mieStrength !== undefined) {
      u['uMieStrength']!.value = config.mieStrength >= 0 ? config.mieStrength : DEFAULTS.mieStrength;
    }
    if (config.dayColor !== undefined) {
      (u['uDayColor']!.value as Color).set(config.dayColor === '' ? DEFAULTS.dayColor : config.dayColor);
    }
    if (config.twilightColor !== undefined) {
      (u['uTwilightColor']!.value as Color).set(
        config.twilightColor === '' ? DEFAULTS.twilightColor : config.twilightColor,
      );
    }
    if (config.nightColor !== undefined) {
      (u['uNightColor']!.value as Color).set(
        config.nightColor === '' ? DEFAULTS.nightColor : config.nightColor,
      );
    }
    if (config.airglow !== undefined) {
      u['uAirglow']!.value = config.airglow >= 0 ? config.airglow : DEFAULTS.airglow;
    }
    if (config.thickness !== undefined && config.thickness > 0) {
      this.setRadiusScale(1 + config.thickness);
    }
  }

  public setColor(color: string): void {
    (this.material.uniforms['uTint']!.value as Color).set(color);
  }

  public setIntensity(intensity: number): void {
    this.material.uniforms['uIntensity']!.value = intensity;
  }

  /** Density falloff steepness (kept under the shared `power` name). */
  public setPower(power: number): void {
    this.material.uniforms['uFalloff']!.value = power;
  }

  /** No direct equivalent in the scattering model; accepted for API parity. */
  public setThreshold(_threshold: number): void {
    // intentionally a no-op
  }

  public setRadiusScale(scale: number): void {
    if (Math.abs(this.radiusScale - scale) < 1e-4) return;
    this.radiusScale = scale;
    const next = new SphereGeometry(GLOBE_RADIUS * scale, 96, 96);
    this.geometry.dispose();
    this.geometry = next;
    this.mesh.geometry = next;
    this.material.uniforms['uShellRadius']!.value = GLOBE_RADIUS * scale;
  }

  /** The scattering shell always renders front-facing; accepted for API parity. */
  public setSide(_mode: OutlineAtmosphereOptions['side']): void {
    // intentionally a no-op
  }

  public setBlending(mode: OutlineAtmosphereOptions['blending']): void {
    this.material.blending = resolveBlending(mode);
    this.material.needsUpdate = true;
  }

  public setPulse(pulse: OutlineAtmosphereOptions['pulse'] | null): void {
    const enabled = pulse?.enabled ?? false;
    this.pulseEnabled = enabled;
    if (pulse?.speed !== undefined) this.pulseSpeed = pulse.speed;
    this.material.uniforms['uPulseAmp']!.value = enabled ? (pulse?.amplitude ?? 0.25) : 0;
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public resetColor(): void {
    this.setColor(this.defaultColor);
  }

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
