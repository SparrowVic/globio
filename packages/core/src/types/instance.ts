import type { ScaleConfig } from '../data/scales';
import type { LegendOptions } from '../data/legend';
import type { SceneConfig, StoryConfig } from '../story/types';
import type { LatLng } from './primitives';
import type { CountryDataMap } from './countries';
import type {
  GlobeEventName,
  GlobeEventUnsubscribe,
  GlobeEvents,
} from './events';
import type { ArcConfig, HtmlMarkerConfig, MarkerConfig } from './markers';
import type { FlyToOptions, FocusOptions } from './camera';
import type { GlobeConfig } from './globe-config';
import type { CinematicDataset } from './kinds';
import type { GlobeCanvasBackground } from './background';
// We import the DataLayer type lazily via `import('...')` in method
// signatures to avoid bundling the data-layers module into anything that
// only depends on the public type — keeps tree-shaking honest.

/** Options for exporting a WebGL frame as a PNG data URL. */
export interface GlobeImageExportOptions {
  /**
   * Exact positive-integer PNG pixel width; provide height too. Export temporarily uses pixel ratio
   * 1 so the live display density cannot multiply this value.
   */
  readonly width?: number;
  /**
   * Exact positive-integer PNG pixel height; provide width too. Export temporarily uses pixel ratio
   * 1 so the live display density cannot multiply this value.
   */
  readonly height?: number;
  /**
   * Canvas fill used for this export only. `'current'` preserves the live
   * canvas, `'theme'` uses the active theme, and `'transparent'` produces an
   * alpha canvas. A CSS colour creates an opaque custom fill. Default
   * `'current'`.
   */
  readonly background?: 'current' | GlobeCanvasBackground;
  /**
   * Set false to hide the current starfield backdrop for this export,
   * including the cinematic Milky Way and dotted constellation lines. True
   * or omitted preserves its current visibility. Does not hide the globe's
   * atmosphere or glow. Default true.
   */
  readonly includeBackdrop?: boolean;
  /**
   * Temporary viewport-edge fade for the backdrop, using the same 0..0.5
   * fraction as `GlobeConfig.background.edgeFade`.
   */
  readonly edgeFade?: number;
}

/**
 * Mounted globe lifecycle, camera, data and interaction methods. Create with `createGlobe()`, then
 * call `mount()` to start rendering.
 */
