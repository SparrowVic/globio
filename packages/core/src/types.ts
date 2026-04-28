import type { ThemeInput } from './theme/types';
import type {
  SceneConfig,
  StoryConfig,
  StorySceneEvent,
  StoryCompleteEvent,
} from './story/types';
import type { ScaleConfig } from './data/scales';
import type { LegendOptions } from './data/legend';

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

/**
 * Per-country data binding. Pass via `globe.setCountryData(map)` to color
 * countries based on data — populations, GDP, region membership, anything.
 * `value` is informational (available on countryClick events) and can drive
 * color via a future scale system; for now the explicit `color` field wins.
 */
export interface CountryDataEntry {
  readonly color?: string;
  readonly value?: number;
  readonly opacity?: number;
}

export type CountryDataMap = Readonly<Record<string, CountryDataEntry>>;

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
  readonly countryData?: CountryDataMap;
  readonly markers?: ReadonlyArray<MarkerConfig>;
  readonly htmlMarkers?: ReadonlyArray<HtmlMarkerConfig>;
  readonly arcs?: ReadonlyArray<ArcConfig>;
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
  readonly sceneEnter: (event: StorySceneEvent) => void;
  readonly sceneExit: (event: StorySceneEvent) => void;
  readonly storyComplete: (event: StoryCompleteEvent) => void;
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
  /**
   * Apply a country-data map. When `scale` is provided, entries' `value` is
   * mapped to a color via the scale (sequential/diverging/threshold/
   * categorical); explicit `color` on an entry always wins over the scale.
   * Pass `null` to hide the fill layer.
   */
  readonly setCountryData: (data: CountryDataMap | null, scale?: ScaleConfig) => void;
  readonly getCountryData: () => CountryDataMap | null;
  /**
   * Show a legend HUD inside the globe container, auto-rendered from a
   * scale (sequential / diverging gradient bar + ticks; threshold or
   * categorical → swatch list). Calling again replaces the active legend.
   */
  readonly showLegend: (scale: ScaleConfig, options?: LegendOptions) => void;
  readonly hideLegend: () => void;
  readonly setStory: (story: StoryConfig | null) => void;
  readonly playStory: () => void;
  readonly pauseStory: () => void;
  readonly nextScene: () => void;
  readonly prevScene: () => void;
  readonly goToScene: (id: string) => void;
  readonly getCurrentScene: () => SceneConfig | null;
  readonly isStoryPlaying: () => boolean;
  readonly setMarkers: (markers: ReadonlyArray<MarkerConfig>) => void;
  readonly addMarker: (marker: MarkerConfig) => void;
  readonly removeMarker: (id: string) => void;
  readonly setHtmlMarkers: (markers: ReadonlyArray<HtmlMarkerConfig>) => void;
  readonly addHtmlMarker: (marker: HtmlMarkerConfig) => void;
  readonly removeHtmlMarker: (id: string) => void;
  readonly setArcs: (arcs: ReadonlyArray<ArcConfig>) => void;
  readonly addArc: (arc: ArcConfig) => void;
  readonly removeArc: (id: string) => void;
  readonly toImage: (options?: { width?: number; height?: number }) => Promise<string>;
  readonly resize: () => void;
  readonly getCanvas: () => HTMLCanvasElement;
}
