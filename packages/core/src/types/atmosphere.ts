/** Shared atmosphere controls interpreted by the active kind's halo or scattering layer. */
export interface AtmosphereConfig {
  /** Render the rim glow. Default true. */
  readonly enabled?: boolean;
  /**
   * Override the theme-driven Fresnel halo color. Any CSS-style hex /
   * rgb / rgba string. Falls back to `tokens['atmosphere.color']`.
   */
  readonly color?: string;
  /**
   * Absolute halo-intensity override. Omitted or non-positive values restore the theme intensity;
   * use `enabled: false` to hide it.
   */
  readonly intensity?: number;
  /**
   * Shell radius as a multiplier of the globe radius; values at or below 1 restore the layer
   * default. Defaults to 1.18 for dotted, 1.075 for cinematic and 1.15 for the other kinds.
   */
  readonly radiusScale?: number;
  /**
   * Fresnel exponent. 0.5 = soft / diffuse glow filling most of the
   * silhouette; 4.0 = razor-thin rim hugging the edge. Default 2.0.
   */
  readonly power?: number;
  /**
   * Kind-specific threshold shaping the halo falloff. The shared Fresnel shell uses it as the
   * normal-facing offset; dotted uses a silhouette threshold. Default 0.6.
   */
  readonly threshold?: number;
  /**
   * Shell render side for outline, wireframe, paper and hologram. Dotted ignores it; cinematic
   * always renders the front-facing shell. Default `'back'` for the shared halo.
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
    /** Oscillate atmosphere brightness. Default false. */
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
   * Star-count override. Defaults to `starfield.density`; larger values increase vertex and fragment
   * work.
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
    /** Animate each star's brightness with its own phase. Default false. */
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
