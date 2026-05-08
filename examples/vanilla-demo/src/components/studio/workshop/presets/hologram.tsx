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
 * Hologram configurator preset.
 *
 * Cinematography: parked over the Atlantic so the entire silhouette
 * shows clean rim glow + outer halo + projector pulse arc against
 * empty water. Theme + kind inherit from the user's studio settings
 * — when the main globe is on hologram-cyan, the preview matches.
 *
 * The preset is gated behind `kind === 'hologram'` because every
 * effect lives on the hologram shell shader; switching to outline /
 * dotted / wireframe leaves the preview blank for these knobs. The
 * gate surfaces a clear "switch to hologram kind" hint instead of
 * silently displaying a useless slider.
 *
 * Knob coverage (every effect on the projection shell + the borders
 * data feed):
 *  - Scanlines: enabled, density, speed, opacity, direction
 *  - Rim glow: enabled, color, intensity, width
 *  - Glitch: enabled, interval (min/max), amplitude, RGB channel split
 *  - Outer glow halo: enabled, color, spread, intensity
 *  - Chromatic aberration: enabled, amount, mode (rim/global)
 *  - Holographic noise: enabled, intensity, scale, speed
 *  - Projector hum: enabled, sweep speed, amplitude, color
 *  - Data feed scan: enabled, speed, width, opacity, axis, color
 *  - Phase shimmer: enabled, scale, intensity, speed
 *  - Calibration ticks: enabled, count, length, opacity
 *
 * All knobs are live via `setHologramConfig` on the hologram
 * kindHandle — no rebuilds, no flicker. Sentinel resets: empty-string
 * color and `0` numeric for the previously-token-driven knobs (rim
 * intensity, scanline density / speed, outer glow intensity, glitch
 * amplitude) restore the construction-time look.
 */

const directionOptions = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'diagonal', label: 'Diagonal' },
] as const;

const aberrationModeOptions = [
  { value: 'rim', label: 'Rim only' },
  { value: 'global', label: 'Global' },
] as const;

const dataScanAxisOptions = [
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'radial', label: 'Pole-radial' },
] as const;

// Cyan / teal-leaning palette that complements the default hologram look.
// White + warm amber sneak in for "warning state" feels.
const HOLOGRAM_SWATCHES = [
  '#67e8f9',
  '#22d3ee',
  '#4dd0e1',
  '#a5f3fc',
  '#5eead4',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#ef4444',
  '#ffffff',
  '#cfdcff',
  '#e0fffa',
];

