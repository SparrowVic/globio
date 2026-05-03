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

export interface GlobeConfig {
  readonly container: HTMLElement;
  readonly mode?: GlobeMode;
  /**
   * Visual identity of the rendered globe. Each kind owns its renderer
   * pipeline + per-kind tokens + per-kind config. Defaults to the kind
   * registered for the active theme preset (`outline-*` → `'outline'`,
   * `'dotted-dark'` → `'dotted'`, `'wireframe-tron'` → `'wireframe'`),
   * falling back to `'outline'` for custom themes.
   */
  readonly kind?: GlobeKind;
  readonly theme?: ThemeInput;
  readonly countries?: CountriesConfig;
  readonly countryLabels?: CountryLabelsConfig;
  readonly countryData?: CountryDataMap;
  readonly markers?: ReadonlyArray<MarkerConfig>;
  readonly htmlMarkers?: ReadonlyArray<HtmlMarkerConfig>;
  readonly arcs?: ReadonlyArray<ArcConfig>;
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
    readonly origin?: 'centroid' | 'click';
    readonly pulseOnSurfaceClick?: boolean;
  };
  readonly outline?: OutlineConfig;
  readonly dotted?: DottedConfig;
  readonly wireframe?: WireframeConfig;
  readonly paper?: PaperConfig;
  readonly hologram?: HologramConfig;
  readonly starfield?: StarfieldConfig;
  /**
   * Tilt the globe's axis around the Z axis (in degrees, like Earth's 23.5°).
   * Affects only visual appearance — auto-rotate, raycasting, and lat/lng
   * conversions all keep working naturally because everything is rendered
   * inside a tilted parent group. Default 0.
   */
  readonly axisTilt?: number;
  readonly autoRotate?: AutoRotateConfig;
  readonly performance?: PerformanceConfig;
  readonly initialPosition?: LatLng;
  readonly minZoom?: number;
  readonly maxZoom?: number;
  readonly zoom?: ZoomConfig;
  /**
   * Render with a transparent canvas — the host page bleeds through.
   * Useful when the globe is decoration on top of a page gradient or
   * background image and you don't want the theme's `background.color`
   * to clip the visual as a square. Default `false`.
   */
  readonly transparent?: boolean;
  /**
   * How the globe is framed inside its container. The atmosphere shell
   * extends ~15% beyond the globe's surface and its Fresnel halo fades
   * even further out — without breathing room those edges visibly clip
   * against the canvas, especially in transparent / decoration mode.
   *
   * - `padding` (0..0.5): fraction of the viewport reserved as margin
   *   around the visible globe + atmosphere extent. 0 lets the renderer
   *   fill the canvas (legacy behaviour); 0.15–0.25 leaves room for the
   *   atmosphere halo to fade smoothly. Default 0.
   * - `lockZoom`: when true, also clamps `minZoom` / `maxZoom` to the
   *   computed framing distance so users can't zoom out of the frame.
   *   Useful for purely decorative embeds. Default false.
   */
  readonly framing?: FramingConfig;
}
