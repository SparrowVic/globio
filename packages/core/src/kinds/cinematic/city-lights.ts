// Cinematic city-lights — point sprites driven by physical-ish models.
//
// Each city is a single GL_POINT with five baked attributes: world
// position, sprite size (importance × density), per-point shimmer phase,
// per-point intensity, density at the point, colour temperature in
// [0..1] mapped to a Kelvin range. The fragment shader produces a
// sub-pixel core + halo, the vertex shader does the heavy reactive work:
//
//   * Night-side gating from `cn_terminator()` so day-side cities fade
//     to nothing while night-side burns hot, with a small twilight
//     boost that mirrors the surface terminator wash.
//
//   * Atmospheric extinction at the limb — a Beer–Lambert-like
//     attenuation so cities near the horizon read dimmer than cities
//     directly under the camera, the way they do through real air.
//
//   * Per-point shimmer = slow drift + fast twinkle, both seeded from
//     the point's own hash so neighbours flicker independently. No
//     `Math.random` anywhere; the same camera position twice produces
//     identical pixels.
//
//   * Spatial interaction echo: a localised brighten when the user
//     touches the globe near the city, falling off as a geodesic
//     Gaussian over `uInteractionRadius`.
//
//   * Density-driven gamma: brighter cities cluster more sharply, dim
//     cities pull a longer halo. The exponent on density at the start
//     of the function is the dial.

import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CinematicWorld } from './engine';
import type { CinematicPreparedData } from './data';
import {
  cloneCinematicUniforms,
  createCinematicUniforms,
  syncCinematicUniforms,
  type CinematicUniforms,
} from './shader-uniforms';
import { GLSL_TERMINATOR, kelvinToRgb, sampleDensity, stableHash01 } from './math';

export interface CinematicCityLightsLayerOptions {
  readonly color: string;
  readonly intensity: number;
  readonly count?: number;
  readonly size?: number;
  readonly twinkle?: boolean;
  readonly data: CinematicPreparedData;
}

const DEFAULT_COUNT = 11500;
const DEFAULT_SIZE = 0.0058;
const LIGHT_RADIUS = GLOBE_RADIUS * 1.0075;
// Colour-temperature endpoints used for the per-point gradient. Cooler
// (sodium-vapour 2700K → high-pressure 4200K) keeps hot cores looking
// natural; the warm bias is intentional because film-Earth city lights
// read warmer than sensor data suggests.
const KELVIN_WARM = kelvinToRgb(2750);
const KELVIN_COOL = kelvinToRgb(4400);

