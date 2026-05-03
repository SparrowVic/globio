import { SwitchField } from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Hover crosshair configurator preset.
 *
 * Cinematography: outline-dark over Asia — wide land mass with varied
 * country sizes, so the user can sweep the cursor across many
 * silhouettes and watch the Tron-style targeting reticle + lat/lng
 * readout track in real time.
 *
 * The crosshair is **outline-kind only** — other kinds don't ship the
 * decoration. Knobs is just the toggle; the visual style (line color,
 * tooltip font, lat/lng formatting) comes from the active theme.
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
      <DependsOn
        when={settings.kind === 'outline'}
        because="Outline-only feature. Switch the main globe to outline kind."
        className="space-y-4"
      >
        <SwitchField
          label="Hover crosshair"
          checked={settings.outlineHoverCrosshair}
          onChange={(outlineHoverCrosshair) => onGlobeChange({ outlineHoverCrosshair })}
          value="Targeting reticle + lat/lng readout while hovering"
        />
      </DependsOn>

      <p className="rounded-md border border-dashed border-amber-200/[0.16] bg-amber-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-amber-100/70">
        Tip: the reticle's stroke + tint + tooltip styling come from the active{' '}
        <span className="text-white">theme</span>. Hover crosshair is currently shipped
        for the <span className="rounded bg-white/[0.05] px-1 font-mono">outline</span>{' '}
        kind only — other kinds will skip rendering it even if the toggle is on.
      </p>
    </div>
  );
};

const preset: PresetModule = {
  cinematography: {
    kind: 'outline',
    theme: 'outline-dark',
    initialLat: 32,
    initialLng: 95,
    speed: 0.02,
    framingPadding: 0.16,
    atmosphere: true,
    starfield: true,
    tagline: 'Outline · Asia — sweep the cursor to see the reticle track',
  },
  KnobsComponent,
  watchedKeys: ['outlineHoverCrosshair'],
  // Toggle is on the outline kindHandle; the layer has setEnabled() but
  // it's not yet routed through globe.update(). Until it is, this
  // rebuilds. Cheap (just remounts the kindHandle).
  rebuildKeys: ['outlineHoverCrosshair'],
};

export default preset;
