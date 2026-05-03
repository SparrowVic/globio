import type { LatLng } from './primitives';
import type { CountryEvent } from './countries';
import type { MarkerEvent } from './markers';
import type {
  StoryCompleteEvent,
  StorySceneEvent,
} from '../story/types';

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
