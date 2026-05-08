import { Color, Vector3 } from 'three';
import type { IUniform } from 'three';

export interface CinematicUniforms {
  readonly uTime: IUniform<number>;
  readonly uLightDirection: IUniform<Vector3>;
  readonly uCameraDistance: IUniform<number>;
  readonly uLightInfluence: IUniform<number>;
  readonly uCameraInfluence: IUniform<number>;
  readonly uDensityInfluence: IUniform<number>;
  readonly uTerminatorBoost: IUniform<number>;
  readonly uHorizonGlow: IUniform<number>;
  readonly uAtmosphericScatter: IUniform<number>;
  readonly uSurfaceMicroDetail: IUniform<number>;
  readonly uCityNightResponse: IUniform<number>;
  readonly uOrbitalFlow: IUniform<number>;
  readonly uInteractionEnergy: IUniform<number>;
  readonly uQuality: IUniform<number>;
  readonly uCameraDirection: IUniform<Vector3>;
}

export const createCinematicUniforms = (): CinematicUniforms => ({
  uTime: { value: 0 },
  uLightDirection: { value: new Vector3(-0.55, 0.72, 0.42).normalize() },
  uCameraDistance: { value: 3 },
  uLightInfluence: { value: 1 },
  uCameraInfluence: { value: 1 },
  uDensityInfluence: { value: 1 },
  uTerminatorBoost: { value: 1 },
  uHorizonGlow: { value: 1 },
  uAtmosphericScatter: { value: 1 },
  uSurfaceMicroDetail: { value: 1 },
  uCityNightResponse: { value: 1 },
  uOrbitalFlow: { value: 1 },
  uInteractionEnergy: { value: 0 },
  uQuality: { value: 1 },
  uCameraDirection: { value: new Vector3(0, 0, 1) },
});

export const cloneCinematicUniforms = (source: CinematicUniforms): CinematicUniforms => ({
  uTime: { value: source.uTime.value },
  uLightDirection: { value: source.uLightDirection.value.clone() },
  uCameraDistance: { value: source.uCameraDistance.value },
  uLightInfluence: { value: source.uLightInfluence.value },
  uCameraInfluence: { value: source.uCameraInfluence.value },
  uDensityInfluence: { value: source.uDensityInfluence.value },
  uTerminatorBoost: { value: source.uTerminatorBoost.value },
  uHorizonGlow: { value: source.uHorizonGlow.value },
  uAtmosphericScatter: { value: source.uAtmosphericScatter.value },
  uSurfaceMicroDetail: { value: source.uSurfaceMicroDetail.value },
  uCityNightResponse: { value: source.uCityNightResponse.value },
  uOrbitalFlow: { value: source.uOrbitalFlow.value },
  uInteractionEnergy: { value: source.uInteractionEnergy.value },
  uQuality: { value: source.uQuality.value },
  uCameraDirection: { value: source.uCameraDirection.value.clone() },
});

export const syncCinematicUniforms = (
  target: CinematicUniforms,
  source: CinematicUniforms,
): void => {
  target.uTime.value = source.uTime.value;
  target.uLightDirection.value.copy(source.uLightDirection.value);
  target.uCameraDistance.value = source.uCameraDistance.value;
  target.uLightInfluence.value = source.uLightInfluence.value;
  target.uCameraInfluence.value = source.uCameraInfluence.value;
  target.uDensityInfluence.value = source.uDensityInfluence.value;
  target.uTerminatorBoost.value = source.uTerminatorBoost.value;
  target.uHorizonGlow.value = source.uHorizonGlow.value;
  target.uAtmosphericScatter.value = source.uAtmosphericScatter.value;
  target.uSurfaceMicroDetail.value = source.uSurfaceMicroDetail.value;
  target.uCityNightResponse.value = source.uCityNightResponse.value;
  target.uOrbitalFlow.value = source.uOrbitalFlow.value;
  target.uInteractionEnergy.value = source.uInteractionEnergy.value;
  target.uQuality.value = source.uQuality.value;
  target.uCameraDirection.value.copy(source.uCameraDirection.value);
};

export const shaderColor = (color: string): { value: Color } => ({
  value: new Color(color),
});
