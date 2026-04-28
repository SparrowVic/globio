import {
  Color,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type WebGLRendererParameters,
} from 'three';
import { AdaptiveQualityController } from '../utils/adaptive-quality';
import type { PerformanceConfig } from '../types';

export interface SceneManagerOptions {
  readonly container: HTMLElement;
  readonly backgroundColor: string;
  readonly performance: Required<PerformanceConfig>;
  readonly onRender: (deltaSeconds: number) => void;
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

  public constructor(private readonly options: SceneManagerOptions) {
    this.scene = new Scene();
    this.scene.background = new Color(options.backgroundColor);

    const { clientWidth, clientHeight } = options.container;
    const aspect = clientHeight > 0 ? clientWidth / clientHeight : 1;
    this.camera = new PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 0, 3);
    this.camera.lookAt(new Vector3(0, 0, 0));

    const rendererParams: WebGLRendererParameters = {
      antialias: options.performance.antialias,
      alpha: false,
      powerPreference: 'high-performance',
    };
    this.renderer = new WebGLRenderer(rendererParams);
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.renderer.setPixelRatio(this.resolvePixelRatio(options.performance.pixelRatio));

    options.container.appendChild(this.renderer.domElement);

    this.adaptiveQuality = options.performance.adaptiveQuality
      ? new AdaptiveQualityController({
          targetFps: options.performance.maxFps,
          minPixelRatio: 1,
          maxPixelRatio: this.resolvePixelRatio(options.performance.pixelRatio),
          sampleSize: 30,
          onAdjust: (ratio) => this.renderer.setPixelRatio(ratio),
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

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    this.resizeObserver.disconnect();
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
    this.renderer.render(this.scene, this.camera);

    this.rafId = requestAnimationFrame(this.tick);
  };

  private handleResize(): void {
    const { clientWidth, clientHeight } = this.options.container;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight, false);
  }

  private resolvePixelRatio(value: number | 'auto'): number {
    if (value === 'auto') {
      return Math.min(window.devicePixelRatio ?? 1, 2);
    }
    return value;
  }
}
