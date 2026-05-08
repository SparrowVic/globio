import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type {
  CinematicConfig,
  CinematicQuality,
  CinematicReactivityConfig,
} from '../../types/kinds';
import {
  createCinematicUniforms,
  type CinematicUniforms,
} from './shader-uniforms';

export interface CinematicWorldOptions {
  readonly camera: PerspectiveCamera;
  readonly config: CinematicConfig | undefined;
  readonly fallbackLightDirection: readonly [number, number, number];
}

const DEFAULT_REACTIVITY = {
  lightInfluence: 1,
  cameraInfluence: 1,
  densityInfluence: 1,
  terminatorBoost: 1,
  horizonGlow: 1,
  atmosphericScatter: 1,
  surfaceMicroDetail: 1,
  cityNightResponse: 1,
  orbitalFlow: 1,
};

export class CinematicWorld {
  public readonly uniforms: CinematicUniforms;
  private readonly camera: PerspectiveCamera;
  private readonly fallbackLightDirection: readonly [number, number, number];
  private readonly light = new Vector3();
  private quality: CinematicQuality;
  private reactivity: Required<CinematicReactivityConfig>;
  private interactionEnergy = 0;

  public constructor(options: CinematicWorldOptions) {
    this.camera = options.camera;
    this.fallbackLightDirection = options.fallbackLightDirection;
    this.uniforms = createCinematicUniforms();
    this.quality = options.config?.quality ?? 'auto';
    this.reactivity = resolveReactivity(options.config?.reactivity);
    this.setLightDirection(options.config?.surface?.lightDirection);
    this.syncUniforms(0, 0);
  }

  public update(delta: number, elapsedSeconds: number): void {
    this.interactionEnergy = Math.max(0, this.interactionEnergy - delta * 1.65);
    this.syncUniforms(delta, elapsedSeconds);
  }

  public setConfig(config: CinematicConfig): void {
    if (config.quality !== undefined) this.quality = config.quality;
    if (config.reactivity !== undefined) {
      this.reactivity = resolveReactivity({ ...this.reactivity, ...config.reactivity });
    }
    if (config.surface?.lightDirection !== undefined) {
      this.setLightDirection(config.surface.lightDirection);
    }
    this.syncUniforms(0, this.uniforms.uTime.value);
  }

  public setLightDirection(direction?: readonly [number, number, number]): void {
    const next = direction ?? this.fallbackLightDirection;
    this.light.set(next[0], next[1], next[2]);
    if (this.light.lengthSq() < 1e-6) this.light.set(-0.55, 0.72, 0.42);
    this.light.normalize();
    this.uniforms.uLightDirection.value.copy(this.light);
  }

  public pulseInteraction(amount = 1): void {
    this.interactionEnergy = Math.max(this.interactionEnergy, amount);
  }

  private syncUniforms(_delta: number, elapsedSeconds: number): void {
    this.uniforms.uTime.value = elapsedSeconds;
    this.uniforms.uLightDirection.value.copy(this.light);
    this.uniforms.uCameraDistance.value = this.camera.position.length();
    this.uniforms.uLightInfluence.value = this.reactivity.lightInfluence;
    this.uniforms.uCameraInfluence.value = this.reactivity.cameraInfluence;
    this.uniforms.uDensityInfluence.value = this.reactivity.densityInfluence;
    this.uniforms.uTerminatorBoost.value = this.reactivity.terminatorBoost;
    this.uniforms.uHorizonGlow.value = this.reactivity.horizonGlow;
    this.uniforms.uAtmosphericScatter.value = this.reactivity.atmosphericScatter;
    this.uniforms.uSurfaceMicroDetail.value = this.reactivity.surfaceMicroDetail;
    this.uniforms.uCityNightResponse.value = this.reactivity.cityNightResponse;
    this.uniforms.uOrbitalFlow.value = this.reactivity.orbitalFlow;
    this.uniforms.uInteractionEnergy.value = this.interactionEnergy;
    this.uniforms.uQuality.value = qualityToScalar(this.quality, this.camera.position.length());
    this.uniforms.uCameraDirection.value.copy(this.camera.position).normalize();
  }
}

const resolveReactivity = (
  input: CinematicReactivityConfig | undefined,
): Required<CinematicReactivityConfig> => ({
  lightInfluence:
    input?.lightInfluence !== undefined && input.lightInfluence >= 0
      ? input.lightInfluence
      : DEFAULT_REACTIVITY.lightInfluence,
  cameraInfluence:
    input?.cameraInfluence !== undefined && input.cameraInfluence >= 0
      ? input.cameraInfluence
      : DEFAULT_REACTIVITY.cameraInfluence,
  densityInfluence:
    input?.densityInfluence !== undefined && input.densityInfluence >= 0
      ? input.densityInfluence
      : DEFAULT_REACTIVITY.densityInfluence,
  terminatorBoost:
    input?.terminatorBoost !== undefined && input.terminatorBoost >= 0
      ? input.terminatorBoost
      : DEFAULT_REACTIVITY.terminatorBoost,
  horizonGlow:
    input?.horizonGlow !== undefined && input.horizonGlow >= 0
      ? input.horizonGlow
      : DEFAULT_REACTIVITY.horizonGlow,
  atmosphericScatter:
    input?.atmosphericScatter !== undefined && input.atmosphericScatter >= 0
      ? input.atmosphericScatter
      : DEFAULT_REACTIVITY.atmosphericScatter,
  surfaceMicroDetail:
    input?.surfaceMicroDetail !== undefined && input.surfaceMicroDetail >= 0
      ? input.surfaceMicroDetail
      : DEFAULT_REACTIVITY.surfaceMicroDetail,
  cityNightResponse:
    input?.cityNightResponse !== undefined && input.cityNightResponse >= 0
      ? input.cityNightResponse
      : DEFAULT_REACTIVITY.cityNightResponse,
  orbitalFlow:
    input?.orbitalFlow !== undefined && input.orbitalFlow >= 0
      ? input.orbitalFlow
      : DEFAULT_REACTIVITY.orbitalFlow,
});

const qualityToScalar = (quality: CinematicQuality, cameraDistance: number): number => {
  if (quality === 'ultra') return 1.2;
  if (quality === 'high') return 1;
  if (quality === 'balanced') return 0.72;
  return cameraDistance < 2.2 ? 1.2 : cameraDistance < 3.2 ? 1 : 0.78;
};
