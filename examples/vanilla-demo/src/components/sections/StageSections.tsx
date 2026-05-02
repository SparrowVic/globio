import {
  Compass,
  Gauge,
  Layers,
  MousePointer,
  Palette,
  Sparkles,
} from 'lucide-react';

import { DependsOn } from '@/components/DependsOn';
import { PanelSection } from '@/components/panels/PanelSection';
import { SelectField, SliderField, SwitchField, ToggleField } from '@/components/controls';
import type { GlobeSettings, PixelRatioSetting } from '@/configurator/types';
import type { GlobeKind, ThemePresetName } from '@your-globe/core';

const kindOptions = [
  { value: 'outline', label: 'Outline' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'wireframe', label: 'Wire' },
  { value: 'paper', label: 'Paper' },
  { value: 'hologram', label: 'Holo' },
] as const;

/**
 * Theme catalog tagged with the kind each theme renders best on. The
 * Theme picker filters this set by the currently-active kind so users
 * don't see "Paper atlas" while running an outline globe.
 */
const themeCatalog: ReadonlyArray<{
  readonly value: ThemePresetName;
  readonly label: string;
  readonly kind: GlobeKind;
}> = [
  { value: 'outline-dark', label: 'Outline dark', kind: 'outline' },
  { value: 'outline-light', label: 'Outline light', kind: 'outline' },
  { value: 'outline-sunset', label: 'Sunset', kind: 'outline' },
  { value: 'outline-cyber', label: 'Cyber', kind: 'outline' },
  { value: 'outline-monochrome', label: 'Mono', kind: 'outline' },
  { value: 'dotted-dark', label: 'Dotted dark', kind: 'dotted' },
  { value: 'wireframe-tron', label: 'Tron wire', kind: 'wireframe' },
  { value: 'paper-default', label: 'Paper atlas', kind: 'paper' },
  { value: 'hologram-cyan', label: 'Hologram cyan', kind: 'hologram' },
];

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
  const themeOptions = themeCatalog
    .filter((t) => t.kind === settings.kind)
    .map((t) => ({ value: t.value, label: t.label }));

  return (
    <>
      <PanelSection id="stage-kind-theme" title="Kind & Theme" icon={<Palette className="size-3.5" />} defaultOpen>
        <ToggleField
          label="Kind"
          value={settings.kind}
          options={kindOptions}
          onChange={(kind) => {
            // Switching kind: also pick the first compatible theme so
            // the user doesn't end up with a stale theme name that maps
            // to nothing (e.g. paper-default while kind=outline).
            const fallbackTheme =
              themeCatalog.find((t) => t.kind === kind)?.value ?? 'outline-dark';
            onChange({ kind, theme: fallbackTheme });
          }}
        />
        <SelectField
          label="Theme"
          value={settings.theme}
          options={themeOptions}
          onChange={(theme) => onChange({ theme })}
        />
        <ToggleField
          label="Country resolution"
          value={settings.countryResolution}
          options={resolutionOptions}
          onChange={(countryResolution) => onChange({ countryResolution })}
        />
      </PanelSection>

      <PanelSection id="stage-surface" title="Surface" icon={<Layers className="size-3.5" />}>
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
      </PanelSection>

      <PanelSection id="stage-camera" title="Camera" icon={<Compass className="size-3.5" />}>
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
      </PanelSection>

      <PanelSection id="stage-interaction" title="Interaction" icon={<MousePointer className="size-3.5" />}>
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
      </PanelSection>
    </>
  );
}
