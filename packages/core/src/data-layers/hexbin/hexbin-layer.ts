import { Group, Raycaster, Vector2, Vector3, type Camera } from 'three';
import type { HexBinDataLayer, HexBinHoverPayload } from '../types';
import {
  DISABLED_ANIMATION,
  easingFunctionFor,
  resolveAnimationConfig,
  type ResolvedHeatmapAnimationConfig,
} from '../heatmap/animation';
import { clampCpu } from '../heatmap/polygon-utils';
import { latLngToVector3, vector3ToLatLng } from '../../utils/coordinates';
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
const ORIGIN_SCRATCH = new Vector3();

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
  /** Latest per-cell sample counts — reported through hover/click payloads. */
  private currentCounts: Uint32Array = new Uint32Array(0);
  /** Cells currently rendered/interactable. Empty hidden cells are 0. */
  private currentVisibleFaces: Uint8Array = new Uint8Array(0);
  /** Internal raycaster scratch — only allocated when events/highlight are wired. */
  private readonly raycaster: Raycaster;
  private readonly pointer: Vector2;
  private readonly cornerScratch = new Float32Array(9);
  /** Whether `attachPointer()` has wired listeners on `domElement`. */
  private pointerAttached = false;
  private hoveredFace = -1;
  private meshCellInset = Number.NaN;
  private meshBorderKey = '';
  private highlightKey = '';

  public constructor(options: HexBinLayerOptions) {
    this.group = new Group();
    this.group.name = 'HexBinLayer';
    this.fallbackColor = options.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    this.camera = options.camera ?? null;
    this.domElement = options.domElement ?? null;
    this.layerCfg = options.layer;
    this.icosphere = buildIcosphere(resolveResolution(options.layer.resolution));
    this.raycaster = new Raycaster();
    this.pointer = new Vector2();
    this.applyData(options.layer);
    this.refreshPointerListeners();
  }

  /**
   * Replace the layer config / data. Re-aggregates and re-paints. When
   * `resolution` changed the mesh is fully rebuilt; otherwise we just
   * push new colours/heights into the existing buffers.
   */
  public setData(layer: HexBinDataLayer): void {
    const newResolution = resolveResolution(layer.resolution);
    const oldResolution = this.icosphere.level;
    const previousEvents = this.layerCfg.events;
    const wasHovering = this.hoveredFace >= 0;
    this.layerCfg = layer;
    this.hoveredFace = -1;
    this.highlight?.hide();
    if (wasHovering) previousEvents?.onHover?.(null);
    if (newResolution !== oldResolution) {
      this.icosphere = buildIcosphere(newResolution);
      this.disposeMesh();
      // Highlight / border are owned by the mesh; clear them on rebuild.
      if (this.highlight) {
        this.group.remove(this.highlight.mesh);
        this.highlight.dispose();
        this.highlight = null;
        this.highlightKey = '';
      }
    }
    this.applyData(layer);
    // Resolution change can't bring listeners online if dom/camera weren't
    // wired. But events / highlight toggling between calls IS legit, so
    // re-evaluate attachment.
    this.refreshPointerListeners();
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
        this.faceAnimScale[f] = 0.4 + clampFinite(eased, 0, 0, 1) * 0.6;
      }
    } else {
      for (let f = 0; f < this.faceStartSec.length; f++) {
        const local = clampCpu(
          (this.animElapsedSec - this.faceStartSec[f]!) / cfg.duration,
          0,
          1
        );
        this.faceAnimScale[f] = Math.max(0, finiteOr(this.easingFn(local), 0));
      }
    }
    this.mesh.applyAnimation(this.faceAnimScale, this.heightRange);
    if (this.highlight && this.highlight.faceIndex >= 0 && this.mesh) {
      this.mesh.getFaceCorners(this.highlight.faceIndex, this.cornerScratch);
      this.highlight.updateCorners(this.cornerScratch);
    }
  }

  /** Restart the mount animation from `t=0`. Story-bridge hook. */
  public playAnimation(): boolean {
    if (!this.animConfig.enabled || !this.mesh) return false;
    this.animElapsedSec = 0;
    this.faceAnimScale.fill(0);
    this.mesh.applyAnimation(this.faceAnimScale, this.heightRange);
    return true;
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
    this.heightRange = resolveHeightRange(layer.height);
    this.animConfig = resolveAnimationConfig(layer.animation);
    this.easingFn = easingFunctionFor(this.animConfig.easing);

    const border = resolveBorderConfig(layer.cellBorder);
    const highlightCfg = resolveHighlightConfig(layer.highlight);
    const cellInset = clampFinite(layer.cellInset, DEFAULT_CELL_INSET, 0, 1);
    const borderKey = border.enabled ? `${border.color}|${border.opacity}` : 'off';
    const highlightKey = highlightCfg.enabled
      ? `${highlightCfg.color}|${highlightCfg.opacity}|${highlightCfg.liftOffset}`
      : 'off';

    // Mesh requires border config at construction (LineSegments are owned
    // by the mesh). If border on/off changed between setData calls, drop
    // the mesh and rebuild — cheap relative to the bake.
    const meshNeedsRebuild =
      !this.mesh ||
      this.meshCellInset !== cellInset ||
      this.meshBorderKey !== borderKey;
    if (meshNeedsRebuild) {
      this.disposeMesh();
      this.mesh = new HexBinMesh({
        icosphere: this.icosphere,
        cellInset,
        opacity: resolveOpacity(layer.opacity),
        heightRange: this.heightRange,
        lift: 1.001,
        ...(border.enabled
          ? { border: { color: border.color, opacity: border.opacity } }
          : {}),
      });
      this.group.add(this.mesh.mesh);
      if (this.mesh.borderLines) this.group.add(this.mesh.borderLines);
      this.meshCellInset = cellInset;
      this.meshBorderKey = borderKey;
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
      } else if (this.highlightKey !== highlightKey) {
        this.highlight.updateStyle({
          color: highlightCfg.color,
          opacity: highlightCfg.opacity,
          liftOffset: highlightCfg.liftOffset,
        });
      }
      this.highlightKey = highlightKey;
    } else if (this.highlight) {
      this.group.remove(this.highlight.mesh);
      this.highlight.dispose();
      this.highlight = null;
      this.highlightKey = 'off';
    }

    const aggregate = layer.aggregate ?? 'sum';
    const samples = layer.data.map((d) => ({
      position: d.position,
      ...(d.value !== undefined ? { value: d.value } : {}),
    }));
    const bins = aggregateSamples(samples, this.icosphere.faceCentroids, aggregate);
    this.currentValues = bins.values;
    this.currentCounts = bins.sampleCounts;
    this.currentVisibleFaces = buildVisibleFaceMask(bins.values, layer.showEmpty ?? false);

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
      this.faceStartSec,
      this.currentVisibleFaces
    );
    for (let f = 0; f < faceCount; f++) {
      this.faceAnimScale[f] = this.animConfig.enabled ? 0 : 1;
    }
    this.mesh!.applyAnimation(this.faceAnimScale, this.heightRange);
    this.mesh!.setOpacity(resolveOpacity(this.layerCfg.opacity));
  }

  private animHasMore(): boolean {
    if (!this.animConfig.enabled) return false;
    const total = this.animConfig.duration + this.lastFaceStartSec();
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
      if (!isValidLatLng(d.position)) continue;
      const v = latLngToVector3(d.position, 1, ORIGIN_SCRATCH);
      cx += v.x;
      cy += v.y;
      cz += v.z;
    }
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
    if (len <= 1e-9) return this.animConfig.origin;
    return vector3ToLatLng(ORIGIN_SCRATCH.set(cx / len, cy / len, cz / len));
  }

  private disposeMesh(): void {
    if (!this.mesh) return;
    this.group.remove(this.mesh.mesh);
    if (this.mesh.borderLines) this.group.remove(this.mesh.borderLines);
    this.mesh.dispose();
    this.mesh = null;
    this.meshCellInset = Number.NaN;
    this.meshBorderKey = '';
    this.highlightKey = '';
  }

  // -------------------------------------------------------------------------
  // Pointer events + highlight
  // -------------------------------------------------------------------------

  /**
   * Wire pointermove + pointerdown listeners on the renderer canvas the
   * first time hover/click are needed. Attaching is idempotent — multiple
   * calls keep the single set of listeners. Detached on `dispose()`.
   */
  private refreshPointerListeners(): void {
    if (!this.camera || !this.domElement) return;
    const cfg = this.layerCfg;
    const wantsEvents = Boolean(cfg.events?.onHover || cfg.events?.onClick);
    const wantsHighlight = resolveHighlightConfig(cfg.highlight).enabled;
    if (!wantsEvents && !wantsHighlight) {
      this.detachPointer();
      return;
    }
    if (this.pointerAttached) return;
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
    if (!this.mesh || !this.mesh.isFaceVisible(face)) face = -1;
    const previous = this.hoveredFace;
    if (face === previous) return;
    this.hoveredFace = face;
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
    for (const hit of hits) {
      if (hit.faceIndex === undefined) continue;
      // Each face = 1 triangle = 3 verts; faceIndex is already the cell index
      // because our geometry is non-indexed and laid out one cell per triangle.
      if (this.mesh.isFaceVisible(hit.faceIndex)) return hit.faceIndex;
    }
    return -1;
  }

  private buildPayload(face: number): HexBinHoverPayload {
    const value = this.currentValues[face] ?? Number.NaN;
    const lat = this.icosphere.faceLatLng[face * 2] ?? 0;
    const lng = this.icosphere.faceLatLng[face * 2 + 1] ?? 0;
    return {
      cellIndex: face,
      value,
      sampleCount: this.currentCounts[face] ?? 0,
      empty: !Number.isFinite(value),
      position: [lat, lng],
    };
  }

  /** Programmatically set the highlight cell, e.g. driven by storytelling. */
  public setHighlight(faceIndex: number | null): void {
    this.handleHover(faceIndex ?? -1);
  }
}

