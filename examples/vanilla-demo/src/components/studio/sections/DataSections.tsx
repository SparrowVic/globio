import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartColumn,
  faDatabase,
  faFire,
  faHand,
  faLayerGroup,
  faPalette,
  faSparkles,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type {
  HeatmapAnimationOrder,
  HeatmapAnimationStyle,
  HeatmapEasingName,
} from '@your-globe/core';

import { Badge } from '@/components/ui/badge';
import { DependsOn } from '@/components/shared/components/DependsOn';
import { PanelSection } from '@/components/studio/panels/PanelSection';
import {
  SelectField,
  SliderField,
  SwitchField,
  ToggleField,
} from '@/components/shared/controls';
import {
  chartDatasetOptions,
  heatmapDatasetOptions,
  hexbinDatasetOptions,
  liveHeatmapDatasets,
} from '@/configurator/datasets';
import { heatmapSurfacePresets } from '@/configurator/defaults';
import type {
  ActiveLayer,
  ChartDatasetId,
  ChartsSettings,
  ConfiguratorState,
  HeatmapSettings,
  HexbinSettings,
} from '@/configurator/types';

// ---------------------------------------------------------------------------
// Option catalogues
// ---------------------------------------------------------------------------

const layerOptions = [
  { value: 'hexbin', label: 'Hexbin' },
  { value: 'heatmap', label: 'Heatmap' },
  { value: 'charts', label: 'Charts' },
  { value: 'none', label: 'None' },
] as const;

const aggregateOptions = [
  { value: 'count', label: 'Cnt' },
  { value: 'sum', label: 'Sum' },
  { value: 'mean', label: 'Mean' },
  { value: 'median', label: 'Median' },
  { value: 'p90', label: 'P90' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
] as const;

const animationStyleOptions = [
  { value: 'rise', label: 'Rise' },
  { value: 'pop', label: 'Pop' },
  { value: 'fade', label: 'Fade' },
  { value: 'pulse', label: 'Pulse' },
] as const;

const animationOrderOptions = [
  { value: 'sequential', label: 'Seq' },
  { value: 'radial', label: 'Radial' },
  { value: 'value', label: 'High' },
  { value: 'reverse-value', label: 'Low' },
  { value: 'random', label: 'Random' },
] as const;

const easingOptions: ReadonlyArray<{ readonly value: HeatmapEasingName; readonly label: string }> = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-out-cubic', label: 'Out cubic' },
  { value: 'ease-out-back', label: 'Out back' },
  { value: 'ease-in-out-cubic', label: 'In-out cubic' },
  { value: 'ease-out-elastic', label: 'Elastic' },
  { value: 'ease-out-bounce', label: 'Bounce' },
] as const;

const heatmapSurfaceOptions = [
  { value: 'country', label: 'Country' },
  { value: 'topographic', label: 'Topo' },
  { value: 'smooth', label: 'Smooth' },
  { value: 'peaks', label: 'Peaks' },
] as const;

const heatmapKernelOptions = [
  { value: 'gaussian', label: 'Gaussian' },
  { value: 'dome', label: 'Dome' },
  { value: 'quartic', label: 'Quartic' },
  { value: 'epanechnikov', label: 'Epan.' },
  { value: 'uniform', label: 'Uniform' },
] as const;

const heatmapNormalizeOptions = [
  { value: 'peak', label: 'Peak' },
  { value: 'absolute', label: 'Abs' },
  { value: 'log', label: 'Log' },
] as const;

const heatmapCurveOptions = [
  { value: 'smoothstep', label: 'Smooth' },
  { value: 'sqrt', label: 'Sqrt' },
  { value: 'cubic', label: 'Cubic' },
  { value: 'linear', label: 'Linear' },
] as const;

const heatmapPaletteOptions = [
  { value: 'aurora', label: 'Aurora' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'viridis', label: 'Viridis' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'magma', label: 'Magma' },
  { value: 'RdBu', label: 'RdBu' },
] as const;

