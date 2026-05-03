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
 * Atmosphere configurator preset.
 *
 * Cinematography: hologram-cyan over the Pacific so the soft Fresnel
 * halo reads against empty ocean — there's no continent crowding the
 * silhouette, the user sees the haze ring cleanly. Slow rotate.
 *
 * Knobs: master toggle + (optional) color override + (optional) intensity
 * multiplier. The atmosphere shader uniforms are mutated live (no
 * rebuild). When color is the empty string, we fall back to the active
 * theme's `atmosphere.color` token; same for intensity = 0.
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

      <DependsOn
        when={settings.atmosphere}
        because="Enable Atmosphere first."
        className="space-y-4"
      >
        <SectionHeading>Color</SectionHeading>
        <ColorField
          label="Halo tint"
          value={settings.atmosphereColor || '#67e8f9'}
          onChange={(atmosphereColor) => onGlobeChange({ atmosphereColor })}
          hint={settings.atmosphereColor === '' ? 'Theme default' : undefined}
          {...(settings.atmosphereColor !== '' ? { preset: '' } : {})}
          swatches={[
            '#67e8f9',
            '#22d3ee',
            '#a78bfa',
            '#f472b6',
            '#fbbf24',
            '#34d399',
            '#84cc16',
            '#ef4444',
            '#fde68a',
            '#ffffff',
            '#cfdcff',
            '#ffd28a',
          ]}
        />

        <SectionHeading>Intensity</SectionHeading>
        <SliderField
          label="Halo brightness"
          value={settings.atmosphereIntensity}
          min={0}
          max={3}
          step={0.05}
          format={(value) =>
            value === 0 ? 'theme default' : `${value.toFixed(2)}`
          }
          onChange={(atmosphereIntensity) => onGlobeChange({ atmosphereIntensity })}
        />
      </DependsOn>

      <p className="rounded-md border border-dashed border-cyan-200/[0.16] bg-cyan-200/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-cyan-100/80">
        Tip: the halo's blur radius + falloff curve come from the active
        {' '}<span className="text-white">theme</span>. Switch themes from the studio
        top bar to see different rims (try
        {' '}<span className="rounded bg-white/[0.05] px-1 font-mono">hologram-cyan</span>,
        {' '}<span className="rounded bg-white/[0.05] px-1 font-mono">outline-dark</span>,
        {' '}<span className="rounded bg-white/[0.05] px-1 font-mono">paper-cream</span>).
      </p>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-cyan-200/70">
      {children}
    </p>
  );
}

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
  watchedKeys: ['atmosphere', 'atmosphereColor', 'atmosphereIntensity'],
  // All atmosphere knobs are now live (mesh.visible flip + color
  // uniform update + intensity uniform update inside core's
  // globe.update() switch). No rebuild.
};

export default preset;
