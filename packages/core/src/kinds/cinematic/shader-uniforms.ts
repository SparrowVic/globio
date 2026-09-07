// Cinematic shader uniform registry.
//
// Every cinematic layer (surface, clouds, atmosphere, borders, city-lights,
// network, arcs) shares the same set of "world" uniforms — light + moon
// direction, camera state, reactivity scalars, terminator bands,
// interaction memory, exposure, cloud field parameters, aurora parameters.
// The `CinematicWorld` engine writes them once per frame; each layer
// clones the descriptor and copies the values into its own `ShaderMaterial`
// uniforms map. Adding a uniform here therefore makes it available to
// every layer with no further plumbing.

import { Color, Vector3 } from 'three';
import type { IUniform } from 'three';

export interface CinematicUniforms {
  readonly uTime: IUniform<number>;
  readonly uLightDirection: IUniform<Vector3>;
  readonly uCameraDistance: IUniform<number>;
  readonly uCameraDirection: IUniform<Vector3>;

  // Reactivity dials (live from CinematicConfig.reactivity)
  readonly uLightInfluence: IUniform<number>;
  readonly uCameraInfluence: IUniform<number>;
  readonly uDensityInfluence: IUniform<number>;
  readonly uTerminatorBoost: IUniform<number>;
  readonly uHorizonGlow: IUniform<number>;
  readonly uAtmosphericScatter: IUniform<number>;
  readonly uSurfaceMicroDetail: IUniform<number>;
  readonly uCityNightResponse: IUniform<number>;
  readonly uOrbitalFlow: IUniform<number>;

  // Interaction state
  readonly uInteractionEnergy: IUniform<number>;       // global decay (0..1)
  readonly uInteractionPoint: IUniform<Vector3>;       // last surface contact (world space, length=GLOBE_RADIUS), zero ⇒ none
  readonly uInteractionAge: IUniform<number>;          // seconds since interaction; large ⇒ no glow
  readonly uInteractionRadius: IUniform<number>;       // geodesic falloff radius in radians

  // Aggregated world signal — sum of importance·visibility over current
  // frame's hemisphere, normalised so a uniform city dataset is ~0.5.
  readonly uVisibleCityEnergy: IUniform<number>;

  // Terminator + atmosphere base parameters used across every layer
  readonly uTerminatorSoftness: IUniform<number>;
  readonly uTerminatorContrast: IUniform<number>;

  // Performance / quality scalar (0.7..1.3 typical)
  readonly uQuality: IUniform<number>;

  // Exposure multiplier feeding the surface / cloud ACES filmic curve. The
  // post pipeline never tone-maps again — it only adds bloom / streak and
  // soft-clips highlights on top of the display-referred frame.
  readonly uExposure: IUniform<number>;

  // Sun + moon rig
  readonly uSunColor: IUniform<Color>;
  readonly uMoonDirection: IUniform<Vector3>;
  readonly uMoonColor: IUniform<Color>;
  readonly uMoonlight: IUniform<number>;

  // Cloud field (shared by the cloud shell and the surface shadows)
  readonly uCloudCoverage: IUniform<number>;
  readonly uCloudSpeed: IUniform<number>;
  readonly uCloudSoftness: IUniform<number>;
  readonly uCloudAltitude: IUniform<number>;
  readonly uCloudShadowStrength: IUniform<number>;

  // Aurora (surface emission + atmosphere glow)
  readonly uAuroraIntensity: IUniform<number>;
  readonly uAuroraSpeed: IUniform<number>;
  readonly uAuroraLatitude: IUniform<number>;          // radians
  readonly uAuroraColor: IUniform<Color>;
  readonly uAuroraTopColor: IUniform<Color>;
}

export const createCinematicUniforms = (): CinematicUniforms => ({
  uTime: { value: 0 },
  uLightDirection: { value: new Vector3(-0.62, 0.55, 0.55).normalize() },
  uCameraDistance: { value: 3 },
  uCameraDirection: { value: new Vector3(0, 0, 1) },

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
  uInteractionPoint: { value: new Vector3(0, 0, 0) },
  uInteractionAge: { value: 99 },
  uInteractionRadius: { value: 0.34 },

  uVisibleCityEnergy: { value: 0.42 },

  uTerminatorSoftness: { value: 0.42 },
  uTerminatorContrast: { value: 1.45 },

  uQuality: { value: 1 },
  uExposure: { value: 1.05 },

  uSunColor: { value: new Color('#fff1c9') },
  uMoonDirection: { value: new Vector3(0.62, -0.1, -0.78).normalize() },
  uMoonColor: { value: new Color('#a9c4ff') },
  uMoonlight: { value: 1 },

  uCloudCoverage: { value: 0.42 },
  uCloudSpeed: { value: 1 },
  uCloudSoftness: { value: 0.5 },
  uCloudAltitude: { value: 0.009 },
  uCloudShadowStrength: { value: 0.45 },

  uAuroraIntensity: { value: 0.8 },
  uAuroraSpeed: { value: 1 },
  uAuroraLatitude: { value: (68 * Math.PI) / 180 },
  uAuroraColor: { value: new Color('#4dffa6') },
  uAuroraTopColor: { value: new Color('#8d5cff') },
});

