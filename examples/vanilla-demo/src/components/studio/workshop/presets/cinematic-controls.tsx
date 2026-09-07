import {
  ColorField,
  SliderField,
  SwitchField,
  ToggleField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type { KnobsComponentProps } from '../configurators';

import { CinematicPostFxControls } from './cinematic-postfx-controls';

/**
 * Cinematic realism knobs — the second half of the Atmosphere workshop
 * card, rendered only when `kind === 'cinematic'`.
 *
 * Sections mirror the core kind's sub-configs:
 *  - **Sun** (`cinematic.sun`) — light rig. `fixed` pins the vector set
 *    by the Sun X/Y/Z sliders above; `realtime` derives the subsolar
 *    point from wall-clock time × time scale; `orbit` time-lapses the
 *    terminator westward at N degrees/second. Plus the visible sun disc
 *    (glare / size / tint).
 *  - **Clouds** (`cinematic.clouds`) — procedural shell above the
 *    surface, with optional shadows cast down onto it.
 *  - **Surface** (`cinematic.surface`) — relief, biome palette,
 *    shallows, moonlight and the snow line, plus the four biome tints.
 *  - **Aurora** (`cinematic.aurora`) — night-side auroral curtains.
 *  - **Atmosphere scatter** (`cinematic.atmosphere`) — Rayleigh / Mie
 *    strength, airglow, shell thickness.
 *  - **Sky** (`starfield.milkyWay`) — galactic band behind the planet.
 *  - **Textures** (`cinematic.textures`) — swap the procedural surface
 *    for the bundled 2k Earth maps.
 *  - **Post-processing** (`postprocessing`) — see the sibling module.
 *
 * Sentinels match the rest of the configurator: empty-string colour =
 * use the theme default, and non-positive numerics on positive-domain
 * knobs reset to the construction-time value.
 */

const sunModeOptions = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'realtime', label: 'Realtime' },
  { value: 'orbit', label: 'Orbit' },
] as const;

const textureOptions = [
  { value: 'none', label: 'Procedural' },
  { value: 'earth-2k', label: 'Earth 2k' },
] as const;

