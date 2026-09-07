import type { EasingFunction, EasingName, LatLng } from '../types';

/**
 * One step in a story timeline. Each scene optionally moves the camera,
 * highlights a country, and shows a popup; auto-advances after `duration`.
 */
export interface SceneConfig {
  /** Stable id for `goToScene()` and event payloads. Must be unique per story. */
  readonly id: string;
  /**
   * Auto-advance delay in milliseconds from scene entry, including any transition delay and camera
   * movement.
   */
  readonly duration: number;
  /**
   * Camera movement duration in milliseconds. Defaults to min(1500, floor(duration * 0.6));
   * transitionDelay uses the same scene-time budget.
   */
  readonly transitionDuration?: number;
  /**
   * Delay in ms between scene enter and the camera transition starting.
   * Useful for letting a popup appear before the camera moves. Default 0.
   */
  readonly transitionDelay?: number;
  /**
   * Extra camera radius peaking at the midpoint of the transition. Creates
   * a "fly-over arc" — pulls the camera up and back down for a cinematic
   * feel on long jumps. Default 0 (straight slerp).
   */
  readonly transitionElevation?: number;
  /**
   * Easing for the camera transition. Accepts a function or a CSS-like name
   * (`'linear'`, `'easeIn'`, `'easeOut'`, `'easeInOut'`). Default `'easeInOut'`.
   */
  readonly easing?: EasingFunction | EasingName;
  /**
   * If set, toggle auto-rotate while this scene is active. Restored on the
   * next scene that specifies it (otherwise stays as last set). Useful for
   * "intro spinning earth" scenes paired with stationary detail scenes.
   */
  readonly autoRotate?: boolean;
  /**
   * Fly the camera to a lat/lng. Mutually exclusive with `focusOnCountry` —
   * if both are provided, `focusOnCountry` wins.
   */
  readonly flyTo?: {
    /** Camera target latitude and longitude in degrees. */
    readonly position: LatLng;
    /** Target distance in globe-radius units; omitted preserves the current distance. */
    readonly distance?: number;
  };
  /**
   * Auto-frame a country (uses bbox-derived distance). Pass a string for
   * default behaviour, or an object to override padding (smaller padding =
   * more zoomed-in arrival).
   */
  readonly focusOnCountry?:
    | string
    | {
        /** Country id whose bounds should be framed. */
        readonly id: string;
        /** Viewport padding used to frame the country. Default 0.15. */
        readonly padding?: number;
      };
  /**
   * Active country to highlight throughout this scene. Pass `null` to
   * explicitly clear; omit to inherit from the previous scene.
   */
  readonly activeCountry?: string | null;
  /** Optional HTML popup anchored to a position; auto-removed on scene exit. */
  readonly popup?: {
    /** Popup anchor latitude and longitude in degrees. */
    readonly position: LatLng;
    /** Trusted HTML markup inserted as the popup content. */
    readonly content: string;
    /** Anchor edge of the popup element. Default `'center'`. */
    readonly anchor?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  };
}

/** Ordered scene timeline with optional autoplay, looping and an initial scene id. */
export interface StoryConfig {
  /** Ordered scenes with unique ids; an empty array has nothing to play. */
  readonly scenes: ReadonlyArray<SceneConfig>;
  /** Begin auto-advancing on `setStory()`. Default false. */
  readonly autoPlay?: boolean;
  /** Restart from scene 0 after the last scene completes. Default false. */
  readonly loop?: boolean;
  /**
   * Scene id entered immediately on setStory(), even without autoplay. Omitted waits until playback
   * or navigation enters a scene.
   */
  readonly startAt?: string;
}

/** Scene identity and zero-based position emitted on story entry or exit. */
export interface StorySceneEvent {
  /** Scene being entered or exited. */
  readonly scene: SceneConfig;
  /** Zero-based index in the story scenes array. */
  readonly index: number;
}

/** Emitted once when a non-looping story completes; the handler may start another story or replay this one. */
export interface StoryCompleteEvent {
  /** The completed non-looping story configuration. */
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
    options: { duration?: number; easing?: EasingFunction; elevation?: number }
  ): void;
  focusOnCountry(
    id: string,
    options: {
      duration?: number;
      easing?: EasingFunction;
      elevation?: number;
      padding?: number;
    }
  ): void;
  setActiveCountry(id: string | null): void;
  setAutoRotate(enabled: boolean): void;
  setStoryPopup(popup: SceneConfig['popup'] | null): void;
  emitSceneEnter(event: StorySceneEvent): void;
  emitSceneExit(event: StorySceneEvent): void;
  emitStoryComplete(event: StoryCompleteEvent): void;
}
