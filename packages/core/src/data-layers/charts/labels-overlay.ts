import { Vector3, type Camera, type Object3D } from 'three';
import type { ChartsDataEntry, ChartsLabelsConfig } from '../types';

/**
 * HTML labels overlay for the charts layer. Owns one root container that's
 * inserted alongside the renderer canvas (or at body level if the canvas
 * has no parent), with one label `<div>` per chart instance. Per frame,
 * projects each anchor to screen pixels and updates `transform: translate(...)`
 * so labels track their charts as the globe rotates / camera moves.
 *
 * Modes:
 *  - 'always'    — always visible (with horizon fade)
 *  - 'hover'     — hidden until a chart is hovered (set via setHoveredEntry)
 *  - 'occlusion' — visible only when the anchor is on the visible hemisphere
 *
 * Labels are pure DOM (no CSS3DRenderer) — keeps the bundle thin and lets
 * users restyle freely via container.querySelector('.charts-label').
 */
export interface ChartLabel {
  readonly entry: ChartsDataEntry;
  readonly entryIndex: number;
  /** Source 3D anchor — projected to screen each frame via getWorldPosition(). */
  readonly anchor: Object3D;
  readonly el: HTMLDivElement;
}

export interface LabelsOverlayResolved {
  readonly enabled: boolean;
  readonly mode: 'always' | 'hover' | 'occlusion';
  readonly fontSize: number;
  readonly color: string;
  readonly backgroundColor: string;
  readonly offsetPx: number;
  readonly format: (entry: ChartsDataEntry) => string;
}

const DEFAULT: LabelsOverlayResolved = {
  enabled: false,
  mode: 'hover',
  fontSize: 12,
  color: '#ffd700',
  backgroundColor: 'rgba(8,12,24,0.78)',
  offsetPx: -28,
  format: (e) => e.label ?? e.id ?? '',
};

export const resolveLabelsConfig = (
  input: boolean | ChartsLabelsConfig | undefined
): LabelsOverlayResolved => {
  if (input === undefined || input === false) return DEFAULT;
  if (input === true) return { ...DEFAULT, enabled: true };
  if (input.enabled === false) return DEFAULT;
  return {
    enabled: true,
    mode: input.mode ?? DEFAULT.mode,
    fontSize: input.fontSize ?? DEFAULT.fontSize,
    color: input.color ?? DEFAULT.color,
    backgroundColor: input.backgroundColor ?? DEFAULT.backgroundColor,
    offsetPx: input.offsetPx ?? DEFAULT.offsetPx,
    format: input.format ?? DEFAULT.format,
  };
};

const SCRATCH_VEC = new Vector3();
const SCRATCH_VEC_2 = new Vector3();
const SCRATCH_TO_CAMERA = new Vector3();

export class ChartsLabelsOverlay {
  private readonly container: HTMLDivElement;
  private readonly labels: Array<ChartLabel> = [];
  private readonly canvas: HTMLElement;
  private cfg: LabelsOverlayResolved;
  private hoveredEntryIndex = -1;

  public constructor(canvas: HTMLElement, cfg: LabelsOverlayResolved) {
    this.canvas = canvas;
    this.cfg = cfg;
    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.inset = '0';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '5';
    this.container.style.overflow = 'hidden';
    const parent = canvas.parentElement ?? document.body;
    parent.appendChild(this.container);
  }

  public setLabels(
    entries: ReadonlyArray<{ entry: ChartsDataEntry; entryIndex: number; anchor: Object3D }>
  ): void {
    // Tear down old DOM, rebuild from scratch — entry counts are 10²–10³,
    // so plain rebuild is faster than diffing.
    for (const l of this.labels) l.el.remove();
    this.labels.length = 0;
    for (const { entry, entryIndex, anchor } of entries) {
      const el = document.createElement('div');
      el.className = 'charts-label';
      el.textContent = this.cfg.format(entry);
      this.applyStyle(el);
      this.container.appendChild(el);
      this.labels.push({ entry, entryIndex, anchor, el });
    }
  }

  public updateConfig(cfg: LabelsOverlayResolved): void {
    this.cfg = cfg;
    for (const l of this.labels) {
      l.el.textContent = cfg.format(l.entry);
      this.applyStyle(l.el);
    }
  }

  public setHoveredEntry(entryIndex: number): void {
    this.hoveredEntryIndex = entryIndex;
  }

  public dispose(): void {
    for (const l of this.labels) l.el.remove();
    this.labels.length = 0;
    this.container.remove();
  }

  /**
   * Per-frame projection. The label's anchor is an `Object3D` so its
   * world matrix (including any parent globe-group axis tilt) is applied
   * automatically via getWorldPosition().
   */
  public update(camera: Camera): void {
    if (this.labels.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cameraPos = SCRATCH_VEC_2.copy(camera.position);
    for (let i = 0; i < this.labels.length; i++) {
      const label = this.labels[i]!;
      label.anchor.getWorldPosition(SCRATCH_VEC);
      // Visibility check: hover-only mode hides everything except the hovered chart.
      const isHover =
        this.cfg.mode === 'hover' && this.hoveredEntryIndex === label.entryIndex;
      if (this.cfg.mode === 'hover' && !isHover) {
        label.el.style.display = 'none';
        continue;
      }
      // Occlusion check (always + occlusion modes): hide labels on the
      // far hemisphere by comparing dot(anchor → camera, anchor radial).
      const anchor = SCRATCH_VEC;
      if (this.cfg.mode === 'occlusion' || this.cfg.mode === 'always') {
        const radial = anchor.length();
        const toCam = SCRATCH_TO_CAMERA.copy(anchor).sub(cameraPos);
        const dot = anchor.x * toCam.x + anchor.y * toCam.y + anchor.z * toCam.z;
        // If the anchor's outward direction faces away from the camera, it's occluded.
        if (this.cfg.mode === 'occlusion' && dot > 0) {
          label.el.style.display = 'none';
          continue;
        }
        // Faintly fade as the anchor approaches the limb.
        const faceFactor = Math.max(0, -dot / Math.max(0.001, radial * toCam.length()));
        label.el.style.opacity = String(Math.min(1, 0.2 + faceFactor * 1.2));
      } else {
        label.el.style.opacity = '1';
      }
      // Project to NDC then to pixels.
      const ndc = anchor.project(camera);
      // Behind camera (z >= 1) → hide.
      if (ndc.z >= 1) {
        label.el.style.display = 'none';
        continue;
      }
      const x = (ndc.x * 0.5 + 0.5) * w;
      const y = (1 - (ndc.y * 0.5 + 0.5)) * h + this.cfg.offsetPx;
      label.el.style.display = 'block';
      label.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    }
  }

  private applyStyle(el: HTMLDivElement): void {
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.fontSize = `${this.cfg.fontSize}px`;
    el.style.color = this.cfg.color;
    el.style.background = this.cfg.backgroundColor;
    el.style.padding = '3px 8px';
    el.style.borderRadius = '4px';
    el.style.pointerEvents = 'none';
    el.style.whiteSpace = 'nowrap';
    el.style.fontFamily = 'system-ui, sans-serif';
    el.style.lineHeight = '1.2';
    el.style.fontWeight = '500';
    el.style.willChange = 'transform';
  }
}
