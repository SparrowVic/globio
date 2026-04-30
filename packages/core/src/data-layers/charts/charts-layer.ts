import { Group, Raycaster, Vector2, type Camera } from 'three';
import type { CountryFeature } from '../../renderer/country-feature';
import type { ChartsDataEntry, ChartsDataLayer, ChartsHoverPayload } from '../types';
import {
  DISABLED_ANIMATION,
  easingFunctionFor,
  entryAnimationDelaySec,
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
  buildGaugeChart,
  buildPieChart,
  buildSunburstChart,
  disposePieSegments,
  type PieSegmentHandle,
} from './pie-builder';
import { ChartsLabelsOverlay, resolveLabelsConfig } from './labels-overlay';

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
  readonly entry: ChartsDataEntry;
  readonly entryIndex: number;
  readonly chartType: ChartsDataLayer['chartType'];
  readonly faceCamera: boolean;
  /** Chart-wide start time in seconds (layer.delay + entryIndex × stagger). */
  readonly startSec: number;
  /** Per-bar / per-segment offset added on top of `startSec`. */
  readonly perSegmentOffset: ReadonlyArray<number>;
  /** Per-bar / per-segment series key (parallels `bars` / `segments`). */
  readonly seriesKeys: ReadonlyArray<string>;
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
  readonly domElement?: HTMLElement;
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
  private readonly domElement: HTMLElement | null;
  private readonly featuresByKey: ReadonlyMap<string, CountryFeature>;
  private layer: ChartsDataLayer;
  private animConfig: ResolvedHeatmapAnimationConfig = DISABLED_ANIMATION;
  private animElapsedSec = 0;
  private instances: Array<ChartInstance> = [];
  /** Cached so `tick()` doesn't re-resolve the easing every frame. */
  private easingFn: (t: number) => number = (t) => t;
  private readonly raycaster: Raycaster;
  private readonly pointer: Vector2;
  private pointerAttached = false;
  private labelsOverlay: ChartsLabelsOverlay | null = null;
  /** Maps a chart's mesh.uuid → instance index for fast raycast lookups. */
  private readonly meshIndex = new Map<string, { instance: ChartInstance; segmentIndex: number }>();

  public constructor(options: ChartsLayerOptions) {
    this.group = new Group();
    this.group.name = 'ChartsLayer';
    this.fallbackColor = options.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    this.camera = options.camera ?? null;
    this.domElement = options.domElement ?? null;
    this.featuresByKey = buildFeatureIndex(options.countryFeatures ?? []);
    this.layer = options.layer;
    this.raycaster = new Raycaster();
    this.pointer = new Vector2();
    this.applyData(options.layer);
    this.maybeAttachPointer();
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
    this.maybeAttachPointer();
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
    if (this.labelsOverlay && this.camera) {
      this.labelsOverlay.update(this.camera);
    }
  }

  /** Restart the mount animation from `t=0`. Story-engine bridge hook. */
  public playAnimation(): void {
    if (!this.animConfig.enabled) return;
    this.animElapsedSec = 0;
    this.applyAnimation();
  }

  public dispose(): void {
    this.detachPointer();
    if (this.labelsOverlay) {
      this.labelsOverlay.dispose();
      this.labelsOverlay = null;
    }
    this.disposeInstances();
  }

  // -------------------------------------------------------------------------
  // Pointer events — raycaster on every chart's bar / segment meshes.
  // The mesh-uuid index is rebuilt every setData() so we can resolve a hit
  // back to its (chart instance, segment index) pair in O(1).
  // -------------------------------------------------------------------------

  private maybeAttachPointer(): void {
    if (this.pointerAttached) return;
    if (!this.camera || !this.domElement) return;
    const wantsEvents = Boolean(this.layer.events?.onClick || this.layer.events?.onHover);
    if (!wantsEvents) return;
    const el = this.domElement;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    this.pointerAttached = true;
  }

  private detachPointer(): void {
    if (!this.pointerAttached || !this.domElement) return;
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.pointerAttached = false;
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    const hit = this.raycastSegment(event);
    this.layer.events?.onHover?.(hit);
    if (this.labelsOverlay) {
      this.labelsOverlay.setHoveredEntry(hit?.entryIndex ?? -1);
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const hit = this.raycastSegment(event);
    if (hit) this.layer.events?.onClick?.(hit);
  };

  /** Single rebuild path for the meshIndex — called every applyData(). */
  private rebuildMeshIndex(): void {
    this.meshIndex.clear();
    for (const inst of this.instances) {
      if (inst.bars) {
        for (let i = 0; i < inst.bars.length; i++) {
          this.meshIndex.set(inst.bars[i]!.mesh.uuid, { instance: inst, segmentIndex: i });
        }
      }
      if (inst.segments) {
        for (let i = 0; i < inst.segments.length; i++) {
          this.meshIndex.set(inst.segments[i]!.mesh.uuid, { instance: inst, segmentIndex: i });
        }
      }
    }
  }

  private raycastSegment(event: PointerEvent): ChartsHoverPayload | null {
    if (!this.camera || !this.domElement) return null;
    if (this.instances.length === 0) return null;
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // Recursive raycast against the layer group — picks up every bar /
    // segment mesh inside every chart instance with one call.
    const hits = this.raycaster.intersectObject(this.group, true);
    if (hits.length === 0) return null;
    const lookup = this.meshIndex.get(hits[0]!.object.uuid);
    if (!lookup) return null;
    const { instance, segmentIndex } = lookup;
    const seriesKey = instance.seriesKeys[segmentIndex] ?? null;
    const value = seriesKey ? (instance.entry.values[seriesKey] ?? 0) : 0;
    return {
      entry: instance.entry,
      entryIndex: instance.entryIndex,
      seriesKey,
      seriesIndex: segmentIndex,
      value,
    };
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
    // Flat charts (pie/donut/gauge/sunburst) read best when billboarded
    // toward the camera so they don't squash into ellipses at high latitudes.
    const faceCameraDefault =
      layer.chartType === 'pie' ||
      layer.chartType === 'donut' ||
      layer.chartType === 'gauge' ||
      layer.chartType === 'sunburst';
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
    this.rebuildMeshIndex();
    this.applyLabels();
  }

  private applyLabels(): void {
    const resolved = resolveLabelsConfig(this.layer.labels);
    if (!resolved.enabled) {
      if (this.labelsOverlay) {
        this.labelsOverlay.dispose();
        this.labelsOverlay = null;
      }
      return;
    }
    if (!this.domElement) return;
    if (!this.labelsOverlay) {
      this.labelsOverlay = new ChartsLabelsOverlay(this.domElement, resolved);
    } else {
      this.labelsOverlay.updateConfig(resolved);
    }
    this.labelsOverlay.setLabels(
      this.instances.map((i) => ({ entry: i.entry, anchor: i.group }))
    );
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
    // Per-entry override composes with the layer-level stagger (matches
    // the heatmap pattern). `enabled: false` on an entry effectively
    // pushes its start time past the animation window so it never plays.
    const entryDelay = entryAnimationDelaySec(
      entry.animation,
      this.animConfig.stagger,
      index
    );
    const startSec = entryDelay.enabled
      ? this.animConfig.delay + entryDelay.delay
      : this.animConfig.delay + this.animConfig.duration + 1e6;
    const segmentStaggerSec = Math.max(0, layer.segmentStagger ?? 0) / 1000;
    const segmentCount = bars ? bars.length : segments?.length ?? 0;
    const perSegmentOffset: Array<number> = new Array(segmentCount);
    const seriesKeys: Array<string> = new Array(segmentCount);
    for (let i = 0; i < segmentCount; i++) {
      perSegmentOffset[i] = i * segmentStaggerSec;
      seriesKeys[i] = layer.series[i]?.key ?? '';
    }
    return {
      group,
      anchor,
      entry,
      entryIndex: index,
      chartType: layer.chartType,
      faceCamera,
      startSec,
      perSegmentOffset,
      seriesKeys,
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
      const tForSeg = (i: number): number => {
        const local = clampCpu(
          (this.animElapsedSec - inst.startSec - (inst.perSegmentOffset[i] ?? 0)) /
            cfg.duration,
          0,
          1
        );
        return this.easingFn(local);
      };
      if (inst.bars) {
        // Bars-grouped / bars-stacked / radial — each bar animates with
        // its own per-segment t. For stacked, that gives a "stack rising
        // through segments" feel; for radial, a clockwise sweep.
        let stackBase = 0;
        const isStacked = inst.chartType === 'bars-stacked';
        for (let i = 0; i < inst.bars.length; i++) {
          const bar = inst.bars[i]!;
          const t = tForSeg(i);
          const scale = cfg.style === 'fade' ? 1 : t;
          const alpha = baseOpacity * t;
          bar.mesh.scale.y = bar.targetHeight * scale;
          if (isStacked) {
            // Recompute stack Y so partially-grown segments sit on top of
            // already-grown ones rather than overlapping or floating in air.
            bar.mesh.position.y = stackBase;
            stackBase += bar.targetHeight * scale;
          }
          bar.material.opacity = alpha;
        }
      }
      if (inst.segments) {
        // Pie / donut — chart group scales as a whole with the FIRST
        // segment's t (so the chart "pops" in), but each segment fades
        // alpha individually with its own per-segment t (visible "wipe"
        // around the ring).
        const firstT = tForSeg(0);
        const groupScale = cfg.style === 'fade' ? 1 : firstT;
        inst.group.scale.setScalar(Math.max(0.0001, groupScale));
        for (let i = 0; i < inst.segments.length; i++) {
          const seg = inst.segments[i]!;
          const t = tForSeg(i);
          seg.material.opacity = baseOpacity * t;
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
    case 'gauge': {
      const { group, segments } = buildGaugeChart(entry, layer.series, layer, fallbackColor);
      return segments.length === 0 ? null : { group, segments };
    }
    case 'sunburst': {
      const { group, segments } = buildSunburstChart(entry, layer.series, layer, fallbackColor);
      return segments.length === 0 ? null : { group, segments };
    }
  }
};

import { Vector3 as _Vector3 } from 'three';
/** Re-used scratch vector; `applyBillboard` overwrites it each call. */
const LOCAL_UP_VEC3 = new _Vector3();
