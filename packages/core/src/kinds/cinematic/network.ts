// Cinematic surface network — ribbon graph laid on the planet's skin.
//
// Each route is sampled along its great circle into N points; every
// pair of consecutive points becomes a quad with side attribute ±1 so
// the vertex shader can extrude perpendicular to the in-screen tangent
// for a constant pixel-width ribbon.
//
// What actually makes the network read as "cinematic" rather than
// "wireframe":
//
//   * Density-coupled width: ribbon width tracks the per-vertex density
//     atlas sample, so the same network looks busier through hubs and
//     thinner over open ocean.
//
//   * Directional flow: the per-route phase + per-vertex density delta
//     biases the moving tracer in one direction, so a route from a
//     dense hub to a sparse outpost flows outward, never inward, with
//     the same magnitude on both sides of the link.
//
//   * Back-hemisphere extinction: the ribbon would otherwise punch
//     through the back of the globe via additive blending. We fade
//     opacity exponentially as the surface normal turns away from the
//     camera, so the network respects the sphere even without depth.
//
//   * Terminator gating: routes glow strongest on the night side,
//     soften on the day side, and pop at the terminator — same physics
//     as city lights so the planet reads as a single coherent system.

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
import { GLSL_TERMINATOR, sampleDensity, stableHash01 } from './math';

export interface CinematicSurfaceNetworkLayerOptions {
  readonly color: string;
  readonly opacity: number;
  readonly maxConnections?: number;
  readonly pulseSpeed?: number;
  readonly data: CinematicPreparedData;
}

const NETWORK_RADIUS = GLOBE_RADIUS * 1.0105;
const DEFAULT_CONNECTIONS = 44;
const PATH_SAMPLES = 24;