export interface GlobeInstance {
  /**
   * Load country geometry and start rendering once. Repeated calls and calls after destroy are
   * ignored; the canvas is attached when createGlobe() constructs the instance.
   */
  readonly mount: () => void;
  /** Release the WebGL context, workers and listeners. The instance is unusable afterwards. */
  readonly destroy: () => void;
  /**
   * Merge a partial config and apply supported live layer settings. Recreate the instance for
   * construction settings such as kind, theme, container, axis tilt, framing, zoom limits and
   * performance.
   */
  readonly update: (config: Partial<GlobeConfig>) => void;
  /** Subscribe to an event. Returns the function that unsubscribes. */
  readonly on: <K extends GlobeEventName>(
    event: K,
    handler: GlobeEvents[K]
  ) => GlobeEventUnsubscribe;
  /** Unsubscribe a handler passed to `on()`. */
  readonly off: <K extends GlobeEventName>(event: K, handler: GlobeEvents[K]) => void;
  /** Point the globe at a `[lat, lng]` without changing distance; eased when `animate` is true. */
  readonly setRotation: (position: LatLng, animate?: boolean) => void;
  /** Animate the camera to a `[lat, lng]`; `distance` in globe radii keeps the current zoom when omitted. */
  readonly flyTo: (position: LatLng, distance?: number, options?: FlyToOptions) => void;
  /** Fly to a country and fit its bounds. Pauses auto-rotate unless told otherwise. */
  readonly focusOnCountry: (id: string, options?: FocusOptions) => void;
  /** Pin a country as selected, or clear the selection with `null`. */
  readonly setActiveCountry: (id: string | null) => void;
  /** The pinned country id, if any. */
  readonly getActiveCountry: () => string | null;
  /**
   * Replace bound country data and the active data-layer slot with a choropleth. Explicit colors win
   * over a supplied scale; null clears an active choropleth while preserving other layer types.
   */
  readonly setCountryData: (data: CountryDataMap | null, scale?: ScaleConfig) => void;
  /**
   * Current bound country-data map with normalized ids, or null. Choropleth layers can also update
   * this map.
   */
  readonly getCountryData: () => CountryDataMap | null;
  /**
   * Mount or replace the active **data layer** — the high-level data
   * visualisation slot orthogonal to the kind. Pass `null` to remove.
   *
   * `globe.setDataLayer({ type: 'choropleth', data: { '616': { value: 42 } } })`
   *
   * Only one data layer can be active at a time. Visual rendering is delegated
   * to the active kind's decoration. Unsupported types remove the current layer,
   * leave the slot empty and log a warning. Calls before initialization queue
   * the requested layer until the kind is ready. See `FEATURES.md` for support.
   */
  readonly setDataLayer: (layer: import('../data-layers/types').DataLayer | null) => void;
  /** The active data layer config, if any. */
  readonly getDataLayer: () => import('../data-layers/types').DataLayer | null;
  /**
   * Replace the cinematic city-light and route dataset without occupying the generic data-layer
   * slot. Other kinds retain the dataset but do not render it.
   */
  readonly setCinematicData: (dataset: CinematicDataset | null) => void;
  /** The dataset last passed to `setCinematicData()`. */
  readonly getCinematicData: () => CinematicDataset | null;
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
  /** Remove the legend. */
  readonly hideLegend: () => void;
  /** Load a story, or clear it with `null`. Starts playing when `autoPlay` is set. */
  readonly setStory: (story: StoryConfig | null) => void;
  /** Start or resume auto-advancing with a fresh scene-duration timer. After completion, replay from the first scene. */
  readonly playStory: () => void;
  /** Stop automatic scene advancement; camera motion and delayed transitions continue. Resuming uses the full scene duration. */
  readonly pauseStory: () => void;
  /** Advance to the next scene. After non-looping completion, further calls do nothing until playback or navigation restarts it. */
  readonly nextScene: () => void;
  /** Go back one scene. */
  readonly prevScene: () => void;
  /** Jump to a scene by id. */
  readonly goToScene: (id: string) => void;
  /** Current scene, including the last scene after completion; null before any scene is entered or after clearing the story. */
  readonly getCurrentScene: () => SceneConfig | null;
  /** Whether the story is auto-advancing. */
  readonly isStoryPlaying: () => boolean;
  /** Replace every marker. */
  readonly setMarkers: (markers: ReadonlyArray<MarkerConfig>) => void;
  /** Add one marker; an existing id is replaced. */
  readonly addMarker: (marker: MarkerConfig) => void;
  /** Remove a marker by id. */
  readonly removeMarker: (id: string) => void;
  /** Replace every DOM-anchored marker. */
  readonly setHtmlMarkers: (markers: ReadonlyArray<HtmlMarkerConfig>) => void;
  /** Add one DOM-anchored marker. */
  readonly addHtmlMarker: (marker: HtmlMarkerConfig) => void;
  /** Remove a DOM-anchored marker by id. */
  readonly removeHtmlMarker: (id: string) => void;
  /** Replace every arc. */
  readonly setArcs: (arcs: ReadonlyArray<ArcConfig>) => void;
  /** Add one arc; an existing id is replaced. */
  readonly addArc: (arc: ArcConfig) => void;
  /** Remove an arc by id. */
  readonly removeArc: (id: string) => void;
  /**
   * Return the WebGL canvas as a PNG data URL; HTML markers, labels and DOM overlays are not
   * included. A custom size is measured in exact PNG pixels and requires both finite positive
   * integer dimensions; invalid dimensions reject.
   */
  readonly toImage: (options?: GlobeImageExportOptions) => Promise<string>;
  /**
   * Pause or resume rendering without tearing anything down. A paused globe
   * keeps its scene, data and WebGL context and costs no frame time; use it
   * for globes kept warm behind a cross-fade or in an inactive tab panel.
   * Off-screen and hidden-tab pausing (`performance.pauseWhenHidden`) is
   * automatic and independent of this switch.
   */
  readonly setPaused: (paused: boolean) => void;
  /** Re-measure the container layout size. A ResizeObserver normally does this automatically. */
  readonly resize: () => void;
  /** The canvas element. */
  readonly getCanvas: () => HTMLCanvasElement;
  /**
   * Project a lat/lng pair to canvas-relative pixel coordinates `[x, y]`.
   * Returns `null` when the point is on the back hemisphere (occluded by
   * the globe) or projects outside the canvas. Useful for anchoring DOM
   * overlays to specific points on the surface.
   */
  readonly project: (lat: number, lng: number) => readonly [number, number] | null;
}
