// Public-API type surface. Re-exports every interface / type alias the
// package exposes through `@your-globe/core`. Internal modules are free to
// import either from here (`'../types'`) or directly from a specific file
// when they only need one slice — both resolve identically post-bundle.

export type {
  GlobeKind,
  GlobeMode,
  LatLng,
  ResolutionLevel,
} from './primitives';

export type {
  CountriesConfig,
  CountryData,
  CountryDataEntry,
  CountryDataMap,
  CountryEvent,
  CountryLabelsConfig,
} from './countries';

export type {
  ArcConfig,
  HtmlMarkerConfig,
  MarkerConfig,
  MarkerEvent,
} from './markers';

export type {
  AtmosphereConfig,
  StarfieldConfig,
} from './atmosphere';

export type {
  CinematicConfig,
  CinematicCityLightDatum,
  CinematicDataset,
  CinematicQuality,
  CinematicReactivityConfig,
  CinematicRouteDatum,
  CinematicRouteEndpoint,
  DottedConfig,
  HologramConfig,
  OutlineConfig,
  PaperConfig,
  WireframeConfig,
} from './kinds';

export type {
  AutoRotateConfig,
  EasingFunction,
  EasingName,
  FlyToOptions,
  FocusOptions,
  FramingConfig,
  ZoomConfig,
  ZoomMode,
} from './camera';

export type { PerformanceConfig } from './performance';

export type { GlobeConfig } from './globe-config';

export type {
  GlobeEventName,
  GlobeEventUnsubscribe,
  GlobeEvents,
  SurfaceClickEvent,
} from './events';

export type { GlobeInstance } from './instance';
