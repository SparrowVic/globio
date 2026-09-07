// Cinematic borders — country outlines as a soft, terminator-aware glow.
//
// Borders are a single line-segments mesh built from the per-country
// ring coordinates. Each segment is given a per-vertex hash seeded by
// its lat/lng so the grain animation stays deterministic across runs.
// The shader treats borders as part of the surface system: it reads
// the same terminator bands every other cinematic layer reads, so
// outlines glow strongest at the twilight band and fade through deep
// day / deep night, matching the rest of the cinematic look.

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
import type { CountryFeature } from '../../renderer/country-feature';
import type { CinematicWorld } from './engine';
import {
  cloneCinematicUniforms,
  createCinematicUniforms,
  syncCinematicUniforms,
  type CinematicUniforms,
} from './shader-uniforms';
import { GLSL_FRESNEL, GLSL_TERMINATOR, stableHash01 } from './math';

export interface CinematicBordersLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly intensity: number;
  readonly glitch?: {
    readonly enabled: boolean;
    readonly intervalMin: number;
    readonly intervalMax: number;
    readonly amount: number;
    readonly channelShift?: number;
  };
}

const BORDER_RADIUS = GLOBE_RADIUS * 1.0035;

const VERTEX_SHADER = /* glsl */ `
  precision mediump float;
  attribute float aSeed;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying float vSeed;

  void main() {
    vSeed = aSeed;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normalize(position));
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  ${GLSL_TERMINATOR}
  ${GLSL_FRESNEL}

  uniform vec3  uColor;
  uniform float uIntensity;
  uniform float uTime;
  uniform vec3  uLightDirection;
  uniform float uLightInfluence;
  uniform float uTerminatorBoost;
  uniform float uHorizonGlow;
  uniform float uInteractionEnergy;
  uniform float uTerminatorSoftness;
  uniform float uTerminatorContrast;

  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying float vSeed;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(vViewDir);
    float ndv = max(dot(v, n), 0.0);
    float facing = smoothstep(0.0, 0.34, ndv);
    float rim = cn_rim(ndv, 1.7);

    cn_TerminatorBands tb = cn_terminator(n, normalize(uLightDirection),
                                          uTerminatorSoftness, uTerminatorContrast);

    // Light response: borders read strongest at the terminator + rim,
    // softer on day, dimmest deep at night. The same pattern as every
    // other cinematic layer so the planet looks unified.
    float lit = (1.0 - tb.day) * 0.42
              + tb.twilight * 0.92 * uTerminatorBoost
              + rim * 0.32 * uHorizonGlow
              + tb.day * 0.18;
    float lightReactive = mix(1.0, lit, uLightInfluence);

    // Subtle deterministic shimmer seeded by the vertex's stable hash.
    // The phase is tied to time so the same border runs the same loop.
    float grain = 0.92 + 0.08 * sin(uTime * 0.85 + vSeed * 19.739);

    float alpha = (0.10 + facing * 0.46 + rim * 0.34 * uHorizonGlow + tb.twilight * 0.28)
                * min(uIntensity, 2.6) * 0.30 * lightReactive;
    alpha += alpha * uInteractionEnergy * 0.35;

    vec3 color = uColor * (0.72 + facing * 0.34 + rim * 0.62 * uHorizonGlow + tb.twilight * 0.42);
    color += vec3(1.0, 0.62, 0.30) * tb.warmShift * 0.28;
    color *= grain;

    gl_FragColor = vec4(color, alpha);
  }
`;

export class CinematicBordersLayer {
  public readonly group: Group;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly defaultColor: string;
  private readonly defaultIntensity: number;
  private readonly uniforms: CinematicUniforms;
  private world: CinematicWorld | null = null;

  public constructor(options: CinematicBordersLayerOptions) {
    this.group = new Group();
    this.group.name = 'CinematicBordersLayer';
    this.defaultColor = options.color;
    this.defaultIntensity = options.intensity;
    this.uniforms = createCinematicUniforms();

    const positions: number[] = [];
    const seeds: number[] = [];

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
          seeds.push(
            stableHash01(`${a[0]}:${a[1]}`),
            stableHash01(`${b[0]}:${b[1]}`),
          );
        }
      });
    });

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
    this.material = new ShaderMaterial({
      uniforms: {
        ...cloneCinematicUniforms(this.uniforms),
        uColor: { value: new Color(options.color) },
        uIntensity: { value: options.intensity },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const lines = new LineSegments(this.geometry, this.material);
    lines.name = 'CinematicBordersLayerLines';
    lines.renderOrder = 5;
    this.group.add(lines);
  }

  public setWorld(world: CinematicWorld): void {
    this.world = world;
  }

  public update(elapsedSeconds: number, _deltaSeconds: number): void {
    if (this.world) syncCinematicUniforms(this.uniforms, this.world.uniforms);
    this.uniforms.uTime.value = elapsedSeconds;
    for (const [key, uniform] of Object.entries(this.uniforms)) {
      if (this.material.uniforms[key]) this.material.uniforms[key]!.value = uniform.value;
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public setColor(color: string): void {
    (this.material.uniforms['uColor']!.value as Color).set(
      color === '' ? this.defaultColor : color,
    );
  }

  public setIntensity(intensity: number): void {
    this.material.uniforms['uIntensity']!.value =
      intensity > 0 ? intensity : this.defaultIntensity;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.group.clear();
  }
}
