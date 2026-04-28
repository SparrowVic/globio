import type { ThemeInput } from './theme/types';
import type {
  SceneConfig,
  StoryConfig,
  StorySceneEvent,
  StoryCompleteEvent,
} from './story/types';
import type { ScaleConfig } from './data/scales';
import type { LegendOptions } from './data/legend';
// Re-exported below for the public API.
import type { GlobeKind as _GlobeKind } from './kinds/types';
type GlobeKind = _GlobeKind;

export type LatLng = readonly [latitude: number, longitude: number];

export type ResolutionLevel = 'low' | 'medium' | 'high';

export type GlobeMode = 'sphere' | 'flat';

export type { GlobeKind } from './kinds/types';

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

export interface CountriesConfig {
  readonly resolution?: ResolutionLevel;
  readonly hoverEnabled?: boolean;
  /**
   * When true (default), the hover highlight respects the globe's depth —
   * the back-side portions of a country (e.g. the part wrapped around the
   * far side) are hidden. Set to false for an "x-ray" feel where the entire
   * country outline is always visible.
   */
  readonly hoverOccludeBackSide?: boolean;
}

/**
 * Country name labels rendered as HTML overlays at each country's centroid.
 * Hidden by default — enable explicitly. Small countries fade out when
 * zoomed out (`minScreenSize`); labels on the far side of the globe fade
 * via the same occlusion smoothstep as HTML markers.
 */
export interface CountryLabelsConfig {
  readonly enabled?: boolean;
  /** Per-id override map; missing ids fall back to the source `feature.name`. */
  readonly labels?: Readonly<Record<string, string>>;
  /**
   * Minimum apparent screen-pixel size of a country before its label
   * appears. Higher = stricter (fewer labels at any given zoom). Default 60.
   */
  readonly minScreenSize?: number;
}

export interface AtmosphereConfig {
  readonly enabled?: boolean;
}

/**
 * Outline kind extras — visual polish layered on top of the base border mesh.
 * - `hoverGlow` — soft additive halo behind the hovered country's borders.
 * - `focusPulse` — sci-fi sonar ring that fires from a country's centroid
 *   when `focusOnCountry()` is called.
 * - `hoverCrosshair` — Tron-style targeting reticle + DOM lat/lng readout
 *   that tracks the cursor whenever it sits over the globe surface.
 * - `continentDim` — when hovering a country, fade borders of countries on
 *   other continents to a dim level so the active region is foregrounded.
 * All default-on; disable per feature.
 */
export interface OutlineConfig {
  readonly hoverGlow?: { readonly enabled?: boolean };
  readonly focusPulse?: {
    readonly enabled?: boolean;
    readonly durationMs?: number;
    readonly color?: string;
  };
  readonly hoverCrosshair?: { readonly enabled?: boolean };
  readonly continentDim?: { readonly enabled?: boolean; readonly amount?: number };
}

/**
 * Per-instance overrides for the dotted kind's interactive effects.
 * `clickRipple` spawns a brightening sonar wave at every globe click;
 * `dataFlash` momentarily boosts a country's dots whenever its value in
 * `setCountryData()` changes; `drift` is a low-amplitude ambient wave that
 * gently breathes across the globe; `hoverDots` scales + brightens the
 * dots of the hovered country.
 */
export interface DottedConfig {
  readonly clickRipple?: {
    readonly enabled?: boolean;
    readonly boost?: number;
    readonly speed?: number;
    readonly width?: number;
    readonly maxConcurrent?: number;
  };
  readonly dataFlash?: {
    readonly enabled?: boolean;
    readonly strength?: number;
    readonly decay?: number;
  };
  /**
   * Ambient drift wave — `sin(dot(position, axis) * freq - elapsed * speed)`
   * added to per-dot brightness, very small amplitude so it feels like the
   * globe is breathing rather than strobing. Default-on.
   */
  readonly drift?: {
    readonly enabled?: boolean;
    readonly amplitude?: number;
    readonly speed?: number;
    readonly freq?: number;
    /** `'ns'` = north-south wave (drift along Y axis); `'ew'` = east-west. */
    readonly axis?: 'ns' | 'ew';
  };
  /**
   * Hover dot expansion — when a country is hovered, its dots scale up and
   * brighten, easing in/out smoothly. Default-on.
   */
  readonly hoverDots?: {
    readonly enabled?: boolean;
    readonly scale?: number;
    readonly brightnessBoost?: number;
    readonly duration?: number;
  };
}

