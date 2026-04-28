import type { EasingFunction, LatLng } from '../types';

/**
 * One step in a story timeline. Each scene optionally moves the camera,
 * highlights a country, and shows a popup; auto-advances after `duration`.
 */
export interface SceneConfig {
  /** Stable id for `goToScene()` and event payloads. Must be unique per story. */
  readonly id: string;
  /** Total scene duration in milliseconds (camera transition + hold). */
  readonly duration: number;
  /**
   * Camera transition length in ms. Defaults to `min(1500, duration * 0.6)` —
   * leaves at least 40% of the scene as a settled "hold" after arrival.
   */
  readonly transitionDuration?: number;
  /** Easing for the camera transition. Default `easeInOutCubic`. */
  readonly easing?: EasingFunction;
  /**
   * Fly the camera to a lat/lng. Mutually exclusive with `focusOnCountry` —
   * if both are provided, `focusOnCountry` wins.
   */
  readonly flyTo?: { readonly position: LatLng; readonly distance?: number };
  /** Auto-frame a country (uses bbox-derived distance + padding). */
  readonly focusOnCountry?: string;
  /**
   * Active country to highlight throughout this scene. Pass `null` to
   * explicitly clear; omit to inherit from the previous scene.
   */
  readonly activeCountry?: string | null;
  /** Optional HTML popup anchored to a position; auto-removed on scene exit. */
  readonly popup?: {
    readonly position: LatLng;
    readonly content: string;
    readonly anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  };
}

export interface StoryConfig {
  readonly scenes: ReadonlyArray<SceneConfig>;
  /** Begin auto-advancing on `setStory()`. Default false. */
  readonly autoPlay?: boolean;
  /** Restart from scene 0 after the last scene completes. Default false. */
  readonly loop?: boolean;
  /** Scene id to start at. Defaults to first scene. */
  readonly startAt?: string;
}

export interface StorySceneEvent {
  readonly scene: SceneConfig;
  readonly index: number;
}

export interface StoryCompleteEvent {
  readonly story: StoryConfig;
}

/**
 * Thin interface the controller uses to drive the globe. Decouples the
 * controller from Three.js / GlobeInstance — makes it unit-testable with a
 * mock adapter and lets future renderers (2D, headless) reuse it.
 */
export interface StoryGlobeAdapter {
  flyTo(
    position: LatLng,
    distance: number | undefined,
    options: { duration?: number; easing?: EasingFunction }
  ): void;
  focusOnCountry(
    id: string,
    options: { duration?: number; easing?: EasingFunction }
  ): void;
  setActiveCountry(id: string | null): void;
  setStoryPopup(popup: SceneConfig['popup'] | null): void;
  emitSceneEnter(event: StorySceneEvent): void;
  emitSceneExit(event: StorySceneEvent): void;
  emitStoryComplete(event: StoryCompleteEvent): void;
}
