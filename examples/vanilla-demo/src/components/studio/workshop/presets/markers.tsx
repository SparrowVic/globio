import {
  ColorField,
  SelectField,
  SliderField,
  SwitchField,
  ToggleField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';
import {
  markerCardAnchorOptions,
  markerCardStyleOptions,
  markerDatasetOptions,
  markerRenderModeOptions,
} from '@/configurator/layer-fixtures';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Markers configurator preset.
 *
 * Dot and HTML-card fixtures are derived from `GlobeSettings`; that
 * keeps live preview, save/apply, and the main studio globe in sync.
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
      <SectionHeading>Dataset</SectionHeading>
      <SelectField
        label="Fixture"
        feature="markers"
        info="Studio uses these sample coordinates for both 3D markers and HTML cards."
        value={settings.markerDataset}
        options={markerDatasetOptions}
        onChange={(markerDataset) => onGlobeChange({ markerDataset })}
      />

      <SectionHeading>Render mode</SectionHeading>
      <ToggleField
        label="Mode"
        info="Studio fills markers for 3D dots or htmlMarkers for cards and clears the other array."
        value={settings.markerMode}
        options={markerRenderModeOptions}
        onChange={(markerMode) => onGlobeChange({ markerMode })}
      />

      <DependsOn
        when={settings.markerMode === 'dots'}
        because="Switch to 3D dots mode."
        className="space-y-4"
      >
        <SectionHeading>Dot style</SectionHeading>
        <SliderField
          label="Size"
          configPath="markers[].size"
          value={settings.markerSize}
          min={0.4}
          max={6}
          step={0.1}
          format={(value) => `x${value.toFixed(1)}`}
          onChange={(markerSize) => onGlobeChange({ markerSize })}
        />
        <SliderField
          label={
            settings.kind === 'dotted'
              ? 'Beacon hover scale'
              : settings.kind === 'hologram'
                ? 'Projector hover scale'
                : 'Hover scale'
          }
          configPath="markers[].hoverScale"
          value={settings.markerHoverScale}
          min={1}
          max={3}
          step={0.05}
          format={(value) => `x${value.toFixed(2)}`}
          onChange={(markerHoverScale) => onGlobeChange({ markerHoverScale })}
        />
        <SwitchField
          label="Per-marker accent palette"
          configPath="markers[].color"
          checked={settings.markerPerMarkerColor}
          onChange={(markerPerMarkerColor) => onGlobeChange({ markerPerMarkerColor })}
          value="Rotate through a six-color palette"
        />
        <DependsOn
          when={!settings.markerPerMarkerColor}
          because="Disable Per-marker accent palette first."
          className="space-y-4"
        >
          <ColorField
            label="Color"
            configPath="markers[].color"
            value={settings.markerColor}
            onChange={(markerColor) => onGlobeChange({ markerColor })}
            swatches={[
              '#67e8f9',
              '#22d3ee',
              '#fbbf24',
              '#f472b6',
              '#34d399',
              '#a78bfa',
              '#ef4444',
              '#84cc16',
              '#fde68a',
              '#ffffff',
            ]}
          />
        </DependsOn>

        <SectionHeading>Pulse</SectionHeading>
        <SwitchField
          label="Animated pulse"
          configPath="markers[].pulse"
          checked={settings.markerPulse}
          onChange={(markerPulse) => onGlobeChange({ markerPulse })}
          value="Markers oscillate in size to draw attention"
        />
        <DependsOn
          when={settings.markerPulse}
          because="Enable pulse first."
          className="space-y-4"
        >
          <SliderField
            label="Speed"
            configPath="markers[].pulse.speed"
            value={settings.markerPulseSpeed}
            min={0.2}
            max={4}
            step={0.1}
            format={(value) => `${value.toFixed(1)} Hz`}
            onChange={(markerPulseSpeed) => onGlobeChange({ markerPulseSpeed })}
          />
          <SliderField
            label="Amplitude"
            configPath="markers[].pulse.amplitude"
            value={settings.markerPulseAmplitude}
            min={0.05}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(markerPulseAmplitude) => onGlobeChange({ markerPulseAmplitude })}
          />
          <SwitchField
            label="Vary pulse speeds"
            configPath="markers[].pulse.speed"
            checked={settings.markerPulsePhaseOffset}
            onChange={(markerPulsePhaseOffset) => onGlobeChange({ markerPulsePhaseOffset })}
            value="Slightly increase each successive marker's speed so pulses drift apart over time"
          />
        </DependsOn>
      </DependsOn>

      <DependsOn
        when={settings.markerMode === 'cards'}
        because="Switch to HTML cards mode."
        className="space-y-4"
      >
        <SectionHeading>Card style</SectionHeading>
        <ToggleField
          label="Variant"
          configPath="htmlMarkers[].content"
          value={settings.markerCardStyle}
          options={markerCardStyleOptions}
          onChange={(markerCardStyle) => onGlobeChange({ markerCardStyle })}
        />
        <ColorField
          label="Accent color"
          configPath="htmlMarkers[].content"
          value={settings.markerCardAccent}
          onChange={(markerCardAccent) => onGlobeChange({ markerCardAccent })}
          swatches={[
            '#67e8f9',
            '#fbbf24',
            '#f472b6',
            '#34d399',
            '#a78bfa',
            '#ef4444',
            '#84cc16',
            '#fde68a',
            '#ffffff',
            '#22d3ee',
          ]}
        />

        <SectionHeading>Position</SectionHeading>
        <ToggleField
          label="Anchor"
          configPath="htmlMarkers[].anchor"
          value={settings.markerCardAnchor}
          options={markerCardAnchorOptions}
          onChange={(markerCardAnchor) => onGlobeChange({ markerCardAnchor })}
        />
        <SliderField
          label="Vertical offset"
          configPath="htmlMarkers[].offset"
          value={settings.markerCardOffsetY}
          min={-40}
          max={40}
          step={1}
          format={(value) => `${value} px`}
          onChange={(markerCardOffsetY) => onGlobeChange({ markerCardOffsetY })}
        />
        <SwitchField
          label="Hide on far hemisphere"
          configPath="htmlMarkers[].hideWhenOccluded"
          checked={settings.markerCardHideOccluded}
          onChange={(markerCardHideOccluded) => onGlobeChange({ markerCardHideOccluded })}
          value="Fade out cards rotated to the back of the globe"
        />
      </DependsOn>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-emerald-200/75">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    initialLat: 38,
    initialLng: 18,
    speed: 0.018,
    framingPadding: 0.16,
    atmosphere: true,
    starfield: true,
    tagline: 'Mediterranean - capitals and transcontinental anchors',
  },
  KnobsComponent,
  watchedKeys: [
    'markerDataset',
    'markerMode',
    'markerSize',
    'markerHoverScale',
    'markerColor',
    'markerPerMarkerColor',
    'markerPulse',
    'markerPulseSpeed',
    'markerPulseAmplitude',
    'markerPulsePhaseOffset',
    'markerCardStyle',
    'markerCardAnchor',
    'markerCardOffsetY',
    'markerCardAccent',
    'markerCardHideOccluded',
  ],
};

export default preset;
