import {
  Color,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';

export interface CinematicSurfaceLayerOptions {
  readonly oceanColor: string;
  readonly landColor: string;
  readonly cloudColor: string;
  readonly nightColor: string;
  readonly lightDirection: readonly [number, number, number];
  readonly lightingMode?: 'hero' | 'natural' | 'eclipse';
  readonly terminatorSoftness?: number;
  readonly terminatorContrast?: number;
  readonly keyIntensity?: number;
  readonly fillIntensity?: number;
  readonly rimColor?: string;
  readonly rimIntensity?: number;
  readonly rimPower?: number;
  readonly specularIntensity?: number;
  readonly cloudOpacity?: number;
  readonly oceanSheen?: number;
}

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;
  void main() {
    vLocalNormal = normalize(position);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uOceanColor;
  uniform vec3 uLandColor;
  uniform vec3 uCloudColor;
  uniform vec3 uNightColor;
  uniform vec3 uLightDirection;
  uniform vec3 uRimColor;
  uniform float uLightingMode;
  uniform float uTerminatorSoftness;
  uniform float uTerminatorContrast;
  uniform float uKeyIntensity;
  uniform float uFillIntensity;
  uniform float uRimIntensity;
  uniform float uRimPower;
  uniform float uSpecularIntensity;
  uniform float uCloudOpacity;
  uniform float uOceanSheen;
  uniform float uTime;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 viewNormal = normalize(vViewNormal);
    vec3 local = normalize(vLocalNormal);
    vec3 viewDir = normalize(vViewDir);
    float lat = asin(local.y);
    float lng = atan(local.z, -local.x);
    vec2 uv = vec2(lng * 0.72, lat * 1.85);

    float continents = fbm(uv * 2.15 + vec2(1.7, -0.4));
    continents += 0.32 * fbm(uv * 5.2 + vec2(-2.2, 0.9));
    float landMask = smoothstep(0.63, 0.78, continents);

    float waves = fbm(vec2(lng * 12.0 + uTime * 0.018, lat * 18.0 - uTime * 0.01));
    float oceanBands = fbm(vec2(lng * 22.0 - uTime * 0.006, lat * 28.0));
    vec3 ocean = uOceanColor * (0.64 + waves * 0.22) + vec3(0.0, 0.07, 0.13) * oceanBands * 0.22;
    vec3 land = mix(uLandColor * 0.5, uLandColor * 1.02, fbm(uv * 8.5 + 4.0));
    vec3 base = mix(ocean, land, landMask * 0.08);

    vec3 keyDir = normalize(uLightDirection);
    vec3 fillDir = normalize(vec3(-keyDir.x * 0.65, keyDir.y * 0.28 + 0.18, -keyDir.z * 0.52));
    vec3 heroViewKey = normalize(vec3(-0.52, 0.68, 0.36));
    float light = dot(n, keyDir);
    float heroLight = dot(viewNormal, heroViewKey);
    float heroMode = 1.0 - step(0.5, abs(uLightingMode - 0.0));
    float naturalMode = 1.0 - step(0.5, abs(uLightingMode - 1.0));
    float eclipseMode = 1.0 - step(0.5, abs(uLightingMode - 2.0));
    float modeKey = heroMode * 1.16 + naturalMode * 0.88 + eclipseMode * 0.72;
    float modeFill = heroMode * 0.82 + naturalMode * 1.08 + eclipseMode * 0.35;
    float modeRim = heroMode * 1.42 + naturalMode * 0.72 + eclipseMode * 1.85;
    float dayWorld = smoothstep(-uTerminatorSoftness * 0.72, uTerminatorSoftness, light);
    float dayHero = smoothstep(0.08, 0.88, heroLight);
    float day = max(dayWorld, dayHero * heroMode * 0.72);
    day = mix(day, dayWorld, naturalMode * 0.65);
    day = pow(day, max(0.55, uTerminatorContrast));
    float ndv = max(dot(viewDir, n), 0.0);
    float silhouette = 1.0 - smoothstep(0.02, 0.44, ndv);
    float rim = pow(1.0 - ndv, max(0.35, uRimPower));
    float litRim = (rim * 0.46 + silhouette * 0.12) * smoothstep(-0.24, 0.74, max(light, heroLight)) * modeRim;
    float spec = pow(max(dot(reflect(-keyDir, n), viewDir), 0.0), 24.0);
    float keyLight = max(max(light, 0.0), heroLight * heroMode * 0.62) * uKeyIntensity * modeKey;
    float fillLight = max(dot(n, fillDir), 0.0) * uFillIntensity * modeFill;
    float twilight = exp(-pow(max(light, heroLight * heroMode * 0.64) / max(uTerminatorSoftness, 0.001), 2.0));

    float cloudNoise = fbm(vec2(lng * 2.8 + uTime * 0.012, lat * 5.8));
    float cloudBands = smoothstep(0.48, 0.78, cloudNoise) * (1.0 - landMask * 0.25);
    vec3 dayColor = mix(base, uCloudColor, cloudBands * uCloudOpacity);
    dayColor *= 0.22 + keyLight + fillLight * (0.85 - day * 0.2);
    dayColor += uCloudColor * spec * uOceanSheen * uSpecularIntensity * (1.0 - landMask);
    dayColor += uRimColor * litRim * uRimIntensity * 0.28;
    dayColor += uCloudColor * smoothstep(0.44, 0.95, max(light, heroLight)) * 0.075 * uKeyIntensity;

    vec3 night = mix(uNightColor * (0.82 + waves * 0.1), uOceanColor * 0.22, landMask * 0.28);
    night *= 1.0 - clamp(uTerminatorContrast - 1.0, 0.0, 1.6) * 0.14;
    night += uRimColor * rim * 0.075 * uRimIntensity * (0.72 + eclipseMode * 0.5);
    night += uCloudColor * twilight * 0.045 * (heroMode + eclipseMode * 0.8);
    vec3 color = mix(night, dayColor, day);
    color *= 0.84 + 0.18 * smoothstep(-0.35, 0.85, max(light, heroLight));
    color += uRimColor * litRim * 0.11 * uRimIntensity;
    color += vec3(1.0, 0.78, 0.42) * smoothstep(0.42, 0.96, heroLight) * heroMode * 0.035 * uKeyIntensity;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const DEFAULTS = {
  terminatorSoftness: 0.38,
  terminatorContrast: 1.38,
  keyIntensity: 1.34,
  fillIntensity: 0.16,
  rimColor: '#aee8ff',
  rimIntensity: 0.72,
  rimPower: 2.78,
  specularIntensity: 0.76,
  cloudOpacity: 0.16,
  oceanSheen: 0.44,
};

export class CinematicSurfaceLayer {
  public readonly mesh: Mesh;
  private readonly geometry: SphereGeometry;
  private readonly material: ShaderMaterial;
  private readonly defaultOceanColor: string;
  private readonly defaultLandColor: string;
  private readonly defaultCloudColor: string;
  private readonly defaultNightColor: string;
  private readonly defaultRimColor: string;
  private readonly defaultTerminatorSoftness: number;
  private readonly defaultTerminatorContrast: number;
  private readonly defaultKeyIntensity: number;
  private readonly defaultFillIntensity: number;
  private readonly defaultRimIntensity: number;
  private readonly defaultRimPower: number;
  private readonly defaultSpecularIntensity: number;
  private readonly defaultCloudOpacity: number;
  private readonly defaultOceanSheen: number;
  private readonly light = new Vector3();

  public constructor(options: CinematicSurfaceLayerOptions) {
    this.defaultOceanColor = options.oceanColor;
    this.defaultLandColor = options.landColor;
    this.defaultCloudColor = options.cloudColor;
    this.defaultNightColor = options.nightColor;
    this.defaultRimColor = options.rimColor ?? DEFAULTS.rimColor;
    this.defaultTerminatorSoftness = options.terminatorSoftness ?? DEFAULTS.terminatorSoftness;
    this.defaultTerminatorContrast = options.terminatorContrast ?? DEFAULTS.terminatorContrast;
    this.defaultKeyIntensity = options.keyIntensity ?? DEFAULTS.keyIntensity;
    this.defaultFillIntensity = options.fillIntensity ?? DEFAULTS.fillIntensity;
    this.defaultRimIntensity = options.rimIntensity ?? DEFAULTS.rimIntensity;
    this.defaultRimPower = options.rimPower ?? DEFAULTS.rimPower;
    this.defaultSpecularIntensity = options.specularIntensity ?? DEFAULTS.specularIntensity;
    this.defaultCloudOpacity = options.cloudOpacity ?? DEFAULTS.cloudOpacity;
    this.defaultOceanSheen = options.oceanSheen ?? DEFAULTS.oceanSheen;
    this.light
      .set(options.lightDirection[0], options.lightDirection[1], options.lightDirection[2])
      .normalize();

    this.geometry = new SphereGeometry(GLOBE_RADIUS, 160, 80);
    this.material = new ShaderMaterial({
      uniforms: {
        uOceanColor: { value: new Color(options.oceanColor) },
        uLandColor: { value: new Color(options.landColor) },
        uCloudColor: { value: new Color(options.cloudColor) },
        uNightColor: { value: new Color(options.nightColor) },
        uLightDirection: { value: this.light.clone() },
        uRimColor: { value: new Color(this.defaultRimColor) },
        uLightingMode: { value: lightingModeToUniform(options.lightingMode ?? 'hero') },
        uTerminatorSoftness: { value: this.defaultTerminatorSoftness },
        uTerminatorContrast: { value: this.defaultTerminatorContrast },
        uKeyIntensity: { value: this.defaultKeyIntensity },
        uFillIntensity: { value: this.defaultFillIntensity },
        uRimIntensity: { value: this.defaultRimIntensity },
        uRimPower: { value: this.defaultRimPower },
        uSpecularIntensity: { value: this.defaultSpecularIntensity },
        uCloudOpacity: { value: this.defaultCloudOpacity },
        uOceanSheen: { value: this.defaultOceanSheen },
        uTime: { value: 0 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'CinematicSurfaceLayer';
    this.mesh.renderOrder = 0;
  }

  public update(elapsedSeconds: number): void {
    this.material.uniforms['uTime']!.value = elapsedSeconds;
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public setOceanColor(color: string): void {
    (this.material.uniforms['uOceanColor']!.value as Color).set(
      color === '' ? this.defaultOceanColor : color,
    );
  }

  public setLandColor(color: string): void {
    (this.material.uniforms['uLandColor']!.value as Color).set(
      color === '' ? this.defaultLandColor : color,
    );
  }

  public setCloudColor(color: string): void {
    (this.material.uniforms['uCloudColor']!.value as Color).set(
      color === '' ? this.defaultCloudColor : color,
    );
  }

  public setNightColor(color: string): void {
    (this.material.uniforms['uNightColor']!.value as Color).set(
      color === '' ? this.defaultNightColor : color,
    );
  }

  public setLightDirection(direction: readonly [number, number, number]): void {
    this.light.set(direction[0], direction[1], direction[2]).normalize();
    (this.material.uniforms['uLightDirection']!.value as Vector3).copy(this.light);
  }

  public setLightingMode(mode: 'hero' | 'natural' | 'eclipse'): void {
    this.material.uniforms['uLightingMode']!.value = lightingModeToUniform(mode);
  }

  public setTerminatorSoftness(value: number): void {
    this.material.uniforms['uTerminatorSoftness']!.value =
      value > 0 ? value : this.defaultTerminatorSoftness;
  }

  public setTerminatorContrast(value: number): void {
    this.material.uniforms['uTerminatorContrast']!.value =
      value > 0 ? value : this.defaultTerminatorContrast;
  }

  public setKeyIntensity(value: number): void {
    this.material.uniforms['uKeyIntensity']!.value =
      value > 0 ? value : this.defaultKeyIntensity;
  }

  public setFillIntensity(value: number): void {
    this.material.uniforms['uFillIntensity']!.value =
      value >= 0 ? value : this.defaultFillIntensity;
  }

  public setRimColor(color: string): void {
    (this.material.uniforms['uRimColor']!.value as Color).set(
      color === '' ? this.defaultRimColor : color,
    );
  }

  public setRimIntensity(value: number): void {
    this.material.uniforms['uRimIntensity']!.value =
      value > 0 ? value : this.defaultRimIntensity;
  }

  public setRimPower(value: number): void {
    this.material.uniforms['uRimPower']!.value =
      value > 0 ? value : this.defaultRimPower;
  }

  public setSpecularIntensity(value: number): void {
    this.material.uniforms['uSpecularIntensity']!.value =
      value >= 0 ? value : this.defaultSpecularIntensity;
  }

  public setCloudOpacity(value: number): void {
    this.material.uniforms['uCloudOpacity']!.value =
      value >= 0 ? value : this.defaultCloudOpacity;
  }

  public setOceanSheen(value: number): void {
    this.material.uniforms['uOceanSheen']!.value =
      value >= 0 ? value : this.defaultOceanSheen;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

const lightingModeToUniform = (mode: 'hero' | 'natural' | 'eclipse'): number => {
  if (mode === 'natural') return 1;
  if (mode === 'eclipse') return 2;
  return 0;
};
