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
 * Wireframe configurator preset — the Tron data-feed kind.
 *
 * The wireframe is the most "computer graphics" of the kinds: a pure
 * lat/lng sphere grid with energy travelling through it. The default
 * fixture pumps the visual hierarchy (major / minor lines), data packets
 * racing along parallels + meridians, an autonomous grid pulse breathing
 * out from the equator, the equator beam glowing in cyan, and compass
 * markers anchoring N/S/E/W. Click anywhere on the surface to fire a
 * click pulse; pin a country to see the active-ring spin.
 *
 * Cinematography: wireframe-tron preset, slow rotate, framing pulled
 * back so the whole sphere reads. Atmosphere on for the cyan halo,
 * starfield on for sci-fi context.
 *
 * Knob coverage: every WireframeConfig field is live, grouped into
 * sub-sections (Grid · Pulse · Click pulse · Emphasis · Equator beam ·
 * Glitch · Active ring · Pole streams · Data packets · Compass · Grid
 * pulse · Pole pulse). Color knobs everywhere appropriate; empty-string
 * sentinels reset to theme defaults.
 *
 * Whole form is gated behind kind === 'wireframe' — tuning anything on
 * a non-wireframe kind would no-op since the wireframe layers don't
 * exist. The DependsOn surfaces a clear "switch to wireframe" hint.
 */

const dataPacketAxisOptions = [
  { value: 'latitude', label: 'Latitude' },
  { value: 'longitude', label: 'Longitude' },
  { value: 'both', label: 'Both' },
] as const;

const gridPulseModeOptions = [
  { value: 'fixed', label: 'Fixed origin' },
  { value: 'random', label: 'Random origin' },
] as const;

const polePulseWhichOptions = [
  { value: 'north', label: 'North' },
  { value: 'south', label: 'South' },
  { value: 'both', label: 'Both' },
] as const;

const TRON_SWATCHES = [
  '#22d3ee',
  '#67e8f9',
  '#7ff0ff',
  '#a78bfa',
  '#f472b6',
  '#fbbf24',
  '#34d399',
  '#84cc16',
  '#fde68a',
  '#ffffff',
];