const VERTEX_SHADER = /* glsl */ `
  precision mediump float;
  ${GLSL_TERMINATOR}

  attribute float aSize;
  attribute float aPhase;
  attribute float aIntensity;
  attribute float aDensity;
  attribute float aTemperature;

  uniform float uSize;
  uniform float uIntensity;
  uniform float uTwinkle;
  uniform float uTime;
  uniform float uCameraDistance;
  uniform float uLightInfluence;
  uniform float uCameraInfluence;
  uniform float uDensityInfluence;
  uniform float uTerminatorBoost;
  uniform float uHorizonGlow;
  uniform float uCityNightResponse;
  uniform float uTerminatorSoftness;
  uniform float uTerminatorContrast;
  uniform float uInteractionEnergy;
  uniform vec3  uInteractionPoint;
  uniform float uInteractionAge;
  uniform float uInteractionRadius;
  uniform vec3  uColor;
  uniform vec3  uKelvinWarm;
  uniform vec3  uKelvinCool;
  uniform vec3  uLightDirection;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;
    vec3 surface = normalize(position);                                    // sphere normal in local space
    vec3 normal  = normalize(mat3(modelMatrix) * surface);
    vec3 viewDir = normalize(cameraPosition - worldPosition.xyz);

    // Day/night/twilight from the shared terminator function.
    cn_TerminatorBands tb = cn_terminator(normal, normalize(uLightDirection),
                                          uTerminatorSoftness, uTerminatorContrast);

    // Visibility through atmosphere: at the limb the line-of-sight
    // through air is long, so we extinct point intensity with a
    // Schlick-like 1 - smoothstep on the camera-facing dot product.
    float ndv = clamp(dot(normal, viewDir), 0.0, 1.0);
    float horizon = 1.0 - smoothstep(0.02, 0.42, ndv);
    float extinction = mix(1.0, smoothstep(0.0, 0.32, ndv), 0.85);

    // Multi-source reactivity:
    //   night-side base + twilight kicker + horizon limb-glow lift.
    float lit = (1.0 - tb.day) * uCityNightResponse
              + tb.twilight * 1.05 * uTerminatorBoost
              + horizon * 0.16 * uHorizonGlow;
    float lightReactive = mix(1.0, lit, uLightInfluence);

    // Density-driven gamma: cores burn, edges dim.
    float densityCurve = pow(aDensity, 0.78);
    float densityBoost = mix(1.0, 0.62 + densityCurve * 0.94, uDensityInfluence);

    // Two-band twinkle: slow ~0.5 Hz drift + fast 2-3 Hz shimmer, both
    // seeded by the point's phase. Density modulates speed (busier =
    // more apparent activity).
    float slow = 0.18 * sin(uTime * 0.45 + aPhase * 6.2831853);
    float fast = 0.22 * sin(uTime * (2.05 + aDensity * 1.3) + aPhase * 12.566370);
    float shimmer = mix(1.0, 0.86 + slow + fast, uTwinkle);

    // Spatial interaction: brighten near the user's last touch.
    float arc = acos(clamp(dot(surface, normalize(uInteractionPoint)), -1.0, 1.0));
    float interactionGaussian = exp(-pow(arc / max(uInteractionRadius, 0.001), 2.0));
    float interactionDecay = exp(-uInteractionAge * 0.85);
    float interaction = interactionGaussian * interactionDecay * 0.55
                      + uInteractionEnergy * 0.18;

    // Sprite size: perspective scale + camera distance scale + density.
    float perspectiveScale = 520.0 / max(-mvPosition.z, 0.001);
    float cameraScale = mix(1.0, clamp(uCameraDistance / 2.35, 0.72, 1.45), uCameraInfluence);
    float sizeBoost = 0.78 + densityCurve * 0.22 + interaction * 0.18;
    gl_PointSize = max(0.72, uSize * aSize * perspectiveScale * cameraScale * sizeBoost);

    // Colour: Planckian-locus blend modulated by per-point temperature,
    // tinted by the user's chosen uColor so themes still apply, and
    // pushed warm at the terminator (Mie-like forward scatter).
    vec3 kelvin = mix(uKelvinWarm, uKelvinCool, aTemperature);
    vec3 baseColor = uColor * kelvin;
    vec3 twiBoost = vec3(1.0, 0.62, 0.34) * tb.warmShift * 0.42;
    vec3 horizonBoost = vec3(1.0, 0.78, 0.46) * horizon * 0.16 * uHorizonGlow;
    vec3 interactionBoost = vec3(1.0, 0.78, 0.42) * interaction * 0.42;
    vColor = baseColor + twiBoost + horizonBoost + interactionBoost;

    vAlpha = min(2.6, uIntensity * aIntensity * lightReactive * densityBoost
                 * shimmer * extinction);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float dist = dot(uv, uv);
    if (dist > 1.0) discard;
    float core = smoothstep(0.28, 0.0, dist);
    float halo = smoothstep(1.0, 0.08, dist);
    float alpha = vAlpha * (core * 1.18 + halo * 0.42);
    vec3 color = vColor * (0.74 + core * 2.65 + halo * 0.40);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class CinematicCityLightsLayer {
  public readonly points: Points;
  private geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly uniforms: CinematicUniforms;
  private readonly defaultColor: string;
  private readonly defaultIntensity: number;
  private readonly defaultSize: number;
  private world: CinematicWorld | null = null;
  private data: CinematicPreparedData;
  private count: number;
  private intensity: number;
  private twinkle: boolean;

  public constructor(options: CinematicCityLightsLayerOptions) {
    this.defaultColor = options.color;
    this.defaultIntensity = options.intensity;
    this.defaultSize = options.size ?? DEFAULT_SIZE;
    this.count = Math.max(0, Math.floor(options.count ?? DEFAULT_COUNT));
    this.intensity = options.intensity;
    this.twinkle = options.twinkle ?? true;
    this.data = options.data;
    this.uniforms = createCinematicUniforms();

    this.geometry = buildGeometry(this.data, this.count);
    this.material = new ShaderMaterial({
      uniforms: {
        ...cloneCinematicUniforms(this.uniforms),
        uColor: { value: new Color(options.color) },
        uKelvinWarm: { value: new Color(KELVIN_WARM[0], KELVIN_WARM[1], KELVIN_WARM[2]) },
        uKelvinCool: { value: new Color(KELVIN_COOL[0], KELVIN_COOL[1], KELVIN_COOL[2]) },
        uSize: { value: this.defaultSize },
        uIntensity: { value: options.intensity },
        uTwinkle: { value: this.twinkle ? 1 : 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(this.geometry, this.material);
    this.points.name = 'CinematicCityLightsLayer';
    this.points.frustumCulled = false;
    this.points.renderOrder = 7;
  }

  public setWorld(world: CinematicWorld): void {
    this.world = world;
  }

  public update(_delta: number, elapsedSeconds: number): void {
    if (this.world) syncCinematicUniforms(this.uniforms, this.world.uniforms);
    this.uniforms.uTime.value = elapsedSeconds;
    for (const [key, uniform] of Object.entries(this.uniforms)) {
      if (this.material.uniforms[key]) this.material.uniforms[key]!.value = uniform.value;
    }
    this.material.uniforms['uIntensity']!.value = this.intensity;
    this.material.uniforms['uTwinkle']!.value = this.twinkle ? 1 : 0;
  }

  public setData(data: CinematicPreparedData): void {
    this.data = data;
    this.rebuildGeometry();
  }

  public setVisible(visible: boolean): void {
    this.points.visible = visible;
  }

  public setColor(color: string): void {
    (this.material.uniforms['uColor']!.value as Color).set(
      color === '' ? this.defaultColor : color,
    );
  }

  public setIntensity(value: number): void {
    this.intensity = value > 0 ? value : this.defaultIntensity;
    this.material.uniforms['uIntensity']!.value = this.intensity;
  }

  public setSize(value: number): void {
    this.material.uniforms['uSize']!.value = value > 0 ? value : this.defaultSize;
  }

  public setCount(value: number): void {
    const next = Math.max(0, Math.floor(value));
    if (next === this.count) return;
    this.count = next;
    this.rebuildGeometry();
  }

  public setTwinkle(enabled: boolean): void {
    this.twinkle = enabled;
    this.material.uniforms['uTwinkle']!.value = enabled ? 1 : 0;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private rebuildGeometry(): void {
    const previous = this.geometry;
    this.geometry = buildGeometry(this.data, this.count);
    this.points.geometry = this.geometry;
    previous.dispose();
  }
}

const buildGeometry = (data: CinematicPreparedData, count: number): BufferGeometry => {
  const source = data.cityPoints;
  const safeCount = Math.min(Math.max(0, Math.floor(count)), source.length);
  const positions = new Float32Array(safeCount * 3);
  const sizes = new Float32Array(safeCount);
  const phases = new Float32Array(safeCount);
  const intensities = new Float32Array(safeCount);
  const densities = new Float32Array(safeCount);
  const temperatures = new Float32Array(safeCount);
  for (let i = 0; i < safeCount; i++) {
    const point = source[i]!;
    const p = latLngToVector3([point.lat, point.lng], LIGHT_RADIUS);
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    const density = sampleDensity(
      data.density,
      data.densityWidth,
      data.densityHeight,
      point.lat,
      point.lng,
    );
    // Stable hash on the city id (or its synthetic counterpart) gives
    // each light its own twinkle phase; never `Math.random()`.
    const phase = stableHash01(point.id);
    sizes[i] = 0.55 + Math.min(1.55, point.importance * 0.45) + density * 0.48;
    phases[i] = phase;
    intensities[i] = 0.26 + Math.min(1.2, point.value) * 0.55 + density * 0.32;
    densities[i] = density;
    temperatures[i] = point.temperature;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  geometry.setAttribute('aIntensity', new Float32BufferAttribute(intensities, 1));
  geometry.setAttribute('aDensity', new Float32BufferAttribute(densities, 1));
  geometry.setAttribute('aTemperature', new Float32BufferAttribute(temperatures, 1));
  return geometry;
};
