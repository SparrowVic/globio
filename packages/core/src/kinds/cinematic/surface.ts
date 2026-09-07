// Cinematic surface layer — owns the hero sphere material. The shader
// source lives in `surface-shader.ts`; this file wires uniforms, defaults,
// live setters and the optional texture set.

import {
  Color,
  DataTexture,
  Mesh,
  RGBAFormat,
  ShaderMaterial,
  SphereGeometry,
  Texture,
  UnsignedByteType,
  Vector2,
  Vector3,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';
import { LAND_ATLAS_SIZE } from './atlas';
import type { CinematicWorld } from './engine';
import { SURFACE_FRAGMENT_SHADER, SURFACE_VERTEX_SHADER } from './surface-shader';
import {
  applyCinematicUniforms,
  cloneCinematicUniforms,
  createCinematicUniforms,
  syncCinematicUniforms,
  type CinematicUniforms,
} from './shader-uniforms';

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
  /** Relief / normal-perturbation strength 0..2. Default 1. */
  readonly reliefStrength?: number;
  /** Latitude / altitude / moisture land palette. Default true. */
  readonly biomes?: boolean;
  /** Turquoise shallows + beaches 0..1. Default 0.6. */
  readonly shallows?: number;
  /** Height above which land turns to snow 0..1. Default 0.72. */
  readonly snowLine?: number;
  /** Colour saturation multiplier: 1 natural, 0 monochrome. Default 1. */
  readonly saturation?: number;
  readonly iceColor?: string;
  readonly vegetationColor?: string;
  readonly desertColor?: string;
  readonly shallowWaterColor?: string;
  readonly landTexture: Texture;
  readonly densityTexture: Texture;
  /** Baked terrain atlas (R height, G moisture, B ridge). Neutral fallback when omitted. */
  readonly terrainTexture?: Texture;
}

/** Optional real-Earth maps; any subset. `null` clears a slot. */
export interface CinematicSurfaceTextures {
  readonly day?: Texture | null;
  readonly night?: Texture | null;
  readonly normal?: Texture | null;
  readonly specular?: Texture | null;
  readonly clouds?: Texture | null;
}

const DEFAULTS = {
  terminatorSoftness: 0.42,
  terminatorContrast: 1.45,
  keyIntensity: 1.6,
  fillIntensity: 0.10,
  rimColor: '#9bdaff',
  rimIntensity: 1.42,
  rimPower: 2.55,
  specularIntensity: 0.95,
  cloudOpacity: 0.12,
  oceanSheen: 0.62,
  reliefStrength: 1,
  shallows: 0.6,
  snowLine: 0.72,
  saturation: 1,
  iceColor: '#dcefff',
  vegetationColor: '#2f5a2c',
  desertColor: '#c9a266',
  shallowWaterColor: '#1f8fa8',
};

// The land and terrain atlases share one grid (see atlas.ts); the surface
// steps by one texel for the relief slopes and the coast gradient.
const LAND_ATLAS_TEXEL: readonly [number, number] = [
  1 / LAND_ATLAS_SIZE.width,
  1 / LAND_ATLAS_SIZE.height,
];

const oceanDeepFromBase = (base: string): string => {
  const c = new Color(base);
  c.multiplyScalar(0.42);
  return `#${c.getHexString()}`;
};

const landHighFromBase = (base: string): string => {
  const c = new Color(base);
  c.lerp(new Color('#f3d9a4'), 0.32);
  return `#${c.getHexString()}`;
};

/** 1×1 neutral stand-ins so every sampler is always bound. */
const makeFlatTexture = (r: number, g: number, b: number): Texture => {
  const data = new Uint8Array([r, g, b, 255]);
  const texture = new DataTexture(data, 1, 1, RGBAFormat, UnsignedByteType);
  texture.needsUpdate = true;
  return texture;
};

