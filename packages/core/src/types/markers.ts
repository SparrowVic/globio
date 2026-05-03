import type { LatLng } from './primitives';

export interface MarkerConfig {
  readonly id: string;
  readonly position: LatLng;
  readonly color?: string;
  readonly size?: number;
  readonly label?: string;
  readonly data?: Readonly<Record<string, unknown>>;
  /**
   * Pulse animation — the marker oscillates in size to draw attention.
   * `true` uses defaults; object overrides individual params.
   * - `speed` cycles per second (default 1.5)
   * - `amplitude` fraction of base size added at peak (default 0.4)
   */
  readonly pulse?: boolean | {
    readonly speed?: number;
    readonly amplitude?: number;
  };
}

export interface MarkerEvent {
  readonly marker: MarkerConfig;
}

/**
 * Arc / connection between two lat/lng points, drawn as a great-circle
 * lifted off the globe surface to form a curve.
 */
export interface ArcConfig {
  readonly id: string;
  readonly from: LatLng;
  readonly to: LatLng;
  /** Override `arcs.color` token for this arc. */
  readonly color?: string;
  /** Override `arcs.width` token for this arc. */
  readonly width?: number;
  /**
   * Curve apex elevation factor.
   * - `number`: fixed factor (0 = flat on surface, 1 ≈ globe-radius above).
   * - `'auto'`: interpolated between `minHeight` and `maxHeight` based on
   *   great-circle angular distance (long arcs rise higher).
   *
   * Default 0.4.
   */
  readonly height?: number | 'auto';
  /** Lower bound for `height: 'auto'`. Default 0.15. */
  readonly minHeight?: number;
  /** Upper bound for `height: 'auto'`. Default 0.6. */
  readonly maxHeight?: number;
  /** Line drawing style. Default `'solid'`. */
  readonly style?: 'solid' | 'dashed';
  /** Dash segment length when `style: 'dashed'`. Default 0.04. */
  readonly dashSize?: number;
  /** Dash gap length when `style: 'dashed'`. Default 0.02. */
  readonly dashGap?: number;
  /**
   * If true (default false), a moving "head" particle slides along the
   * arc, looped. Useful for showing direction of travel/data flow.
   */
  readonly animated?: boolean;
  /** Animation cycle duration in seconds. Default 2. */
  readonly animationDuration?: number;
  /**
   * Head movement style when `animated: true`. Default `'linear'`.
   * - `'linear'`: constant speed along the arc.
   * - `'easeInOut'`: slow at endpoints, fast through middle (cubic ease).
   * - `'pulse'`: linear position, but the head fades in/out so it appears
   *   strongest near the arc midpoint and disappears at the ends.
   */
  readonly headEasing?: 'linear' | 'easeInOut' | 'pulse';
}

/**
 * HTML overlay marker — a DOM element anchored to a lat/lng position on the
 * globe. Renders above the canvas, follows camera transforms each frame, and
 * automatically hides when on the far side of the globe (occluded by sphere).
 */
export interface HtmlMarkerConfig {
  readonly id: string;
  readonly position: LatLng;
  /**
   * Either a static HTML string (set as innerHTML once), or a factory that
   * returns an HTMLElement. The factory form is preferred when you want
   * native event handlers, framework components, or refs.
   */
  readonly content: string | (() => HTMLElement);
  /**
   * Anchor point on the marker element relative to the lat/lng. Default 'center'.
   */
  readonly anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Pixel offset applied AFTER anchor positioning. */
  readonly offset?: readonly [number, number];
  /**
   * If true (default), the marker fades out smoothly when its lat/lng is on
   * the far side of the globe. Set false to keep it always visible.
   */
  readonly hideWhenOccluded?: boolean;
  /**
   * If true (default false), pointer events on the marker pass through to the
   * canvas (so you can still drag/zoom the globe through the marker).
   */
  readonly clickThrough?: boolean;
}
