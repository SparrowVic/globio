/**
 * Outline kind extras — visual polish layered on top of the base border mesh.
 * - `hoverGlow` — soft additive halo behind the hovered country's borders.
 * - `focusPulse` — sci-fi sonar ring that fires from a country's centroid
 *   when `focusOnCountry()` is called.
 * - `hoverCrosshair` — Tron-style targeting reticle + DOM lat/lng readout
 *   that tracks the cursor whenever it sits over the globe surface.
 * - `continentDim` — when hovering a country, fade borders of countries on
 *   other continents to a dim level so the active region is foregrounded.
 * All default-on; disable per feature.
 */
export interface OutlineConfig {
  /**
   * Hover-stroke geometry knobs specific to outline. Outline is pure linework
   * so the default "lift the highlight a hair above the base border" trick
   * other kinds use produces a visible duplicate-stroke ghost. These knobs
   * let callers tune (or zero out) the lift to taste.
   *
   * - `lift` — multiplier added to the surface radius for the *crisp*
   *   highlight stroke (the recoloured border). 0 (default) means draw at
   *   the same radius as the base border, so the highlight just recolors
   *   the existing line. Values like 0.0025 reproduce the legacy lifted
   *   look used by other kinds.
   * - `glowLift` — multiplier for the additive halo behind the highlight.
   *   Default 0.0035 — keeps the soft aura noticeably above the surface
   *   without competing with the crisp stroke.
   *
   * Both are *relative to* the globe radius, so 0.001 = 0.1% above surface.
   */
  readonly hover?: {
    readonly lift?: number;
    readonly glowLift?: number;
  };
  readonly hoverGlow?: { readonly enabled?: boolean };
  /**
   * Sci-fi sonar pulse fired from a focused country's centroid (or click
   * point, depending on `focusPulse.origin` at the top level). Outline's
   * defaults produce a crisp gold ring with quadratic fade — knobs let
   * callers thicken / slow / brighten it without re-styling the whole
   * preset.
   */
  readonly focusPulse?: {
    readonly enabled?: boolean;
    readonly durationMs?: number;
    readonly color?: string;
    /** Ring radius at scale=1 in radians on the sphere. Default 0.06 (~3.4°). */
    readonly angularRadiusBase?: number;
    /** Band thickness in radians. Default 0.013 (~0.7°). */
    readonly angularBand?: number;
    /** Linear scale of the ring at t=0. Default 0.4. */
    readonly scaleMin?: number;
    /** Linear scale of the ring at t=1 (peak expansion). Default 2.5. */
    readonly scaleMax?: number;
    /** Initial alpha at t=0. Default 1.0. */
    readonly peakOpacity?: number;
    /** Polygon resolution around the ring. Default 96. */
    readonly segments?: number;
    /** Lift above the globe surface as a multiplier of GLOBE_RADIUS. Default 1.0045. */
    readonly radiusFactor?: number;
  };
  readonly hoverCrosshair?: {
    readonly enabled?: boolean;
    /**
     * Reticle line color override. Falls back to
     * `tokens['countries.borderHover.color']`.
     */
    readonly color?: string;
    /** Reticle size as world units on the sphere. Default 0.012. */
    readonly size?: number;
    /** Material opacity (0..1). Default 0.85. */
    readonly opacity?: number;
    /**
     * Inner ring radius as a fraction of the cross arm length. 0 = no
     * ring, 0.7 (default) = ring fits inside the cross diagonal.
     */
    readonly ringRadiusFactor?: number;
    /** Show small N/S/E/W ticks just outside the ring. Default true. */
    readonly cardinalTicks?: boolean;
    /** Show the DOM lat/lng readout near the cursor. Default true. */
    readonly tooltip?: boolean;
    /** Decimals in the lat/lng readout. Default 2. */
    readonly tooltipDecimals?: number;
  };
  readonly continentDim?: { readonly enabled?: boolean; readonly amount?: number };
}

