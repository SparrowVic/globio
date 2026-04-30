import { Group, Raycaster, Vector2, type Camera } from 'three';
import type { HexBinDataLayer, HexBinHoverPayload } from '../types';
import {
  DISABLED_ANIMATION,
  easingFunctionFor,
  resolveAnimationConfig,
  type ResolvedHeatmapAnimationConfig,
} from '../heatmap/animation';
import { clampCpu } from '../heatmap/polygon-utils';
import { aggregateSamples } from './aggregator';
import { buildFaceStartTimes } from './face-ordering';
import { buildIcosphere, type IcosphereData } from './icosphere';
import { HexBinHighlight } from './hexbin-highlight';
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
  /** Camera + dom element are required for pointer hover/click events. */
  readonly camera?: Camera;
  readonly domElement?: HTMLElement;
}

interface ResolvedHighlight {
  readonly enabled: boolean;
  readonly color: string;
  readonly liftOffset: number;
  readonly opacity: number;
}

const DEFAULT_HIGHLIGHT: ResolvedHighlight = {
  enabled: false,
  color: '#ffffff',
  liftOffset: 0.012,
  opacity: 0.55,
};

interface ResolvedBorder {
  readonly enabled: boolean;
  readonly color: string;
  readonly opacity: number;
}

const DEFAULT_BORDER: ResolvedBorder = {
  enabled: false,
  color: '#ffffff',
  opacity: 0.35,
};

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
  private highlight: HexBinHighlight | null = null;
  private icosphere: IcosphereData;
  private readonly fallbackColor: string;
  private readonly camera: Camera | null;
  private readonly domElement: HTMLElement | null;
  private animConfig: ResolvedHeatmapAnimationConfig = DISABLED_ANIMATION;
  private animElapsedSec = 0;
  private faceStartSec: Float32Array = new Float32Array(0);
  private faceAnimScale: Float32Array = new Float32Array(0);
  private easingFn: (t: number) => number = (t) => t;
  private heightRange = { min: DEFAULT_HEIGHT_MIN, max: DEFAULT_HEIGHT_MAX };
  /** Latest aggregated values — kept around so hover/click can report value. */
  private currentValues: Float32Array = new Float32Array(0);
  /** Internal raycaster scratch — only allocated when events/highlight are wired. */
  private readonly raycaster: Raycaster;
  private readonly pointer: Vector2;
  private readonly cornerScratch = new Float32Array(9);
  /** Whether `attachPointer()` has wired listeners on `domElement`. */
  private pointerAttached = false;

  public constructor(options: HexBinLayerOptions) {
    this.group = new Group();
    this.group.name = 'HexBinLayer';
    this.fallbackColor = options.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    this.camera = options.camera ?? null;
    this.domElement = options.domElement ?? null;
    this.layerCfg = options.layer;
    this.icosphere = buildIcosphere(options.layer.resolution ?? DEFAULT_RESOLUTION);
    this.raycaster = new Raycaster();
    this.pointer = new Vector2();
    this.applyData(options.layer);
    this.maybeAttachPointer();
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
      // Highlight / border are owned by the mesh; clear them on rebuild.
      if (this.highlight) {
        this.group.remove(this.highlight.mesh);
        this.highlight.dispose();
        this.highlight = null;
      }
    }
    this.applyData(layer);
    // Resolution change can't bring listeners online if dom/camera weren't
    // wired. But events / highlight toggling between calls IS legit, so
    // re-evaluate attachment.
    this.maybeAttachPointer();
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
    const cfg = this.animConfig;
    const isPulse = cfg.style === 'pulse';
    if (!isPulse && !this.animHasMore()) return;
    this.animElapsedSec += Math.max(0, deltaSec);
    if (isPulse) {
      // Heartbeat mode: each face oscillates between 0.4 and 1.0 on a
      // sine wave with `duration` period, phase-offset by faceStartSec
      // so per-cell stagger reads as a wave travelling across the globe.
      const period = Math.max(1e-3, cfg.duration);
      const twoPi = Math.PI * 2;
      for (let f = 0; f < this.faceStartSec.length; f++) {
        const phase = ((this.animElapsedSec - this.faceStartSec[f]!) / period) * twoPi;
        const raw = (Math.sin(phase) + 1) * 0.5;
        const eased = this.easingFn(raw);
        this.faceAnimScale[f] = 0.4 + eased * 0.6;
      }
    } else {
      for (let f = 0; f < this.faceStartSec.length; f++) {
        const local = clampCpu(
          (this.animElapsedSec - this.faceStartSec[f]!) / cfg.duration,
          0,
          1
        );
        this.faceAnimScale[f] = this.easingFn(local);
      }
    }
    this.mesh.applyAnimation(this.faceAnimScale, this.heightRange);
    if (this.highlight && this.highlight.faceIndex >= 0 && this.mesh) {
      this.mesh.getFaceCorners(this.highlight.faceIndex, this.cornerScratch);
      this.highlight.updateCorners(this.cornerScratch);
    }
  }

  /** Restart the mount animation from `t=0`. Story-bridge hook. */
  public playAnimation(): void {
    if (!this.animConfig.enabled || !this.mesh) return;
    this.animElapsedSec = 0;
    this.faceAnimScale.fill(0);
    this.mesh.applyAnimation(this.faceAnimScale, this.heightRange);
  }

  public dispose(): void {
    this.detachPointer();
    if (this.highlight) {
      this.group.remove(this.highlight.mesh);
      this.highlight.dispose();
      this.highlight = null;
    }
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

    const border = resolveBorderConfig(layer.cellBorder);
    const highlightCfg = resolveHighlightConfig(layer.highlight);

    // Mesh requires border config at construction (LineSegments are owned
    // by the mesh). If border on/off changed between setData calls, drop
    // the mesh and rebuild — cheap relative to the bake.
    const meshNeedsRebuild =
      !this.mesh ||
      Boolean(this.mesh.borderLines) !== border.enabled ||
      // Inset is also baked into base positions, so changing it = rebuild.
      false;
    if (meshNeedsRebuild) {
      this.disposeMesh();
      const cellInset = clampCpu(layer.cellInset ?? DEFAULT_CELL_INSET, 0.5, 1);
      this.mesh = new HexBinMesh({
        icosphere: this.icosphere,
        cellInset,
        opacity: layer.opacity ?? 1,
        noDataColor: DEFAULT_NO_DATA_COLOR,
        heightRange: this.heightRange,
        lift: 1.001,
        ...(border.enabled
          ? { border: { color: border.color, opacity: border.opacity } }
          : {}),
      });
      this.group.add(this.mesh.mesh);
      if (this.mesh.borderLines) this.group.add(this.mesh.borderLines);
    }

    // Highlight: build/teardown overlay based on resolved config.
    if (highlightCfg.enabled) {
      if (!this.highlight) {
        this.highlight = new HexBinHighlight({
          color: highlightCfg.color,
          opacity: highlightCfg.opacity,
          liftOffset: highlightCfg.liftOffset,
        });
        this.group.add(this.highlight.mesh);
      }
    } else if (this.highlight) {
      this.group.remove(this.highlight.mesh);
      this.highlight.dispose();
      this.highlight = null;
    }

    const aggregate = layer.aggregate ?? 'sum';
    const samples = layer.data.map((d) => ({
      position: d.position,
      ...(d.value !== undefined ? { value: d.value } : {}),
    }));
    const bins = aggregateSamples(samples, this.icosphere.faceCentroids, aggregate);
    this.currentValues = bins.values;

    this.mesh!.update(
      bins.values,
      bins.extent,
      layer.scale,
      this.fallbackColor,
      layer.showEmpty ?? false,
      this.heightRange,
      DEFAULT_NO_DATA_COLOR
    );

    // Reset animation state and seed face start times via the chosen
    // ordering (sequential / radial / value / reverse-value / random).
    this.animElapsedSec = 0;
    const faceCount = this.icosphere.faceCentroids.length / 3;
    if (this.faceStartSec.length !== faceCount) {
      this.faceStartSec = new Float32Array(faceCount);
      this.faceAnimScale = new Float32Array(faceCount);
    }
    // For radial ordering, default the origin to the data's spherical
    // centroid when the user didn't pin one explicitly — this makes
    // 'radial' meaningful even with no extra config.
    const radialOrigin = this.resolveRadialOrigin(layer);
    buildFaceStartTimes(
      faceCount,
      bins.values,
      this.icosphere.faceLatLng,
      this.animConfig.delay,
      this.animConfig.stagger,
      this.animConfig.order,
      radialOrigin,
      this.faceStartSec
    );
    for (let f = 0; f < faceCount; f++) {
      this.faceAnimScale[f] = this.animConfig.enabled ? 0 : 1;
    }
    this.mesh!.applyAnimation(this.faceAnimScale, this.heightRange);
    this.mesh!.setOpacity(this.layerCfg.opacity ?? 1);
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

  /**
   * Decide where the radial-bloom anchor sits. If the user passed
   * `animation.origin` explicitly we honour it; otherwise we average the
   * sample positions on the unit sphere and read back lat/lng. Empty
   * datasets fall back to [0, 0].
   */
  private resolveRadialOrigin(layer: HexBinDataLayer): import('../../types').LatLng {
    const cfg = layer.animation;
    const explicit =
      cfg && typeof cfg === 'object' && 'origin' in cfg ? cfg.origin : undefined;
    if (explicit) return explicit;
    if (this.animConfig.order !== 'radial' || layer.data.length === 0) {
      return this.animConfig.origin;
    }
    let cx = 0, cy = 0, cz = 0;
    for (const d of layer.data) {
      const lat = (d.position[0] * Math.PI) / 180;
      const lng = (d.position[1] * Math.PI) / 180;
      cx += Math.cos(lat) * Math.cos(lng);
      cy += Math.sin(lat);
      cz += Math.cos(lat) * Math.sin(lng);
    }
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1;
    cx /= len;
    cy /= len;
    cz /= len;
    const lat = (Math.asin(Math.max(-1, Math.min(1, cy))) * 180) / Math.PI;
    const lng = (Math.atan2(cz, cx) * 180) / Math.PI;
    return [lat, lng];
  }

  private disposeMesh(): void {
    if (!this.mesh) return;
    this.group.remove(this.mesh.mesh);
    if (this.mesh.borderLines) this.group.remove(this.mesh.borderLines);
    this.mesh.dispose();
    this.mesh = null;
  }

  // -------------------------------------------------------------------------
  // Pointer events + highlight
  // -------------------------------------------------------------------------

  /**
   * Wire pointermove + pointerdown listeners on the renderer canvas the
   * first time hover/click are needed. Attaching is idempotent — multiple
   * calls keep the single set of listeners. Detached on `dispose()`.
   */
  private maybeAttachPointer(): void {
    if (this.pointerAttached) return;
    if (!this.camera || !this.domElement) return;
    const cfg = this.layerCfg;
    const wantsEvents = Boolean(cfg.events?.onHover || cfg.events?.onClick);
    const wantsHighlight = resolveHighlightConfig(cfg.highlight).enabled;
    if (!wantsEvents && !wantsHighlight) return;
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
    const face = this.raycastFace(event);
    this.handleHover(face);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const face = this.raycastFace(event);
    if (face >= 0) {
      const payload = this.buildPayload(face);
      this.layerCfg.events?.onClick?.(payload);
    }
  };

  private handleHover(face: number): void {
    const previous = this.highlight?.faceIndex ?? -1;
    if (face === previous && (face >= 0 || !this.layerCfg.events?.onHover)) return;
    if (face >= 0 && this.mesh) {
      this.mesh.getFaceCorners(face, this.cornerScratch);
      this.highlight?.showFace(face, this.cornerScratch);
      this.layerCfg.events?.onHover?.(this.buildPayload(face));
    } else {
      this.highlight?.hide();
      if (previous >= 0) this.layerCfg.events?.onHover?.(null);
    }
  }

  /** Translate pointer event → eye-space ray → cell hit (or -1 = miss). */
  private raycastFace(event: PointerEvent): number {
    if (!this.camera || !this.domElement || !this.mesh) return -1;
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.mesh.mesh, false);
    if (hits.length === 0) return -1;
    const hit = hits[0]!;
    if (hit.faceIndex === undefined) return -1;
    // Each face = 1 triangle = 3 verts; faceIndex is already the cell index
    // because our geometry is non-indexed and laid out one cell per triangle.
    return hit.faceIndex;
  }

  private buildPayload(face: number): HexBinHoverPayload {
    const value = this.currentValues[face] ?? Number.NaN;
    const lat = this.icosphere.faceLatLng[face * 2] ?? 0;
    const lng = this.icosphere.faceLatLng[face * 2 + 1] ?? 0;
    return {
      cellIndex: face,
      value,
      empty: !Number.isFinite(value),
      position: [lat, lng],
    };
  }

  /** Programmatically set the highlight cell, e.g. driven by storytelling. */
  public setHighlight(faceIndex: number | null): void {
    this.handleHover(faceIndex ?? -1);
  }
}

const resolveHighlightConfig = (input: HexBinDataLayer['highlight']): ResolvedHighlight => {
  if (input === undefined || input === false) return DEFAULT_HIGHLIGHT;
  if (input === true) return { ...DEFAULT_HIGHLIGHT, enabled: true };
  if (input.enabled === false) return DEFAULT_HIGHLIGHT;
  return {
    enabled: true,
    color: input.color ?? DEFAULT_HIGHLIGHT.color,
    liftOffset: input.liftOffset ?? DEFAULT_HIGHLIGHT.liftOffset,
    opacity: input.opacity ?? DEFAULT_HIGHLIGHT.opacity,
  };
};

const resolveBorderConfig = (input: HexBinDataLayer['cellBorder']): ResolvedBorder => {
  if (input === undefined || input === false) return DEFAULT_BORDER;
  if (input === true) return { ...DEFAULT_BORDER, enabled: true };
  if (input.enabled === false) return DEFAULT_BORDER;
  return {
    enabled: true,
    color: input.color ?? DEFAULT_BORDER.color,
    opacity: input.opacity ?? DEFAULT_BORDER.opacity,
  };
};
