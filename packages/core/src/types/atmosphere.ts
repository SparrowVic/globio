export interface AtmosphereConfig {
  readonly enabled?: boolean;
}

export interface StarfieldConfig {
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
}
