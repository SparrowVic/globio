import {
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
 * effects clearly. Slow ambient rotate so the user sees labels fade in
 * and out across the silhouette as they rotate past.
 *
 * Knobs: every CountryLabelsConfig knob the API exposes today, in the
 * order users typically touch them: enable → density (threshold +
 * fade range) → motion (transition) → readability (halo + radius).
 */
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

        <SectionHeading>Readability</SectionHeading>
        <SwitchField
          label="Halo"
          checked={settings.labelHaloEnabled}
          onChange={(labelHaloEnabled) => onGlobeChange({ labelHaloEnabled })}
        />
        <SliderField
          label="Halo radius"
          value={settings.labelHaloRadius}
          min={0.5}
          max={6}
          step={0.5}
          format={(value) => `${value.toFixed(1)} px`}
          onChange={(labelHaloRadius) => onGlobeChange({ labelHaloRadius })}
          disabled={!settings.labelHaloEnabled}
          disabledReason="Enable Halo first."
        />
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
  // Every label-related GlobeSettings field. The preview rebuilds when
  // any of these change so the user sees their edits immediately.
  watchedKeys: [
    'countryLabels',
    'labelMinScreenSize',
    'labelSizeFadeRange',
    'labelTransitionMs',
    'labelHaloEnabled',
    'labelHaloRadius',
  ],
};

export default preset;