const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
      <DependsOn
        when={settings.kind === 'wireframe'}
        because="Wireframe-only feature. Switch the main globe to wireframe kind to use it."
        className="space-y-4"
      >
        {/* ───────── Grid ───────── */}
        <SectionHeading>Grid</SectionHeading>
        <ColorField
          label="Line color"
          value={settings.wireframeColor || '#22d3ee'}
          onChange={(wireframeColor) => onGlobeChange({ wireframeColor })}
          hint={settings.wireframeColor === '' ? 'Theme default' : undefined}
          {...(settings.wireframeColor !== '' ? { preset: '' } : {})}
          swatches={TRON_SWATCHES}
        />
        <SliderField
          label="Opacity"
          value={settings.wireframeOpacity}
          min={0}
          max={1}
          step={0.05}
          format={(value) => (value <= 0 ? 'Theme default' : value.toFixed(2))}
          onChange={(wireframeOpacity) => onGlobeChange({ wireframeOpacity })}
        />
        <SliderField
          label="Density"
          value={settings.wireframeDensity}
          min={0.4}
          max={2.5}
          step={0.05}
          format={(value) => `×${value.toFixed(2)}`}
          onChange={(wireframeDensity) => onGlobeChange({ wireframeDensity })}
        />

        <SectionHeading>Major / minor hierarchy</SectionHeading>
        <SwitchField
          label="Hierarchy"
          checked={settings.wireframeHierarchy}
          onChange={(wireframeHierarchy) => onGlobeChange({ wireframeHierarchy })}
          value="Major lines (every 30°) brighter than minors"
        />
        <DependsOn
          when={settings.wireframeHierarchy}
          because="Enable hierarchy first."
          className="space-y-4"
        >
          <SliderField
            label="Major step"
            value={settings.wireframeHierarchyMajorStepDeg}
            min={5}
            max={90}
            step={5}
            format={(value) => `${value}°`}
            onChange={(wireframeHierarchyMajorStepDeg) =>
              onGlobeChange({ wireframeHierarchyMajorStepDeg })
            }
          />
          <SliderField
            label="Major boost"
            value={settings.wireframeHierarchyMajorBoost}
            min={1}
            max={3}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(wireframeHierarchyMajorBoost) =>
              onGlobeChange({ wireframeHierarchyMajorBoost })
            }
          />
          <SliderField
            label="Minor boost"
            value={settings.wireframeHierarchyMinorBoost}
            min={0.2}
            max={1.2}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(wireframeHierarchyMinorBoost) =>
              onGlobeChange({ wireframeHierarchyMinorBoost })
            }
          />
        </DependsOn>

        <SectionHeading>Ambient pulse</SectionHeading>
        <SliderField
          label="Pulse amplitude"
          value={settings.wireframePulse}
          min={0}
          max={1}
          step={0.05}
          format={(value) => (value === 0 ? 'off' : value.toFixed(2))}
          onChange={(wireframePulse) => onGlobeChange({ wireframePulse })}
        />
        <SliderField
          label="Pulse speed"
          value={settings.wireframePulseSpeed}
          min={0.05}
          max={3}
          step={0.05}
          format={(value) => `${value.toFixed(2)} Hz`}
          onChange={(wireframePulseSpeed) => onGlobeChange({ wireframePulseSpeed })}
        />

        {/* ───────── Click pulse ───────── */}
        <SectionHeading>Click pulse</SectionHeading>
        <SwitchField
          label="Click pulse"
          checked={settings.wireframeClickPulse}
          onChange={(wireframeClickPulse) => onGlobeChange({ wireframeClickPulse })}
          value="Radial wave from any surface click"
        />
        <DependsOn
          when={settings.wireframeClickPulse}
          because="Enable click pulse first."
          className="space-y-4"
        >
          <ColorField
            label="Pulse color"
            value={settings.wireframeClickPulseColor || '#22d3ee'}
            onChange={(wireframeClickPulseColor) => onGlobeChange({ wireframeClickPulseColor })}
            hint={settings.wireframeClickPulseColor === '' ? 'Theme default' : undefined}
            {...(settings.wireframeClickPulseColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <SliderField
            label="Wave speed"
            value={settings.wireframeClickPulseSpeed}
            min={0.3}
            max={4}
            step={0.05}
            format={(value) => `${value.toFixed(2)} rad/s`}
            onChange={(wireframeClickPulseSpeed) =>
              onGlobeChange({ wireframeClickPulseSpeed })
            }
          />
          <SliderField
            label="Band width"
            value={settings.wireframeClickPulseWidth}
            min={0.04}
            max={0.6}
            step={0.01}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(wireframeClickPulseWidth) =>
              onGlobeChange({ wireframeClickPulseWidth })
            }
          />
          <SliderField
            label="Peak boost"
            value={settings.wireframeClickPulseBoost}
            min={0.5}
            max={6}
            step={0.1}
            format={(value) => `×${value.toFixed(1)}`}
            onChange={(wireframeClickPulseBoost) =>
              onGlobeChange({ wireframeClickPulseBoost })
            }
          />
          <SliderField
            label="Max simultaneous"
            value={settings.wireframeClickPulseMaxConcurrent}
            min={1}
            max={12}
            step={1}
            format={(value) => `${value}`}
            onChange={(wireframeClickPulseMaxConcurrent) =>
              onGlobeChange({ wireframeClickPulseMaxConcurrent })
            }
          />
        </DependsOn>

        {/* ───────── Emphasis ───────── */}
        <SectionHeading>Emphasis lines</SectionHeading>
        <SwitchField
          label="Emphasis"
          checked={settings.wireframeEmphasis}
          onChange={(wireframeEmphasis) => onGlobeChange({ wireframeEmphasis })}
          value="Equator + tropics + prime / anti-meridian"
        />
        <DependsOn
          when={settings.wireframeEmphasis}
          because="Enable emphasis first."
          className="space-y-4"
        >
          <ColorField
            label="Strong (equator + tropics)"
            value={settings.wireframeEmphasisStrongColor || '#7ff0ff'}
            onChange={(wireframeEmphasisStrongColor) =>
              onGlobeChange({ wireframeEmphasisStrongColor })
            }
            hint={settings.wireframeEmphasisStrongColor === '' ? 'Theme default' : undefined}
            {...(settings.wireframeEmphasisStrongColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <ColorField
            label="Weak (meridians)"
            value={settings.wireframeEmphasisWeakColor || '#7ff0ff'}
            onChange={(wireframeEmphasisWeakColor) =>
              onGlobeChange({ wireframeEmphasisWeakColor })
            }
            hint={settings.wireframeEmphasisWeakColor === '' ? 'Theme default' : undefined}
            {...(settings.wireframeEmphasisWeakColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <SliderField
            label="Strong opacity"
            value={settings.wireframeEmphasisStrongOpacity}
            min={0}
            max={1}
            step={0.05}
            format={(value) => (value <= 0 ? 'Theme default' : value.toFixed(2))}
            onChange={(wireframeEmphasisStrongOpacity) =>
              onGlobeChange({ wireframeEmphasisStrongOpacity })
            }
          />
          <SliderField
            label="Weak factor"
            value={settings.wireframeEmphasisWeakOpacityFactor}
            min={0}
            max={1}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(wireframeEmphasisWeakOpacityFactor) =>
              onGlobeChange({ wireframeEmphasisWeakOpacityFactor })
            }
          />
        </DependsOn>

        {/* ───────── Equator beam ───────── */}
        <SectionHeading>Equator beam</SectionHeading>
        <SwitchField
          label="Equator beam"
          checked={settings.wireframeEquatorBeam}
          onChange={(wireframeEquatorBeam) => onGlobeChange({ wireframeEquatorBeam })}
          value="Glowing data spine running around the planet"
        />
        <DependsOn
          when={settings.wireframeEquatorBeam}
          because="Enable equator beam first."
          className="space-y-4"
        >
          <ColorField
            label="Beam color"
            value={settings.wireframeEquatorBeamColor || '#7ff0ff'}
            onChange={(wireframeEquatorBeamColor) =>
              onGlobeChange({ wireframeEquatorBeamColor })
            }
            hint={settings.wireframeEquatorBeamColor === '' ? 'Theme default' : undefined}
            {...(settings.wireframeEquatorBeamColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <SliderField
            label="Opacity"
            value={settings.wireframeEquatorBeamOpacity}
            min={0}
            max={1}
            step={0.05}
            format={(value) => (value <= 0 ? 'Default' : value.toFixed(2))}
            onChange={(wireframeEquatorBeamOpacity) =>
              onGlobeChange({ wireframeEquatorBeamOpacity })
            }
          />
          <SwitchField
            label="Pulse"
            checked={settings.wireframeEquatorBeamPulse}
            onChange={(wireframeEquatorBeamPulse) =>
              onGlobeChange({ wireframeEquatorBeamPulse })
            }
            value="Modulate beam intensity over time"
          />
          <DependsOn
            when={settings.wireframeEquatorBeamPulse}
            because="Enable beam pulse first."
            className="space-y-4"
          >
            <SliderField
              label="Pulse speed"
              value={settings.wireframeEquatorBeamPulseSpeed}
              min={0.1}
              max={3}
              step={0.05}
              format={(value) => `${value.toFixed(2)} Hz`}
              onChange={(wireframeEquatorBeamPulseSpeed) =>
                onGlobeChange({ wireframeEquatorBeamPulseSpeed })
              }
            />
          </DependsOn>
        </DependsOn>

        {/* ───────── Glitch ───────── */}
        <SectionHeading>CRT glitch</SectionHeading>
        <SwitchField
          label="Glitch"
          checked={settings.wireframeGlitch}
          onChange={(wireframeGlitch) => onGlobeChange({ wireframeGlitch })}
          value="Periodic horizontal-band shear transients"
        />
        <DependsOn
          when={settings.wireframeGlitch}
          because="Enable glitch first."
          className="space-y-4"
        >
          <SliderField
            label="Min interval"
            value={settings.wireframeGlitchIntervalMin}
            min={0.5}
            max={30}
            step={0.5}
            format={(value) => `${value.toFixed(1)} s`}
            onChange={(wireframeGlitchIntervalMin) =>
              onGlobeChange({ wireframeGlitchIntervalMin })
            }
          />
          <SliderField
            label="Max interval"
            value={settings.wireframeGlitchIntervalMax}
            min={1}
            max={60}
            step={0.5}
            format={(value) => `${value.toFixed(1)} s`}
            onChange={(wireframeGlitchIntervalMax) =>
              onGlobeChange({ wireframeGlitchIntervalMax })
            }
          />
        </DependsOn>

        {/* ───────── Active ring ───────── */}
        <SectionHeading>Active country ring</SectionHeading>
        <SwitchField
          label="Active ring"
          checked={settings.wireframeActiveRing}
          onChange={(wireframeActiveRing) => onGlobeChange({ wireframeActiveRing })}
          value="Glowing ring around the pinned country"
        />
        <DependsOn
          when={settings.wireframeActiveRing}
          because="Enable active ring first."
          className="space-y-4"
        >
          <ColorField
            label="Ring color"
            value={settings.wireframeActiveRingColor || '#22d3ee'}
            onChange={(wireframeActiveRingColor) =>
              onGlobeChange({ wireframeActiveRingColor })
            }
            hint={settings.wireframeActiveRingColor === '' ? 'Theme default' : undefined}
            {...(settings.wireframeActiveRingColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <SliderField
            label="Opacity"
            value={settings.wireframeActiveRingOpacity}
            min={0}
            max={1}
            step={0.05}
            format={(value) => (value <= 0 ? 'Theme default' : value.toFixed(2))}
            onChange={(wireframeActiveRingOpacity) =>
              onGlobeChange({ wireframeActiveRingOpacity })
            }
          />
          <SliderField
            label="Padding"
            value={settings.wireframeActiveRingPadding}
            min={1}
            max={2.5}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(wireframeActiveRingPadding) =>
              onGlobeChange({ wireframeActiveRingPadding })
            }
          />
          <SliderField
            label="Rotation speed"
            value={settings.wireframeActiveRingRotationSpeed}
            min={-2}
            max={2}
            step={0.05}
            format={(value) => `${value.toFixed(2)} rad/s`}
            onChange={(wireframeActiveRingRotationSpeed) =>
              onGlobeChange({ wireframeActiveRingRotationSpeed })
            }
          />
        </DependsOn>

        {/* ───────── Pole streams ───────── */}
        <SectionHeading>Pole streams</SectionHeading>
        <SwitchField
          label="Pole streams"
          checked={settings.wireframePoleStreams}
          onChange={(wireframePoleStreams) => onGlobeChange({ wireframePoleStreams })}
          value="Particles falling from the north pole"
        />
        <DependsOn
          when={settings.wireframePoleStreams}
          because="Enable pole streams first."
          className="space-y-4"
        >
          <ColorField
            label="Stream color"
            value={settings.wireframePoleStreamsColor || '#67e8f9'}
            onChange={(wireframePoleStreamsColor) =>
              onGlobeChange({ wireframePoleStreamsColor })
            }
            hint={settings.wireframePoleStreamsColor === '' ? 'Theme default' : undefined}
            {...(settings.wireframePoleStreamsColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <SliderField
            label="Particle count"
            value={settings.wireframePoleStreamsCount}
            min={0}
            max={64}
            step={1}
            format={(value) => `${value}`}
            onChange={(wireframePoleStreamsCount) =>
              onGlobeChange({ wireframePoleStreamsCount })
            }
          />
          <SliderField
            label="Speed"
            value={settings.wireframePoleStreamsSpeed}
            min={0.05}
            max={3}
            step={0.05}
            format={(value) => `${value.toFixed(2)} rad/s`}
            onChange={(wireframePoleStreamsSpeed) =>
              onGlobeChange({ wireframePoleStreamsSpeed })
            }
          />
          <SliderField
            label="Particle size"
            value={settings.wireframePoleStreamsSize}
            min={0}
            max={0.05}
            step={0.001}
            format={(value) => (value <= 0 ? 'Theme default' : value.toFixed(3))}
            onChange={(wireframePoleStreamsSize) =>
              onGlobeChange({ wireframePoleStreamsSize })
            }
          />
          <SliderField
            label="Stream opacity"
            value={settings.wireframePoleStreamsOpacity}
            min={0}
            max={1}
            step={0.05}
            format={(value) => (value <= 0 ? 'Theme default' : value.toFixed(2))}
            onChange={(wireframePoleStreamsOpacity) =>
              onGlobeChange({ wireframePoleStreamsOpacity })
            }
          />
        </DependsOn>

        {/* ───────── Data packets ───────── */}
        <SectionHeading>Data packets</SectionHeading>
        <SwitchField
          label="Data packets"
          checked={settings.wireframeDataPackets}
          onChange={(wireframeDataPackets) => onGlobeChange({ wireframeDataPackets })}
          value="Luminous blips racing along grid lines"
        />
        <DependsOn
          when={settings.wireframeDataPackets}
          because="Enable data packets first."
          className="space-y-4"
        >
          <ColorField
            label="Packet color"
            value={settings.wireframeDataPacketsColor || '#22d3ee'}
            onChange={(wireframeDataPacketsColor) =>
              onGlobeChange({ wireframeDataPacketsColor })
            }
            hint={settings.wireframeDataPacketsColor === '' ? 'Theme default' : undefined}
            {...(settings.wireframeDataPacketsColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <ToggleField
            label="Travel axis"
            value={settings.wireframeDataPacketsAxis}
            options={dataPacketAxisOptions}
            onChange={(wireframeDataPacketsAxis) =>
              onGlobeChange({ wireframeDataPacketsAxis })
            }
          />
          <SliderField
            label="Packet count"
            value={settings.wireframeDataPacketsCount}
            min={0}
            max={120}
            step={1}
            format={(value) => `${value}`}
            onChange={(wireframeDataPacketsCount) =>
              onGlobeChange({ wireframeDataPacketsCount })
            }
          />
          <SliderField
            label="Speed"
            value={settings.wireframeDataPacketsSpeed}
            min={0.1}
            max={4}
            step={0.05}
            format={(value) => `${value.toFixed(2)} rad/s`}
            onChange={(wireframeDataPacketsSpeed) =>
              onGlobeChange({ wireframeDataPacketsSpeed })
            }
          />
          <SliderField
            label="Trail length"
            value={settings.wireframeDataPacketsTrail}
            min={0}
            max={1}
            step={0.02}
            format={(value) =>
              value === 0 ? 'no trail' : `${(value * (180 / Math.PI)).toFixed(1)}°`
            }
            onChange={(wireframeDataPacketsTrail) =>
              onGlobeChange({ wireframeDataPacketsTrail })
            }
          />
          <SliderField
            label="Packet size"
            value={settings.wireframeDataPacketsSize}
            min={0.005}
            max={0.06}
            step={0.001}
            format={(value) => value.toFixed(3)}
            onChange={(wireframeDataPacketsSize) =>
              onGlobeChange({ wireframeDataPacketsSize })
            }
          />
        </DependsOn>

        {/* ───────── Compass ───────── */}
        <SectionHeading>Compass markers</SectionHeading>
        <SwitchField
          label="Compass"
          checked={settings.wireframeCompass}
          onChange={(wireframeCompass) => onGlobeChange({ wireframeCompass })}
          value="N / S / E / W cardinal letters above the surface"
        />
        <DependsOn
          when={settings.wireframeCompass}
          because="Enable compass first."
          className="space-y-4"
        >
          <ColorField
            label="Marker color"
            value={settings.wireframeCompassColor || '#7ff0ff'}
            onChange={(wireframeCompassColor) => onGlobeChange({ wireframeCompassColor })}
            hint={settings.wireframeCompassColor === '' ? 'Theme default' : undefined}
            {...(settings.wireframeCompassColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <SliderField
            label="Size"
            value={settings.wireframeCompassSize}
            min={0.02}
            max={0.2}
            step={0.005}
            format={(value) => value.toFixed(3)}
            onChange={(wireframeCompassSize) => onGlobeChange({ wireframeCompassSize })}
          />
          <SliderField
            label="Opacity"
            value={settings.wireframeCompassOpacity}
            min={0.1}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(wireframeCompassOpacity) =>
              onGlobeChange({ wireframeCompassOpacity })
            }
          />
          <SwitchField
            label="Show poles"
            checked={settings.wireframeCompassPoles}
            onChange={(wireframeCompassPoles) => onGlobeChange({ wireframeCompassPoles })}
            value="Include N + S above the geographic poles"
          />
        </DependsOn>

        {/* ───────── Grid pulse ───────── */}
        <SectionHeading>Autonomous grid pulse</SectionHeading>
        <SwitchField
          label="Grid pulse"
          checked={settings.wireframeGridPulse}
          onChange={(wireframeGridPulse) => onGlobeChange({ wireframeGridPulse })}
          value="Periodic radial wave from a fixed or random origin"
        />
        <DependsOn
          when={settings.wireframeGridPulse}
          because="Enable grid pulse first."
          className="space-y-4"
        >
          <ColorField
            label="Pulse color"
            value={settings.wireframeGridPulseColor || '#22d3ee'}
            onChange={(wireframeGridPulseColor) =>
              onGlobeChange({ wireframeGridPulseColor })
            }
            hint={settings.wireframeGridPulseColor === '' ? 'Click pulse default' : undefined}
            {...(settings.wireframeGridPulseColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <ToggleField
            label="Origin mode"
            value={settings.wireframeGridPulseMode}
            options={gridPulseModeOptions}
            onChange={(wireframeGridPulseMode) =>
              onGlobeChange({ wireframeGridPulseMode })
            }
          />
          <DependsOn
            when={settings.wireframeGridPulseMode === 'fixed'}
            because="Switch origin mode to Fixed to set lat/lng."
            className="space-y-4"
          >
            <SliderField
              label="Origin lat"
              value={settings.wireframeGridPulseOriginLat}
              min={-90}
              max={90}
              step={1}
              format={(value) => `${value.toFixed(0)}°`}
              onChange={(wireframeGridPulseOriginLat) =>
                onGlobeChange({ wireframeGridPulseOriginLat })
              }
            />
            <SliderField
              label="Origin lng"
              value={settings.wireframeGridPulseOriginLng}
              min={-180}
              max={180}
              step={1}
              format={(value) => `${value.toFixed(0)}°`}
              onChange={(wireframeGridPulseOriginLng) =>
                onGlobeChange({ wireframeGridPulseOriginLng })
              }
            />
          </DependsOn>
          <SliderField
            label="Interval"
            value={settings.wireframeGridPulseIntervalSec}
            min={0.5}
            max={20}
            step={0.5}
            format={(value) => `${value.toFixed(1)} s`}
            onChange={(wireframeGridPulseIntervalSec) =>
              onGlobeChange({ wireframeGridPulseIntervalSec })
            }
          />
          <SliderField
            label="Wave speed"
            value={settings.wireframeGridPulseSpeed}
            min={0.3}
            max={4}
            step={0.05}
            format={(value) => `${value.toFixed(2)} rad/s`}
            onChange={(wireframeGridPulseSpeed) =>
              onGlobeChange({ wireframeGridPulseSpeed })
            }
          />
          <SliderField
            label="Band width"
            value={settings.wireframeGridPulseWidth}
            min={0.04}
            max={0.5}
            step={0.01}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(wireframeGridPulseWidth) =>
              onGlobeChange({ wireframeGridPulseWidth })
            }
          />
          <SliderField
            label="Boost"
            value={settings.wireframeGridPulseBoost}
            min={0.5}
            max={5}
            step={0.1}
            format={(value) => `×${value.toFixed(1)}`}
            onChange={(wireframeGridPulseBoost) =>
              onGlobeChange({ wireframeGridPulseBoost })
            }
          />
        </DependsOn>

        {/* ───────── Pole pulse ───────── */}
        <SectionHeading>Pole pulses</SectionHeading>
        <SwitchField
          label="Pole pulse"
          checked={settings.wireframePolePulse}
          onChange={(wireframePolePulse) => onGlobeChange({ wireframePolePulse })}
          value="Radial waves emanating from the geographic poles"
        />
        <DependsOn
          when={settings.wireframePolePulse}
          because="Enable pole pulse first."
          className="space-y-4"
        >
          <ColorField
            label="Pulse color"
            value={settings.wireframePolePulseColor || '#22d3ee'}
            onChange={(wireframePolePulseColor) =>
              onGlobeChange({ wireframePolePulseColor })
            }
            hint={settings.wireframePolePulseColor === '' ? 'Click pulse default' : undefined}
            {...(settings.wireframePolePulseColor !== '' ? { preset: '' } : {})}
            swatches={TRON_SWATCHES}
          />
          <ToggleField
            label="Which pole"
            value={settings.wireframePolePulseWhich}
            options={polePulseWhichOptions}
            onChange={(wireframePolePulseWhich) =>
              onGlobeChange({ wireframePolePulseWhich })
            }
          />
          <SliderField
            label="Interval"
            value={settings.wireframePolePulseIntervalSec}
            min={0.5}
            max={20}
            step={0.5}
            format={(value) => `${value.toFixed(1)} s`}
            onChange={(wireframePolePulseIntervalSec) =>
              onGlobeChange({ wireframePolePulseIntervalSec })
            }
          />
          <SliderField
            label="Wave speed"
            value={settings.wireframePolePulseSpeed}
            min={0.3}
            max={4}
            step={0.05}
            format={(value) => `${value.toFixed(2)} rad/s`}
            onChange={(wireframePolePulseSpeed) =>
              onGlobeChange({ wireframePolePulseSpeed })
            }
          />
          <SliderField
            label="Boost"
            value={settings.wireframePolePulseBoost}
            min={0.5}
            max={5}
            step={0.1}
            format={(value) => `×${value.toFixed(1)}`}
            onChange={(wireframePolePulseBoost) =>
              onGlobeChange({ wireframePolePulseBoost })
            }
          />
        </DependsOn>
      </DependsOn>

      <p className="rounded-md border border-dashed border-cyan-200/[0.16] bg-cyan-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-cyan-100/80">
        Tip: <span className="text-white">click anywhere on the surface</span> to fire a click
        pulse, drop the density to <span className="text-white">0.6</span> for a
        spacious schematic feel, or push <span className="text-white">data packets</span> to
        <span className="text-white"> 80+</span> with a long trail for a heavy data-feed look.
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
    initialLat: 14,
    initialLng: 24,
    speed: 0.025,
    framingPadding: 0.2,
    atmosphere: true,
    starfield: true,
    tagline: 'Tron grid — data packets, pulses, and compass marks on a lat/lng sphere',
  },
  KnobsComponent,
  watchedKeys: [
    'wireframeColor',
    'wireframeOpacity',
    'wireframeDensity',
    'wireframePulse',
    'wireframePulseSpeed',
    'wireframeHierarchy',
    'wireframeHierarchyMajorStepDeg',
    'wireframeHierarchyMajorBoost',
    'wireframeHierarchyMinorBoost',
    'wireframeClickPulse',
    'wireframeClickPulseColor',
    'wireframeClickPulseSpeed',
    'wireframeClickPulseWidth',
    'wireframeClickPulseBoost',
    'wireframeClickPulseMaxConcurrent',
    'wireframeEmphasis',
    'wireframeEmphasisStrongColor',
    'wireframeEmphasisWeakColor',
    'wireframeEmphasisStrongOpacity',
    'wireframeEmphasisWeakOpacityFactor',
    'wireframeEquatorBeam',
    'wireframeEquatorBeamColor',
    'wireframeEquatorBeamOpacity',
    'wireframeEquatorBeamPulse',
    'wireframeEquatorBeamPulseSpeed',
    'wireframeGlitch',
    'wireframeGlitchIntervalMin',
    'wireframeGlitchIntervalMax',
    'wireframeActiveRing',
    'wireframeActiveRingColor',
    'wireframeActiveRingOpacity',
    'wireframeActiveRingPadding',
    'wireframeActiveRingRotationSpeed',
    'wireframePoleStreams',
    'wireframePoleStreamsColor',
    'wireframePoleStreamsOpacity',
    'wireframePoleStreamsCount',
    'wireframePoleStreamsSpeed',
    'wireframePoleStreamsSize',
    'wireframeDataPackets',
    'wireframeDataPacketsColor',
    'wireframeDataPacketsCount',
    'wireframeDataPacketsSpeed',
    'wireframeDataPacketsTrail',
    'wireframeDataPacketsSize',
    'wireframeDataPacketsAxis',
    'wireframeCompass',
    'wireframeCompassColor',
    'wireframeCompassSize',
    'wireframeCompassOpacity',
    'wireframeCompassPoles',
    'wireframeGridPulse',
    'wireframeGridPulseColor',
    'wireframeGridPulseIntervalSec',
    'wireframeGridPulseSpeed',
    'wireframeGridPulseWidth',
    'wireframeGridPulseBoost',
    'wireframeGridPulseMode',
    'wireframeGridPulseOriginLat',
    'wireframeGridPulseOriginLng',
    'wireframePolePulse',
    'wireframePolePulseColor',
    'wireframePolePulseIntervalSec',
    'wireframePolePulseSpeed',
    'wireframePolePulseBoost',
    'wireframePolePulseWhich',
  ],
  // All wireframe knobs are live via WireframeKindHandle.setWireframe-
  // Config + the per-layer setters. No rebuild keys.
};

export default preset;
