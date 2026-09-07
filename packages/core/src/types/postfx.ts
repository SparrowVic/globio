/**
 * Shared HDR post-processing pipeline configuration.
 *
 * The pipeline renders the scene into an off-screen HDR target, extracts a
 * thresholded bright buffer, blurs it through a 5-level dual-Kawase chain
 * (plus a horizontal anamorphic streak), then composites everything back to
 * the canvas with vignette / chromatic aberration / film grain, an exposure
 * multiplier and a soft highlight roll-off (the scene layers are
 * display-referred and tone-map themselves; the composite never applies a
 * second filmic curve).
 *
 * Every section is optional and merges over the defaults. `enabled` defaults
 * to `true` for the `cinematic` kind and `false` everywhere else.
 */
export interface PostProcessingConfig {
  /**
   * Master switch. Omit to inherit the per-kind default (`cinematic` opts
   * in, every other kind renders straight to the canvas).
   */
  readonly enabled?: boolean;
  /** Linear exposure multiplier applied before the highlight roll-off. Default 1.0. */
  readonly exposure?: number;
  /**
   * Resolution of the bloom chain relative to the drawing buffer. 0.5
   * (default) halves it — the blur hides the loss and the fill cost drops 4×.
   */
  readonly resolutionScale?: number;
  /** Blur bright scene regions and add the result as a luminous halo. */
  readonly bloom?: {
    /** Include this effect while the post-processing pipeline is enabled. Default true. */
    readonly enabled?: boolean;
    /** How much of the blurred bright buffer is added back. Default 0.48. */
    readonly strength?: number;
    /** Luminance above which pixels start to bloom. Default 0.8. */
    readonly threshold?: number;
    /** Scales the tent-upsample tap offsets — wider halo. 0..1, default 0.6. */
    readonly radius?: number;
    /** Softens the threshold knee (fraction of `threshold`). Default 0.5. */
    readonly softKnee?: number;
  };
  /** Horizontal anamorphic streaks from bright regions. */
  readonly streak?: {
    /** Include this effect while the post-processing pipeline is enabled. Default true. */
    readonly enabled?: boolean;
    /** Contribution of the horizontal streak in the composite. Default 0.22. */
    readonly strength?: number;
    /** Horizontal reach of the streak. 0..1, default 0.55. */
    readonly length?: number;
    /** Anamorphic tint. Default `#9fd4ff`. */
    readonly color?: string;
  };
  /** Darken the frame corners in the composite pass. */
  readonly vignette?: {
    /** Include this effect while the post-processing pipeline is enabled. Default true. */
    readonly enabled?: boolean;
    /** Corner darkening amount. 0..1, default 0.32. */
    readonly strength?: number;
    /** Widens the falloff towards the centre. 0..1, default 0.45. */
    readonly softness?: number;
  };
  /** Offset color channels radially near the frame edges. */
  readonly chromaticAberration?: {
    /** Include this effect while the post-processing pipeline is enabled. Default true. */
    readonly enabled?: boolean;
    /** Radial per-channel UV offset at the frame edge. Default 0.0025. */
    readonly strength?: number;
  };
  /** Animated film-grain noise in the final composite. */
  readonly grain?: {
    /** Include this effect while the post-processing pipeline is enabled. Default true. */
    readonly enabled?: boolean;
    /** Film-grain amplitude, attenuated in bright areas. Default 0.035. */
    readonly strength?: number;
  };
}
