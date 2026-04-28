export interface QualityMetrics {
  readonly currentFps: number;
  readonly averageFps: number;
  readonly currentPixelRatio: number;
}

export interface AdaptiveQualityOptions {
  readonly targetFps: number;
  readonly minPixelRatio: number;
  readonly maxPixelRatio: number;
  readonly sampleSize: number;
  readonly onAdjust: (pixelRatio: number) => void;
}

export class AdaptiveQualityController {
  private readonly samples: Array<number> = [];
  private lastFrameTime = 0;
  private currentPixelRatio: number;
  private lastAdjustTime = 0;
  private readonly cooldownMs = 1000;

  public constructor(private readonly options: AdaptiveQualityOptions) {
    this.currentPixelRatio = options.maxPixelRatio;
  }

  public tick(now: number): QualityMetrics {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
      return this.metrics(0);
    }

    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const fps = delta > 0 ? 1000 / delta : 0;

    this.samples.push(fps);
    if (this.samples.length > this.options.sampleSize) {
      this.samples.shift();
    }

    const avg = this.averageFps();

    if (now - this.lastAdjustTime > this.cooldownMs && this.samples.length >= this.options.sampleSize) {
      this.maybeAdjust(avg, now);
    }

    return this.metrics(fps);
  }

  public getPixelRatio(): number {
    return this.currentPixelRatio;
  }

  private maybeAdjust(avgFps: number, now: number): void {
    const { targetFps, minPixelRatio, maxPixelRatio, onAdjust } = this.options;
    let next = this.currentPixelRatio;

    if (avgFps < targetFps * 0.85 && this.currentPixelRatio > minPixelRatio) {
      next = Math.max(minPixelRatio, this.currentPixelRatio - 0.25);
    } else if (avgFps > targetFps * 0.98 && this.currentPixelRatio < maxPixelRatio) {
      next = Math.min(maxPixelRatio, this.currentPixelRatio + 0.25);
    }

    if (next !== this.currentPixelRatio) {
      this.currentPixelRatio = next;
      this.lastAdjustTime = now;
      onAdjust(next);
    }
  }

  private averageFps(): number {
    if (this.samples.length === 0) return 0;
    const sum = this.samples.reduce((acc, v) => acc + v, 0);
    return sum / this.samples.length;
  }

  private metrics(currentFps: number): QualityMetrics {
    return {
      currentFps,
      averageFps: this.averageFps(),
      currentPixelRatio: this.currentPixelRatio,
    };
  }
}
