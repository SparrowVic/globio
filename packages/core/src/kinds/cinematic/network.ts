import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  ShaderMaterial,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { LatLng } from '../../types';
import type { CinematicWorld } from './engine';
import type { CinematicPreparedData, CinematicRoute } from './data';
import {
  cloneCinematicUniforms,
  createCinematicUniforms,
  syncCinematicUniforms,
  type CinematicUniforms,
} from './shader-uniforms';

export interface CinematicSurfaceNetworkLayerOptions {
  readonly color: string;
  readonly opacity: number;
  readonly maxConnections?: number;
  readonly pulseSpeed?: number;
  readonly data: CinematicPreparedData;
}

const NETWORK_RADIUS = GLOBE_RADIUS * 1.0105;
const DEFAULT_CONNECTIONS = 44;
const PATH_SAMPLES = 22;

const VERTEX_SHADER = /* glsl */ `
  attribute vec3 aPrev;
  attribute vec3 aNext;
  attribute float aSide;
  attribute float aT;
  attribute float aRouteValue;
  attribute float aDensity;
  uniform float uWidth;
  uniform float uOpacity;
  uniform float uCameraDistance;
  uniform float uCameraInfluence;
  uniform vec3 uLightDirection;
  varying float vT;
  varying float vSide;
  varying float vRouteValue;
  varying float vDensity;
  varying float vLight;
  varying float vHorizon;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec4 worldPrev = modelMatrix * vec4(aPrev, 1.0);
    vec4 worldNext = modelMatrix * vec4(aNext, 1.0);
    vec4 mvPos = viewMatrix * worldPos;
    vec4 mvPrev = viewMatrix * worldPrev;
    vec4 mvNext = viewMatrix * worldNext;
    vec2 tangent = normalize(mvNext.xy - mvPrev.xy + vec2(0.00001));
    vec2 normal2 = vec2(-tangent.y, tangent.x);
    float cameraScale = mix(1.0, clamp(uCameraDistance / 2.4, 0.82, 1.55), uCameraInfluence);
    float width = uWidth * (0.0016 + aRouteValue * 0.0007) * cameraScale;
    mvPos.xy += normal2 * aSide * width;
    vec3 normal = normalize(worldPos.xyz);
    vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
    vT = aT;
    vSide = aSide;
    vRouteValue = aRouteValue;
    vDensity = aDensity;
    vLight = dot(normal, normalize(uLightDirection));
    vHorizon = 1.0 - smoothstep(0.03, 0.45, max(dot(normal, viewDir), 0.0));
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uPulseSpeed;
  uniform float uLightInfluence;
  uniform float uDensityInfluence;
  uniform float uTerminatorBoost;
  uniform float uInteractionEnergy;
  uniform float uOrbitalFlow;
  varying float vT;
  varying float vSide;
  varying float vRouteValue;
  varying float vDensity;
  varying float vLight;
  varying float vHorizon;

  void main() {
    float edge = smoothstep(1.0, 0.18, abs(vSide));
    float endpoint = smoothstep(0.0, 0.16, vT) * smoothstep(0.0, 0.16, 1.0 - vT);
    float day = smoothstep(-0.32, 0.36, vLight);
    float twilight = exp(-pow(vLight / 0.34, 2.0));
    float nightReactive = mix(1.0, (1.0 - day) * 0.72 + twilight * 0.95 * uTerminatorBoost + vHorizon * 0.22, uLightInfluence);
    float density = mix(1.0, 0.68 + vDensity * 0.92, uDensityInfluence);
    float pulse = fract(vT * 1.8 - uTime * uPulseSpeed * uOrbitalFlow * (0.38 + vRouteValue * 0.2));
    float packet = smoothstep(0.94, 1.0, pulse) * smoothstep(0.0, 0.12, pulse);
    float alpha = uOpacity * edge * endpoint * nightReactive * density * (0.42 + packet * 1.35 + vRouteValue * 0.18);
    alpha += uOpacity * edge * endpoint * uInteractionEnergy * 0.22;
    vec3 color = uColor * (0.72 + twilight * 0.42 + packet * 1.8 + vDensity * 0.28);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class CinematicSurfaceNetworkLayer {
  public readonly mesh: Mesh;
  /** Compatibility alias for the previous layer contract. */
  public readonly lines: Mesh;
  private geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly uniforms: CinematicUniforms;
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;
  private world: CinematicWorld | null = null;
  private data: CinematicPreparedData;
  private maxConnections: number;
  private pulseSpeed: number;
  private opacity: number;

  public constructor(options: CinematicSurfaceNetworkLayerOptions) {
    this.defaultColor = options.color;
    this.defaultOpacity = options.opacity;
    this.opacity = options.opacity;
    this.maxConnections = Math.max(0, Math.floor(options.maxConnections ?? DEFAULT_CONNECTIONS));
    this.pulseSpeed = options.pulseSpeed ?? 0.32;
    this.data = options.data;
    this.uniforms = createCinematicUniforms();
    this.geometry = buildGeometry(this.data, this.maxConnections);
    this.material = new ShaderMaterial({
      uniforms: {
        ...cloneCinematicUniforms(this.uniforms),
        uColor: { value: new Color(options.color) },
        uOpacity: { value: options.opacity },
        uWidth: { value: 1 },
        uPulseSpeed: { value: this.pulseSpeed },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'CinematicSurfaceNetworkLayer';
    this.mesh.renderOrder = 6;
    this.lines = this.mesh;
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
    this.material.uniforms['uOpacity']!.value = this.opacity;
    this.material.uniforms['uPulseSpeed']!.value = this.pulseSpeed;
  }

  public setData(data: CinematicPreparedData): void {
    this.data = data;
    this.rebuildGeometry();
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public setColor(color: string): void {
    this.material.uniforms['uColor']!.value.set(color === '' ? this.defaultColor : color);
  }

  public setOpacity(opacity: number): void {
    this.opacity = opacity >= 0 ? opacity : this.defaultOpacity;
    this.material.uniforms['uOpacity']!.value = this.opacity;
  }

  public setMaxConnections(count: number): void {
    const next = Math.max(0, Math.floor(count));
    if (next === this.maxConnections) return;
    this.maxConnections = next;
    this.rebuildGeometry();
  }

  public setPulseSpeed(speed: number): void {
    this.pulseSpeed = speed > 0 ? speed : 0.32;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  private rebuildGeometry(): void {
    const previous = this.geometry;
    this.geometry = buildGeometry(this.data, this.maxConnections);
    this.mesh.geometry = this.geometry;
    previous.dispose();
  }
}

const buildGeometry = (data: CinematicPreparedData, maxConnections: number): BufferGeometry => {
  const routes = data.routes.slice(0, maxConnections);
  const vertexCount = routes.length * PATH_SAMPLES * 2;
  const positions = new Float32Array(vertexCount * 3);
  const prev = new Float32Array(vertexCount * 3);
  const next = new Float32Array(vertexCount * 3);
  const side = new Float32Array(vertexCount);
  const tAttr = new Float32Array(vertexCount);
  const routeValue = new Float32Array(vertexCount);
  const density = new Float32Array(vertexCount);
  const indices: number[] = [];
  let cursor = 0;
  for (const route of routes) {
    const samples = sampleSurfacePath(route);
    for (let i = 0; i < samples.length; i++) {
      const current = samples[i]!;
      const previous = samples[Math.max(0, i - 1)]!;
      const following = samples[Math.min(samples.length - 1, i + 1)]!;
      const t = i / (samples.length - 1);
      for (let s = 0; s < 2; s++) {
        const idx = cursor + s;
        positions[idx * 3] = current.x;
        positions[idx * 3 + 1] = current.y;
        positions[idx * 3 + 2] = current.z;
        prev[idx * 3] = previous.x;
        prev[idx * 3 + 1] = previous.y;
        prev[idx * 3 + 2] = previous.z;
        next[idx * 3] = following.x;
        next[idx * 3 + 1] = following.y;
        next[idx * 3 + 2] = following.z;
        side[idx] = s === 0 ? -1 : 1;
        tAttr[idx] = t;
        routeValue[idx] = Math.min(1.8, route.width);
        const ll = interpolateLatLng(route.from, route.to, t);
        density[idx] = sampleDensity(data, ll[0], ll[1]);
      }
      cursor += 2;
    }
    const start = cursor - samples.length * 2;
    for (let i = 0; i < samples.length - 1; i++) {
      const a = start + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aPrev', new Float32BufferAttribute(prev, 3));
  geometry.setAttribute('aNext', new Float32BufferAttribute(next, 3));
  geometry.setAttribute('aSide', new Float32BufferAttribute(side, 1));
  geometry.setAttribute('aT', new Float32BufferAttribute(tAttr, 1));
  geometry.setAttribute('aRouteValue', new Float32BufferAttribute(routeValue, 1));
  geometry.setAttribute('aDensity', new Float32BufferAttribute(density, 1));
  geometry.setIndex(new BufferAttribute(new Uint16Array(indices), 1));
  return geometry;
};

const sampleSurfacePath = (route: CinematicRoute): Vector3[] => {
  const fromVec = latLngToVector3(route.from, 1);
  const toVec = latLngToVector3(route.to, 1);
  const angle = fromVec.angleTo(toVec);
  const sinAngle = Math.sin(angle);
  const points: Vector3[] = [];
  for (let i = 0; i < PATH_SAMPLES; i++) {
    const t = i / (PATH_SAMPLES - 1);
    let point: Vector3;
    if (sinAngle < 1e-6) {
      point = fromVec.clone();
    } else {
      const a = Math.sin((1 - t) * angle) / sinAngle;
      const b = Math.sin(t * angle) / sinAngle;
      point = new Vector3(
        fromVec.x * a + toVec.x * b,
        fromVec.y * a + toVec.y * b,
        fromVec.z * a + toVec.z * b,
      );
    }
    points.push(point.normalize().multiplyScalar(NETWORK_RADIUS + route.height));
  }
  return points;
};

const interpolateLatLng = (from: LatLng, to: LatLng, t: number): LatLng => [
  from[0] + (to[0] - from[0]) * t,
  from[1] + (to[1] - from[1]) * t,
];

const sampleDensity = (data: CinematicPreparedData, lat: number, lng: number): number => {
  const x = Math.floor(((lng + 180) / 360) * data.densityWidth);
  const y = Math.floor(((90 - lat) / 180) * data.densityHeight);
  return data.density[
    Math.max(0, Math.min(data.densityHeight - 1, y)) * data.densityWidth +
      ((x + data.densityWidth) % data.densityWidth)
  ] ?? 0;
};
