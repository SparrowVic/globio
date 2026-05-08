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

export interface CinematicCityLightsLayerOptions {
  readonly color: string;
  readonly intensity: number;
  readonly count?: number;
  readonly size?: number;
  readonly twinkle?: boolean;
  readonly data: CinematicPreparedData;
}

const DEFAULT_COUNT = 6200;
const DEFAULT_SIZE = 0.0058;
const LIGHT_RADIUS = GLOBE_RADIUS * 1.0075;

const VERTEX_SHADER = /* glsl */ `
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
  uniform vec3 uColor;
  uniform vec3 uLightDirection;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;
    vec3 normal = normalize(mat3(modelMatrix) * normalize(position));
    vec3 viewDir = normalize(cameraPosition - worldPosition.xyz);
    float light = dot(normal, normalize(uLightDirection));
    float day = smoothstep(-0.32, 0.42, light);
    float twilight = exp(-pow(light / 0.34, 2.0));
    float horizon = 1.0 - smoothstep(0.02, 0.42, max(dot(normal, viewDir), 0.0));
    float nightReactive = mix(1.0, (1.0 - day) * uCityNightResponse + twilight * 0.86 * uTerminatorBoost + horizon * 0.18 * uHorizonGlow, uLightInfluence);
    float densityBoost = mix(1.0, 0.68 + aDensity * 0.74, uDensityInfluence);
    float shimmer = mix(1.0, 0.8 + 0.2 * sin(uTime * (2.2 + aDensity * 1.4) + aPhase * 6.2831853), uTwinkle);
    float perspectiveScale = 520.0 / max(-mvPosition.z, 0.001);
    float cameraScale = mix(1.0, clamp(uCameraDistance / 2.35, 0.72, 1.45), uCameraInfluence);
    gl_PointSize = max(0.72, uSize * aSize * perspectiveScale * cameraScale * (0.78 + aDensity * 0.18));
    vec3 warm = mix(vec3(1.0, 0.56, 0.22), vec3(1.0, 0.82, 0.46), aTemperature);
    vColor = uColor * warm * (0.82 + twilight * 0.32 + horizon * 0.12 * uHorizonGlow);
    vAlpha = min(2.4, uIntensity * aIntensity * nightReactive * densityBoost * shimmer);
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
    float alpha = vAlpha * (core * 1.16 + halo * 0.46);
    vec3 color = vColor * (0.72 + core * 2.55 + halo * 0.42);
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
      this.material.uniforms[key]!.value = uniform.value;
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
    const density = sampleDensity(data, point.lat, point.lng);
    sizes[i] = 0.55 + Math.min(1.55, point.importance * 0.45) + density * 0.48;
    phases[i] = (i * 0.61803398875) % 1;
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

const sampleDensity = (data: CinematicPreparedData, lat: number, lng: number): number => {
  const x = Math.floor(((lng + 180) / 360) * data.densityWidth);
  const y = Math.floor(((90 - lat) / 180) * data.densityHeight);
  return data.density[
    Math.max(0, Math.min(data.densityHeight - 1, y)) * data.densityWidth +
      ((x + data.densityWidth) % data.densityWidth)
  ] ?? 0;
};
