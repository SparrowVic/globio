import type {
  ChartsHoverPayload,
  DataLayer,
  HeatmapDataEntry,
  HeatmapDataLayer,
  HexBinHoverPayload,
  ScaleConfig,
} from '@your-globe/core';

import {
  HOTSPOT_PALETTE,
  cellsForHexbinResolution,
  getChartDataset,
  getHexbinDataset,
  resolveHeatmapPalette,
} from './datasets';
import type { ConfiguratorState, GlobeRuntimeConfig, HeatmapSettings } from './types';

const textureResolutions: ReadonlyArray<{ readonly width: number; readonly height: number }> = [
  { width: 1024, height: 512 },
  { width: 2048, height: 1024 },
  { width: 4096, height: 2048 },
];

const meshResolutions: ReadonlyArray<{ readonly width: number; readonly height: number }> = [
  { width: 256, height: 128 },
  { width: 1024, height: 512 },
  { width: 2048, height: 1024 },
];

export const buildGlobeConfig = (state: ConfiguratorState): GlobeRuntimeConfig => {
  const pixelRatio =
    state.globe.pixelRatio === 'auto' ? 'auto' : Number.parseFloat(state.globe.pixelRatio);

  return {
    mode: 'sphere',
    kind: state.globe.kind,
    theme: state.globe.theme,
    countries: {
      resolution: state.globe.countryResolution,
      hoverEnabled: state.globe.hoverEnabled,
      hoverOccludeBackSide: state.globe.hoverOccludeBackSide,
    },
    countryLabels: {
      enabled: state.globe.countryLabels,
      minScreenSize: state.globe.labelMinScreenSize,
      sizeFadeRange: state.globe.labelSizeFadeRange,
      transitionMs: state.globe.labelTransitionMs,
      // Always send so the live update path in core can either apply
      // the override or reset to theme default. Empty string / 0 value
      // are interpreted in core as "reset" sentinels.
      color: state.globe.labelColor,
      fontSize: state.globe.labelFontSize,
      fontWeight: state.globe.labelFontWeight,
      // Always pass halo so a toggle off → null is propagated through
      // globe.update() and the running layer drops its text-shadow.
      // Omitting the field would mean "leave halo as previously set"
      // and the change wouldn't take effect live.
      halo: state.globe.labelHaloEnabled
        ? {
            color: state.globe.labelHaloColor,
            radius: state.globe.labelHaloRadius,
            steps: state.globe.labelHaloSteps,
          }
        : null,
    },
    autoRotate: {
      enabled: state.globe.autoRotate,
      speed: state.globe.autoRotateSpeed,
    },
    atmosphere: {
      enabled: state.globe.atmosphere,
      // Always send — empty string / 0 are interpreted in core as
      // "reset to theme default" sentinels so the workshop's clear-
      // override flow actually restores the layer's initial uniforms.
      color: state.globe.atmosphereColor,
      intensity: state.globe.atmosphereIntensity,
      radiusScale: state.globe.atmosphereRadiusScale,
      power: state.globe.atmospherePower,
      threshold: state.globe.atmosphereThreshold,
      side: state.globe.atmosphereSide,
      blending: state.globe.atmosphereBlending,
      pulse: {
        enabled: state.globe.atmospherePulse,
        speed: state.globe.atmospherePulseSpeed,
        amplitude: state.globe.atmospherePulseAmplitude,
      },
    },
    starfield: {
      enabled: state.globe.starfield,
      density: state.globe.starfieldDensity,
      size: state.globe.starfieldSize,
      sizeVariety: state.globe.starfieldSizeVariety,
      // User-editable mixed-color palette (workshop's stars preset
      // exposes a per-swatch editor). Empty palette + multi off = use
      // theme-driven single color.
      ...(state.globe.starfieldMultiColor && state.globe.starfieldPalette.length > 0
        ? { palette: state.globe.starfieldPalette }
        : {}),
      twinkle: {
        enabled: state.globe.starfieldTwinkle,
        intensity: state.globe.starfieldTwinkleIntensity,
        speed: state.globe.starfieldTwinkleSpeed,
      },
    },
    focusPulse: {
      enabled: state.globe.focusPulse,
      origin: state.globe.focusPulseOrigin,
      pulseOnSurfaceClick: state.globe.focusPulseOnSurfaceClick,
    },
    // Dotted-only fine-tune knobs. We always pass the structure so the
    // configurator preset/save round-trip keeps them; core ignores the
    // dotted section for non-dotted kinds. Empty-string color = use
    // theme default; 0 numeric = use theme default (sentinel pattern
    // shared with outline / atmosphere / labels).
    dotted: {
      appearance: {
        color: state.globe.dottedColor,
        sizeScale: state.globe.dottedSizeScale,
        opacity: state.globe.dottedOpacity,
      },
      clickRipple: {
        enabled: state.globe.dottedRipple,
        boost: state.globe.dottedRippleBoost,
        speed: state.globe.dottedRippleSpeed,
        width: state.globe.dottedRippleWidth,
        maxConcurrent: state.globe.dottedRippleMaxConcurrent,
        color: state.globe.dottedRippleColor,
      },
      dataFlash: {
        enabled: state.globe.dottedFlash,
        strength: state.globe.dottedFlashStrength,
        decay: state.globe.dottedFlashDecay,
        color: state.globe.dottedFlashColor,
      },
      drift: {
        enabled: state.globe.dottedDrift,
        amplitude: state.globe.dottedDriftAmplitude,
        speed: state.globe.dottedDriftSpeed,
        freq: state.globe.dottedDriftFreq,
        axis: state.globe.dottedDriftAxis,
      },
      hoverDots: {
        enabled: state.globe.dottedHoverDots,
        scale: state.globe.dottedHoverScale,
        brightnessBoost: state.globe.dottedHoverBrightnessBoost,
        duration: state.globe.dottedHoverDuration,
      },
      cursorWake: {
        enabled: state.globe.dottedCursorWake,
        amplitude: state.globe.dottedCursorWakeAmplitude,
        fade: state.globe.dottedCursorWakeFade,
        width: state.globe.dottedCursorWakeWidth,
      },
      latitudeBands: {
        enabled: state.globe.dottedLatitudeBands,
        equatorBoost: state.globe.dottedEquatorBoost,
        tropicsBoost: state.globe.dottedTropicsBoost,
        width: state.globe.dottedLatitudeBandWidth,
      },
      pulseBreath: {
        enabled: state.globe.dottedPulseBreath,
        amplitude: state.globe.dottedPulseBreathAmplitude,
        speed: state.globe.dottedPulseBreathSpeed,
      },
      constellation: {
        enabled: state.globe.dottedConstellation,
        color: state.globe.dottedConstellationColor,
        opacity: state.globe.dottedConstellationOpacity,
        distanceFactor: state.globe.dottedConstellationDistanceFactor,
      },
    },
    // Outline-only fine-tune knobs. We always pass the structure so the
    // configurator preset/save round-trip keeps them; core ignores the
    // outline section for non-outline kinds.
    outline: {
      hover: {
        lift: state.globe.outlineHoverLift,
        glowLift: state.globe.outlineHoverGlowLift,
      },
      hoverGlow: { enabled: state.globe.outlineHoverGlowEnabled },
      hoverCrosshair: {
        enabled: state.globe.outlineHoverCrosshair,
        color: state.globe.outlineHoverCrosshairColor,
        size: state.globe.outlineHoverCrosshairSize,
        opacity: state.globe.outlineHoverCrosshairOpacity,
        ringRadiusFactor: state.globe.outlineHoverCrosshairRingRadiusFactor,
        cardinalTicks: state.globe.outlineHoverCrosshairCardinalTicks,
        tooltip: state.globe.outlineHoverCrosshairTooltip,
        tooltipDecimals: state.globe.outlineHoverCrosshairTooltipDecimals,
      },
      continentDim: {
        enabled: state.globe.outlineContinentDim,
        amount: state.globe.outlineContinentDimAmount,
      },
      focusPulse: {
        enabled: state.globe.focusPulse,
        durationMs: state.globe.outlinePulseDurationMs,
        angularRadiusBase: state.globe.outlinePulseRadiusBase,
        angularBand: state.globe.outlinePulseAngularBand,
        scaleMin: state.globe.outlinePulseScaleMin,
        scaleMax: state.globe.outlinePulseScaleMax,
        peakOpacity: state.globe.outlinePulseOpacity,
        segments: state.globe.outlinePulseSegments,
        radiusFactor: state.globe.outlinePulseRadiusFactor,
        // Always send — empty string is interpreted in core as
        // "reset to theme default" so the workshop's clear-override
        // flow restores the construction-time color.
        color: state.globe.outlinePulseColor,
      },
    },
    axisTilt: state.globe.axisTilt,
    zoom: {
      mode: state.globe.zoomMode,
      strength: state.globe.zoomStrength,
      smooth: state.globe.smoothZoom,
    },
    performance: {
      antialias: state.globe.antialias,
      pixelRatio,
      maxFps: state.globe.maxFps,
      adaptiveQuality: state.globe.adaptiveQuality,
    },
    initialPosition: [state.globe.initialLat, state.globe.initialLng],
    minZoom: state.globe.minZoom,
    maxZoom: state.globe.maxZoom,
  };
};