const resolveResolution = (input: HexBinDataLayer['resolution']): number => {
  const n = input ?? DEFAULT_RESOLUTION;
  if (!Number.isFinite(n)) return DEFAULT_RESOLUTION;
  return Math.max(0, Math.min(5, Math.round(n)));
};

const resolveHeightRange = (
  input: HexBinDataLayer['height']
): { readonly min: number; readonly max: number } => {
  const min = Math.max(0, finiteOr(input?.min, DEFAULT_HEIGHT_MIN));
  const rawMax = Math.max(0, finiteOr(input?.max, DEFAULT_HEIGHT_MAX));
  return { min, max: Math.max(min, rawMax) };
};

const buildVisibleFaceMask = (values: Float32Array, showEmpty: boolean): Uint8Array => {
  const out = new Uint8Array(values.length);
  if (showEmpty) {
    out.fill(1);
    return out;
  }
  for (let i = 0; i < values.length; i++) {
    out[i] = Number.isFinite(values[i]!) ? 1 : 0;
  }
  return out;
};

const resolveHighlightConfig = (input: HexBinDataLayer['highlight']): ResolvedHighlight => {
  if (input === undefined || input === false) return DEFAULT_HIGHLIGHT;
  if (input === true) return { ...DEFAULT_HIGHLIGHT, enabled: true };
  if (input.enabled === false) return DEFAULT_HIGHLIGHT;
  return {
    enabled: true,
    color: input.color ?? DEFAULT_HIGHLIGHT.color,
    liftOffset: Math.max(0, finiteOr(input.liftOffset, DEFAULT_HIGHLIGHT.liftOffset)),
    opacity: clampFinite(input.opacity, DEFAULT_HIGHLIGHT.opacity, 0, 1),
  };
};

const resolveBorderConfig = (input: HexBinDataLayer['cellBorder']): ResolvedBorder => {
  if (input === undefined || input === false) return DEFAULT_BORDER;
  if (input === true) return { ...DEFAULT_BORDER, enabled: true };
  if (input.enabled === false) return DEFAULT_BORDER;
  return {
    enabled: true,
    color: input.color ?? DEFAULT_BORDER.color,
    opacity: clampFinite(input.opacity, DEFAULT_BORDER.opacity, 0, 1),
  };
};

const finiteOr = (value: number | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const clampFinite = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number => clampCpu(finiteOr(value, fallback), min, max);

const resolveOpacity = (value: number | undefined): number => clampFinite(value, 1, 0, 1);

const isValidLatLng = (position: readonly [number, number]): boolean => {
  const [lat, lng] = position;
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90;
};
