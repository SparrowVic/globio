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
  /**
   * Width of the smoothstep band (as a fraction of `minScreenSize`) over
   * which the label fades from invisible to fully visible. 0 = hard cutoff,
   * 1 = fades start at zero size. Default 0.4 (label is fully on by
   * `minScreenSize`, fully off below `minScreenSize * 0.6`).
   */
  readonly sizeFadeRange?: number;
  /**
   * Occlusion smoothstep edges (`facing` = dot product of country normal
   * with camera direction). Defaults `[-0.05, 0.15]` — labels remain visible
   * just past the silhouette and fade in fully once the country has rotated
   * a hair toward the camera. Pass `[0, 0]` for a hard cutoff at the
   * silhouette.
   */
  readonly occlusionFade?: readonly [edge0: number, edge1: number];
  /**
   * Fade-in / fade-out duration in milliseconds, applied as a CSS
   * `transition: opacity Xms ease-out`. Default 200. Set to 0 to snap.
   */
  readonly transitionMs?: number;
  /**
   * Optional CSS halo around each label (a thicker, blurred outline that
   * keeps the text legible against any base color). Drawn via stacked
   * `text-shadow` calls so it works without a canvas pass. When provided,
   * **replaces** the theme `countries.label.textShadow` token.
   */
  readonly halo?: {
    readonly color?: string;
    /** Halo radius in CSS pixels. Default 2. */
    readonly radius?: number;
    /** Number of stacked shadow copies (more = denser halo). Default 4. */
    readonly steps?: number;
  };
  /**
   * Inner padding applied to each label element in CSS pixels — useful
   * when you want a larger hit-test area, breathing room behind a halo,
   * or to offset the label from a halo background. Default 0.
   */
  readonly padding?: number;
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
  /**
   * Hover-stroke geometry knobs specific to outline. Outline is pure linework
   * so the default "lift the highlight a hair above the base border" trick
   * other kinds use produces a visible duplicate-stroke ghost. These knobs
   * let callers tune (or zero out) the lift to taste.
   *
   * - `lift` — multiplier added to the surface radius for the *crisp*
   *   highlight stroke (the recoloured border). 0 (default) means draw at
   *   the same radius as the base border, so the highlight just recolors
   *   the existing line. Values like 0.0025 reproduce the legacy lifted
   *   look used by other kinds.
   * - `glowLift` — multiplier for the additive halo behind the highlight.
   *   Default 0.0035 — keeps the soft aura noticeably above the surface
   *   without competing with the crisp stroke.
   *
   * Both are *relative to* the globe radius, so 0.001 = 0.1% above surface.
   */
  readonly hover?: {
    readonly lift?: number;
    readonly glowLift?: number;
  };
  readonly hoverGlow?: { readonly enabled?: boolean };
  /**
   * Sci-fi sonar pulse fired from a focused country's centroid (or click
   * point, depending on `focusPulse.origin` at the top level). Outline's
   * defaults produce a crisp gold ring with quadratic fade — knobs let
   * callers thicken / slow / brighten it without re-styling the whole
   * preset.
   */
  readonly focusPulse?: {
    readonly enabled?: boolean;
    readonly durationMs?: number;
    readonly color?: string;
    /** Ring radius at scale=1 in radians on the sphere. Default 0.06 (~3.4°). */
    readonly angularRadiusBase?: number;
    /** Band thickness in radians. Default 0.013 (~0.7°). */
    readonly angularBand?: number;
    /** Linear scale of the ring at t=0. Default 0.4. */
    readonly scaleMin?: number;
    /** Linear scale of the ring at t=1 (peak expansion). Default 2.5. */
    readonly scaleMax?: number;
    /** Initial alpha at t=0. Default 1.0. */
    readonly peakOpacity?: number;
    /** Polygon resolution around the ring. Default 96. */
    readonly segments?: number;
    /** Lift above the globe surface as a multiplier of GLOBE_RADIUS. Default 1.0045. */
    readonly radiusFactor?: number;
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
  /**
   * Glowing ring around the centroid of the currently active (pinned) country.
   * Sized to enclose the country's main ring with `padding` margin; rotates
   * slowly around its outward axis. Fades in/out on activate/clear.
   */
  readonly activeRing?: {
    readonly enabled?: boolean;
    /** Rotation around the outward axis (rad/sec). Default 0.5. */
    readonly rotationSpeed?: number;
    /** Multiplier on the country's angular radius. Default 1.2. */
    readonly padding?: number;
  };
  /**
   * Distant data-flow streams — small luminous particles continuously falling
   * from the north pole towards the south pole along random meridians.
   */
  readonly poleStreams?: {
    readonly enabled?: boolean;
    /** Number of simultaneously-active particles. Default 16. */
    readonly count?: number;
    /** Southward angular velocity in radians/sec. Default 0.6. */
    readonly speed?: number;
  };
}