export const cloneCinematicUniforms = (source: CinematicUniforms): CinematicUniforms => ({
  uTime: { value: source.uTime.value },
  uLightDirection: { value: source.uLightDirection.value.clone() },
  uCameraDistance: { value: source.uCameraDistance.value },
  uCameraDirection: { value: source.uCameraDirection.value.clone() },

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
  uInteractionPoint: { value: source.uInteractionPoint.value.clone() },
  uInteractionAge: { value: source.uInteractionAge.value },
  uInteractionRadius: { value: source.uInteractionRadius.value },

  uVisibleCityEnergy: { value: source.uVisibleCityEnergy.value },

  uTerminatorSoftness: { value: source.uTerminatorSoftness.value },
  uTerminatorContrast: { value: source.uTerminatorContrast.value },

  uQuality: { value: source.uQuality.value },
  uExposure: { value: source.uExposure.value },

  uSunColor: { value: source.uSunColor.value.clone() },
  uMoonDirection: { value: source.uMoonDirection.value.clone() },
  uMoonColor: { value: source.uMoonColor.value.clone() },
  uMoonlight: { value: source.uMoonlight.value },

  uCloudCoverage: { value: source.uCloudCoverage.value },
  uCloudSpeed: { value: source.uCloudSpeed.value },
  uCloudSoftness: { value: source.uCloudSoftness.value },
  uCloudAltitude: { value: source.uCloudAltitude.value },
  uCloudShadowStrength: { value: source.uCloudShadowStrength.value },

  uAuroraIntensity: { value: source.uAuroraIntensity.value },
  uAuroraSpeed: { value: source.uAuroraSpeed.value },
  uAuroraLatitude: { value: source.uAuroraLatitude.value },
  uAuroraColor: { value: source.uAuroraColor.value.clone() },
  uAuroraTopColor: { value: source.uAuroraTopColor.value.clone() },
});

export const syncCinematicUniforms = (
  target: CinematicUniforms,
  source: CinematicUniforms,
): void => {
  target.uTime.value = source.uTime.value;
  target.uLightDirection.value.copy(source.uLightDirection.value);
  target.uCameraDistance.value = source.uCameraDistance.value;
  target.uCameraDirection.value.copy(source.uCameraDirection.value);

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
  target.uInteractionPoint.value.copy(source.uInteractionPoint.value);
  target.uInteractionAge.value = source.uInteractionAge.value;
  target.uInteractionRadius.value = source.uInteractionRadius.value;

  target.uVisibleCityEnergy.value = source.uVisibleCityEnergy.value;

  target.uTerminatorSoftness.value = source.uTerminatorSoftness.value;
  target.uTerminatorContrast.value = source.uTerminatorContrast.value;

  target.uQuality.value = source.uQuality.value;
  target.uExposure.value = source.uExposure.value;

  target.uSunColor.value.copy(source.uSunColor.value);
  target.uMoonDirection.value.copy(source.uMoonDirection.value);
  target.uMoonColor.value.copy(source.uMoonColor.value);
  target.uMoonlight.value = source.uMoonlight.value;

  target.uCloudCoverage.value = source.uCloudCoverage.value;
  target.uCloudSpeed.value = source.uCloudSpeed.value;
  target.uCloudSoftness.value = source.uCloudSoftness.value;
  target.uCloudAltitude.value = source.uCloudAltitude.value;
  target.uCloudShadowStrength.value = source.uCloudShadowStrength.value;

  target.uAuroraIntensity.value = source.uAuroraIntensity.value;
  target.uAuroraSpeed.value = source.uAuroraSpeed.value;
  target.uAuroraLatitude.value = source.uAuroraLatitude.value;
  target.uAuroraColor.value.copy(source.uAuroraColor.value);
  target.uAuroraTopColor.value.copy(source.uAuroraTopColor.value);
};

/**
 * Copy every shared uniform value into a material's uniform map. Materials
 * only receive the keys they declare, so a layer that ignores (say) the
 * aurora block simply never declares those uniforms.
 */
export const applyCinematicUniforms = (
  material: { readonly uniforms: Record<string, IUniform> },
  uniforms: CinematicUniforms,
): void => {
  for (const [key, uniform] of Object.entries(uniforms)) {
    const target = material.uniforms[key];
    if (target) target.value = uniform.value;
  }
};

export const shaderColor = (color: string): { value: Color } => ({
  value: new Color(color),
});
