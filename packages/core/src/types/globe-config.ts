import type { ThemeInput } from '../theme/types';
import type { GlobeKind, GlobeMode, LatLng } from './primitives';
import type {
  CountriesConfig,
  CountryDataMap,
  CountryLabelsConfig,
} from './countries';
import type { ArcConfig, HtmlMarkerConfig, MarkerConfig } from './markers';
import type { AtmosphereConfig, StarfieldConfig } from './atmosphere';
import type {
  CinematicConfig,
  DottedConfig,
  HologramConfig,
  OutlineConfig,
  PaperConfig,
  WireframeConfig,
} from './kinds';
import type {
  AutoRotateConfig,
  FramingConfig,
  ZoomConfig,
} from './camera';
import type { PerformanceConfig } from './performance';
import type { PostProcessingConfig } from './postfx';
import type { GlobeBackgroundConfig } from './background';

/**
 * Configuration passed to `createGlobe()`. Most layer styling supports `update()`; construction
 * settings require a new instance.
 */
export interface GlobeConfig {
  /** The element the canvas fills. Size it with CSS; the globe follows it. */
  readonly container: HTMLElement;
  /**
   * Projection selector reserved for future map support; the renderer currently builds a sphere for
   * both values. Default `'sphere'`.
   */
  readonly mode?: GlobeMode;
  /**
   * Visual identity of the rendered globe. Each kind owns its renderer
   * pipeline + per-kind tokens + per-kind config. Defaults to the kind
   * registered for the active theme preset (`outline-*` → `'outline'`,
   * `'dotted-dark'` → `'dotted'`, `'wireframe-tron'` → `'wireframe'`),
   * falling back to `'outline'` for custom themes.
   */
  readonly kind?: GlobeKind;
  /**
   * Built-in or registered preset name, or `{ extends, tokens }` for token overrides. Omitted uses
   * the base token set; selecting a kind does not automatically select its preset.
   */
  readonly theme?: ThemeInput;
  /** Country geometry resolution, hover behaviour and per-instance border and fill styling. */
  readonly countries?: CountriesConfig;
  /** HTML country-name labels with size and occlusion fading. Disabled until `enabled` is true. */
  readonly countryLabels?: CountryLabelsConfig;
  /**
   * Initial per-country colours and values, keyed by zero-padded ISO 3166-1
   * numeric id. Same shape as `setCountryData()`.
   */
  readonly countryData?: CountryDataMap;
  /** Initial pins. Replace or edit later with `setMarkers()`, `addMarker()` and `removeMarker()`. */
  readonly markers?: ReadonlyArray<MarkerConfig>;
  /** Initial DOM-anchored markers. */
  readonly htmlMarkers?: ReadonlyArray<HtmlMarkerConfig>;
  /** Initial great-circle connections. */
  readonly arcs?: ReadonlyArray<ArcConfig>;
  /** The Fresnel rim glow. Rendered unless `enabled` is `false`. */
  readonly atmosphere?: AtmosphereConfig;
  /**
   * Cross-kind behaviour for the focus-pulse decoration. Visual style still
   * comes from each kind's `focusPulse` decorator (see `kinds/shared/focus-
   * pulse-decorators.ts`); this section governs *when* and *where* the
   * pulse fires regardless of kind.
   *
   * - `origin` — `'centroid'` (default) fires from the focused country's
   *   centroid via `globe.focusOnCountry()`. `'click'` instead uses the
   *   exact lat/lng the user just clicked, falling back to the centroid if
   *   no recent click was recorded.
   * - `pulseOnSurfaceClick` — when true, additionally fire a pulse on
   *   *any* surface click that doesn't land on a country (e.g. clicks on
   *   ocean / wireframe void). Default false.
   */
  readonly focusPulse?: {
    /** Master enable. When false, no kind spawns its pulse decorator. Default true. */
    readonly enabled?: boolean;
    /**
     * Use the focused country's centroid or a recent click coordinate as pulse origin. Default
     * `'centroid'`.
     */
    readonly origin?: 'centroid' | 'click';
    /** Also fire the pulse on ocean or other surface clicks outside a country. Default false. */
    readonly pulseOnSurfaceClick?: boolean;
  };
  /** Outline-specific styling plus `hoverCrosshair`, shared with dotted, cinematic, paper and hologram. */
  readonly outline?: OutlineConfig;
  /** Options read only when `kind` is `'cinematic'`. */
  readonly cinematic?: CinematicConfig;
  /** Options read only when `kind` is `'dotted'`. */
  readonly dotted?: DottedConfig;
  /** Options read only when `kind` is `'wireframe'`. */
  readonly wireframe?: WireframeConfig;
  /** Options read only when `kind` is `'paper'`. */
  readonly paper?: PaperConfig;
  /** Options read only when `kind` is `'hologram'`. */
  readonly hologram?: HologramConfig;
  /** Background stars. The layer is created only when `enabled` is `true`. */
  readonly starfield?: StarfieldConfig;
  /**
   * Shared HDR post-processing (bloom, anamorphic streak, vignette,
   * chromatic aberration, film grain, exposure + a soft highlight
   * roll-off — the scene layers stay display-referred). Runs after the
   * scene is drawn into an off-screen target, so it applies to every layer
   * at once. `enabled` defaults to `true` for the `cinematic` kind and
   * `false` for every other kind.
   */
  readonly postprocessing?: PostProcessingConfig;
  /**
   * Canvas fill and optional viewport-edge fade for scene backdrops. This is
   * independent from `starfield`: a transparent canvas may still render
   * stars, while `starfield.enabled: false` removes every celestial backdrop
   * including the cinematic Milky Way.
   */
  readonly background?: GlobeBackgroundConfig;
  /**
   * Tilt the globe's axis around the Z axis (in degrees, like Earth's 23.5°).
   * Affects only visual appearance — auto-rotate, raycasting, and lat/lng
   * conversions all keep working naturally because everything is rendered
   * inside a tilted parent group. Default 0.
   */
  readonly axisTilt?: number;
  /** Ambient rotation. Off unless `enabled` is `true`. */
  readonly autoRotate?: AutoRotateConfig;
  /** Antialiasing, pixel ratio, frame-rate ceiling, adaptive quality and pausing. */
  readonly performance?: PerformanceConfig;
  /**
   * Initial camera target in degrees. Omitted keeps the camera on world +Z, facing `[0, -90]` with
   * zero axis tilt.
   */
  readonly initialPosition?: LatLng;
  /** Closest camera distance in globe radii. Default 1.5. */
  readonly minZoom?: number;
  /** Farthest camera distance in globe radii. Default 6. */
  readonly maxZoom?: number;
  /** Wheel zoom mode, speed and smoothing. Dedicated pinch zoom is not implemented. */
  readonly zoom?: ZoomConfig;
  /**
   * Render with a transparent canvas — the host page bleeds through.
   * Useful when the globe is decoration on top of a page gradient or
   * background image and you don't want the theme's `background.color`
   * to clip the visual as a square. Default `false`. Ignored when
   * `background.canvas` is provided.
   *
   * @deprecated Use `background: { canvas: 'transparent' }`.
   */
  readonly transparent?: boolean;
  /**
   * Initial camera distance derived from vertical field of view and estimated globe extent,
   * with optional fixed zoom limits. Omit padding to retain the initial distance.
   */
  readonly framing?: FramingConfig;
}
