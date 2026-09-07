import {
  ColorField,
  ColorListField,
  SliderField,
  ToggleField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

const modeOptions = [
  { value: 'none', label: 'Off' },
  { value: 'always', label: 'Solid' },
  { value: 'palette', label: 'Palette' },
] as const;

/**
 * Country fill configurator preset.
 *
 * The 9th canonical layer per kind. Paints country shapes with one of
 * three modes (the 4th, `'data'`, is reserved for the choropleth data
 * layer and isn't selectable here):
 *
 *  - `Off` — layer hidden (default)
 *  - `Solid` — every country shown with `defaultColor`
 *  - `Palette` — each country picks `palette[i % palette.length]` by
 *    feature order, so neighbouring countries land on visually
 *    distinct entries
 *
 * On top of the base mode, hover and pinned countries can recolor in
 * place — empty-string colour / 0 opacity reverts to the base.
 *
 * Cinematography: outline-dark over Africa so the user sees the
 * palette spread across many small bordering countries on first
 * paint — the strongest "wow" frame for the layer.
 */
const dotsModeOptions = [
  // 'theme' is the underlying enum value (matches `DottedConfig.dots.mode`),
  // but we surface it as "Solid" to mirror the Background fill card —
  // the user reads it as "every dot a single colour" rather than the
  // engine-internal "use the theme token" framing.
  { value: 'theme', label: 'Solid' },
  { value: 'palette', label: 'Palette' },
] as const;

const COUNTRY_FILL_PALETTE_SWATCHES = [
  '#67e8f9',
  '#fbbf24',
  '#f472b6',
  '#34d399',
  '#a78bfa',
  '#fb923c',
  '#22d3ee',
  '#facc15',
  '#ef4444',
  '#ffffff',
] as const;

const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  const mode = settings.countryFillMode;
  const dotsMode = settings.dottedDotsMode;
  const isDotted = settings.kind === 'dotted';
  const supportsBackground =
    settings.kind === 'cinematic' ||
    settings.kind === 'outline' ||
    settings.kind === 'dotted' ||
    settings.kind === 'hologram';
  return (
    <div className="space-y-4">
      <DependsOn
        when={supportsBackground}
        because="Background fill is mounted on cinematic, outline, dotted, and hologram today. Paper and wireframe use their own surface visual."
        className="space-y-4"
        variant="hidden"
      >
        <SectionHeading>
          {isDotted ? 'Background fill' : 'Fill mode'}
        </SectionHeading>
        <ToggleField
          label="Mode"
          configPath="countries.fill.mode"
          value={mode === 'data' ? 'none' : mode}
          options={modeOptions}
          onChange={(countryFillMode) => onGlobeChange({ countryFillMode })}
        />

      <DependsOn
        when={mode !== 'none' && mode !== 'data'}
        because="Pick Solid or Palette to expose the base + state knobs."
        className="space-y-4"
      >
        <SectionHeading>Base</SectionHeading>
        <ColorField
          label="Default color"
          configPath="countries.fill.defaultColor"
          value={settings.countryFillDefaultColor || '#1c3866'}
          onChange={(countryFillDefaultColor) => onGlobeChange({ countryFillDefaultColor })}
          hint={settings.countryFillDefaultColor === '' ? 'Theme default' : undefined}
          {...(settings.countryFillDefaultColor !== '' ? { preset: '' } : {})}
          swatches={['#1c3866', '#0f1d3a', '#67e8f9', '#fbbf24', '#a78bfa', '#ffffff']}
        />
        <SliderField
          label="Default opacity"
          configPath="countries.fill.defaultOpacity"
          value={settings.countryFillDefaultOpacity}
          min={0}
          max={1}
          step={0.05}
          format={(value) => (value <= 0 ? 'theme' : value.toFixed(2))}
          onChange={(countryFillDefaultOpacity) => onGlobeChange({ countryFillDefaultOpacity })}
        />

        <DependsOn
          when={mode === 'palette'}
          because="Palette only matters in Palette mode."
          className="space-y-4"
        >
          <ColorListField
            label="Palette"
            configPath="countries.fill.palette"
            colors={settings.countryFillPalette}
            onChange={(countryFillPalette) =>
              onGlobeChange({ countryFillPalette })
            }
            addLabel="Add color"
            swatches={COUNTRY_FILL_PALETTE_SWATCHES}
          />
        </DependsOn>

        <SectionHeading>Hover override</SectionHeading>
        <ColorField
          label="Hover color"
          configPath="countries.fill.hoverColor"
          value={settings.countryFillHoverColor || '#a5f3fc'}
          onChange={(countryFillHoverColor) => onGlobeChange({ countryFillHoverColor })}
          hint={settings.countryFillHoverColor === '' ? 'No override' : undefined}
          {...(settings.countryFillHoverColor !== '' ? { preset: '' } : {})}
          swatches={['#a5f3fc', '#67e8f9', '#fbbf24', '#f472b6', '#34d399', '#ffffff']}
        />
        <SliderField
          label="Hover opacity"
          configPath="countries.fill.hoverOpacity"
          value={settings.countryFillHoverOpacity}
          min={0}
          max={1}
          step={0.05}
          format={(value) => (value <= 0 ? 'inherit' : value.toFixed(2))}
          onChange={(countryFillHoverOpacity) => onGlobeChange({ countryFillHoverOpacity })}
        />

        <SectionHeading>Pinned override</SectionHeading>
        <ColorField
          label="Active color"
          configPath="countries.fill.activeColor"
          value={settings.countryFillActiveColor || '#fcd34d'}
          onChange={(countryFillActiveColor) => onGlobeChange({ countryFillActiveColor })}
          hint={settings.countryFillActiveColor === '' ? 'No override' : undefined}
          {...(settings.countryFillActiveColor !== '' ? { preset: '' } : {})}
          swatches={['#fcd34d', '#fbbf24', '#ff8866', '#a5f3fc', '#22ee99', '#ffffff']}
        />
        <SliderField
          label="Active opacity"
          configPath="countries.fill.activeOpacity"
          value={settings.countryFillActiveOpacity}
          min={0}
          max={1}
          step={0.05}
          format={(value) => (value <= 0 ? 'inherit' : value.toFixed(2))}
          onChange={(countryFillActiveOpacity) => onGlobeChange({ countryFillActiveOpacity })}
        />
      </DependsOn>
      </DependsOn>

      {/*
        Dots tinting — dotted-only. The fill mesh sits *behind* the
        dot field (radius 1.0008 vs 1.001), so the user can drive the
        background and the dots independently. On non-dotted kinds
        this whole block is hidden — there are no dots to colour.
      */}
      <DependsOn
        when={isDotted}
        because="Dot tinting is only meaningful on the dotted kind. Switch the main globe to dotted to colour the dots themselves."
        className="space-y-4"
        variant="hidden"
      >
        <SectionHeading>Dots tinting</SectionHeading>
        <ToggleField
          label="Mode"
          configPath="dotted.dots.mode"
          value={dotsMode === 'data' ? 'theme' : dotsMode}
          options={dotsModeOptions}
          onChange={(dottedDotsMode) => onGlobeChange({ dottedDotsMode })}
        />
        <DependsOn
          when={dotsMode === 'theme'}
          because="Default colour only matters in Solid mode."
          className="space-y-4"
          variant="hidden"
        >
          {/*
            Solid-mode default colour is the same uniform the dotted
            "Master appearance" `dottedColor` knob writes to — surface
            it here too so the user can dial it from the country-fill
            card without hunting for the orphan dotted preset. Empty
            string = "use the theme token", matching the rest of the
            configurator's reset semantics.
          */}
          <ColorField
            label="Default color"
            configPath="dotted.appearance.color"
            value={settings.dottedColor || '#7fdfff'}
            onChange={(dottedColor) => onGlobeChange({ dottedColor })}
            hint={settings.dottedColor === '' ? 'Theme default' : undefined}
            {...(settings.dottedColor !== '' ? { preset: '' } : {})}
            swatches={['#7fdfff', '#67e8f9', '#a5f3fc', '#fbbf24', '#f472b6', '#34d399', '#a78bfa', '#ffffff']}
          />
        </DependsOn>
        <DependsOn
          when={dotsMode === 'palette'}
          because="Palette only matters when Dots mode is set to Palette."
          className="space-y-4"
          variant="hidden"
        >
          <ColorListField
            label="Dots palette"
            configPath="dotted.dots.palette"
            colors={settings.dottedDotsPalette}
            onChange={(dottedDotsPalette) => onGlobeChange({ dottedDotsPalette })}
            addLabel="Add color"
            swatches={COUNTRY_FILL_PALETTE_SWATCHES}
          />
        </DependsOn>
        <SectionHeading>Dots · hover override</SectionHeading>
        <ColorField
          label="Hover dot color"
          configPath="dotted.dots.hoverColor"
          value={settings.dottedDotsHoverColor || '#a5f3fc'}
          onChange={(dottedDotsHoverColor) => onGlobeChange({ dottedDotsHoverColor })}
          hint={settings.dottedDotsHoverColor === '' ? 'No override' : undefined}
          {...(settings.dottedDotsHoverColor !== '' ? { preset: '' } : {})}
          swatches={['#a5f3fc', '#67e8f9', '#fbbf24', '#f472b6', '#34d399', '#ffffff']}
        />
        <SectionHeading>Dots · pinned override</SectionHeading>
        <ColorField
          label="Active dot color"
          configPath="dotted.dots.activeColor"
          value={settings.dottedDotsActiveColor || '#fcd34d'}
          onChange={(dottedDotsActiveColor) => onGlobeChange({ dottedDotsActiveColor })}
          hint={settings.dottedDotsActiveColor === '' ? 'No override' : undefined}
          {...(settings.dottedDotsActiveColor !== '' ? { preset: '' } : {})}
          swatches={['#fcd34d', '#fbbf24', '#ffffff', '#ff8866', '#a5f3fc', '#22ee99']}
        />
      </DependsOn>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-orange-200/75">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    initialLat: 5,
    initialLng: 20,
    speed: 0.018,
    framingPadding: 0.14,
    atmosphere: true,
    starfield: true,
    tagline: 'Africa — densely-packed neighbours show off the palette spread',
  },
  KnobsComponent,
  watchedKeys: [
    'kind',
    'countryFillMode',
    'countryFillDefaultColor',
    'countryFillDefaultOpacity',
    'countryFillPalette',
    'countryFillHoverColor',
    'countryFillHoverOpacity',
    'countryFillActiveColor',
    'countryFillActiveOpacity',
    'dottedDotsMode',
    'dottedDotsPalette',
    'dottedDotsHoverColor',
    'dottedDotsActiveColor',
    // Solid-mode default dot colour — same uniform as the master
    // appearance knob, surfaced here so the workshop preview reacts
    // when the user tweaks the colour in this card.
    'dottedColor',
  ],
  // All knobs go through the new `partial.countries.fill.*` live-update
  // branch in `create-globe.ts` — no rebuild keys.
  rebuildKeys: [],
};

export default preset;
