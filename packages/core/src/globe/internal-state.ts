import type { ArcsLayer } from '../renderer/arcs-layer';
import type { AtmosphereLayer } from '../renderer/atmosphere-layer';
import type { CountriesPickingLayer } from '../renderer/countries-picking-layer';
import type { CountryFeature } from '../renderer/country-feature';
import type { CountryHighlightLayer } from '../renderer/country-highlight-layer';
import type { CountriesFillLayer } from '../renderer/countries-fill-layer';
import type { CountryLabelsLayer } from '../renderer/country-labels-layer';
import type { CountryTooltip } from '../renderer/country-tooltip';
import type { GlobeMesh } from '../renderer/globe-mesh';
import type { HtmlMarkersLayer } from '../renderer/html-markers-layer';
import type { MarkersLayer } from '../renderer/markers-layer';
import type { SceneManager } from '../renderer/scene-manager';
import type { GlobeControls } from '../interaction/controls';
import type { PointerRaycaster } from '../interaction/raycaster';
import type { GlobeEventEmitter } from '../interaction/events';
import type { LegendInstance } from '../data/legend';
import type { GlobeKind, KindHandle, Public } from '../kinds/types';
import type {
  DataLayer,
  DataLayerHandle,
} from '../data-layers/types';
import type {
  CountryDataMap,
  GlobeConfig,
  LatLng,
} from '../types';

/**
 * Mutable runtime state owned by `createGlobe`. All public methods on
 * `GlobeInstance` close over this object — passing it explicitly between
 * helper functions lets the create-globe body break apart without losing
 * the shared-context that keeps the parts wired together.
 */
export interface InternalState {
  config: GlobeConfig;
  scene: SceneManager;
  globeMesh: GlobeMesh;
  markersLayer: Public<MarkersLayer>;
  /**
   * Active kind module's runtime handle. Built by the dispatcher in
   * `initCountries` once country features have loaded. Null on a globe
   * whose kind has no per-feature visual (none ship today, but reserved).
   */
  kindHandle: KindHandle | null;
  resolvedKind: GlobeKind;
  countriesPickingLayer: CountriesPickingLayer | null;
  /**
   * Loaded country features. Set once `initCountries()` resolves; data-layer
   * builders read this so they can scaffold their geometry without re-loading.
   */
  features: ReadonlyArray<CountryFeature> | null;
  countryLabelsLayer: Public<CountryLabelsLayer> | null;
  countryHighlightLayer: Public<CountryHighlightLayer> | null;
  countryActiveLayer: Public<CountryHighlightLayer> | null;
  /**
   * Per-country filled meshes (the new 9th canonical layer). Mounted in
   * `create-globe.ts` once features load for kinds that opt into
   * country interaction; null otherwise. Drives `none/always/palette/
   * data` modes plus the optional hover / active fill overrides.
   */
  countryFillLayer: Public<CountriesFillLayer> | null;
  countryTooltip: CountryTooltip | null;
  htmlMarkersLayer: HtmlMarkersLayer;
  arcsLayer: Public<ArcsLayer>;
  atmosphereLayer: Public<AtmosphereLayer> | null;
  controls: GlobeControls;
  raycaster: PointerRaycaster;
  emitter: GlobeEventEmitter;
  activeCountryId: string | null;
  countryData: CountryDataMap | null;
  /**
   * Active data layer slot. `setDataLayer(...)` replaces the entire pair —
   * disposes the previous handle, builds a new one via the active kind's
   * decoration, swaps it in. Null when no data layer is mounted.
   */
  dataLayer: { config: DataLayer; handle: DataLayerHandle } | null;
  legend: LegendInstance | null;
  /** Last surface click in lat/lng. Used for the focus-pulse `origin: 'click'` mode. */
  lastClickLatLng: LatLng | null;
  elapsedSeconds: number;
  destroyed: boolean;
}
