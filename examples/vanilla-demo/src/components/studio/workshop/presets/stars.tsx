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
 * Stars configurator preset.
 *
 * Cinematography: hologram-cyan kind so the globe has a moody dim
 * silhouette and the starfield reads as the dominant element. Camera
 * pulled back further than usual (framingPadding 0.32) so we see lots
 * of sky around the globe — that's the whole point. Slow rotate.
 *
 * Knobs: every StarfieldConfig knob plus a per-swatch palette editor.
 * Density / palette / sizeVariety still trigger a layer-level swap in
 * core (geometry-baked), but only the points cloud blinks for one
 * frame; the rest of the scene keeps rendering uninterrupted.
 */

const PALETTE_PRESETS: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly colors: ReadonlyArray<string>;
}> = [
  {
    id: 'realistic',
    label: 'Realistic',
    colors: ['#ffffff', '#fff4d6', '#ffe4b3', '#cfdcff', '#b9c8ff'],
  },
  {
    id: 'aurora',
    label: 'Aurora',
    colors: ['#a7f3d0', '#67e8f9', '#a78bfa', '#f472b6', '#fef08a'],
  },
  {
    id: 'sunset',
    label: 'Sunset',
    colors: ['#fbbf24', '#f97316', '#ef4444', '#f472b6', '#ffffff'],
  },
  {
    id: 'mono-warm',
    label: 'Warm mono',
    colors: ['#ffd28a', '#ffe4b3', '#fff4d6', '#ffe7c2', '#ffffff'],
  },
  {
    id: 'mono-cool',
    label: 'Cool mono',
    colors: ['#cfdcff', '#b9c8ff', '#9bb5ff', '#7da0ff', '#ffffff'],
  },
];

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

        <SectionHeading>Color</SectionHeading>
        <SwitchField
          label="Mixed colors"
          checked={settings.starfieldMultiColor}
          onChange={(starfieldMultiColor) => onGlobeChange({ starfieldMultiColor })}
          value="Sample per-star colors from the palette below"
        />
        <DependsOn
          when={settings.starfieldMultiColor}
          because="Enable Mixed colors to edit the palette."
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-slate-300/70">
              Presets
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {PALETTE_PRESETS.map((p) => {
                const active = palettesEqual(settings.starfieldPalette, p.colors);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onGlobeChange({ starfieldPalette: p.colors })}
                    className={
                      'flex flex-col gap-1 rounded-md border px-1.5 py-1.5 transition-colors ' +
                      (active
                        ? 'border-violet-300/50 bg-violet-200/[0.05]'
                        : 'border-white/8 bg-white/[0.02] hover:border-white/20')
                    }
                  >
                    <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-slate-200">
                      {p.label}
                    </span>
                    <div className="flex gap-1">
                      {p.colors.map((c) => (
                        <span
                          key={c}
                          className="size-2.5 rounded-full"
                          style={{ background: c, boxShadow: `0 0 6px ${c}99` }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-slate-300/70">
                Custom swatches
              </p>
              <button
                type="button"
                onClick={() =>
                  onGlobeChange({
                    starfieldPalette: [...settings.starfieldPalette, '#ffffff'],
                  })
                }
                disabled={settings.starfieldPalette.length >= 8}
                className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:border-white/20 hover:text-white disabled:opacity-40"
              >
                + Add
              </button>
            </div>
            {settings.starfieldPalette.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <ColorField
                    label={`Slot ${i + 1}`}
                    value={c}
                    onChange={(next) => {
                      const list = [...settings.starfieldPalette];
                      list[i] = next;
                      onGlobeChange({ starfieldPalette: list });
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const list = settings.starfieldPalette.filter((_, j) => j !== i);
                    onGlobeChange({ starfieldPalette: list });
                  }}
                  disabled={settings.starfieldPalette.length <= 1}
                  className="size-7 shrink-0 rounded border border-white/10 bg-white/[0.04] text-[14px] leading-none text-slate-400 hover:border-rose-300/40 hover:text-rose-200 disabled:opacity-40"
                  aria-label="Remove swatch"
                  title="Remove swatch"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </DependsOn>

        <SectionHeading>Twinkle</SectionHeading>
        <SwitchField
          label="Twinkle"
          checked={settings.starfieldTwinkle}
          onChange={(starfieldTwinkle) => onGlobeChange({ starfieldTwinkle })}
        />
        <DependsOn
          when={settings.starfieldTwinkle}
          because="Enable Twinkle first."
          className="space-y-4"
        >
          <SliderField
            label="Intensity"
            value={settings.starfieldTwinkleIntensity}
            min={0}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(starfieldTwinkleIntensity) =>
              onGlobeChange({ starfieldTwinkleIntensity })
            }
          />
          <SliderField
            label="Speed"
            value={settings.starfieldTwinkleSpeed}
            min={0.1}
            max={2}
            step={0.05}
            format={(value) => `${value.toFixed(2)} Hz`}
            onChange={(starfieldTwinkleSpeed) => onGlobeChange({ starfieldTwinkleSpeed })}
          />
        </DependsOn>
      </DependsOn>
    </div>
  );
};

function palettesEqual(a: ReadonlyArray<string>, b: ReadonlyArray<string>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.toLowerCase() !== b[i]?.toLowerCase()) return false;
  }
  return true;
}

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-violet-200/75">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    initialLat: 8,
    initialLng: -14,
    speed: 0.02,
    framingPadding: 0.32,
    atmosphere: true,
    starfield: true,
    tagline: 'Pulled-back framing — the stars dominate the frame',
  },
  KnobsComponent,
  watchedKeys: [
    'starfield',
    'starfieldDensity',
    'starfieldSize',
    'starfieldSizeVariety',
    'starfieldMultiColor',
    'starfieldPalette',
    'starfieldTwinkle',
    'starfieldTwinkleIntensity',
    'starfieldTwinkleSpeed',
  ],
};

export default preset;
