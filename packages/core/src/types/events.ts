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
  /** Countries are loaded and the shaders are compiled; the first real frame is on screen. */
  readonly ready: () => void;
  /** Country geometry failed to load, or WebGL is unavailable. */
  readonly error: (error: Error) => void;
  /** The story engine entered a scene. */
  readonly sceneEnter: (event: StorySceneEvent) => void;
  /** The story engine left a scene. */
  readonly sceneExit: (event: StorySceneEvent) => void;
  /** The last scene finished and the story does not loop. */
  readonly storyComplete: (event: StoryCompleteEvent) => void;
}

export type GlobeEventName = keyof GlobeEvents;

export type GlobeEventUnsubscribe = () => void;
