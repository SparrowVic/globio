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

const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
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

      <p className="rounded-md border border-dashed border-cyan-200/[0.16] bg-cyan-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-cyan-100/80">
        Tip: combine{' '}
        <span className="text-white">Sharpness ≥ 3</span> with{' '}
        <span className="text-white">Mesh radius ×1.3</span> for a tight,
        razor-edge rim. Or set{' '}
        <span className="text-white">Sharpness ~ 0.8</span> +{' '}
        <span className="text-white">Side: Both</span> for a soft full-body
        haze that wraps the planet.
      </p>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-cyan-200/70">
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
    atmosphere: true,
    starfield: true,
    tagline: 'Pacific — empty silhouette so the rim glow reads cleanly',
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
  ],
  // All atmosphere knobs are live (mesh.visible flip, shader uniforms,
  // single-mesh geometry rebuild for radiusScale, material side /
  // blending swap). No rebuild keys.
};

export default preset;