export const structuralGlobeKey = (config: GlobeRuntimeConfig): string =>
  JSON.stringify({
    kind: config.kind,
    theme: config.theme,
    countries: config.countries,
    labels: config.countryLabels,
    atmosphere: config.atmosphere,
    starfield: config.starfield,
    focusPulse: config.focusPulse,
    // Per-kind sections own decorators that are constructed once at build
    // time (focus pulse band, hover glow, etc.) — changing any of these
    // means we need to rebuild rather than live-update.
    outline: config.outline,
    axisTilt: config.axisTilt,
    performance: config.performance,
  });

const buildHeatmapDetailOptions = (
  settings: HeatmapSettings
): Pick<HeatmapDataLayer, 'grid' | 'contours' | 'rimFade' | 'zoomScaling'> => {
  const baseZoom = {
    closeDistance: 1.45,
    farDistance: 3.1,
    closeHeightScale: 0.5,
    farHeightScale: 1,
    closeOpacityScale: 0.92,
    farOpacityScale: 1,
    thresholdBoost: 0,
    gridBoost: 0.6,
    contourBoost: 0.7,
  } satisfies NonNullable<HeatmapDataLayer['zoomScaling']>;

  if (settings.detailMode === 'clean') {
    return {
      grid: false,
      contours: false,
      rimFade: 0.34,
      zoomScaling: baseZoom,
    };
  }

  if (settings.detailMode === 'grid') {
    return {
      grid: {
        stepDeg: 5,
        widthDeg: 0.06,
        opacity: 0.075,
        majorEvery: 6,
        majorOpacity: 0.14,
        color: '#3a8bd8',
        densityFade: 0.16,
      },
      contours: false,
      rimFade: 0.34,
      zoomScaling: { ...baseZoom, gridBoost: 0.95 },
    };
  }

  return {
    grid: {
      stepDeg: 5,
      widthDeg: 0.05,
      opacity: 0.055,
      majorEvery: 6,
      majorOpacity: 0.11,
      color: '#3a8bd8',
      densityFade: 0.14,
    },
    contours: {
      interval: 0.07,
      width: 0.0038,
      opacity: 0.18,
      majorEvery: 4,
      majorOpacity: 0.36,
      color: '#d8fff3',
      densityFade: 0.035,
    },
    rimFade: 0.36,
    zoomScaling: { ...baseZoom, gridBoost: 0.85, contourBoost: 0.95 },
  };
};

