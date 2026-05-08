import {
  ColorField,
  SliderField,
  SwitchField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Hover crosshair configurator preset.
 *
 * Cinematography: parked over Asia for the wide land mass + varied
 * country sizes — sweeping the cursor across many silhouettes shows
 * the reticle's chase-ease and the lat/lng readout's snap to the
 * underlying geography.
 *
 * Outline / dotted / hologram / paper currently mount reticles. The preview
 * mirrors the user's current studio kind, so each kind renders its
 * own implementation from the same semantic controls.
 *
 * Knob coverage: master toggle, color, size, opacity, ring radius,
 * cardinal-tick toggle, tooltip on/off, lat/lng decimal precision.
 * All live — color via material mutation, geometry-baked fields
 * (size, ring radius, ticks) trigger an in-place line-segments
 * rebuild (single small mesh, single-digit-millisecond cost).
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
      <DependsOn
        when={
          settings.kind === 'outline' ||
          settings.kind === 'dotted' ||
          settings.kind === 'hologram' ||
          settings.kind === 'paper'
        }
        because="Crosshair is mounted on outline, dotted, hologram, and paper today. Switch to one of those kinds to tune it."
        className="space-y-4"
        variant="hidden"
      >
        <SwitchField
          label="Hover crosshair"
          checked={settings.outlineHoverCrosshair}
          onChange={(outlineHoverCrosshair) => onGlobeChange({ outlineHoverCrosshair })}
          value="Targeting reticle + lat/lng readout while hovering"
        />

        <DependsOn
          when={settings.outlineHoverCrosshair}
          because="Enable Hover crosshair first."
          className="space-y-4"
        >
          <SectionHeading>Color</SectionHeading>
          <ColorField
            label="Reticle color"
            value={settings.outlineHoverCrosshairColor || '#fbbf24'}
            onChange={(outlineHoverCrosshairColor) =>
              onGlobeChange({ outlineHoverCrosshairColor })
            }
            hint={settings.outlineHoverCrosshairColor === '' ? 'Theme default' : undefined}
            {...(settings.outlineHoverCrosshairColor !== '' ? { preset: '' } : {})}
            swatches={[
              '#fbbf24',
              '#f59e0b',
              '#67e8f9',
              '#22d3ee',
              '#a78bfa',
              '#f472b6',
              '#ef4444',
              '#34d399',
              '#84cc16',
              '#fde68a',
              '#ffffff',
              '#cfdcff',
            ]}
          />
          <SliderField
            label="Opacity"
            value={settings.outlineHoverCrosshairOpacity}
            min={0.1}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(outlineHoverCrosshairOpacity) =>
              onGlobeChange({ outlineHoverCrosshairOpacity })
            }
          />

          <SectionHeading>Geometry</SectionHeading>
          <SliderField
            label="Reticle size"
            value={settings.outlineHoverCrosshairSize}
            min={0.005}
            max={0.04}
            step={0.001}
            format={(value) => value.toFixed(3)}
            onChange={(outlineHoverCrosshairSize) =>
              onGlobeChange({ outlineHoverCrosshairSize })
            }
          />
          <SliderField
            label="Ring radius"
            value={settings.outlineHoverCrosshairRingRadiusFactor}
            min={0}
            max={1}
            step={0.05}
            format={(value) => (value === 0 ? 'no ring' : `×${value.toFixed(2)}`)}
            onChange={(outlineHoverCrosshairRingRadiusFactor) =>
              onGlobeChange({ outlineHoverCrosshairRingRadiusFactor })
            }
          />
          <SwitchField
            label="Cardinal ticks"
            checked={settings.outlineHoverCrosshairCardinalTicks}
            onChange={(outlineHoverCrosshairCardinalTicks) =>
              onGlobeChange({ outlineHoverCrosshairCardinalTicks })
            }
            value="N / S / E / W tick marks just outside the ring"
          />

          <SectionHeading>Readout</SectionHeading>
          <SwitchField
            label="Lat / lng tooltip"
            checked={settings.outlineHoverCrosshairTooltip}
            onChange={(outlineHoverCrosshairTooltip) =>
              onGlobeChange({ outlineHoverCrosshairTooltip })
            }
            value="DOM card pinned next to the cursor"
          />
          <DependsOn
            when={settings.outlineHoverCrosshairTooltip}
            because="Enable Lat / lng tooltip first."
            className="space-y-4"
          >
            <SliderField
              label="Decimals"
              value={settings.outlineHoverCrosshairTooltipDecimals}
              min={0}
              max={6}
              step={1}
              format={(value) => `${value} digit${value === 1 ? '' : 's'}`}
              onChange={(outlineHoverCrosshairTooltipDecimals) =>
                onGlobeChange({ outlineHoverCrosshairTooltipDecimals })
              }
            />
          </DependsOn>
        </DependsOn>
      </DependsOn>

      <p className="rounded-md border border-dashed border-amber-200/[0.16] bg-amber-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-amber-100/80">
        Tip: drop the ring radius to <span className="text-white">0</span> for
        a pure cross, or push the size to <span className="text-white">0.03+</span>
        with cardinal ticks on for a heavier surveying-instrument vibe.
      </p>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-amber-200/75">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    initialLat: 32,
    initialLng: 95,
    speed: 0.02,
    framingPadding: 0.16,
    atmosphere: true,
    starfield: true,
    tagline: 'Asia — sweep the cursor to see the reticle track',
  },
  KnobsComponent,
  watchedKeys: [
    'outlineHoverCrosshair',
    'outlineHoverCrosshairColor',
    'outlineHoverCrosshairSize',
    'outlineHoverCrosshairOpacity',
    'outlineHoverCrosshairRingRadiusFactor',
    'outlineHoverCrosshairCardinalTicks',
    'outlineHoverCrosshairTooltip',
    'outlineHoverCrosshairTooltipDecimals',
  ],
  // All crosshair knobs are live via outline kindHandle.setOutline-
  // Config + HoverCrosshairLayer setters. No rebuild keys.
};

export default preset;
