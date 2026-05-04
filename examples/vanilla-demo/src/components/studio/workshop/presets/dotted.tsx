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

const driftAxisOptions = [
  { value: 'ns', label: 'North–south' },
  { value: 'ew', label: 'East–west' },
  { value: 'both', label: 'Diagonal' },
] as const;

const DOTTED_SWATCHES: ReadonlyArray<string> = [
  '#7fdfff',
  '#67e8f9',
  '#22d3ee',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#34d399',
  '#84cc16',
  '#fde68a',
  '#ffffff',
  '#fee2e2',
  '#cfdcff',
];

const RIPPLE_SWATCHES: ReadonlyArray<string> = [
  '#ffffff',
  '#fde68a',
  '#fbbf24',
  '#67e8f9',
  '#a78bfa',
  '#f472b6',
  '#22d3ee',
  '#34d399',
  '#84cc16',
  '#fee2e2',
  '#7fdfff',
  '#cfdcff',
];

const FLASH_SWATCHES: ReadonlyArray<string> = [
  '#ffffff',
  '#fde68a',
  '#fef08a',
  '#fbbf24',
  '#f97316',
  '#ef4444',
  '#f472b6',
  '#a78bfa',
  '#67e8f9',
  '#22d3ee',
  '#34d399',
  '#84cc16',
];

const CONSTELLATION_SWATCHES: ReadonlyArray<string> = [
  '#7fdfff',
  '#a7f3d0',
  '#cfdcff',
  '#ffffff',
  '#fde68a',
  '#fbbf24',
  '#f472b6',
  '#a78bfa',
  '#67e8f9',
  '#22d3ee',
  '#84cc16',
  '#fee2e2',
];

