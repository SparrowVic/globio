export interface PerformanceConfig {
  readonly antialias?: boolean;
  readonly pixelRatio?: number | 'auto';
  /**
   * Frame-rate ceiling for this globe. Every globe on a page shares one
   * animation loop; a decorative globe at 30 keeps rendering smoothly while
   * leaving the budget to the hero. Default 60.
   */
  readonly maxFps?: number;
  readonly adaptiveQuality?: boolean;
  /**
   * Stop rendering while the globe is scrolled out of view or the tab is
   * hidden (IntersectionObserver + `visibilitychange`). Time-based animation
   * resumes without a jump. Default true.
   */
  readonly pauseWhenHidden?: boolean;
}
