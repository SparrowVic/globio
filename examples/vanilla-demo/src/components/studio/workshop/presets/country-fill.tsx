import {
  ColorField,
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
  { value: 'theme', label: 'Theme' },
  { value: 'palette', label: 'Palette' },
] as const;

const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  const mode = settings.countryFillMode;
  const dotsMode = settings.dottedDotsMode;
  const isDotted = settings.kind === 'dotted';
  // Background fill mesh is only mounted on outline + dotted today.
  // Hologram has its own shell visual, paper has its own parchment
  // fill aesthetic, wireframe has no country geometry — none of them
  // get the canonical CountryFillLayer instance via getCountryFillLayer.
  const supportsBackground = settings.kind === 'outline' || settings.kind === 'dotted';
  return (
    <div className="space-y-4">
      <DependsOn
        when={supportsBackground}
        because="Background fill is mounted on outline + dotted today. Other kinds use their own surface visual (hologram shell, paper parchment, wireframe grid). Switch to outline or dotted to tune."
        className="space-y-4"
        variant="hidden"
      >
        <SectionHeading>
          {isDotted ? 'Background fill' : 'Fill mode'}
        </SectionHeading>
        <ToggleField
          label="Mode"
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
          value={settings.countryFillDefaultColor || '#1c3866'}
          onChange={(countryFillDefaultColor) => onGlobeChange({ countryFillDefaultColor })}
          hint={settings.countryFillDefaultColor === '' ? 'Theme default' : undefined}
          {...(settings.countryFillDefaultColor !== '' ? { preset: '' } : {})}
          swatches={['#1c3866', '#0f1d3a', '#67e8f9', '#fbbf24', '#a78bfa', '#ffffff']}
        />
        <SliderField
          label="Default opacity"
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
          <SectionHeading>Palette</SectionHeading>
          <PaletteEditor
            palette={settings.countryFillPalette}
            onChange={(countryFillPalette) => onGlobeChange({ countryFillPalette })}
          />
        </DependsOn>

        <SectionHeading>Hover override</SectionHeading>
        <ColorField
          label="Hover color"
          value={settings.countryFillHoverColor || '#a5f3fc'}
          onChange={(countryFillHoverColor) => onGlobeChange({ countryFillHoverColor })}
          hint={settings.countryFillHoverColor === '' ? 'No override' : undefined}
          {...(settings.countryFillHoverColor !== '' ? { preset: '' } : {})}
          swatches={['#a5f3fc', '#67e8f9', '#fbbf24', '#f472b6', '#34d399', '#ffffff']}
        />
        <SliderField
          label="Hover opacity"
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
          value={settings.countryFillActiveColor || '#fcd34d'}
          onChange={(countryFillActiveColor) => onGlobeChange({ countryFillActiveColor })}
          hint={settings.countryFillActiveColor === '' ? 'No override' : undefined}
          {...(settings.countryFillActiveColor !== '' ? { preset: '' } : {})}
          swatches={['#fcd34d', '#fbbf24', '#ff8866', '#a5f3fc', '#22ee99', '#ffffff']}
        />
        <SliderField
          label="Active opacity"
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
          value={dotsMode === 'data' ? 'theme' : dotsMode}
          options={dotsModeOptions}
          onChange={(dottedDotsMode) => onGlobeChange({ dottedDotsMode })}
        />
        <DependsOn
          when={dotsMode === 'palette'}
          because="Palette only matters when Dots mode is set to Palette."
          className="space-y-4"
        >
          <SectionHeading>Dots palette</SectionHeading>
          <PaletteEditor
            palette={settings.dottedDotsPalette}
            onChange={(dottedDotsPalette) => onGlobeChange({ dottedDotsPalette })}
          />
        </DependsOn>
        <SectionHeading>Dots · hover override</SectionHeading>
        <ColorField
          label="Hover dot color"
          value={settings.dottedDotsHoverColor || '#a5f3fc'}
          onChange={(dottedDotsHoverColor) => onGlobeChange({ dottedDotsHoverColor })}
          hint={settings.dottedDotsHoverColor === '' ? 'No override' : undefined}
          {...(settings.dottedDotsHoverColor !== '' ? { preset: '' } : {})}
          swatches={['#a5f3fc', '#67e8f9', '#fbbf24', '#f472b6', '#34d399', '#ffffff']}
        />
        <SectionHeading>Dots · pinned override</SectionHeading>
        <ColorField
          label="Active dot color"
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
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-orange-200/70">
      {children}
    </p>
  );
}

/**
 * Inline palette editor — fixed-length list of swatches the user can
 * recolor or remove. Adds an "+ add color" button at the end so the
 * user can extend the palette without leaving the card.
 */
function PaletteEditor({
  palette,
  onChange,
}: {
  readonly palette: ReadonlyArray<string>;
  readonly onChange: (next: ReadonlyArray<string>) => void;
}) {
  return (
    <div className="space-y-2">
      {palette.map((color, idx) => (
        <ColorField
          key={idx}
          label={`Slot ${idx + 1}`}
          value={color}
          onChange={(next) => {
            const copy = [...palette];
            copy[idx] = next;
            onChange(copy);
          }}
          swatches={[
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
          ]}
        />
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange([...palette, '#ffffff'])}
          className="flex-1 rounded border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-[11px] text-slate-300 hover:border-white/[0.2] hover:text-white"
          disabled={palette.length >= 16}
        >
          + Add color
        </button>
        <button
          type="button"
          onClick={() => palette.length > 1 && onChange(palette.slice(0, -1))}
          className="rounded border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-[11px] text-slate-300 hover:border-white/[0.2] hover:text-white disabled:opacity-40"
          disabled={palette.length <= 1}
        >
          − Remove last
        </button>
      </div>
    </div>
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
  ],
  // All knobs go through the new `partial.countries.fill.*` live-update
  // branch in `create-globe.ts` — no rebuild keys.
  rebuildKeys: [],
};

export default preset;
