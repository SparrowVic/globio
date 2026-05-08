import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import { CINEMATIC_CITY_NODES, hash01 } from './city-data';

export interface CinematicCityLightsLayerOptions {
  readonly color: string;
  readonly intensity: number;
  readonly count?: number;
  readonly size?: number;
  readonly twinkle?: boolean;
}

const DEFAULT_COUNT = 6200;
const DEFAULT_SIZE = 0.0058;
const LIGHT_RADIUS = GLOBE_RADIUS * 1.0075;

const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aIntensity;
  attribute vec3 aWarmth;
  uniform float uSize;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uTwinkle;
  uniform vec3 uColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float shimmer = mix(1.0, 0.78 + 0.22 * sin(uTime * 2.7 + aPhase * 6.2831853), uTwinkle);
    float perspectiveScale = 520.0 / max(-mvPosition.z, 0.001);
    gl_PointSize = max(1.15, uSize * aSize * perspectiveScale);
    vColor = uColor * aWarmth;
    vAlpha = uIntensity * aIntensity * shimmer * (0.88 + aSize * 0.08);
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
    float core = smoothstep(0.32, 0.0, dist);
    float halo = smoothstep(1.0, 0.08, dist);
    float alpha = vAlpha * (core * 1.08 + halo * 0.5);
    vec3 color = vColor * (0.82 + core * 2.15 + halo * 0.38);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class CinematicCityLightsLayer {
  public readonly points: Points;
  private geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly defaultColor: string;
  private readonly defaultIntensity: number;
  private readonly defaultSize: number;
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

    this.geometry = buildGeometry(this.count);
    this.material = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(options.color) },
        uSize: { value: this.defaultSize },
        uIntensity: { value: options.intensity },
        uTime: { value: 0 },
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

  public update(_delta: number, elapsedSeconds: number): void {
    this.material.uniforms['uTime']!.value = elapsedSeconds;
    this.material.uniforms['uIntensity']!.value = this.intensity;
    this.material.uniforms['uTwinkle']!.value = this.twinkle ? 1 : 0;
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
    const previous = this.geometry;
    this.geometry = buildGeometry(next);
    this.points.geometry = this.geometry;
    previous.dispose();
  }

  public setTwinkle(enabled: boolean): void {
    this.twinkle = enabled;
    this.material.uniforms['uTwinkle']!.value = enabled ? 1 : 0;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

const buildGeometry = (count: number): BufferGeometry => {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const intensities = new Float32Array(count);
  const warmth = new Float32Array(count * 3);
  const weights = totalWeight();
  for (let i = 0; i < count; i++) {
    const node = chooseNode(hash01(i * 7.13 + 3.1) * weights);
    const r1 = hash01(i * 11.77 + 0.4);
    const r2 = hash01(i * 19.31 + 2.9);
    const r3 = hash01(i * 23.61 + 7.4);
    const r4 = hash01(i * 29.27 + 1.8);
    const angle = r1 * Math.PI * 2;
    const distance = Math.pow(r2, 1.42) * node.spread * 1.85;
    const lat = clamp(node.lat + Math.cos(angle) * distance, -82, 82);
    const lngScale = Math.max(0.22, Math.cos((lat * Math.PI) / 180));
    const lng = node.lng + (Math.sin(angle) * distance) / lngScale;
    const p = latLngToVector3([lat, wrapLng(lng)], LIGHT_RADIUS);
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    sizes[i] = 0.52 + Math.pow(r3, 2.35) * 1.42 + Math.min(0.55, node.weight / 24);
    phases[i] = hash01(i * 31.11 + 4.2);
    intensities[i] = 0.24 + Math.pow(1 - r2, 1.55) * 0.42 + Math.pow(r4, 5.0) * 0.62;
    warmth[i * 3] = 0.9 + r4 * 0.25;
    warmth[i * 3 + 1] = 0.72 + r3 * 0.22;
    warmth[i * 3 + 2] = 0.34 + r1 * 0.16;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new Float32BufferAttribute(phases, 1));
  geometry.setAttribute('aIntensity', new Float32BufferAttribute(intensities, 1));
  geometry.setAttribute('aWarmth', new Float32BufferAttribute(warmth, 3));
  return geometry;
};

const totalWeight = (): number =>
  CINEMATIC_CITY_NODES.reduce((sum, node) => sum + node.weight, 0);

const chooseNode = (target: number) => {
  let cursor = 0;
  for (const node of CINEMATIC_CITY_NODES) {
    cursor += node.weight;
    if (target <= cursor) return node;
  }
  return CINEMATIC_CITY_NODES[CINEMATIC_CITY_NODES.length - 1]!;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const wrapLng = (lng: number): number => ((lng + 540) % 360) - 180;