const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;

  return (
    <div className="space-y-4">
      <DependsOn
        when={settings.kind === 'hologram'}
        because="Hologram-only feature. Switch the main globe to hologram kind to tune."
        className="space-y-4"
      >
        {/* ---------- Scanlines ---------- */}
        <SectionHeading>Scanlines</SectionHeading>
        <SwitchField
          label="CRT scanlines"
          checked={settings.hologramScanlines}
          onChange={(hologramScanlines) => onGlobeChange({ hologramScanlines })}
          value="Sweeping bright bars across the projection"
        />
        <DependsOn
          when={settings.hologramScanlines}
          because="Enable CRT scanlines first."
          className="space-y-4"
        >
          <SliderField
            label="Density"
            value={settings.hologramScanlineDensity}
            min={0}
            max={600}
            step={5}
            format={(value) => (value === 0 ? 'theme default' : `${value}`)}
            onChange={(hologramScanlineDensity) =>
              onGlobeChange({ hologramScanlineDensity })
            }
          />
          <SliderField
            label="Speed"
            value={settings.hologramScanlineSpeed}
            min={0}
            max={6}
            step={0.05}
            format={(value) => (value === 0 ? 'theme default' : `${value.toFixed(2)}`)}
            onChange={(hologramScanlineSpeed) =>
              onGlobeChange({ hologramScanlineSpeed })
            }
          />
          <SliderField
            label="Contrast"
            value={settings.hologramScanlineOpacity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(hologramScanlineOpacity) =>
              onGlobeChange({ hologramScanlineOpacity })
            }
          />
          <ToggleField
            label="Direction"
            value={settings.hologramScanlineDirection}
            options={directionOptions}
            onChange={(hologramScanlineDirection) =>
              onGlobeChange({ hologramScanlineDirection })
            }
          />
        </DependsOn>

        {/* ---------- Rim glow ---------- */}
        <SectionHeading>Rim glow</SectionHeading>
        <SwitchField
          label="Fresnel rim"
          checked={settings.hologramRimGlow}
          onChange={(hologramRimGlow) => onGlobeChange({ hologramRimGlow })}
          value="Soft halo at the silhouette edge"
        />
        <DependsOn
          when={settings.hologramRimGlow}
          because="Enable Fresnel rim first."
          className="space-y-4"
        >
          <ColorField
            label="Rim color"
            value={settings.hologramRimColor || '#67e8f9'}
            onChange={(hologramRimColor) => onGlobeChange({ hologramRimColor })}
            hint={settings.hologramRimColor === '' ? 'Theme default' : undefined}
            {...(settings.hologramRimColor !== '' ? { preset: '' } : {})}
            swatches={HOLOGRAM_SWATCHES}
          />
          <SliderField
            label="Intensity"
            value={settings.hologramRimIntensity}
            min={0}
            max={4}
            step={0.05}
            format={(value) => (value === 0 ? 'theme default' : value.toFixed(2))}
            onChange={(hologramRimIntensity) =>
              onGlobeChange({ hologramRimIntensity })
            }
          />
          <SliderField
            label="Width"
            value={settings.hologramRimWidth}
            min={0.3}
            max={6}
            step={0.1}
            format={(value) => `${value.toFixed(1)}`}
            onChange={(hologramRimWidth) => onGlobeChange({ hologramRimWidth })}
          />
        </DependsOn>

        {/* ---------- Glitch ---------- */}
        <SectionHeading>Glitch transients</SectionHeading>
        <SwitchField
          label="Random glitches"
          checked={settings.hologramGlitch}
          onChange={(hologramGlitch) => onGlobeChange({ hologramGlitch })}
          value="80–250ms shears across the borders"
        />
        <DependsOn
          when={settings.hologramGlitch}
          because="Enable Random glitches first."
          className="space-y-4"
        >
          <SliderField
            label="Min interval"
            value={settings.hologramGlitchIntervalMin}
            min={0.5}
            max={20}
            step={0.5}
            format={(value) => `${value.toFixed(1)} s`}
            onChange={(hologramGlitchIntervalMin) =>
              onGlobeChange({ hologramGlitchIntervalMin })
            }
          />
          <SliderField
            label="Max interval"
            value={settings.hologramGlitchIntervalMax}
            min={0.5}
            max={30}
            step={0.5}
            format={(value) => `${value.toFixed(1)} s`}
            onChange={(hologramGlitchIntervalMax) =>
              onGlobeChange({ hologramGlitchIntervalMax })
            }
          />
          <SliderField
            label="Amplitude"
            value={settings.hologramGlitchAmplitude}
            min={0}
            max={0.1}
            step={0.005}
            format={(value) => (value === 0 ? 'theme default' : value.toFixed(3))}
            onChange={(hologramGlitchAmplitude) =>
              onGlobeChange({ hologramGlitchAmplitude })
            }
          />
          <SliderField
            label="RGB channel split"
            value={settings.hologramGlitchChannelShift}
            min={0}
            max={2}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(hologramGlitchChannelShift) =>
              onGlobeChange({ hologramGlitchChannelShift })
            }
          />
        </DependsOn>

        {/* ---------- Outer glow ---------- */}
        <SectionHeading>Outer halo</SectionHeading>
        <SwitchField
          label="Outer halo"
          checked={settings.hologramOuterGlow}
          onChange={(hologramOuterGlow) => onGlobeChange({ hologramOuterGlow })}
          value="Wider back-side glow that sells the projection"
        />
        <DependsOn
          when={settings.hologramOuterGlow}
          because="Enable Outer halo first."
          className="space-y-4"
        >
          <ColorField
            label="Halo color"
            value={settings.hologramOuterGlowColor || '#67e8f9'}
            onChange={(hologramOuterGlowColor) =>
              onGlobeChange({ hologramOuterGlowColor })
            }
            hint={settings.hologramOuterGlowColor === '' ? 'Theme default' : undefined}
            {...(settings.hologramOuterGlowColor !== '' ? { preset: '' } : {})}
            swatches={HOLOGRAM_SWATCHES}
          />
          <SliderField
            label="Spread"
            value={settings.hologramOuterGlowSpread}
            min={1.005}
            max={1.2}
            step={0.005}
            format={(value) => `×${value.toFixed(3)}`}
            onChange={(hologramOuterGlowSpread) =>
              onGlobeChange({ hologramOuterGlowSpread })
            }
          />
          <SliderField
            label="Intensity"
            value={settings.hologramOuterGlowIntensity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => (value === 0 ? 'theme default' : value.toFixed(2))}
            onChange={(hologramOuterGlowIntensity) =>
              onGlobeChange({ hologramOuterGlowIntensity })
            }
          />
        </DependsOn>

        {/* ---------- Chromatic aberration ---------- */}
        <SectionHeading>Chromatic aberration</SectionHeading>
        <SwitchField
          label="RGB split at the rim"
          checked={settings.hologramChromaticAberration}
          onChange={(hologramChromaticAberration) =>
            onGlobeChange({ hologramChromaticAberration })
          }
          value="Refraction-style red / blue fringe"
        />
        <DependsOn
          when={settings.hologramChromaticAberration}
          because="Enable RGB split first."
          className="space-y-4"
        >
          <SliderField
            label="Amount"
            value={settings.hologramChromaticAberrationAmount}
            min={0}
            max={1.5}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(hologramChromaticAberrationAmount) =>
              onGlobeChange({ hologramChromaticAberrationAmount })
            }
          />
          <ToggleField
            label="Mode"
            value={settings.hologramChromaticAberrationMode}
            options={aberrationModeOptions}
            onChange={(hologramChromaticAberrationMode) =>
              onGlobeChange({ hologramChromaticAberrationMode })
            }
          />
        </DependsOn>

        {/* ---------- Noise ---------- */}
        <SectionHeading>Holographic noise</SectionHeading>
        <SwitchField
          label="Animated grain"
          checked={settings.hologramNoise}
          onChange={(hologramNoise) => onGlobeChange({ hologramNoise })}
          value="Photon-shot grain that flickers each frame"
        />
        <DependsOn
          when={settings.hologramNoise}
          because="Enable Animated grain first."
          className="space-y-4"
        >
          <SliderField
            label="Intensity"
            value={settings.hologramNoiseIntensity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(hologramNoiseIntensity) =>
              onGlobeChange({ hologramNoiseIntensity })
            }
          />
          <SliderField
            label="Grain size"
            value={settings.hologramNoiseScale}
            min={0.2}
            max={5}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(hologramNoiseScale) => onGlobeChange({ hologramNoiseScale })}
          />
          <SliderField
            label="Reroll speed"
            value={settings.hologramNoiseSpeed}
            min={0}
            max={60}
            step={1}
            format={(value) => `${value.toFixed(0)} Hz`}
            onChange={(hologramNoiseSpeed) => onGlobeChange({ hologramNoiseSpeed })}
          />
        </DependsOn>

        {/* ---------- Projector pulse ---------- */}
        <SectionHeading>Projector hum</SectionHeading>
        <SwitchField
          label="Rim sweep"
          checked={settings.hologramProjectorPulse}
          onChange={(hologramProjectorPulse) =>
            onGlobeChange({ hologramProjectorPulse })
          }
          value="Bright arc that orbits the silhouette"
        />
        <DependsOn
          when={settings.hologramProjectorPulse}
          because="Enable Rim sweep first."
          className="space-y-4"
        >
          <SliderField
            label="Speed"
            value={settings.hologramProjectorPulseSpeed}
            min={0}
            max={2}
            step={0.02}
            format={(value) => `${value.toFixed(2)} Hz`}
            onChange={(hologramProjectorPulseSpeed) =>
              onGlobeChange({ hologramProjectorPulseSpeed })
            }
          />
          <SliderField
            label="Amplitude"
            value={settings.hologramProjectorPulseAmplitude}
            min={0}
            max={1.5}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(hologramProjectorPulseAmplitude) =>
              onGlobeChange({ hologramProjectorPulseAmplitude })
            }
          />
          <ColorField
            label="Sweep tint"
            value={settings.hologramProjectorPulseColor || '#a5f3fc'}
            onChange={(hologramProjectorPulseColor) =>
              onGlobeChange({ hologramProjectorPulseColor })
            }
            hint={
              settings.hologramProjectorPulseColor === '' ? 'Inherit shell color' : undefined
            }
            {...(settings.hologramProjectorPulseColor !== '' ? { preset: '' } : {})}
            swatches={HOLOGRAM_SWATCHES}
          />
        </DependsOn>

        {/* ---------- Data scan ---------- */}
        <SectionHeading>Data feed scan</SectionHeading>
        <SwitchField
          label="Scanning band"
          checked={settings.hologramDataScan}
          onChange={(hologramDataScan) => onGlobeChange({ hologramDataScan })}
          value="Bright luminous band that sweeps across the surface"
        />
        <DependsOn
          when={settings.hologramDataScan}
          because="Enable Scanning band first."
          className="space-y-4"
        >
          <ToggleField
            label="Sweep axis"
            value={settings.hologramDataScanAxis}
            options={dataScanAxisOptions}
            onChange={(hologramDataScanAxis) =>
              onGlobeChange({ hologramDataScanAxis })
            }
          />
          <SliderField
            label="Speed"
            value={settings.hologramDataScanSpeed}
            min={0}
            max={2}
            step={0.02}
            format={(value) => `${value.toFixed(2)} cyc/s`}
            onChange={(hologramDataScanSpeed) =>
              onGlobeChange({ hologramDataScanSpeed })
            }
          />
          <SliderField
            label="Width"
            value={settings.hologramDataScanWidth}
            min={0.005}
            max={0.4}
            step={0.005}
            format={(value) => value.toFixed(3)}
            onChange={(hologramDataScanWidth) =>
              onGlobeChange({ hologramDataScanWidth })
            }
          />
          <SliderField
            label="Brightness"
            value={settings.hologramDataScanOpacity}
            min={0}
            max={2}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(hologramDataScanOpacity) =>
              onGlobeChange({ hologramDataScanOpacity })
            }
          />
          <ColorField
            label="Band tint"
            value={settings.hologramDataScanColor || '#a5f3fc'}
            onChange={(hologramDataScanColor) =>
              onGlobeChange({ hologramDataScanColor })
            }
            hint={
              settings.hologramDataScanColor === '' ? 'Inherit shell color' : undefined
            }
            {...(settings.hologramDataScanColor !== '' ? { preset: '' } : {})}
            swatches={HOLOGRAM_SWATCHES}
          />
        </DependsOn>

        {/* ---------- Phase shimmer ---------- */}
        <SectionHeading>Phase shimmer</SectionHeading>
        <SwitchField
          label="Moiré shimmer"
          checked={settings.hologramPhaseShimmer}
          onChange={(hologramPhaseShimmer) =>
            onGlobeChange({ hologramPhaseShimmer })
          }
          value="Subtle interference pattern drifting across the surface"
        />
        <DependsOn
          when={settings.hologramPhaseShimmer}
          because="Enable Moiré shimmer first."
          className="space-y-4"
        >
          <SliderField
            label="Pattern density"
            value={settings.hologramPhaseShimmerScale}
            min={5}
            max={250}
            step={1}
            format={(value) => `${value.toFixed(0)}`}
            onChange={(hologramPhaseShimmerScale) =>
              onGlobeChange({ hologramPhaseShimmerScale })
            }
          />
          <SliderField
            label="Intensity"
            value={settings.hologramPhaseShimmerIntensity}
            min={0}
            max={0.6}
            step={0.01}
            format={(value) => value.toFixed(2)}
            onChange={(hologramPhaseShimmerIntensity) =>
              onGlobeChange({ hologramPhaseShimmerIntensity })
            }
          />
          <SliderField
            label="Drift speed"
            value={settings.hologramPhaseShimmerSpeed}
            min={0}
            max={3}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(hologramPhaseShimmerSpeed) =>
              onGlobeChange({ hologramPhaseShimmerSpeed })
            }
          />
        </DependsOn>

        {/* ---------- Calibration ticks ---------- */}
        <SectionHeading>Calibration ticks</SectionHeading>
        <SwitchField
          label="Rim ticks"
          checked={settings.hologramCalibrationTicks}
          onChange={(hologramCalibrationTicks) =>
            onGlobeChange({ hologramCalibrationTicks })
          }
          value="Tiny instrument-style marks around the silhouette"
        />
        <DependsOn
          when={settings.hologramCalibrationTicks}
          because="Enable Rim ticks first."
          className="space-y-4"
        >
          <SliderField
            label="Count"
            value={settings.hologramCalibrationTicksCount}
            min={6}
            max={120}
            step={2}
            format={(value) => `${value.toFixed(0)}`}
            onChange={(hologramCalibrationTicksCount) =>
              onGlobeChange({ hologramCalibrationTicksCount })
            }
          />
          <SliderField
            label="Length"
            value={settings.hologramCalibrationTicksLength}
            min={0.005}
            max={0.2}
            step={0.005}
            format={(value) => value.toFixed(3)}
            onChange={(hologramCalibrationTicksLength) =>
              onGlobeChange({ hologramCalibrationTicksLength })
            }
          />
          <SliderField
            label="Brightness"
            value={settings.hologramCalibrationTicksOpacity}
            min={0}
            max={2}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(hologramCalibrationTicksOpacity) =>
              onGlobeChange({ hologramCalibrationTicksOpacity })
            }
          />
        </DependsOn>
      </DependsOn>

      <p className="rounded-md border border-dashed border-cyan-200/[0.16] bg-cyan-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-cyan-100/80">
        Tip: stack <span className="text-white">RGB split</span> +{' '}
        <span className="text-white">Holographic noise</span> +{' '}
        <span className="text-white">Phase shimmer</span> for the full
        cinema look. Pull <span className="text-white">Calibration ticks</span> in
        with a low <span className="text-white">scanline density</span> for a
        chiselled "instrument-grade" projection.
      </p>
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
    initialLat: 12,
    initialLng: -38,
    speed: 0.018,
    framingPadding: 0.18,
    atmosphere: true,
    starfield: true,
    tagline: 'Cyan projection — scanlines, rim flicker, and chromatic shimmer',
  },
  KnobsComponent,
  watchedKeys: [
    'kind',
    'hologramScanlines',
    'hologramScanlineSpeed',
    'hologramScanlineDensity',
    'hologramScanlineOpacity',
    'hologramScanlineDirection',
    'hologramRimGlow',
    'hologramRimColor',
    'hologramRimIntensity',
    'hologramRimWidth',
    'hologramGlitch',
    'hologramGlitchIntervalMin',
    'hologramGlitchIntervalMax',
    'hologramGlitchAmplitude',
    'hologramGlitchChannelShift',
    'hologramOuterGlow',
    'hologramOuterGlowColor',
    'hologramOuterGlowSpread',
    'hologramOuterGlowIntensity',
    'hologramChromaticAberration',
    'hologramChromaticAberrationAmount',
    'hologramChromaticAberrationMode',
    'hologramNoise',
    'hologramNoiseIntensity',
    'hologramNoiseScale',
    'hologramNoiseSpeed',
    'hologramProjectorPulse',
    'hologramProjectorPulseSpeed',
    'hologramProjectorPulseAmplitude',
    'hologramProjectorPulseColor',
    'hologramDataScan',
    'hologramDataScanSpeed',
    'hologramDataScanWidth',
    'hologramDataScanOpacity',
    'hologramDataScanAxis',
    'hologramDataScanColor',
    'hologramPhaseShimmer',
    'hologramPhaseShimmerScale',
    'hologramPhaseShimmerIntensity',
    'hologramPhaseShimmerSpeed',
    'hologramCalibrationTicks',
    'hologramCalibrationTicksCount',
    'hologramCalibrationTicksLength',
    'hologramCalibrationTicksOpacity',
  ],
  // Every hologram knob is uniform-driven on the shell shader (or a small
  // interval flip on the borders glitch scheduler). No rebuild keys.
};

export default preset;