/**
 * Wireframe lat/lng grid layer — pure mathematical sphere grid, no country
 * geometry. Auto-enabled when the active theme's `wireframe.opacity` token
 * is > 0 (e.g. preset `wireframe-tron`); set `enabled: true` explicitly to
 * force-on regardless of theme.
 */
export interface WireframeConfig {
  readonly enabled?: boolean;
  /** Override token-driven density (1 = default, lower = sparser). */
  readonly density?: number;
  /** Override token-driven pulse amplitude (0..1, 0 = disabled). */
  readonly pulse?: number;
  readonly pulseSpeed?: number;
  /**
   * Click pulse — radial brightness wave expanding along the grid from any
   * surface click. Tron-style impact feedback.
   */
  readonly clickPulse?: {
    readonly enabled?: boolean;
    /** Wavefront expansion in radians/sec. Default 1.5. */
    readonly speed?: number;
    /** Gaussian band half-width in radians. Default 0.18. */
    readonly width?: number;
    /** Peak brightness multiplier at the wavefront. Default 2.5. */
    readonly boost?: number;
    /** Maximum simultaneous click pulses (older ones recycle). Default 4. */
    readonly maxConcurrent?: number;
  };
  /**
   * Geographic emphasis — equator + tropics get 2× brightness; prime meridian
   * + antimeridian get half emphasis. Subtle visual hierarchy.
   */
  readonly emphasis?: {
    readonly enabled?: boolean;
  };
  /**
   * CRT-glitch transients — every interval seconds, a horizontal band briefly
   * shears laterally then snaps back. Atmosphere, not noise.
   */
  readonly glitch?: {
    readonly enabled?: boolean;
    /** Lower bound of inter-glitch wait (seconds). Default 5. */
    readonly intervalMin?: number;
    /** Upper bound of inter-glitch wait (seconds). Default 15. */
    readonly intervalMax?: number;
  };
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
  /**
   * Visual identity of the rendered globe. Each kind owns its renderer
   * pipeline + per-kind tokens + per-kind config. Defaults to the kind
   * registered for the active theme preset (`outline-*` → `'outline'`,
   * `'dotted-dark'` → `'dotted'`, `'wireframe-tron'` → `'wireframe'`),
   * falling back to `'outline'` for custom themes.
   */
  readonly kind?: GlobeKind;
  readonly theme?: ThemeInput;
  readonly countries?: CountriesConfig;
  readonly countryLabels?: CountryLabelsConfig;
  readonly countryData?: CountryDataMap;
  readonly markers?: ReadonlyArray<MarkerConfig>;
  readonly htmlMarkers?: ReadonlyArray<HtmlMarkerConfig>;
  readonly arcs?: ReadonlyArray<ArcConfig>;
  readonly atmosphere?: AtmosphereConfig;
  readonly outline?: OutlineConfig;
  readonly dotted?: DottedConfig;
  readonly wireframe?: WireframeConfig;
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
   * Toggle on-globe country name labels. If labels weren't enabled in the
   * initial config, this turns them on for the first time and reuses the
   * defaults — pass `setCountryLabels()` afterwards to customise.
   */
  readonly setCountryLabelsEnabled: (enabled: boolean) => void;
  /** Replace the per-id label override map. Missing ids fall back to source names. */
  readonly setCountryLabels: (labels: Readonly<Record<string, string>>) => void;
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
