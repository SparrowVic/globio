import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCompass,
  faCrosshairs,
  faGauge,
  faSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import { DependsOn } from '@/components/shared/components/DependsOn';
import { PanelSection } from '@/components/studio/panels/PanelSection';
import {
  SelectField,
  SliderField,
  SwitchField,
  ToggleField,
} from '@/components/shared/controls';
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

const pixelRatioOptions: ReadonlyArray<{
  readonly value: PixelRatioSetting;
  readonly label: string;
}> = [
  { value: 'auto', label: 'Auto' },
  { value: '1', label: '1x' },
  { value: '1.5', label: '1.5x' },
  { value: '2', label: '2x' },
];

export interface StageSectionsProps {
  readonly settings: GlobeSettings;
  readonly onChange: (patch: Partial<GlobeSettings>) => void;
}

export type StageSectionId = 'stage-camera' | 'stage-focus' | 'stage-perf';

export function StageSections({ settings, onChange }: StageSectionsProps) {
  return (
    <>
      <CameraSection settings={settings} onChange={onChange} />
      <FocusSection settings={settings} onChange={onChange} />
      <PerformanceSection settings={settings} onChange={onChange} />
    </>
  );
}

export function CameraSection({ settings, onChange }: StageSectionsProps) {
  return (
    <PanelSection
      id="stage-camera"
      title="Camera"
      feature="initial-position"
      icon={<FontAwesomeIcon icon={faCompass} className="size-3" />}
      meta={
        settings.autoRotate
          ? `auto-rotate · ${settings.zoomMode}`
          : `static · ${settings.zoomMode}`
      }
      defaultOpen
    >
      <SliderField
        label="Axis tilt"
        configPath="axisTilt"
        value={settings.axisTilt}
        min={-35}
        max={35}
        step={0.5}
        format={(value) => `${value.toFixed(1)} deg`}
        onChange={(axisTilt) => onChange({ axisTilt })}
      />
      <ToggleField
        label="Zoom mode"
        configPath="zoom.mode"
        value={settings.zoomMode}
        options={zoomOptions}
        onChange={(zoomMode) => onChange({ zoomMode })}
      />
      <SliderField
        label="Zoom strength"
        configPath="zoom.strength"
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
        configPath="zoom.smooth"
        checked={settings.smoothZoom}
        onChange={(smoothZoom) => onChange({ smoothZoom })}
      />
      <SwitchField
        label="Auto rotate"
        configPath="autoRotate.enabled"
        checked={settings.autoRotate}
        onChange={(autoRotate) => onChange({ autoRotate })}
      />
      <SliderField
        label="Rotate speed"
        configPath="autoRotate.speed"
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
        configPath="minZoom"
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
        configPath="maxZoom"
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
        configPath="initialPosition"
        value={settings.initialLat}
        min={-90}
        max={90}
        step={1}
        format={(value) => `${value.toFixed(0)}°`}
        onChange={(initialLat) => onChange({ initialLat })}
      />
      <SliderField
        label="Initial longitude"
        configPath="initialPosition"
        value={settings.initialLng}
        min={-180}
        max={180}
        step={1}
        format={(value) => `${value.toFixed(0)}°`}
        onChange={(initialLng) => onChange({ initialLng })}
      />
    </PanelSection>
  );
}

export function FocusSection({ settings, onChange }: StageSectionsProps) {
  return (
    <PanelSection
      id="stage-focus"
      title="Focus"
      feature="focus-on-country"
      icon={<FontAwesomeIcon icon={faCrosshairs} className="size-3" />}
      meta={
        settings.clickToFocus
          ? `${(settings.focusPadding * 100).toFixed(0)}% pad`
          : 'off'
      }
    >
      <SwitchField
        label="Click country to focus"
        info="Studio listens for countryClick and calls focusOnCountry with the clicked position and the options below."
        checked={settings.clickToFocus}
        onChange={(clickToFocus) => onChange({ clickToFocus })}
      />
      <DependsOn
        when={settings.clickToFocus}
        because="Enable Click country to focus first"
        className="space-y-3"
      >
        <SliderField
          label="Padding"
          typePath="FocusOptions.padding"
          value={settings.focusPadding}
          min={0}
          max={0.45}
          step={0.01}
          format={(value) => `${(value * 100).toFixed(0)}%`}
          onChange={(focusPadding) => onChange({ focusPadding })}
        />
        <SliderField
          label="Flight duration"
          typePath="FlyToOptions.duration"
          value={settings.focusDurationMs}
          min={200}
          max={3500}
          step={50}
          format={(value) => `${(value / 1000).toFixed(2)} s`}
          onChange={(focusDurationMs) => onChange({ focusDurationMs })}
        />
        <SliderField
          label="Arc elevation"
          typePath="FlyToOptions.elevation"
          value={settings.focusElevation}
          min={0}
          max={3}
          step={0.05}
          format={(value) => value.toFixed(2)}
          onChange={(focusElevation) => onChange({ focusElevation })}
        />
        <SwitchField
          label="Pause auto-rotate"
          typePath="FocusOptions.pauseAutoRotateOnFocus"
          feature="focus-on-country"
          checked={settings.focusPauseAutoRotate}
          onChange={(focusPauseAutoRotate) =>
            onChange({ focusPauseAutoRotate })
          }
        />
      </DependsOn>
    </PanelSection>
  );
}

export function PerformanceSection({ settings, onChange }: StageSectionsProps) {
  return (
    <PanelSection
      id="stage-perf"
      title="Performance"
      feature="performance"
      icon={<FontAwesomeIcon icon={faGauge} className="size-3" />}
      meta={
        <span className="inline-flex items-center gap-1">
          <FontAwesomeIcon icon={faSparkles} className="size-2.5" />
          {settings.adaptiveQuality ? 'auto' : 'manual'}
        </span>
      }
    >
      <ToggleField
        label="Country resolution"
        configPath="countries.resolution"
        value={settings.countryResolution}
        options={resolutionOptions}
        onChange={(countryResolution) => onChange({ countryResolution })}
      />
      <SelectField
        label="Pixel ratio"
        configPath="performance.pixelRatio"
        value={settings.pixelRatio}
        options={pixelRatioOptions}
        onChange={(pixelRatio) => onChange({ pixelRatio })}
        disabled={settings.adaptiveQuality}
        disabledReason="Adaptive quality auto-overrides this each frame"
      />
      <SwitchField
        label="Adaptive quality"
        configPath="performance.adaptiveQuality"
        checked={settings.adaptiveQuality}
        onChange={(adaptiveQuality) => onChange({ adaptiveQuality })}
        value="60 FPS target"
      />
      <SliderField
        label="Max FPS"
        configPath="performance.maxFps"
        value={settings.maxFps}
        min={15}
        max={120}
        step={5}
        format={(value) => `${value.toFixed(0)} fps`}
        onChange={(maxFps) => onChange({ maxFps })}
      />
      <SwitchField
        label="Antialiasing"
        configPath="performance.antialias"
        checked={settings.antialias}
        onChange={(antialias) => onChange({ antialias })}
      />
    </PanelSection>
  );
}
