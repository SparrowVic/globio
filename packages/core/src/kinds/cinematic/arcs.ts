import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { ArcConfig, LatLng } from '../../types';
import { angularDistance, stableHash01 } from './math';
import type { CinematicWorld } from './engine';
import {
  cloneCinematicUniforms,
  createCinematicUniforms,
  syncCinematicUniforms,
  type CinematicUniforms,
} from './shader-uniforms';

export interface CinematicArcsLayerOptions {
  readonly defaultColor: string;
  readonly defaultWidth: number;
  readonly defaultOpacity: number;
  readonly headColor: string;
  readonly headSize: number;
  readonly resolution?: Vector2;
}

interface ArcEntry {
  readonly config: ArcConfig;
  readonly core: Mesh;
  readonly coreMaterial: ShaderMaterial;
  readonly glow: Mesh;
  readonly glowMaterial: ShaderMaterial;
  readonly contactA: Mesh;
  readonly contactB: Mesh;
  readonly contactMaterialA: MeshBasicMaterial;
  readonly contactMaterialB: MeshBasicMaterial;
  readonly geometry: BufferGeometry;
  readonly phase: number;
}

const SAMPLES = 92;
const ARC_RADIUS = GLOBE_RADIUS * 1.012;

const VERTEX_SHADER = /* glsl */ `
  attribute vec3 aPrev;
  attribute vec3 aNext;
  attribute float aSide;
  attribute float aT;
  attribute float aEndpoint;
  attribute float aRouteValue;
  uniform float uWidth;
  uniform float uCameraDistance;
  uniform float uCameraInfluence;
  uniform vec3 uLightDirection;
  varying float vT;
  varying float vSide;
  varying float vEndpoint;
  varying float vRouteValue;
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
    float cameraScale = mix(1.0, clamp(uCameraDistance / 2.5, 0.78, 1.6), uCameraInfluence);
    float taper = 0.22 + aEndpoint * 0.9;
    float width = uWidth * (0.0022 + aRouteValue * 0.0007) * cameraScale * taper;
    mvPos.xy += normal2 * aSide * width;
    vec3 normal = normalize(worldPos.xyz);
    vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
    vT = aT;
    vSide = aSide;
    vEndpoint = aEndpoint;
    vRouteValue = aRouteValue;
    vLight = dot(normal, normalize(uLightDirection));
    vHorizon = 1.0 - smoothstep(0.04, 0.48, max(dot(normal, viewDir), 0.0));
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uPhase;
  uniform float uGlow;
  uniform float uLightInfluence;
  uniform float uDensityInfluence;
  uniform float uTerminatorBoost;
  uniform float uInteractionEnergy;
  uniform float uOrbitalFlow;
  varying float vT;
  varying float vSide;
  varying float vEndpoint;
  varying float vRouteValue;
  varying float vLight;
  varying float vHorizon;

  float gaussian(float x, float width) {
    return exp(-pow(x / width, 2.0));
  }

  void main() {
    float edge = smoothstep(1.0, 0.12, abs(vSide));
    float day = smoothstep(-0.3, 0.42, vLight);
    float twilight = exp(-pow(vLight / 0.36, 2.0));
    float lightReactive = mix(1.0, (1.0 - day) * 0.52 + twilight * 0.95 * uTerminatorBoost + vHorizon * 0.28, uLightInfluence);
    float density = mix(1.0, 0.82 + vRouteValue * 0.16, uDensityInfluence);
    float flow = fract(vT - uTime * (0.12 + vRouteValue * 0.025) * uOrbitalFlow - uPhase);
    float tracer = gaussian(min(flow, 1.0 - flow), 0.035 + uGlow * 0.018);
    float wake = gaussian(min(fract(flow + 0.085), 1.0 - fract(flow + 0.085)), 0.075);
    float alpha = uOpacity * edge * vEndpoint * lightReactive * density;
    alpha *= mix(0.56, 0.24, uGlow) + tracer * (1.45 - uGlow * 0.45) + wake * 0.42;
    alpha += uOpacity * edge * vEndpoint * uInteractionEnergy * 0.12;
    vec3 color = uColor * (0.72 + twilight * 0.46 + tracer * 1.7 + vHorizon * 0.18);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class CinematicArcsLayer {
  public readonly group: Group;
  private readonly defaultColor: string;
  private readonly defaultWidth: number;
  private readonly defaultOpacity: number;
  private readonly headSize: number;
  private readonly entries = new Map<string, ArcEntry>();
  private readonly uniforms: CinematicUniforms;
  private world: CinematicWorld | null = null;

  public constructor(options: CinematicArcsLayerOptions) {
    this.group = new Group();
    this.group.name = 'CinematicArcsLayer';
    this.defaultColor = options.defaultColor;
    this.defaultWidth = options.defaultWidth;
    this.defaultOpacity = options.defaultOpacity;
    this.headSize = options.headSize;
    this.uniforms = createCinematicUniforms();
  }

  public setWorld(world: CinematicWorld): void {
    this.world = world;
  }

  public setResolution(_width: number, _height: number): void {
    // Screen-space ribbon widths are derived from camera distance in-shader.
  }

  public setArcs(arcs: ReadonlyArray<ArcConfig>): void {
    const incomingIds = new Set(arcs.map((arc) => arc.id));
    for (const id of [...this.entries.keys()]) {
      if (!incomingIds.has(id)) this.removeArc(id);
    }
    arcs.forEach((arc) => {
      this.removeArc(arc.id);
      this.addArc(arc);
    });
  }

  public addArc(config: ArcConfig): void {
    if (this.entries.has(config.id)) this.removeArc(config.id);
    const heightValue = resolveHeight(config);
    const routeValue = Math.max(0.2, Math.min(2.4, (config.width ?? this.defaultWidth) / 1.2));
    const geometry = buildArcGeometry(config.from, config.to, heightValue, routeValue);
    const color = new Color(config.color ?? this.defaultColor);
    const phase = stableHash01(config.id);
    const width = config.width ?? this.defaultWidth;
    const coreMaterial = this.buildMaterial(color, width, this.defaultOpacity * 0.72, phase, 0);
    const glowMaterial = this.buildMaterial(color, width * 3.8, this.defaultOpacity * 0.16, phase, 1);
    const glow = new Mesh(geometry, glowMaterial);
    glow.renderOrder = 7;
    this.group.add(glow);
    const core = new Mesh(geometry, coreMaterial);
    core.renderOrder = 9;
    this.group.add(core);

    const contactGeometry = new SphereGeometry(this.headSize * 1.45, 18, 18);
    const contactMaterialA = buildContactMaterial(color);
    const contactMaterialB = buildContactMaterial(color);
    const contactA = new Mesh(contactGeometry, contactMaterialA);
    const contactB = new Mesh(contactGeometry.clone(), contactMaterialB);
    contactA.position.copy(latLngToVector3(config.from, GLOBE_RADIUS * 1.014));
    contactB.position.copy(latLngToVector3(config.to, GLOBE_RADIUS * 1.014));
    contactA.renderOrder = 10;
    contactB.renderOrder = 10;
    this.group.add(contactA, contactB);

    this.entries.set(config.id, {
      config,
      core,
      coreMaterial,
      glow,
      glowMaterial,
      contactA,
      contactB,
      contactMaterialA,
      contactMaterialB,
      geometry,
      phase,
    });
  }

  public removeArc(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.group.remove(entry.core, entry.glow, entry.contactA, entry.contactB);
    entry.geometry.dispose();
    entry.coreMaterial.dispose();
    entry.glowMaterial.dispose();
    entry.contactA.geometry.dispose();
    entry.contactB.geometry.dispose();
    entry.contactMaterialA.dispose();
    entry.contactMaterialB.dispose();
    this.entries.delete(id);
  }

  public update(elapsedSeconds: number): void {
    if (this.world) syncCinematicUniforms(this.uniforms, this.world.uniforms);
    this.uniforms.uTime.value = elapsedSeconds;
    this.entries.forEach((entry) => {
      syncMaterialUniforms(entry.coreMaterial, this.uniforms);
      syncMaterialUniforms(entry.glowMaterial, this.uniforms);
      const endpointPulse = 0.58 + 0.42 * Math.sin(elapsedSeconds * 2.1 + entry.phase * 6.2831853);
      entry.contactMaterialA.opacity = this.defaultOpacity * 0.34 * endpointPulse;
      entry.contactMaterialB.opacity = this.defaultOpacity * 0.34 * (1.1 - endpointPulse * 0.35);
      const scale = 0.82 + endpointPulse * 0.32;
      entry.contactA.scale.setScalar(scale);
      entry.contactB.scale.setScalar(1.08 - (scale - 0.82) * 0.28);
    });
  }

  public dispose(): void {
    [...this.entries.keys()].forEach((id) => this.removeArc(id));
    this.group.clear();
  }

  private buildMaterial(
    color: Color,
    width: number,
    opacity: number,
    phase: number,
    glow: number,
  ): ShaderMaterial {
    return new ShaderMaterial({
      uniforms: {
        ...cloneCinematicUniforms(this.uniforms),
        uColor: { value: color.clone() },
        uWidth: { value: Math.max(0.2, width) },
        uOpacity: { value: opacity },
        uPhase: { value: phase },
        uGlow: { value: glow },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }
}

const buildArcGeometry = (
  from: LatLng,
  to: LatLng,
  height: number,
  routeValue: number,
): BufferGeometry => {
  const samples = sampleArc(from, to, height);
  const vertexCount = samples.length * 2;
  const positions = new Float32Array(vertexCount * 3);
  const prev = new Float32Array(vertexCount * 3);
  const next = new Float32Array(vertexCount * 3);
  const side = new Float32Array(vertexCount);
  const tAttr = new Float32Array(vertexCount);
  const endpoint = new Float32Array(vertexCount);
  const value = new Float32Array(vertexCount);
  const indices: number[] = [];
  let cursor = 0;
  for (let i = 0; i < samples.length; i++) {
    const current = samples[i]!;
    const previous = samples[Math.max(0, i - 1)]!;
    const following = samples[Math.min(samples.length - 1, i + 1)]!;
    const t = i / (samples.length - 1);
    const endpointFade = smoothEndpoint(t);
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
      endpoint[idx] = endpointFade;
      value[idx] = routeValue;
    }
    cursor += 2;
  }
  for (let i = 0; i < samples.length - 1; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aPrev', new Float32BufferAttribute(prev, 3));
  geometry.setAttribute('aNext', new Float32BufferAttribute(next, 3));
  geometry.setAttribute('aSide', new Float32BufferAttribute(side, 1));
  geometry.setAttribute('aT', new Float32BufferAttribute(tAttr, 1));
  geometry.setAttribute('aEndpoint', new Float32BufferAttribute(endpoint, 1));
  geometry.setAttribute('aRouteValue', new Float32BufferAttribute(value, 1));
  geometry.setIndex(new BufferAttribute(new Uint16Array(indices), 1));
  return geometry;
};

const sampleArc = (from: LatLng, to: LatLng, height: number): Vector3[] => {
  const fromVec = latLngToVector3(from, 1);
  const toVec = latLngToVector3(to, 1);
  const angle = fromVec.angleTo(toVec);
  const sinAngle = Math.sin(angle);
  const points: Vector3[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1);
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
    const lift = Math.sin(Math.PI * t) * height;
    points.push(point.normalize().multiplyScalar(ARC_RADIUS + lift));
  }
  return points;
};

const resolveHeight = (config: ArcConfig): number => {
  if (config.height === 'auto') {
    const angle = angularDistance(config.from, config.to);
    const min = config.minHeight ?? 0.18;
    const max = config.maxHeight ?? 0.68;
    return min + (max - min) * (angle / Math.PI);
  }
  return config.height ?? 0.46;
};

const smoothEndpoint = (t: number): number => {
  const a = smoothstep(0, 0.24, t);
  const b = smoothstep(0, 0.24, 1 - t);
  return a * b;
};

const smoothstep = (edge0: number, edge1: number, value: number): number => {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const buildContactMaterial = (color: Color): MeshBasicMaterial =>
  new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: AdditiveBlending,
  });

const syncMaterialUniforms = (
  material: ShaderMaterial,
  uniforms: CinematicUniforms,
): void => {
  for (const [key, uniform] of Object.entries(uniforms)) {
    material.uniforms[key]!.value = uniform.value;
  }
};
