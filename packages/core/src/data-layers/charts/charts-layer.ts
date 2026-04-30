import { Group, type Camera } from 'three';
import type { CountryFeature } from '../../renderer/country-feature';
import type { ChartsDataEntry, ChartsDataLayer } from '../types';
import {
  DISABLED_ANIMATION,
  easingFunctionFor,
  resolveAnimationConfig,
  type ResolvedHeatmapAnimationConfig,
} from '../heatmap/animation';
import { clampCpu } from '../heatmap/polygon-utils';
import { buildAnchorList, type ChartAnchor } from './anchors';
import {
  buildGroupedBarsChart,
  buildRadialBarsChart,
  buildStackedBarsChart,
  computeStackedGlobalPeak,
  disposeBars,
  type BarHandle,
} from './bars-builder';
import {
  buildDonutChart,
  buildPieChart,
  disposePieSegments,
  type PieSegmentHandle,
} from './pie-builder';

/**
 * Per-entry runtime state — one per chart instance. The orchestrator
 * iterates this list each frame to apply animation `t`. `bars` and
 * `segments` are mutually exclusive (bars-* charts have no segments,
 * pie/donut charts have no bars) but typed as optional so the same
 * struct works for both code paths without a tagged union.
 */
interface ChartInstance {
  readonly group: Group;
  readonly anchor: ChartAnchor;
  readonly entryIndex: number;
  readonly chartType: ChartsDataLayer['chartType'];
  readonly faceCamera: boolean;
  /** Pre-computed start time in seconds (layer.delay + index × stagger). */
  readonly startSec: number;
  /** Bar handles for bars-* charts. */
  readonly bars?: ReadonlyArray<BarHandle>;
  /** Segment handles for pie / donut. */
  readonly segments?: ReadonlyArray<PieSegmentHandle>;
}

export interface ChartsLayerOptions {
  readonly layer: ChartsDataLayer;
  readonly countryFeatures?: ReadonlyArray<CountryFeature>;
  readonly fallbackColor?: string;
  readonly camera?: Camera;
}

const DEFAULT_FALLBACK_COLOR = '#8ab6ff';

/**
 * Charts layer orchestrator — mirror of `HeatmapLayer` for multi-series
 * chart visualisations anchored at lat/lng. One `Group` per chart sits
 * inside `this.group`; chart geometry is built once per `setData()`,
 * animation is purely transform/opacity-based per frame.
 *
 * Animation reuses the heatmap easing library (`HeatmapAnimationConfig`)
 * — `style: 'rise'` scales bars on Y; `style: 'pop'` (delegated to the
 * easing curve, e.g. `'ease-out-back'`) scales whole chart XYZ; `style:
 * 'fade'` only animates opacity. Per-entry stagger is computed once at
 * setData and stored on each `ChartInstance.startSec`.
 *
 * `tick(deltaSec)` is called by the kind decoration each frame (wired
 * through `DataLayerHandle.update`).
 */
export class ChartsLayer {
  public readonly group: Group;
  private readonly fallbackColor: string;
  private readonly camera: Camera | null;
  private readonly featuresByKey: ReadonlyMap<string, CountryFeature>;
  private layer: ChartsDataLayer;
  private animConfig: ResolvedHeatmapAnimationConfig = DISABLED_ANIMATION;
  private animElapsedSec = 0;
  private instances: Array<ChartInstance> = [];
  /** Cached so `tick()` doesn't re-resolve the easing every frame. */
  private easingFn: (t: number) => number = (t) => t;

  public constructor(options: ChartsLayerOptions) {
    this.group = new Group();
    this.group.name = 'ChartsLayer';
    this.fallbackColor = options.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    this.camera = options.camera ?? null;
    this.featuresByKey = buildFeatureIndex(options.countryFeatures ?? []);
    this.layer = options.layer;
    this.applyData(options.layer);
  }

  /**
   * Replace the layer config / data. Re-builds all chart instances;
   * `setData(sameLayer)` after a slider tweak is cheap enough (10²–10³
   * charts) that we don't bother diffing — re-build everything and
   * re-trigger the mount animation.
   */
  public setData(layer: ChartsDataLayer): void {
    this.disposeInstances();
    this.layer = layer;
    this.applyData(layer);
  }

  /**
   * Per-frame tick: advances animation timeline, applies eased `t` to
   * each chart instance based on its `startSec`, and (when `faceCamera`
   * is enabled for pie/donut) re-orients the chart's group toward the
   * camera so flat charts stay readable across all latitudes.
   */
  public tick(deltaSec: number): void {
    if (this.animConfig.enabled) {
      this.animElapsedSec += Math.max(0, deltaSec);
      this.applyAnimation();
    }
    if (this.camera) this.applyBillboard();
  }

  /** Restart the mount animation from `t=0`. Story-engine bridge hook. */
  public playAnimation(): void {
    if (!this.animConfig.enabled) return;
    this.animElapsedSec = 0;
    this.applyAnimation();
  }

  public dispose(): void {
    this.disposeInstances();
  }

  private applyData(layer: ChartsDataLayer): void {
    this.animConfig = resolveAnimationConfig(layer.animation);
    this.easingFn = easingFunctionFor(this.animConfig.easing);
    const anchorList = buildAnchorList(layer.data, this.featuresByKey);
    if (anchorList.length === 0) return;

    const stackedPeak =
      layer.chartType === 'bars-stacked'
        ? computeStackedGlobalPeak(layer.data, layer.series)
        : 0;
    const faceCameraDefault = layer.chartType === 'pie' || layer.chartType === 'donut';
    const faceCamera = layer.faceCamera ?? faceCameraDefault;

    for (const { entry, anchor, index } of anchorList) {
      const instance = this.buildOneChart(entry, anchor, index, layer, stackedPeak, faceCamera);
      if (!instance) continue;
      this.group.add(instance.group);
      this.instances.push(instance);
    }
    // Snap initial state to t=0 so the first frame doesn't show the chart
    // at full size before tick() runs (avoids a one-frame flash).
    this.animElapsedSec = 0;
    if (this.animConfig.enabled) this.applyAnimation();
  }