export function CinematicControls({ state, onGlobeChange }: KnobsComponentProps) {
  const settings = state.globe;

  return (
    <div className="space-y-4">
      <SectionHeading>Sun</SectionHeading>
      <ToggleField
        label="Sun mode"
        value={settings.cinematicSunMode}
        options={sunModeOptions}
        onChange={(cinematicSunMode) => onGlobeChange({ cinematicSunMode })}
      />
      <DependsOn when={settings.cinematicSunMode === 'orbit'} variant="hidden">
        <SliderField
          label="Orbit speed"
          value={settings.cinematicSunSpeed}
          min={0.5}
          max={90}
          step={0.5}
          format={(value) => `${value.toFixed(1)}°/s`}
          onChange={(cinematicSunSpeed) => onGlobeChange({ cinematicSunSpeed })}
        />
      </DependsOn>
      <DependsOn when={settings.cinematicSunMode === 'realtime'} variant="hidden">
        <SliderField
          label="Time scale"
          value={settings.cinematicSunTimeScale}
          min={1}
          max={3600}
          step={1}
          format={(value) => `×${value.toFixed(0)}`}
          onChange={(cinematicSunTimeScale) => onGlobeChange({ cinematicSunTimeScale })}
        />
      </DependsOn>
      <SwitchField
        label="Sun disc"
        checked={settings.cinematicSunVisible}
        onChange={(cinematicSunVisible) => onGlobeChange({ cinematicSunVisible })}
        value="Draw the star itself far along the light direction"
      />
      <DependsOn
        when={settings.cinematicSunVisible}
        because="Enable Sun disc first."
        className="space-y-4"
      >
        <SliderField
          label="Glare"
          value={settings.cinematicSunGlare}
          min={0}
          max={2}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicSunGlare) => onGlobeChange({ cinematicSunGlare })}
        />
        <SliderField
          label="Disc size"
          value={settings.cinematicSunSize}
          min={0.3}
          max={3}
          step={0.05}
          format={(value) => `×${value.toFixed(2)}`}
          onChange={(cinematicSunSize) => onGlobeChange({ cinematicSunSize })}
        />
        <ColorField
          label="Sun tint"
          value={settings.cinematicSunColor || '#fff3d2'}
          onChange={(cinematicSunColor) => onGlobeChange({ cinematicSunColor })}
          hint={settings.cinematicSunColor === '' ? 'Theme default' : undefined}
          {...(settings.cinematicSunColor !== '' ? { preset: '' } : {})}
          swatches={['#fff3d2', '#ffffff', '#ffe9b0', '#ffd36a', '#ffb570', '#cfe4ff']}
        />
      </DependsOn>

      <SectionHeading>Clouds</SectionHeading>
      <SwitchField
        label="Cloud shell"
        checked={settings.cinematicClouds}
        onChange={(cinematicClouds) => onGlobeChange({ cinematicClouds })}
        value="Advecting weather layer above the surface"
      />
      <DependsOn
        when={settings.cinematicClouds}
        because="Enable Cloud shell first."
        className="space-y-4"
      >
        <SliderField
          label="Coverage"
          value={settings.cinematicCloudCoverage}
          min={0}
          max={1}
          step={0.01}
          format={(value) => `${(value * 100).toFixed(0)}%`}
          onChange={(cinematicCloudCoverage) => onGlobeChange({ cinematicCloudCoverage })}
        />
        <SliderField
          label="Cloud opacity"
          value={settings.cinematicCloudShellOpacity}
          min={0}
          max={1}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicCloudShellOpacity) =>
            onGlobeChange({ cinematicCloudShellOpacity })
          }
        />
        <SliderField
          label="Drift speed"
          value={settings.cinematicCloudSpeed}
          min={0}
          max={4}
          step={0.05}
          format={(value) => (value === 0 ? 'frozen' : `×${value.toFixed(2)}`)}
          onChange={(cinematicCloudSpeed) => onGlobeChange({ cinematicCloudSpeed })}
        />
        <SliderField
          label="Edge softness"
          value={settings.cinematicCloudSoftness}
          min={0}
          max={1}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicCloudSoftness) => onGlobeChange({ cinematicCloudSoftness })}
        />
        <SliderField
          label="Altitude"
          value={settings.cinematicCloudAltitude}
          min={0.003}
          max={0.03}
          step={0.001}
          format={(value) => `${(value * 100).toFixed(1)}% R`}
          onChange={(cinematicCloudAltitude) => onGlobeChange({ cinematicCloudAltitude })}
        />
        <SwitchField
          label="Cloud shadows"
          checked={settings.cinematicCloudShadows}
          onChange={(cinematicCloudShadows) => onGlobeChange({ cinematicCloudShadows })}
          value="Project the cloud density down onto the surface"
        />
        <DependsOn
          when={settings.cinematicCloudShadows}
          because="Enable Cloud shadows first."
        >
          <SliderField
            label="Shadow strength"
            value={settings.cinematicCloudShadowStrength}
            min={0}
            max={1}
            step={0.01}
            format={(value) => value.toFixed(2)}
            onChange={(cinematicCloudShadowStrength) =>
              onGlobeChange({ cinematicCloudShadowStrength })
            }
          />
        </DependsOn>
      </DependsOn>

      <SectionHeading>Surface</SectionHeading>
      <SliderField
        label="Relief"
        value={settings.cinematicRelief}
        min={0}
        max={2}
        step={0.05}
        format={(value) => (value === 0 ? 'flat' : `×${value.toFixed(2)}`)}
        onChange={(cinematicRelief) => onGlobeChange({ cinematicRelief })}
      />
      <SwitchField
        label="Biomes"
        checked={settings.cinematicBiomes}
        onChange={(cinematicBiomes) => onGlobeChange({ cinematicBiomes })}
        value="Latitude / altitude / moisture driven land palette"
      />
      <SliderField
        label="Shallows"
        value={settings.cinematicShallows}
        min={0}
        max={1}
        step={0.01}
        format={(value) => value.toFixed(2)}
        onChange={(cinematicShallows) => onGlobeChange({ cinematicShallows })}
      />
      <SliderField
        label="Moonlight"
        value={settings.cinematicMoonlight}
        min={0}
        max={2}
        step={0.05}
        format={(value) => (value === 0 ? 'off' : `×${value.toFixed(2)}`)}
        onChange={(cinematicMoonlight) => onGlobeChange({ cinematicMoonlight })}
      />
      <SliderField
        label="Snow line"
        value={settings.cinematicSnowLine}
        min={0.3}
        max={1}
        step={0.01}
        format={(value) => value.toFixed(2)}
        onChange={(cinematicSnowLine) => onGlobeChange({ cinematicSnowLine })}
      />
      <ColorField
        label="Ice"
        value={settings.cinematicIceColor || '#eaf6ff'}
        onChange={(cinematicIceColor) => onGlobeChange({ cinematicIceColor })}
        hint={settings.cinematicIceColor === '' ? 'Theme default' : undefined}
        {...(settings.cinematicIceColor !== '' ? { preset: '' } : {})}
        swatches={['#eaf6ff', '#ffffff', '#dbeafe', '#cfe4ff', '#bcd7f0', '#f2fbff']}
      />
      <ColorField
        label="Vegetation"
        value={settings.cinematicVegetationColor || '#3f6b34'}
        onChange={(cinematicVegetationColor) => onGlobeChange({ cinematicVegetationColor })}
        hint={settings.cinematicVegetationColor === '' ? 'Theme default' : undefined}
        {...(settings.cinematicVegetationColor !== '' ? { preset: '' } : {})}
        swatches={['#3f6b34', '#2f5a2a', '#568c3e', '#6f9a45', '#274d33', '#8aa64f']}
      />
      <ColorField
        label="Desert"
        value={settings.cinematicDesertColor || '#c2a06a'}
        onChange={(cinematicDesertColor) => onGlobeChange({ cinematicDesertColor })}
        hint={settings.cinematicDesertColor === '' ? 'Theme default' : undefined}
        {...(settings.cinematicDesertColor !== '' ? { preset: '' } : {})}
        swatches={['#c2a06a', '#d8b87d', '#b78d52', '#e3c98f', '#9a7644', '#efdcae']}
      />
      <ColorField
        label="Shallow water"
        value={settings.cinematicShallowWaterColor || '#2fb6c4'}
        onChange={(cinematicShallowWaterColor) =>
          onGlobeChange({ cinematicShallowWaterColor })
        }
        hint={settings.cinematicShallowWaterColor === '' ? 'Theme default' : undefined}
        {...(settings.cinematicShallowWaterColor !== '' ? { preset: '' } : {})}
        swatches={['#2fb6c4', '#3fd0d8', '#1f8fa8', '#63dbe3', '#0f6f86', '#9ceef2']}
      />

      <SectionHeading>Aurora</SectionHeading>
      <SwitchField
        label="Aurora"
        checked={settings.cinematicAurora}
        onChange={(cinematicAurora) => onGlobeChange({ cinematicAurora })}
        value="Night-side curtains near the geomagnetic poles"
      />
      <DependsOn
        when={settings.cinematicAurora}
        because="Enable Aurora first."
        className="space-y-4"
      >
        <SliderField
          label="Intensity"
          value={settings.cinematicAuroraIntensity}
          min={0}
          max={2}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicAuroraIntensity) =>
            onGlobeChange({ cinematicAuroraIntensity })
          }
        />
        <SliderField
          label="Curtain speed"
          value={settings.cinematicAuroraSpeed}
          min={0}
          max={3}
          step={0.05}
          format={(value) => (value === 0 ? 'frozen' : `×${value.toFixed(2)}`)}
          onChange={(cinematicAuroraSpeed) => onGlobeChange({ cinematicAuroraSpeed })}
        />
        <SliderField
          label="Oval latitude"
          value={settings.cinematicAuroraLatitude}
          min={55}
          max={80}
          step={0.5}
          format={(value) => `${value.toFixed(1)}°`}
          onChange={(cinematicAuroraLatitude) =>
            onGlobeChange({ cinematicAuroraLatitude })
          }
        />
        <ColorField
          label="Aurora base"
          value={settings.cinematicAuroraColor || '#3ef2a5'}
          onChange={(cinematicAuroraColor) => onGlobeChange({ cinematicAuroraColor })}
          hint={settings.cinematicAuroraColor === '' ? 'Theme default' : undefined}
          {...(settings.cinematicAuroraColor !== '' ? { preset: '' } : {})}
          swatches={['#3ef2a5', '#34d399', '#22d3ee', '#7df9ff', '#a78bfa', '#84cc16']}
        />
        <ColorField
          label="Aurora tip"
          value={settings.cinematicAuroraTopColor || '#b06cf0'}
          onChange={(cinematicAuroraTopColor) =>
            onGlobeChange({ cinematicAuroraTopColor })
          }
          hint={settings.cinematicAuroraTopColor === '' ? 'Theme default' : undefined}
          {...(settings.cinematicAuroraTopColor !== '' ? { preset: '' } : {})}
          swatches={['#b06cf0', '#a78bfa', '#f472b6', '#67e8f9', '#ffffff', '#5b8cff']}
        />
      </DependsOn>

      <SectionHeading>Atmosphere scatter</SectionHeading>
      <SliderField
        label="Rayleigh scatter"
        value={settings.cinematicScatter}
        min={0}
        max={3}
        step={0.05}
        format={(value) => (value === 0 ? 'off' : `×${value.toFixed(2)}`)}
        onChange={(cinematicScatter) => onGlobeChange({ cinematicScatter })}
      />
      <SliderField
        label="Mie halo"
        value={settings.cinematicMie}
        min={0}
        max={3}
        step={0.05}
        format={(value) => (value === 0 ? 'off' : `×${value.toFixed(2)}`)}
        onChange={(cinematicMie) => onGlobeChange({ cinematicMie })}
      />
      <SliderField
        label="Airglow"
        value={settings.cinematicAirglow}
        min={0}
        max={1}
        step={0.01}
        format={(value) => value.toFixed(2)}
        onChange={(cinematicAirglow) => onGlobeChange({ cinematicAirglow })}
      />
      <SliderField
        label="Shell thickness"
        value={settings.cinematicAtmosphereThickness}
        min={0.02}
        max={0.2}
        step={0.005}
        format={(value) => `${(value * 100).toFixed(1)}% R`}
        onChange={(cinematicAtmosphereThickness) =>
          onGlobeChange({ cinematicAtmosphereThickness })
        }
      />

      <SectionHeading>Sky</SectionHeading>
      <SwitchField
        label="Milky Way"
        checked={settings.cinematicMilkyWay}
        onChange={(cinematicMilkyWay) => onGlobeChange({ cinematicMilkyWay })}
        value="Dusty galactic band behind the starfield"
      />
      <DependsOn when={settings.cinematicMilkyWay} because="Enable Milky Way first.">
        <SliderField
          label="Band brightness"
          value={settings.cinematicMilkyWayIntensity}
          min={0}
          max={1.5}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(cinematicMilkyWayIntensity) =>
            onGlobeChange({ cinematicMilkyWayIntensity })
          }
        />
      </DependsOn>

      <SectionHeading>Textures</SectionHeading>
      <ToggleField
        label="Surface maps"
        value={settings.cinematicTextures}
        options={textureOptions}
        onChange={(cinematicTextures) => onGlobeChange({ cinematicTextures })}
      />

      <CinematicPostFxControls state={state} onGlobeChange={onGlobeChange} />
    </div>
  );
}

/**
 * Shared with the post-processing module so both halves of the card use
 * one heading style. Mirrors the private heading in `atmosphere.tsx`.
 */
export function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-cyan-200/75">
      {children}
    </p>
  );
}
