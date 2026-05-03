import { useEffect, useRef } from 'react';

import {
  SliderField,
  SwitchField,
  ToggleField,
} from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type {
  KnobsComponentProps,
  PresetModule,
} from '../configurators';

const focusPulseOriginOptions = [
  { value: 'click', label: 'Click point' },
  { value: 'centroid', label: 'Centroid' },
] as const;

/**
 * Pulse configurator preset.
 *
 * Cinematography: outline-dark kind so the gold sonar ring reads
 * crisply against linework. Camera near (default zoom from framing).
 *
 * Special: an internal effect dispatches a fake "focus pulse" via
 * imperative API every 2.5s so the user *sees* the pulse cycle
 * without having to click. Implementation: we don't have direct
 * access to the preview globe instance from here (it lives inside
 * `WorkshopPreviewGlobe`); instead, the user clicks anywhere on the
 * preview surface to trigger a pulse — preset uses
 * `pulseOnSurfaceClick: true` so a click anywhere fires a pulse.
 *
 * Knobs: focus pulse master + origin + on-surface-click toggle, plus
 * outline-specific band geometry (radius, expansion, intensity, duration).
 */
const KnobsComponent = ({ state, onGlobeChange }: KnobsComponentProps) => {
  const settings = state.globe;

  // Self-firing pulse: every 2.5s nudge `focusPulseOnSurfaceClick` to
  // true on a temporary tick. This is a workaround until we expose
  // imperative `globe.spawnFocusPulse()` on the GlobeInstance — for
  // now we just rely on the cinematography preset's auto-rotate +
  // `pulseOnSurfaceClick` so the user sees pulses by clicking the
  // surrounding area. Skipped for v1: too hacky to ship.
  const tickRef = useRef(0);
  useEffect(() => {
    tickRef.current = 0;
  }, []);

  return (
    <div className="space-y-4">
      <SwitchField
        label="Enable focus pulse"
        checked={settings.focusPulse}
        onChange={(focusPulse) => onGlobeChange({ focusPulse })}
      />

      <DependsOn when={settings.focusPulse} because="Enable focus pulse first.">
        <SectionHeading>Trigger</SectionHeading>
        <ToggleField
          label="Pulse origin"
          value={settings.focusPulseOrigin}
          options={focusPulseOriginOptions}
          onChange={(focusPulseOrigin) => onGlobeChange({ focusPulseOrigin })}
        />
        <SwitchField
          label="Fire on ocean / void clicks"
          checked={settings.focusPulseOnSurfaceClick}
          onChange={(focusPulseOnSurfaceClick) => onGlobeChange({ focusPulseOnSurfaceClick })}
          value="Click anywhere on the surface to test"
        />

        <DependsOn
          when={settings.kind === 'outline'}
          because="Outline-specific band geometry. Switch the main globe to outline kind to tune."
        >
          <SectionHeading>Outline band</SectionHeading>
          <SliderField
            label="Duration"
            value={settings.outlinePulseDurationMs}
            min={300}
            max={3500}
            step={50}
            format={(value) => `${(value / 1000).toFixed(2)} s`}
            onChange={(outlinePulseDurationMs) => onGlobeChange({ outlinePulseDurationMs })}
          />
          <SliderField
            label="Start size"
            value={settings.outlinePulseRadiusBase}
            min={0.01}
            max={0.2}
            step={0.005}
            format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
            onChange={(outlinePulseRadiusBase) => onGlobeChange({ outlinePulseRadiusBase })}
          />
          <SliderField
            label="Expansion"
            value={settings.outlinePulseScaleMax}
            min={1.2}
            max={5}
            step={0.1}
            format={(value) => `×${value.toFixed(1)}`}
            onChange={(outlinePulseScaleMax) => onGlobeChange({ outlinePulseScaleMax })}
          />
          <SliderField
            label="Intensity"
            value={settings.outlinePulseOpacity}
            min={0.2}
            max={2}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(outlinePulseOpacity) => onGlobeChange({ outlinePulseOpacity })}
          />
        </DependsOn>
      </DependsOn>

      <p className="rounded-md border border-dashed border-white/[0.08] bg-white/[0.015] px-3 py-2 text-[10.5px] leading-relaxed text-slate-500">
        Tip: <span className="text-slate-300">click anywhere on the preview globe</span> to
        fire a pulse and see the live timing / size effect.
      </p>
    </div>
  );
};

function SectionHeading({ children }: { readonly children: React.ReactNode }) {
  return (
    <p className="pt-2 text-[9.5px] font-medium uppercase tracking-[0.22em] text-pink-200/70">
      {children}
    </p>
  );
}

const preset: PresetModule = {
  cinematography: {
    kind: 'outline',
    theme: 'outline-dark',
    initialLat: 12,
    initialLng: 0,
    speed: 0.03,
    framingPadding: 0.18,
    atmosphere: true,
    starfield: true,
    tagline: 'Outline · click anywhere on the surface to fire a pulse',
  },
  KnobsComponent,
  watchedKeys: [
    'focusPulse',
    'focusPulseOrigin',
    'focusPulseOnSurfaceClick',
    'outlinePulseDurationMs',
    'outlinePulseRadiusBase',
    'outlinePulseScaleMax',
    'outlinePulseOpacity',
  ],
};

export default preset;
