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
import { getFrameScheduler, type FrameClient } from './frame-scheduler';
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

  private running = false;
  private lastTime = 0;
  private destroyed = false;
  // Pause levers — any of them stops frames without tearing anything down.
  private userPaused = false;
  private held = 0;
  private inViewport = true;
  private pageVisible = true;
  private intersectionObserver: IntersectionObserver | null = null;
  private readonly frameClient: FrameClient;
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

    this.frameClient = {
      onFrame: (now) => this.frame(now),
      isPaused: () => this.isPaused(),
      targetFps: () => this.options.performance.maxFps,
    };

    if (options.performance.pauseWhenHidden) {
      if (typeof IntersectionObserver === 'function') {
        this.intersectionObserver = new IntersectionObserver(
          (entries) => {
            const last = entries[entries.length - 1];
            if (!last) return;
            this.inViewport = last.isIntersecting;
            if (this.inViewport) {
              this.renderStillFrame();
              if (!this.userPaused) getFrameScheduler().wake();
            }
          },
          // A little lead so a globe scrolling in already has its first frame.
          { rootMargin: '15%', threshold: 0 },
        );
        this.intersectionObserver.observe(options.container);
      }
      if (typeof document !== 'undefined') {
        this.pageVisible = !document.hidden;
        document.addEventListener('visibilitychange', this.handleVisibility);
      }
    }
  }

  /**
   * Host-driven pause: skip frames until `setPaused(false)`. Unlike `stop()`
   * the client stays registered, so resuming costs nothing and the next
   * frame carries a clamped delta instead of a jump.
   */
  public setPaused(paused: boolean): void {
    if (this.userPaused === paused) return;
    this.userPaused = paused;
    if (!paused) {
      this.lastTime = performance.now();
      getFrameScheduler().wake();
    } else {
      this.renderStillFrame();
    }
  }

  public start(): void {
    if (this.running || this.destroyed) return;
    this.running = true;
    this.lastTime = performance.now();
    getFrameScheduler().register(this.frameClient);
    this.renderStillFrame();
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    getFrameScheduler().unregister(this.frameClient);
  }

  /**
   * Skip frames until `work` settles — used while shaders compile in the
   * background so the main thread never blocks on a synchronous compile.
   * The canvas keeps showing its last frame meanwhile.
   */
  public holdRendering(work: Promise<unknown>): void {
    this.held += 1;
    const release = (): void => {
      this.held = Math.max(0, this.held - 1);
      if (this.destroyed || !this.running || this.held > 0) return;
      this.lastTime = performance.now();
      this.renderStillFrame();
      if (!this.userPaused) getFrameScheduler().wake();
    };
    work.then(release, release);
  }

  /** True while the globe is off-screen, on a hidden tab, or holding for work. */
  public isPaused(): boolean {
    return (
      this.destroyed ||
      !this.running ||
      this.userPaused ||
      this.held > 0 ||
      !this.inViewport ||
      !this.pageVisible
    );
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
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility);
    }
    this.postfx?.dispose();
    this.postfx = null;
    this.renderer.dispose();
    // dispose() releases Three.js resources but leaves the browser's WebGL
    // context alive until GC. Explicitly release it so repeated route/kind
    // changes cannot exhaust the browser's active-context limit.
    this.renderer.forceContextLoss();
    if (this.renderer.domElement.parentElement === this.options.container) {
      this.options.container.removeChild(this.renderer.domElement);
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private readonly handleVisibility = (): void => {
    this.pageVisible = !document.hidden;
    if (this.pageVisible) {
      this.lastTime = performance.now();
      this.renderStillFrame();
      if (!this.userPaused) getFrameScheduler().wake();
    }
  };

  private frame(now: number): void {
    if (this.destroyed) return;
    // Clamp the step so the first frame after a pause (or a throttled
    // client's long gap) advances animation smoothly instead of jumping.
    const delta = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.adaptiveQuality?.tick(now);
    this.options.onRender(delta);
    this.renderFrame();
  }

  private handleResize(): void {
    if (this.destroyed) return;
    const { clientWidth, clientHeight } = this.options.container;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.syncPostFxSize();
    this.options.onResize?.(clientWidth, clientHeight);
    this.renderStillFrame();
  }

  /**
   * Paused scenes still need their initial geometry and resized buffers
   * drawn. A zero-time update initializes layer uniforms without advancing
   * animations; drawing directly leaves the shared scheduler asleep.
   * Holds and visibility changes retry here once rendering is safe again.
   */
  private renderStillFrame(): void {
    if (
      !this.userPaused || !this.running || this.destroyed || this.held > 0 ||
      !this.inViewport || !this.pageVisible
    ) return;
    this.options.onRender(0);
    if (this.destroyed || !this.running || this.held > 0) return;
    this.renderFrame();
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
