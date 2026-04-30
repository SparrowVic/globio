import { Group } from 'three';
import type { HexBinDataLayer } from '../types';
import {
  DISABLED_ANIMATION,
  easingFunctionFor,
  resolveAnimationConfig,
  type ResolvedHeatmapAnimationConfig,
} from '../heatmap/animation';
import { clampCpu } from '../heatmap/polygon-utils';
import { aggregateSamples } from './aggregator';
import { buildIcosphere, type IcosphereData } from './icosphere';
import { HexBinMesh } from './hexbin-mesh';

const DEFAULT_RESOLUTION = 3;
const DEFAULT_HEIGHT_MIN = 0;
const DEFAULT_HEIGHT_MAX = 0.06;
const DEFAULT_CELL_INSET = 0.94;
const DEFAULT_FALLBACK_COLOR = '#5cb8ff';
const DEFAULT_NO_DATA_COLOR = '#1f2a44';

export interface HexBinLayerOptions {
  readonly layer: HexBinDataLayer;
  readonly fallbackColor?: string;
}

/**
 * Hex-bin orchestrator — mirrors `HeatmapLayer` / `ChartsLayer`. Owns one
 * `HexBinMesh` placed in `this.group`; `setData(layer)` rebuilds the
 * icosphere only when resolution changes (the icosphere builder caches
 * up to level 5 internally) and re-aggregates samples each call.
 *
 * Animation: per-face stagger by face index × stagger. Each face has its
 * own `t` from `(elapsed - faceStart) / duration`; we batch update the
 * mesh's animation buffer every frame and the mesh re-positions vertices
 * outward along the shell normal in-place.
 */
export class HexBinLayer {
  public readonly group: Group;
  private layerCfg: HexBinDataLayer;
  private mesh: HexBinMesh | null = null;
  private icosphere: IcosphereData;
  private readonly fallbackColor: string;
  private animConfig: ResolvedHeatmapAnimationConfig = DISABLED_ANIMATION;
  private animElapsedSec = 0;
  private faceStartSec: Float32Array = new Float32Array(0);
  private faceAnimScale: Float32Array = new Float32Array(0);
  private easingFn: (t: number) => number = (t) => t;
  /** Stable height range cached so `tick()` doesn't pull from `layerCfg` each frame. */
  private heightRange = { min: DEFAULT_HEIGHT_MIN, max: DEFAULT_HEIGHT_MAX };

  public constructor(options: HexBinLayerOptions) {
    this.group = new Group();
    this.group.name = 'HexBinLayer';
    this.fallbackColor = options.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    this.layerCfg = options.layer;
    this.icosphere = buildIcosphere(options.layer.resolution ?? DEFAULT_RESOLUTION);
    this.applyData(options.layer);
  }

  /**
   * Replace the layer config / data. Re-aggregates and re-paints. When
   * `resolution` changed the mesh is fully rebuilt; otherwise we just
   * push new colours/heights into the existing buffers.
   */
  public setData(layer: HexBinDataLayer): void {
    const newResolution = layer.resolution ?? DEFAULT_RESOLUTION;
    const oldResolution = this.icosphere.level;
    this.layerCfg = layer;
    if (newResolution !== oldResolution) {
      this.icosphere = buildIcosphere(newResolution);
      this.disposeMesh();
    }
    this.applyData(layer);
  }

  /**
   * Per-frame tick. Advances `animElapsedSec`, computes per-face animation
   * scale through the easing curve, and pushes it into the mesh as both
   * extrusion height AND per-face RGB intensity — so cells *fade in* (not
   * just rise) as their stagger window opens. Layer-wide material opacity
   * stays at the slider value; the per-face RGB scaling drives the bloom.
   */
  public tick(deltaSec: number): void {
    if (!this.animConfig.enabled || !this.mesh) return;
    if (!this.animHasMore()) return;
    this.animElapsedSec += Math.max(0, deltaSec);
    const cfg = this.animConfig;
    for (let f = 0; f < this.faceStartSec.length; f++) {
      const local = clampCpu(
        (this.animElapsedSec - this.faceStartSec[f]!) / cfg.duration,
        0,
        1
      );
      this.faceAnimScale[f] = this.easingFn(local);
    }
    this.mesh.applyAnimation(this.faceAnimScale, this.heightRange);
  }

  /** Restart the mount animation from `t=0`. Story-bridge hook. */
  public playAnimation(): void {
    if (!this.animConfig.enabled || !this.mesh) return;
    this.animElapsedSec = 0;
    this.faceAnimScale.fill(0);
    this.mesh.applyAnimation(this.faceAnimScale, this.heightRange);
  }

  public dispose(): void {
    this.disposeMesh();
  }

  // -------------------------------------------------------------------------
  // internals
  // -------------------------------------------------------------------------

  private applyData(layer: HexBinDataLayer): void {
    this.heightRange = {
      min: layer.height?.min ?? DEFAULT_HEIGHT_MIN,
      max: layer.height?.max ?? DEFAULT_HEIGHT_MAX,
    };
    this.animConfig = resolveAnimationConfig(layer.animation);
    this.easingFn = easingFunctionFor(this.animConfig.easing);

    if (!this.mesh) {
      const cellInset = clampCpu(layer.cellInset ?? DEFAULT_CELL_INSET, 0.5, 1);
      this.mesh = new HexBinMesh({
        icosphere: this.icosphere,
        cellInset,
        opacity: layer.opacity ?? 1,
        noDataColor: DEFAULT_NO_DATA_COLOR,
        heightRange: this.heightRange,
        lift: 1.001,
      });
      this.group.add(this.mesh.mesh);
    }

    const aggregate = layer.aggregate ?? 'sum';
    const samples = layer.data.map((d) => ({
      position: d.position,
      ...(d.value !== undefined ? { value: d.value } : {}),
    }));
    const bins = aggregateSamples(samples, this.icosphere.faceCentroids, aggregate);

    this.mesh.update(
      bins.values,
      bins.extent,
      layer.scale,
      this.fallbackColor,
      layer.showEmpty ?? false,
      this.heightRange,
      DEFAULT_NO_DATA_COLOR
    );

    // Reset animation state and seed face start times.
    this.animElapsedSec = 0;
    const faceCount = this.icosphere.faceCentroids.length / 3;
    if (this.faceStartSec.length !== faceCount) {
      this.faceStartSec = new Float32Array(faceCount);
      this.faceAnimScale = new Float32Array(faceCount);
    }
    for (let f = 0; f < faceCount; f++) {
      this.faceStartSec[f] = this.animConfig.delay + f * this.animConfig.stagger;
      this.faceAnimScale[f] = this.animConfig.enabled ? 0 : 1;
    }
    this.mesh.applyAnimation(this.faceAnimScale, this.heightRange);
    this.mesh.setOpacity(this.layerCfg.opacity ?? 1);
  }

  private animHasMore(): boolean {
    if (!this.animConfig.enabled) return false;
    const total =
      this.animConfig.delay + this.animConfig.duration + this.lastFaceStartSec();
    return this.animElapsedSec < total + 0.05;
  }

  private lastFaceStartSec(): number {
    let max = 0;
    for (let f = 0; f < this.faceStartSec.length; f++) {
      const v = this.faceStartSec[f]!;
      if (v > max) max = v;
    }
    return max;
  }

  private disposeMesh(): void {
    if (!this.mesh) return;
    this.group.remove(this.mesh.mesh);
    this.mesh.dispose();
    this.mesh = null;
  }
}
