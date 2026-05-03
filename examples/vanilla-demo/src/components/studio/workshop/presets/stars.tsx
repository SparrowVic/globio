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
 * Stars configurator preset.
 *
 * Cinematography: hologram-cyan kind so the globe has a moody dim
 * silhouette and the starfield reads as the dominant element. Camera
 * pulled back further than usual (framingPadding 0.32) so we see lots
 * of sky around the globe — that's the whole point. Slow rotate so
 * twinkle behaviour is visible without the page feeling busy.
 *
 * Knobs: every StarfieldConfig knob, grouped Density → Variety → Twinkle.
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
      <SwitchField
        label="Enable starfield"
        checked={settings.starfield}
        onChange={(starfield) => onGlobeChange({ starfield })}
      />

      <DependsOn
        when={settings.starfield}
        because="Enable the starfield first to tune density and twinkle."
        className="space-y-4"
      >
        <SectionHeading>Density & size</SectionHeading>
        <SliderField
          label="Star count"
          value={settings.starfieldDensity}
          min={300}
          max={6000}
          step={100}
          format={(value) => value.toLocaleString()}
          onChange={(starfieldDensity) => onGlobeChange({ starfieldDensity })}
        />
        <SliderField
          label="Star size"
          value={settings.starfieldSize}
          min={0.5}
          max={4}
          step={0.1}
          format={(value) => `${value.toFixed(1)} px`}
          onChange={(starfieldSize) => onGlobeChange({ starfieldSize })}
        />
        <SliderField
          label="Size variety"
          value={settings.starfieldSizeVariety}
          min={0}
          max={1}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(starfieldSizeVariety) => onGlobeChange({ starfieldSizeVariety })}
        />

        <SectionHeading>Colour</SectionHeading>
        <SwitchField
          label="Mixed colours (warm / cool / white)"
          checked={settings.starfieldMultiColor}
          onChange={(starfieldMultiColor) => onGlobeChange({ starfieldMultiColor })}
        />

        <SectionHeading>Twinkle</SectionHeading>
        <SwitchField
          label="Twinkle"
          checked={settings.starfieldTwinkle}
          onChange={(starfieldTwinkle) => onGlobeChange({ starfieldTwinkle })}
        />
        <SliderField
          label="Intensity"
          value={settings.starfieldTwinkleIntensity}
          min={0}
          max={1}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(starfieldTwinkleIntensity) => onGlobeChange({ starfieldTwinkleIntensity })}
          disabled={!settings.starfieldTwinkle}
          disabledReason="Enable Twinkle first."
        />
        <SliderField
          label="Speed"
          value={settings.starfieldTwinkleSpeed}
          min={0.1}
          max={2}
          step={0.05}
          format={(value) => `${value.toFixed(2)} Hz`}
          onChange={(starfieldTwinkleSpeed) => onGlobeChange({ starfieldTwinkleSpeed })}
          disabled={!settings.starfieldTwinkle}
          disabledReason="Enable Twinkle first."
        />
      </DependsOn>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-violet-200/70">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    kind: 'hologram',
    theme: 'hologram-cyan',
    initialLat: 8,
    initialLng: -14,
    speed: 0.02,
    framingPadding: 0.32,
    atmosphere: true,
    starfield: true,
    tagline: 'Hologram · pulled-back framing — the stars dominate the frame',
  },
  KnobsComponent,
  watchedKeys: [
    'starfield',
    'starfieldDensity',
    'starfieldSize',
    'starfieldSizeVariety',
    'starfieldMultiColor',
    'starfieldTwinkle',
    'starfieldTwinkleIntensity',
    'starfieldTwinkleSpeed',
  ],
};

export default preset;
