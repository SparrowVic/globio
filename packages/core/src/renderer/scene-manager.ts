import {
  Color,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type WebGLRendererParameters,
} from 'three';
import { AdaptiveQualityController } from '../utils/adaptive-quality';
import type { PostFxPipeline } from './postfx/pipeline';
import type { PerformanceConfig } from '../types';

export interface SceneManagerOptions {
  readonly container: HTMLElement;
  /**
   * Solid background colour, OR `null` for a transparent canvas.
   * Transparent mode lets the host page bleed through the globe (useful
   * when the globe is decoration on top of a page gradient / image).
   */
  readonly backgroundColor: string | null;
  readonly performance: Required<PerformanceConfig>;
  readonly onRender: (deltaSeconds: number) => void;
  /**
   * Optional resize hook — fires after the renderer / camera have been
   * updated. Used by layers that need to keep screen-space resolution
   * uniforms in sync (e.g. `LineMaterial` for thick lines).
   */
  readonly onResize?: (width: number, height: number) => void;
}

export class SceneManager {
  public readonly scene: Scene;
  public readonly camera: PerspectiveCamera;
  public readonly renderer: WebGLRenderer;

  private rafId = 0;
  private lastTime = 0;
  private destroyed = false;
  private readonly resizeObserver: ResizeObserver;
  private readonly adaptiveQuality: AdaptiveQualityController | null;
  /**
   * Optional shared post-processing pipeline. When set, every frame goes
   * scene → HDR target → bloom/streak/composite → canvas instead of
   * straight to the canvas. Owned by the SceneManager once attached.
   */
  private postfx: PostFxPipeline | null = null;
  private readonly sizeScratch = new Vector2();

  public constructor(private readonly options: SceneManagerOptions) {
    this.scene = new Scene();
    // null background ⇒ transparent canvas. We leave scene.background
    // unset (Three's default) so the renderer's clear-alpha=0 takes over.
    if (options.backgroundColor !== null) {
      this.scene.background = new Color(options.backgroundColor);
    }

    const { clientWidth, clientHeight } = options.container;
    const aspect = clientHeight > 0 ? clientWidth / clientHeight : 1;
    this.camera = new PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 3);
    this.camera.lookAt(new Vector3(0, 0, 0));

    const transparent = options.backgroundColor === null;
    const rendererParams: WebGLRendererParameters = {
      antialias: options.performance.antialias,
      alpha: transparent,
      powerPreference: 'high-performance',
    };
    this.renderer = new WebGLRenderer(rendererParams);
    if (transparent) this.renderer.setClearAlpha(0);
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.renderer.setPixelRatio(this.resolvePixelRatio(options.performance.pixelRatio));

    options.container.appendChild(this.renderer.domElement);

    this.adaptiveQuality = options.performance.adaptiveQuality
      ? new AdaptiveQualityController({
          targetFps: options.performance.maxFps,
          minPixelRatio: 1,
          maxPixelRatio: this.resolvePixelRatio(options.performance.pixelRatio),
          sampleSize: 30,
          onAdjust: (ratio) => {
            this.renderer.setPixelRatio(ratio);
            // The pipeline's targets are sized in device pixels — they have
            // to follow the adaptive pixel-ratio steps or the composite
            // samples a stale-resolution buffer.
            this.syncPostFxSize();
          },
        })
      : null;

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(options.container);
  }

  public start(): void {
    if (this.rafId !== 0) return;
    this.lastTime = performance.now();
    this.tick();
  }

  public stop(): void {
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  public resize(): void {
    this.handleResize();
  }

  /**
   * Attach (or detach with `null`) the shared post-processing pipeline.
   * Disposes whatever was attached before, so callers never leak a pipeline
   * by swapping one in.
   */
  public setPostFx(pipeline: PostFxPipeline | null): void {
    if (this.postfx === pipeline) return;
    this.postfx?.dispose();
    this.postfx = pipeline;
    this.syncPostFxSize();
  }

  /**
   * Draw one frame. Routed through the post-processing pipeline when one is
   * attached (the pipeline itself falls back to a direct render when it is
   * disabled). Used by `tick()` and by `toImage()`.
   */
  public renderFrame(): void {
    if (this.postfx !== null) {
      // Cheap guard: `toImage()` and the adaptive-quality controller both
      // resize the drawing buffer outside of `handleResize`.
      this.syncPostFxSize();
      this.postfx.render(this.scene, this.camera);
      return;
    }
    this.renderer.render(this.scene, this.camera);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    this.resizeObserver.disconnect();
    this.postfx?.dispose();
    this.postfx = null;
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.options.container) {
      this.options.container.removeChild(this.renderer.domElement);
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private tick = (): void => {
    if (this.destroyed) return;
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.adaptiveQuality?.tick(now);
    this.options.onRender(delta);
    this.renderFrame();

    this.rafId = requestAnimationFrame(this.tick);
  };

  private handleResize(): void {
    const { clientWidth, clientHeight } = this.options.container;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.syncPostFxSize();
    this.options.onResize?.(clientWidth, clientHeight);
  }

  /**
   * Push the renderer's *current* CSS size + pixel ratio into the pipeline.
   * Reads them back off the renderer (rather than trusting the caller) so
   * resizes and adaptive pixel-ratio steps stay in sync from one place.
   */
  private syncPostFxSize(): void {
    if (this.postfx === null) return;
    const size = this.renderer.getSize(this.sizeScratch);
    this.postfx.setSize(size.x, size.y, this.renderer.getPixelRatio());
  }

  private resolvePixelRatio(value: number | 'auto'): number {
    if (value === 'auto') {
      return Math.min(window.devicePixelRatio ?? 1, 2);
    }
    return value;
  }
}