  private buildOneChart(
    entry: ChartsDataEntry,
    anchor: ChartAnchor,
    index: number,
    layer: ChartsDataLayer,
    stackedPeak: number,
    faceCamera: boolean
  ): ChartInstance | null {
    const built = buildChartGeometry(entry, layer, this.fallbackColor, stackedPeak);
    if (!built) return null;
    const { group, bars, segments } = built;
    group.position.copy(anchor.surface);
    group.quaternion.copy(anchor.quaternion);
    const startSec =
      this.animConfig.delay + index * this.animConfig.stagger;
    return {
      group,
      anchor,
      entryIndex: index,
      chartType: layer.chartType,
      faceCamera,
      startSec,
      ...(bars !== undefined ? { bars } : {}),
      ...(segments !== undefined ? { segments } : {}),
    };
  }

  /**
   * Apply the current eased `t` to every chart instance.
   *
   *   - `'rise'`  → bars scale Y from 0 → target; pies scale XYZ uniformly
   *   - `'pop'`   → identical to `'rise'`; the overshoot lives in the
   *                 easing curve (e.g. `'ease-out-back'` overshoots Y past
   *                 1 then settles, same shape no matter the chart type)
   *   - `'fade'`  → no scaling; only opacity animates 0 → target
   */
  private applyAnimation(): void {
    const cfg = this.animConfig;
    const baseOpacity = this.layer.opacity ?? 1;
    for (const inst of this.instances) {
      const local = clampCpu(
        (this.animElapsedSec - inst.startSec) / cfg.duration,
        0,
        1
      );
      const t = this.easingFn(local);
      const scale = cfg.style === 'fade' ? 1 : t;
      const alpha = baseOpacity * t;
      if (inst.bars) {
        for (const bar of inst.bars) {
          bar.mesh.scale.y = bar.targetHeight * scale;
          bar.material.opacity = alpha;
        }
      }
      if (inst.segments) {
        // For pie/donut: scale the entire group uniformly. Group scale
        // composes with the anchor's quaternion correctly because the
        // quaternion is set before scale in three.js's local matrix.
        inst.group.scale.setScalar(Math.max(0.0001, scale));
        for (const seg of inst.segments) {
          seg.material.opacity = alpha;
        }
      }
    }
  }

  /**
   * Billboard pass: for chart instances flagged `faceCamera`, replace the
   * anchor quaternion with one that orients the chart's local +Y toward
   * the camera while keeping the chart roughly tangent to the surface.
   * Pie/donut otherwise look like ellipses at high latitudes.
   *
   * Implementation: simplest stable trick — orient `+Y` along the vector
   * from the chart anchor to the camera. The chart no longer sits flat
   * on the surface but reads as a flat disc to the viewer. Bars and
   * radial layouts skip this (they want surface-tangent orientation so
   * they "stand up" from the globe).
   */
  private applyBillboard(): void {
    if (!this.camera) return;
    for (const inst of this.instances) {
      if (!inst.faceCamera) continue;
      // Vector from anchor to camera — that's the desired "up" axis for a
      // flat chart that reads correctly to the viewer.
      const toCamera = inst.group.position.clone();
      toCamera.subVectors(this.camera.position, inst.group.position).normalize();
      inst.group.quaternion.setFromUnitVectors(LOCAL_UP_VEC3.set(0, 1, 0), toCamera);
    }
  }

  private disposeInstances(): void {
    for (const inst of this.instances) {
      this.group.remove(inst.group);
      if (inst.bars) disposeBars(inst.bars);
      if (inst.segments) disposePieSegments(inst.segments);
    }
    this.instances.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private)
// ---------------------------------------------------------------------------

const buildFeatureIndex = (
  features: ReadonlyArray<CountryFeature>
): ReadonlyMap<string, CountryFeature> => {
  const out = new Map<string, CountryFeature>();
  for (const f of features) {
    out.set(f.id, f);
    if (f.name) out.set(f.name, f);
  }
  return out;
};

const buildChartGeometry = (
  entry: ChartsDataEntry,
  layer: ChartsDataLayer,
  fallbackColor: string,
  stackedPeak: number
): { group: Group; bars?: ReadonlyArray<BarHandle>; segments?: ReadonlyArray<PieSegmentHandle> } | null => {
  switch (layer.chartType) {
    case 'bars-grouped': {
      const { group, bars } = buildGroupedBarsChart(entry, layer.series, layer, fallbackColor);
      return bars.length === 0 ? null : { group, bars };
    }
    case 'bars-stacked': {
      const { group, bars } = buildStackedBarsChart(entry, layer.series, layer, fallbackColor, stackedPeak);
      return bars.length === 0 ? null : { group, bars };
    }
    case 'radial': {
      const { group, bars } = buildRadialBarsChart(entry, layer.series, layer, fallbackColor);
      return bars.length === 0 ? null : { group, bars };
    }
    case 'pie': {
      const { group, segments } = buildPieChart(entry, layer.series, layer, fallbackColor);
      return segments.length === 0 ? null : { group, segments };
    }
    case 'donut': {
      const { group, segments } = buildDonutChart(entry, layer.series, layer, fallbackColor);
      return segments.length === 0 ? null : { group, segments };
    }
  }
};

import { Vector3 as _Vector3 } from 'three';
/** Re-used scratch vector; `applyBillboard` overwrites it each call. */
const LOCAL_UP_VEC3 = new _Vector3();
