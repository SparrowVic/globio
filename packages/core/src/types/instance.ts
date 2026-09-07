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
// We import the DataLayer type lazily via `import('...')` in method
// signatures to avoid bundling the data-layers module into anything that
// only depends on the public type — keeps tree-shaking honest.

export interface GlobeInstance {
  /** Attach the canvas to the container, load country geometry and start rendering. */
  readonly mount: () => void;
  /** Release the WebGL context, workers and listeners. The instance is unusable afterwards. */
  readonly destroy: () => void;
  /** Patch the running config. A new `kind` rebuilds the renderer in place; every other key is applied live. */
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
   * Apply a country-data map. When `scale` is provided, entries' `value` is
   * mapped to a color via the scale (sequential/diverging/threshold/
   * categorical); explicit `color` on an entry always wins over the scale.
   * Pass `null` to hide the fill layer.
   */
  readonly setCountryData: (data: CountryDataMap | null, scale?: ScaleConfig) => void;
  /** The map last passed to `setCountryData()`. */
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
  readonly setDataLayer: (layer: import('../data-layers/types').DataLayer | null) => void;
  /** The active data layer config, if any. */
  readonly getDataLayer: () => import('../data-layers/types').DataLayer | null;
  /**
   * Replace the persistent cinematic dataset used by the cinematic kind's
   * built-in city lights and route network. This does not occupy the
   * generic `setDataLayer()` overlay slot, so callers can combine it with
   * heatmaps, choropleths, charts, etc. Non-cinematic kinds store the data
   * and apply it when the globe switches back to `kind: 'cinematic'`.
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
  /** Start or resume auto-advancing from the current scene. */
  readonly playStory: () => void;
  /** Stop auto-advancing; the current scene stays. */
  readonly pauseStory: () => void;
  /** Advance to the next scene. */
  readonly nextScene: () => void;
  /** Go back one scene. */
  readonly prevScene: () => void;
  /** Jump to a scene by id. */
  readonly goToScene: (id: string) => void;
  /** The scene the story is in, or `null` without a story. */
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
  /** A PNG data URL of the current frame, optionally rendered at another size. */
  readonly toImage: (options?: { width?: number; height?: number }) => Promise<string>;
  /**
   * Pause or resume rendering without tearing anything down. A paused globe
   * keeps its scene, data and WebGL context and costs no frame time; use it
   * for globes kept warm behind a cross-fade or in an inactive tab panel.
   * Off-screen and hidden-tab pausing (`performance.pauseWhenHidden`) is
   * automatic and independent of this switch.
   */
  readonly setPaused: (paused: boolean) => void;
  /** Re-measure the container. A ResizeObserver does this automatically; call it after a CSS transform. */
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
