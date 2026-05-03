import { SwitchField } from '@/components/shared/controls';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

/**
 * Atmosphere configurator preset.
 *
 * Cinematography: hologram-cyan over the Pacific so the soft Fresnel
 * halo reads against the empty ocean — there's no continent crowding
 * the silhouette, the user sees the haze ring cleanly. Slow rotate so
 * the rim glow drifts subtly without distracting.
 *
 * The atmosphere effect itself is driven by **theme tokens** (color,
 * blur, opacity) rather than per-call config — the `atmosphere` field
 * on GlobeConfig is just a master enable/disable. So the only knob
 * here is the toggle. Tagline emphasises that themes drive the look.
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;
  return (
    <div className="space-y-4">
      <SwitchField
        label="Atmosphere halo"
        checked={settings.atmosphere}
        onChange={(atmosphere) => onGlobeChange({ atmosphere })}
        value="Soft Fresnel rim glow around the silhouette"
      />

      <p className="rounded-md border border-dashed border-cyan-200/[0.16] bg-cyan-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-cyan-100/70">
        Tip: the atmosphere's tint, blur and opacity come from the active{' '}
        <span className="text-white">theme</span> rather than per-call knobs. Switch
        themes from the studio top bar to see different rims (try
        {' '}<span className="rounded bg-white/[0.05] px-1 font-mono">hologram-cyan</span>,
        {' '}<span className="rounded bg-white/[0.05] px-1 font-mono">outline-dark</span>,
        {' '}<span className="rounded bg-white/[0.05] px-1 font-mono">paper-cream</span>).
      </p>
    </div>
  );
};

const preset: PresetModule = {
  cinematography: {
    kind: 'hologram',
    theme: 'hologram-cyan',
    initialLat: 6,
    initialLng: -150,
    speed: 0.014,
    framingPadding: 0.22,
    atmosphere: true,
    starfield: true,
    tagline: 'Hologram · Pacific — empty silhouette so the rim glow reads cleanly',
  },
  KnobsComponent,
  watchedKeys: ['atmosphere'],
  // Atmosphere toggle is now live (mesh.visible flip in core's
  // globe.update() switch). No rebuild.
};

export default preset;