/**
 * Dotted configurator preset.
 *
 * The dotted kind is a "dot field" — every effect emerges from the same
 * regular-grid Points cloud. This preset celebrates that personality by
 * exposing every dot-driven effect: ripples that brighten the dots they
 * sweep over, flashes that recolor a country's dots, drift waves, a
 * cursor wake that rides the cursor, latitude bands that emphasize
 * parallels, a global pulse breath, and constellation lines that
 * connect star-chart pairs from the country's own dots on hover.
 *
 * Cinematography: dotted-dark over the equator so latitude bands +
 * drift waves + the breath all read clearly without atmosphere haze.
 *
 * Every knob updates live via the new dotted kindHandle.setDottedConfig
 * setter — no rebuild keys, no flicker.
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;

  return (
    <div className="space-y-4">
      <DependsOn
        when={settings.kind === 'dotted'}
        because="Dotted-only feature. Switch the main globe to dotted kind to use it."
        className="space-y-4"
      >
        <SectionHeading>Color &amp; size</SectionHeading>
        <ColorField
          label="Dot color"
          value={settings.dottedColor || '#7fdfff'}
          onChange={(dottedColor) => onGlobeChange({ dottedColor })}
          hint={settings.dottedColor === '' ? 'Theme default' : undefined}
          {...(settings.dottedColor !== '' ? { preset: '' } : {})}
          swatches={DOTTED_SWATCHES}
        />
        <SliderField
          label="Size scale"
          value={settings.dottedSizeScale}
          min={0.4}
          max={3}
          step={0.05}
          format={(value) => `×${value.toFixed(2)}`}
          onChange={(dottedSizeScale) => onGlobeChange({ dottedSizeScale })}
        />
        <SliderField
          label="Master opacity"
          value={settings.dottedOpacity}
          min={0}
          max={1}
          step={0.02}
          format={(value) => (value === 0 ? 'Theme default' : value.toFixed(2))}
          onChange={(dottedOpacity) => onGlobeChange({ dottedOpacity })}
        />

        <SectionHeading>Click ripple</SectionHeading>
        <SwitchField
          label="Click ripple"
          checked={settings.dottedRipple}
          onChange={(dottedRipple) => onGlobeChange({ dottedRipple })}
          value="Sonar wave brightens dots it sweeps over — click anywhere"
        />
        <DependsOn
          when={settings.dottedRipple}
          because="Enable Click ripple first."
          className="space-y-4"
        >
          <SliderField
            label="Boost"
            value={settings.dottedRippleBoost}
            min={0}
            max={4}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(dottedRippleBoost) => onGlobeChange({ dottedRippleBoost })}
          />
          <SliderField
            label="Speed"
            value={settings.dottedRippleSpeed}
            min={0.2}
            max={4}
            step={0.05}
            format={(value) => `${value.toFixed(2)} rad/s`}
            onChange={(dottedRippleSpeed) => onGlobeChange({ dottedRippleSpeed })}
          />
          <SliderField
            label="Band width"
            value={settings.dottedRippleWidth}
            min={0.04}
            max={0.6}
            step={0.01}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(dottedRippleWidth) => onGlobeChange({ dottedRippleWidth })}
          />
          <SliderField
            label="Max concurrent"
            value={settings.dottedRippleMaxConcurrent}
            min={1}
            max={6}
            step={1}
            format={(value) => `${value}`}
            onChange={(dottedRippleMaxConcurrent) => onGlobeChange({ dottedRippleMaxConcurrent })}
          />
          <ColorField
            label="Wavefront color"
            value={settings.dottedRippleColor || '#ffffff'}
            onChange={(dottedRippleColor) => onGlobeChange({ dottedRippleColor })}
            hint={settings.dottedRippleColor === '' ? 'Brightened dot color' : undefined}
            {...(settings.dottedRippleColor !== '' ? { preset: '' } : {})}
            swatches={RIPPLE_SWATCHES}
          />
        </DependsOn>

        <SectionHeading>Data flash</SectionHeading>
        <SwitchField
          label="Data flash"
          checked={settings.dottedFlash}
          onChange={(dottedFlash) => onGlobeChange({ dottedFlash })}
          value="Country dots flash when their value changes"
        />
        <DependsOn
          when={settings.dottedFlash}
          because="Enable Data flash first."
          className="space-y-4"
        >
          <SliderField
            label="Strength"
            value={settings.dottedFlashStrength}
            min={0.1}
            max={4}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(dottedFlashStrength) => onGlobeChange({ dottedFlashStrength })}
          />
          <SliderField
            label="Decay"
            value={settings.dottedFlashDecay}
            min={0.5}
            max={10}
            step={0.1}
            format={(value) => `${value.toFixed(1)}/s`}
            onChange={(dottedFlashDecay) => onGlobeChange({ dottedFlashDecay })}
          />
          <ColorField
            label="Flash color"
            value={settings.dottedFlashColor || '#ffffff'}
            onChange={(dottedFlashColor) => onGlobeChange({ dottedFlashColor })}
            hint={settings.dottedFlashColor === '' ? 'Theme default' : undefined}
            {...(settings.dottedFlashColor !== '' ? { preset: '' } : {})}
            swatches={FLASH_SWATCHES}
          />
        </DependsOn>

        <SectionHeading>Drift wave</SectionHeading>
        <SwitchField
          label="Drift"
          checked={settings.dottedDrift}
          onChange={(dottedDrift) => onGlobeChange({ dottedDrift })}
          value="Slow ambient brightness wave across the dot field"
        />
        <DependsOn
          when={settings.dottedDrift}
          because="Enable Drift first."
          className="space-y-4"
        >
          <ToggleField
            label="Axis"
            value={settings.dottedDriftAxis}
            options={driftAxisOptions}
            onChange={(dottedDriftAxis) => onGlobeChange({ dottedDriftAxis })}
          />
          <SliderField
            label="Amplitude"
            value={settings.dottedDriftAmplitude}
            min={0}
            max={1}
            step={0.01}
            format={(value) => value.toFixed(2)}
            onChange={(dottedDriftAmplitude) => onGlobeChange({ dottedDriftAmplitude })}
          />
          <SliderField
            label="Speed"
            value={settings.dottedDriftSpeed}
            min={0}
            max={3}
            step={0.05}
            format={(value) => `${value.toFixed(2)} rad/s`}
            onChange={(dottedDriftSpeed) => onGlobeChange({ dottedDriftSpeed })}
          />
          <SliderField
            label="Frequency"
            value={settings.dottedDriftFreq}
            min={0.5}
            max={12}
            step={0.1}
            format={(value) => value.toFixed(1)}
            onChange={(dottedDriftFreq) => onGlobeChange({ dottedDriftFreq })}
          />
          <SwitchField
            label="Per-country phase"
            checked={settings.dottedDriftPerCountryPhase}
            onChange={(dottedDriftPerCountryPhase) =>
              onGlobeChange({ dottedDriftPerCountryPhase })
            }
            value="Each country breathes on its own offset — adjacent borders desync"
          />
        </DependsOn>

        <SectionHeading>Hover dots</SectionHeading>
        <SwitchField
          label="Hover expansion"
          checked={settings.dottedHoverDots}
          onChange={(dottedHoverDots) => onGlobeChange({ dottedHoverDots })}
          value="Hovered country's dots scale up + brighten"
        />
        <DependsOn
          when={settings.dottedHoverDots}
          because="Enable Hover expansion first."
          className="space-y-4"
        >
          <SliderField
            label="Scale"
            value={settings.dottedHoverScale}
            min={1}
            max={3}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(dottedHoverScale) => onGlobeChange({ dottedHoverScale })}
          />
          <SliderField
            label="Brightness boost"
            value={settings.dottedHoverBrightnessBoost}
            min={0}
            max={2}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(dottedHoverBrightnessBoost) =>
              onGlobeChange({ dottedHoverBrightnessBoost })
            }
          />
          <SliderField
            label="Ease duration"
            value={settings.dottedHoverDuration}
            min={0.05}
            max={1.5}
            step={0.01}
            format={(value) => `${(value * 1000).toFixed(0)} ms`}
            onChange={(dottedHoverDuration) => onGlobeChange({ dottedHoverDuration })}
          />
          <SliderField
            label="Hover lift"
            value={settings.dottedHoverLift}
            min={0}
            max={0.04}
            step={0.001}
            format={(value) =>
              value === 0 ? 'flat' : `+${(value * 100).toFixed(2)}% of radius`
            }
            onChange={(dottedHoverLift) => onGlobeChange({ dottedHoverLift })}
          />
        </DependsOn>

        <SectionHeading>Border dots</SectionHeading>
        <SwitchField
          label="Boundary dot ring"
          checked={settings.dottedBorderDots}
          onChange={(dottedBorderDots) => onGlobeChange({ dottedBorderDots })}
          value="Country boundary drawn as a brighter dot string on hover / pin"
        />
        <DependsOn
          when={settings.dottedBorderDots}
          because="Enable Boundary dot ring first."
          className="space-y-4"
        >
          <ColorField
            label="Color"
            value={settings.dottedBorderDotsColor || '#67e8f9'}
            onChange={(dottedBorderDotsColor) =>
              onGlobeChange({ dottedBorderDotsColor })
            }
            hint={settings.dottedBorderDotsColor === '' ? 'Theme dotted color' : undefined}
            {...(settings.dottedBorderDotsColor !== '' ? { preset: '' } : {})}
            swatches={[
              '#67e8f9',
              '#22d3ee',
              '#fbbf24',
              '#f472b6',
              '#34d399',
              '#a78bfa',
              '#fde68a',
              '#ffffff',
            ]}
          />
          <SliderField
            label="Dot size"
            value={settings.dottedBorderDotsSize}
            min={2}
            max={14}
            step={0.25}
            format={(value) => `${value.toFixed(2)} px`}
            onChange={(dottedBorderDotsSize) =>
              onGlobeChange({ dottedBorderDotsSize })
            }
          />
          <SliderField
            label="Peak opacity"
            value={settings.dottedBorderDotsOpacity}
            min={0.1}
            max={1.5}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(dottedBorderDotsOpacity) =>
              onGlobeChange({ dottedBorderDotsOpacity })
            }
          />
        </DependsOn>

        <SectionHeading>Pinned country</SectionHeading>
        <SwitchField
          label="Active pulse"
          checked={settings.dottedActiveCountry}
          onChange={(dottedActiveCountry) =>
            onGlobeChange({ dottedActiveCountry })
          }
          value="Pinned country's dots breathe with steady boost + slow sine"
        />
        <DependsOn
          when={settings.dottedActiveCountry}
          because="Enable Active pulse first."
          className="space-y-4"
        >
          <SliderField
            label="Brightness boost"
            value={settings.dottedActiveBoost}
            min={0}
            max={2}
            step={0.05}
            format={(value) => `+${value.toFixed(2)}`}
            onChange={(dottedActiveBoost) => onGlobeChange({ dottedActiveBoost })}
          />
          <SliderField
            label="Scale"
            value={settings.dottedActiveScale}
            min={1}
            max={2}
            step={0.02}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(dottedActiveScale) => onGlobeChange({ dottedActiveScale })}
          />
          <SliderField
            label="Pulse speed"
            value={settings.dottedActivePulseSpeed}
            min={0.05}
            max={2}
            step={0.05}
            format={(value) => `${value.toFixed(2)} Hz`}
            onChange={(dottedActivePulseSpeed) =>
              onGlobeChange({ dottedActivePulseSpeed })
            }
          />
          <SliderField
            label="Active lift"
            value={settings.dottedActiveLift}
            min={0}
            max={0.05}
            step={0.001}
            format={(value) =>
              value === 0 ? 'flat' : `+${(value * 100).toFixed(2)}% of radius`
            }
            onChange={(dottedActiveLift) => onGlobeChange({ dottedActiveLift })}
          />
        </DependsOn>

        <SectionHeading>Cursor wake</SectionHeading>
        <SwitchField
          label="Cursor wake"
          checked={settings.dottedCursorWake}
          onChange={(dottedCursorWake) => onGlobeChange({ dottedCursorWake })}
          value="Soft ripple trails the cursor across the dot field"
        />
        <DependsOn
          when={settings.dottedCursorWake}
          because="Enable Cursor wake first."
          className="space-y-4"
        >
          <SliderField
            label="Amplitude"
            value={settings.dottedCursorWakeAmplitude}
            min={0}
            max={2}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(dottedCursorWakeAmplitude) =>
              onGlobeChange({ dottedCursorWakeAmplitude })
            }
          />
          <SliderField
            label="Fade"
            value={settings.dottedCursorWakeFade}
            min={0.1}
            max={1.5}
            step={0.02}
            format={(value) => `${(value * 1000).toFixed(0)} ms`}
            onChange={(dottedCursorWakeFade) => onGlobeChange({ dottedCursorWakeFade })}
          />
          <SliderField
            label="Width"
            value={settings.dottedCursorWakeWidth}
            min={0.02}
            max={0.4}
            step={0.005}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(dottedCursorWakeWidth) => onGlobeChange({ dottedCursorWakeWidth })}
          />
        </DependsOn>

        <SectionHeading>Latitude bands</SectionHeading>
        <SwitchField
          label="Equator + tropics"
          checked={settings.dottedLatitudeBands}
          onChange={(dottedLatitudeBands) => onGlobeChange({ dottedLatitudeBands })}
          value="Brightness boost on the equator and ±23.5° parallels"
        />
        <DependsOn
          when={settings.dottedLatitudeBands}
          because="Enable Latitude bands first."
          className="space-y-4"
        >
          <SliderField
            label="Equator boost"
            value={settings.dottedEquatorBoost}
            min={0}
            max={1.5}
            step={0.02}
            format={(value) => `+${value.toFixed(2)}`}
            onChange={(dottedEquatorBoost) => onGlobeChange({ dottedEquatorBoost })}
          />
          <SliderField
            label="Tropics boost"
            value={settings.dottedTropicsBoost}
            min={0}
            max={1.5}
            step={0.02}
            format={(value) => `+${value.toFixed(2)}`}
            onChange={(dottedTropicsBoost) => onGlobeChange({ dottedTropicsBoost })}
          />
          <SliderField
            label="Band width"
            value={settings.dottedLatitudeBandWidth}
            min={1}
            max={20}
            step={0.5}
            format={(value) => `±${value.toFixed(1)}°`}
            onChange={(dottedLatitudeBandWidth) =>
              onGlobeChange({ dottedLatitudeBandWidth })
            }
          />
        </DependsOn>

        <SectionHeading>Pulse breath</SectionHeading>
        <SwitchField
          label="Pulse breath"
          checked={settings.dottedPulseBreath}
          onChange={(dottedPulseBreath) => onGlobeChange({ dottedPulseBreath })}
          value="Whole-field brightness inhales and exhales"
        />
        <DependsOn
          when={settings.dottedPulseBreath}
          because="Enable Pulse breath first."
          className="space-y-4"
        >
          <SliderField
            label="Amplitude"
            value={settings.dottedPulseBreathAmplitude}
            min={0}
            max={1}
            step={0.01}
            format={(value) => value.toFixed(2)}
            onChange={(dottedPulseBreathAmplitude) =>
              onGlobeChange({ dottedPulseBreathAmplitude })
            }
          />
          <SliderField
            label="Speed"
            value={settings.dottedPulseBreathSpeed}
            min={0.05}
            max={2}
            step={0.05}
            format={(value) => `${value.toFixed(2)} Hz`}
            onChange={(dottedPulseBreathSpeed) => onGlobeChange({ dottedPulseBreathSpeed })}
          />
        </DependsOn>

        <SectionHeading>Constellation</SectionHeading>
        <SwitchField
          label="Constellation lines"
          checked={settings.dottedConstellation}
          onChange={(dottedConstellation) => onGlobeChange({ dottedConstellation })}
          value="Hovered country's dots are wired into a star chart"
        />
        <DependsOn
          when={settings.dottedConstellation}
          because="Enable Constellation lines first."
          className="space-y-4"
        >
          <ColorField
            label="Line color"
            value={settings.dottedConstellationColor || '#7fdfff'}
            onChange={(dottedConstellationColor) =>
              onGlobeChange({ dottedConstellationColor })
            }
            hint={
              settings.dottedConstellationColor === '' ? 'Follow dot color' : undefined
            }
            {...(settings.dottedConstellationColor !== '' ? { preset: '' } : {})}
            swatches={CONSTELLATION_SWATCHES}
          />
          <SliderField
            label="Line opacity"
            value={settings.dottedConstellationOpacity}
            min={0.05}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(dottedConstellationOpacity) =>
              onGlobeChange({ dottedConstellationOpacity })
            }
          />
          <SliderField
            label="Connection range"
            value={settings.dottedConstellationDistanceFactor}
            min={1.05}
            max={3}
            step={0.05}
            format={(value) => `×${value.toFixed(2)} steps`}
            onChange={(dottedConstellationDistanceFactor) =>
              onGlobeChange({ dottedConstellationDistanceFactor })
            }
          />
        </DependsOn>
      </DependsOn>

      <p className="rounded-md border border-dashed border-cyan-200/[0.16] bg-cyan-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-cyan-100/80">
        Tip: turn on <span className="text-white">Latitude bands</span> +
        <span className="text-white"> Pulse breath</span> together for a
        breathing parallels look — the dot field reads as a quietly alive
        atlas.
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
    initialLat: 0,
    initialLng: 20,
    speed: 0.025,
    framingPadding: 0.18,
    atmosphere: false,
    starfield: true,
    tagline: 'Dot field — colors, motion, and constellations from a single grid',
  },
  KnobsComponent,
  watchedKeys: [
    'dottedColor',
    'dottedSizeScale',
    'dottedOpacity',
    'dottedRipple',
    'dottedRippleBoost',
    'dottedRippleSpeed',
    'dottedRippleWidth',
    'dottedRippleMaxConcurrent',
    'dottedRippleColor',
    'dottedFlash',
    'dottedFlashStrength',
    'dottedFlashDecay',
    'dottedFlashColor',
    'dottedDrift',
    'dottedDriftAmplitude',
    'dottedDriftSpeed',
    'dottedDriftFreq',
    'dottedDriftAxis',
    'dottedDriftPerCountryPhase',
    'dottedHoverDots',
    'dottedHoverScale',
    'dottedHoverBrightnessBoost',
    'dottedHoverDuration',
    'dottedHoverLift',
    'dottedActiveCountry',
    'dottedActiveBoost',
    'dottedActiveScale',
    'dottedActivePulseSpeed',
    'dottedActiveLift',
    'dottedBorderDots',
    'dottedBorderDotsColor',
    'dottedBorderDotsSize',
    'dottedBorderDotsOpacity',
    'dottedCursorWake',
    'dottedCursorWakeAmplitude',
    'dottedCursorWakeFade',
    'dottedCursorWakeWidth',
    'dottedLatitudeBands',
    'dottedEquatorBoost',
    'dottedTropicsBoost',
    'dottedLatitudeBandWidth',
    'dottedPulseBreath',
    'dottedPulseBreathAmplitude',
    'dottedPulseBreathSpeed',
    'dottedConstellation',
    'dottedConstellationColor',
    'dottedConstellationOpacity',
    'dottedConstellationDistanceFactor',
  ],
  // Every dotted knob updates live via the dotted kindHandle's
  // setDottedConfig setter — uniforms, material props, and a per-hover
  // LineSegments rebuild for constellation. No rebuild keys.
};

export default preset;