const heatmapDetailOptions = [
  { value: 'topo', label: 'Topo' },
  { value: 'grid', label: 'Grid' },
  { value: 'clean', label: 'Clean' },
] as const;

const heatmapBlendOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'additive', label: 'Additive' },
] as const;

const heatmapPreScaleOptions = [
  { value: 'log', label: 'Log' },
  { value: 'sqrt', label: 'Sqrt' },
  { value: 'linear', label: 'Linear' },
] as const;

const chartTypeOptions = [
  { value: 'bars-grouped', label: 'Grouped bars' },
  { value: 'bars-stacked', label: 'Stacked bars' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' },
  { value: 'radial', label: 'Radial' },
  { value: 'gauge', label: 'Gauge' },
  { value: 'sunburst', label: 'Sunburst' },
  { value: 'extruded', label: 'Extruded' },
] as const;

const labelModeOptions = [
  { value: 'off', label: 'Off' },
  { value: 'hover', label: 'Hover' },
  { value: 'always', label: 'Always' },
  { value: 'occlusion', label: 'Side' },
] as const;

// Charts that have multiple per-entry segments (so segmentStagger applies).
// Extruded paints country polygons → no segments. Gauge has a single arc.
const segmentedChartTypes = new Set<string>([
  'bars-grouped',
  'bars-stacked',
  'pie',
  'donut',
  'radial',
  'sunburst',
]);

const ringedChartTypes = new Set<string>(['donut', 'gauge', 'sunburst']);
const arcSegmentChartTypes = new Set<string>(['pie', 'donut', 'gauge', 'sunburst']);
const wholeGlobeDatasets = new Set<ChartDatasetId>(['world-gdp', 'world-co2']);

// ---------------------------------------------------------------------------
// Top-level wiring
// ---------------------------------------------------------------------------

export interface DataSectionsProps {
  readonly state: ConfiguratorState;
  readonly heatmapLoading: boolean;
  readonly heatmapError: string | null;
  readonly onLayerChange: (layer: ActiveLayer) => void;
  readonly onHeatmapChange: (patch: Partial<HeatmapSettings>) => void;
  readonly onHexbinChange: (patch: Partial<HexbinSettings>) => void;
  readonly onChartsChange: (patch: Partial<ChartsSettings>) => void;
}

/**
 * All Data-panel sections in one render. The active-layer toggle is
 * always present; the other sections render conditionally on the
 * current `state.activeLayer` so the user only sees relevant controls
 * for what's actually mounted.
 */
export function DataSections({
  state,
  heatmapLoading,
  heatmapError,
  onLayerChange,
  onHeatmapChange,
  onHexbinChange,
  onChartsChange,
}: DataSectionsProps) {
  return (
    <>
      <PanelSection
        id="data-active-layer"
        title="Active Layer"
        icon={<FontAwesomeIcon icon={faLayerGroup} className="size-3" />}
        defaultOpen
      >
        <ToggleField
          label="Layer"
          value={state.activeLayer}
          options={layerOptions}
          onChange={onLayerChange}
        />
        {state.activeLayer === 'none' ? (
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
            No data layer mounted. Pick one above to enable the dataset / visual / animation sections.
          </div>
        ) : null}
      </PanelSection>

      {state.activeLayer === 'hexbin' ? (
        <HexbinSections settings={state.hexbin} onChange={onHexbinChange} />
      ) : null}
      {state.activeLayer === 'heatmap' ? (
        <HeatmapSections
          settings={state.heatmap}
          loading={heatmapLoading}
          error={heatmapError}
          onChange={onHeatmapChange}
        />
      ) : null}
      {state.activeLayer === 'charts' ? (
        <ChartsSections settings={state.charts} onChange={onChartsChange} />
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Hexbin-specific sections
// ---------------------------------------------------------------------------

function HexbinSections({
  settings,
  onChange,
}: {
  readonly settings: HexbinSettings;
  readonly onChange: (patch: Partial<HexbinSettings>) => void;
}) {
  return (
    <>
      <PanelSection id="hexbin-dataset" title="Dataset" icon={<FontAwesomeIcon icon={faDatabase} className="size-3" />} defaultOpen>
        <SelectField
          label="Dataset"
          value={settings.dataset}
          options={hexbinDatasetOptions}
          onChange={(dataset) => onChange({ dataset })}
        />
        <SelectField
          label="Aggregate"
          value={settings.aggregate}
          options={aggregateOptions}
          onChange={(aggregate) => onChange({ aggregate })}
        />
      </PanelSection>

      <PanelSection
        id="hexbin-visual"
        title="Visual"
        icon={<FontAwesomeIcon icon={faPalette} className="size-3" />}
        meta={`R${settings.resolution} · ${20 * 4 ** settings.resolution} cells`}
        defaultOpen
      >
        <SliderField
          label="Resolution"
          value={settings.resolution}
          min={0}
          max={5}
          step={1}
          format={(value) => `R${value.toFixed(0)} (${20 * 4 ** Math.round(value)} cells)`}
          onChange={(resolution) => onChange({ resolution: Math.round(resolution) })}
        />
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Height"
            value={settings.heightMax}
            min={0}
            max={0.22}
            step={0.005}
            onChange={(heightMax) => onChange({ heightMax })}
          />
          <SliderField
            label="Cell inset"
            value={settings.cellInset}
            min={0.55}
            max={1}
            step={0.01}
            onChange={(cellInset) => onChange({ cellInset })}
          />
        </div>
        <SliderField
          label="Opacity"
          value={settings.opacity}
          min={0.2}
          max={1}
          step={0.01}
          onChange={(opacity) => onChange({ opacity })}
        />
        <SwitchField
          label="Show empty cells"
          checked={settings.showEmpty}
          onChange={(showEmpty) => onChange({ showEmpty })}
        />
      </PanelSection>

      <AnimationSection
        idPrefix="hexbin"
        enabled={settings.animationEnabled}
        style={settings.animationStyle}
        order={settings.animationOrder}
        easing={settings.animationEasing}
        duration={settings.animationDurationMs}
        stagger={settings.animationStaggerMs}
        onChange={(patch) =>
          onChange({
            animationEnabled: patch.enabled ?? settings.animationEnabled,
            animationStyle: patch.style ?? settings.animationStyle,
            animationOrder: patch.order ?? settings.animationOrder,
            animationEasing: patch.easing ?? settings.animationEasing,
            animationDurationMs: patch.duration ?? settings.animationDurationMs,
            animationStaggerMs: patch.stagger ?? settings.animationStaggerMs,
          })
        }
      />

      <PanelSection
        id="hexbin-interaction"
        title="Interaction"
        icon={<FontAwesomeIcon icon={faHand} className="size-3" />}
      >
        <div className="grid grid-cols-2 gap-2">
          <SwitchField
            label="Hover highlight"
            checked={settings.highlight}
            onChange={(highlight) => onChange({ highlight })}
          />
          <SwitchField
            label="Cell borders"
            checked={settings.borders}
            onChange={(borders) => onChange({ borders })}
          />
        </div>
        <SliderField
          label="Border opacity"
          value={settings.borderOpacity}
          min={0.05}
          max={0.8}
          step={0.01}
          onChange={(borderOpacity) => onChange({ borderOpacity })}
          disabled={!settings.borders}
          disabledReason="Enable Cell borders first"
        />
      </PanelSection>
    </>
  );
}

// ---------------------------------------------------------------------------
// Heatmap-specific sections
// ---------------------------------------------------------------------------

function HeatmapSections({
  settings,
  loading,
  error,
  onChange,
}: {
  readonly settings: HeatmapSettings;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onChange: (patch: Partial<HeatmapSettings>) => void;
}) {
  const isCountrySurface = settings.dataset === 'countries' && settings.surfaceMode === 'country';
  const has3D = settings.maxHeight > 0;

  return (
    <>
      <PanelSection
        id="heatmap-dataset"
        title="Dataset"
        icon={<FontAwesomeIcon icon={faFire} className="size-3" />}
        meta={loading ? <Badge className="bg-amber-300/15 text-amber-100 text-[10px]">loading</Badge> : null}
        defaultOpen
      >
        {error ? (
          <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </div>
        ) : null}
        <SelectField
          label="Dataset"
          value={settings.dataset}
          options={heatmapDatasetOptions}
          onChange={(dataset) => {
            const live = liveHeatmapDatasets.has(dataset);
            onChange({
              dataset,
              ...(live
                ? {
                    surfaceMode: 'peaks',
                    kernel: 'quartic',
                    normalize: 'log',
                    blendMode: 'additive',
                  }
                : {}),
            });
          }}
        />
        <ToggleField
          label="Surface mode"
          value={settings.surfaceMode}
          options={heatmapSurfaceOptions}
          onChange={(surfaceMode) =>
            onChange({ ...heatmapSurfacePresets[surfaceMode], surfaceMode })
          }
        />
      </PanelSection>

      <PanelSection
        id="heatmap-visual"
        title="Visual"
        icon={<FontAwesomeIcon icon={faPalette} className="size-3" />}
        meta={`${settings.kernel} · ${settings.normalize}`}
        defaultOpen
      >
        <SelectField
          label="Palette"
          value={settings.palette}
          options={heatmapPaletteOptions}
          onChange={(palette) => onChange({ palette })}
        />
        <ToggleField
          label="Kernel"
          value={settings.kernel}
          options={heatmapKernelOptions}
          onChange={(kernel) => onChange({ kernel })}
        />
        <ToggleField
          label="Normalize"
          value={settings.normalize}
          options={heatmapNormalizeOptions}
          onChange={(normalize) => onChange({ normalize })}
        />
        <ToggleField
          label="Curve"
          value={settings.curve}
          options={heatmapCurveOptions}
          onChange={(curve) => onChange({ curve })}
        />
        <ToggleField
          label="Detail overlay"
          value={settings.detailMode}
          options={heatmapDetailOptions}
          onChange={(detailMode) => onChange({ detailMode })}
        />
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Radius"
            value={settings.radius}
            min={0.01}
            max={0.24}
            step={0.005}
            onChange={(radius) => onChange({ radius })}
          />
          <SliderField
            label="Max height"
            value={settings.maxHeight}
            min={0}
            max={0.22}
            step={0.005}
            onChange={(maxHeight) => onChange({ maxHeight })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Intensity"
            value={settings.intensity}
            min={0.2}
            max={2.4}
            step={0.05}
            onChange={(intensity) => onChange({ intensity })}
            disabled={settings.kernel === 'uniform'}
            disabledReason="Uniform kernel ignores intensity scaling"
          />
          <SliderField
            label="Threshold"
            value={settings.threshold}
            min={0}
            max={0.45}
            step={0.01}
            onChange={(threshold) => onChange({ threshold })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Blur"
            value={settings.blurPasses}
            min={0}
            max={8}
            step={1}
            format={(v) => v.toFixed(0)}
            onChange={(blurPasses) => onChange({ blurPasses: Math.round(blurPasses) })}
          />
          <SliderField
            label="Shading"
            value={settings.shading}
            min={0}
            max={1}
            step={0.02}
            onChange={(shading) => onChange({ shading })}
            disabled={!has3D}
            disabledReason="Lambert shading needs Max height > 0"
          />
        </div>
        <ToggleField
          label="Displacement curve"
          value={settings.displacementCurve}
          options={heatmapCurveOptions}
          onChange={(displacementCurve) => onChange({ displacementCurve })}
          disabled={!has3D}
          disabledReason="3D curve needs Max height > 0"
        />
        <ToggleField
          label="Blend"
          value={settings.blendMode}
          options={heatmapBlendOptions}
          onChange={(blendMode) => onChange({ blendMode })}
        />
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Texture"
            value={settings.textureLevel}
            min={0}
            max={2}
            step={1}
            format={(v) => ['1k', '2k', '4k'][Math.round(v)] ?? '2k'}
            onChange={(textureLevel) => onChange({ textureLevel: Math.round(textureLevel) })}
          />
          <SliderField
            label="Mesh"
            value={settings.meshLevel}
            min={0}
            max={2}
            step={1}
            format={(v) => ['256', '1024', '2048'][Math.round(v)] ?? '1024'}
            onChange={(meshLevel) => onChange({ meshLevel: Math.round(meshLevel) })}
          />
        </div>
      </PanelSection>

      <PanelSection
        id="heatmap-dome"
        title="Country domes"
        icon={<FontAwesomeIcon icon={faSparkles} className="size-3" />}
        hidden={!isCountrySurface}
      >
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Dome center"
            value={settings.domeCenterArea}
            min={0.25}
            max={0.95}
            step={0.01}
            onChange={(domeCenterArea) => onChange({ domeCenterArea })}
          />
          <SliderField
            label="Shoulder"
            value={settings.domeShoulderHeight}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(domeShoulderHeight) => onChange({ domeShoulderHeight })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Edge steep"
            value={settings.domeEdgeSteepness}
            min={1}
            max={5}
            step={0.1}
            onChange={(domeEdgeSteepness) => onChange({ domeEdgeSteepness })}
          />
          <ToggleField
            label="Pre-scale"
            value={settings.domePreScale}
            options={heatmapPreScaleOptions}
            onChange={(domePreScale) => onChange({ domePreScale })}
          />
        </div>
      </PanelSection>

      <AnimationSection
        idPrefix="heatmap"
        enabled={settings.animationEnabled}
        style={settings.animationStyle}
        order={settings.animationOrder}
        easing={settings.animationEasing}
        duration={settings.animationDurationMs}
        stagger={settings.animationStaggerMs}
        onChange={(patch) =>
          onChange({
            animationEnabled: patch.enabled ?? settings.animationEnabled,
            animationStyle: patch.style ?? settings.animationStyle,
            animationOrder: patch.order ?? settings.animationOrder,
            animationEasing: patch.easing ?? settings.animationEasing,
            animationDurationMs: patch.duration ?? settings.animationDurationMs,
            animationStaggerMs: patch.stagger ?? settings.animationStaggerMs,
          })
        }
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Charts-specific sections
// ---------------------------------------------------------------------------

function ChartsSections({
  settings,
  onChange,
}: {
  readonly settings: ChartsSettings;
  readonly onChange: (patch: Partial<ChartsSettings>) => void;
}) {
  const setChartType = (chartType: ChartsSettings['chartType']) => {
    let patch: Partial<ChartsSettings> = { chartType };
    if (chartType === 'gauge') patch = { ...patch, dataset: 'kpi' };
    if (chartType === 'extruded' && !wholeGlobeDatasets.has(settings.dataset)) {
      patch = { ...patch, dataset: 'world-gdp', labels: 'off' };
    }
    if (chartType !== 'gauge' && chartType !== 'extruded' && !isAggregateDataset(settings.dataset)) {
      patch = { ...patch, dataset: 'energy', labels: 'hover' };
    }
    onChange(patch);
  };

  const setDataset = (dataset: ChartDatasetId) => {
    let patch: Partial<ChartsSettings> = { dataset };
    if (dataset === 'kpi') patch = { ...patch, chartType: 'gauge' };
    if (wholeGlobeDatasets.has(dataset)) {
      patch = { ...patch, chartType: 'extruded', labels: 'off' };
    }
    if (
      !isAggregateDataset(dataset) &&
      (settings.chartType === 'gauge' || settings.chartType === 'extruded')
    ) {
      patch = { ...patch, chartType: 'bars-grouped', labels: 'hover' };
    }
    onChange(patch);
  };

  const isExtruded = settings.chartType === 'extruded';
  const hasSegments = segmentedChartTypes.has(settings.chartType);
  const hasInner = ringedChartTypes.has(settings.chartType);
  const hasArc = arcSegmentChartTypes.has(settings.chartType);

  return (
    <>
      <PanelSection
        id="charts-dataset"
        title="Dataset & Type"
        icon={<FontAwesomeIcon icon={faChartColumn} className="size-3" />}
        defaultOpen
      >
        <SelectField
          label="Chart type"
          value={settings.chartType}
          options={chartTypeOptions}
          onChange={setChartType}
        />
        <SelectField
          label="Dataset"
          value={settings.dataset}
          options={chartDatasetOptions}
          onChange={setDataset}
        />
      </PanelSection>

      <PanelSection
        id="charts-visual"
        title="Visual"
        icon={<FontAwesomeIcon icon={faPalette} className="size-3" />}
        meta={`${settings.chartType} · ${settings.size.toFixed(2)}`}
        defaultOpen
      >
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Size"
            value={settings.size}
            min={0.025}
            max={0.13}
            step={0.0025}
            onChange={(size) => onChange({ size })}
            disabled={isExtruded}
            disabledReason="Extruded uses country polygons; size knob has no effect"
          />
          <SliderField
            label="Height"
            value={settings.height}
            min={0.02}
            max={0.24}
            step={0.005}
            onChange={(height) => onChange({ height })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Inner radius"
            value={settings.innerRadius}
            min={0.05}
            max={0.8}
            step={0.01}
            onChange={(innerRadius) => onChange({ innerRadius })}
            disabled={!hasInner}
            disabledReason="Only donut / gauge / sunburst use an inner radius"
          />
          <SliderField
            label="Pad angle"
            value={settings.padAngle}
            min={0}
            max={0.08}
            step={0.002}
            onChange={(padAngle) => onChange({ padAngle })}
            disabled={!hasArc}
            disabledReason="Pad angle separates arc segments — only pie / donut / sunburst / gauge"
          />
        </div>
      </PanelSection>

      <AnimationSection
        idPrefix="charts"
        enabled={settings.animationEnabled}
        style="rise"
        order={settings.animationOrder}
        easing={settings.animationEasing}
        duration={settings.animationDurationMs}
        stagger={settings.animationStaggerMs}
        hideStyle
        extras={
          <SliderField
            label="Segment stagger"
            value={settings.segmentStaggerMs}
            min={0}
            max={180}
            step={5}
            format={(value) => `${value.toFixed(0)} ms`}
            onChange={(segmentStaggerMs) => onChange({ segmentStaggerMs })}
            disabled={!hasSegments}
            disabledReason="Extruded has no per-series segments to stagger"
          />
        }
        onChange={(patch) =>
          onChange({
            animationEnabled: patch.enabled ?? settings.animationEnabled,
            animationOrder: patch.order ?? settings.animationOrder,
            animationEasing: patch.easing ?? settings.animationEasing,
            animationDurationMs: patch.duration ?? settings.animationDurationMs,
            animationStaggerMs: patch.stagger ?? settings.animationStaggerMs,
          })
        }
      />

      <PanelSection
        id="charts-interaction"
        title="Interaction"
        icon={<FontAwesomeIcon icon={faHand} className="size-3" />}
      >
        <ToggleField
          label="Labels"
          value={settings.labels}
          options={labelModeOptions}
          onChange={(labels) => onChange({ labels })}
        />
        <div className="grid grid-cols-2 gap-2">
          <SwitchField
            label="Hover highlight"
            checked={settings.highlight}
            onChange={(highlight) => onChange({ highlight })}
          />
          <SwitchField
            label="Borders"
            checked={settings.borders}
            onChange={(borders) => onChange({ borders })}
          />
        </div>
      </PanelSection>
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared Animation section
// ---------------------------------------------------------------------------

interface AnimationPatch {
  readonly enabled?: boolean;
  readonly style?: HeatmapAnimationStyle;
  readonly order?: HeatmapAnimationOrder;
  readonly easing?: HeatmapEasingName;
  readonly duration?: number;
  readonly stagger?: number;
}

function AnimationSection({
  idPrefix,
  enabled,
  style,
  order,
  easing,
  duration,
  stagger,
  hideStyle = false,
  extras,
  onChange,
}: {
  readonly idPrefix: string;
  readonly enabled: boolean;
  readonly style: HeatmapAnimationStyle;
  readonly order: HeatmapAnimationOrder;
  readonly easing: HeatmapEasingName;
  readonly duration: number;
  readonly stagger: number;
  readonly hideStyle?: boolean;
  readonly extras?: React.ReactNode;
  readonly onChange: (patch: AnimationPatch) => void;
}) {
  // Compact summary so the section header tells you what's going on
  // before you click to expand. `off` short-circuits the rest.
  const meta = enabled
    ? [hideStyle ? null : style, order, `${duration}ms`].filter(Boolean).join(' · ')
    : 'off';
  return (
    <PanelSection
      id={`${idPrefix}-animation`}
      title="Animation"
      icon={<FontAwesomeIcon icon={faSparkles} className="size-3" />}
      meta={meta}
    >
      <SwitchField
        label="Animate on mount"
        checked={enabled}
        onChange={(next) => onChange({ enabled: next })}
      />
      <DependsOn when={enabled} because="Toggle Animate on mount on" variant="dim">
        {!hideStyle ? (
          <ToggleField
            label="Style"
            value={style}
            options={animationStyleOptions}
            onChange={(next) => onChange({ style: next })}
          />
        ) : null}
        <ToggleField
          label="Order"
          value={order}
          options={animationOrderOptions}
          onChange={(next) => onChange({ order: next })}
        />
        <SelectField
          label="Easing"
          value={easing}
          options={easingOptions}
          onChange={(next) => onChange({ easing: next })}
        />
        <div className="grid grid-cols-2 gap-3">
          <SliderField
            label="Duration"
            value={duration}
            min={200}
            max={3000}
            step={50}
            format={(value) => `${value.toFixed(0)} ms`}
            onChange={(next) => onChange({ duration: next })}
          />
          <SliderField
            label="Stagger"
            value={stagger}
            min={0}
            max={120}
            step={1}
            format={(value) => `${value.toFixed(0)} ms`}
            onChange={(next) => onChange({ stagger: next })}
          />
        </div>
        {extras}
      </DependsOn>
    </PanelSection>
  );
}

// ---------------------------------------------------------------------------
// Helpers (module-private)
// ---------------------------------------------------------------------------

const isAggregateDataset = (dataset: ChartDatasetId): boolean => {
  return dataset === 'kpi' || dataset === 'world-gdp' || dataset === 'world-co2';
};

/**
 * Hand a friendly badge label for the Data panel's title (e.g. "hexbin · count").
 * Keeps the panel header text-only while still surfacing what's running.
 */
export const dataBadgeForState = (state: ConfiguratorState): string => {
  switch (state.activeLayer) {
    case 'heatmap':
      return `heatmap · ${state.heatmap.surfaceMode}`;
    case 'hexbin':
      return `hexbin · ${state.hexbin.aggregate}`;
    case 'charts':
      return `charts · ${state.charts.chartType}`;
    case 'none':
    default:
      return 'none';
  }
};

