import type {
  ChartType,
  GlobeConfig,
  GlobeKind,
  HeatmapAnimationOrder,
  HeatmapAnimationStyle,
  HeatmapDataEntry,
  HeatmapEasingName,
  HexBinAggregateMode,
  ResolutionLevel,
  ScalePaletteName,
  ThemePresetName,
  ZoomMode,
} from '@your-globe/core';

export type ActiveLayer = 'heatmap' | 'hexbin' | 'charts' | 'none';

export type GlobeRuntimeConfig = Omit<GlobeConfig, 'container'>;

export type PixelRatioSetting = 'auto' | '1' | '1.5' | '2';

export interface GlobeSettings {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
  readonly countryResolution: ResolutionLevel;
  readonly hoverEnabled: boolean;
  readonly hoverOccludeBackSide: boolean;
  readonly countryLabels: boolean;
  readonly labelMinScreenSize: number;
  readonly autoRotate: boolean;
  readonly autoRotateSpeed: number;
  readonly axisTilt: number;
  readonly atmosphere: boolean;
  readonly starfield: boolean;
  readonly focusPulse: boolean;
  readonly zoomMode: ZoomMode;
  readonly zoomStrength: number;
  readonly smoothZoom: boolean;
  readonly pixelRatio: PixelRatioSetting;
  readonly adaptiveQuality: boolean;
}

export type HeatmapDatasetId =
  | 'countries'
  | 'megacities'
  | 'worldcities'
  | 'earthquakes'
  | 'random'
  | 'quakes-week'
  | 'quakes-month'
  | 'quakes-year';

export type HeatmapPaletteName = ScalePaletteName | 'aurora';
export type HeatmapKernelName = 'gaussian' | 'epanechnikov' | 'quartic' | 'dome' | 'uniform';
export type HeatmapNormalizeName = 'peak' | 'absolute' | 'log';
export type HeatmapCurveName = 'linear' | 'smoothstep' | 'cubic' | 'sqrt';
export type HeatmapBlendMode = 'normal' | 'additive';
export type HeatmapSurfaceMode = 'country' | 'topographic' | 'smooth' | 'peaks';
export type HeatmapDetailMode = 'topo' | 'grid' | 'clean';
export type HeatmapValuePreScale = 'linear' | 'log' | 'sqrt';

export interface HeatmapSettings {
  readonly dataset: HeatmapDatasetId;
  readonly kernel: HeatmapKernelName;
  readonly normalize: HeatmapNormalizeName;
  readonly curve: HeatmapCurveName;
  readonly displacementCurve: HeatmapCurveName;
  readonly palette: HeatmapPaletteName;
  readonly blendMode: HeatmapBlendMode;
  readonly surfaceMode: HeatmapSurfaceMode;
  readonly detailMode: HeatmapDetailMode;
  readonly radius: number;
  readonly maxHeight: number;
  readonly intensity: number;
  readonly threshold: number;
  readonly blurPasses: number;
  readonly shading: number;
  readonly meshLevel: number;
  readonly textureLevel: number;
  readonly domeCenterArea: number;
  readonly domeShoulderHeight: number;
  readonly domeEdgeSteepness: number;
  readonly domePreScale: HeatmapValuePreScale;
  readonly animationEnabled: boolean;
  readonly animationStyle: HeatmapAnimationStyle;
  readonly animationOrder: HeatmapAnimationOrder;
  readonly animationEasing: HeatmapEasingName;
  readonly animationDurationMs: number;
  readonly animationStaggerMs: number;
  readonly animationDelayMs: number;
}

export type HexbinDatasetId = 'random-2k' | 'random-10k' | 'cluster' | 'bands';

export interface HexbinSettings {
  readonly dataset: HexbinDatasetId;
  readonly resolution: number;
  readonly aggregate: HexBinAggregateMode;
  readonly heightMax: number;
  readonly cellInset: number;
  readonly opacity: number;
  readonly showEmpty: boolean;
  readonly borders: boolean;
  readonly borderOpacity: number;
  readonly highlight: boolean;
  readonly animationEnabled: boolean;
  readonly animationStyle: HeatmapAnimationStyle;
  readonly animationOrder: HeatmapAnimationOrder;
  readonly animationEasing: HeatmapEasingName;
  readonly animationDurationMs: number;
  readonly animationStaggerMs: number;
}

export type ChartDatasetId = 'energy' | 'population' | 'quarterly' | 'kpi' | 'world-gdp' | 'world-co2';
export type ChartsLabelMode = 'off' | 'hover' | 'always' | 'occlusion';

export interface ChartsSettings {
  readonly dataset: ChartDatasetId;
  readonly chartType: ChartType;
  readonly size: number;
  readonly height: number;
  readonly innerRadius: number;
  readonly padAngle: number;
  readonly labels: ChartsLabelMode;
  readonly borders: boolean;
  readonly highlight: boolean;
  readonly animationEnabled: boolean;
  readonly animationOrder: HeatmapAnimationOrder;
  readonly animationEasing: HeatmapEasingName;
  readonly animationDurationMs: number;
  readonly animationStaggerMs: number;
  readonly segmentStaggerMs: number;
}

export interface ConfiguratorState {
  readonly activeLayer: ActiveLayer;
  readonly globe: GlobeSettings;
  readonly heatmap: HeatmapSettings;
  readonly hexbin: HexbinSettings;
  readonly charts: ChartsSettings;
  /** Id of the last preset applied via `applyPreset`, or null. */
  readonly lastPresetId: string | null;
  /** True when any setting changed since `lastPresetId` was applied. */
  readonly dirtySincePreset: boolean;
}

export interface HeatmapDatasetState {
  readonly id: HeatmapDatasetId;
  readonly data: ReadonlyArray<HeatmapDataEntry>;
  readonly loading: boolean;
  readonly error: string | null;
}

export interface RuntimeStatus {
  readonly ready: boolean;
  readonly message: string;
  readonly hover: string;
  readonly layerSummary: string;
  readonly dataSummary: string;
}