const VERTEX_SHADER = /* glsl */ `
  precision mediump float;
  ${GLSL_TERMINATOR}

  attribute vec3 aPrev;
  attribute vec3 aNext;
  attribute float aSide;
  attribute float aT;
  attribute float aRouteValue;
  attribute float aDensity;
  attribute float aRoutePhase;
  attribute float aFlowDir;          // +1 or -1; direction-of-flow bias

  uniform float uWidth;
  uniform float uOpacity;
  uniform float uCameraDistance;
  uniform float uCameraInfluence;
  uniform float uDensityInfluence;
  uniform vec3  uLightDirection;
  uniform float uTerminatorSoftness;
  uniform float uTerminatorContrast;

  varying float vT;
  varying float vSide;
  varying float vRouteValue;
  varying float vDensity;
  varying float vDay;
  varying float vNight;
  varying float vTwilight;
  varying float vWarmShift;
  varying float vHorizon;
  varying float vRoutePhase;
  varying float vFlowDir;

  void main() {
    vec4 worldPos  = modelMatrix * vec4(position, 1.0);
    vec4 worldPrev = modelMatrix * vec4(aPrev, 1.0);
    vec4 worldNext = modelMatrix * vec4(aNext, 1.0);
    vec4 mvPos  = viewMatrix * worldPos;
    vec4 mvPrev = viewMatrix * worldPrev;
    vec4 mvNext = viewMatrix * worldNext;
    vec2 tangent = normalize(mvNext.xy - mvPrev.xy + vec2(0.00001));
    vec2 normal2 = vec2(-tangent.y, tangent.x);

    float cameraScale = mix(1.0, clamp(uCameraDistance / 2.4, 0.82, 1.55), uCameraInfluence);
    // Density-coupled width: thicker through hubs, thinner over empty
    // regions. Coefficient choice keeps the geometry visually similar
    // to the previous layer at the global average density of ~0.3.
    float densityWidth = mix(1.0, 0.62 + aDensity * 1.05, uDensityInfluence);
    float width = uWidth * (0.0014 + aRouteValue * 0.00078) * cameraScale * densityWidth;
    mvPos.xy += normal2 * aSide * width;

    vec3 normal = normalize(worldPos.xyz);
    vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
    cn_TerminatorBands tb = cn_terminator(normal, normalize(uLightDirection),
                                          uTerminatorSoftness, uTerminatorContrast);

    vT = aT;
    vSide = aSide;
    vRouteValue = aRouteValue;
    vDensity = aDensity;
    vDay = tb.day;
    vNight = tb.night;
    vTwilight = tb.twilight;
    vWarmShift = tb.warmShift;
    vHorizon = 1.0 - smoothstep(0.03, 0.45, max(dot(normal, viewDir), 0.0));
    vRoutePhase = aRoutePhase;
    vFlowDir = aFlowDir;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  uniform vec3  uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uPulseSpeed;
  uniform float uLightInfluence;
  uniform float uDensityInfluence;
  uniform float uTerminatorBoost;
  uniform float uHorizonGlow;
  uniform float uInteractionEnergy;
  uniform float uOrbitalFlow;

  varying float vT;
  varying float vSide;
  varying float vRouteValue;
  varying float vDensity;
  varying float vDay;
  varying float vNight;
  varying float vTwilight;
  varying float vWarmShift;
  varying float vHorizon;
  varying float vRoutePhase;
  varying float vFlowDir;

  void main() {
    float edge = smoothstep(1.0, 0.18, abs(vSide));
    float endpoint = smoothstep(0.0, 0.16, vT) * smoothstep(0.0, 0.16, 1.0 - vT);

    // Multi-band reactivity: night strong, twilight strongest, day soft,
    // limb glow on top.
    float lit = vNight * 0.62
              + vTwilight * 0.95 * uTerminatorBoost
              + vHorizon * 0.24 * uHorizonGlow
              + vDay * 0.18;
    float lightReactive = mix(1.0, lit, uLightInfluence);

    // Density modulation: through busy regions, alpha lifts; over empty
    // ocean it stays subtle. Multiplicative so the per-vertex width
    // boost compounds, never sums above 1.
    float density = mix(1.0, 0.66 + vDensity * 0.92, uDensityInfluence);

    // Back-hemisphere extinction: as the surface tilts away from the
    // camera the ribbon should fade. With additive blending we cannot
    // just rely on depth; vHorizon already encodes 1-ndv at the limb
    // and we explicitly square it so back-hemisphere fragments die fast.
    float facing = 1.0 - clamp(vHorizon * 1.45, 0.0, 1.0);
    float extinction = mix(0.32, 1.0, smoothstep(0.0, 0.4, facing));

    // Directional flow: aFlowDir baked at geometry-build time tells us
    // which way the route should flow (+1 means "forward along aT").
    // The packet width is tighter and brighter than the previous
    // implementation so it reads as a moving data tracer, not a glow.
    float dir = sign(vFlowDir + 0.001);
    float flow = fract(vT * dir
                       - uTime * uPulseSpeed * uOrbitalFlow * (0.36 + vRouteValue * 0.22)
                       + vRoutePhase);
    float packet = exp(-pow((min(flow, 1.0 - flow)) / 0.034, 2.0));    // gaussian tracer
    float wake   = exp(-pow((min(flow, 1.0 - flow)) / 0.18, 2.0)) * 0.34;

    float alpha = uOpacity * edge * endpoint * lightReactive * density * extinction
                * (0.38 + packet * 1.35 + wake + vRouteValue * 0.16);
    alpha += uOpacity * edge * endpoint * uInteractionEnergy * 0.22;

    vec3 base = uColor * (0.74 + vTwilight * 0.42 + vDensity * 0.28);
    vec3 hot  = vec3(1.0, 0.78, 0.42) * (packet * 1.6 + wake * 0.4 + vWarmShift * 0.32);
    vec3 color = base + hot;
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
      if (this.material.uniforms[key]) this.material.uniforms[key]!.value = uniform.value;
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
  const phaseAttr = new Float32Array(vertexCount);
  const flowDirAttr = new Float32Array(vertexCount);
  const indices: number[] = [];
  let cursor = 0;
  for (const route of routes) {
    const samples = sampleSurfacePath(route);
    const phase = stableHash01(`${route.id}:flow`);
    // Direction of flow: +1 if we should go from `from` to `to`, -1
    // otherwise. The bias points away from the denser endpoint into
    // the sparser one — that produces the "hub→spoke" reading without
    // any global mutual ordering.
    const fromDensity = sampleDensity(
      data.density, data.densityWidth, data.densityHeight,
      route.from[0], route.from[1],
    );
    const toDensity = sampleDensity(
      data.density, data.densityWidth, data.densityHeight,
      route.to[0], route.to[1],
    );
    const flowDir = fromDensity >= toDensity ? 1 : -1;

    for (let i = 0; i < samples.length; i++) {
      const current = samples[i]!;
      const previous = samples[Math.max(0, i - 1)]!;
      const following = samples[Math.min(samples.length - 1, i + 1)]!;
      const t = i / (samples.length - 1);
      const ll = interpolateLatLng(route.from, route.to, t);
      const localDensity = sampleDensity(
        data.density, data.densityWidth, data.densityHeight, ll[0], ll[1],
      );
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
        density[idx] = localDensity;
        phaseAttr[idx] = phase;
        flowDirAttr[idx] = flowDir;
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
  geometry.setAttribute('aRoutePhase', new Float32BufferAttribute(phaseAttr, 1));
  geometry.setAttribute('aFlowDir', new Float32BufferAttribute(flowDirAttr, 1));
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