/**
 * Per-instance overrides for the dotted kind's interactive effects.
 *
 * The dotted kind is a "dot field" — every visual emerges from the same
 * regular-grid Points cloud, so every effect sculpts brightness / size /
 * color of those dots rather than overlaying separate geometry. That
 * shared canvas is the personality.
 *
 * Effect groups:
 *  - `clickRipple` — sonar wave that brightens the dots it sweeps over,
 *    spawned at any globe click. Optional color override (otherwise the
 *    base dot color is brightened).
 *  - `dataFlash` — momentary brightness boost on a country's dots when
 *    its value in `setCountryData()` changes.
 *  - `drift` — slow ambient wave on per-dot brightness; bands of equal
 *    phase orient along the axis. `axis: 'both'` mixes N/S + E/W into a
 *    diagonal moiré.
 *  - `hoverDots` — country-scoped scale + brightness boost on hover.
 *  - `appearance` — master color + size override applied uniformly to
 *    every dot, layered on top of theme tokens.
 *  - `cursorWake` — soft trailing ripple that follows the cursor across
 *    the surface, fading over ~0.4s. Like clickRipple's quieter cousin.
 *  - `latitudeBands` — equator + tropics get a brightness boost so the
 *    dot grid carries geographic hierarchy at a glance.
 *  - `pulseBreath` — global gentle brightness oscillation; the whole
 *    field "inhales / exhales" without moving any dot.
 *  - `constellation` — when a country is hovered, draw thin lines
 *    between its nearest-neighbour dots. The hover effect literally
 *    constructs star-chart connections from the dot field.
 *
 * All sub-flags default-on except where noted. Empty-string color = use
 * the base dot color (sentinel for "no override").
 */
export interface DottedConfig {
  readonly clickRipple?: {
    readonly enabled?: boolean;
    readonly boost?: number;
    readonly speed?: number;
    readonly width?: number;
    readonly maxConcurrent?: number;
    /** Empty string = use base dot color brightened. */
    readonly color?: string;
  };
  readonly dataFlash?: {
    readonly enabled?: boolean;
    readonly strength?: number;
    readonly decay?: number;
    /** Empty string = use the white-default flash color from tokens. */
    readonly color?: string;
  };
  /**
   * Ambient drift wave — `sin(dot(position, axis) * freq - elapsed * speed)`
   * added to per-dot brightness, very small amplitude so it feels like the
   * globe is breathing rather than strobing. Default-on.
   */
  readonly drift?: {
    readonly enabled?: boolean;
    readonly amplitude?: number;
    readonly speed?: number;
    readonly freq?: number;
    /**
     * `'ns'` = north-south wave (drift along Y axis); `'ew'` = east-west;
     * `'both'` = a diagonal axis that mixes the two for moiré-like
     * patterns.
     */
    readonly axis?: 'ns' | 'ew' | 'both';
  };
  /**
   * Hover dot expansion — when a country is hovered, its dots scale up and
   * brighten, easing in/out smoothly. Default-on.
   */
  readonly hoverDots?: {
    readonly enabled?: boolean;
    readonly scale?: number;
    readonly brightnessBoost?: number;
    readonly duration?: number;
  };
  /**
   * Master appearance overrides applied to every dot. Lets callers
   * recolor / resize the entire field without theming, while still
   * letting per-effect colors mix on top.
   */
  readonly appearance?: {
    /** Empty string = use theme `countries.dotted.color`. */
    readonly color?: string;
    /** Multiplier on the theme size; 1 = no change, 0 collapses to theme default. */
    readonly sizeScale?: number;
    /** Master opacity; ≤0 = use theme `countries.dotted.opacity`. */
    readonly opacity?: number;
  };
  /**
   * Cursor wake — small ripple that fades behind the cursor as it moves
   * across the globe surface. Lower-amplitude than clickRipple, so it
   * reads as ambient response rather than impact.
   */
  readonly cursorWake?: {
    readonly enabled?: boolean;
    /** Peak brightness multiplier at the wake's center. Default 0.6. */
    readonly amplitude?: number;
    /** Fade-out duration in seconds. Default 0.45. */
    readonly fade?: number;
    /** Gaussian band half-width in radians. Default 0.09. */
    readonly width?: number;
  };
  /**
   * Geographic latitude emphasis — equator + tropics get a brightness
   * boost so the dot grid implicitly draws the planet's main parallels.
   * Subtle (low boost) by default; crank it up for atlas-like clarity.
   */
  readonly latitudeBands?: {
    readonly enabled?: boolean;
    /** Brightness multiplier added at the equator (lat = 0). Default 0.35. */
    readonly equatorBoost?: number;
    /** Brightness multiplier added at the tropics (lat ≈ ±23.5°). Default 0.18. */
    readonly tropicsBoost?: number;
    /** Half-width of each band in degrees of latitude. Default 4. */
    readonly width?: number;
  };
  /**
   * Whole-field "breath" — global brightness oscillation, like the
   * atmosphere's pulse but on the dots themselves.
   */
  readonly pulseBreath?: {
    readonly enabled?: boolean;
    /** Brightness amplitude (0..1). Default 0.12. */
    readonly amplitude?: number;
    /** Cycles per second. Default 0.35. */
    readonly speed?: number;
  };
  /**
   * Constellation lines — when a country is hovered, draw thin glowing
   * lines connecting nearest-neighbour dots within the country, treating
   * the dot grid as a star chart.
   */
  readonly constellation?: {
    readonly enabled?: boolean;
    /** Empty string = use the base dot color. */
    readonly color?: string;
    /** Line opacity (0..1). Default 0.55. */
    readonly opacity?: number;
    /**
     * Multiplier on the minimum spacing between adjacent dots; lines are
     * drawn between any pair within this many "grid steps" of each
     * other. Default 1.6 — connects each dot to its ring of neighbours.
     */
    readonly distanceFactor?: number;
  };
}

