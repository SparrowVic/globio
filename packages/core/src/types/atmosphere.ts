export interface AtmosphereConfig {
  /** Render the rim glow. Default true. */
  readonly enabled?: boolean;
  /**
   * Override the theme-driven Fresnel halo color. Any CSS-style hex /
   * rgb / rgba string. Falls back to `tokens['atmosphere.color']`.
   */
  readonly color?: string;
  /**
   * Override the theme-driven halo intensity multiplier. 0 = invisible
   * (same as `enabled: false` but keeps the layer mounted); 1 = theme
   * default; higher values brighten / widen the rim. Falls back to
   * `tokens['atmosphere.intensity']`.
   */
  readonly intensity?: number;
  /**
   * Mesh radius as a multiplier of `GLOBE_RADIUS`. Range 1.01..1.5 —
   * tight rim ↔ wide aurora. Default 1.15.
   */
  readonly radiusScale?: number;
  /**
   * Fresnel exponent. 0.5 = soft / diffuse glow filling most of the
   * silhouette; 4.0 = razor-thin rim hugging the edge. Default 2.0.
   */
  readonly power?: number;
  /**
   * Fresnel threshold (where the rim starts). 0 = entire sphere shows
   * tint; 1 = only the silhouette edge. Default 0.6.
   */
  readonly threshold?: number;
  /**
   * Render side. `'back'` (default) draws on the inside of the
   * surrounding shell so it reads as a halo behind the globe.
   * `'front'` drops the rim onto the front-facing portion (haze over
   * the planet); `'double'` does both for a heavier atmosphere.
   */
  readonly side?: 'back' | 'front' | 'double';
  /**
   * Blend mode. `'additive'` (default) reads as glow on dark themes;
   * `'normal'` is a flat overlay that avoids highlight blowouts on
   * cream / paper themes.
   */
  readonly blending?: 'additive' | 'normal';
  /**
   * Optional time-driven brightness oscillation (atmospheric "breath").
   */
  readonly pulse?: {
    readonly enabled?: boolean;
    /** Frequency in Hz. Default 0.25 (slow). */
    readonly speed?: number;
    /** Amplitude as a fraction of base intensity. Default 0.25. */
    readonly amplitude?: number;
  };
}

export interface StarfieldConfig {
  /** Create the star layer. Default false. */
  readonly enabled?: boolean;
  /**
   * Star count override. Defaults to the active theme's `starfield.density`.
   * Higher values cost more vertex shader work but no overdraw — typical
   * range 500..6000.
   */
  readonly density?: number;
  /** Base star size in CSS pixels. Defaults to the theme `starfield.size`. */
  readonly size?: number;
  /**
   * Optional palette to sample per-star colors from. When provided, each
   * star picks a random hex string. Falls back to the theme `starfield.color`
   * when omitted.
   *
   *   palette: ['#ffffff', '#ffe9c4', '#c4d8ff', '#ffd4b1']
   *   // mix of white / warm yellow / cool blue / faint red
   */
  readonly palette?: ReadonlyArray<string>;
  /**
   * Per-star size jitter as a fraction of base size. 0 = all stars identical,
   * 1 = sizes range from 0× to 2× base. Default 0.5.
   */
  readonly sizeVariety?: number;
  /**
   * Twinkle animation. Disabled by default — opt-in for an organic
   * "real night sky" feel. Each star animates with a random phase so the
   * field never pulses in unison.
   */
  readonly twinkle?: {
    readonly enabled?: boolean;
    /** 0..1, brightness amplitude. Default 0.45. */
    readonly intensity?: number;
    /** Average frequency in Hz. Default 0.55. */
    readonly speed?: number;
  };
  /**
   * Milky Way band. Rendered as a soft, dusty great-circle glow on an
   * inward-facing shell just inside the star sphere. Only kinds whose
   * starfield draws a band honour this (currently `cinematic`); the other
   * kinds ignore it.
   */
  readonly milkyWay?: {
    /** Default true on the cinematic kind. */
    readonly enabled?: boolean;
    /**
     * Band brightness multiplier. 0 = invisible, 0.55 = default (reads as
     * a soft glow), above ~1 it starts to look like a painted stripe.
     */
    readonly intensity?: number;
    /**
     * Galactic plane tilt in degrees relative to the globe's equator.
     * Default 62 — a clear diagonal that never lines up with the poles.
     */
    readonly tilt?: number;
  };
}
