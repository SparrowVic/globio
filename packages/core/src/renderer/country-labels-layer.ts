import { Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../utils/coordinates';
import { angularExtent, boundsCenter, computeMainRingBounds } from '../utils/country-bounds';
import type { CountryFeature } from './country-feature';

export interface CountryLabelsLayerOptions {
  readonly container: HTMLElement;
  readonly camera: PerspectiveCamera;
  readonly globeGroup: Object3D;
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly fontWeight: string;
  readonly textShadow: string;
  /**
   * Apparent screen-pixel size below which a country's label is hidden. The
   * apparent size is the country's main-ring angular extent projected to
   * screen space. Default 60 — small islands stay hidden until you zoom in.
   */
  readonly minScreenSize?: number;
  /**
   * Smoothstep range as a fraction of `minScreenSize` (default 0.4 ⇒ band
   * runs from `minScreenSize * 0.6` to `minScreenSize`). 0 = hard cutoff.
   */
  readonly sizeFadeRange?: number;
  /**
   * Smoothstep edges for the back-side occlusion fade. `facing` is the
   * dot product of country normal vs camera direction. Default `[-0.05, 0.15]`.
   */
  readonly occlusionFade?: readonly [number, number];
  /** Opacity transition in milliseconds. Default 200. */
  readonly transitionMs?: number;
  /**
   * Optional halo: stacked `text-shadow` blurs around each label. When set,
   * REPLACES the `textShadow` token rather than adding to it.
   */
  readonly halo?: {
    readonly color?: string;
    readonly radius?: number;
    readonly steps?: number;
  } | null;
  /** Per-label inner padding in CSS pixels. Default 0. */
  readonly padding?: number;
  /**
   * Optional per-id label override. Falls back to `feature.name` when missing.
   * Useful for localisation or custom names.
   */
  readonly labels?: Readonly<Record<string, string>>;
}

interface LabelEntry {
  readonly id: string;
  readonly element: HTMLElement;
  /** Centroid in globeGroup-local 3D space, lifted just above the surface. */
  readonly worldPosition: Vector3;
  /** Country's main-ring angular extent on the sphere (radians). Drives priority + fade. */
  readonly angularExtent: number;
  /** Display name; cached so we can rebuild text on label override. */
  text: string;
}

/**
 * On-globe text labels for country names. Each label is an absolutely-
 * positioned DOM element that follows the camera transform every frame.
 * Hidden when the country becomes too small on screen (zoom-out) and when
 * its centroid rotates to the far side of the globe (occlusion fade).
 *
 * Same DOM-overlay strategy as `HtmlMarkersLayer` — picked over Three.js
 * text geometry because crisp text + CSS styling + cheap declutter.
 */
export class CountryLabelsLayer {
  public readonly host: HTMLDivElement;
  private readonly entries = new Map<string, LabelEntry>();
  private readonly tempScreen = new Vector3();
  // Mutable so live config updates (workshop / runtime) can mutate the
  // values that the per-frame render loop reads. No need to rebuild the
  // layer for these — `update()` reads the latest values each frame.
  private minScreenSize: number;
  private sizeFadeRange: number;
  private occlusionFade: readonly [number, number];
  private labels: Readonly<Record<string, string>>;
  // Halo + transition affect per-element CSS (text-shadow / opacity
  // transition timing). We keep the current values so a live update can
  // walk every entry and patch its DOM style in one pass.
  private transitionMs: number;
  private halo: CountryLabelsLayerOptions['halo'];
  // Field must match the host's `display` state we set below — otherwise the
  // first `setEnabled(true)` no-ops via the equality guard and the labels
  // never appear (you'd have to toggle off→on again to "unstick" them).
  private enabled = false;

  public constructor(private readonly options: CountryLabelsLayerOptions) {
    this.minScreenSize = options.minScreenSize ?? 60;
    this.sizeFadeRange = options.sizeFadeRange ?? 0.4;
    this.occlusionFade = options.occlusionFade ?? [-0.05, 0.15];
    this.transitionMs = options.transitionMs ?? 200;
    this.halo = options.halo ?? undefined;
    this.labels = options.labels ?? {};
    this.host = document.createElement('div');
    Object.assign(this.host.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      overflow: 'hidden',
      display: 'none',
    } satisfies Partial<CSSStyleDeclaration>);
    options.container.appendChild(this.host);
    this.buildLabels(options.features);
  }

  public setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.host.style.display = enabled ? 'block' : 'none';
  }

  /**
   * Live update for the per-frame fade thresholds. The render loop reads
   * these on every frame so the next paint reflects the new value — no
   * layer rebuild needed.
   */
  public setMinScreenSize(value: number): void {
    this.minScreenSize = value;
  }

  public setSizeFadeRange(value: number): void {
    this.sizeFadeRange = value;
  }

  public setOcclusionFade(edges: readonly [number, number]): void {
    this.occlusionFade = edges;
  }

  /**
   * Update the CSS opacity-transition duration on every existing label
   * element. Future labels (built lazily via `buildLabels`) read from
   * the field too, so the value sticks.
   */
  public setTransitionMs(ms: number): void {
    this.transitionMs = ms;
    const transition = `opacity ${ms}ms ease-out`;
    this.entries.forEach((entry) => {
      entry.element.style.transition = transition;
    });
  }

  /**
   * Replace the halo configuration (or remove it with `null` / `undefined`).
   * Walks every label and rewrites `text-shadow` so the change is visible
   * on the next render — DOM-only, no Three.js work.
   */
  public setHalo(halo: CountryLabelsLayerOptions['halo'] | null): void {
    this.halo = halo ?? undefined;
    const textShadow = this.resolveTextShadow();
    this.entries.forEach((entry) => {
      entry.element.style.textShadow = textShadow;
    });
  }

  /** Live update for the label text color — mutates every existing element. */
  public setColor(color: string): void {
    this.entries.forEach((entry) => {
      entry.element.style.color = color;
    });
  }

  /** Live update for the font size in CSS pixels. */
  public setFontSize(px: number): void {
    const css = `${px}px`;
    this.entries.forEach((entry) => {
      entry.element.style.fontSize = css;
    });
  }

  /** Live update for font weight (e.g. '500', 'bold'). */
  public setFontWeight(weight: string): void {
    this.entries.forEach((entry) => {
      entry.element.style.fontWeight = weight;
    });
  }

  /** Restore the construction-time (theme-driven) text color. */
  public resetColor(): void {
    this.setColor(this.options.color);
  }

  /** Restore the construction-time font size. */
  public resetFontSize(): void {
    this.setFontSize(this.options.fontSize);
  }

  /** Restore the construction-time font weight. */
  public resetFontWeight(): void {
    this.setFontWeight(this.options.fontWeight);
  }

  public setLabels(labels: Readonly<Record<string, string>>): void {
    this.labels = labels;
    this.entries.forEach((entry) => {
      const next = labels[entry.id] ?? this.lookupDefault(entry.id);
      if (next !== entry.text) {
        entry.text = next;
        entry.element.textContent = next;
      }
    });
  }

  private lookupDefault(id: string): string {
    const feature = this.options.features.find((f) => f.id === id);
    return feature?.name ?? id;
  }

  /** Project label positions to screen, fade by zoom + occlusion. */
  public update(): void {
    if (!this.enabled || this.entries.size === 0) return;
    const camera = this.options.camera;
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

    const rect = this.options.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const cameraDir = camera.position.clone().normalize();
    this.options.globeGroup.updateMatrixWorld();

    // Apparent screen size = angularExtent (rad) projected via FOV.
    // For small angles, screen pixels ≈ rect.height * angle / (2 * tan(fov/2)).
    const fovRad = (camera.fov * Math.PI) / 180;
    const px2tan = rect.height / (2 * Math.tan(fovRad / 2));
    const cameraDistanceToCentre = camera.position.length();

    this.entries.forEach((entry) => {
      this.tempScreen
        .copy(entry.worldPosition)
        .applyMatrix4(this.options.globeGroup.matrixWorld);
      const worldNormal = this.tempScreen.clone().normalize();
      this.tempScreen.project(camera);
      const x = this.tempScreen.x * halfW + halfW;
      const y = -this.tempScreen.y * halfH + halfH;
      entry.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;

      // Apparent size in pixels: angular extent of country at current camera
      // distance, mapped to screen via FOV. Cheap heuristic — good enough
      // to fade out tiny countries when zoomed out.
      const apparentPx = (entry.angularExtent * GLOBE_RADIUS / cameraDistanceToCentre) * px2tan;
      const fadeStart = this.minScreenSize * Math.max(0, 1 - this.sizeFadeRange);
      const sizeFade = smoothstep(fadeStart, this.minScreenSize, apparentPx);

      // Occlusion fade — same band as HTML markers so labels disappear at
      // the same time the markers/atmosphere do as the country rotates away.
      const facing = worldNormal.dot(cameraDir);
      const occFade = smoothstep(this.occlusionFade[0], this.occlusionFade[1], facing);

      entry.element.style.opacity = String(sizeFade * occFade);
    });
  }

  public dispose(): void {
    this.entries.forEach((e) => e.element.remove());
    this.entries.clear();
    this.host.remove();
  }

  private buildLabels(features: ReadonlyArray<CountryFeature>): void {
    const transitionMs = this.transitionMs;
    const padding = this.options.padding ?? 0;
    const textShadow = this.resolveTextShadow();

    for (const feature of features) {
      const bounds = computeMainRingBounds(feature.coordinates);
      // Skip features whose main ring degenerated (tiny atolls etc.)
      const ext = angularExtent(bounds);
      if (ext <= 0) continue;
      const [lat, lng] = boundsCenter(bounds);
      const surface = latLngToVector3([lat, lng], GLOBE_RADIUS * 1.001);

      const element = document.createElement('div');
      const text = this.labels[feature.id] ?? feature.name;
      element.textContent = text;
      Object.assign(element.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        color: this.options.color,
        fontSize: `${this.options.fontSize}px`,
        fontFamily: this.options.fontFamily,
        fontWeight: this.options.fontWeight,
        textShadow,
        ...(padding > 0 ? { padding: `${padding}px` } : {}),
        opacity: '0',
        willChange: 'transform, opacity',
        transition: `opacity ${transitionMs}ms ease-out`,
        backfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
      } satisfies Partial<CSSStyleDeclaration>);
      this.host.appendChild(element);

      this.entries.set(feature.id, {
        id: feature.id,
        element,
        worldPosition: surface,
        angularExtent: ext,
        text,
      });
    }
  }

  /**
   * Build the CSS `text-shadow` value. With `halo` set, we synthesise a
   * stack of N evenly-rotated shadows of `radius` blur — that produces a
   * uniform glowing outline around the glyphs without canvas tricks.
   * Without halo, fall through to the theme-supplied value.
   */
  private resolveTextShadow(): string {
    const halo = this.halo;
    if (!halo) return this.options.textShadow;
    const color = halo.color ?? 'rgba(0, 0, 0, 0.65)';
    const radius = halo.radius ?? 2;
    const steps = Math.max(2, halo.steps ?? 4);
    const parts: Array<string> = [];
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      parts.push(`${dx.toFixed(2)}px ${dy.toFixed(2)}px ${radius}px ${color}`);
    }
    return parts.join(', ');
  }
}

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
