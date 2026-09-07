import { SliderField, SwitchField } from '@/components/shared/controls';
import { DependsOn } from '@/components/shared/components/DependsOn';

import type { KnobsComponentProps } from '../configurators';

import { SectionHeading } from './cinematic-controls';

/**
 * Shared HDR post-processing knobs (`GlobeConfig.postprocessing`).
 *
 * Split out of `cinematic-controls.tsx` purely for file size — it renders
 * as the last section of the same Workshop card. The pipeline itself is
 * kind-agnostic (it just defaults on for `cinematic` and off elsewhere),
 * so nothing here is gated on the active kind.
 *
 * Every per-effect `enabled` flag is derived in `builders.ts` from the
 * matching strength slider, so dragging a strength to 0 skips that pass
 * rather than compositing a no-op.
 */
export function CinematicPostFxControls({ state, onGlobeChange }: KnobsComponentProps) {
  const settings = state.globe;

  return (
    <>
      <SectionHeading>Post-processing</SectionHeading>
      <SwitchField
        label="Post FX"
        checked={settings.postfxEnabled}
        onChange={(postfxEnabled) => onGlobeChange({ postfxEnabled })}
        value="HDR bloom / streak / grain composite with a soft highlight roll-off"
      />
      <DependsOn
        when={settings.postfxEnabled}
        because="Enable Post FX first."
        className="space-y-4"
      >
        <SliderField
          label="Exposure"
          value={settings.postfxExposure}
          min={0.4}
          max={2}
          step={0.01}
          format={(value) => `×${value.toFixed(2)}`}
          onChange={(postfxExposure) => onGlobeChange({ postfxExposure })}
        />
        <SliderField
          label="Bloom strength"
          value={settings.postfxBloomStrength}
          min={0}
          max={2}
          step={0.01}
          format={(value) => (value === 0 ? 'off' : value.toFixed(2))}
          onChange={(postfxBloomStrength) => onGlobeChange({ postfxBloomStrength })}
        />
        <DependsOn
          when={settings.postfxBloomStrength > 0}
          because="Raise Bloom strength above 0 first."
          className="space-y-4"
        >
          <SliderField
            label="Bloom threshold"
            value={settings.postfxBloomThreshold}
            min={0}
            max={1.5}
            step={0.01}
            format={(value) => value.toFixed(2)}
            onChange={(postfxBloomThreshold) => onGlobeChange({ postfxBloomThreshold })}
          />
          <SliderField
            label="Bloom radius"
            value={settings.postfxBloomRadius}
            min={0}
            max={1}
            step={0.01}
            format={(value) => value.toFixed(2)}
            onChange={(postfxBloomRadius) => onGlobeChange({ postfxBloomRadius })}
          />
        </DependsOn>
        <SliderField
          label="Anamorphic streak"
          value={settings.postfxStreak}
          min={0}
          max={1}
          step={0.01}
          format={(value) => (value === 0 ? 'off' : value.toFixed(2))}
          onChange={(postfxStreak) => onGlobeChange({ postfxStreak })}
        />
        <SliderField
          label="Vignette"
          value={settings.postfxVignette}
          min={0}
          max={1}
          step={0.01}
          format={(value) => (value === 0 ? 'off' : value.toFixed(2))}
          onChange={(postfxVignette) => onGlobeChange({ postfxVignette })}
        />
        <SliderField
          label="Chromatic aberration"
          value={settings.postfxChromatic}
          min={0}
          max={0.01}
          step={0.0001}
          format={(value) => (value === 0 ? 'off' : value.toFixed(4))}
          onChange={(postfxChromatic) => onGlobeChange({ postfxChromatic })}
        />
        <SliderField
          label="Film grain"
          value={settings.postfxGrain}
          min={0}
          max={0.15}
          step={0.001}
          format={(value) => (value === 0 ? 'off' : value.toFixed(3))}
          onChange={(postfxGrain) => onGlobeChange({ postfxGrain })}
        />
      </DependsOn>
    </>
  );
}
