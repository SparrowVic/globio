import type { ThemeInput } from './theme/types';

export type LatLng = readonly [latitude: number, longitude: number];

export type ResolutionLevel = 'low' | 'medium' | 'high';

export type CountryStyle = 'borders' | 'dotted' | 'filled';

export type GlobeMode = 'sphere' | 'flat';

export interface CountryData {
  readonly id: string;
  readonly name: string;
  readonly iso2?: string;
  readonly iso3?: string;
}

export interface CountryEvent {
  readonly country: CountryData;
  readonly point: LatLng;
}

export interface MarkerConfig {
  readonly id: string;
  readonly position: LatLng;
  readonly color?: string;
  readonly size?: number;
  readonly label?: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface MarkerEvent {
  readonly marker: MarkerConfig;
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

export interface CountriesConfig {
  readonly resolution?: ResolutionLevel;
  readonly style?: CountryStyle;
  readonly hoverEnabled?: boolean;
  /**
   * When true (default), the hover highlight respects the globe's depth —
   * the back-side portions of a country (e.g. the part wrapped around the
   * far side) are hidden. Set to false for an "x-ray" feel where the entire
   * country outline is always visible.
   */
  readonly hoverOccludeBackSide?: boolean;
}

export interface AtmosphereConfig {
  readonly enabled?: boolean;
}

export interface StarfieldConfig {
  readonly enabled?: boolean;
}

export interface AutoRotateConfig {
  readonly enabled?: boolean;
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
  readonly mode?: ZoomMode;
  /** 0..1 — intensity of repel/attract correction. Ignored for `classic`. */
  readonly strength?: number;
  /**
   * When true (default), the camera interpolates smoothly toward its
   * post-scroll target each frame instead of snapping. Applies to all modes.
   */
  readonly smooth?: boolean;
}

/** Easing function — receives normalized progress t∈[0,1], returns eased t∈[0,1]. */
export type EasingFunction = (t: number) => number;

export interface FlyToOptions {
  /** Animation duration in milliseconds. Default 1500. */
  readonly duration?: number;
  /** Easing function. Default `easeInOutCubic`. */
  readonly easing?: EasingFunction;
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
}

export interface PerformanceConfig {
  readonly antialias?: boolean;
  readonly pixelRatio?: number | 'auto';
  readonly maxFps?: number;
  readonly adaptiveQuality?: boolean;
}

export interface GlobeConfig {
  readonly container: HTMLElement;
  readonly mode?: GlobeMode;
  readonly theme?: ThemeInput;
  readonly countries?: CountriesConfig;
  readonly markers?: ReadonlyArray<MarkerConfig>;
  readonly htmlMarkers?: ReadonlyArray<HtmlMarkerConfig>;
  readonly atmosphere?: AtmosphereConfig;
  readonly starfield?: StarfieldConfig;
  /**
   * Tilt the globe's axis around the Z axis (in degrees, like Earth's 23.5°).
   * Affects only visual appearance — auto-rotate, raycasting, and lat/lng
   * conversions all keep working naturally because everything is rendered
   * inside a tilted parent group. Default 0.
   */
  readonly axisTilt?: number;
  readonly autoRotate?: AutoRotateConfig;
  readonly performance?: PerformanceConfig;
  readonly initialPosition?: LatLng;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly zoom?: ZoomConfig;
}

export interface GlobeEvents {
  readonly countryClick: (event: CountryEvent) => void;
  readonly countryHover: (event: CountryEvent | null) => void;
  readonly markerClick: (event: MarkerEvent) => void;
  readonly markerHover: (event: MarkerEvent | null) => void;
  readonly ready: () => void;
  readonly error: (error: Error) => void;
}

export type GlobeEventName = keyof GlobeEvents;

export type GlobeEventUnsubscribe = () => void;

export interface GlobeInstance {
  readonly mount: () => void;
  readonly destroy: () => void;
  readonly update: (config: Partial<GlobeConfig>) => void;
  readonly on: <K extends GlobeEventName>(
    event: K,
    handler: GlobeEvents[K]
  ) => GlobeEventUnsubscribe;
  readonly off: <K extends GlobeEventName>(event: K, handler: GlobeEvents[K]) => void;
  readonly setRotation: (position: LatLng, animate?: boolean) => void;
  readonly flyTo: (position: LatLng, distance?: number, options?: FlyToOptions) => void;
  readonly focusOnCountry: (id: string, options?: FocusOptions) => void;
  readonly setActiveCountry: (id: string | null) => void;
  readonly getActiveCountry: () => string | null;
  readonly setMarkers: (markers: ReadonlyArray<MarkerConfig>) => void;
  readonly addMarker: (marker: MarkerConfig) => void;
  readonly removeMarker: (id: string) => void;
  readonly setHtmlMarkers: (markers: ReadonlyArray<HtmlMarkerConfig>) => void;
  readonly addHtmlMarker: (marker: HtmlMarkerConfig) => void;
  readonly removeHtmlMarker: (id: string) => void;
  readonly resize: () => void;
  readonly getCanvas: () => HTMLCanvasElement;
}