export interface DataLayerCallbacks {
  readonly onHexbinHover: (payload: HexBinHoverPayload | null) => void;
  readonly onHexbinClick: (payload: HexBinHoverPayload) => void;
  readonly onChartsHover: (payload: ChartsHoverPayload | null) => void;
  readonly onChartsClick: (payload: ChartsHoverPayload) => void;
  readonly onHeatmapHover: (entry: HeatmapDataEntry | null) => void;
  readonly onHeatmapClick: (entry: HeatmapDataEntry) => void;
}

export const buildDataLayer = (
  state: ConfiguratorState,
  heatmapData: ReadonlyArray<HeatmapDataEntry>,
  callbacks?: DataLayerCallbacks
): DataLayer | null => {
  if (state.activeLayer === 'none') return null;

  if (state.activeLayer === 'hexbin') {
    const data = getHexbinDataset(state.hexbin.dataset);
    return {
      type: 'hexbin',
      data,
      resolution: state.hexbin.resolution,
      aggregate: state.hexbin.aggregate,
      height: { min: 0, max: state.hexbin.heightMax },
      cellInset: state.hexbin.cellInset,
      opacity: state.hexbin.opacity,
      showEmpty: state.hexbin.showEmpty,
      cellBorder: state.hexbin.borders
        ? { color: '#d8fff3', opacity: state.hexbin.borderOpacity }
        : false,
      highlight: state.hexbin.highlight
        ? { color: '#fff5b1', liftOffset: 0.014, opacity: 0.62 }
        : false,
      scale: {
        type: 'sequential',
        palette: HOTSPOT_PALETTE,
        noDataColor: 'rgba(55, 75, 92, 0.26)',
      },
      animation: state.hexbin.animationEnabled
        ? {
            duration: state.hexbin.animationDurationMs,
            stagger: state.hexbin.animationStaggerMs,
            easing: state.hexbin.animationEasing,
            style: state.hexbin.animationStyle,
            order: state.hexbin.animationOrder,
          }
        : false,
      ...(callbacks && {
        events: {
          onHover: callbacks.onHexbinHover,
          onClick: callbacks.onHexbinClick,
        },
      }),
    };
  }

  if (state.activeLayer === 'charts') {
    const dataset = getChartDataset(state.charts.dataset);
    const wholeGlobeDataset =
      state.charts.dataset === 'world-gdp' || state.charts.dataset === 'world-co2';
    const scale: ScaleConfig | undefined = wholeGlobeDataset
      ? { type: 'sequential', palette: HOTSPOT_PALETTE }
      : undefined;

    return {
      type: 'charts',
      chartType: state.charts.chartType,
      series: dataset.series,
      data: dataset.data,
      size: state.charts.size,
      height: state.charts.height,
      innerRadius: state.charts.innerRadius,
      padAngle: state.charts.padAngle,
      ...(state.charts.chartType === 'gauge' ? { gaugeMax: 100 } : {}),
      ...(scale ? { scale } : {}),
      animation: state.charts.animationEnabled
        ? {
            duration: state.charts.animationDurationMs,
            stagger: state.charts.animationStaggerMs,
            easing: state.charts.animationEasing,
            order: state.charts.animationOrder,
          }
        : false,
      ...(state.charts.borders ? { borderColor: '#ffffff', borderWidth: 0.45 } : {}),
      highlight: state.charts.highlight,
      segmentStagger: state.charts.segmentStaggerMs,
      labels:
        state.charts.labels === 'off' || state.charts.chartType === 'extruded'
          ? false
          : { mode: state.charts.labels, fontSize: 11 },
      ...(callbacks && {
        events: {
          onHover: callbacks.onChartsHover,
          onClick: callbacks.onChartsClick,
        },
      }),
    };
  }

  const textureResolution =
    textureResolutions[state.heatmap.textureLevel] ?? textureResolutions[1]!;
  const meshResolution = meshResolutions[state.heatmap.meshLevel] ?? meshResolutions[1]!;
  const detailOptions = buildHeatmapDetailOptions(state.heatmap);

  return {
    type: 'heatmap',
    data: heatmapData,
    scale: { type: 'sequential', palette: resolveHeatmapPalette(state.heatmap.palette) },
    kernel: state.heatmap.kernel,
    normalize: state.heatmap.normalize,
    curve: state.heatmap.curve,
    displacementCurve: state.heatmap.displacementCurve,
    blendMode: state.heatmap.blendMode,
    radius: state.heatmap.radius,
    maxHeight: state.heatmap.maxHeight,
    intensity: state.heatmap.intensity,
    threshold: state.heatmap.threshold,
    blurPasses: state.heatmap.blurPasses,
    shading: state.heatmap.shading,
    textureResolution,
    meshResolution,
    paletteSteps: 256,
    countryDomes:
      state.heatmap.dataset === 'countries' && state.heatmap.surfaceMode === 'country'
        ? {
            centerArea: state.heatmap.domeCenterArea,
            shoulderHeight: state.heatmap.domeShoulderHeight,
            edgeSteepness: state.heatmap.domeEdgeSteepness,
            valuePreScale: state.heatmap.domePreScale,
          }
        : false,
    animation: state.heatmap.animationEnabled
      ? {
          style: state.heatmap.animationStyle,
          duration: state.heatmap.animationDurationMs,
          delay: state.heatmap.animationDelayMs,
          stagger: state.heatmap.animationStaggerMs,
          easing: state.heatmap.animationEasing,
          order: state.heatmap.animationOrder,
        }
      : false,
    ...detailOptions,
    ...(callbacks && {
      events: {
        onHover: callbacks.onHeatmapHover,
        onClick: callbacks.onHeatmapClick,
      },
    }),
  };
};

