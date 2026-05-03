import { SwitchField } from '@/components/shared/controls';
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
 * Knobs: hover master, back-side occlusion, plus outline-specific lift
 * & glow lift knobs (since outline is the cinematography kind).
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
      <DependsOn when={settings.hoverEnabled} because="Enable hover first.">
        <SwitchField
          label="Occlude back side"
          checked={settings.hoverOccludeBackSide}
          onChange={(hoverOccludeBackSide) => onGlobeChange({ hoverOccludeBackSide })}
          value="Hide highlight on the far hemisphere"
        />
      </DependsOn>

      <p className="rounded-md border border-dashed border-violet-200/[0.16] bg-violet-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-violet-100/70">
        Tip: outline kind defaults to <span className="text-white">hover lift = 0</span>{' '}
        (no duplicate stroke). The other kinds use the legacy 0.0025 lift; expose this
        via <code className="rounded bg-white/[0.05] px-1 font-mono">OutlineConfig.hover</code>{' '}
        when wiring custom themes.
      </p>
    </div>
  );
};

const preset: PresetModule = {
  cinematography: {
    kind: 'outline',
    theme: 'outline-dark',
    initialLat: 50,
    initialLng: 16,
    speed: 0.018,
    framingPadding: 0.14,
    atmosphere: true,
    starfield: true,
    tagline: 'Outline · Europe — drag the cursor to see hover transitions',
  },
  KnobsComponent,
  watchedKeys: ['hoverEnabled', 'hoverOccludeBackSide'],
  // Hover gating + back-side occlusion are construction-time fields in
  // the core today. Until we ship live setters, these still rebuild.
  rebuildKeys: ['hoverEnabled', 'hoverOccludeBackSide'],
};

export default preset;
