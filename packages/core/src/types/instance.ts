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
  readonly setDataLayer: (layer: import('../data-layers/types').DataLayer | null) => void;
  readonly getDataLayer: () => import('../data-layers/types').DataLayer | null;
  /**
   * Replace the persistent cinematic dataset used by the cinematic kind's
   * built-in city lights and route network. This does not occupy the
   * generic `setDataLayer()` overlay slot, so callers can combine it with
   * heatmaps, choropleths, charts, etc. Non-cinematic kinds store the data
   * and apply it when the globe switches back to `kind: 'cinematic'`.
   */
  readonly setCinematicData: (dataset: CinematicDataset | null) => void;
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
  /**
   * Pause or resume rendering without tearing anything down. A paused globe
   * keeps its scene, data and WebGL context and costs no frame time; use it
   * for globes kept warm behind a cross-fade or in an inactive tab panel.
   * Off-screen and hidden-tab pausing (`performance.pauseWhenHidden`) is
   * automatic and independent of this switch.
   */
  readonly setPaused: (paused: boolean) => void;
  readonly resize: () => void;
  readonly getCanvas: () => HTMLCanvasElement;
  /**
   * Project a lat/lng pair to canvas-relative pixel coordinates `[x, y]`.
   * Returns `null` when the point is on the back hemisphere (occluded by
   * the globe) or projects outside the canvas. Useful for anchoring DOM
   * overlays to specific points on the surface.
   */
  readonly project: (lat: number, lng: number) => readonly [number, number] | null;
}