export const dataSummaryForState = (
  state: ConfiguratorState,
  heatmapData: ReadonlyArray<HeatmapDataEntry>
): string => {
  if (state.activeLayer === 'none') return 'No data layer';
  if (state.activeLayer === 'hexbin') {
    const data = getHexbinDataset(state.hexbin.dataset);
    return `${data.length.toLocaleString()} samples -> ${cellsForHexbinResolution(
      state.hexbin.resolution
    ).toLocaleString()} cells`;
  }
  if (state.activeLayer === 'charts') {
    const dataset = getChartDataset(state.charts.dataset);
    return `${dataset.data.length.toLocaleString()} anchors -> ${dataset.series.length} series`;
  }
  const textureResolution =
    textureResolutions[state.heatmap.textureLevel] ?? textureResolutions[1]!;
  return `${heatmapData.length.toLocaleString()} samples -> ${textureResolution.width}x${textureResolution.height}`;
};

export const exportConfig = (
  state: ConfiguratorState,
  heatmapData: ReadonlyArray<HeatmapDataEntry>
): { readonly globe: GlobeRuntimeConfig; readonly dataLayer: DataLayer | null } => {
  return {
    globe: buildGlobeConfig(state),
    dataLayer: buildDataLayer(state, heatmapData),
  };
};
