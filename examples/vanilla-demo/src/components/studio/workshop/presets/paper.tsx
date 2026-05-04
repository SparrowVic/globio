import {
  ColorField,
  Field,
  SliderField,
  SwitchField,
  ToggleField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Paper configurator preset — vintage atlas.
 *
 * Cinematography: parked over the Atlantic so the empty ocean reads as
 * blank parchment first, then the user can pan to land. Slow rotate.
 *
 * The whole knob form is gated behind `kind === 'paper'`. On any other
 * kind the preview shows the user's actual scene and a copy hint
 * recommends switching to paper. This is the most expressive kind in
 * the library — every layer is exposed, every effect is toggleable.
 *
 * Knob inventory (~50):
 *   Surface       3   color, grain, vignette
 *   Borders      10   toggle, color, opacity, width, roughness, stipple
 *                     (toggle/density/size), ink-bleed (toggle/color/
 *                     opacity/spread)
 *   Fill          4   toggle, color, opacity, mode
 *   Grid          6   toggle, color, opacity, step, major-every, major-
 *                     opacity
 *   Sepia         3   toggle, color, opacity
 *   Vignette      4   toggle, color, intensity, radius
 *   Compass rose  6   toggle, lat, lng, color, opacity, size
 *   Aging marks   5   toggle, count, color, intensity, seed
 *   Watermark     6   toggle, text, color, opacity, size, position
 *
 * Total: 47 paper-specific knobs, all live-updating via PaperKindHandle
 * .setPaperConfig + globe.update({ paper: ... }).
 */

const fillModeOptions = [
  { value: 'single', label: 'Single' },
  { value: 'pastel', label: 'Pastel mix' },
] as const;

const watermarkPositionOptions = [
  { value: 'center', label: 'Center' },
  { value: 'topLeft', label: 'TL' },
  { value: 'topRight', label: 'TR' },
  { value: 'bottomLeft', label: 'BL' },
  { value: 'bottomRight', label: 'BR' },
] as const;

const sepiaSwatches = [
  '#8b6f47',
  '#6b4f30',
  '#a07a4f',
  '#5b3a1f',
  '#7a5a2c',
  '#c69a5b',
  '#3a2a14',
  '#1f1408',
];

const inkSwatches = [
  '#5b3a1f',
  '#3b2308',
  '#7a4f2a',
  '#2c1e08',
  '#000000',
  '#1c1c1c',
  '#7d4a17',
  '#a07a4f',
];

const surfaceSwatches = [
  '#f4ecd6',
  '#ece1c3',
  '#e8d9a8',
  '#f5e9c8',
  '#fff4d6',
  '#dec99a',
  '#cdb87b',
  '#fbf2d8',
];

const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;

  return (
    <div className="space-y-4">
      <DependsOn
        when={settings.kind === 'paper'}
        because="Paper-only feature. Switch the main globe to paper kind to use it."
        className="space-y-4"
      >
        {/* SURFACE -------------------------------------------------------- */}
        <SectionHeading>Parchment surface</SectionHeading>
        <ColorField
          label="Paper color"
          value={settings.paperSurfaceColor || '#f4ecd6'}
          onChange={(paperSurfaceColor) => onGlobeChange({ paperSurfaceColor })}
          hint={settings.paperSurfaceColor === '' ? 'Theme default' : undefined}
          {...(settings.paperSurfaceColor !== '' ? { preset: '' } : {})}
          swatches={surfaceSwatches}
        />
        <SliderField
          label="Grain"
          value={settings.paperSurfaceNoise < 0 ? 0.06 : settings.paperSurfaceNoise}
          min={0}
          max={0.25}
          step={0.005}
          format={(value) => value.toFixed(3)}
          onChange={(paperSurfaceNoise) => onGlobeChange({ paperSurfaceNoise })}
        />
        <SliderField
          label="Pole vignette"
          value={settings.paperSurfaceVignette}
          min={0}
          max={0.6}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(paperSurfaceVignette) => onGlobeChange({ paperSurfaceVignette })}
        />

        {/* BORDERS -------------------------------------------------------- */}
        <SectionHeading>Ink borders</SectionHeading>
        <SwitchField
          label="Borders"
          checked={settings.paperBorders}
          onChange={(paperBorders) => onGlobeChange({ paperBorders })}
          value="Hand-drawn ink country outlines with seeded jitter"
        />
        <DependsOn when={settings.paperBorders} because="Enable Borders first." className="space-y-4">
          <ColorField
            label="Ink color"
            value={settings.paperBorderColor || '#5b3a1f'}
            onChange={(paperBorderColor) => onGlobeChange({ paperBorderColor })}
            hint={settings.paperBorderColor === '' ? 'Theme default' : undefined}
            {...(settings.paperBorderColor !== '' ? { preset: '' } : {})}
            swatches={inkSwatches}
          />
          <SliderField
            label="Opacity"
            value={settings.paperBorderOpacity < 0 ? 0.85 : settings.paperBorderOpacity}
            min={0}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(paperBorderOpacity) => onGlobeChange({ paperBorderOpacity })}
          />
          <SliderField
            label="Line width"
            value={settings.paperBorderWidth}
            min={0.5}
            max={4}
            step={0.1}
            format={(value) => `${value.toFixed(1)}×`}
            onChange={(paperBorderWidth) => onGlobeChange({ paperBorderWidth })}
          />
          <SliderField
            label="Hand roughness"
            value={settings.paperBorderRoughness}
            min={0}
            max={1.2}
            step={0.02}
            format={(value) =>
              value === 0
                ? 'ruled'
                : value < 0.3
                  ? `confident · ${value.toFixed(2)}`
                  : value < 0.7
                    ? `loose · ${value.toFixed(2)}`
                    : `shaky · ${value.toFixed(2)}`
            }
            onChange={(paperBorderRoughness) => onGlobeChange({ paperBorderRoughness })}
          />

          <SectionHeading>Stipple style</SectionHeading>
          <SwitchField
            label="Dotted borders"
            checked={settings.paperStipple}
            onChange={(paperStipple) => onGlobeChange({ paperStipple })}
            value="Replace ink lines with dabbed-pen dots"
          />
          <DependsOn
            when={settings.paperStipple}
            because="Enable Dotted borders first."
            className="space-y-4"
          >
            <SliderField
              label="Density (deg per dot)"
              value={settings.paperStippleDensity}
              min={0.4}
              max={6}
              step={0.1}
              format={(value) => `${value.toFixed(1)}°`}
              onChange={(paperStippleDensity) => onGlobeChange({ paperStippleDensity })}
            />
            <SliderField
              label="Dot size"
              value={settings.paperStippleSize}
              min={0.4}
              max={3}
              step={0.1}
              format={(value) => `${value.toFixed(1)}×`}
              onChange={(paperStippleSize) => onGlobeChange({ paperStippleSize })}
            />
          </DependsOn>

          <SectionHeading>Ink bleed</SectionHeading>
          <SwitchField
            label="Bleed glow"
            checked={settings.paperInkBleed}
            onChange={(paperInkBleed) => onGlobeChange({ paperInkBleed })}
            value="Soft outer halo simulating ink soaked into the paper"
          />
          <DependsOn
            when={settings.paperInkBleed}
            because="Enable Bleed glow first."
            className="space-y-4"
          >
            <ColorField
              label="Bleed color"
              value={settings.paperInkBleedColor || '#5b3a1f'}
              onChange={(paperInkBleedColor) => onGlobeChange({ paperInkBleedColor })}
              hint={settings.paperInkBleedColor === '' ? 'Match ink color' : undefined}
              {...(settings.paperInkBleedColor !== '' ? { preset: '' } : {})}
              swatches={inkSwatches}
            />
            <SliderField
              label="Bleed opacity"
              value={settings.paperInkBleedOpacity}
              min={0}
              max={1}
              step={0.05}
              format={(value) => value.toFixed(2)}
              onChange={(paperInkBleedOpacity) => onGlobeChange({ paperInkBleedOpacity })}
            />
            <SliderField
              label="Spread"
              value={settings.paperInkBleedSpread}
              min={0}
              max={0.005}
              step={0.0001}
              format={(value) => value.toFixed(4)}
              onChange={(paperInkBleedSpread) => onGlobeChange({ paperInkBleedSpread })}
            />
          </DependsOn>
        </DependsOn>

        {/* FILL ----------------------------------------------------------- */}
        <SectionHeading>Country fill</SectionHeading>
        <SwitchField
          label="Pastel wash"
          checked={settings.paperFill}
          onChange={(paperFill) => onGlobeChange({ paperFill })}
          value="Cream pastel fill on every country"
        />
        <DependsOn when={settings.paperFill} because="Enable Pastel wash first." className="space-y-4">
          <ToggleField
            label="Mode"
            value={settings.paperFillMode}
            options={fillModeOptions}
            onChange={(paperFillMode) => onGlobeChange({ paperFillMode })}
          />
          <ColorField
            label="Wash color"
            value={settings.paperFillColor || '#e9dcae'}
            onChange={(paperFillColor) => onGlobeChange({ paperFillColor })}
            hint={settings.paperFillColor === '' ? 'Theme default' : undefined}
            {...(settings.paperFillColor !== '' ? { preset: '' } : {})}
            swatches={['#e9dcae', '#d8c98c', '#f1dca0', '#c2a564', '#f5e6b9', '#e8d6a8']}
          />
          <SliderField
            label="Wash opacity"
            value={settings.paperFillOpacity < 0 ? 0.35 : settings.paperFillOpacity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperFillOpacity) => onGlobeChange({ paperFillOpacity })}
          />
        </DependsOn>

        {/* GRID ----------------------------------------------------------- */}
        <SectionHeading>Atlas grid</SectionHeading>
        <SwitchField
          label="Lat / lng grid"
          checked={settings.paperGrid}
          onChange={(paperGrid) => onGlobeChange({ paperGrid })}
          value="Faint registration lines like a printed atlas"
        />
        <DependsOn when={settings.paperGrid} because="Enable Atlas grid first." className="space-y-4">
          <ColorField
            label="Grid color"
            value={settings.paperGridColor || '#bfa974'}
            onChange={(paperGridColor) => onGlobeChange({ paperGridColor })}
            hint={settings.paperGridColor === '' ? 'Theme default' : undefined}
            {...(settings.paperGridColor !== '' ? { preset: '' } : {})}
            swatches={['#bfa974', '#a78a4f', '#5b3a1f', '#8b6f47', '#7a5a2c', '#3a2a14']}
          />
          <SliderField
            label="Minor opacity"
            value={settings.paperGridOpacity < 0 ? 0.18 : settings.paperGridOpacity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperGridOpacity) => onGlobeChange({ paperGridOpacity })}
          />
          <SliderField
            label="Major opacity"
            value={
              settings.paperGridMajorOpacity < 0
                ? Math.min(1, (settings.paperGridOpacity < 0 ? 0.18 : settings.paperGridOpacity) * 1.6)
                : settings.paperGridMajorOpacity
            }
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperGridMajorOpacity) => onGlobeChange({ paperGridMajorOpacity })}
          />
          <SliderField
            label="Step (deg)"
            value={settings.paperGridStep}
            min={5}
            max={30}
            step={1}
            format={(value) => `${value.toFixed(0)}°`}
            onChange={(paperGridStep) => onGlobeChange({ paperGridStep })}
          />
          <SliderField
            label="Major every Nth"
            value={settings.paperGridMajorEvery}
            min={1}
            max={6}
            step={1}
            format={(value) => `${value.toFixed(0)}`}
            onChange={(paperGridMajorEvery) => onGlobeChange({ paperGridMajorEvery })}
          />
        </DependsOn>

        {/* SEPIA ---------------------------------------------------------- */}
        <SectionHeading>Sepia overlay</SectionHeading>
        <SwitchField
          label="Sepia tint"
          checked={settings.paperSepia}
          onChange={(paperSepia) => onGlobeChange({ paperSepia })}
          value="Warm tint over the whole globe — pushes it toward aged"
        />
        <DependsOn when={settings.paperSepia} because="Enable Sepia tint first." className="space-y-4">
          <ColorField
            label="Tint color"
            value={settings.paperSepiaColor}
            onChange={(paperSepiaColor) => onGlobeChange({ paperSepiaColor })}
            swatches={sepiaSwatches}
          />
          <SliderField
            label="Tint opacity"
            value={settings.paperSepiaOpacity}
            min={0}
            max={0.6}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperSepiaOpacity) => onGlobeChange({ paperSepiaOpacity })}
          />
        </DependsOn>

        {/* VIGNETTE ------------------------------------------------------- */}
        <SectionHeading>Vignette</SectionHeading>
        <SwitchField
          label="Corner darkening"
          checked={settings.paperVignette}
          onChange={(paperVignette) => onGlobeChange({ paperVignette })}
          value="Frame the globe like a centered illustration"
        />
        <DependsOn when={settings.paperVignette} because="Enable Vignette first." className="space-y-4">
          <ColorField
            label="Vignette color"
            value={settings.paperVignetteColor}
            onChange={(paperVignetteColor) => onGlobeChange({ paperVignetteColor })}
            swatches={['#3a2a14', '#1f1408', '#000000', '#5b3a1f', '#28140a']}
          />
          <SliderField
            label="Intensity"
            value={settings.paperVignetteIntensity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperVignetteIntensity) => onGlobeChange({ paperVignetteIntensity })}
          />
          <SliderField
            label="Inner radius"
            value={settings.paperVignetteRadius}
            min={0}
            max={0.9}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperVignetteRadius) => onGlobeChange({ paperVignetteRadius })}
          />
        </DependsOn>

        {/* COMPASS ROSE --------------------------------------------------- */}
        <SectionHeading>Compass rose</SectionHeading>
        <SwitchField
          label="Compass rose watermark"
          checked={settings.paperCompass}
          onChange={(paperCompass) => onGlobeChange({ paperCompass })}
          value="Eight-point rose anchored at a chosen lat / lng"
        />
        <DependsOn
          when={settings.paperCompass}
          because="Enable Compass rose first."
          className="space-y-4"
        >
          <ColorField
            label="Rose color"
            value={settings.paperCompassColor}
            onChange={(paperCompassColor) => onGlobeChange({ paperCompassColor })}
            swatches={inkSwatches}
          />
          <SliderField
            label="Opacity"
            value={settings.paperCompassOpacity}
            min={0}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(paperCompassOpacity) => onGlobeChange({ paperCompassOpacity })}
          />
          <SliderField
            label="Size (degrees)"
            value={settings.paperCompassSize}
            min={3}
            max={20}
            step={0.5}
            format={(value) => `${value.toFixed(1)}°`}
            onChange={(paperCompassSize) => onGlobeChange({ paperCompassSize })}
          />
          <SliderField
            label="Latitude"
            value={settings.paperCompassLat}
            min={-80}
            max={80}
            step={1}
            format={(value) => `${value.toFixed(0)}°`}
            onChange={(paperCompassLat) => onGlobeChange({ paperCompassLat })}
          />
          <SliderField
            label="Longitude"
            value={settings.paperCompassLng}
            min={-180}
            max={180}
            step={1}
            format={(value) => `${value.toFixed(0)}°`}
            onChange={(paperCompassLng) => onGlobeChange({ paperCompassLng })}
          />
        </DependsOn>

        {/* AGING MARKS ---------------------------------------------------- */}
        <SectionHeading>Aging marks</SectionHeading>
        <SwitchField
          label="Tea-stain blotches"
          checked={settings.paperAging}
          onChange={(paperAging) => onGlobeChange({ paperAging })}
          value="Small brown spots scattered across the parchment"
        />
        <DependsOn
          when={settings.paperAging}
          because="Enable Aging marks first."
          className="space-y-4"
        >
          <ColorField
            label="Stain color"
            value={settings.paperAgingColor}
            onChange={(paperAgingColor) => onGlobeChange({ paperAgingColor })}
            swatches={[
              '#7a5a2c',
              '#5b3a1f',
              '#3a2a14',
              '#a07a4f',
              '#6b4f30',
              '#28140a',
            ]}
          />
          <SliderField
            label="Count"
            value={settings.paperAgingCount}
            min={0}
            max={24}
            step={1}
            format={(value) => `${value.toFixed(0)} marks`}
            onChange={(paperAgingCount) => onGlobeChange({ paperAgingCount })}
          />
          <SliderField
            label="Intensity"
            value={settings.paperAgingIntensity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperAgingIntensity) => onGlobeChange({ paperAgingIntensity })}
          />
          <SliderField
            label="Seed"
            value={settings.paperAgingSeed}
            min={0}
            max={100}
            step={1}
            format={(value) => `#${value.toFixed(0)}`}
            onChange={(paperAgingSeed) => onGlobeChange({ paperAgingSeed })}
          />
        </DependsOn>

        {/* WATERMARK ------------------------------------------------------ */}
        <SectionHeading>Title watermark</SectionHeading>
        <SwitchField
          label="DOM watermark"
          checked={settings.paperWatermark}
          onChange={(paperWatermark) => onGlobeChange({ paperWatermark })}
          value="Faint engraved-title text overlay"
        />
        <DependsOn
          when={settings.paperWatermark}
          because="Enable DOM watermark first."
          className="space-y-4"
        >
          <Field label="Watermark text">
            <input
              type="text"
              value={settings.paperWatermarkText}
              maxLength={64}
              onChange={(e) => onGlobeChange({ paperWatermarkText: e.target.value })}
              className="w-full rounded border border-amber-200/[0.18] bg-black/30 px-3 py-1.5 text-[12px] tracking-[0.3em] uppercase text-amber-100/90 placeholder:text-amber-200/40 focus:border-amber-200/60 focus:outline-none"
              placeholder="ATLAS"
            />
          </Field>
          <ColorField
            label="Text color"
            value={settings.paperWatermarkColor}
            onChange={(paperWatermarkColor) => onGlobeChange({ paperWatermarkColor })}
            swatches={inkSwatches}
          />
          <SliderField
            label="Opacity"
            value={settings.paperWatermarkOpacity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperWatermarkOpacity) => onGlobeChange({ paperWatermarkOpacity })}
          />
          <SliderField
            label="Font size"
            value={settings.paperWatermarkSize}
            min={10}
            max={96}
            step={1}
            format={(value) => `${value.toFixed(0)}px`}
            onChange={(paperWatermarkSize) => onGlobeChange({ paperWatermarkSize })}
          />
          <ToggleField
            label="Position"
            value={settings.paperWatermarkPosition}
            options={watermarkPositionOptions}
            onChange={(paperWatermarkPosition) => onGlobeChange({ paperWatermarkPosition })}
          />
          <p className="text-[10.5px] leading-relaxed text-amber-100/60">
            Tip — set the text to your project name or a Latin motto for an
            engraved-title-plate vibe. Bold, wide-tracked Garamond-style serif
            is wired in CSS.
          </p>
        </DependsOn>
      </DependsOn>

      <p className="rounded-md border border-dashed border-amber-200/[0.16] bg-amber-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-amber-100/80">
        Recipe — <span className="text-white">vintage atlas</span>: enable
        Sepia (≈0.18), Vignette (≈0.45), Aging marks (~12), Compass rose, and
        the DOM watermark together. Then bump Hand roughness to{' '}
        <span className="text-white">0.4</span> and switch borders to stipple
        for a 17th-century engraving feel.
      </p>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-amber-200/70">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    initialLat: 28,
    initialLng: -34,
    speed: 0.012,
    framingPadding: 0.18,
    atmosphere: false,
    starfield: false,
    tagline: 'Vintage atlas — sepia, ink, vignette, compass rose. A paper world rendered in 3D.',
  },
  KnobsComponent,
  watchedKeys: [
    'paperSurfaceColor',
    'paperSurfaceNoise',
    'paperSurfaceVignette',
    'paperBorders',
    'paperBorderColor',
    'paperBorderOpacity',
    'paperBorderWidth',
    'paperBorderRoughness',
    'paperStipple',
    'paperStippleDensity',
    'paperStippleSize',
    'paperInkBleed',
    'paperInkBleedColor',
    'paperInkBleedOpacity',
    'paperInkBleedSpread',
    'paperFill',
    'paperFillColor',
    'paperFillOpacity',
    'paperFillMode',
    'paperGrid',
    'paperGridColor',
    'paperGridOpacity',
    'paperGridStep',
    'paperGridMajorEvery',
    'paperGridMajorOpacity',
    'paperSepia',
    'paperSepiaColor',
    'paperSepiaOpacity',
    'paperVignette',
    'paperVignetteColor',
    'paperVignetteIntensity',
    'paperVignetteRadius',
    'paperCompass',
    'paperCompassLat',
    'paperCompassLng',
    'paperCompassColor',
    'paperCompassOpacity',
    'paperCompassSize',
    'paperAging',
    'paperAgingCount',
    'paperAgingColor',
    'paperAgingIntensity',
    'paperAgingSeed',
    'paperWatermark',
    'paperWatermarkText',
    'paperWatermarkColor',
    'paperWatermarkOpacity',
    'paperWatermarkSize',
    'paperWatermarkPosition',
  ],
  // All paper knobs are live via PaperKindHandle.setPaperConfig — surface
  // texture regenerates per change (single 512x256 canvas pass), borders
  // rebuild for stipple toggle / roughness / spread (single BufferGeometry
  // pass on the country dataset, sub-frame on desktop), grid rebuilds for
  // step / majorEvery (small linecount). DOM overlays (vignette, watermark)
  // mutate inline styles. No rebuild keys.
};

export default preset;
