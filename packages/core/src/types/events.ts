import type { LatLng } from './primitives';
import type { CountryEvent } from './countries';
import type { MarkerEvent } from './markers';
import type {
  StoryCompleteEvent,
  StorySceneEvent,
} from '../story/types';

/** Payload of `surfaceClick`. */
export interface SurfaceClickEvent {
  /** Lat/lng of the click on the globe surface, in globe-local coords. */
  readonly point: LatLng;
}

/** Typed event-handler signatures accepted by `on()` and `off()`. */
export interface GlobeEvents {
  /** A country was clicked. Markers take priority when both are under the pointer. */
  readonly countryClick: (event: CountryEvent) => void;
  /** The country under the pointer changed; `null` when the pointer left every country. */
  readonly countryHover: (event: CountryEvent | null) => void;
  /** A marker was clicked. */
  readonly markerClick: (event: MarkerEvent) => void;
  /** The marker under the pointer changed; `null` on leave. */
  readonly markerHover: (event: MarkerEvent | null) => void;
  /**
   * Fires for any globe-surface click that did NOT land on a country
   * (oceans / void areas). Lets the demo or app choose what to do — fly
   * to the click point, ignore, etc. Country clicks emit `countryClick`
   * separately, never both.
   */
  readonly surfaceClick: (event: SurfaceClickEvent) => void;
  /** Country geometry and kind layers initialized successfully and shader preparation finished. */
  readonly ready: () => void;
  /**
   * Country geometry loading or kind initialization failed. WebGL construction failures throw from
   * createGlobe().
   */
  readonly error: (error: Error) => void;
  /** The story engine entered a scene. */
  readonly sceneEnter: (event: StorySceneEvent) => void;
  /** The story engine left a scene. */
  readonly sceneExit: (event: StorySceneEvent) => void;
  /** The last scene finished and the story does not loop. */
  readonly storyComplete: (event: StoryCompleteEvent) => void;
}

/** Name of a supported globe event. */
export type GlobeEventName = keyof GlobeEvents;

/** Unsubscribe callback returned by `on()`. */
export type GlobeEventUnsubscribe = () => void;
