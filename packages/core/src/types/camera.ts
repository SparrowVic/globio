import type { LatLng } from './primitives';

/** Automatic camera orbit while the pointer is not dragging the globe. */
export interface AutoRotateConfig {
  /** Turn ambient rotation on. It yields while the pointer drags and resumes afterwards. Default false. */
  readonly enabled?: boolean;
  /**
   * Orbit-speed multiplier; 1 moves 0.2 radians per second, or one revolution in about 31 seconds.
   * Default 0.5.
   */
  readonly speed?: number;
}

/**
 * Zoom interaction mode.
 *
 * - `classic`: scroll changes camera distance only; angles unchanged.
 * - `repel`: each scroll step rotates the camera so the world point under
 *   the cursor stays under the cursor — the cursor "anchors" to that point.
 * - `attract`: each scroll step rotates the camera to pull the world point
 *   under the cursor toward the center of the screen.
 */
export type ZoomMode = 'classic' | 'repel' | 'attract';

export interface ZoomConfig {
  /** How a scroll step moves the camera. Default `'classic'`. */
  readonly mode?: ZoomMode;
  /** 0..1 — intensity of repel/attract correction. Ignored for `classic`. Default 0.5. */
  readonly strength?: number;
  /**
   * When true (default), the camera interpolates smoothly toward its
   * post-scroll target each frame instead of snapping. Applies to all modes.
   */
  readonly smooth?: boolean;
}

/** Easing function — receives normalized progress t∈[0,1], returns eased t∈[0,1]. */
export type EasingFunction = (t: number) => number;

/** CSS-like named easings. Resolved to functions by `resolveEasing`. */
export type EasingName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export interface FlyToOptions {
  /** Animation duration in milliseconds. Default 1500. */
  readonly duration?: number;
  /** Easing function. Default `easeInOutCubic`. */
  readonly easing?: EasingFunction;
  /**
   * Extra camera radius added during the flight, peaking at the midpoint
   * (sin(t·π) profile). Creates a "fly-over" arc that pulls the camera up
   * and back down — feels more cinematic than a straight slerp, especially
   * for long jumps. Default 0.
   */
  readonly elevation?: number;
}

export interface FocusOptions extends FlyToOptions {
  /**
   * Fraction of the viewport to leave as padding around the focused country, 0..0.5.
   * 0.15 means ~15% of the viewport edge is empty space. Default 0.15.
   */
  readonly padding?: number;
  /**
   * If true (default), auto-rotation is disabled when the focus animation
   * starts — natural for "I'm clicking to inspect this country, stop spinning".
   * Set to false to keep rotating after focus completes.
   */
  readonly pauseAutoRotateOnFocus?: boolean;
  /**
   * Override the camera target lat/lng. Defaults to the country's centroid
   * (computed from its main-ring bounds). Useful for "direct-focus" — click
   * on Russia, fly toward the exact spot you clicked while still framing
   * the whole country at the right zoom.
   */
  readonly center?: LatLng;
}

/**
 * Top-level framing knob — controls how much of the canvas the rendered
 * globe + atmosphere takes up. Lives separately from `minZoom`/`maxZoom`
 * because it's about *composition*, not user interaction limits.
 */
export interface FramingConfig {
  /**
   * Extra margin factor around the estimated visible globe extent. Omitted skips reframing;
   * explicit 0 fits the base halo estimate and positive values add breathing room.
   */
  readonly padding?: number;
  /**
   * Use the computed framing distance for omitted zoom limits, preventing zoom in either direction
   * when neither limit is explicit. Explicit minZoom or maxZoom takes precedence. Default false.
   */
  readonly lockZoom?: boolean;
}
