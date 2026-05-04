import { SliderField, SwitchField } from '@/components/shared/controls';
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
          checked={settings.hoverOccludeBackSide}
          onChange={(hoverOccludeBackSide) => onGlobeChange({ hoverOccludeBackSide })}
          value="Hide highlight on the far hemisphere"
        />

        <DependsOn
          when={settings.kind === 'outline'}
          because="Outline-specific decoration. Switch the main globe to outline kind to tune."
          className="space-y-4"
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
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-violet-200/70">
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
    'outlineHoverLift',
    'outlineHoverGlowLift',
    'outlineHoverGlowEnabled',
    'outlineContinentDim',
    'outlineContinentDimAmount',
  ],
  // Live now: hoverOccludeBackSide (highlight material depthTest flip),
  // outlineHoverGlowEnabled / outlineContinentDim / amount via the new
  // outline kindHandle.setOutlineConfig hatch. Hover lift / glow lift
  // bake into geometry surface radius so they still rebuild.
  // `hoverEnabled` only gates the dotted kind today; flipping it on
  // the outline preview is a visual no-op so we skip the rebuild.
  rebuildKeys: ['outlineHoverLift', 'outlineHoverGlowLift'],
};

export default preset;
