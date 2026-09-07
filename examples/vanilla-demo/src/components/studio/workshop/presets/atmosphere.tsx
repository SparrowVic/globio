import {
  ColorField,
  SliderField,
  SwitchField,
  ToggleField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';
import { CinematicControls } from './cinematic-controls';

/**
 * Atmosphere configurator preset.
 *
 * Cinematography: parked over the empty Pacific so the soft Fresnel
 * halo reads against open ocean — no continent crowding the silhouette,
 * the user sees the rim falloff cleanly. Slow rotate.
 *
 * Knobs cover the full atmosphere shader surface:
 *  - master toggle (visibility flip)
 *  - color + intensity (theme overrides)
 *  - geometry: mesh radius scale (1.01..1.5 — tight rim ↔ wide aurora)
 *  - shape: Fresnel exponent (sharp vs diffuse) + threshold (where the
 *    rim starts) — together they let you dial from "razor edge" to
 *    "soft glow filling the whole silhouette"
 *  - render side (back / front / double) and blending (additive / normal)
 *  - optional brightness pulse for an "atmosphere is alive" breath
 *
 * All knobs are live — empty-string color / 0-or-negative numerics
 * reset to the theme's construction-time value.
 */

const sideOptions = [
  { value: 'back', label: 'Back' },
  { value: 'front', label: 'Front' },
  { value: 'double', label: 'Both' },
] as const;

const blendingOptions = [
  { value: 'additive', label: 'Additive' },
  { value: 'normal', label: 'Normal' },
] as const;

const cinematicLightingOptions = [
  { value: 'hero', label: 'Hero' },
  { value: 'natural', label: 'Natural' },
  { value: 'eclipse', label: 'Eclipse' },
] as const;

const cinematicQualityOptions = [
  { value: 'ultra', label: 'Ultra' },
  { value: 'high', label: 'High' },
  { value: 'auto', label: 'Auto' },
  { value: 'balanced', label: 'Balanced' },
] as const;

const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
      <DependsOn
        when={settings.kind !== 'cinematic'}
        variant="hidden"
        className="space-y-4"
      >
        <SwitchField
          label="Atmosphere halo"
          checked={settings.atmosphere}
          onChange={(atmosphere) => onGlobeChange({ atmosphere })}
          value="Soft Fresnel rim glow around the silhouette"
        />

        <DependsOn
          when={settings.atmosphere}
          because="Enable Atmosphere first."
          className="space-y-4"
        >
          <SectionHeading>Color</SectionHeading>
          <ColorField
            label="Halo tint"
            value={settings.atmosphereColor || '#67e8f9'}
            onChange={(atmosphereColor) => onGlobeChange({ atmosphereColor })}
            hint={settings.atmosphereColor === '' ? 'Theme default' : undefined}
            {...(settings.atmosphereColor !== '' ? { preset: '' } : {})}
            swatches={[
              '#67e8f9',
              '#22d3ee',
              '#a78bfa',
              '#f472b6',
              '#fbbf24',
              '#34d399',
              '#84cc16',
              '#ef4444',
              '#fde68a',
              '#ffffff',
              '#cfdcff',
              '#ffd28a',
            ]}
          />
          <SliderField
            label="Brightness"
            value={settings.atmosphereIntensity}
            min={0}
            max={3}
            step={0.05}
            format={(value) => (value === 0 ? 'theme default' : `${value.toFixed(2)}`)}
            onChange={(atmosphereIntensity) => onGlobeChange({ atmosphereIntensity })}
          />

        <SectionHeading>Geometry</SectionHeading>
        <SliderField
          label="Mesh radius scale"
          value={settings.atmosphereRadiusScale}
          min={0}
          max={1.5}
          step={0.01}
          format={(value) =>
            value <= 1 ? 'theme default' : `×${value.toFixed(2)}`
          }
          onChange={(atmosphereRadiusScale) => onGlobeChange({ atmosphereRadiusScale })}
        />

        <SectionHeading>Fresnel shape</SectionHeading>
        <SliderField
          label="Sharpness"
          value={settings.atmospherePower}
          min={0}
          max={6}
          step={0.1}
          format={(value) =>
            value <= 0 ? 'theme default' : value.toFixed(1)
          }
          onChange={(atmospherePower) => onGlobeChange({ atmospherePower })}
        />
        <SliderField
          label="Rim threshold"
          value={settings.atmosphereThreshold}
          min={0.1}
          max={1.5}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(atmosphereThreshold) => onGlobeChange({ atmosphereThreshold })}
        />

        <SectionHeading>Render</SectionHeading>
        <ToggleField
          label="Side"
          value={settings.atmosphereSide}
          options={sideOptions}
          onChange={(atmosphereSide) => onGlobeChange({ atmosphereSide })}
        />
        <ToggleField
          label="Blending"
          value={settings.atmosphereBlending}
          options={blendingOptions}
          onChange={(atmosphereBlending) => onGlobeChange({ atmosphereBlending })}
        />

        <SectionHeading>Pulse</SectionHeading>
        <SwitchField
          label="Brightness oscillation"
          checked={settings.atmospherePulse}
          onChange={(atmospherePulse) => onGlobeChange({ atmospherePulse })}
          value="Halo breathes in and out — atmospheric alive feel"
        />
        <DependsOn
          when={settings.atmospherePulse}
          because="Enable Brightness oscillation first."
          className="space-y-4"
        >
          <SliderField
            label="Speed"
            value={settings.atmospherePulseSpeed}
            min={0.05}
            max={2}
            step={0.05}
            format={(value) => `${value.toFixed(2)} Hz`}
            onChange={(atmospherePulseSpeed) => onGlobeChange({ atmospherePulseSpeed })}
          />
          <SliderField
            label="Amplitude"
            value={settings.atmospherePulseAmplitude}
            min={0.05}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(atmospherePulseAmplitude) =>
              onGlobeChange({ atmospherePulseAmplitude })
            }
          />
        </DependsOn>
        </DependsOn>
      </DependsOn>

      <DependsOn
        when={settings.kind === 'cinematic'}
        variant="hidden"
        className="space-y-4"
      >
        <SectionHeading>Cinematic surface</SectionHeading>
        <ColorField
          label="Ocean"
          value={settings.cinematicOceanColor || '#02121f'}
          onChange={(cinematicOceanColor) => onGlobeChange({ cinematicOceanColor })}
          hint={settings.cinematicOceanColor === '' ? 'Theme default' : undefined}
          {...(settings.cinematicOceanColor !== '' ? { preset: '' } : {})}
          swatches={['#02121f', '#031622', '#061d2e', '#07111e', '#081827', '#0b2538']}
        />
        <ColorField
          label="Land wash"
          value={settings.cinematicLandColor || '#7d552e'}
          onChange={(cinematicLandColor) => onGlobeChange({ cinematicLandColor })}
          hint={settings.cinematicLandColor === '' ? 'Theme default' : undefined}
          {...(settings.cinematicLandColor !== '' ? { preset: '' } : {})}
          swatches={['#7d552e', '#9a6833', '#b77b38', '#d39b4e', '#5a412b', '#31424a']}
        />
        <ColorField
          label="Night side"
          value={settings.cinematicNightColor || '#020612'}
          onChange={(cinematicNightColor) => onGlobeChange({ cinematicNightColor })}
          hint={settings.cinematicNightColor === '' ? 'Theme default' : undefined}
          {...(settings.cinematicNightColor !== '' ? { preset: '' } : {})}
          swatches={['#020612', '#02050b', '#030817', '#050914', '#070711', '#080b18']}
        />
        <ColorField
          label="Cloud rim"
          value={settings.cinematicCloudColor || '#c8f0ff'}
          onChange={(cinematicCloudColor) => onGlobeChange({ cinematicCloudColor })}
          hint={settings.cinematicCloudColor === '' ? 'Theme default' : undefined}
          {...(settings.cinematicCloudColor !== '' ? { preset: '' } : {})}
          swatches={['#c8f0ff', '#ffffff', '#d8ecff', '#a9dcff', '#fff0b8', '#ffd36a']}
        />
        <SliderField
          label="Sun X"
          value={settings.cinematicLightX}
          min={-1}
          max={1}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicLightX) => onGlobeChange({ cinematicLightX })}
        />
        <SliderField
          label="Sun Y"
          value={settings.cinematicLightY}
          min={-1}
          max={1}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicLightY) => onGlobeChange({ cinematicLightY })}
        />
        <SliderField
          label="Sun Z"
          value={settings.cinematicLightZ}
          min={-1}
          max={1}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicLightZ) => onGlobeChange({ cinematicLightZ })}
        />

        <SectionHeading>Cinematic lighting</SectionHeading>
        <ToggleField
          label="Quality"
          value={settings.cinematicQuality}
          options={cinematicQualityOptions}
          onChange={(cinematicQuality) => onGlobeChange({ cinematicQuality })}
        />
        <ToggleField
          label="Lighting mode"
          value={settings.cinematicLightingMode}
          options={cinematicLightingOptions}
          onChange={(cinematicLightingMode) => onGlobeChange({ cinematicLightingMode })}
        />
        <SliderField
          label="Terminator softness"
          value={settings.cinematicTerminatorSoftness}
          min={0.08}
          max={0.9}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicTerminatorSoftness) =>
            onGlobeChange({ cinematicTerminatorSoftness })
          }
        />
        <SliderField
          label="Terminator contrast"
          value={settings.cinematicTerminatorContrast}
          min={0.55}
          max={2.2}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicTerminatorContrast) =>
            onGlobeChange({ cinematicTerminatorContrast })
          }
        />
        <SliderField
          label="Key light"
          value={settings.cinematicKeyIntensity}
          min={0.2}
          max={2.4}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicKeyIntensity) => onGlobeChange({ cinematicKeyIntensity })}
        />
        <SliderField
          label="Fill light"
          value={settings.cinematicFillIntensity}
          min={0}
          max={1.2}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicFillIntensity) => onGlobeChange({ cinematicFillIntensity })}
        />
        <ColorField
          label="Rim tint"
          value={settings.cinematicRimColor || '#b9ecff'}
          onChange={(cinematicRimColor) => onGlobeChange({ cinematicRimColor })}
          hint={settings.cinematicRimColor === '' ? 'Theme default' : undefined}
          {...(settings.cinematicRimColor !== '' ? { preset: '' } : {})}
          swatches={['#b9ecff', '#8bd8ff', '#ffffff', '#d8ecff', '#fff0b8', '#7df9ff']}
        />
        <SliderField
          label="Rim intensity"
          value={settings.cinematicRimIntensity}
          min={0}
          max={2.5}
          step={0.02}
          format={(value) => (value === 0 ? 'theme default' : value.toFixed(2))}
          onChange={(cinematicRimIntensity) => onGlobeChange({ cinematicRimIntensity })}
        />
        <SliderField
          label="Rim spread"
          value={settings.cinematicRimPower}
          min={0.5}
          max={5}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicRimPower) => onGlobeChange({ cinematicRimPower })}
        />
        <SliderField
          label="Ocean specular"
          value={settings.cinematicSpecularIntensity}
          min={0}
          max={2}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicSpecularIntensity) =>
            onGlobeChange({ cinematicSpecularIntensity })
          }
        />
        <SliderField
          label="Ocean sheen"
          value={settings.cinematicOceanSheen}
          min={0}
          max={1}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicOceanSheen) => onGlobeChange({ cinematicOceanSheen })}
        />

        <SectionHeading>Reactive field</SectionHeading>
        <SliderField
          label="Light coupling"
          value={settings.cinematicLightInfluence}
          min={0}
          max={2}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicLightInfluence) =>
            onGlobeChange({ cinematicLightInfluence })
          }
        />
        <SliderField
          label="Camera coupling"
          value={settings.cinematicCameraInfluence}
          min={0}
          max={2}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicCameraInfluence) =>
            onGlobeChange({ cinematicCameraInfluence })
          }
        />
        <SliderField
          label="Density coupling"
          value={settings.cinematicDensityInfluence}
          min={0}
          max={2}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicDensityInfluence) =>
            onGlobeChange({ cinematicDensityInfluence })
          }
        />
        <SliderField
          label="Twilight boost"
          value={settings.cinematicTerminatorBoost}
          min={0}
          max={2.5}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicTerminatorBoost) =>
            onGlobeChange({ cinematicTerminatorBoost })
          }
        />
        <SliderField
          label="Horizon glow"
          value={settings.cinematicHorizonGlow}
          min={0}
          max={2.5}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicHorizonGlow) => onGlobeChange({ cinematicHorizonGlow })}
        />
        <SliderField
          label="Atmospheric scatter"
          value={settings.cinematicAtmosphericScatter}
          min={0}
          max={2.5}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicAtmosphericScatter) =>
            onGlobeChange({ cinematicAtmosphericScatter })
          }
        />
        <SliderField
          label="Surface detail"
          value={settings.cinematicSurfaceMicroDetail}
          min={0}
          max={2.5}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicSurfaceMicroDetail) =>
            onGlobeChange({ cinematicSurfaceMicroDetail })
          }
        />
        <SliderField
          label="Night response"
          value={settings.cinematicCityNightResponse}
          min={0}
          max={2.5}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicCityNightResponse) =>
            onGlobeChange({ cinematicCityNightResponse })
          }
        />
        <SliderField
          label="Orbital flow"
          value={settings.cinematicOrbitalFlow}
          min={0}
          max={2.5}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicOrbitalFlow) => onGlobeChange({ cinematicOrbitalFlow })}
        />

        <SectionHeading>City lights</SectionHeading>
        <SwitchField
          label="City lights"
          checked={settings.cinematicCityLights}
          onChange={(cinematicCityLights) => onGlobeChange({ cinematicCityLights })}
          value="Dense warm point-data clusters on the night globe"
        />
        <DependsOn
          when={settings.cinematicCityLights}
          because="Enable City lights first."
          className="space-y-4"
        >
          <ColorField
            label="Light color"
            value={settings.cinematicCityLightColor || '#ffd36a'}
            onChange={(cinematicCityLightColor) => onGlobeChange({ cinematicCityLightColor })}
            hint={settings.cinematicCityLightColor === '' ? 'Theme default' : undefined}
            {...(settings.cinematicCityLightColor !== '' ? { preset: '' } : {})}
            swatches={['#ffd36a', '#fff0b8', '#f7b84d', '#ff9f43', '#7df9ff', '#34d399']}
          />
          <SliderField
            label="Intensity"
            value={settings.cinematicCityLightIntensity}
            min={0}
            max={2}
            step={0.02}
            format={(value) => (value === 0 ? 'theme default' : value.toFixed(2))}
            onChange={(cinematicCityLightIntensity) =>
              onGlobeChange({ cinematicCityLightIntensity })
            }
          />
          <SliderField
            label="Count"
            value={settings.cinematicCityLightCount}
            min={0}
            max={12000}
            step={100}
            format={(value) => `${Math.round(value)}`}
            onChange={(cinematicCityLightCount) => onGlobeChange({ cinematicCityLightCount })}
          />
          <SliderField
            label="Point size"
            value={settings.cinematicCityLightSize}
            min={0.001}
            max={0.016}
            step={0.0002}
            format={(value) => value.toFixed(4)}
            onChange={(cinematicCityLightSize) => onGlobeChange({ cinematicCityLightSize })}
          />
          <SwitchField
            label="Twinkle"
            checked={settings.cinematicCityLightTwinkle}
            onChange={(cinematicCityLightTwinkle) =>
              onGlobeChange({ cinematicCityLightTwinkle })
            }
            value="Subtle intensity shimmer per point"
          />
        </DependsOn>

        <SectionHeading>Surface network</SectionHeading>
        <SwitchField
          label="Network"
          checked={settings.cinematicNetwork}
          onChange={(cinematicNetwork) => onGlobeChange({ cinematicNetwork })}
          value="Low-orbit geodesic city-to-city traces"
        />
        <DependsOn
          when={settings.cinematicNetwork}
          because="Enable Network first."
          className="space-y-4"
        >
          <ColorField
            label="Network color"
            value={settings.cinematicNetworkColor || '#f7b84d'}
            onChange={(cinematicNetworkColor) => onGlobeChange({ cinematicNetworkColor })}
            hint={settings.cinematicNetworkColor === '' ? 'Theme default' : undefined}
            {...(settings.cinematicNetworkColor !== '' ? { preset: '' } : {})}
            swatches={['#f7b84d', '#ffd36a', '#fff0b8', '#7df9ff', '#22d3ee', '#34d399']}
          />
          <SliderField
            label="Opacity"
            value={settings.cinematicNetworkOpacity}
            min={0}
            max={1}
            step={0.01}
            format={(value) => value.toFixed(2)}
            onChange={(cinematicNetworkOpacity) => onGlobeChange({ cinematicNetworkOpacity })}
          />
          <SliderField
            label="Connections"
            value={settings.cinematicNetworkConnections}
            min={0}
            max={60}
            step={1}
            format={(value) => `${Math.round(value)}`}
            onChange={(cinematicNetworkConnections) =>
              onGlobeChange({ cinematicNetworkConnections })
            }
          />
          <SliderField
            label="Pulse speed"
            value={settings.cinematicNetworkPulseSpeed}
            min={0.02}
            max={1.5}
            step={0.02}
            format={(value) => `${value.toFixed(2)} Hz`}
            onChange={(cinematicNetworkPulseSpeed) =>
              onGlobeChange({ cinematicNetworkPulseSpeed })
            }
          />
        </DependsOn>

        <SectionHeading>Border glow</SectionHeading>
        <SwitchField
          label="Cinematic borders"
          checked={settings.cinematicBorders}
          onChange={(cinematicBorders) => onGlobeChange({ cinematicBorders })}
          value="Warm continental linework above the surface"
        />
        <DependsOn
          when={settings.cinematicBorders}
          because="Enable Cinematic borders first."
          className="space-y-4"
        >
          <ColorField
            label="Border color"
            value={settings.cinematicBorderColor || '#f6b44d'}
            onChange={(cinematicBorderColor) => onGlobeChange({ cinematicBorderColor })}
            hint={settings.cinematicBorderColor === '' ? 'Theme default' : undefined}
            {...(settings.cinematicBorderColor !== '' ? { preset: '' } : {})}
            swatches={['#f6b44d', '#ffd36a', '#fff0b8', '#fb923c', '#7df9ff', '#ffffff']}
          />
          <SliderField
            label="Border intensity"
            value={settings.cinematicBorderIntensity}
            min={0}
            max={3}
            step={0.05}
            format={(value) => (value === 0 ? 'theme default' : value.toFixed(2))}
            onChange={(cinematicBorderIntensity) =>
              onGlobeChange({ cinematicBorderIntensity })
            }
          />
        </DependsOn>

        {/* Realism pass: sun rig, clouds, surface detail, aurora,
            scattering, sky and the shared post-processing pipeline. */}
        <CinematicControls state={state} onGlobeChange={onGlobeChange} />
      </DependsOn>

      <DependsOn when={settings.kind !== 'cinematic'} variant="hidden">
        <p className="rounded-md border border-dashed border-cyan-200/[0.16] bg-cyan-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-cyan-100/80">
          Tip: combine{' '}
          <span className="text-white">Sharpness ≥ 3</span> with{' '}
          <span className="text-white">Mesh radius ×1.3</span> for a tight,
          razor-edge rim. Or set{' '}
          <span className="text-white">Sharpness ~ 0.8</span> +{' '}
          <span className="text-white">Side: Both</span> for a soft full-body
          haze that wraps the planet.
        </p>
      </DependsOn>
      <DependsOn when={settings.kind === 'cinematic'} variant="hidden">
        <p className="rounded-md border border-dashed border-amber-200/[0.16] bg-amber-200/[0.035] px-3 py-2 text-[10.5px] leading-relaxed text-amber-100/80">
          Tip: use <span className="text-white">Hero</span> lighting with a low{' '}
          <span className="text-white">Fill light</span> for a marketing-grade
          terminator, then push <span className="text-white">City lights</span>{' '}
          and <span className="text-white">Surface network</span> for night-side
          detail.
        </p>
      </DependsOn>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-cyan-200/75">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    initialLat: 6,
    initialLng: -150,
    speed: 0.014,
    framingPadding: 0.22,
    atmosphere: false,
    starfield: true,
    tagline: 'Hero lighting — surface rim, city lights, and network detail',
  },
  KnobsComponent,
  watchedKeys: [
    'atmosphere',
    'atmosphereColor',
    'atmosphereIntensity',
    'atmosphereRadiusScale',
    'atmospherePower',
    'atmosphereThreshold',
    'atmosphereSide',
    'atmosphereBlending',
    'atmospherePulse',
    'atmospherePulseSpeed',
    'atmospherePulseAmplitude',
    'cinematicOceanColor',
    'cinematicLandColor',
    'cinematicCloudColor',
    'cinematicNightColor',
    'cinematicLightX',
    'cinematicLightY',
    'cinematicLightZ',
    'cinematicLightingMode',
    'cinematicQuality',
    'cinematicTerminatorSoftness',
    'cinematicTerminatorContrast',
    'cinematicKeyIntensity',
    'cinematicFillIntensity',
    'cinematicRimColor',
    'cinematicRimIntensity',
    'cinematicRimPower',
    'cinematicSpecularIntensity',
    'cinematicOceanSheen',
    'cinematicLightInfluence',
    'cinematicCameraInfluence',
    'cinematicDensityInfluence',
    'cinematicTerminatorBoost',
    'cinematicHorizonGlow',
    'cinematicAtmosphericScatter',
    'cinematicSurfaceMicroDetail',
    'cinematicCityNightResponse',
    'cinematicOrbitalFlow',
    'cinematicBorders',
    'cinematicBorderColor',
    'cinematicBorderIntensity',
    'cinematicCityLights',
    'cinematicCityLightColor',
    'cinematicCityLightIntensity',
    'cinematicCityLightCount',
    'cinematicCityLightSize',
    'cinematicCityLightTwinkle',
    'cinematicNetwork',
    'cinematicNetworkColor',
    'cinematicNetworkOpacity',
    'cinematicNetworkConnections',
    'cinematicNetworkPulseSpeed',
    // Realism pass (rendered by <CinematicControls />).
    'cinematicSunMode',
    'cinematicSunSpeed',
    'cinematicSunTimeScale',
    'cinematicSunVisible',
    'cinematicSunGlare',
    'cinematicSunSize',
    'cinematicSunColor',
    'cinematicClouds',
    'cinematicCloudCoverage',
    'cinematicCloudShellOpacity',
    'cinematicCloudSpeed',
    'cinematicCloudSoftness',
    'cinematicCloudShadows',
    'cinematicCloudShadowStrength',
    'cinematicCloudAltitude',
    'cinematicRelief',
    'cinematicBiomes',
    'cinematicShallows',
    'cinematicMoonlight',
    'cinematicSnowLine',
    'cinematicIceColor',
    'cinematicVegetationColor',
    'cinematicDesertColor',
    'cinematicShallowWaterColor',
    'cinematicAurora',
    'cinematicAuroraIntensity',
    'cinematicAuroraSpeed',
    'cinematicAuroraLatitude',
    'cinematicAuroraColor',
    'cinematicAuroraTopColor',
    'cinematicScatter',
    'cinematicMie',
    'cinematicAirglow',
    'cinematicAtmosphereThickness',
    'cinematicTextures',
    'cinematicMilkyWay',
    'cinematicMilkyWayIntensity',
    'postfxEnabled',
    'postfxExposure',
    'postfxBloomStrength',
    'postfxBloomThreshold',
    'postfxBloomRadius',
    'postfxStreak',
    'postfxVignette',
    'postfxChromatic',
    'postfxGrain',
  ],
  // All atmosphere knobs are live (mesh.visible flip, shader uniforms,
  // single-mesh geometry rebuild for radiusScale, material side /
  // blending swap). No rebuild keys.
};

export default preset;
