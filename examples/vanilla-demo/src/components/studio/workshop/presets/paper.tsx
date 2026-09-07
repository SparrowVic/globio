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
 *   Surface       8   color, grain, vignette, fibers, stains, wash tint,
 *                     ocean hatch amount/color
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
 * Total: 50+ paper-specific knobs, all live-updating via PaperKindHandle
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
  '#d7e2d2',
  '#cddfdd',
  '#dbe8c7',
  '#d6dcc0',
  '#f4ecd6',
  '#ece1c3',
  '#cbd4b2',
  '#bfcbb8',
];

const washSwatches = [
  '#7faeac',
  '#6f9d9a',
  '#8fc7b0',
  '#9fc5e8',
  '#e8b85a',
  '#d99a35',
  '#c7834a',
  '#d9a7c7',
  '#b8d26f',
  '#a67c52',
];

const waterLineSwatches = [
  '#567f80',
  '#4c6f7d',
  '#6f9d9a',
  '#5f8d78',
  '#34666f',
  '#7a8f71',
  '#3f5d63',
  '#8aa6a0',
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
          label="Ocean paper"
          configPath="paper.surface.color"
          value={settings.paperSurfaceColor || '#d7e2d2'}
          onChange={(paperSurfaceColor) => onGlobeChange({ paperSurfaceColor })}
          hint={settings.paperSurfaceColor === '' ? 'Theme default' : undefined}
          {...(settings.paperSurfaceColor !== '' ? { preset: '' } : {})}
          swatches={surfaceSwatches}
        />
        <SliderField
          label="Grain"
          configPath="paper.surface.noiseAmount"
          value={settings.paperSurfaceNoise < 0 ? 0.06 : settings.paperSurfaceNoise}
          min={0}
          max={0.25}
          step={0.005}
          format={(value) => value.toFixed(3)}
          onChange={(paperSurfaceNoise) => onGlobeChange({ paperSurfaceNoise })}
        />
        <SliderField
          label="Pole vignette"
          configPath="paper.surface.vignette"
          value={settings.paperSurfaceVignette}
          min={0}
          max={0.6}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(paperSurfaceVignette) => onGlobeChange({ paperSurfaceVignette })}
        />
        <SliderField
          label="Fibers"
          configPath="paper.surface.fiberAmount"
          value={settings.paperSurfaceFibers < 0 ? 0.45 : settings.paperSurfaceFibers}
          min={0}
          max={1}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(paperSurfaceFibers) => onGlobeChange({ paperSurfaceFibers })}
        />
        <SliderField
          label="Watercolor stains"
          configPath="paper.surface.stainAmount"
          value={settings.paperSurfaceStains < 0 ? 0.2 : settings.paperSurfaceStains}
          min={0}
          max={1}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(paperSurfaceStains) => onGlobeChange({ paperSurfaceStains })}
        />
        <ColorField
          label="Wash tint"
          configPath="paper.surface.washColor"
          value={settings.paperSurfaceWashColor || '#7faeac'}
          onChange={(paperSurfaceWashColor) => onGlobeChange({ paperSurfaceWashColor })}
          hint={settings.paperSurfaceWashColor === '' ? 'Layer default' : undefined}
          {...(settings.paperSurfaceWashColor !== '' ? { preset: '' } : {})}
          swatches={washSwatches}
        />
        <SliderField
          label="Ocean hatching"
          configPath="paper.surface.waterLineAmount"
          value={settings.paperSurfaceWaterLines < 0 ? 0.58 : settings.paperSurfaceWaterLines}
          min={0}
          max={1}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(paperSurfaceWaterLines) => onGlobeChange({ paperSurfaceWaterLines })}
        />
        <ColorField
          label="Ocean ink"
          configPath="paper.surface.waterLineColor"
          value={settings.paperSurfaceWaterLineColor || '#567f80'}
          onChange={(paperSurfaceWaterLineColor) => onGlobeChange({ paperSurfaceWaterLineColor })}
          hint={settings.paperSurfaceWaterLineColor === '' ? 'Layer default' : undefined}
          {...(settings.paperSurfaceWaterLineColor !== '' ? { preset: '' } : {})}
          swatches={waterLineSwatches}
        />

        {/* BORDERS -------------------------------------------------------- */}
        <SectionHeading>Ink borders</SectionHeading>
        <SwitchField
          label="Borders"
          configPath="paper.borders.enabled"
          checked={settings.paperBorders}
          onChange={(paperBorders) => onGlobeChange({ paperBorders })}
          value="Hand-drawn ink country outlines with seeded jitter"
        />
        <DependsOn when={settings.paperBorders} because="Enable Borders first." className="space-y-4">
          <ColorField
            label="Ink color"
            configPath="paper.borders.color"
            value={settings.paperBorderColor || '#5b3a1f'}
            onChange={(paperBorderColor) => onGlobeChange({ paperBorderColor })}
            hint={settings.paperBorderColor === '' ? 'Theme default' : undefined}
            {...(settings.paperBorderColor !== '' ? { preset: '' } : {})}
            swatches={inkSwatches}
          />
          <SliderField
            label="Opacity"
            configPath="paper.borders.opacity"
            value={settings.paperBorderOpacity < 0 ? 0.85 : settings.paperBorderOpacity}
            min={0}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(paperBorderOpacity) => onGlobeChange({ paperBorderOpacity })}
          />
          <SliderField
            label="Line width"
            configPath="paper.borders.width"
            value={settings.paperBorderWidth}
            min={0.5}
            max={4}
            step={0.1}
            format={(value) => `${value.toFixed(1)}×`}
            onChange={(paperBorderWidth) => onGlobeChange({ paperBorderWidth })}
          />
          <SliderField
            label="Hand roughness"
            configPath="paper.borders.roughness"
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
            configPath="paper.borders.stipple.enabled"
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
              configPath="paper.borders.stipple.density"
              value={settings.paperStippleDensity}
              min={0.4}
              max={6}
              step={0.1}
              format={(value) => `${value.toFixed(1)}°`}
              onChange={(paperStippleDensity) => onGlobeChange({ paperStippleDensity })}
            />
            <SliderField
              label="Dot size"
              configPath="paper.borders.stipple.size"
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
            configPath="paper.borders.inkBleed.enabled"
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
              configPath="paper.borders.inkBleed.color"
              value={settings.paperInkBleedColor || '#5b3a1f'}
              onChange={(paperInkBleedColor) => onGlobeChange({ paperInkBleedColor })}
              hint={settings.paperInkBleedColor === '' ? 'Match ink color' : undefined}
              {...(settings.paperInkBleedColor !== '' ? { preset: '' } : {})}
              swatches={inkSwatches}
            />
            <SliderField
              label="Bleed opacity"
              configPath="paper.borders.inkBleed.opacity"
              value={settings.paperInkBleedOpacity}
              min={0}
              max={1}
              step={0.05}
              format={(value) => value.toFixed(2)}
              onChange={(paperInkBleedOpacity) => onGlobeChange({ paperInkBleedOpacity })}
            />
            <SliderField
              label="Spread"
              configPath="paper.borders.inkBleed.spread"
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
          configPath="paper.fill.enabled"
          checked={settings.paperFill}
          onChange={(paperFill) => onGlobeChange({ paperFill })}
          value="Cream pastel fill on every country"
        />
        <DependsOn when={settings.paperFill} because="Enable Pastel wash first." className="space-y-4">
          <ToggleField
            label="Mode"
            configPath="paper.fill.mode"
            value={settings.paperFillMode}
            options={fillModeOptions}
            onChange={(paperFillMode) => onGlobeChange({ paperFillMode })}
          />
          <ColorField
            label="Wash color"
            configPath="paper.fill.color"
            value={settings.paperFillColor || '#e9dcae'}
            onChange={(paperFillColor) => onGlobeChange({ paperFillColor })}
            hint={settings.paperFillColor === '' ? 'Theme default' : undefined}
            {...(settings.paperFillColor !== '' ? { preset: '' } : {})}
            swatches={['#e9dcae', '#d8c98c', '#f1dca0', '#c2a564', '#f5e6b9', '#e8d6a8']}
          />
          <SliderField
            label="Wash opacity"
            configPath="paper.fill.opacity"
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
          configPath="paper.grid.enabled"
          checked={settings.paperGrid}
          onChange={(paperGrid) => onGlobeChange({ paperGrid })}
          value="Faint registration lines like a printed atlas"
        />
        <DependsOn when={settings.paperGrid} because="Enable Atlas grid first." className="space-y-4">
          <ColorField
            label="Grid color"
            configPath="paper.grid.color"
            value={settings.paperGridColor || '#bfa974'}
            onChange={(paperGridColor) => onGlobeChange({ paperGridColor })}
            hint={settings.paperGridColor === '' ? 'Theme default' : undefined}
            {...(settings.paperGridColor !== '' ? { preset: '' } : {})}
            swatches={['#bfa974', '#a78a4f', '#5b3a1f', '#8b6f47', '#7a5a2c', '#3a2a14']}
          />
          <SliderField
            label="Minor opacity"
            configPath="paper.grid.opacity"
            value={settings.paperGridOpacity < 0 ? 0.18 : settings.paperGridOpacity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperGridOpacity) => onGlobeChange({ paperGridOpacity })}
          />
          <SliderField
            label="Major opacity"
            configPath="paper.grid.majorOpacity"
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
            configPath="paper.grid.stepDeg"
            value={settings.paperGridStep}
            min={5}
            max={30}
            step={1}
            format={(value) => `${value.toFixed(0)}°`}
            onChange={(paperGridStep) => onGlobeChange({ paperGridStep })}
          />
          <SliderField
            label="Major every Nth"
            configPath="paper.grid.majorEvery"
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
          configPath="paper.sepia.enabled"
          checked={settings.paperSepia}
          onChange={(paperSepia) => onGlobeChange({ paperSepia })}
          value="Warm tint over the whole globe — pushes it toward aged"
        />
        <DependsOn when={settings.paperSepia} because="Enable Sepia tint first." className="space-y-4">
          <ColorField
            label="Tint color"
            configPath="paper.sepia.color"
            value={settings.paperSepiaColor}
            onChange={(paperSepiaColor) => onGlobeChange({ paperSepiaColor })}
            swatches={sepiaSwatches}
          />
          <SliderField
            label="Tint opacity"
            configPath="paper.sepia.opacity"
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
          configPath="paper.vignette.enabled"
          checked={settings.paperVignette}
          onChange={(paperVignette) => onGlobeChange({ paperVignette })}
          value="Frame the globe like a centered illustration"
        />
        <DependsOn when={settings.paperVignette} because="Enable Vignette first." className="space-y-4">
          <ColorField
            label="Vignette color"
            configPath="paper.vignette.color"
            value={settings.paperVignetteColor}
            onChange={(paperVignetteColor) => onGlobeChange({ paperVignetteColor })}
            swatches={['#3a2a14', '#1f1408', '#000000', '#5b3a1f', '#28140a']}
          />
          <SliderField
            label="Intensity"
            configPath="paper.vignette.intensity"
            value={settings.paperVignetteIntensity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperVignetteIntensity) => onGlobeChange({ paperVignetteIntensity })}
          />
          <SliderField
            label="Inner radius"
            configPath="paper.vignette.radius"
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
          configPath="paper.compassRose.enabled"
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
            configPath="paper.compassRose.color"
            value={settings.paperCompassColor}
            onChange={(paperCompassColor) => onGlobeChange({ paperCompassColor })}
            swatches={inkSwatches}
          />
          <SliderField
            label="Opacity"
            configPath="paper.compassRose.opacity"
            value={settings.paperCompassOpacity}
            min={0}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(paperCompassOpacity) => onGlobeChange({ paperCompassOpacity })}
          />
          <SliderField
            label="Size (degrees)"
            configPath="paper.compassRose.size"
            value={settings.paperCompassSize}
            min={3}
            max={20}
            step={0.5}
            format={(value) => `${value.toFixed(1)}°`}
            onChange={(paperCompassSize) => onGlobeChange({ paperCompassSize })}
          />
          <SliderField
            label="Latitude"
            configPath="paper.compassRose.lat"
            value={settings.paperCompassLat}
            min={-80}
            max={80}
            step={1}
            format={(value) => `${value.toFixed(0)}°`}
            onChange={(paperCompassLat) => onGlobeChange({ paperCompassLat })}
          />
          <SliderField
            label="Longitude"
            configPath="paper.compassRose.lng"
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
          configPath="paper.agingMarks.enabled"
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
            configPath="paper.agingMarks.color"
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
            configPath="paper.agingMarks.count"
            value={settings.paperAgingCount}
            min={0}
            max={24}
            step={1}
            format={(value) => `${value.toFixed(0)} marks`}
            onChange={(paperAgingCount) => onGlobeChange({ paperAgingCount })}
          />
          <SliderField
            label="Intensity"
            configPath="paper.agingMarks.intensity"
            value={settings.paperAgingIntensity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperAgingIntensity) => onGlobeChange({ paperAgingIntensity })}
          />
          <SliderField
            label="Seed"
            configPath="paper.agingMarks.seed"
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
          configPath="paper.watermark.enabled"
          checked={settings.paperWatermark}
          onChange={(paperWatermark) => onGlobeChange({ paperWatermark })}
          value="Faint engraved-title text overlay"
        />
        <DependsOn
          when={settings.paperWatermark}
          because="Enable DOM watermark first."
          className="space-y-4"
        >
          <Field label="Watermark text"
            configPath="paper.watermark.text">
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
            configPath="paper.watermark.color"
            value={settings.paperWatermarkColor}
            onChange={(paperWatermarkColor) => onGlobeChange({ paperWatermarkColor })}
            swatches={inkSwatches}
          />
          <SliderField
            label="Opacity"
            configPath="paper.watermark.opacity"
            value={settings.paperWatermarkOpacity}
            min={0}
            max={1}
            step={0.02}
            format={(value) => value.toFixed(2)}
            onChange={(paperWatermarkOpacity) => onGlobeChange({ paperWatermarkOpacity })}
          />
          <SliderField
            label="Font size"
            configPath="paper.watermark.size"
            value={settings.paperWatermarkSize}
            min={10}
            max={96}
            step={1}
            format={(value) => `${value.toFixed(0)}px`}
            onChange={(paperWatermarkSize) => onGlobeChange({ paperWatermarkSize })}
          />
          <ToggleField
            label="Position"
            configPath="paper.watermark.position"
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
    <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-amber-200/75">
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
    'paperSurfaceFibers',
    'paperSurfaceStains',
    'paperSurfaceWashColor',
    'paperSurfaceWaterLines',
    'paperSurfaceWaterLineColor',
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
