import type { LatLng, ResolutionLevel } from './primitives';

/** A country as the engine knows it. */
export interface CountryData {
  /** Zero-padded ISO 3166-1 numeric id, e.g. `'616'`. */
  readonly id: string;
  /** English short name from the geometry source. */
  readonly name: string;
  readonly iso2?: string;
  readonly iso3?: string;
}

/** Payload of `countryClick` and `countryHover`. */
export interface CountryEvent {
  readonly country: CountryData;
  /** `[lat, lng]` under the pointer. */
  readonly point: LatLng;
}

/**
 * Per-country data binding. Pass via `globe.setCountryData(map)` to color
 * countries based on data — populations, GDP, region membership, anything.
 * `value` is informational (available on countryClick events) and can drive
 * color via a future scale system; for now the explicit `color` field wins.
 */
export interface CountryDataEntry {
  /** Explicit fill colour. Wins over any scale. Defaults to the `countries.fill.defaultColor` token. */
  readonly color?: string;
  /** Numeric value; mapped to a colour when `setCountryData()` receives a scale, and returned in events. */
  readonly value?: number;
  /** Fill opacity. Defaults to the `countries.fill.opacity` token. */
  readonly opacity?: number;
}

export type CountryDataMap = Readonly<Record<string, CountryDataEntry>>;

export interface CountriesConfig {
  /** Which country geometry loads: `'low'` (about 90 kB), `'medium'` or `'high'`. Default `'medium'`. */
  readonly resolution?: ResolutionLevel;
  /** Pick and highlight the country under the pointer. Default true. */
  readonly hoverEnabled?: boolean;
  /**
   * When true (default), the hover highlight respects the globe's depth —
   * the back-side portions of a country (e.g. the part wrapped around the
   * far side) are hidden. Set to false for an "x-ray" feel where the entire
   * country outline is always visible.
   */
  readonly hoverOccludeBackSide?: boolean;
  /**
   * Per-instance overrides for the hovered country's stroke + additive
   * glow halo. Each field is independent — set what you want to change,
   * leave the rest. Empty-string color / non-positive numeric =
   * "use theme token" sentinel (matches the pattern used elsewhere).
   */
  readonly borderHover?: {
    readonly color?: string;
    readonly width?: number;
    readonly opacity?: number;
    readonly glowColor?: string;
    readonly glowWidth?: number;
    readonly glowOpacity?: number;
  };
  /**
   * Per-instance overrides for the pinned/active country's stroke. Same
   * sentinel semantics as `borderHover`.
   */
  readonly borderActive?: {
    readonly color?: string;
    readonly width?: number;
    readonly opacity?: number;
  };
  /**
   * Country fill layer config. Independent of strokes — paints the
   * country shape with a solid color.
   *
   * Modes:
   *  - `'none'` — layer hidden (default; matches the legacy "wait for
   *    setData / setDataLayer choropleth" behaviour).
   *  - `'always'` — every country shown with `defaultColor` × `defaultOpacity`.
   *  - `'palette'` — every country picks `palette[index % palette.length]`
   *    (stable order from the loaded features array).
   *  - `'data'` — driven by `setData(map, scale?)` / choropleth data layer.
   *
   * State overrides recolor a single country in place; active wins
   * over hover when both target the same country.
   */
  readonly fill?: {
    readonly mode?: 'none' | 'always' | 'palette' | 'data';
    readonly defaultColor?: string;
    readonly defaultOpacity?: number;
    readonly palette?: ReadonlyArray<string>;
    /** Empty string / non-positive numeric = no override (layer falls back to base). */
    readonly hoverColor?: string;
    readonly hoverOpacity?: number;
    readonly activeColor?: string;
    readonly activeOpacity?: number;
  };
}

/**
 * Country name labels rendered as HTML overlays at each country's centroid.
 * Hidden by default — enable explicitly. Small countries fade out when
 * zoomed out (`minScreenSize`); labels on the far side of the globe fade
 * via the same occlusion smoothstep as HTML markers.
 */
export interface CountryLabelsConfig {
  /** Show the labels. Default false. */
  readonly enabled?: boolean;
  /**
   * Override the theme-driven label text color. CSS-style hex / rgb /
   * rgba string. Falls back to `tokens['countries.label.color']`.
   */
  readonly color?: string;
  /**
   * Override the theme-driven font size (CSS pixels). Falls back to
   * `tokens['countries.label.fontSize']`.
   */
  readonly fontSize?: number;
  /**
   * Override the theme-driven font weight (e.g. `'500'`, `'700'`,
   * `'bold'`). Falls back to `tokens['countries.label.fontWeight']`.
   */
  readonly fontWeight?: string;
  /** Per-id override map; missing ids fall back to the source `feature.name`. */
  readonly labels?: Readonly<Record<string, string>>;
  /**
   * Minimum apparent screen-pixel size of a country before its label
   * appears. Higher = stricter (fewer labels at any given zoom). Default 60.
   */
  readonly minScreenSize?: number;
  /**
   * Width of the smoothstep band (as a fraction of `minScreenSize`) over
   * which the label fades from invisible to fully visible. 0 = hard cutoff,
   * 1 = fades start at zero size. Default 0.4 (label is fully on by
   * `minScreenSize`, fully off below `minScreenSize * 0.6`).
   */
  readonly sizeFadeRange?: number;
  /**
   * Occlusion smoothstep edges (`facing` = dot product of country normal
   * with camera direction). Defaults `[-0.05, 0.15]` — labels remain visible
   * just past the silhouette and fade in fully once the country has rotated
   * a hair toward the camera. Pass `[0, 0]` for a hard cutoff at the
   * silhouette.
   */
  readonly occlusionFade?: readonly [edge0: number, edge1: number];
  /**
   * Fade-in / fade-out duration in milliseconds, applied as a CSS
   * `transition: opacity Xms ease-out`. Default 200. Set to 0 to snap.
   */
  readonly transitionMs?: number;
  /**
   * Optional CSS halo around each label (a thicker, blurred outline that
   * keeps the text legible against any base color). Drawn via stacked
   * `text-shadow` calls so it works without a canvas pass. When provided,
   * **replaces** the theme `countries.label.textShadow` token.
   */
  readonly halo?: {
    readonly color?: string;
    /** Halo radius in CSS pixels. Default 2. */
    readonly radius?: number;
    /** Number of stacked shadow copies (more = denser halo). Default 4. */
    readonly steps?: number;
  } | null;
  /**
   * Inner padding applied to each label element in CSS pixels — useful
   * when you want a larger hit-test area, breathing room behind a halo,
   * or to offset the label from a halo background. Default 0.
   */
  readonly padding?: number;
}