/**
 * Paper kind — vintage atlas: cream parchment surface, hand-drawn jittered
 * ink borders, optional pastel country fill, optional faint atlas grid.
 * `borderRoughness` overrides the `paper.borderRoughness` token (degrees of
 * lng/lat jitter per vertex; ~0.25 reads as confident pen, ~0.6 looks shaky).
 */
export interface PaperConfig {
  readonly grid?: { readonly enabled?: boolean };
  readonly fill?: { readonly enabled?: boolean };
  readonly borderRoughness?: number;
}

/**
 * Hologram kind extras — scanlines, Fresnel rim glow, glitch transients,
 * and an optional outer-shell glow that amplifies the silhouette. All
 * default-on; toggle individually for the look you want.
 */
export interface HologramConfig {
  readonly scanlines?: { readonly enabled?: boolean };
  readonly rimGlow?: { readonly enabled?: boolean };
  readonly glitch?: {
    readonly enabled?: boolean;
    /** Lower bound of inter-glitch wait (seconds). Default 4. */
    readonly intervalMin?: number;
    /** Upper bound of inter-glitch wait (seconds). Default 9. */
    readonly intervalMax?: number;
  };
  readonly outerGlow?: { readonly enabled?: boolean };
}

export interface StarfieldConfig {
  readonly enabled?: boolean;
  /**
   * Star count override. Defaults to the active theme's `starfield.density`.
   * Higher values cost more vertex shader work but no overdraw — typical
   * range 500..6000.
   */
  readonly density?: number;
  /** Base star size in CSS pixels. Defaults to the theme `starfield.size`. */
  readonly size?: number;
  /**
   * Optional palette to sample per-star colors from. When provided, each
   * star picks a random hex string. Falls back to the theme `starfield.color`
   * when omitted.
   *
   *   palette: ['#ffffff', '#ffe9c4', '#c4d8ff', '#ffd4b1']
   *   // mix of white / warm yellow / cool blue / faint red
   */
  readonly palette?: ReadonlyArray<string>;
  /**
   * Per-star size jitter as a fraction of base size. 0 = all stars identical,
   * 1 = sizes range from 0× to 2× base. Default 0.5.
   */
  readonly sizeVariety?: number;
  /**
   * Twinkle animation. Disabled by default — opt-in for an organic
   * "real night sky" feel. Each star animates with a random phase so the
   * field never pulses in unison.
   */
  readonly twinkle?: {
    readonly enabled?: boolean;
    /** 0..1, brightness amplitude. Default 0.45. */
    readonly intensity?: number;
    /** Average frequency in Hz. Default 0.55. */
    readonly speed?: number;
  };
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
  /**
   * Override the camera target lat/lng. Defaults to the country's centroid
   * (computed from its main-ring bounds). Useful for "direct-focus" — click
   * on Russia, fly toward the exact spot you clicked while still framing
   * the whole country at the right zoom.
   */
  readonly center?: LatLng;
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
  /**
   * Cross-kind behaviour for the focus-pulse decoration. Visual style still
   * comes from each kind's `focusPulse` decorator (see `kinds/shared/focus-
   * pulse-decorators.ts`); this section governs *when* and *where* the
   * pulse fires regardless of kind.
   *
   * - `origin` — `'centroid'` (default) fires from the focused country's
   *   centroid via `globe.focusOnCountry()`. `'click'` instead uses the
   *   exact lat/lng the user just clicked, falling back to the centroid if
   *   no recent click was recorded.
   * - `pulseOnSurfaceClick` — when true, additionally fire a pulse on
   *   *any* surface click that doesn't land on a country (e.g. clicks on
   *   ocean / wireframe void). Default false.
   */
  readonly focusPulse?: {
    /** Master enable. When false, no kind spawns its pulse decorator. Default true. */
    readonly enabled?: boolean;
    readonly origin?: 'centroid' | 'click';
    readonly pulseOnSurfaceClick?: boolean;
  };
  readonly outline?: OutlineConfig;
  readonly dotted?: DottedConfig;
  readonly wireframe?: WireframeConfig;
  readonly paper?: PaperConfig;
  readonly hologram?: HologramConfig;
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
  /**
   * Render with a transparent canvas — the host page bleeds through.
   * Useful when the globe is decoration on top of a page gradient or
   * background image and you don't want the theme's `background.color`
   * to clip the visual as a square. Default `false`.
   */
  readonly transparent?: boolean;
  /**
   * How the globe is framed inside its container. The atmosphere shell
   * extends ~15% beyond the globe's surface and its Fresnel halo fades
   * even further out — without breathing room those edges visibly clip
   * against the canvas, especially in transparent / decoration mode.
   *
   * - `padding` (0..0.5): fraction of the viewport reserved as margin
   *   around the visible globe + atmosphere extent. 0 lets the renderer
   *   fill the canvas (legacy behaviour); 0.15–0.25 leaves room for the
   *   atmosphere halo to fade smoothly. Default 0.
   * - `lockZoom`: when true, also clamps `minZoom` / `maxZoom` to the
   *   computed framing distance so users can't zoom out of the frame.
   *   Useful for purely decorative embeds. Default false.
   */
  readonly framing?: {
    readonly padding?: number;
    readonly lockZoom?: boolean;
  };
}

