import type {
  ChartType,
  GlobeConfig,
  GlobeKind,
  HeatmapAnimationOrder,
  HeatmapAnimationStyle,
  HeatmapDataEntry,
  HeatmapEasingName,
  HexBinAggregateMode,
  LatLng,
  ResolutionLevel,
  ScalePaletteName,
  ThemePresetName,
  ZoomMode,
} from '@your-globe/core';

export type FocusPulseOrigin = 'centroid' | 'click';

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
  readonly labelSizeFadeRange: number;
  readonly labelTransitionMs: number;
  readonly labelHaloEnabled: boolean;
  readonly labelHaloRadius: number;
  readonly labelHaloColor: string;
  readonly labelHaloSteps: number;
  /** Empty string = use theme default; otherwise hex override. */
  readonly labelColor: string;
  readonly labelFontSize: number;
  readonly labelFontWeight: string;
  readonly autoRotate: boolean;
  readonly autoRotateSpeed: number;
  readonly axisTilt: number;
  readonly atmosphere: boolean;
  /** Empty string = use theme default; otherwise hex override. */
  readonly atmosphereColor: string;
  /** 0 = use theme default. */
  readonly atmosphereIntensity: number;
  /** Mesh radius scale (≤1 = use default 1.15). */
  readonly atmosphereRadiusScale: number;
  /** Fresnel exponent (≤0 = use default 2.0). */
  readonly atmospherePower: number;
  /** Fresnel threshold (0..1, 0.6 default). */
  readonly atmosphereThreshold: number;
  readonly atmosphereSide: 'back' | 'front' | 'double';
  readonly atmosphereBlending: 'additive' | 'normal';
  readonly atmospherePulse: boolean;
  readonly atmospherePulseSpeed: number;
  readonly atmospherePulseAmplitude: number;
  readonly starfield: boolean;
  readonly starfieldDensity: number;
  readonly starfieldSize: number;
  readonly starfieldSizeVariety: number;
  readonly starfieldMultiColor: boolean;
  readonly starfieldPalette: ReadonlyArray<string>;
  readonly starfieldTwinkle: boolean;
  readonly starfieldTwinkleIntensity: number;
  readonly starfieldTwinkleSpeed: number;
  readonly focusPulse: boolean;
  readonly focusPulseOrigin: FocusPulseOrigin;
  readonly focusPulseOnSurfaceClick: boolean;
  /** Outline-only band knobs — read by builders.ts iff kind === 'outline'. */
  readonly outlinePulseDurationMs: number;
  readonly outlinePulseRadiusBase: number;
  /** Band thickness in radians — fine-tunes the visual weight of the ring. */
  readonly outlinePulseAngularBand: number;
  /** Initial scale at t=0 (smaller = ring spawns tighter on the centroid). */
  readonly outlinePulseScaleMin: number;
  readonly outlinePulseScaleMax: number;
  readonly outlinePulseOpacity: number;
  /** Polygon resolution around the ring. Higher = smoother circle. */
  readonly outlinePulseSegments: number;
  /** Empty string = use theme active-border color. */
  readonly outlinePulseColor: string;
  /** Lift above globe surface as multiplier of GLOBE_RADIUS. */
  readonly outlinePulseRadiusFactor: number;
  /** Outline-only hover decoration. */
  readonly outlineHoverLift: number;
  readonly outlineHoverGlowLift: number;
  readonly outlineHoverGlowEnabled: boolean;
  /** Outline-only — when hovering a country, fade other-continent borders. */
  readonly outlineContinentDim: boolean;
  readonly outlineContinentDimAmount: number;
  /** Outline-only — Tron-style targeting reticle that tracks the cursor. */
  readonly outlineHoverCrosshair: boolean;
  readonly outlineHoverCrosshairColor: string;
  readonly outlineHoverCrosshairSize: number;
  readonly outlineHoverCrosshairOpacity: number;
  readonly outlineHoverCrosshairRingRadiusFactor: number;
  readonly outlineHoverCrosshairCardinalTicks: boolean;
  readonly outlineHoverCrosshairTooltip: boolean;
  readonly outlineHoverCrosshairTooltipDecimals: number;
  /** Dotted-only — every dotted knob lives behind one DependsOn switch. */
  readonly dottedColor: string;
  readonly dottedSizeScale: number;
  readonly dottedOpacity: number;
  readonly dottedRipple: boolean;
  readonly dottedRippleBoost: number;
  readonly dottedRippleSpeed: number;
  readonly dottedRippleWidth: number;
  readonly dottedRippleMaxConcurrent: number;
  readonly dottedRippleColor: string;
  readonly dottedFlash: boolean;
  readonly dottedFlashStrength: number;
  readonly dottedFlashDecay: number;
  readonly dottedFlashColor: string;
  readonly dottedDrift: boolean;
  readonly dottedDriftAmplitude: number;
  readonly dottedDriftSpeed: number;
  readonly dottedDriftFreq: number;
  readonly dottedDriftAxis: 'ns' | 'ew' | 'both';
  readonly dottedHoverDots: boolean;
  readonly dottedHoverScale: number;
  readonly dottedHoverBrightnessBoost: number;
  readonly dottedHoverDuration: number;
  readonly dottedCursorWake: boolean;
  readonly dottedCursorWakeAmplitude: number;
  readonly dottedCursorWakeFade: number;
  readonly dottedCursorWakeWidth: number;
  readonly dottedLatitudeBands: boolean;
  readonly dottedEquatorBoost: number;
  readonly dottedTropicsBoost: number;
  readonly dottedLatitudeBandWidth: number;
  readonly dottedPulseBreath: boolean;
  readonly dottedPulseBreathAmplitude: number;
  readonly dottedPulseBreathSpeed: number;
  readonly dottedConstellation: boolean;
  readonly dottedConstellationColor: string;
  readonly dottedConstellationOpacity: number;
  readonly dottedConstellationDistanceFactor: number;
  /** Hover-lift radial offset (fraction of GLOBE_RADIUS). */
  readonly dottedHoverLift: number;
  /** Pinned-country (active) pulse — independent from hover. */
  readonly dottedActiveCountry: boolean;
  readonly dottedActiveBoost: number;
  readonly dottedActiveScale: number;
  readonly dottedActivePulseSpeed: number;
  readonly dottedActiveLift: number;
  /** Dot-string border (boundary samples brighten on hover / pin). */
  readonly dottedBorderDots: boolean;
  readonly dottedBorderDotsColor: string;
  readonly dottedBorderDotsSize: number;
  readonly dottedBorderDotsOpacity: number;
  /**
   * Hologram-only knobs — every effect on the projection shell exposed to
   * the workshop. `''` color / `0` numeric = sentinel for "use theme
   * default" (matches the rest of the configurator's reset pattern).
   */
  readonly hologramScanlines: boolean;
  readonly hologramScanlineSpeed: number;
  readonly hologramScanlineDensity: number;
  readonly hologramScanlineOpacity: number;
  readonly hologramScanlineDirection: 'horizontal' | 'vertical' | 'diagonal';
  readonly hologramRimGlow: boolean;
  readonly hologramRimColor: string;
  readonly hologramRimIntensity: number;
  readonly hologramRimWidth: number;
  readonly hologramGlitch: boolean;
  readonly hologramGlitchIntervalMin: number;
  readonly hologramGlitchIntervalMax: number;
  readonly hologramGlitchAmplitude: number;
  readonly hologramGlitchChannelShift: number;
  readonly hologramOuterGlow: boolean;
  readonly hologramOuterGlowColor: string;
  readonly hologramOuterGlowSpread: number;
  readonly hologramOuterGlowIntensity: number;
  readonly hologramChromaticAberration: boolean;
  readonly hologramChromaticAberrationAmount: number;
  readonly hologramChromaticAberrationMode: 'rim' | 'global';
  readonly hologramNoise: boolean;
  readonly hologramNoiseIntensity: number;
  readonly hologramNoiseScale: number;
  readonly hologramNoiseSpeed: number;
  readonly hologramProjectorPulse: boolean;
  readonly hologramProjectorPulseSpeed: number;
  readonly hologramProjectorPulseAmplitude: number;
  readonly hologramProjectorPulseColor: string;
  readonly hologramDataScan: boolean;
  readonly hologramDataScanSpeed: number;
  readonly hologramDataScanWidth: number;
  readonly hologramDataScanOpacity: number;
  readonly hologramDataScanAxis: 'horizontal' | 'vertical' | 'radial';
  readonly hologramDataScanColor: string;
  readonly hologramPhaseShimmer: boolean;
  readonly hologramPhaseShimmerScale: number;
  readonly hologramPhaseShimmerIntensity: number;
  readonly hologramPhaseShimmerSpeed: number;
  readonly hologramCalibrationTicks: boolean;
  readonly hologramCalibrationTicksCount: number;
  readonly hologramCalibrationTicksLength: number;
  readonly hologramCalibrationTicksOpacity: number;
  // -----------------------------------------------------------------
  // Paper kind (vintage atlas) — only honoured when kind === 'paper'.
  // Empty-string color = use theme default. 0 / negative numerics where
  // the natural domain is positive = "use theme default" sentinel.
  // -----------------------------------------------------------------
  readonly paperSurfaceColor: string;
  readonly paperSurfaceNoise: number;
  readonly paperSurfaceVignette: number;
  readonly paperBorders: boolean;
  readonly paperBorderColor: string;
  readonly paperBorderOpacity: number;
  readonly paperBorderWidth: number;
  readonly paperBorderRoughness: number;
  readonly paperStipple: boolean;
  readonly paperStippleDensity: number;
  readonly paperStippleSize: number;
  readonly paperInkBleed: boolean;
  readonly paperInkBleedColor: string;
  readonly paperInkBleedOpacity: number;
  readonly paperInkBleedSpread: number;
  readonly paperFill: boolean;
  readonly paperFillColor: string;
  readonly paperFillOpacity: number;
  readonly paperFillMode: 'single' | 'pastel';
  readonly paperGrid: boolean;
  readonly paperGridColor: string;
  readonly paperGridOpacity: number;
  readonly paperGridStep: number;
  readonly paperGridMajorEvery: number;
  readonly paperGridMajorOpacity: number;
  readonly paperSepia: boolean;
  readonly paperSepiaColor: string;
  readonly paperSepiaOpacity: number;
  readonly paperVignette: boolean;
  readonly paperVignetteColor: string;
  readonly paperVignetteIntensity: number;
  readonly paperVignetteRadius: number;
  readonly paperCompass: boolean;
  readonly paperCompassLat: number;
  readonly paperCompassLng: number;
  readonly paperCompassColor: string;
  readonly paperCompassOpacity: number;
  readonly paperCompassSize: number;
  readonly paperAging: boolean;
  readonly paperAgingCount: number;
  readonly paperAgingColor: string;
  readonly paperAgingIntensity: number;
  readonly paperAgingSeed: number;
  readonly paperWatermark: boolean;
  readonly paperWatermarkText: string;
  readonly paperWatermarkColor: string;
  readonly paperWatermarkOpacity: number;
  readonly paperWatermarkSize: number;
  readonly paperWatermarkPosition: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  /* ───────── Wireframe-kind knobs ───────── */
  /** Empty string = use theme default; otherwise hex override. */
  readonly wireframeColor: string;
  /** ≤0 = use theme default. */
  readonly wireframeOpacity: number;
  /** Density override (>0). */
  readonly wireframeDensity: number;
  /** Token-driven opacity pulse amplitude (0..1). */
  readonly wireframePulse: number;
  readonly wireframePulseSpeed: number;
  readonly wireframeHierarchy: boolean;
  readonly wireframeHierarchyMajorStepDeg: number;
  readonly wireframeHierarchyMajorBoost: number;
  readonly wireframeHierarchyMinorBoost: number;
  readonly wireframeClickPulse: boolean;
  /** Empty string = use theme default; otherwise hex override. */
  readonly wireframeClickPulseColor: string;
  readonly wireframeClickPulseSpeed: number;
  readonly wireframeClickPulseWidth: number;
  readonly wireframeClickPulseBoost: number;
  readonly wireframeClickPulseMaxConcurrent: number;
  readonly wireframeEmphasis: boolean;
  readonly wireframeEmphasisStrongColor: string;
  readonly wireframeEmphasisWeakColor: string;
  readonly wireframeEmphasisStrongOpacity: number;
  readonly wireframeEmphasisWeakOpacityFactor: number;
  readonly wireframeEquatorBeam: boolean;
  readonly wireframeEquatorBeamColor: string;
  readonly wireframeEquatorBeamOpacity: number;
  readonly wireframeEquatorBeamPulse: boolean;
  readonly wireframeEquatorBeamPulseSpeed: number;
  readonly wireframeGlitch: boolean;
  readonly wireframeGlitchIntervalMin: number;
  readonly wireframeGlitchIntervalMax: number;
  readonly wireframeActiveRing: boolean;
  readonly wireframeActiveRingColor: string;
  readonly wireframeActiveRingOpacity: number;
  readonly wireframeActiveRingPadding: number;
  readonly wireframeActiveRingRotationSpeed: number;
  readonly wireframePoleStreams: boolean;
  readonly wireframePoleStreamsColor: string;
  readonly wireframePoleStreamsOpacity: number;
  readonly wireframePoleStreamsCount: number;
  readonly wireframePoleStreamsSpeed: number;
  readonly wireframePoleStreamsSize: number;
  readonly wireframeDataPackets: boolean;
  readonly wireframeDataPacketsColor: string;
  readonly wireframeDataPacketsCount: number;
  readonly wireframeDataPacketsSpeed: number;
  readonly wireframeDataPacketsTrail: number;
  readonly wireframeDataPacketsSize: number;
  readonly wireframeDataPacketsAxis: 'latitude' | 'longitude' | 'both';
  readonly wireframeCompass: boolean;
  readonly wireframeCompassColor: string;
  readonly wireframeCompassSize: number;
  readonly wireframeCompassOpacity: number;
  readonly wireframeCompassPoles: boolean;
  readonly wireframeGridPulse: boolean;
  readonly wireframeGridPulseColor: string;
  readonly wireframeGridPulseIntervalSec: number;
  readonly wireframeGridPulseSpeed: number;
  readonly wireframeGridPulseWidth: number;
  readonly wireframeGridPulseBoost: number;
  readonly wireframeGridPulseMode: 'fixed' | 'random';
  readonly wireframeGridPulseOriginLat: number;
  readonly wireframeGridPulseOriginLng: number;
  readonly wireframePolePulse: boolean;
  readonly wireframePolePulseColor: string;
  readonly wireframePolePulseIntervalSec: number;
  readonly wireframePolePulseSpeed: number;
  readonly wireframePolePulseBoost: number;
  readonly wireframePolePulseWhich: 'north' | 'south' | 'both';
  readonly clickToFocus: boolean;
  readonly focusPadding: number;
  readonly focusDurationMs: number;
  readonly focusElevation: number;
  readonly focusPauseAutoRotate: boolean;
  readonly zoomMode: ZoomMode;
  readonly zoomStrength: number;
  readonly smoothZoom: boolean;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly initialLat: number;
  readonly initialLng: number;
  readonly pixelRatio: PixelRatioSetting;
  readonly adaptiveQuality: boolean;
  readonly antialias: boolean;
  readonly maxFps: number;
}

/** A LatLng tuple — re-exported for convenience. */
export type { LatLng };

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
