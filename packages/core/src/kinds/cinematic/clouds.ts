// Cinematic cloud shell — a thin sphere just above the surface that draws
// the same coverage field the surface uses for its cloud shadows, so every
// shadow sits under the cloud that casts it.
//
//   * Coverage:   `cn_clouds()` (domain-warped fbm + ITCZ band), or the
//                 optional cloud texture in texture mode.
//   * Lighting:   wrapped N·L against the sun, self-shading in the lumps
//                 (ridged detail), sunset warmth in the terminator band,
//                 silver lining (Mie forward scatter) toward the sun near
//                 the limb.
//   * Night:      faint moonlight, plus a warm glow from the city-density
//                 atlas underneath — cities light their clouds from below.
//   * Limb:       alpha thickens slightly where the view path through the
//                 shell is longer.

import {
  Color,
  Mesh,
  NormalBlending,
  ShaderMaterial,
  SphereGeometry,
  Texture,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';
import type { CinematicWorld } from './engine';
import { GLSL_CINEMATIC_PRELUDE } from './math';
import {
  applyCinematicUniforms,
  cloneCinematicUniforms,
  createCinematicUniforms,
  syncCinematicUniforms,
  type CinematicUniforms,
} from './shader-uniforms';

export interface CinematicCloudsLayerOptions {
  readonly color: string;
  /** 0..1 peak opacity. Default 0.85. */
  readonly opacity?: number;
  /** Shell height as a fraction of the globe radius. Default 0.009. */
  readonly altitude?: number;
  readonly densityTexture: Texture;
}

const DEFAULT_OPACITY = 0.72;
const DEFAULT_ALTITUDE = 0.009;

const VERTEX_SHADER = /* glsl */ `
  precision highp float;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vLocalNormal = normalize(position);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * vLocalNormal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  ${GLSL_CINEMATIC_PRELUDE}

  uniform vec3  uColor;
  uniform float uOpacity;
  uniform vec3  uLightDirection;
  uniform vec3  uMoonDirection;
  uniform vec3  uMoonColor;
  uniform float uMoonlight;
  uniform vec3  uSunColor;
  uniform float uTime;
  uniform float uTerminatorSoftness;
  uniform float uTerminatorContrast;
  uniform float uCloudCoverage;
  uniform float uCloudSpeed;
  uniform float uCloudSoftness;
  uniform float uQuality;
  uniform float uExposure;
  uniform float uCityNightResponse;
  uniform sampler2D uDensityAtlas;
  uniform sampler2D uCloudMap;
  uniform float uHasCloudMap;
  uniform float uTextureMix;

  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  const float PI = 3.14159265359;
  const float TWO_PI = 6.28318530718;
  const float HALF_PI = 1.57079632679;

  vec2 atlasUv(vec3 dir, float lngShift) {
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    float lng = atan(dir.z, -dir.x) - PI + lngShift;
    if (lng < -PI) lng += TWO_PI;
    return vec2(fract((lng + PI) / TWO_PI), (lat + HALF_PI) / PI);
  }

  // Cloud maps carry a lot of low-value haze; keep the masses, drop the
  // veil so the surface underneath stays readable (mirrors the surface
  // shader so the shadows match the shell).
  float texturedCover(vec3 dir) {
    float t = texture2D(uCloudMap, atlasUv(dir, uTime * uCloudSpeed * 0.0035)).r;
    return smoothstep(0.14, 0.92, t) * 0.9;
  }
  float coverAt(vec3 dir) {
    // Fully textured ⇒ skip the expensive procedural field entirely.
    if (uHasCloudMap > 0.5 && uTextureMix > 0.999) return texturedCover(dir);
    float procedural = cn_clouds(dir, uTime, uCloudCoverage, uCloudSpeed, uCloudSoftness, uQuality);
    if (uHasCloudMap < 0.5) return procedural;
    return mix(procedural, texturedCover(dir), uTextureMix);
  }

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 local = normalize(vLocalNormal);
    vec3 viewDir = normalize(vViewDir);
    vec3 keyDir = normalize(uLightDirection);
    vec3 moonDir = normalize(uMoonDirection);

    float cover = coverAt(local);
    if (cover < 0.004) discard;

    cn_TerminatorBands tb = cn_terminator(n, keyDir, uTerminatorSoftness, uTerminatorContrast);
    float ndv = max(dot(n, viewDir), 0.0);
    float ndl = dot(n, keyDir);
    float vdl = dot(viewDir, keyDir);

    // Lumps: ridged detail gives the mass some internal structure so the
    // shell does not read as a flat decal.
    int lumpOctaves = uQuality > 1.0 ? 3 : 2;
    float lump = cn_ridged3d(local * 15.0 + vec3(uTime * 0.02, 0.0, -uTime * 0.014), lumpOctaves);
    float thickness = cover * (0.55 + 0.45 * lump);

    // Wrapped diffuse + self-shading in the thick parts.
    float lit = clamp((ndl + 0.28) / 1.28, 0.0, 1.0);
    lit = pow(lit, 1.15);
    float selfShade = 1.0 - thickness * 0.26 * (1.0 - lit);

    vec3 dayColor = uColor * mix(vec3(1.0), uSunColor, 0.5) * (0.26 + lit * 0.9) * selfShade * (0.86 + 0.3 * thickness);
    dayColor += vec3(1.0, 0.68, 0.40) * tb.warmShift * 0.55;          // sunset catch
    float silver = cn_miePhase(vdl, 0.72) * (1.0 - ndv) * (0.35 + tb.warmShift * 0.65);
    dayColor += vec3(1.0, 0.92, 0.80) * silver * 0.9;

    // Night: moon fill + warm glow from the cities below.
    float moonLit = max(dot(n, moonDir), 0.0);
    vec3 nightColor = uColor * uMoonColor * moonLit * 0.10 * uMoonlight;
    float density = cn_sampleDensity(uDensityAtlas, atlasUv(local, 0.0));
    nightColor += vec3(1.0, 0.70, 0.36) * pow(density, 0.9) * 0.62 * uCityNightResponse * thickness;
    nightColor += uColor * 0.012;

    vec3 color = mix(nightColor, dayColor, tb.day);
    color = cn_exposeAndTone(color, uExposure);

    float limb = 1.0 - ndv;
    float alpha = cover * uOpacity * (0.8 + 0.2 * limb) * (0.5 + 0.5 * thickness);
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
  }
`;

export class CinematicCloudsLayer {
  public readonly mesh: Mesh;
  private geometry: SphereGeometry;
  private readonly material: ShaderMaterial;
  private readonly uniforms: CinematicUniforms;
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;
  private altitude: number;
  private world: CinematicWorld | null = null;

  public constructor(options: CinematicCloudsLayerOptions) {
    this.defaultColor = options.color;
    this.defaultOpacity = options.opacity ?? DEFAULT_OPACITY;
    this.altitude = options.altitude !== undefined && options.altitude > 0 ? options.altitude : DEFAULT_ALTITUDE;
    this.uniforms = createCinematicUniforms();
    this.geometry = new SphereGeometry(GLOBE_RADIUS * (1 + this.altitude), 160, 80);
    this.material = new ShaderMaterial({
      uniforms: {
        ...cloneCinematicUniforms(this.uniforms),
        uColor: { value: new Color(options.color) },
        uOpacity: { value: this.defaultOpacity },
        uDensityAtlas: { value: options.densityTexture },
        uCloudMap: { value: options.densityTexture },
        uHasCloudMap: { value: 0 },
        uTextureMix: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'CinematicCloudsLayer';
    this.mesh.renderOrder = 3;
  }

  public setWorld(world: CinematicWorld): void {
    this.world = world;
  }

  public update(elapsedSeconds: number): void {
    if (this.world) syncCinematicUniforms(this.uniforms, this.world.uniforms);
    this.uniforms.uTime.value = elapsedSeconds;
    applyCinematicUniforms(this.material, this.uniforms);
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public setColor(color: string): void {
    (this.material.uniforms['uColor']!.value as Color).set(color === '' ? this.defaultColor : color);
  }

  public setOpacity(value: number): void {
    this.material.uniforms['uOpacity']!.value = value >= 0 ? value : this.defaultOpacity;
  }

  /** Shell height as a fraction of the globe radius; rebuilds the sphere. */
  public setAltitude(value: number): void {
    const next = value > 0 ? value : DEFAULT_ALTITUDE;
    if (Math.abs(next - this.altitude) < 1e-5) return;
    this.altitude = next;
    const geometry = new SphereGeometry(GLOBE_RADIUS * (1 + next), 160, 80);
    this.geometry.dispose();
    this.geometry = geometry;
    this.mesh.geometry = geometry;
  }

  public setDensityTexture(texture: Texture): void {
    this.material.uniforms['uDensityAtlas']!.value = texture;
  }

  /** Optional cloud map; `null` returns to the procedural field. */
  public setCloudTexture(texture: Texture | null): void {
    this.material.uniforms['uCloudMap']!.value = texture ?? this.material.uniforms['uDensityAtlas']!.value;
    this.material.uniforms['uHasCloudMap']!.value = texture ? 1 : 0;
  }

  /** Procedural → textured crossfade, driven by the surface's mix so both agree. */
  public setTextureMix(value: number): void {
    this.material.uniforms['uTextureMix']!.value = Math.max(0, Math.min(1, value));
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