export interface SurfaceClickEvent {
  /** Lat/lng of the click on the globe surface, in globe-local coords. */
  readonly point: LatLng;
}

export interface GlobeEvents {
  readonly countryClick: (event: CountryEvent) => void;
  readonly countryHover: (event: CountryEvent | null) => void;
  readonly markerClick: (event: MarkerEvent) => void;
  readonly markerHover: (event: MarkerEvent | null) => void;
  /**
   * Fires for any globe-surface click that did NOT land on a country
   * (oceans / void areas). Lets the demo or app choose what to do — fly
   * to the click point, ignore, etc. Country clicks emit `countryClick`
   * separately, never both.
   */
  readonly surfaceClick: (event: SurfaceClickEvent) => void;
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
   * Mount or replace the active **data layer** — the high-level data
   * visualisation slot orthogonal to the kind. Pass `null` to remove.
   *
   * `globe.setDataLayer({ type: 'choropleth' | 'bars' | 'extruded' | 'heatmap' | 'hexbin' | 'charts', ... })`
   *
   * Only one data layer can be active at a time. Visual rendering is
   * delegated to the active kind's decoration; if the kind doesn't ship
   * a decoration for the requested type, the call is a no-op (with a
   * single console.warn). See `FEATURES.md` section 5c for the catalogue.
   */
  readonly setDataLayer: (layer: import('./data-layers/types').DataLayer | null) => void;
  readonly getDataLayer: () => import('./data-layers/types').DataLayer | null;
  /**
   * Replay the active data layer's mount animation when the current layer
   * supports animation. Returns false when no animated data layer is active.
   */
  readonly playDataLayerAnimation: () => boolean;
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
