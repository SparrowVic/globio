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
        configPath="focusPulse.enabled"
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
          configPath="focusPulse.origin"
          value={settings.focusPulseOrigin}
          options={focusPulseOriginOptions}
          onChange={(focusPulseOrigin) => onGlobeChange({ focusPulseOrigin })}
        />
        <SwitchField
          label="Fire on ocean / void clicks"
          configPath="focusPulse.pulseOnSurfaceClick"
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
            configPath="outline.focusPulse.durationMs"
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
            configPath="outline.focusPulse.angularRadiusBase"
            value={settings.outlinePulseRadiusBase}
            min={0.01}
            max={0.2}
            step={0.005}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(outlinePulseRadiusBase) => onGlobeChange({ outlinePulseRadiusBase })}
          />
          <SliderField
            label="Band thickness"
            configPath="outline.focusPulse.angularBand"
            value={settings.outlinePulseAngularBand}
            min={0.003}
            max={0.05}
            step={0.001}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(2)}°`}
            onChange={(outlinePulseAngularBand) => onGlobeChange({ outlinePulseAngularBand })}
          />
          <SliderField
            label="Surface lift"
            configPath="outline.focusPulse.radiusFactor"
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
            configPath="outline.focusPulse.segments"
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
            configPath="outline.focusPulse.scaleMin"
            value={settings.outlinePulseScaleMin}
            min={0.1}
            max={1.5}
            step={0.05}
            format={(value) => `×${value.toFixed(2)}`}
            onChange={(outlinePulseScaleMin) => onGlobeChange({ outlinePulseScaleMin })}
          />
          <SliderField
            label="Peak scale"
            configPath="outline.focusPulse.scaleMax"
            value={settings.outlinePulseScaleMax}
            min={1.2}
            max={5}
            step={0.1}
            format={(value) => `×${value.toFixed(1)}`}
            onChange={(outlinePulseScaleMax) => onGlobeChange({ outlinePulseScaleMax })}
          />
          <SliderField
            label="Peak intensity"
            configPath="outline.focusPulse.peakOpacity"
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
            configPath="outline.focusPulse.color"
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
            configPath="dotted.clickRipple.enabled"
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
              configPath="dotted.clickRipple.boost"
              value={settings.dottedRippleBoost}
              min={0.1}
              max={4}
              step={0.05}
              format={(value) => value.toFixed(2)}
              onChange={(dottedRippleBoost) => onGlobeChange({ dottedRippleBoost })}
            />
            <SliderField
              label="Speed"
              configPath="dotted.clickRipple.speed"
              value={settings.dottedRippleSpeed}
              min={0.1}
              max={4}
              step={0.05}
              format={(value) => `${value.toFixed(2)}x`}
              onChange={(dottedRippleSpeed) => onGlobeChange({ dottedRippleSpeed })}
            />
            <SliderField
              label="Wave width"
              configPath="dotted.clickRipple.width"
              value={settings.dottedRippleWidth}
              min={0.02}
              max={0.5}
              step={0.01}
              format={(value) => value.toFixed(2)}
              onChange={(dottedRippleWidth) => onGlobeChange({ dottedRippleWidth })}
            />
            <SliderField
              label="Concurrent waves"
              configPath="dotted.clickRipple.maxConcurrent"
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
              configPath="dotted.clickRipple.color"
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

        <DependsOn
          when={settings.kind === 'hologram'}
          because="Hologram renders focus pulse as layered projection rings. Switch the main globe to hologram kind to tune."
          className="space-y-4"
          variant="hidden"
        >
          <SectionHeading>Hologram · projection pulse</SectionHeading>
          <SliderField
            label="Duration"
            configPath="hologram.focusPulse.durationMs"
            value={settings.hologramPulseDurationMs}
            min={250}
            max={2600}
            step={50}
            format={(value) => `${(value / 1000).toFixed(2)} s`}
            onChange={(hologramPulseDurationMs) =>
              onGlobeChange({ hologramPulseDurationMs })
            }
          />
          <SliderField
            label="Emitter radius"
            configPath="hologram.focusPulse.angularRadiusBase"
            value={settings.hologramPulseRadiusBase}
            min={0.015}
            max={0.18}
            step={0.005}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(hologramPulseRadiusBase) =>
              onGlobeChange({ hologramPulseRadiusBase })
            }
          />
          <SliderField
            label="Beam thickness"
            configPath="hologram.focusPulse.angularBand"
            value={settings.hologramPulseAngularBand}
            min={0.003}
            max={0.06}
            step={0.001}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(2)}°`}
            onChange={(hologramPulseAngularBand) =>
              onGlobeChange({ hologramPulseAngularBand })
            }
          />
          <SliderField
            label="Start scale"
            configPath="hologram.focusPulse.scaleMin"
            value={settings.hologramPulseScaleMin}
            min={0.05}
            max={1}
            step={0.05}
            format={(value) => `x${value.toFixed(2)}`}
            onChange={(hologramPulseScaleMin) =>
              onGlobeChange({ hologramPulseScaleMin })
            }
          />
          <SliderField
            label="Expansion"
            configPath="hologram.focusPulse.scaleMax"
            value={settings.hologramPulseScaleMax}
            min={1}
            max={5}
            step={0.1}
            format={(value) => `x${value.toFixed(1)}`}
            onChange={(hologramPulseScaleMax) =>
              onGlobeChange({ hologramPulseScaleMax })
            }
          />
          <SliderField
            label="Peak gain"
            configPath="hologram.focusPulse.peakOpacity"
            value={settings.hologramPulseOpacity}
            min={0.2}
            max={2.5}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(hologramPulseOpacity) => onGlobeChange({ hologramPulseOpacity })}
          />
          <SliderField
            label="Segments"
            configPath="hologram.focusPulse.segments"
            value={settings.hologramPulseSegments}
            min={24}
            max={224}
            step={4}
            format={(value) => `${value}`}
            onChange={(hologramPulseSegments) =>
              onGlobeChange({ hologramPulseSegments })
            }
          />
          <SliderField
            label="Surface lift"
            configPath="hologram.focusPulse.radiusFactor"
            value={settings.hologramPulseRadiusFactor}
            min={1}
            max={1.04}
            step={0.0005}
            format={(value) => `${((value - 1) * 100).toFixed(2)}%`}
            onChange={(hologramPulseRadiusFactor) =>
              onGlobeChange({ hologramPulseRadiusFactor })
            }
          />
          <ColorField
            label="Projection color"
            configPath="hologram.focusPulse.color"
            value={settings.hologramPulseColor || '#67e8f9'}
            onChange={(hologramPulseColor) => onGlobeChange({ hologramPulseColor })}
            hint={settings.hologramPulseColor === '' ? 'Theme default' : undefined}
            {...(settings.hologramPulseColor !== '' ? { preset: '' } : {})}
            swatches={[
              '#67e8f9',
              '#22d3ee',
              '#a5f3fc',
              '#5eead4',
              '#a78bfa',
              '#f472b6',
              '#fbbf24',
              '#ffffff',
            ]}
          />
        </DependsOn>

        <DependsOn
          when={settings.kind === 'cinematic'}
          because="Cinematic renders focus pulse as a warm atmospheric shockwave. Switch the main globe to cinematic kind to tune."
          className="space-y-4"
          variant="hidden"
        >
          <SectionHeading>Cinematic · atmosphere wave</SectionHeading>
          <SliderField
            label="Duration"
            configPath="cinematic.focusPulse.durationMs"
            value={settings.cinematicPulseDurationMs}
            min={300}
            max={3200}
            step={50}
            format={(value) => `${(value / 1000).toFixed(2)} s`}
            onChange={(cinematicPulseDurationMs) =>
              onGlobeChange({ cinematicPulseDurationMs })
            }
          />
          <SliderField
            label="Start radius"
            configPath="cinematic.focusPulse.angularRadiusBase"
            value={settings.cinematicPulseRadiusBase}
            min={0.015}
            max={0.2}
            step={0.005}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(cinematicPulseRadiusBase) =>
              onGlobeChange({ cinematicPulseRadiusBase })
            }
          />
          <SliderField
            label="Band thickness"
            configPath="cinematic.focusPulse.angularBand"
            value={settings.cinematicPulseAngularBand}
            min={0.003}
            max={0.06}
            step={0.001}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(2)}°`}
            onChange={(cinematicPulseAngularBand) =>
              onGlobeChange({ cinematicPulseAngularBand })
            }
          />
          <SliderField
            label="Start scale"
            configPath="cinematic.focusPulse.scaleMin"
            value={settings.cinematicPulseScaleMin}
            min={0.05}
            max={1.2}
            step={0.05}
            format={(value) => `x${value.toFixed(2)}`}
            onChange={(cinematicPulseScaleMin) =>
              onGlobeChange({ cinematicPulseScaleMin })
            }
          />
          <SliderField
            label="Expansion"
            configPath="cinematic.focusPulse.scaleMax"
            value={settings.cinematicPulseScaleMax}
            min={1}
            max={5}
            step={0.1}
            format={(value) => `x${value.toFixed(1)}`}
            onChange={(cinematicPulseScaleMax) =>
              onGlobeChange({ cinematicPulseScaleMax })
            }
          />
          <SliderField
            label="Peak glow"
            configPath="cinematic.focusPulse.peakOpacity"
            value={settings.cinematicPulseOpacity}
            min={0.1}
            max={2.2}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(cinematicPulseOpacity) => onGlobeChange({ cinematicPulseOpacity })}
          />
          <SliderField
            label="Segments"
            configPath="cinematic.focusPulse.segments"
            value={settings.cinematicPulseSegments}
            min={24}
            max={224}
            step={4}
            format={(value) => `${value}`}
            onChange={(cinematicPulseSegments) =>
              onGlobeChange({ cinematicPulseSegments })
            }
          />
          <SliderField
            label="Surface lift"
            configPath="cinematic.focusPulse.radiusFactor"
            value={settings.cinematicPulseRadiusFactor}
            min={1}
            max={1.04}
            step={0.0005}
            format={(value) => `${((value - 1) * 100).toFixed(2)}%`}
            onChange={(cinematicPulseRadiusFactor) =>
              onGlobeChange({ cinematicPulseRadiusFactor })
            }
          />
          <ColorField
            label="Wave color"
            configPath="cinematic.focusPulse.color"
            value={settings.cinematicPulseColor || '#ffd36a'}
            onChange={(cinematicPulseColor) => onGlobeChange({ cinematicPulseColor })}
            hint={settings.cinematicPulseColor === '' ? 'Theme default' : undefined}
            {...(settings.cinematicPulseColor !== '' ? { preset: '' } : {})}
            swatches={[
              '#ffd36a',
              '#f6b44d',
              '#fff0b8',
              '#7df9ff',
              '#67e8f9',
              '#f472b6',
              '#ffffff',
            ]}
          />
        </DependsOn>

        <DependsOn
          when={settings.kind === 'paper'}
          because="Paper renders focus pulse as ink and watercolor rings. Switch the main globe to paper kind to tune."
          className="space-y-4"
          variant="hidden"
        >
          <SectionHeading>Paper · ink ripple</SectionHeading>
          <SliderField
            label="Duration"
            configPath="paper.focusPulse.durationMs"
            value={settings.paperPulseDurationMs}
            min={400}
            max={3200}
            step={50}
            format={(value) => `${(value / 1000).toFixed(2)} s`}
            onChange={(paperPulseDurationMs) => onGlobeChange({ paperPulseDurationMs })}
          />
          <SliderField
            label="Start radius"
            configPath="paper.focusPulse.angularRadiusBase"
            value={settings.paperPulseRadiusBase}
            min={0.015}
            max={0.18}
            step={0.005}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(paperPulseRadiusBase) => onGlobeChange({ paperPulseRadiusBase })}
          />
          <SliderField
            label="Ink thickness"
            configPath="paper.focusPulse.angularBand"
            value={settings.paperPulseAngularBand}
            min={0.004}
            max={0.07}
            step={0.001}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(2)}°`}
            onChange={(paperPulseAngularBand) => onGlobeChange({ paperPulseAngularBand })}
          />
          <SliderField
            label="Start scale"
            configPath="paper.focusPulse.scaleMin"
            value={settings.paperPulseScaleMin}
            min={0.05}
            max={1.2}
            step={0.05}
            format={(value) => `x${value.toFixed(2)}`}
            onChange={(paperPulseScaleMin) => onGlobeChange({ paperPulseScaleMin })}
          />
          <SliderField
            label="Expansion"
            configPath="paper.focusPulse.scaleMax"
            value={settings.paperPulseScaleMax}
            min={1}
            max={4}
            step={0.1}
            format={(value) => `x${value.toFixed(1)}`}
            onChange={(paperPulseScaleMax) => onGlobeChange({ paperPulseScaleMax })}
          />
          <SliderField
            label="Ink opacity"
            configPath="paper.focusPulse.peakOpacity"
            value={settings.paperPulseOpacity}
            min={0.1}
            max={1.5}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(paperPulseOpacity) => onGlobeChange({ paperPulseOpacity })}
          />
          <SliderField
            label="Segments"
            configPath="paper.focusPulse.segments"
            value={settings.paperPulseSegments}
            min={24}
            max={192}
            step={4}
            format={(value) => `${value}`}
            onChange={(paperPulseSegments) => onGlobeChange({ paperPulseSegments })}
          />
          <SliderField
            label="Surface lift"
            configPath="paper.focusPulse.radiusFactor"
            value={settings.paperPulseRadiusFactor}
            min={1}
            max={1.025}
            step={0.0005}
            format={(value) => `${((value - 1) * 100).toFixed(2)}%`}
            onChange={(paperPulseRadiusFactor) => onGlobeChange({ paperPulseRadiusFactor })}
          />
          <ColorField
            label="Ink color"
            configPath="paper.focusPulse.color"
            value={settings.paperPulseColor || '#5b3a1f'}
            onChange={(paperPulseColor) => onGlobeChange({ paperPulseColor })}
            hint={settings.paperPulseColor === '' ? 'Theme default' : undefined}
            {...(settings.paperPulseColor !== '' ? { preset: '' } : {})}
            swatches={[
              '#5b3a1f',
              '#3b2308',
              '#7a4f2a',
              '#a83a25',
              '#2563eb',
              '#0891b2',
              '#16a34a',
              '#d97706',
            ]}
          />
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
    <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-pink-200/75">
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
    'hologramPulseDurationMs',
    'hologramPulseRadiusBase',
    'hologramPulseAngularBand',
    'hologramPulseScaleMin',
    'hologramPulseScaleMax',
    'hologramPulseOpacity',
    'hologramPulseSegments',
    'hologramPulseColor',
    'hologramPulseRadiusFactor',
    'cinematicPulseDurationMs',
    'cinematicPulseRadiusBase',
    'cinematicPulseAngularBand',
    'cinematicPulseScaleMin',
    'cinematicPulseScaleMax',
    'cinematicPulseOpacity',
    'cinematicPulseSegments',
    'cinematicPulseColor',
    'cinematicPulseRadiusFactor',
    'paperPulseDurationMs',
    'paperPulseRadiusBase',
    'paperPulseAngularBand',
    'paperPulseScaleMin',
    'paperPulseScaleMax',
    'paperPulseOpacity',
    'paperPulseSegments',
    'paperPulseColor',
    'paperPulseRadiusFactor',
  ],
  // All band geometry + color / radius factor are live via
  // FocusPulseDecorator.setOptions(). Origin + on-surface-click flip
  // live too — they're read from state.config at click time, no
  // rebuild needed. Only the master `enabled` toggle rebuilds, since
  // the decoration returns a no-op stub when disabled.
  rebuildKeys: ['focusPulse'],
};

export default preset;
