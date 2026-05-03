import type { LatLng, ResolutionLevel } from './primitives';

export interface CountryData {
  readonly id: string;
  readonly name: string;
  readonly iso2?: string;
  readonly iso3?: string;
}

export interface CountryEvent {
  readonly country: CountryData;
  readonly point: LatLng;
}

/**
 * Per-country data binding. Pass via `globe.setCountryData(map)` to color
 * countries based on data — populations, GDP, region membership, anything.
 * `value` is informational (available on countryClick events) and can drive
 * color via a future scale system; for now the explicit `color` field wins.
 */
export interface CountryDataEntry {
  readonly color?: string;
  readonly value?: number;
  readonly opacity?: number;
}

export type CountryDataMap = Readonly<Record<string, CountryDataEntry>>;

export interface CountriesConfig {
  readonly resolution?: ResolutionLevel;
  readonly hoverEnabled?: boolean;
  /**
   * When true (default), the hover highlight respects the globe's depth —
   * the back-side portions of a country (e.g. the part wrapped around the
   * far side) are hidden. Set to false for an "x-ray" feel where the entire
   * country outline is always visible.
   */
  readonly hoverOccludeBackSide?: boolean;
}

/**
 * Country name labels rendered as HTML overlays at each country's centroid.
 * Hidden by default — enable explicitly. Small countries fade out when
 * zoomed out (`minScreenSize`); labels on the far side of the globe fade
 * via the same occlusion smoothstep as HTML markers.
 */
export interface CountryLabelsConfig {
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
