import {
  ColorField,
  SelectField,
  SliderField,
  SwitchField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Labels configurator preset.
 *
 * Cinematography: outline kind on a dark theme — crisp linework so the
 * label glyphs read as the dominant element rather than competing with
 * country fills. Camera parked over Europe (lat 48, lng 12) where labels
 * cluster densely so even small movements show the threshold + halo
 * effects clearly. Slow ambient rotate.
 *
 * Knobs: every CountryLabelsConfig knob the API exposes today, grouped
 * Density → Motion → Typography → Halo. All live via globe.update() —
 * the labels layer reads thresholds per frame and walks DOM nodes for
 * style mutations. Zero rebuild for any knob.
 */

const fontWeightOptions = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi' },
  { value: '700', label: 'Bold' },
] as const;

const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
      <SwitchField
        label="Enable country labels"
        checked={settings.countryLabels}
        onChange={(countryLabels) => onGlobeChange({ countryLabels })}
      />

      <DependsOn
        when={settings.countryLabels}
        because="Enable country labels first to tune their appearance."
        className="space-y-4"
      >
        <SectionHeading>Density</SectionHeading>
        <SliderField
          label="Min screen size"
          value={settings.labelMinScreenSize}
          min={30}
          max={150}
          step={2}
          format={(value) => `${value.toFixed(0)} px`}
          onChange={(labelMinScreenSize) => onGlobeChange({ labelMinScreenSize })}
        />
        <SliderField
          label="Fade range"
          value={settings.labelSizeFadeRange}
          min={0}
          max={1}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(labelSizeFadeRange) => onGlobeChange({ labelSizeFadeRange })}
        />

        <SectionHeading>Motion</SectionHeading>
        <SliderField
          label="Transition"
          value={settings.labelTransitionMs}
          min={0}
          max={800}
          step={20}
          format={(value) => `${value.toFixed(0)} ms`}
          onChange={(labelTransitionMs) => onGlobeChange({ labelTransitionMs })}
        />

        <SectionHeading>Typography</SectionHeading>
        <ColorField
          label="Text color"
          value={settings.labelColor || '#ffffff'}
          onChange={(labelColor) => onGlobeChange({ labelColor })}
          hint={settings.labelColor === '' ? 'Theme default' : undefined}
          {...(settings.labelColor !== '' ? { preset: '' } : {})}
        />
        <SliderField
          label="Font size"
          value={settings.labelFontSize}
          min={8}
          max={20}
          step={1}
          format={(value) => `${value.toFixed(0)} px`}
          onChange={(labelFontSize) => onGlobeChange({ labelFontSize })}
        />
        <SelectField
          label="Font weight"
          value={settings.labelFontWeight}
          options={fontWeightOptions}
          onChange={(labelFontWeight) => onGlobeChange({ labelFontWeight })}
        />

        <SectionHeading>Halo</SectionHeading>
        <SwitchField
          label="Halo"
          checked={settings.labelHaloEnabled}
          onChange={(labelHaloEnabled) => onGlobeChange({ labelHaloEnabled })}
          value="Stacked text-shadow outline for legibility"
        />
        <DependsOn
          when={settings.labelHaloEnabled}
          because="Enable Halo first."
          className="space-y-4"
        >
          <SliderField
            label="Halo radius"
            value={settings.labelHaloRadius}
            min={0.5}
            max={6}
            step={0.5}
            format={(value) => `${value.toFixed(1)} px`}
            onChange={(labelHaloRadius) => onGlobeChange({ labelHaloRadius })}
          />
          <SliderField
            label="Halo steps"
            value={settings.labelHaloSteps}
            min={2}
            max={12}
            step={1}
            format={(value) => `${value}`}
            onChange={(labelHaloSteps) => onGlobeChange({ labelHaloSteps })}
          />
          <ColorField
            label="Halo color"
            value={settings.labelHaloColor}
            onChange={(labelHaloColor) => onGlobeChange({ labelHaloColor })}
            swatches={[
              '#000000',
              '#1f2937',
              '#0c0a09',
              '#0b1220',
              '#3b1a0c',
              '#27272a',
              '#451a03',
              '#0f172a',
            ]}
          />
        </DependsOn>
      </DependsOn>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-amber-200/60">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    kind: 'outline',
    theme: 'outline-dark',
    initialLat: 48,
    initialLng: 12,
    speed: 0.025,
    framingPadding: 0.16,
    atmosphere: true,
    starfield: true,
    tagline: 'Outline · Europe · slow ambient — so labels read as the subject',
  },
  KnobsComponent,
  // Every label-related GlobeSettings field. The preview live-updates
  // via globe.update() — the labels layer reads thresholds per frame
  // and walks DOM nodes for style mutations. Zero rebuild.
  watchedKeys: [
    'countryLabels',
    'labelMinScreenSize',
    'labelSizeFadeRange',
    'labelTransitionMs',
    'labelHaloEnabled',
    'labelHaloRadius',
    'labelHaloColor',
    'labelHaloSteps',
    'labelColor',
    'labelFontSize',
    'labelFontWeight',
  ],
};

export default preset;
