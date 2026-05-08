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
import { buildArcs, buildMarkerCards, buildMarkerDots } from './layer-fixtures';
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
      // Per-instance overrides for the selection-layer strokes + glow.
      // Always sent so the live-update path can either apply the value
      // or treat it as a sentinel ('' / 0 → reset to theme).
      borderHover: {
        color: state.globe.hoverStrokeColor,
        width: state.globe.hoverStrokeWidth,
        opacity: state.globe.hoverStrokeOpacity,
        glowColor: state.globe.hoverGlowColor,
        glowWidth: state.globe.hoverGlowWidth,
        glowOpacity: state.globe.hoverGlowOpacity,
      },
      borderActive: {
        color: state.globe.activeStrokeColor,
        width: state.globe.activeStrokeWidth,
        opacity: state.globe.activeStrokeOpacity,
      },
      fill: {
        mode: state.globe.countryFillMode,
        defaultColor: state.globe.countryFillDefaultColor,
        defaultOpacity: state.globe.countryFillDefaultOpacity,
        palette: state.globe.countryFillPalette,
        hoverColor: state.globe.countryFillHoverColor,
        hoverOpacity: state.globe.countryFillHoverOpacity,
        activeColor: state.globe.countryFillActiveColor,
        activeOpacity: state.globe.countryFillActiveOpacity,
      },
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
        perCountryPhase: state.globe.dottedDriftPerCountryPhase,
      },
      hoverDots: {
        enabled: state.globe.dottedHoverDots,
        scale: state.globe.dottedHoverScale,
        brightnessBoost: state.globe.dottedHoverBrightnessBoost,
        duration: state.globe.dottedHoverDuration,
        lift: state.globe.dottedHoverLift,
      },
      activeCountry: {
        enabled: state.globe.dottedActiveCountry,
        boost: state.globe.dottedActiveBoost,
        scale: state.globe.dottedActiveScale,
        pulseSpeed: state.globe.dottedActivePulseSpeed,
        lift: state.globe.dottedActiveLift,
      },
      edge: {
        enabled: state.globe.dottedEdgeHighlight,
        boost: state.globe.dottedEdgeBoost,
        lift: state.globe.dottedEdgeLift,
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
      dots: {
        mode: state.globe.dottedDotsMode,
        palette: state.globe.dottedDotsPalette,
        hoverColor: state.globe.dottedDotsHoverColor,
        activeColor: state.globe.dottedDotsActiveColor,
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
    // Hologram-only knobs. We always pass the structure so the
    // workshop's save / discard / preset round-trip persists every
    // setting; core ignores the hologram section for non-hologram
    // kinds. Empty-string color / 0-or-below numerics are treated
    // as "reset to theme default" sentinels by the layer setters.
    hologram: {
      scanlines: {
        enabled: state.globe.hologramScanlines,
        density: state.globe.hologramScanlineDensity,
        speed: state.globe.hologramScanlineSpeed,
        opacity: state.globe.hologramScanlineOpacity,
        direction: state.globe.hologramScanlineDirection,
      },
      rimGlow: {
        enabled: state.globe.hologramRimGlow,
        color: state.globe.hologramRimColor,
        intensity: state.globe.hologramRimIntensity,
        width: state.globe.hologramRimWidth,
      },
      glitch: {
        enabled: state.globe.hologramGlitch,
        intervalMin: state.globe.hologramGlitchIntervalMin,
        intervalMax: state.globe.hologramGlitchIntervalMax,
        amplitude: state.globe.hologramGlitchAmplitude,
        channelShift: state.globe.hologramGlitchChannelShift,
      },
      outerGlow: {
        enabled: state.globe.hologramOuterGlow,
        color: state.globe.hologramOuterGlowColor,
        spread: state.globe.hologramOuterGlowSpread,
        intensity: state.globe.hologramOuterGlowIntensity,
      },
      chromaticAberration: {
        enabled: state.globe.hologramChromaticAberration,
        amount: state.globe.hologramChromaticAberrationAmount,
        mode: state.globe.hologramChromaticAberrationMode,
      },
      noise: {
        enabled: state.globe.hologramNoise,
        intensity: state.globe.hologramNoiseIntensity,
        scale: state.globe.hologramNoiseScale,
        speed: state.globe.hologramNoiseSpeed,
      },
      projectorPulse: {
        enabled: state.globe.hologramProjectorPulse,
        speed: state.globe.hologramProjectorPulseSpeed,
        amplitude: state.globe.hologramProjectorPulseAmplitude,
        color: state.globe.hologramProjectorPulseColor,
      },
      dataScan: {
        enabled: state.globe.hologramDataScan,
        speed: state.globe.hologramDataScanSpeed,
        width: state.globe.hologramDataScanWidth,
        opacity: state.globe.hologramDataScanOpacity,
        axis: state.globe.hologramDataScanAxis,
        color: state.globe.hologramDataScanColor,
      },
      phaseShimmer: {
        enabled: state.globe.hologramPhaseShimmer,
        scale: state.globe.hologramPhaseShimmerScale,
        intensity: state.globe.hologramPhaseShimmerIntensity,
        speed: state.globe.hologramPhaseShimmerSpeed,
      },
      calibrationTicks: {
        enabled: state.globe.hologramCalibrationTicks,
        count: state.globe.hologramCalibrationTicksCount,
        length: state.globe.hologramCalibrationTicksLength,
        opacity: state.globe.hologramCalibrationTicksOpacity,
      },
      focusPulse: {
        durationMs: state.globe.hologramPulseDurationMs,
        angularRadiusBase: state.globe.hologramPulseRadiusBase,
        angularBand: state.globe.hologramPulseAngularBand,
        scaleMin: state.globe.hologramPulseScaleMin,
        scaleMax: state.globe.hologramPulseScaleMax,
        peakOpacity: state.globe.hologramPulseOpacity,
        segments: state.globe.hologramPulseSegments,
        radiusFactor: state.globe.hologramPulseRadiusFactor,
        color: state.globe.hologramPulseColor,
      },
    },
    // Cinematic-kind foundation. This is the new first-run kind, so the
    // section is always passed for save/load parity and live updates.
    cinematic: {
      quality: state.globe.cinematicQuality,
      reactivity: {
        lightInfluence: state.globe.cinematicLightInfluence,
        cameraInfluence: state.globe.cinematicCameraInfluence,
        densityInfluence: state.globe.cinematicDensityInfluence,
        terminatorBoost: state.globe.cinematicTerminatorBoost,
        horizonGlow: state.globe.cinematicHorizonGlow,
        atmosphericScatter: state.globe.cinematicAtmosphericScatter,
        surfaceMicroDetail: state.globe.cinematicSurfaceMicroDetail,
        cityNightResponse: state.globe.cinematicCityNightResponse,
        orbitalFlow: state.globe.cinematicOrbitalFlow,
      },
      surface: {
        oceanColor: state.globe.cinematicOceanColor,
        landColor: state.globe.cinematicLandColor,
        cloudColor: state.globe.cinematicCloudColor,
        nightColor: state.globe.cinematicNightColor,
        lightDirection: [
          state.globe.cinematicLightX,
          state.globe.cinematicLightY,
          state.globe.cinematicLightZ,
        ] as const,
        lightingMode: state.globe.cinematicLightingMode,
        terminatorSoftness: state.globe.cinematicTerminatorSoftness,
        terminatorContrast: state.globe.cinematicTerminatorContrast,
        keyIntensity: state.globe.cinematicKeyIntensity,
        fillIntensity: state.globe.cinematicFillIntensity,
        rimColor: state.globe.cinematicRimColor,
        rimIntensity: state.globe.cinematicRimIntensity,
        rimPower: state.globe.cinematicRimPower,
        specularIntensity: state.globe.cinematicSpecularIntensity,
        cloudOpacity: state.globe.cinematicCloudOpacity,
        oceanSheen: state.globe.cinematicOceanSheen,
      },
      borders: {
        enabled: state.globe.cinematicBorders,
        color: state.globe.cinematicBorderColor,
        intensity: state.globe.cinematicBorderIntensity,
      },
      cityLights: {
        enabled: state.globe.cinematicCityLights,
        color: state.globe.cinematicCityLightColor,
        intensity: state.globe.cinematicCityLightIntensity,
        count: state.globe.cinematicCityLightCount,
        size: state.globe.cinematicCityLightSize,
        twinkle: state.globe.cinematicCityLightTwinkle,
      },
      network: {
        enabled: state.globe.cinematicNetwork,
        color: state.globe.cinematicNetworkColor,
        opacity: state.globe.cinematicNetworkOpacity,
        maxConnections: state.globe.cinematicNetworkConnections,
        pulseSpeed: state.globe.cinematicNetworkPulseSpeed,
      },
      focusPulse: {
        durationMs: state.globe.cinematicPulseDurationMs,
        angularRadiusBase: state.globe.cinematicPulseRadiusBase,
        angularBand: state.globe.cinematicPulseAngularBand,
        scaleMin: state.globe.cinematicPulseScaleMin,
        scaleMax: state.globe.cinematicPulseScaleMax,
        peakOpacity: state.globe.cinematicPulseOpacity,
        segments: state.globe.cinematicPulseSegments,
        radiusFactor: state.globe.cinematicPulseRadiusFactor,
        color: state.globe.cinematicPulseColor,
      },
    },
    // Paper kind (vintage atlas) — every knob is always sent so the
    // workshop's clear-override flow can route through globe.update().
    // Sentinels: empty-string color = use theme default, < 0 numeric =
    // use theme default where the natural domain is ≥ 0. The core
    // paper kind ignores this section for non-paper kinds.
    paper: {
      surface: {
        color: state.globe.paperSurfaceColor,
        noiseAmount: state.globe.paperSurfaceNoise,
        vignette: state.globe.paperSurfaceVignette,
        fiberAmount: state.globe.paperSurfaceFibers,
        stainAmount: state.globe.paperSurfaceStains,
        washColor: state.globe.paperSurfaceWashColor,
        waterLineAmount: state.globe.paperSurfaceWaterLines,
        waterLineColor: state.globe.paperSurfaceWaterLineColor,
      },
      borders: {
        enabled: state.globe.paperBorders,
        color: state.globe.paperBorderColor,
        opacity: state.globe.paperBorderOpacity,
        width: state.globe.paperBorderWidth,
        roughness: state.globe.paperBorderRoughness,
        stipple: {
          enabled: state.globe.paperStipple,
          density: state.globe.paperStippleDensity,
          size: state.globe.paperStippleSize,
        },
        inkBleed: {
          enabled: state.globe.paperInkBleed,
          color: state.globe.paperInkBleedColor,
          opacity: state.globe.paperInkBleedOpacity,
          spread: state.globe.paperInkBleedSpread,
        },
      },
      fill: {
        enabled: state.globe.paperFill,
        color: state.globe.paperFillColor,
        opacity: state.globe.paperFillOpacity,
        mode: state.globe.paperFillMode,
      },
      grid: {
        enabled: state.globe.paperGrid,
        color: state.globe.paperGridColor,
        opacity: state.globe.paperGridOpacity,
        stepDeg: state.globe.paperGridStep,
        majorEvery: state.globe.paperGridMajorEvery,
        majorOpacity: state.globe.paperGridMajorOpacity,
      },
      sepia: {
        enabled: state.globe.paperSepia,
        color: state.globe.paperSepiaColor,
        opacity: state.globe.paperSepiaOpacity,
      },
      vignette: {
        enabled: state.globe.paperVignette,
        color: state.globe.paperVignetteColor,
        intensity: state.globe.paperVignetteIntensity,
        radius: state.globe.paperVignetteRadius,
      },
      compassRose: {
        enabled: state.globe.paperCompass,
        lat: state.globe.paperCompassLat,
        lng: state.globe.paperCompassLng,
        color: state.globe.paperCompassColor,
        opacity: state.globe.paperCompassOpacity,
        size: state.globe.paperCompassSize,
      },
      agingMarks: {
        enabled: state.globe.paperAging,
        count: state.globe.paperAgingCount,
        color: state.globe.paperAgingColor,
        intensity: state.globe.paperAgingIntensity,
        seed: state.globe.paperAgingSeed,
      },
      watermark: {
        enabled: state.globe.paperWatermark,
        text: state.globe.paperWatermarkText,
        color: state.globe.paperWatermarkColor,
        opacity: state.globe.paperWatermarkOpacity,
        size: state.globe.paperWatermarkSize,
        position: state.globe.paperWatermarkPosition,
      },
      focusPulse: {
        durationMs: state.globe.paperPulseDurationMs,
        angularRadiusBase: state.globe.paperPulseRadiusBase,
        angularBand: state.globe.paperPulseAngularBand,
        scaleMin: state.globe.paperPulseScaleMin,
        scaleMax: state.globe.paperPulseScaleMax,
        peakOpacity: state.globe.paperPulseOpacity,
        segments: state.globe.paperPulseSegments,
        radiusFactor: state.globe.paperPulseRadiusFactor,
        color: state.globe.paperPulseColor,
      },
    },
    // Wireframe-only fine-tune knobs. Always pass the structure so the
    // configurator preset/save round-trip keeps them; core ignores the
    // wireframe section for non-wireframe kinds. Empty-string color /
    // non-positive numerics on clamped knobs are reset-to-default
    // sentinels — see core's setWireframeConfig dispatcher.
    wireframe: {
      enabled: state.globe.kind === 'wireframe',
      color: state.globe.wireframeColor,
      opacity: state.globe.wireframeOpacity,
      density: state.globe.wireframeDensity,
      pulse: state.globe.wireframePulse,
      pulseSpeed: state.globe.wireframePulseSpeed,
      hierarchy: {
        enabled: state.globe.wireframeHierarchy,
        majorStepDeg: state.globe.wireframeHierarchyMajorStepDeg,
        majorBoost: state.globe.wireframeHierarchyMajorBoost,
        minorBoost: state.globe.wireframeHierarchyMinorBoost,
      },
      clickPulse: {
        enabled: state.globe.wireframeClickPulse,
        color: state.globe.wireframeClickPulseColor,
        speed: state.globe.wireframeClickPulseSpeed,
        width: state.globe.wireframeClickPulseWidth,
        boost: state.globe.wireframeClickPulseBoost,
        maxConcurrent: state.globe.wireframeClickPulseMaxConcurrent,
      },
      emphasis: {
        enabled: state.globe.wireframeEmphasis,
        strongColor: state.globe.wireframeEmphasisStrongColor,
        weakColor: state.globe.wireframeEmphasisWeakColor,
        strongOpacity: state.globe.wireframeEmphasisStrongOpacity,
        weakOpacityFactor: state.globe.wireframeEmphasisWeakOpacityFactor,
      },
      equatorBeam: {
        enabled: state.globe.wireframeEquatorBeam,
        color: state.globe.wireframeEquatorBeamColor,
        opacity: state.globe.wireframeEquatorBeamOpacity,
        pulse: state.globe.wireframeEquatorBeamPulse,
        pulseSpeed: state.globe.wireframeEquatorBeamPulseSpeed,
      },
      glitch: {
        enabled: state.globe.wireframeGlitch,
        intervalMin: state.globe.wireframeGlitchIntervalMin,
        intervalMax: state.globe.wireframeGlitchIntervalMax,
      },
      activeRing: {
        enabled: state.globe.wireframeActiveRing,
        color: state.globe.wireframeActiveRingColor,
        opacity: state.globe.wireframeActiveRingOpacity,
        padding: state.globe.wireframeActiveRingPadding,
        rotationSpeed: state.globe.wireframeActiveRingRotationSpeed,
      },
      poleStreams: {
        enabled: state.globe.wireframePoleStreams,
        color: state.globe.wireframePoleStreamsColor,
        opacity: state.globe.wireframePoleStreamsOpacity,
        count: state.globe.wireframePoleStreamsCount,
        speed: state.globe.wireframePoleStreamsSpeed,
        size: state.globe.wireframePoleStreamsSize,
      },
      dataPackets: {
        enabled: state.globe.wireframeDataPackets,
        color: state.globe.wireframeDataPacketsColor,
        count: state.globe.wireframeDataPacketsCount,
        speed: state.globe.wireframeDataPacketsSpeed,
        trail: state.globe.wireframeDataPacketsTrail,
        size: state.globe.wireframeDataPacketsSize,
        axis: state.globe.wireframeDataPacketsAxis,
      },
      compass: {
        enabled: state.globe.wireframeCompass,
        color: state.globe.wireframeCompassColor,
        size: state.globe.wireframeCompassSize,
        opacity: state.globe.wireframeCompassOpacity,
        poles: state.globe.wireframeCompassPoles,
      },
      gridPulse: {
        enabled: state.globe.wireframeGridPulse,
        color: state.globe.wireframeGridPulseColor,
        intervalSec: state.globe.wireframeGridPulseIntervalSec,
        speed: state.globe.wireframeGridPulseSpeed,
        width: state.globe.wireframeGridPulseWidth,
        boost: state.globe.wireframeGridPulseBoost,
        mode: state.globe.wireframeGridPulseMode,
        originLat: state.globe.wireframeGridPulseOriginLat,
        originLng: state.globe.wireframeGridPulseOriginLng,
      },
      polePulse: {
        enabled: state.globe.wireframePolePulse,
        color: state.globe.wireframePolePulseColor,
        intervalSec: state.globe.wireframePolePulseIntervalSec,
        speed: state.globe.wireframePolePulseSpeed,
        boost: state.globe.wireframePolePulseBoost,
        which: state.globe.wireframePolePulseWhich,
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
    arcs: buildArcs(state.globe),
    markers: state.globe.markerMode === 'dots' ? buildMarkerDots(state.globe) : [],
    htmlMarkers: state.globe.markerMode === 'cards' ? buildMarkerCards(state.globe) : [],
  };
};

export const structuralGlobeKey = (config: GlobeRuntimeConfig): string =>
  JSON.stringify({
    kind: config.kind,
    theme: config.theme,
    countryResolution: config.countries?.resolution,
    // Outline hover lift values are baked into the standard selection
    // geometry's surface radius. Everything else in `outline` flows
    // through `setOutlineConfig` / focusPulse.setOptions live.
    outlineHoverLift: config.outline?.hover?.lift,
    outlineHoverGlowLift: config.outline?.hover?.glowLift,
    axisTilt: config.axisTilt,
    minZoom: config.minZoom,
    maxZoom: config.maxZoom,
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
