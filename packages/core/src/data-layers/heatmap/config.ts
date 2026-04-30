import type {
  HeatmapContourConfig,
  HeatmapCountryDomeConfig,
  HeatmapDataLayer,
  HeatmapGridConfig,
  HeatmapZoomScalingConfig,
} from '../types';
import { clampCpu } from './polygon-utils';

/**
 * Internal "fully-resolved" mirrors of the public `Heatmap*Config` types
 * — every field non-optional and clamped to a sane range. Lets the bake
 * + shader-uniform code path skip null-checks and avoid duplicate
 * default-fallback chains every frame.
 */

export interface ResolvedHeatmapGridConfig {
  readonly enabled: boolean;
  readonly stepDeg: number;
  readonly widthDeg: number;
  readonly opacity: number;
  readonly majorEvery: number;
  readonly majorOpacity: number;
  readonly color: string;
  readonly densityFade: number;
}

export interface ResolvedHeatmapContourConfig {
  readonly enabled: boolean;
  readonly interval: number;
  readonly width: number;
  readonly opacity: number;
  readonly majorEvery: number;
  readonly majorOpacity: number;
  readonly color: string;
  readonly densityFade: number;
}

export interface ResolvedHeatmapZoomScalingConfig {
  readonly enabled: boolean;
  readonly closeDistance: number;
  readonly farDistance: number;
  readonly closeHeightScale: number;
  readonly farHeightScale: number;
  readonly closeOpacityScale: number;
  readonly farOpacityScale: number;
  readonly thresholdBoost: number;
  readonly gridBoost: number;
  readonly contourBoost: number;
}

export interface ResolvedHeatmapCountryDomeConfig {
  readonly enabled: boolean;
  readonly centerArea: number;
  readonly shoulderHeight: number;
  readonly edgeSteepness: number;
  readonly valuePreScale: 'linear' | 'log' | 'sqrt';
  readonly rounding: number;
  readonly perCountryNormalize: boolean;
}

export const DISABLED_ZOOM_SCALING: ResolvedHeatmapZoomScalingConfig = {
  enabled: false,
  closeDistance: 1.45,
  farDistance: 3.2,
  closeHeightScale: 1,
  farHeightScale: 1,
  closeOpacityScale: 1,
  farOpacityScale: 1,
  thresholdBoost: 0,
  gridBoost: 0,
  contourBoost: 0,
};

export const DISABLED_COUNTRY_DOMES: ResolvedHeatmapCountryDomeConfig = {
  enabled: false,
  centerArea: 0.55,
  shoulderHeight: 0.36,
  edgeSteepness: 2.6,
  valuePreScale: 'log',
  rounding: 1,
  perCountryNormalize: true,
};

export const resolveGridConfig = (
  input: HeatmapDataLayer['grid'],
  fallbackColor: string
): ResolvedHeatmapGridConfig => {
  if (!input) {
    return {
      enabled: false,
      stepDeg: 8,
      widthDeg: 0.16,
      opacity: 0,
      majorEvery: 4,
      majorOpacity: 0,
      color: fallbackColor,
      densityFade: 0.28,
    };
  }
  const cfg: HeatmapGridConfig = input === true ? {} : input;
  return {
    enabled: cfg.enabled ?? true,
    stepDeg: clampCpu(cfg.stepDeg ?? 8, 2, 45),
    widthDeg: clampCpu(cfg.widthDeg ?? 0.16, 0.02, 2),
    opacity: clampCpu(cfg.opacity ?? 0.14, 0, 1),
    majorEvery: Math.max(1, Math.round(cfg.majorEvery ?? 4)),
    majorOpacity: clampCpu(cfg.majorOpacity ?? 0.24, 0, 1),
    color: cfg.color ?? fallbackColor,
    densityFade: clampCpu(cfg.densityFade ?? 0.28, 0.02, 1),
  };
};

export const resolveContourConfig = (
  input: HeatmapDataLayer['contours'],
  fallbackColor: string
): ResolvedHeatmapContourConfig => {
  if (!input) {
    return {
      enabled: false,
      interval: 0.08,
      width: 0.006,
      opacity: 0,
      majorEvery: 4,
      majorOpacity: 0,
      color: fallbackColor,
      densityFade: 0.04,
    };
  }
  const cfg: HeatmapContourConfig = input === true ? {} : input;
  return {
    enabled: cfg.enabled ?? true,
    interval: clampCpu(cfg.interval ?? 0.08, 0.015, 0.5),
    width: clampCpu(cfg.width ?? 0.006, 0.001, 0.08),
    opacity: clampCpu(cfg.opacity ?? 0.22, 0, 1),
    majorEvery: Math.max(1, Math.round(cfg.majorEvery ?? 4)),
    majorOpacity: clampCpu(cfg.majorOpacity ?? 0.38, 0, 1),
    color: cfg.color ?? fallbackColor,
    densityFade: clampCpu(cfg.densityFade ?? 0.04, 0, 1),
  };
};

export const resolveZoomScaling = (
  input: HeatmapDataLayer['zoomScaling']
): ResolvedHeatmapZoomScalingConfig => {
  if (input === undefined || input === false) return DISABLED_ZOOM_SCALING;
  const cfg: HeatmapZoomScalingConfig = input;
  if (cfg.enabled === false) return DISABLED_ZOOM_SCALING;
  const closeDistance = cfg.closeDistance ?? 1.45;
  const farDistance = Math.max(closeDistance + 0.001, cfg.farDistance ?? 3.2);
  return {
    enabled: true,
    closeDistance,
    farDistance,
    closeHeightScale: clampCpu(cfg.closeHeightScale ?? 0.55, 0.05, 2),
    farHeightScale: clampCpu(cfg.farHeightScale ?? 1, 0.05, 2),
    closeOpacityScale: clampCpu(cfg.closeOpacityScale ?? 0.86, 0, 2),
    farOpacityScale: clampCpu(cfg.farOpacityScale ?? 1, 0, 2),
    thresholdBoost: clampCpu(cfg.thresholdBoost ?? 0.04, 0, 0.5),
    gridBoost: clampCpu(cfg.gridBoost ?? 0.45, 0, 2),
    contourBoost: clampCpu(cfg.contourBoost ?? 0.35, 0, 2),
  };
};

export const resolveCountryDomeConfig = (
  input: HeatmapDataLayer['countryDomes']
): ResolvedHeatmapCountryDomeConfig => {
  if (input === undefined || input === false) return DISABLED_COUNTRY_DOMES;
  const cfg: HeatmapCountryDomeConfig = input === true ? {} : input;
  if (cfg.enabled === false) return DISABLED_COUNTRY_DOMES;
  return {
    enabled: true,
    centerArea: clampCpu(cfg.centerArea ?? 0.55, 0.12, 0.85),
    shoulderHeight: clampCpu(cfg.shoulderHeight ?? 0.36, 0.05, 0.98),
    edgeSteepness: clampCpu(cfg.edgeSteepness ?? 2.6, 0.5, 8),
    valuePreScale: cfg.valuePreScale ?? 'log',
    rounding: clampCpu(cfg.rounding ?? 1, 0, 1),
    perCountryNormalize: cfg.perCountryNormalize ?? true,
  };
};