export class CinematicSurfaceLayer {
  public readonly mesh: Mesh;
  private readonly geometry: SphereGeometry;
  private readonly material: ShaderMaterial;
  private readonly defaultOceanColor: string;
  private readonly defaultLandColor: string;
  private readonly defaultNightColor: string;
  private readonly defaultRimColor: string;
  private readonly defaultTerminatorSoftness: number;
  private readonly defaultTerminatorContrast: number;
  private readonly defaultKeyIntensity: number;
  private readonly defaultFillIntensity: number;
  private readonly defaultRimIntensity: number;
  private readonly defaultRimPower: number;
  private readonly defaultSpecularIntensity: number;
  private readonly defaultOceanSheen: number;
  private readonly defaultReliefStrength: number;
  private readonly defaultShallows: number;
  private readonly defaultSnowLine: number;
  private readonly defaultSaturation: number;
  private readonly defaultIceColor: string;
  private readonly defaultVegetationColor: string;
  private readonly defaultDesertColor: string;
  private readonly defaultShallowWaterColor: string;
  private readonly light = new Vector3();
  private readonly uniforms: CinematicUniforms;
  private readonly flatTerrain: Texture;
  private readonly flatBlack: Texture;
  private readonly flatNormal: Texture;
  private world: CinematicWorld | null = null;
  private textureMix = 0;
  private textureMixTarget = 0;
  private textureFadeSeconds = 0.8;

  public constructor(options: CinematicSurfaceLayerOptions) {
    this.defaultOceanColor = options.oceanColor;
    this.defaultLandColor = options.landColor;
    this.defaultNightColor = options.nightColor;
    this.defaultRimColor = options.rimColor ?? DEFAULTS.rimColor;
    this.defaultTerminatorSoftness = options.terminatorSoftness ?? DEFAULTS.terminatorSoftness;
    this.defaultTerminatorContrast = options.terminatorContrast ?? DEFAULTS.terminatorContrast;
    this.defaultKeyIntensity = options.keyIntensity ?? DEFAULTS.keyIntensity;
    this.defaultFillIntensity = options.fillIntensity ?? DEFAULTS.fillIntensity;
    this.defaultRimIntensity = options.rimIntensity ?? DEFAULTS.rimIntensity;
    this.defaultRimPower = options.rimPower ?? DEFAULTS.rimPower;
    this.defaultSpecularIntensity = options.specularIntensity ?? DEFAULTS.specularIntensity;
    this.defaultOceanSheen = options.oceanSheen ?? DEFAULTS.oceanSheen;
    this.defaultReliefStrength = options.reliefStrength ?? DEFAULTS.reliefStrength;
    this.defaultShallows = options.shallows ?? DEFAULTS.shallows;
    this.defaultSnowLine = options.snowLine ?? DEFAULTS.snowLine;
    this.defaultSaturation = options.saturation ?? DEFAULTS.saturation;
    this.defaultIceColor = options.iceColor ?? DEFAULTS.iceColor;
    this.defaultVegetationColor = options.vegetationColor ?? DEFAULTS.vegetationColor;
    this.defaultDesertColor = options.desertColor ?? DEFAULTS.desertColor;
    this.defaultShallowWaterColor = options.shallowWaterColor ?? DEFAULTS.shallowWaterColor;
    this.light
      .set(options.lightDirection[0], options.lightDirection[1], options.lightDirection[2])
      .normalize();
    this.uniforms = createCinematicUniforms();
    this.uniforms.uLightDirection.value.copy(this.light);
    this.flatTerrain = makeFlatTexture(0, 128, 0);
    this.flatBlack = makeFlatTexture(0, 0, 0);
    this.flatNormal = makeFlatTexture(128, 128, 255);

    this.geometry = new SphereGeometry(GLOBE_RADIUS, 192, 96);
    this.material = new ShaderMaterial({
      uniforms: {
        ...cloneCinematicUniforms(this.uniforms),
        uOceanColor: { value: new Color(options.oceanColor) },
        uOceanDeepColor: { value: new Color(oceanDeepFromBase(options.oceanColor)) },
        uLandColor: { value: new Color(options.landColor) },
        uLandHighColor: { value: new Color(landHighFromBase(options.landColor)) },
        uNightColor: { value: new Color(options.nightColor) },
        uLightDirection: { value: this.light.clone() },
        uRimColor: { value: new Color(this.defaultRimColor) },
        uIceColor: { value: new Color(this.defaultIceColor) },
        uVegetationColor: { value: new Color(this.defaultVegetationColor) },
        uDesertColor: { value: new Color(this.defaultDesertColor) },
        uShallowWaterColor: { value: new Color(this.defaultShallowWaterColor) },
        uLightingMode: { value: lightingModeToUniform(options.lightingMode ?? 'hero') },
        uTerminatorSoftness: { value: this.defaultTerminatorSoftness },
        uTerminatorContrast: { value: this.defaultTerminatorContrast },
        uKeyIntensity: { value: this.defaultKeyIntensity },
        uFillIntensity: { value: this.defaultFillIntensity },
        uRimIntensity: { value: this.defaultRimIntensity },
        uRimPower: { value: this.defaultRimPower },
        uSpecularIntensity: { value: this.defaultSpecularIntensity },
        uOceanSheen: { value: this.defaultOceanSheen },
        uReliefStrength: { value: this.defaultReliefStrength },
        uBiomes: { value: options.biomes === false ? 0 : 1 },
        uShallows: { value: this.defaultShallows },
        uSnowLine: { value: this.defaultSnowLine },
        uSaturation: { value: this.defaultSaturation },
        uLandAtlas: { value: options.landTexture },
        uTerrainAtlas: { value: options.terrainTexture ?? this.flatTerrain },
        uDensityAtlas: { value: options.densityTexture },
        uDayMap: { value: this.flatBlack },
        uNightMap: { value: this.flatBlack },
        uNormalMap: { value: this.flatNormal },
        uSpecMap: { value: this.flatBlack },
        uCloudMap: { value: this.flatBlack },
        uHasDay: { value: 0 },
        uHasNight: { value: 0 },
        uHasNormal: { value: 0 },
        uHasSpec: { value: 0 },
        uHasCloudMap: { value: 0 },
        uTextureMix: { value: 0 },
        uLandTexel: { value: new Vector2(LAND_ATLAS_TEXEL[0], LAND_ATLAS_TEXEL[1]) },
      },
      vertexShader: SURFACE_VERTEX_SHADER,
      fragmentShader: SURFACE_FRAGMENT_SHADER,
    });
    this.mesh = new Mesh(this.geometry, this.material);
    this.mesh.name = 'CinematicSurfaceLayer';
    this.mesh.renderOrder = 0;
  }

