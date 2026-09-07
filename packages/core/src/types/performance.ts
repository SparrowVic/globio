export interface PerformanceConfig {
  /** Multisample antialiasing on the canvas. Default true. */
  readonly antialias?: boolean;
  /** Device pixel ratio to render at; `'auto'` uses `min(devicePixelRatio, 2)`. Default `'auto'`. */
  readonly pixelRatio?: number | 'auto';
  /**
   * Frame-rate ceiling for this globe. Every globe on a page shares one
   * animation loop; a decorative globe at 30 keeps rendering smoothly while
   * leaving the budget to the hero. Default 60.
   */
  readonly maxFps?: number;
  /** Lower the pixel ratio on slow frames and raise it back when the budget allows. Default true. */
  readonly adaptiveQuality?: boolean;
  /**
   * Stop rendering while the globe is scrolled out of view or the tab is
   * hidden (IntersectionObserver + `visibilitychange`). Time-based animation
   * resumes without a jump. Default true.
   */
  readonly pauseWhenHidden?: boolean;
}
