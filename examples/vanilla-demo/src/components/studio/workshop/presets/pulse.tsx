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

const focusPulseOriginOptions = [
  { value: 'click', label: 'Click point' },
  { value: 'centroid', label: 'Centroid' },
] as const;

/**
 * Pulse configurator preset.
 *
 * Cinematography: outline-dark — the gold sonar ring reads crisply
 * against linework. Auto-rotate is slow enough to spawn a fresh pulse
 * every couple of seconds (via on-surface-click) without blurring.
 *
 * All band geometry is now live via the `FocusPulseDecorator.setOptions`
 * hatch (timing / shape / motion / color all mutate without rebuild).
 * Segments triggers an in-place geometry rebuild for the slot pool —
 * still cheaper than a full globe rebuild.
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;

  return (
    <div className="space-y-4">
      <SwitchField
        label="Enable focus pulse"
        checked={settings.focusPulse}
        onChange={(focusPulse) => onGlobeChange({ focusPulse })}
      />

      <DependsOn
        when={settings.focusPulse}
        because="Enable focus pulse first."
        className="space-y-4"
      >
        <SectionHeading>Trigger</SectionHeading>
        <ToggleField
          label="Pulse origin"
          value={settings.focusPulseOrigin}
          options={focusPulseOriginOptions}
          onChange={(focusPulseOrigin) => onGlobeChange({ focusPulseOrigin })}
        />
        <SwitchField
          label="Fire on ocean / void clicks"
          checked={settings.focusPulseOnSurfaceClick}
          onChange={(focusPulseOnSurfaceClick) => onGlobeChange({ focusPulseOnSurfaceClick })}
          value="Click anywhere on the surface to test"
        />

        <DependsOn
          when={settings.kind === 'outline'}
          because="Outline-specific band geometry. Switch the main globe to outline kind to tune."
          className="space-y-4"
          variant="hidden"
        >
          <SectionHeading>Outline · timing</SectionHeading>
          <SliderField
            label="Duration"
            value={settings.outlinePulseDurationMs}
            min={300}
            max={3500}
            step={50}
            format={(value) => `${(value / 1000).toFixed(2)} s`}
            onChange={(outlinePulseDurationMs) => onGlobeChange({ outlinePulseDurationMs })}
          />

          <SectionHeading>Outline · shape</SectionHeading>
          <SliderField
            label="Start radius"
            value={settings.outlinePulseRadiusBase}
            min={0.01}
            max={0.2}
            step={0.005}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(outlinePulseRadiusBase) => onGlobeChange({ outlinePulseRadiusBase })}
          />
          <SliderField
            label="Band thickness"
            value={settings.outlinePulseAngularBand}
            min={0.003}
            max={0.05}
            step={0.001}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(2)}°`}
            onChange={(outlinePulseAngularBand) => onGlobeChange({ outlinePulseAngularBand })}
          />
          <SliderField
            label="Surface lift"
            value={settings.outlinePulseRadiusFactor}
            min={1}
            max={1.025}
            step={0.0005}
            format={(value) => `${((value - 1) * 100).toFixed(2)}%`}
            onChange={(outlinePulseRadiusFactor) =>
              onGlobeChange({ outlinePulseRadiusFactor })
            }
          />
          <SliderField
            label="Segments"
            value={settings.outlinePulseSegments}
            min={24}
            max={192}
            step={4}
            format={(value) => `${value}`}
            onChange={(outlinePulseSegments) => onGlobeChange({ outlinePulseSegments })}
          />

          <SectionHeading>Outline · motion</SectionHeading>
          <SliderField
            label="Start scale"
            value={settings.outlinePulseScaleMin}
            min={0.1}
            max={1.5}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(outlinePulseScaleMin) => onGlobeChange({ outlinePulseScaleMin })}
          />
          <SliderField
            label="Peak scale"
            value={settings.outlinePulseScaleMax}
            min={1.2}
            max={5}
            step={0.1}
            format={(value) => `×${value.toFixed(1)}`}
            onChange={(outlinePulseScaleMax) => onGlobeChange({ outlinePulseScaleMax })}
          />
          <SliderField
            label="Peak intensity"
            value={settings.outlinePulseOpacity}
            min={0.2}
            max={2}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(outlinePulseOpacity) => onGlobeChange({ outlinePulseOpacity })}
          />

          <SectionHeading>Outline · color</SectionHeading>
          <ColorField
            label="Ring color"
            value={settings.outlinePulseColor || '#fbbf24'}
            onChange={(outlinePulseColor) => onGlobeChange({ outlinePulseColor })}
            hint={settings.outlinePulseColor === '' ? 'Theme default' : undefined}
            {...(settings.outlinePulseColor !== '' ? { preset: '' } : {})}
            swatches={[
              '#fbbf24',
              '#f59e0b',
              '#ef4444',
              '#f472b6',
              '#a78bfa',
              '#67e8f9',
              '#22d3ee',
              '#34d399',
              '#84cc16',
              '#fde68a',
              '#ffffff',
              '#fee2e2',
            ]}
          />
        </DependsOn>

        <DependsOn
          when={settings.kind === 'dotted'}
          because="Dotted renders focus pulse as a ripple through the dot field. Switch the main globe to dotted kind to tune."
          className="space-y-4"
          variant="hidden"
        >
          <SectionHeading>Dotted · ripple wave</SectionHeading>
          <SwitchField
            label="Dot-field ripple"
            checked={settings.dottedRipple}
            onChange={(dottedRipple) => onGlobeChange({ dottedRipple })}
            value="Focus and surface clicks propagate through the dots"
          />
          <DependsOn
            when={settings.dottedRipple}
            because="Enable Dot-field ripple first."
            className="space-y-4"
          >
            <SliderField
              label="Boost"
              value={settings.dottedRippleBoost}
              min={0.1}
              max={4}
              step={0.05}
              format={(value) => value.toFixed(2)}
              onChange={(dottedRippleBoost) => onGlobeChange({ dottedRippleBoost })}
            />
            <SliderField
              label="Speed"
              value={settings.dottedRippleSpeed}
              min={0.1}
              max={4}
              step={0.05}
              format={(value) => `${value.toFixed(2)}x`}
              onChange={(dottedRippleSpeed) => onGlobeChange({ dottedRippleSpeed })}
            />
            <SliderField
              label="Wave width"
              value={settings.dottedRippleWidth}
              min={0.02}
              max={0.5}
              step={0.01}
              format={(value) => value.toFixed(2)}
              onChange={(dottedRippleWidth) => onGlobeChange({ dottedRippleWidth })}
            />
            <SliderField
              label="Concurrent waves"
              value={settings.dottedRippleMaxConcurrent}
              min={1}
              max={8}
              step={1}
              format={(value) => `${value}`}
              onChange={(dottedRippleMaxConcurrent) =>
                onGlobeChange({ dottedRippleMaxConcurrent })
              }
            />
            <ColorField
              label="Ripple color"
              value={settings.dottedRippleColor || '#7fdfff'}
              onChange={(dottedRippleColor) => onGlobeChange({ dottedRippleColor })}
              hint={settings.dottedRippleColor === '' ? 'Follow dot color' : undefined}
              {...(settings.dottedRippleColor !== '' ? { preset: '' } : {})}
              swatches={[
                '#7fdfff',
                '#22d3ee',
                '#67e8f9',
                '#a78bfa',
                '#f472b6',
                '#fbbf24',
                '#34d399',
                '#ffffff',
              ]}
            />
          </DependsOn>
        </DependsOn>
      </DependsOn>

      <p className="rounded-md border border-dashed border-pink-200/[0.16] bg-pink-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-pink-100/80">
        Tip: <span className="text-white">click anywhere on the preview globe</span> to
        fire a pulse and see the live timing / size / color effect.
      </p>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-pink-200/70">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    initialLat: 12,
    initialLng: 0,
    speed: 0.03,
    framingPadding: 0.18,
    atmosphere: true,
    starfield: true,
    tagline: 'Click anywhere on the surface to fire a pulse',
  },
  KnobsComponent,
  watchedKeys: [
    'focusPulse',
    'focusPulseOrigin',
    'focusPulseOnSurfaceClick',
    'outlinePulseDurationMs',
    'outlinePulseRadiusBase',
    'outlinePulseAngularBand',
    'outlinePulseScaleMin',
    'outlinePulseScaleMax',
    'outlinePulseOpacity',
    'outlinePulseSegments',
    'outlinePulseColor',
    'outlinePulseRadiusFactor',
    'dottedRipple',
    'dottedRippleBoost',
    'dottedRippleSpeed',
    'dottedRippleWidth',
    'dottedRippleMaxConcurrent',
    'dottedRippleColor',
  ],
  // All band geometry + color / radius factor are live via
  // FocusPulseDecorator.setOptions(). Origin + on-surface-click flip
  // live too — they're read from state.config at click time, no
  // rebuild needed. Only the master `enabled` toggle rebuilds, since
  // the decoration returns a no-op stub when disabled.
  rebuildKeys: ['focusPulse'],
};

export default preset;
