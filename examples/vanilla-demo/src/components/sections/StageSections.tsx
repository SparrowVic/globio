import { Compass, Crosshair, Gauge, Layers, MousePointer, Sparkles } from 'lucide-react';

import { DependsOn } from '@/components/DependsOn';
import { PanelSection } from '@/components/panels/PanelSection';
import { SelectField, SliderField, SwitchField, ToggleField } from '@/components/controls';
import type { GlobeSettings, PixelRatioSetting } from '@/configurator/types';

const resolutionOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
] as const;

const zoomOptions = [
  { value: 'classic', label: 'Classic' },
  { value: 'attract', label: 'Attract' },
  { value: 'repel', label: 'Repel' },
] as const;

const focusPulseOriginOptions = [
  { value: 'click', label: 'Click point' },
  { value: 'centroid', label: 'Centroid' },
] as const;

const pixelRatioOptions: ReadonlyArray<{ readonly value: PixelRatioSetting; readonly label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: '1', label: '1x' },
  { value: '1.5', label: '1.5x' },
  { value: '2', label: '2x' },
];

export interface StageSectionsProps {
  readonly settings: GlobeSettings;
  readonly onChange: (patch: Partial<GlobeSettings>) => void;
}

/**
 * Five accordion sections for the Stage panel. Each is a pure render
 * over `settings`/`onChange` — no internal state; collapse persistence
 * lives in `<PanelSection>` via localStorage.
 *
 * Section grouping follows §5.1 of the redesign plan:
 *   Kind & Theme · Surface · Camera · Interaction · Performance
 *
 * Reactive field disabling is wired here (matrix §6.1):
 *   labelMinScreenSize ← countryLabels
 *   hoverOccludeBackSide ← hoverEnabled
 *   zoomStrength + smoothZoom ← zoomMode !== 'classic'
 *   autoRotateSpeed ← autoRotate
 */