  public setWorld(world: CinematicWorld): void {
    this.world = world;
  }

  public update(elapsedSeconds: number, delta = 0): void {
    if (this.world) syncCinematicUniforms(this.uniforms, this.world.uniforms);
    this.uniforms.uTime.value = elapsedSeconds;
    applyCinematicUniforms(this.material, this.uniforms);
    if (this.textureMix !== this.textureMixTarget && delta > 0) {
      const step = delta / Math.max(0.05, this.textureFadeSeconds);
      this.textureMix =
        this.textureMix < this.textureMixTarget
          ? Math.min(this.textureMixTarget, this.textureMix + step)
          : Math.max(this.textureMixTarget, this.textureMix - step);
      this.material.uniforms['uTextureMix']!.value = this.textureMix;
    }
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  /** Current procedural → textured crossfade (0..1). */
  public getTextureMix(): number {
    return this.textureMix;
  }

  public setOceanColor(color: string): void {
    const next = color === '' ? this.defaultOceanColor : color;
    (this.material.uniforms['uOceanColor']!.value as Color).set(next);
    (this.material.uniforms['uOceanDeepColor']!.value as Color).set(oceanDeepFromBase(next));
  }

  public setLandColor(color: string): void {
    const next = color === '' ? this.defaultLandColor : color;
    (this.material.uniforms['uLandColor']!.value as Color).set(next);
    (this.material.uniforms['uLandHighColor']!.value as Color).set(landHighFromBase(next));
  }

  /** Cloud colour now lives on the cloud shell; kept for API compatibility. */
  public setCloudColor(_color: string): void {
    // no-op: see CinematicCloudsLayer.setColor
  }

  public setNightColor(color: string): void {
    (this.material.uniforms['uNightColor']!.value as Color).set(
      color === '' ? this.defaultNightColor : color,
    );
  }

  public setLightDirection(direction: readonly [number, number, number]): void {
    this.light.set(direction[0], direction[1], direction[2]).normalize();
    this.uniforms.uLightDirection.value.copy(this.light);
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

  /** Cloud opacity now lives on the cloud shell; kept for API compatibility. */
  public setCloudOpacity(_value: number): void {
    // no-op: see CinematicCloudsLayer.setOpacity
  }

  public setOceanSheen(value: number): void {
    this.material.uniforms['uOceanSheen']!.value =
      value >= 0 ? value : this.defaultOceanSheen;
  }

  public setReliefStrength(value: number): void {
    this.material.uniforms['uReliefStrength']!.value =
      value >= 0 ? value : this.defaultReliefStrength;
  }

  public setBiomes(enabled: boolean): void {
    this.material.uniforms['uBiomes']!.value = enabled ? 1 : 0;
  }

  public setShallows(value: number): void {
    this.material.uniforms['uShallows']!.value = value >= 0 ? value : this.defaultShallows;
  }

  public setSnowLine(value: number): void {
    this.material.uniforms['uSnowLine']!.value = value > 0 ? value : this.defaultSnowLine;
  }

  public setSaturation(value: number): void {
    this.material.uniforms['uSaturation']!.value = value >= 0 ? value : this.defaultSaturation;
  }

  public setIceColor(color: string): void {
    (this.material.uniforms['uIceColor']!.value as Color).set(
      color === '' ? this.defaultIceColor : color,
    );
  }

  public setVegetationColor(color: string): void {
    (this.material.uniforms['uVegetationColor']!.value as Color).set(
      color === '' ? this.defaultVegetationColor : color,
    );
  }

  public setDesertColor(color: string): void {
    (this.material.uniforms['uDesertColor']!.value as Color).set(
      color === '' ? this.defaultDesertColor : color,
    );
  }

  public setShallowWaterColor(color: string): void {
    (this.material.uniforms['uShallowWaterColor']!.value as Color).set(
      color === '' ? this.defaultShallowWaterColor : color,
    );
  }

  public setDensityTexture(texture: Texture): void {
    this.material.uniforms['uDensityAtlas']!.value = texture;
  }

  public setTerrainTexture(texture: Texture | null): void {
    this.material.uniforms['uTerrainAtlas']!.value = texture ?? this.flatTerrain;
  }

  /**
   * Bind (or clear) the optional real-Earth maps. The crossfade from the
   * procedural look runs over `fadeSeconds` inside `update()`.
   */
  public setTextures(textures: CinematicSurfaceTextures | null, fadeSeconds = 0.8): void {
    const u = this.material.uniforms;
    const bind = (key: string, flag: string, texture: Texture | null | undefined, fallback: Texture) => {
      u[key]!.value = texture ?? fallback;
      u[flag]!.value = texture ? 1 : 0;
    };
    bind('uDayMap', 'uHasDay', textures?.day, this.flatBlack);
    bind('uNightMap', 'uHasNight', textures?.night, this.flatBlack);
    bind('uNormalMap', 'uHasNormal', textures?.normal, this.flatNormal);
    bind('uSpecMap', 'uHasSpec', textures?.specular, this.flatBlack);
    bind('uCloudMap', 'uHasCloudMap', textures?.clouds, this.flatBlack);
    const any = Boolean(
      textures && (textures.day || textures.night || textures.normal || textures.specular || textures.clouds),
    );
    this.textureFadeSeconds = Math.max(0, fadeSeconds);
    this.textureMixTarget = any ? 1 : 0;
    if (this.textureFadeSeconds === 0) {
      this.textureMix = this.textureMixTarget;
      u['uTextureMix']!.value = this.textureMix;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.flatTerrain.dispose();
    this.flatBlack.dispose();
    this.flatNormal.dispose();
  }
}

const lightingModeToUniform = (mode: 'hero' | 'natural' | 'eclipse'): number => {
  if (mode === 'natural') return 1;
  if (mode === 'eclipse') return 2;
  return 0;
};
