import {
  ColorField,
  SelectField,
  SliderField,
  SwitchField,
  ToggleField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';
import {
  arcDatasetOptions,
  arcHeadEasingOptions,
  arcStyleOptions,
} from '@/configurator/layer-fixtures';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Arcs configurator preset.
 *
 * The fixture data and renderer options live in configurator state so
 * workshop preview, save/apply, and the main studio globe all use the
 * same `buildGlobeConfig()` path.
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  const isDotted = settings.kind === 'dotted';
  const isHologram = settings.kind === 'hologram';
  return (
    <div className="space-y-4">
      <SectionHeading>Dataset</SectionHeading>
      <SelectField
        label="Fixture"
        value={settings.arcDataset}
        options={arcDatasetOptions}
        onChange={(arcDataset) => onGlobeChange({ arcDataset })}
      />

      <SectionHeading>
        {isDotted ? 'Particle stream' : isHologram ? 'Projection beam' : 'Stroke'}
      </SectionHeading>
      <SliderField
        label={isDotted ? 'Particle size' : isHologram ? 'Beam width' : 'Width'}
        value={settings.arcWidth}
        min={0.5}
        max={8}
        step={0.25}
        format={(value) =>
          isDotted ? `x${value.toFixed(2)}` : `${value.toFixed(2)} px`
        }
        onChange={(arcWidth) => onGlobeChange({ arcWidth })}
      />
      <SwitchField
        label="Per-arc accent gradient"
        checked={settings.arcPerArcGradient}
        onChange={(arcPerArcGradient) => onGlobeChange({ arcPerArcGradient })}
        value="Rotate through a five-color accent palette"
      />
      <DependsOn
        when={!settings.arcPerArcGradient}
        because="Disable Per-arc accent gradient first."
        className="space-y-4"
      >
        <ColorField
          label="Master color"
          value={settings.arcColor}
          onChange={(arcColor) => onGlobeChange({ arcColor })}
          swatches={[
            '#22d3ee',
            '#67e8f9',
            '#a78bfa',
            '#f472b6',
            '#fbbf24',
            '#ef4444',
            '#34d399',
            '#84cc16',
            '#fde68a',
            '#ffffff',
          ]}
        />
      </DependsOn>

      <SectionHeading>Curve</SectionHeading>
      <SliderField
        label="Apex height"
        value={settings.arcHeight}
        min={0}
        max={1}
        step={0.05}
        format={(value) => (value === 0 ? 'auto' : value.toFixed(2))}
        onChange={(arcHeight) => onGlobeChange({ arcHeight })}
      />
      <DependsOn
        when={settings.arcHeight === 0}
        because="Switch Apex height to 'auto' first."
        className="space-y-4"
      >
        <SliderField
          label="Min auto height"
          value={settings.arcMinHeight}
          min={0}
          max={0.5}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(arcMinHeight) => onGlobeChange({ arcMinHeight })}
        />
        <SliderField
          label="Max auto height"
          value={settings.arcMaxHeight}
          min={0.1}
          max={1.2}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(arcMaxHeight) => onGlobeChange({ arcMaxHeight })}
        />
      </DependsOn>

      <SectionHeading>
        {isDotted || isHologram ? 'Packet cadence' : 'Line style'}
      </SectionHeading>
      <ToggleField
        label={isDotted || isHologram ? 'Packets' : 'Style'}
        value={settings.arcStyle}
        options={arcStyleOptions}
        onChange={(arcStyle) => onGlobeChange({ arcStyle })}
      />
      <DependsOn
        when={settings.arcStyle === 'dashed'}
        because="Switch to dashed style first."
        className="space-y-4"
      >
        <SliderField
          label={isDotted || isHologram ? 'Packet size' : 'Dash size'}
          value={settings.arcDashSize}
          min={0.005}
          max={0.2}
          step={0.005}
          format={(value) => value.toFixed(3)}
          onChange={(arcDashSize) => onGlobeChange({ arcDashSize })}
        />
        <SliderField
          label={isDotted || isHologram ? 'Packet gap' : 'Dash gap'}
          value={settings.arcDashGap}
          min={0.005}
          max={0.2}
          step={0.005}
          format={(value) => value.toFixed(3)}
          onChange={(arcDashGap) => onGlobeChange({ arcDashGap })}
        />
      </DependsOn>

      <SectionHeading>Animation</SectionHeading>
      <SwitchField
        label="Animated head"
        checked={settings.arcAnimated}
        onChange={(arcAnimated) => onGlobeChange({ arcAnimated })}
        value="Travelling particle along the arc"
      />
      <DependsOn
        when={settings.arcAnimated}
        because="Enable Animated head first."
        className="space-y-4"
      >
        <SliderField
          label="Cycle duration"
          value={settings.arcAnimationDuration}
          min={0.4}
          max={6}
          step={0.1}
          format={(value) => `${value.toFixed(1)} s`}
          onChange={(arcAnimationDuration) => onGlobeChange({ arcAnimationDuration })}
        />
        <ToggleField
          label={isDotted || isHologram ? 'Spark profile' : 'Head easing'}
          value={settings.arcHeadEasing}
          options={arcHeadEasingOptions}
          onChange={(arcHeadEasing) => onGlobeChange({ arcHeadEasing })}
        />
      </DependsOn>
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
    initialLat: 30,
    initialLng: -30,
    speed: 0.014,
    framingPadding: 0.18,
    atmosphere: true,
    starfield: true,
    tagline: 'Atlantic - long-haul great circles arc across the globe',
  },
  KnobsComponent,
  watchedKeys: [
    'arcDataset',
    'arcWidth',
    'arcHeight',
    'arcMinHeight',
    'arcMaxHeight',
    'arcColor',
    'arcPerArcGradient',
    'arcStyle',
    'arcDashSize',
    'arcDashGap',
    'arcAnimated',
    'arcAnimationDuration',
    'arcHeadEasing',
  ],
};

export default preset;