export function StageSections({ settings, onChange }: StageSectionsProps) {
  return (
    <>
      <PanelSection
        id="stage-surface"
        title="Surface"
        icon={<Layers className="size-3.5" />}
        meta={[
          settings.atmosphere ? 'atmo' : null,
          settings.starfield ? 'stars' : null,
          settings.countryLabels ? 'labels' : null,
        ]
          .filter(Boolean)
          .join(' · ') || 'minimal'}
        defaultOpen
      >
        <ToggleField
          label="Country resolution"
          value={settings.countryResolution}
          options={resolutionOptions}
          onChange={(countryResolution) => onChange({ countryResolution })}
        />
        <SwitchField
          label="Country labels"
          checked={settings.countryLabels}
          onChange={(countryLabels) => onChange({ countryLabels })}
        />
        <DependsOn when={settings.countryLabels} because="Enable Country labels first">
          <SliderField
            label="Label threshold"
            value={settings.labelMinScreenSize}
            min={30}
            max={150}
            step={2}
            format={(value) => `${value.toFixed(0)} px`}
            onChange={(labelMinScreenSize) => onChange({ labelMinScreenSize })}
          />
          <SliderField
            label="Fade range"
            value={settings.labelSizeFadeRange}
            min={0}
            max={1}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(labelSizeFadeRange) => onChange({ labelSizeFadeRange })}
          />
          <SliderField
            label="Transition"
            value={settings.labelTransitionMs}
            min={0}
            max={800}
            step={20}
            format={(value) => `${value.toFixed(0)} ms`}
            onChange={(labelTransitionMs) => onChange({ labelTransitionMs })}
          />
          <SwitchField
            label="Halo"
            checked={settings.labelHaloEnabled}
            onChange={(labelHaloEnabled) => onChange({ labelHaloEnabled })}
          />
          <SliderField
            label="Halo radius"
            value={settings.labelHaloRadius}
            min={0.5}
            max={6}
            step={0.5}
            format={(value) => `${value.toFixed(1)} px`}
            onChange={(labelHaloRadius) => onChange({ labelHaloRadius })}
            disabled={!settings.labelHaloEnabled}
            disabledReason="Enable Halo first"
          />
        </DependsOn>
        <div className="grid grid-cols-2 gap-2">
          <SwitchField
            label="Atmosphere"
            checked={settings.atmosphere}
            onChange={(atmosphere) => onChange({ atmosphere })}
          />
          <SwitchField
            label="Stars"
            checked={settings.starfield}
            onChange={(starfield) => onChange({ starfield })}
          />
        </div>
        <SwitchField
          label="Focus pulse"
          checked={settings.focusPulse}
          onChange={(focusPulse) => onChange({ focusPulse })}
        />
        <DependsOn when={settings.focusPulse} because="Enable Focus pulse first">
          <ToggleField
            label="Pulse origin"
            value={settings.focusPulseOrigin}
            options={focusPulseOriginOptions}
            onChange={(focusPulseOrigin) => onChange({ focusPulseOrigin })}
          />
          <SwitchField
            label="Pulse on ocean click"
            checked={settings.focusPulseOnSurfaceClick}
            onChange={(focusPulseOnSurfaceClick) => onChange({ focusPulseOnSurfaceClick })}
          />
          {/* Outline-specific band geometry knobs. Hidden for other kinds
              since each kind's pulse will eventually grow its own knob set. */}
          <DependsOn when={settings.kind === 'outline'} variant="hidden">
            <SliderField
              label="Pulse duration"
              value={settings.outlinePulseDurationMs}
              min={300}
              max={3500}
              step={50}
              format={(value) => `${(value / 1000).toFixed(2)} s`}
              onChange={(outlinePulseDurationMs) => onChange({ outlinePulseDurationMs })}
            />
            <SliderField
              label="Pulse start size"
              value={settings.outlinePulseRadiusBase}
              min={0.01}
              max={0.2}
              step={0.005}
              format={(value) => `${(value * (180 / Math.PI)).toFixed(1)}°`}
              onChange={(outlinePulseRadiusBase) => onChange({ outlinePulseRadiusBase })}
            />
            <SliderField
              label="Pulse expansion"
              value={settings.outlinePulseScaleMax}
              min={1.2}
              max={5}
              step={0.1}
              format={(value) => `×${value.toFixed(1)}`}
              onChange={(outlinePulseScaleMax) => onChange({ outlinePulseScaleMax })}
            />
            <SliderField
              label="Pulse intensity"
              value={settings.outlinePulseOpacity}
              min={0.2}
              max={2}
              step={0.05}
              format={(value) => value.toFixed(2)}
              onChange={(outlinePulseOpacity) => onChange({ outlinePulseOpacity })}
            />
          </DependsOn>
        </DependsOn>
      </PanelSection>

      <PanelSection
        id="stage-camera"
        title="Camera"
        icon={<Compass className="size-3.5" />}
        meta={
          settings.autoRotate
            ? `auto-rotate · ${settings.zoomMode}`
            : `static · ${settings.zoomMode}`
        }
      >
        <SliderField
          label="Axis tilt"
          value={settings.axisTilt}
          min={-35}
          max={35}
          step={0.5}
          format={(value) => `${value.toFixed(1)} deg`}
          onChange={(axisTilt) => onChange({ axisTilt })}
        />
        <ToggleField
          label="Zoom mode"
          value={settings.zoomMode}
          options={zoomOptions}
          onChange={(zoomMode) => onChange({ zoomMode })}
        />
        <SliderField
          label="Zoom strength"
          value={settings.zoomStrength}
          min={0}
          max={1}
          step={0.05}
          onChange={(zoomStrength) => onChange({ zoomStrength })}
          disabled={settings.zoomMode === 'classic'}
          disabledReason="Switch zoom mode to attract or repel to enable"
        />
        <SwitchField
          label="Smooth zoom"
          checked={settings.smoothZoom}
          onChange={(smoothZoom) => onChange({ smoothZoom })}
          disabled={settings.zoomMode === 'classic'}
          disabledReason="Smooth zoom only applies to attract/repel modes"
        />
        <SwitchField
          label="Auto rotate"
          checked={settings.autoRotate}
          onChange={(autoRotate) => onChange({ autoRotate })}
        />
        <SliderField
          label="Rotate speed"
          value={settings.autoRotateSpeed}
          min={0}
          max={0.8}
          step={0.01}
          onChange={(autoRotateSpeed) => onChange({ autoRotateSpeed })}
          disabled={!settings.autoRotate}
          disabledReason="Enable Auto rotate first"
        />
        <SliderField
          label="Min zoom"
          value={settings.minZoom}
          min={1}
          max={3}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(minZoom) => {
            // Keep min strictly below max to avoid the camera locking up.
            const safe = Math.min(minZoom, settings.maxZoom - 0.1);
            onChange({ minZoom: safe });
          }}
        />
        <SliderField
          label="Max zoom"
          value={settings.maxZoom}
          min={3}
          max={15}
          step={0.25}
          format={(value) => value.toFixed(2)}
          onChange={(maxZoom) => {
            const safe = Math.max(maxZoom, settings.minZoom + 0.1);
            onChange({ maxZoom: safe });
          }}
        />
        {/* Initial camera position — read at boot. Editing these shifts
            where the globe parks itself on next mount and where the Home
            button flies to. Doesn't snap the live camera. */}
        <SliderField
          label="Initial latitude"
          value={settings.initialLat}
          min={-90}
          max={90}
          step={1}
          format={(value) => `${value.toFixed(0)}°`}
          onChange={(initialLat) => onChange({ initialLat })}
        />
        <SliderField
          label="Initial longitude"
          value={settings.initialLng}
          min={-180}
          max={180}
          step={1}
          format={(value) => `${value.toFixed(0)}°`}
          onChange={(initialLng) => onChange({ initialLng })}
        />
      </PanelSection>

      <PanelSection
        id="stage-interaction"
        title="Interaction"
        icon={<MousePointer className="size-3.5" />}
        meta={settings.hoverEnabled ? 'hover on' : 'hover off'}
      >
        <SwitchField
          label="Hover detection"
          checked={settings.hoverEnabled}
          onChange={(hoverEnabled) => onChange({ hoverEnabled })}
        />
        <SwitchField
          label="Occlude back side"
          checked={settings.hoverOccludeBackSide}
          onChange={(hoverOccludeBackSide) => onChange({ hoverOccludeBackSide })}
          disabled={!settings.hoverEnabled}
          disabledReason="Enable Hover detection first"
        />
      </PanelSection>

      <PanelSection
        id="stage-focus"
        title="Focus"
        icon={<Crosshair className="size-3.5" />}
        meta={settings.clickToFocus ? `${(settings.focusPadding * 100).toFixed(0)}% pad` : 'off'}
      >
        <SwitchField
          label="Click country to focus"
          checked={settings.clickToFocus}
          onChange={(clickToFocus) => onChange({ clickToFocus })}
        />
        <DependsOn when={settings.clickToFocus} because="Enable Click country to focus first">
          <SliderField
            label="Padding"
            value={settings.focusPadding}
            min={0}
            max={0.45}
            step={0.01}
            format={(value) => `${(value * 100).toFixed(0)}%`}
            onChange={(focusPadding) => onChange({ focusPadding })}
          />
          <SliderField
            label="Flight duration"
            value={settings.focusDurationMs}
            min={200}
            max={3500}
            step={50}
            format={(value) => `${(value / 1000).toFixed(2)} s`}
            onChange={(focusDurationMs) => onChange({ focusDurationMs })}
          />
          <SliderField
            label="Arc elevation"
            value={settings.focusElevation}
            min={0}
            max={3}
            step={0.05}
            format={(value) => value.toFixed(2)}
            onChange={(focusElevation) => onChange({ focusElevation })}
          />
          <SwitchField
            label="Pause auto-rotate"
            checked={settings.focusPauseAutoRotate}
            onChange={(focusPauseAutoRotate) => onChange({ focusPauseAutoRotate })}
          />
        </DependsOn>
      </PanelSection>

      <PanelSection
        id="stage-perf"
        title="Performance"
        icon={<Gauge className="size-3.5" />}
        meta={
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3" /> {settings.adaptiveQuality ? 'auto' : 'manual'}
          </span>
        }
      >
        <SelectField
          label="Pixel ratio"
          value={settings.pixelRatio}
          options={pixelRatioOptions}
          onChange={(pixelRatio) => onChange({ pixelRatio })}
          disabled={settings.adaptiveQuality}
          disabledReason="Adaptive quality auto-overrides this each frame"
        />
        <SwitchField
          label="Adaptive quality"
          checked={settings.adaptiveQuality}
          onChange={(adaptiveQuality) => onChange({ adaptiveQuality })}
          value="60 FPS target"
        />
        <SliderField
          label="Max FPS"
          value={settings.maxFps}
          min={15}
          max={120}
          step={5}
          format={(value) => `${value.toFixed(0)} fps`}
          onChange={(maxFps) => onChange({ maxFps })}
        />
        <SwitchField
          label="Antialiasing"
          checked={settings.antialias}
          onChange={(antialias) => onChange({ antialias })}
        />
      </PanelSection>
    </>
  );
}
