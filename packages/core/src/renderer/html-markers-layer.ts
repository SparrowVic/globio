import { Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../utils/coordinates';
import type { HtmlMarkerConfig } from '../types';

export interface HtmlMarkersLayerOptions {
  readonly container: HTMLElement;
  readonly camera: PerspectiveCamera;
  /**
   * The Three.js Object3D whose world transform should be applied to each
   * marker's local position before projection. Pass the parent group of the
   * globe so axis-tilt and any future scene-level transforms carry through.
   */
  readonly globeGroup: Object3D;
}

interface HtmlMarkerEntry {
  readonly config: HtmlMarkerConfig;
  readonly element: HTMLElement;
  readonly worldPosition: Vector3;
}

/**
 * DOM markers anchored to lat/lng on the globe. Each marker is an absolutely-
 * positioned element that follows the camera transform every frame. Markers
 * on the far side of the globe fade out automatically (via dot product with
 * camera direction) unless `hideWhenOccluded: false`.
 */
export class HtmlMarkersLayer {
  private readonly host: HTMLDivElement;
  private readonly entries = new Map<string, HtmlMarkerEntry>();
  private readonly tempScreen = new Vector3();
  private readonly tempCameraDir = new Vector3();
  private readonly tempNormal = new Vector3();

  public constructor(private readonly options: HtmlMarkersLayerOptions) {
    this.host = document.createElement('div');
    Object.assign(this.host.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
    } satisfies Partial<CSSStyleDeclaration>);
    options.container.appendChild(this.host);
  }

  public setMarkers(markers: ReadonlyArray<HtmlMarkerConfig>): void {
    const incomingIds = new Set(markers.map((m) => m.id));
    for (const id of [...this.entries.keys()]) {
      if (!incomingIds.has(id)) this.removeMarker(id);
    }
    for (const config of markers) {
      const existing = this.entries.get(config.id);
      if (existing && configEquivalent(existing.config, config)) continue;
      this.removeMarker(config.id);
      this.addMarker(config);
    }
  }

  public addMarker(config: HtmlMarkerConfig): void {
    if (this.entries.has(config.id)) {
      this.removeMarker(config.id);
    }
    const element = document.createElement('div');
    Object.assign(element.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      pointerEvents: config.clickThrough ? 'none' : 'auto',
      willChange: 'transform, opacity',
      transition: 'opacity 120ms ease-out',
      // Force a GPU compositing layer so per-frame transform updates are smooth
      // and subpixel-rendered consistently (avoids 1-pixel jitter during drag).
      backfaceVisibility: 'hidden',
      transformStyle: 'preserve-3d',
    } satisfies Partial<CSSStyleDeclaration>);

    const content =
      typeof config.content === 'string' ? null : config.content();
    if (content) element.appendChild(content);
    else element.innerHTML = config.content as string;

    this.host.appendChild(element);

    const worldPosition = latLngToVector3(config.position, GLOBE_RADIUS * 1.005);
    this.entries.set(config.id, { config, element, worldPosition });
  }

  public removeMarker(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.element.remove();
    this.entries.delete(id);
  }

  /** Project world positions to screen space and update DOM transforms. */
  public update(): void {
    if (this.entries.size === 0) return;
    const camera = this.options.camera;
    // Critical: Three.js updates matrixWorldInverse only in renderer.render(),
    // which runs AFTER this method. Without forcing the update here, project()
    // uses the previous frame's matrix → markers lag the canvas by one frame
    // and visibly jitter during drag/auto-rotate.
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    const rect = this.options.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const cameraDir = this.tempCameraDir.copy(camera.position).normalize();
    this.options.globeGroup.updateMatrixWorld();

    this.entries.forEach((entry) => {
      // Marker.worldPosition is stored in globeGroup-local space; transform to
      // actual world coords (handles axis tilt + any future group transforms).
      this.tempScreen
        .copy(entry.worldPosition)
        .applyMatrix4(this.options.globeGroup.matrixWorld);
      const worldNormal = this.tempNormal.copy(this.tempScreen).normalize();
      this.tempScreen.project(camera);
      const x = this.tempScreen.x * halfW + halfW;
      const y = -this.tempScreen.y * halfH + halfH;
      const anchorOffset = anchorTranslate(entry.config.anchor ?? 'center');
      const customOffset = entry.config.offset;
      // translate3d() promotes the marker to its own GPU compositing layer so
      // per-frame x/y updates render smoothly without subpixel jitter during
      // drag/auto-rotate. The percent-based translate(-50%, -50%) handles
      // self-centering; the anchor and custom offsets layer on top.
      const baseTransform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)${anchorOffset}`;
      const finalTransform = customOffset
        ? `${baseTransform} translate(${customOffset[0]}px, ${customOffset[1]}px)`
        : baseTransform;
      entry.element.style.transform = finalTransform;

      // Smoothly fade out as the marker rotates to the far side of the globe.
      // facing = dot(markerNormal, cameraDir) ∈ [-1, 1].
      //   > FADE_END  → fully visible
      //   < FADE_START → fully hidden
      //   between     → smoothstep
      const hideWhenOccluded = entry.config.hideWhenOccluded ?? true;
      if (hideWhenOccluded) {
        const facing = worldNormal.dot(cameraDir);
        const FADE_START = -0.05;
        const FADE_END = 0.15;
        const t = Math.max(0, Math.min(1, (facing - FADE_START) / (FADE_END - FADE_START)));
        const opacity = t * t * (3 - 2 * t); // smoothstep
        entry.element.style.opacity = String(opacity);
      } else {
        entry.element.style.opacity = '1';
      }
    });
  }

  public dispose(): void {
    this.entries.forEach((e) => e.element.remove());
    this.entries.clear();
    this.host.remove();
  }
}

const anchorTranslate = (anchor: NonNullable<HtmlMarkerConfig['anchor']>): string => {
  switch (anchor) {
    case 'top':
      return ' translate(0, 50%)';
    case 'bottom':
      return ' translate(0, -50%)';
    case 'left':
      return ' translate(50%, 0)';
    case 'right':
      return ' translate(-50%, 0)';
    case 'center':
    default:
      return '';
  }
};

const configEquivalent = (a: HtmlMarkerConfig, b: HtmlMarkerConfig): boolean =>
  a.id === b.id &&
  a.position[0] === b.position[0] &&
  a.position[1] === b.position[1] &&
  a.content === b.content &&
  a.anchor === b.anchor &&
  a.hideWhenOccluded === b.hideWhenOccluded &&
  a.clickThrough === b.clickThrough &&
  a.offset?.[0] === b.offset?.[0] &&
  a.offset?.[1] === b.offset?.[1];
