import { ColorField, SliderField, SwitchField } from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Hover configurator preset.
 *
 * Cinematography: outline-dark over Europe — densest country area on
 * the map, so the user can drag the cursor across many tiny silhouettes
 * and see the hover stroke transition crisply.
 *
 * Important UX detail: this preset is the *only* one that needs hover
 * INTERACTION on the preview globe. WorkshopPreviewGlobe disables hover
 * by default (decoration semantics); we override that here by reading
 * the user's `hoverEnabled` flag — when on, hover works; when off, the
 * preview is static so the user sees the difference.
 *
 * Knobs: hover master + back-side occlusion + outline-specific lift /
 * glow / continent-dim. Continent dim is the most cinematic of the
 * lot — when hovering a country, all *other-continent* borders fade
 * to a dim level so the active region is foregrounded.
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
      <SwitchField
        label="Hover detection"
        configPath="countries.hoverEnabled"
        checked={settings.hoverEnabled}
        onChange={(hoverEnabled) => onGlobeChange({ hoverEnabled })}
        value="Drag the cursor across countries on the preview"
      />

      <DependsOn
        when={settings.hoverEnabled}
        because="Enable hover first."
        className="space-y-4"
      >
        <SectionHeading>Behaviour</SectionHeading>
        <SwitchField
          label="Occlude back side"
          configPath="countries.hoverOccludeBackSide"
          checked={settings.hoverOccludeBackSide}
          onChange={(hoverOccludeBackSide) => onGlobeChange({ hoverOccludeBackSide })}
          value="Hide highlight on the far hemisphere"
        />

        {/*
          Stroke + glow knobs are gated to kinds that actually mount
          the LineSegments selection stroke. Dotted opts out
          (`usesStandardCountryHighlight: false`) and uses dot-field
          edge brightening instead, so showing these knobs on dotted
          would mean knobs that look interactive but do nothing.
          Outline / hologram / paper / wireframe all keep the stroke
          path, so they see the full set.
        */}
        <DependsOn
          when={settings.kind !== 'dotted'}
          because="The dotted kind paints selection through dot-field edge brightening — stroke / glow knobs don't apply. Switch the main globe to outline / hologram / paper / wireframe to tune."
          className="space-y-4"
          variant="hidden"
        >
          <SectionHeading>Hover · stroke</SectionHeading>
          <ColorField
            label="Stroke color"
            configPath="countries.borderHover.color"
            value={settings.hoverStrokeColor || '#a5f3fc'}
            onChange={(hoverStrokeColor) => onGlobeChange({ hoverStrokeColor })}
            hint={settings.hoverStrokeColor === '' ? 'Theme default' : undefined}
            {...(settings.hoverStrokeColor !== '' ? { preset: '' } : {})}
            swatches={['#a5f3fc', '#67e8f9', '#fbbf24', '#f472b6', '#34d399', '#a78bfa', '#ffffff']}
          />
          <SliderField
            label="Stroke opacity"
            configPath="countries.borderHover.opacity"
            value={settings.hoverStrokeOpacity}
            min={0}
            max={1.5}
            step={0.05}
            format={(value) => (value <= 0 ? 'theme' : value.toFixed(2))}
            onChange={(hoverStrokeOpacity) => onGlobeChange({ hoverStrokeOpacity })}
          />
          <SliderField
            label="Stroke width"
            configPath="countries.borderHover.width"
            value={settings.hoverStrokeWidth}
            min={0}
            max={12}
            step={0.5}
            format={(value) => (value <= 0 ? 'theme' : `${value.toFixed(1)} px`)}
            onChange={(hoverStrokeWidth) => onGlobeChange({ hoverStrokeWidth })}
          />

          <SectionHeading>Hover · glow halo</SectionHeading>
          <ColorField
            label="Glow color"
            configPath="countries.borderHover.glowColor"
            value={settings.hoverGlowColor || '#67e8f9'}
            onChange={(hoverGlowColor) => onGlobeChange({ hoverGlowColor })}
            hint={settings.hoverGlowColor === '' ? 'Theme default' : undefined}
            {...(settings.hoverGlowColor !== '' ? { preset: '' } : {})}
            swatches={['#67e8f9', '#fbbf24', '#f472b6', '#34d399', '#a78bfa', '#ff8866', '#ffffff']}
          />
          <SliderField
            label="Glow width"
            configPath="countries.borderHover.glowWidth"
            value={settings.hoverGlowWidth}
            min={0}
            max={16}
            step={0.5}
            format={(value) => (value <= 0 ? 'theme' : `${value.toFixed(1)} px`)}
            onChange={(hoverGlowWidth) => onGlobeChange({ hoverGlowWidth })}
          />
          <SliderField
            label="Glow opacity"
            configPath="countries.borderHover.glowOpacity"
            value={settings.hoverGlowOpacity}
            min={0}
            max={1.5}
            step={0.05}
            format={(value) => (value <= 0 ? 'theme' : value.toFixed(2))}
            onChange={(hoverGlowOpacity) => onGlobeChange({ hoverGlowOpacity })}
          />

          <SectionHeading>Pinned · stroke</SectionHeading>
          <ColorField
            label="Stroke color"
            configPath="countries.borderActive.color"
            value={settings.activeStrokeColor || '#fcd34d'}
            onChange={(activeStrokeColor) => onGlobeChange({ activeStrokeColor })}
            hint={settings.activeStrokeColor === '' ? 'Theme default' : undefined}
            {...(settings.activeStrokeColor !== '' ? { preset: '' } : {})}
            swatches={['#fcd34d', '#fbbf24', '#ffffff', '#ff8866', '#a5f3fc', '#22ee99']}
          />
          <SliderField
            label="Stroke opacity"
            configPath="countries.borderActive.opacity"
            value={settings.activeStrokeOpacity}
            min={0}
            max={1.5}
            step={0.05}
            format={(value) => (value <= 0 ? 'theme' : value.toFixed(2))}
            onChange={(activeStrokeOpacity) => onGlobeChange({ activeStrokeOpacity })}
          />
          <SliderField
            label="Stroke width"
            configPath="countries.borderActive.width"
            value={settings.activeStrokeWidth}
            min={0}
            max={12}
            step={0.5}
            format={(value) => (value <= 0 ? 'theme' : `${value.toFixed(1)} px`)}
            onChange={(activeStrokeWidth) => onGlobeChange({ activeStrokeWidth })}
          />
        </DependsOn>

        <DependsOn
          when={settings.kind === 'dotted'}
          because="Dotted selection is rendered by scaling, brightening, and lifting surface dots instead of drawing a country stroke."
          className="space-y-4"
          variant="hidden"
        >
          <SectionHeading>Dotted · hover dots</SectionHeading>
          <SwitchField
            label="Hover expansion"
            checked={settings.dottedHoverDots}
            onChange={(dottedHoverDots) => onGlobeChange({ dottedHoverDots })}
            value="Hovered country's dots scale up and brighten"
          />
          <DependsOn
            when={settings.dottedHoverDots}
            because="Enable Hover expansion first."
            className="space-y-4"
          >
            <SliderField
              label="Scale"
              value={settings.dottedHoverScale}
              min={1}
              max={3}
              step={0.05}
              format={(value) => `×${value.toFixed(2)}`}
              onChange={(dottedHoverScale) => onGlobeChange({ dottedHoverScale })}
            />
            <SliderField
              label="Brightness boost"
              value={settings.dottedHoverBrightnessBoost}
              min={0}
              max={2}
              step={0.05}
              format={(value) => `×${value.toFixed(2)}`}
              onChange={(dottedHoverBrightnessBoost) =>
                onGlobeChange({ dottedHoverBrightnessBoost })
              }
            />
            <SliderField
              label="Ease duration"
              value={settings.dottedHoverDuration}
              min={0.05}
              max={1.5}
              step={0.01}
              format={(value) => `${(value * 1000).toFixed(0)} ms`}
              onChange={(dottedHoverDuration) => onGlobeChange({ dottedHoverDuration })}
            />
            <SliderField
              label="Hover lift"
              value={settings.dottedHoverLift}
              min={0}
              max={0.04}
              step={0.001}
              format={(value) =>
                value === 0 ? 'flat' : `+${(value * 100).toFixed(2)}% of radius`
              }
              onChange={(dottedHoverLift) => onGlobeChange({ dottedHoverLift })}
            />
          </DependsOn>

          <SectionHeading>Dotted · edge rim</SectionHeading>
          <SwitchField
            label="Edge dot rim"
            checked={settings.dottedEdgeHighlight}
            onChange={(dottedEdgeHighlight) => onGlobeChange({ dottedEdgeHighlight })}
            value="Boundary dots brighten and lift on hover or pin"
          />
          <DependsOn
            when={settings.dottedEdgeHighlight}
            because="Enable Edge dot rim first."
            className="space-y-4"
          >
            <SliderField
              label="Brightness boost"
              value={settings.dottedEdgeBoost}
              min={0}
              max={1.5}
              step={0.05}
              format={(value) => value.toFixed(2)}
              onChange={(dottedEdgeBoost) => onGlobeChange({ dottedEdgeBoost })}
            />
            <SliderField
              label="Edge lift"
              value={settings.dottedEdgeLift}
              min={0}
              max={0.02}
              step={0.0005}
              format={(value) =>
                value === 0 ? 'flat' : `+${(value * 100).toFixed(2)}% of radius`
              }
              onChange={(dottedEdgeLift) => onGlobeChange({ dottedEdgeLift })}
            />
          </DependsOn>

          <SectionHeading>Dotted · pinned country</SectionHeading>
          <SwitchField
            label="Active pulse"
            checked={settings.dottedActiveCountry}
            onChange={(dottedActiveCountry) => onGlobeChange({ dottedActiveCountry })}
            value="Pinned country's dots breathe with a steady boost"
          />
          <DependsOn
            when={settings.dottedActiveCountry}
            because="Enable Active pulse first."
            className="space-y-4"
          >
            <SliderField
              label="Brightness boost"
              value={settings.dottedActiveBoost}
              min={0}
              max={2}
              step={0.05}
              format={(value) => `+${value.toFixed(2)}`}
              onChange={(dottedActiveBoost) => onGlobeChange({ dottedActiveBoost })}
            />
            <SliderField
              label="Scale"
              value={settings.dottedActiveScale}
              min={1}
              max={2}
              step={0.02}
              format={(value) => `×${value.toFixed(2)}`}
              onChange={(dottedActiveScale) => onGlobeChange({ dottedActiveScale })}
            />
            <SliderField
              label="Pulse speed"
              value={settings.dottedActivePulseSpeed}
              min={0.05}
              max={2}
              step={0.05}
              format={(value) => `${value.toFixed(2)} Hz`}
              onChange={(dottedActivePulseSpeed) =>
                onGlobeChange({ dottedActivePulseSpeed })
              }
            />
            <SliderField
              label="Active lift"
              value={settings.dottedActiveLift}
              min={0}
              max={0.05}
              step={0.001}
              format={(value) =>
                value === 0 ? 'flat' : `+${(value * 100).toFixed(2)}% of radius`
              }
              onChange={(dottedActiveLift) => onGlobeChange({ dottedActiveLift })}
            />
          </DependsOn>
        </DependsOn>

        <DependsOn
          when={settings.kind === 'outline'}
          because="Outline-specific decoration. Switch the main globe to outline kind to tune."
          className="space-y-4"
          variant="hidden"
        >
          <SectionHeading>Outline · stroke</SectionHeading>
          <SliderField
            label="Highlight lift"
            value={settings.outlineHoverLift}
            min={0}
            max={0.01}
            step={0.0005}
            format={(value) => (value === 0 ? 'flat' : `+${(value * 100).toFixed(2)}%`)}
            onChange={(outlineHoverLift) => onGlobeChange({ outlineHoverLift })}
          />
          <SliderField
            label="Glow lift"
            value={settings.outlineHoverGlowLift}
            min={0}
            max={0.012}
            step={0.0005}
            format={(value) => (value === 0 ? 'flat' : `+${(value * 100).toFixed(2)}%`)}
            onChange={(outlineHoverGlowLift) => onGlobeChange({ outlineHoverGlowLift })}
          />

          <SectionHeading>Outline · glow</SectionHeading>
          <SwitchField
            label="Hover glow"
            checked={settings.outlineHoverGlowEnabled}
            onChange={(outlineHoverGlowEnabled) => onGlobeChange({ outlineHoverGlowEnabled })}
            value="Soft additive halo behind the hovered border"
          />

          <SectionHeading>Outline · focus</SectionHeading>
          <SwitchField
            label="Continent dim"
            checked={settings.outlineContinentDim}
            onChange={(outlineContinentDim) => onGlobeChange({ outlineContinentDim })}
            value="Fade other-continent borders while hovering"
          />
          <DependsOn
            when={settings.outlineContinentDim}
            because="Enable Continent dim first."
            className="space-y-4"
          >
            <SliderField
              label="Dim amount"
              value={settings.outlineContinentDimAmount}
              min={0}
              max={1}
              step={0.05}
              format={(value) => value.toFixed(2)}
              onChange={(outlineContinentDimAmount) =>
                onGlobeChange({ outlineContinentDimAmount })
              }
            />
          </DependsOn>
        </DependsOn>
      </DependsOn>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-violet-200/75">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    initialLat: 50,
    initialLng: 16,
    speed: 0.018,
    framingPadding: 0.14,
    atmosphere: true,
    starfield: true,
    tagline: 'Europe — drag the cursor to see hover transitions',
  },
  KnobsComponent,
  watchedKeys: [
    'hoverEnabled',
    'hoverOccludeBackSide',
    'hoverStrokeColor',
    'hoverStrokeWidth',
    'hoverStrokeOpacity',
    'hoverGlowColor',
    'hoverGlowWidth',
    'hoverGlowOpacity',
    'activeStrokeColor',
    'activeStrokeWidth',
    'activeStrokeOpacity',
    'dottedHoverDots',
    'dottedHoverScale',
    'dottedHoverBrightnessBoost',
    'dottedHoverDuration',
    'dottedHoverLift',
    'dottedActiveCountry',
    'dottedActiveBoost',
    'dottedActiveScale',
    'dottedActivePulseSpeed',
    'dottedActiveLift',
    'dottedEdgeHighlight',
    'dottedEdgeBoost',
    'dottedEdgeLift',
    'outlineHoverLift',
    'outlineHoverGlowLift',
    'outlineHoverGlowEnabled',
    'outlineContinentDim',
    'outlineContinentDimAmount',
  ],
  // Live now: hoverOccludeBackSide (highlight material depthTest flip),
  // hoverEnabled (pointer hit path), dotted selection knobs, and
  // outlineHoverGlowEnabled / outlineContinentDim / amount via the
  // kindHandle setters. Hover lift / glow lift bake into geometry
  // surface radius so they still rebuild.
  rebuildKeys: ['outlineHoverLift', 'outlineHoverGlowLift'],
};

export default preset;