/**
 * Wireframe lat/lng grid layer — pure mathematical sphere grid, no country
 * geometry. Auto-enabled when the active theme's `wireframe.opacity` token
 * is > 0 (e.g. preset `wireframe-tron`); set `enabled: true` explicitly to
 * force-on regardless of theme.
 */
export interface WireframeConfig {
  readonly enabled?: boolean;
  /** Override token-driven density (1 = default, lower = sparser). */
  readonly density?: number;
  /** Override token-driven pulse amplitude (0..1, 0 = disabled). */
  readonly pulse?: number;
  readonly pulseSpeed?: number;
  /**
   * Click pulse — radial brightness wave expanding along the grid from any
   * surface click. Tron-style impact feedback.
   */
  readonly clickPulse?: {
    readonly enabled?: boolean;
    /** Wavefront expansion in radians/sec. Default 1.5. */
    readonly speed?: number;
    /** Gaussian band half-width in radians. Default 0.18. */
    readonly width?: number;
    /** Peak brightness multiplier at the wavefront. Default 2.5. */
    readonly boost?: number;
    /** Maximum simultaneous click pulses (older ones recycle). Default 4. */
    readonly maxConcurrent?: number;
  };
  /**
   * Geographic emphasis — equator + tropics get 2× brightness; prime meridian
   * + antimeridian get half emphasis. Subtle visual hierarchy.
   */
  readonly emphasis?: {
    readonly enabled?: boolean;
  };
  /**
   * CRT-glitch transients — every interval seconds, a horizontal band briefly
   * shears laterally then snaps back. Atmosphere, not noise.
   */
  readonly glitch?: {
    readonly enabled?: boolean;
    /** Lower bound of inter-glitch wait (seconds). Default 5. */
    readonly intervalMin?: number;
    /** Upper bound of inter-glitch wait (seconds). Default 15. */
    readonly intervalMax?: number;
  };
  /**
   * Glowing ring around the centroid of the currently active (pinned) country.
   * Sized to enclose the country's main ring with `padding` margin; rotates
   * slowly around its outward axis. Fades in/out on activate/clear.
   */
  readonly activeRing?: {
    readonly enabled?: boolean;
    /** Rotation around the outward axis (rad/sec). Default 0.5. */
    readonly rotationSpeed?: number;
    /** Multiplier on the country's angular radius. Default 1.2. */
    readonly padding?: number;
  };
  /**
   * Distant data-flow streams — small luminous particles continuously falling
   * from the north pole towards the south pole along random meridians.
   */
  readonly poleStreams?: {
    readonly enabled?: boolean;
    /** Number of simultaneously-active particles. Default 16. */
    readonly count?: number;
    /** Southward angular velocity in radians/sec. Default 0.6. */
    readonly speed?: number;
  };
}

/**
 * Paper kind — vintage atlas: cream parchment surface, hand-drawn jittered
 * ink borders, optional pastel country fill, optional faint atlas grid.
 * `borderRoughness` overrides the `paper.borderRoughness` token (degrees of
 * lng/lat jitter per vertex; ~0.25 reads as confident pen, ~0.6 looks shaky).
 */
export interface PaperConfig {
  readonly grid?: { readonly enabled?: boolean };
  readonly fill?: { readonly enabled?: boolean };
  readonly borderRoughness?: number;
}

/**
 * Hologram kind extras — scanlines, Fresnel rim glow, glitch transients,
 * and an optional outer-shell glow that amplifies the silhouette. All
 * default-on; toggle individually for the look you want.
 */
export interface HologramConfig {
  readonly scanlines?: { readonly enabled?: boolean };
  readonly rimGlow?: { readonly enabled?: boolean };
  readonly glitch?: {
    readonly enabled?: boolean;
    /** Lower bound of inter-glitch wait (seconds). Default 4. */
    readonly intervalMin?: number;
    /** Upper bound of inter-glitch wait (seconds). Default 9. */
    readonly intervalMax?: number;
  };
  readonly outerGlow?: { readonly enabled?: boolean };
}
