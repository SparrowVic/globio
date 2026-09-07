/**
 * Outline border, hover, continent-dimming and focus-ring settings. The `hoverCrosshair` section
 * also configures dotted, cinematic, paper and hologram reticles.
 */
export interface OutlineConfig {
  /** Outline hover-stroke offsets, expressed as fractions of the globe radius. */
  readonly hover?: {
    /** Crisp hover-stroke lift above the base border as a fraction of the globe radius. Default 0. */
    readonly lift?: number;
    /** Hover-halo lift above the base border as a fraction of the globe radius. Default 0.0035. */
    readonly glowLift?: number;
  };
  /** Soft additive halo behind the hovered outline country border. */
  readonly hoverGlow?: {
    /** Show the outline hover halo. Default true. */
    readonly enabled?: boolean;
  };
  /** Outline focus-ring appearance; top-level `focusPulse` controls when and where it fires. */
  readonly focusPulse?: {
    /**
     * Build the outline focus-ring decoration. Top-level `focusPulse.enabled` must also allow it.
     * Default true.
     */
    readonly enabled?: boolean;
    /** Primary ring expansion and fade duration in milliseconds. Default 1400. */
    readonly durationMs?: number;
    /** Ring color override. Omitted or empty uses `countries.borderActive.color`. */
    readonly color?: string;
    /** Ring angular radius at scale 1, in radians. Default 0.06. */
    readonly angularRadiusBase?: number;
    /** Ring angular band thickness in radians. Default 0.013. */
    readonly angularBand?: number;
    /** Ring scale at the start of expansion. Default 0.4. */
    readonly scaleMin?: number;
    /** Ring scale at the end of expansion. Default 2.5. */
    readonly scaleMax?: number;
    /** Initial ring opacity multiplier. Default 1. */
    readonly peakOpacity?: number;
    /** Number of polygon segments around the ring. Default 96. */
    readonly segments?: number;
    /** Ring radius as a multiplier of the globe radius. Default 1.0045. */
    readonly radiusFactor?: number;
  };
  /**
   * Cursor-following reticle and coordinate readout for outline, dotted, cinematic, paper and
   * hologram. Wireframe does not mount a reticle.
   */
  readonly hoverCrosshair?: {
    /** Show the reticle while the pointer is over the globe surface. Default true. */
    readonly enabled?: boolean;
    /** Reticle color override; omitted or empty uses the active kind's border or dot color. */
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
  /** Fade outline borders on other continents while a country is hovered. */
  readonly continentDim?: {
    /** Dim countries outside the hovered continent. Default true. */
    readonly enabled?: boolean;
    /** Opacity multiplier for borders outside the hovered continent; 0 hides them. Default 0.3. */
    readonly amount?: number;
  };
}

/**
 * Dot-field appearance and interaction effects. Click ripples, data flashes, drift, hover,
 * active-country highlights and cursor wake are enabled by default; latitude bands, breathing and
 * constellation lines are opt-in.
 */
export interface DottedConfig {
  /** Expanding brightness wave through the dots after a surface click. */
  readonly clickRipple?: {
    /** Enable click-triggered dot ripples. Default true. */
    readonly enabled?: boolean;
    /** Brightness added at the ripple wavefront. Defaults to `countries.dotted.rippleBoost`. */
    readonly boost?: number;
    /** Wavefront angular speed in radians per second. Defaults to `countries.dotted.rippleSpeed`. */
    readonly speed?: number;
    /** Angular width of the bright wavefront in radians. Defaults to `countries.dotted.rippleWidth`. */
    readonly width?: number;
    /** Maximum overlapping click ripples; the oldest is reused at capacity. Default 3. */
    readonly maxConcurrent?: number;
    /** Empty string = use base dot color brightened. */
    readonly color?: string;
  };
  /** Brief dot-brightness flash when a country's bound data changes. */
  readonly dataFlash?: {
    /** Flash dots when `setCountryData()` adds an entry or changes its numeric value. Default true. */
    readonly enabled?: boolean;
    /** Initial flash brightness boost. Defaults to `countries.dotted.flashStrength`. */
    readonly strength?: number;
    /**
     * Exponential fade rate per second; larger values fade faster. Defaults to
     * `countries.dotted.flashDecay`.
     */
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
    /** Animate the ambient wave through the dot field. Default true. */
    readonly enabled?: boolean;
    /** Ambient-wave brightness amplitude. Defaults to `countries.dotted.driftAmplitude`. */
    readonly amplitude?: number;
    /** Ambient-wave phase speed in radians per second. Defaults to `countries.dotted.driftSpeed`. */
    readonly speed?: number;
    /** Spatial wave frequency across the normalized sphere. Defaults to `countries.dotted.driftFreq`. */
    readonly freq?: number;
    /**
     * `'ns'` = north-south wave (drift along Y axis); `'ew'` = east-west;
     * `'both'` = a diagonal axis that mixes the two for moiré-like
     * patterns.
     */
    readonly axis?: 'ns' | 'ew' | 'both';
    /**
     * When true (default), each country's drift wave is rotated by a
     * deterministic hash of its index so adjacent countries breathe at
     * slightly different times rather than strobing in unison. The
     * dotted-only "every country has its own pulse" personality.
     */
    readonly perCountryPhase?: boolean;
  };
  /**
   * Hover dot expansion — when a country is hovered, its dots scale up and
   * brighten, easing in/out smoothly. Default-on.
   */
  readonly hoverDots?: {
    /** Apply hover brightness, scale and lift to the hovered country's dots. Default true. */
    readonly enabled?: boolean;
    /** Hovered-dot size multiplier. Defaults to `countries.dotted.hoverScale`. */
    readonly scale?: number;
    /** Brightness added to hovered dots. Defaults to `countries.dotted.hoverBrightnessBoost`. */
    readonly brightnessBoost?: number;
    /** Hover transition duration in seconds. Defaults to `countries.dotted.hoverDuration`. */
    readonly duration?: number;
    /**
     * Radial lift as a fraction of `GLOBE_RADIUS` — pushes the hovered
     * country's dots outward along the surface normal so the country
     * reads as "rising out of the field" toward the camera. Default
     * 0.008 (≈0.8%). Set to 0 for a hover-without-lift look.
     */
    readonly lift?: number;
  };
  /**
   * Pinned-country pulse — the dotted analogue of the standard
   * `SelectionLayer` active stroke (which dotted opts out of).
   * When `globe.setActiveCountry(id)` runs, the pinned country's dots
   * pick up a steady brightness boost + slow sine pulse. Independent
   * from hover so the user can pin one country and hover another.
   */
  readonly activeCountry?: {
    /** Highlight the pinned country's dots independently of hover. Default true. */
    readonly enabled?: boolean;
    /** Steady brightness boost added to active dots. Default 0.65. */
    readonly boost?: number;
    /** Active-country dot scale multiplier. Default 1.18. */
    readonly scale?: number;
    /** Sine pulse frequency in Hz. Default 0.65. */
    readonly pulseSpeed?: number;
    /**
     * Radial lift as a fraction of `GLOBE_RADIUS`. Same idea as the
     * hover lift but with a higher default so pinned reads stronger.
     * Default 0.012 (≈1.2%).
     */
    readonly lift?: number;
  };
  /**
   * Country-edge highlight — extra brightness + radial lift applied
   * only to the surface dots that already sit at the country's
   * silhouette (`aIsEdge` per dot, baked at build time). Replaces the
   * old `borderDots` separate-layer approach: instead of emitting a
   * second dot string at sub-degree spacing (which fights the surface
   * grid and reads as misaligned noise), we just brighten the existing
   * grid dots that trace the boundary.
   *
   * Active only on the hovered/pinned country — interior dots and
   * non-active countries are unaffected.
   */
  readonly edge?: {
    /** Master toggle. False zeroes both `boost` and `lift`. Default true. */
    readonly enabled?: boolean;
    /**
     * Brightness multiplier added to edge-dots on hover/active.
     * 0 = no rim, just the standard country brightness. Default 0.55.
     */
    readonly boost?: number;
    /**
     * Extra radial lift applied only to edge-dots on hover/active,
     * stacked on top of `hoverDots.lift` / `activeCountry.lift`.
     * Fraction of GLOBE_RADIUS. Default 0.004.
     */
    readonly lift?: number;
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
   * Per-country dot colors, independent of the background country-fill mesh. Palette, hover and
   * active colors are supported; the data mode currently falls back to theme colors.
   */
  readonly dots?: {
    /**
     * Base dot-color source. Palette assigns colors by feature index; data currently falls back to
     * theme colors because no data-to-dot routing is implemented. Default `'theme'`.
     */
    readonly mode?: 'theme' | 'palette' | 'data';
    /**
     * Country colors assigned by geometry feature index in palette mode. An empty palette keeps the
     * theme color.
     */
    readonly palette?: ReadonlyArray<string>;
    /** Color for hovered-country dots; empty or omitted keeps the base color. */
    readonly hoverColor?: string;
    /** Color for pinned-country dots; takes precedence over hover. Empty or omitted keeps the base color. */
    readonly activeColor?: string;
  };
  /**
   * Cursor wake — small ripple that fades behind the cursor as it moves
   * across the globe surface. Lower-amplitude than clickRipple, so it
   * reads as ambient response rather than impact.
   */
  readonly cursorWake?: {
    /** Add a fading brightness trail at the pointer's surface position. Default true. */
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
    /** Emphasize dots near the equator and tropics. Default false. */
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
    /** Oscillate brightness across the whole dot field. Default false. */
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
    /** Connect nearby dots inside the hovered country. Default false. */
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
 * Latitude/longitude grid appearance and optional animated decorations for the wireframe kind.
 * Per-property reset rules vary; an omitted override inherits the corresponding theme or layer
 * default.
 */
export interface WireframeConfig {
  /**
   * Reserved master switch; the wireframe kind currently builds its grid regardless of this value.
   * Select `kind: 'wireframe'` to render it.
   */
  readonly enabled?: boolean;
  /** Override token-driven density (1 = default, lower = sparser). */
  readonly density?: number;
  /** Override token-driven pulse amplitude (0..1, 0 = disabled). */
  readonly pulse?: number;
  /** Ambient grid-brightness pulse frequency in cycles per second. Default 0.5. */
  readonly pulseSpeed?: number;
  /**
   * Override the base grid line color. Empty string = use theme token. The
   * pulse / boost colors layered on top read from `clickPulse.color` and
   * `gridPulse.color` independently.
   */
  readonly color?: string;
  /** 0..1 base opacity — non-positive resets to theme. */
  readonly opacity?: number;
  /**
   * Major / minor line distinction — primary parallels + meridians (every
   * `majorStepDeg` degrees) render at `majorBoost` * base brightness so the
   * grid reads as a hierarchy, not a uniform mesh. Defaults: stepDeg=30,
   * majorBoost=1.6, minorBoost=0.85, edge thickness handled by the renderer.
   */
  readonly hierarchy?: {
    /** Distinguish major and minor grid lines by brightness. Default true. */
    readonly enabled?: boolean;
    /** Spacing of "major" lines in degrees. Default 30. */
    readonly majorStepDeg?: number;
    /** Brightness multiplier for major lines. Default 1.6. */
    readonly majorBoost?: number;
    /** Brightness multiplier for non-major (minor) lines. Default 0.85. */
    readonly minorBoost?: number;
  };
  /**
   * Click pulse — radial brightness wave expanding along the grid from any
   * surface click. Tron-style impact feedback.
   */
  readonly clickPulse?: {
    /** Spawn expanding grid waves on surface clicks. Default true. */
    readonly enabled?: boolean;
    /** Wavefront expansion in radians/sec. Default 1.5. */
    readonly speed?: number;
    /** Gaussian band half-width in radians. Default 0.18. */
    readonly width?: number;
    /** Peak brightness multiplier at the wavefront. Default 2.5. */
    readonly boost?: number;
    /** Maximum simultaneous click pulses (older ones recycle). Default 4. */
    readonly maxConcurrent?: number;
    /** Override pulse color. Empty string = theme default. */
    readonly color?: string;
  };
  /**
   * Geographic emphasis — equator + tropics get 2× brightness; prime meridian
   * + antimeridian get half emphasis. Subtle visual hierarchy.
   */
  readonly emphasis?: {
    /** Highlight the equator, tropics and principal meridians. Defaults to `wireframe.emphasisEnabled`. */
    readonly enabled?: boolean;
    /** Override the strong (equator + tropics) line color. Empty = theme. */
    readonly strongColor?: string;
    /** Override the weak (meridians) line color. Empty = theme. */
    readonly weakColor?: string;
    /** Strong-line opacity (0..1). Non-positive = theme default. */
    readonly strongOpacity?: number;
    /** Weak-line opacity factor (0..1). Default 0.5. */
    readonly weakOpacityFactor?: number;
  };
  /**
   * Equator beam — a thicker glowing line at the equator drawn separately
   * from `emphasis`. Reads as a "data spine" running around the planet, can
   * be pulsed for that "live energy" feel.
   */
  readonly equatorBeam?: {
    /** Show the separate luminous equator beam. Default false. */
    readonly enabled?: boolean;
    /** Override beam color. Empty string = theme default. */
    readonly color?: string;
    /** Beam opacity (0..1). Non-positive = default 0.85. */
    readonly opacity?: number;
    /** Pulse the beam intensity over time. Default false. */
    readonly pulse?: boolean;
    /** Beam pulse Hz when `pulse` enabled. Default 0.6. */
    readonly pulseSpeed?: number;
  };
  /**
   * CRT-glitch transients — every interval seconds, a horizontal band briefly
   * shears laterally then snaps back. Atmosphere, not noise.
   */
  readonly glitch?: {
    /** Apply occasional lateral grid distortions. Defaults to `wireframe.glitchEnabled`. */
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
    /** Show a rotating ring around the pinned country. Default true. */
    readonly enabled?: boolean;
    /** Rotation around the outward axis (rad/sec). Default 0.5. */
    readonly rotationSpeed?: number;
    /** Multiplier on the country's angular radius. Default 1.2. */
    readonly padding?: number;
    /** Override ring color. Empty string = theme default. */
    readonly color?: string;
    /** Ring opacity (0..1). Non-positive = theme default. */
    readonly opacity?: number;
  };
  /**
   * Distant data-flow streams — small luminous particles continuously falling
   * from the north pole towards the south pole along random meridians.
   */
  readonly poleStreams?: {
    /** Animate particles from north to south along meridians. Default true. */
    readonly enabled?: boolean;
    /** Number of simultaneously-active particles. Default 16. */
    readonly count?: number;
    /** Southward angular velocity in radians/sec. Default 0.6. */
    readonly speed?: number;
    /** Override stream color. Empty string = theme default. */
    readonly color?: string;
    /** Particle size. Non-positive = theme default. */
    readonly size?: number;
    /** Stream opacity (0..1). Non-positive = theme default. */
    readonly opacity?: number;
  };
  /**
   * Data packets — small luminous "blips" that race along latitude /
   * longitude lines as if information was being carried through the grid.
   * Each packet has a short fading trail.
   */
  readonly dataPackets?: {
    /** Animate packets travelling along latitude and longitude lines. Default false. */
    readonly enabled?: boolean;
    /** Total simultaneous packets. Default 24. */
    readonly count?: number;
    /** Travel speed in radians/sec. Default 0.9. */
    readonly speed?: number;
    /** Trail length in radians (0 = no trail). Default 0.18. */
    readonly trail?: number;
    /** Packet point size. Default 0.018. */
    readonly size?: number;
    /** Override packet color. Empty string = theme default. */
    readonly color?: string;
    /** Which axis the packets travel along. Default `'both'`. */
    readonly axis?: 'latitude' | 'longitude' | 'both';
  };
  /**
   * Compass markers — N/S/E/W cardinal letters anchored above the surface
   * at the four cardinal poles (and the two geographic poles). Acts as a
   * "we know where we are" anchor for the viewer.
   */
  readonly compass?: {
    /** Show the cardinal-direction markers. Default false. */
    readonly enabled?: boolean;
    /** Override marker color. Empty string = theme default. */
    readonly color?: string;
    /** Cardinal-marker sprite size in world units. Default 0.075. */
    readonly size?: number;
    /** Opacity (0..1). Non-positive = default 0.9. */
    readonly opacity?: number;
    /** Show N + S poles in addition to cardinals. Default true. */
    readonly poles?: boolean;
  };
  /**
   * Autonomous grid pulse — like the click pulse, but fires periodically from
   * either a fixed location or a random origin each cycle. Reads as the grid
   * "breathing" or "transmitting" without needing user input.
   */
  readonly gridPulse?: {
    /** Emit grid pulses periodically without a click. Default false. */
    readonly enabled?: boolean;
    /** Seconds between pulses. Default 4. */
    readonly intervalSec?: number;
    /** Wavefront speed (rad/sec). Default 1.2. */
    readonly speed?: number;
    /** Gaussian band half-width in radians. Default 0.16. */
    readonly width?: number;
    /** Peak brightness multiplier. Default 1.8. */
    readonly boost?: number;
    /** Override pulse color (empty = uses click-pulse color). */
    readonly color?: string;
    /** `'fixed'` = always from `origin` lat/lng; `'random'` = random sphere point each cycle. */
    readonly mode?: 'fixed' | 'random';
    /** Origin lat (used when `mode === 'fixed'`). Default 0. */
    readonly originLat?: number;
    /** Origin lng (used when `mode === 'fixed'`). Default 0. */
    readonly originLng?: number;
  };
  /**
   * Pole pulses — periodic radial waves emanating outward from the geographic
   * poles. Distinct from `poleStreams` (which travel pole→pole along
   * meridians); pole pulses spread around the cap as a halo.
   */
  readonly polePulse?: {
    /** Emit periodic waves from the geographic poles. Default false. */
    readonly enabled?: boolean;
    /** Seconds between pulses. Default 5. */
    readonly intervalSec?: number;
    /** Wavefront speed in rad/sec. Default 1.0. */
    readonly speed?: number;
    /** Peak brightness multiplier. Default 1.5. */
    readonly boost?: number;
    /** Override pulse color. Empty string = theme default (uses pulse color). */
    readonly color?: string;
    /** Which pole(s) to fire from. Default `'both'`. */
    readonly which?: 'north' | 'south' | 'both';
  };
}

/**
 * Parchment surface, ink borders, country wash and optional atlas decorations for the paper kind.
 * The nested `borders.roughness` option takes precedence over the compatibility alias
 * `borderRoughness`.
 */
export interface PaperConfig {
  /**
   * Fallback for `borders.roughness` when that nested option is omitted. Prefer `borders.roughness`
   * for new configurations.
   */
  readonly borderRoughness?: number;
  /** Parchment sphere color and procedurally baked grain, fibers, stains and ocean hatching. */
  readonly surface?: {
    /** Parchment base color. Omitted or empty uses `paper.surfaceColor`. */
    readonly color?: string;
    /** Random grain intensity in the parchment texture. Defaults to `paper.surfaceNoiseAmount`. */
    readonly noiseAmount?: number;
    /** Darkening baked around the parchment texture edges. Default 0.18. */
    readonly vignette?: number;
    /** Long fiber-stroke intensity in the parchment texture, from 0 to 1. Default 0.45. */
    readonly fiberAmount?: number;
    /** Watercolor stain intensity in the parchment texture, from 0 to 1. Default 0.2. */
    readonly stainAmount?: number;
    /** Watercolor stain tint. Omitted or empty uses `#e7b85f`. */
    readonly washColor?: string;
    /** Engraved ocean-hatching intensity, from 0 to 1. Default 0.58. */
    readonly waterLineAmount?: number;
    /** Ocean-hatching ink color. Omitted or empty uses `#6f9d9a`. */
    readonly waterLineColor?: string;
  };
  /** Country outlines with optional stippling, deterministic jitter and an ink-bleed pass. */
  readonly borders?: {
    /** Show the paper country outlines. Default true. */
    readonly enabled?: boolean;
    /** Border ink color. Omitted or empty uses `paper.borderColor`. */
    readonly color?: string;
    /** Border opacity. Defaults to `paper.borderOpacity`. */
    readonly opacity?: number;
    /**
     * Perpendicular border jitter strength; 0 draws smooth outlines. Defaults to `borderRoughness`,
     * then `paper.borderRoughness`.
     */
    readonly roughness?: number;
    /** Requested line width; actual wide-line support depends on the WebGL implementation. Default 1. */
    readonly width?: number;
    /** Replace continuous border strokes with sampled ink dots. */
    readonly stipple?: {
      /** Draw stippled country borders. Default false. */
      readonly enabled?: boolean;
      /**
       * Angular sampling interval in degrees along border segments; smaller values produce more
       * dots. Default 1.5.
       */
      readonly density?: number;
      /** Ink-dot size multiplier applied to a 0.012-world-unit point size. Default 1. */
      readonly size?: number;
    };
    /** Soft secondary border pass that simulates ink spreading into the paper. */
    readonly inkBleed?: {
      /** Show the ink-bleed border pass. Default true. */
      readonly enabled?: boolean;
      /** Bleed tint. Omitted or empty inherits the configured border color. */
      readonly color?: string;
      /** Ink-bleed opacity. Default 0.3. */
      readonly opacity?: number;
      /** Bleed-pass radial lift as a fraction of the globe radius. Default 0.0008. */
      readonly spread?: number;
    };
  };
  /** Base paper country wash, separate from the shared `countries.fill` data overlay. */
  readonly fill?: {
    /** Show the base paper country wash. Default true. */
    readonly enabled?: boolean;
    /** Wash base color. Omitted or empty uses `paper.fillColor`. */
    readonly color?: string;
    /** Base wash opacity. Defaults to `paper.fillOpacity`. */
    readonly opacity?: number;
    /** Use one wash color or a deterministic pastel tint per country. Default `'single'`. */
    readonly mode?: 'single' | 'pastel';
  };
  /** Atlas latitude and longitude grid with major-line emphasis. */
  readonly grid?: {
    /** Show the paper latitude and longitude grid. Default true. */
    readonly enabled?: boolean;
    /** Grid ink color. Omitted or empty uses `paper.gridColor`. */
    readonly color?: string;
    /** Minor grid-line opacity. Defaults to `paper.gridOpacity`. */
    readonly opacity?: number;
    /** Spacing between grid lines in degrees. Default 15. */
    readonly stepDeg?: number;
    /** Number of grid steps between major lines. Default 3. */
    readonly majorEvery?: number;
    /** Major grid-line opacity. Defaults to `min(1, grid.opacity * 1.6)` using the resolved minor opacity. */
    readonly majorOpacity?: number;
  };
  /** Transparent warm tint over the paper sphere. */
  readonly sepia?: {
    /** Show the sepia tint shell. Default false. */
    readonly enabled?: boolean;
    /** Sepia overlay tint. Omitted or empty uses `#8b6f47`. */
    readonly color?: string;
    /** Sepia overlay opacity. Default 0.18. */
    readonly opacity?: number;
  };
  /** DOM overlay that darkens the container corners. */
  readonly vignette?: {
    /** Show the container-corner vignette. Default false. */
    readonly enabled?: boolean;
    /** Vignette tint. Omitted or empty uses `#3a2a14`. */
    readonly color?: string;
    /** Corner-darkening opacity, from 0 to 1. Default 0.45. */
    readonly intensity?: number;
    /** Fraction of the radial gradient before darkening starts. Default 0.4. */
    readonly radius?: number;
  };
  /** Ink compass rose anchored to a geographic position on the globe. */
  readonly compassRose?: {
    /** Show the surface compass rose. Default false. */
    readonly enabled?: boolean;
    /** Compass-rose latitude in degrees. Default 32. */
    readonly lat?: number;
    /** Compass-rose longitude in degrees. Default -38. */
    readonly lng?: number;
    /** Compass-rose ink color. Omitted or empty uses `#5b3a1f`. */
    readonly color?: string;
    /** Compass-rose opacity. Default 0.55. */
    readonly opacity?: number;
    /** Compass-rose angular size in degrees. Default 8. */
    readonly size?: number;
  };
  /** Deterministically placed stain patches on the parchment sphere. */
  readonly agingMarks?: {
    /** Show the age-stain patches. Default false. */
    readonly enabled?: boolean;
    /** Number of stain patches. Default 12. */
    readonly count?: number;
    /** Stain tint. Omitted or empty uses `#7a5a2c`. */
    readonly color?: string;
    /** Stain opacity multiplier. Default 0.22. */
    readonly intensity?: number;
    /** Seed controlling stain placement so the same value reproduces the pattern. Default 1. */
    readonly seed?: number;
  };
  /** DOM text watermark positioned inside the globe container. */
  readonly watermark?: {
    /** Show the text watermark. Default false. */
    readonly enabled?: boolean;
    /** Watermark text. An empty string restores the default. Default `'ATLAS'`. */
    readonly text?: string;
    /** Watermark text color. Omitted or empty uses `#5b3a1f`. */
    readonly color?: string;
    /** Watermark text opacity. Default 0.18. */
    readonly opacity?: number;
    /** Watermark font size in CSS pixels. Default 28. */
    readonly size?: number;
    /** Watermark placement within the container. Default `'bottomRight'`. */
    readonly position?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  };
  /** Ink contour and watercolor echo fired by the shared top-level focus-pulse behavior. */
  readonly focusPulse?: {
    /** Primary ring expansion and fade duration in milliseconds. Default 1550. */
    readonly durationMs?: number;
    /** Ring angular radius at scale 1, in radians. Default 0.065. */
    readonly angularRadiusBase?: number;
    /** Ring angular band thickness in radians. Default 0.022. */
    readonly angularBand?: number;
    /** Ring scale at the start of expansion. Default 0.28. */
    readonly scaleMin?: number;
    /** Ring scale at the end of expansion. Default 2.35. */
    readonly scaleMax?: number;
    /** Initial ring opacity multiplier. Default 0.62. */
    readonly peakOpacity?: number;
    /** Number of polygon segments around the ring. Default 112. */
    readonly segments?: number;
    /** Ring radius as a multiplier of the globe radius. Default 1.006. */
    readonly radiusFactor?: number;
    /** Pulse ink tint. Omitted or empty inherits the paper border color. */
    readonly color?: string;
  };
}

/**
 * Hologram-shell stripes, rim lighting, interference patterns and border glitches. Visual effect
 * flags default to true; top-level `focusPulse` controls focus-ring triggers.
 */
export interface HologramConfig {
  /** Animated brightness stripes in the hologram shell shader. */
  readonly scanlines?: {
    /** Show shell scanlines. Default true. */
    readonly enabled?: boolean;
    /** Stripe density (sin frequency along the chosen axis). 0 = use theme default (240). */
    readonly density?: number;
    /** Stripe sweep speed in radians/sec. 0 = use theme default (1.5). */
    readonly speed?: number;
    /** Stripe brightness-modulation depth; 0 removes the modulation. Default 0.4. */
    readonly opacity?: number;
    /**
     * Sweep axis. `'horizontal'` (default) sweeps top-to-bottom; `'vertical'` sweeps left-to-right;
     * `'diagonal'` mixes both axes for a moiré drift.
     */
    readonly direction?: 'horizontal' | 'vertical' | 'diagonal';
  };
  /** Fresnel glow along the projected globe silhouette. */
  readonly rimGlow?: {
    /** Show the shell's Fresnel rim glow. Default true. */
    readonly enabled?: boolean;
    /** Hex tint for the rim Fresnel glow. Empty string = use theme default. */
    readonly color?: string;
    /** Brightness multiplier. 0 = use theme default (1.4). */
    readonly intensity?: number;
    /** Falloff sharpness — higher = thinner rim. 0 = default 2.0. */
    readonly width?: number;
  };
  /** Intermittent border shear and color-channel displacement. */
  readonly glitch?: {
    /** Animate border glitches. Default true. */
    readonly enabled?: boolean;
    /** Lower bound of inter-glitch wait (seconds). Default 4. */
    readonly intervalMin?: number;
    /** Upper bound of inter-glitch wait (seconds). Default 9. */
    readonly intervalMax?: number;
    /** Shear amplitude on the borders during a glitch. 0 = use theme default (0.025). */
    readonly amplitude?: number;
    /** RGB channel offset during glitch — visible as a fringed shear. 0..1. */
    readonly channelShift?: number;
  };
  /** Separate translucent halo surrounding the hologram shell. */
  readonly outerGlow?: {
    /** Show the outer halo mesh. Default true. */
    readonly enabled?: boolean;
    /** Hex tint of the outer halo. Empty string = use theme default (matches shell color). */
    readonly color?: string;
    /** Halo radius as a multiplier of GLOBE_RADIUS (≥1.0). 0 = default 1.02. */
    readonly spread?: number;
    /** Halo opacity multiplier. 0 = use theme default (0.12). */
    readonly intensity?: number;
  };
  /**
   * Chromatic aberration — splits the RGB channels at the silhouette so the
   * rim of the planet refracts into red / blue fringes. Sci-fi cinema staple.
   */
  readonly chromaticAberration?: {
    /** Split the shell's red and blue channels. Default true. */
    readonly enabled?: boolean;
    /** Channel separation (0..1). Default 0.45. */
    readonly amount?: number;
    /** `'rim'` (default) peaks the split at the Fresnel edge; `'global'` splits across the whole shell. */
    readonly mode?: 'rim' | 'global';
  };
  /**
   * Holographic noise — animated grain that flickers across the surface.
   * Reads as projector dust + photon shot noise.
   */
  readonly noise?: {
    /** Animate projector-like grain across the shell. Default true. */
    readonly enabled?: boolean;
    /** Grain depth (0..1). Default 0.18. */
    readonly intensity?: number;
    /** Grain cell size — bigger = chunkier. Default 1.6. */
    readonly scale?: number;
    /** Reroll speed (Hz). Default 22. */
    readonly speed?: number;
  };
  /**
   * Projector hum / pulse rim — slow brightness sweep that orbits the
   * silhouette, faking a rotating projector emitter.
   */
  readonly projectorPulse?: {
    /** Animate the rim-brightness sweep. Default true. */
    readonly enabled?: boolean;
    /** Sweep speed (revs/sec). Default 0.35. */
    readonly speed?: number;
    /** Brightness amplitude on the rim. Default 0.6. */
    readonly amplitude?: number;
    /** Hex tint, empty = inherit shell color. */
    readonly color?: string;
  };
  /**
   * Data feed scan — a bright luminous band moves slowly across the globe.
   * Default `axis: 'horizontal'` produces a top-to-bottom scan line; `'vertical'`
   * sweeps east; `'radial'` pulls in/out from a pole.
   */
  readonly dataScan?: {
    /** Sweep a bright data-scan band over the shell. Default true. */
    readonly enabled?: boolean;
    /** Sweep speed in cycles/sec. Default 0.2. */
    readonly speed?: number;
    /** Band thickness (0..1, fraction of axis range). Default 0.05. */
    readonly width?: number;
    /** Band brightness boost. Default 0.7. */
    readonly opacity?: number;
    /**
     * Scan direction: vertical-position bands, horizontal-position bands or radial expansion.
     * Default `'horizontal'`.
     */
    readonly axis?: 'horizontal' | 'vertical' | 'radial';
    /** Hex tint, empty = inherit shell color. */
    readonly color?: string;
  };
  /**
   * Phase shimmer — interference / moiré pattern that drifts across the
   * surface. Subtle; combines with scanlines for a "phase locking" feel.
   */
  readonly phaseShimmer?: {
    /** Animate the interference pattern on the shell. Default true. */
    readonly enabled?: boolean;
    /** Pattern density. Default 60. */
    readonly scale?: number;
    /** Modulation depth (0..1). Default 0.12. */
    readonly intensity?: number;
    /** Drift speed. Default 0.4. */
    readonly speed?: number;
  };
  /**
   * Calibration ticks — short bright marks rendered along the rim every
   * N degrees, like a sextant or radar bezel. Implemented in the shell
   * shader so they pin to the silhouette regardless of camera angle.
   */
  readonly calibrationTicks?: {
    /** Show calibration ticks near the silhouette. Default true. */
    readonly enabled?: boolean;
    /** Number of ticks around the rim. Default 36. */
    readonly count?: number;
    /** Tick length as a fraction of the visible radius. Default 0.04. */
    readonly length?: number;
    /** Tick brightness multiplier. Default 0.9. */
    readonly opacity?: number;
  };
  /** Primary projection ring and delayed echo fired by the shared top-level focus-pulse behavior. */
  readonly focusPulse?: {
    /** Primary ring expansion and fade duration in milliseconds. Default 1050. */
    readonly durationMs?: number;
    /** Projection-ring tint. Omitted or empty uses `hologram.borderColor`. */
    readonly color?: string;
    /** Ring angular radius at scale 1, in radians. Default 0.07. */
    readonly angularRadiusBase?: number;
    /** Ring angular band thickness in radians. Default 0.018. */
    readonly angularBand?: number;
    /** Ring scale at the start of expansion. Default 0.4. */
    readonly scaleMin?: number;
    /** Ring scale at the end of expansion. Default 2.6. */
    readonly scaleMax?: number;
    /** Initial ring opacity multiplier. Default 1.4. */
    readonly peakOpacity?: number;
    /** Number of polygon segments around the ring. Default 96. */
    readonly segments?: number;
    /** Ring radius as a multiplier of the globe radius. Default 1.012. */
    readonly radiusFactor?: number;
  };
}

/** Shader-detail tier for the cinematic kind; auto adapts the tier to measured frame rate. */
export type CinematicQuality = 'auto' | 'ultra' | 'high' | 'balanced';

/**
 * Shared response multipliers for cinematic lighting, view changes, density and animation. All
 * multipliers default to 1.
 */
export interface CinematicReactivityConfig {
  /** Strength of the shared daylight response across cinematic layers. Default 1. */
  readonly lightInfluence?: number;
  /** Strength of camera-distance and view-dependent visual responses. Default 1. */
  readonly cameraInfluence?: number;
  /** Strength of city-density-driven surface and lighting detail. Default 1. */
  readonly densityInfluence?: number;
  /** Brightness emphasis around the day/night boundary. Default 1. */
  readonly terminatorBoost?: number;
  /** Strength of the view-dependent horizon glow. Default 1. */
  readonly horizonGlow?: number;
  /** Shared atmospheric-scattering response multiplier. Default 1. */
  readonly atmosphericScatter?: number;
  /** Strength of fine procedural surface detail. Default 1. */
  readonly surfaceMicroDetail?: number;
  /** Strength of city-light modulation by night-side visibility. Default 1. */
  readonly cityNightResponse?: number;
  /** Strength of animated flow along cinematic connections. Default 1. */
  readonly orbitalFlow?: number;
}

/** A custom cinematic city-light point used for point rendering, route lookup and the city-density atlas. */
export interface CinematicCityLightDatum {
  /**
   * Stable city identity used to resolve string route endpoints. Defaults to an index-based `city-N`
   * id after sorting.
   */
  readonly id?: string;
  /** Latitude in degrees; clamped to the globe's supported range. */
  readonly lat: number;
  /** Longitude in degrees; wrapped into the -180 to 180 range. */
  readonly lng: number;
  /** Relative light value. Defaults to `importance`, then 1; clamped above zero. */
  readonly value?: number;
  /** City-density footprint radius used when building the density atlas. Default 0.65. */
  readonly radius?: number;
  /**
   * Optional color metadata retained in prepared data. The current city-light shader uses the layer
   * tint and temperature instead of this field.
   */
  readonly color?: string;
  /** Warm/cool color-mix parameter from 0 to 1. Default 0.62. */
  readonly temperature?: number;
  /** Weight used for city sorting, the count limit and the density atlas. Defaults to `value`, then 1. */
  readonly importance?: number;
  /** Optional application grouping preserved in the prepared dataset. */
  readonly group?: string;
  /** Application metadata preserved with this city; it does not create marker events. */
  readonly payload?: unknown;
}

/**
 * A city id, `[latitude, longitude]` tuple or coordinate object. Unresolved city ids cause the route
 * to be skipped.
 */
export type CinematicRouteEndpoint =
  | string
  | readonly [number, number]
  | {
      /** Endpoint latitude in degrees. */
      readonly lat: number;
      /** Endpoint longitude in degrees. */
      readonly lng: number;
    };

/** A cinematic network connection with optional per-route color, weight and animation overrides. */
export interface CinematicRouteDatum {
  /** Stable route identity used for deterministic animation defaults. Defaults to `route-N`. */
  readonly id?: string;
  /** Start endpoint as a city id, `[latitude, longitude]` or coordinate object. */
  readonly from: CinematicRouteEndpoint;
  /** End endpoint as a city id, `[latitude, longitude]` or coordinate object. */
  readonly to: CinematicRouteEndpoint;
  /** Positive relative route weight. Default 1. */
  readonly value?: number;
  /** Positive route-width multiplier. Defaults to `value`, then 1. */
  readonly width?: number;
  /**
   * Optional color metadata retained in prepared data. The current network shader uses
   * `network.color` instead of this field.
   */
  readonly color?: string;
  /**
   * Optional positive speed metadata retained in prepared data. The current network animation uses
   * `network.pulseSpeed` instead.
   */
  readonly speed?: number;
  /** Route elevation as a fraction of the globe radius. Default 0.012. */
  readonly height?: number;
  /**
   * Optional animation-phase metadata retained in prepared data. The current network derives its
   * phase from the route id instead.
   */
  readonly phase?: number;
  /** Application metadata preserved with the route; it does not create arc events. */
  readonly payload?: unknown;
}

/** Persistent cinematic city lights and routes, independent of the generic data-layer slot. */
export interface CinematicDataset {
  /**
   * Custom city-light points. Omitted or empty uses the built-in city distribution; set the
   * city-light count to 0 to remove every point.
   */
  readonly cityLights?: ReadonlyArray<CinematicCityLightDatum>;
  /**
   * Custom network routes. Omitted or empty uses built-in routes; set `network.maxConnections` to 0
   * to remove every route.
   */
  readonly routes?: ReadonlyArray<CinematicRouteDatum>;
}

/**
 * Sun / light rig for the cinematic kind.
 *
 * - `fixed` (default) — the light direction is a constant world-space
 *   vector (`direction`, falling back to `surface.lightDirection` and then
 *   the theme tokens). Auto-rotate orbits the camera, so the lit side stays
 *   put in the world.
 * - `realtime` — the subsolar point is computed from `date` (default: now)
 *   and advances with wall-clock time × `timeScale`. Produces the real
 *   day/night terminator for that moment.
 * - `orbit` — time-lapse: the subsolar longitude sweeps westward at
 *   `speed` degrees per second (default 6 → one full day every 60 s).
 *
 * `visible` draws a sun disc + glare far along the light direction (it
 * blooms when it clears the limb).
 */
export interface CinematicSunConfig {
  /**
   * Light-direction source: fixed vector, real-time solar position or animated longitude. Default
   * `'fixed'`.
   */
  readonly mode?: 'fixed' | 'realtime' | 'orbit';
  /**
   * World-space light vector for fixed mode. Defaults to `cinematic.surface.lightDirection`, then
   * the theme direction.
   */
  readonly direction?: readonly [number, number, number];
  /**
   * Initial date for real-time solar position; accepts a Date, date string or Unix milliseconds.
   * Omitted uses the current time.
   */
  readonly date?: Date | string | number;
  /** Simulated seconds per elapsed second in real-time mode; 0 freezes the solar date. Default 1. */
  readonly timeScale?: number;
  /** Westward solar-longitude speed in degrees per second for orbit mode. Default 6. */
  readonly speed?: number;
  /** Show the sun disc and glare; disabling it leaves directional lighting active. Default true. */
  readonly visible?: boolean;
  /** Sun-disc and directional-light tint. Omitted or empty uses `cinematic.sunColor`. */
  readonly color?: string;
  /** Sun-disc size multiplier. Default 1. */
  readonly size?: number;
  /** Sun-glare intensity multiplier. Default 1. */
  readonly glare?: number;
}

/** Procedural (or textured) cloud shell above the surface. */
export interface CinematicCloudsConfig {
  /** Render the cloud shell. Default true. */
  readonly enabled?: boolean;
  /** Fraction controlling procedural cloud coverage, from 0 to 1. Default 0.42. */
  readonly coverage?: number;
  /** 0..1 peak opacity. Default 0.85. */
  readonly opacity?: number;
  /** Advection speed multiplier. Default 1. */
  readonly speed?: number;
  /** Shell height as a fraction of the globe radius. Default 0.009. */
  readonly altitude?: number;
  /** Project cloud shadows onto the surface. Default true. */
  readonly shadows?: boolean;
  /** Cloud-shadow darkening strength, from 0 to 1. Default 0.45. */
  readonly shadowStrength?: number;
  /** Cloud-shell tint. Defaults to `cinematic.surface.cloudColor`, then `cinematic.cloudColor`. */
  readonly color?: string;
  /** Edge softness 0..1. Default 0.5. */
  readonly softness?: number;
}

/** Night-side auroral curtains near the geomagnetic poles. */
export interface CinematicAuroraConfig {
  /** Render night-side auroral emission. Default true. */
  readonly enabled?: boolean;
  /** 0..2. Default 0.8. */
  readonly intensity?: number;
  /** Lower aurora-curtain tint. Omitted or empty uses `cinematic.auroraColor`. */
  readonly color?: string;
  /** Upper aurora-curtain tint. Omitted or empty uses `cinematic.auroraTopColor`. */
  readonly colorTop?: string;
  /** Curtain animation speed multiplier. Default 1. */
  readonly speed?: number;
  /** Centre latitude of the auroral oval in degrees. Default 68. */
  readonly latitude?: number;
}

/**
 * Optional real Earth textures. Any subset works — the procedural look
 * fills in whatever is missing. Strings are URLs loaded with three's
 * `TextureLoader`; `Texture` instances are used as-is.
 */
export interface CinematicTexturesConfig {
  /** Equirectangular daytime surface-color texture URL or Three.js Texture. */
  readonly day?: string | import('three').Texture;
  /** Equirectangular night-light emission texture URL or Three.js Texture. */
  readonly night?: string | import('three').Texture;
  /** Equirectangular surface-normal texture URL or Three.js Texture. */
  readonly normal?: string | import('three').Texture;
  /** Equirectangular specular-mask texture URL or Three.js Texture. */
  readonly specular?: string | import('three').Texture;
  /** Equirectangular cloud-opacity texture URL or Three.js Texture. */
  readonly clouds?: string | import('three').Texture;
  /** Texture anisotropic-filtering level, clamped to 1 through 16 by the texture manager. Default 8. */
  readonly anisotropy?: number;
  /** Crossfade from procedural → textured in ms. Default 800. */
  readonly fadeMs?: number;
}

/** Scattering-shell atmosphere tuning (cinematic-only, on top of `GlobeConfig.atmosphere`). */
export interface CinematicAtmosphereConfig {
  /** Rayleigh strength multiplier. Default 1. */
  readonly scatterStrength?: number;
  /** Mie (forward-scatter halo) strength multiplier. Default 1. */
  readonly mieStrength?: number;
  /** Day-side scattering tint. Default `#6fb6ff`. */
  readonly dayColor?: string;
  /** Scattering tint near the solar terminator. Default `#ff8a3d`. */
  readonly twilightColor?: string;
  /** Night-side atmosphere tint. Default `#24365f`. */
  readonly nightColor?: string;
  /** Faint night-side limb glow 0..1. Default 0.18. */
  readonly airglow?: number;
  /** Shell thickness as a fraction of the globe radius. Default 0.075. */
  readonly thickness?: number;
}

/**
 * Cinematic surface, cloud, solar lighting, city-light and route-network controls. Omitted fields
 * inherit their theme or layer defaults; color and numeric reset behavior is documented per field.
 */
export interface CinematicConfig {
  /** Cinematic detail tier; `auto` adapts the shader-quality scalar to frame rate. Default `'auto'`. */
  readonly quality?: CinematicQuality;
  /** Shared multipliers controlling how cinematic layers respond to light, camera and city density. */
  readonly reactivity?: CinematicReactivityConfig;
  /** Procedural Earth surface palette, lighting and terrain controls. */
  readonly surface?: {
    /** Ocean base color. Omitted or empty uses `cinematic.oceanColor`. */
    readonly oceanColor?: string;
    /** Land base color before biome detail. Omitted or empty uses `cinematic.landColor`. */
    readonly landColor?: string;
    /**
     * Fallback cloud-shell tint when `clouds.color` is omitted. Omitted or empty uses
     * `cinematic.cloudColor`.
     */
    readonly cloudColor?: string;
    /** Night-side surface tint. Omitted or empty uses `cinematic.nightColor`. */
    readonly nightColor?: string;
    /**
     * Fallback world-space light vector when `sun.direction` is omitted. Defaults to the three
     * `cinematic.lightDirection` theme components.
     */
    readonly lightDirection?: readonly [number, number, number];
    /** Surface lighting composition: hero contrast, natural daylight or eclipse. Default `'hero'`. */
    readonly lightingMode?: 'hero' | 'natural' | 'eclipse';
    /** Width of the transition between day and night. Defaults to `cinematic.terminatorSoftness`. */
    readonly terminatorSoftness?: number;
    /** Contrast of the day/night transition. Defaults to `cinematic.terminatorContrast`. */
    readonly terminatorContrast?: number;
    /** Directional key-light brightness. Defaults to `cinematic.keyIntensity`. */
    readonly keyIntensity?: number;
    /** Fill-light brightness; 0 removes the fill. Defaults to `cinematic.fillIntensity`. */
    readonly fillIntensity?: number;
    /** Surface rim-light tint. Omitted or empty uses `cinematic.rimColor`. */
    readonly rimColor?: string;
    /** Surface rim-light brightness. Defaults to `cinematic.rimIntensity`. */
    readonly rimIntensity?: number;
    /** Rim falloff exponent; larger values make the highlight narrower. Defaults to `cinematic.rimPower`. */
    readonly rimPower?: number;
    /** Specular-highlight strength; 0 removes highlights. Defaults to `cinematic.specularIntensity`. */
    readonly specularIntensity?: number;
    /**
     * Legacy cloud-shell opacity fallback, read only during construction when greater than 0.2.
     * @deprecated Clouds moved to a separate shell — use `clouds.opacity`.
     */
    readonly cloudOpacity?: number;
    /** Ocean micro-reflection strength. Default 0.62. */
    readonly oceanSheen?: number;
    /** Terrain relief / normal-perturbation strength 0..2. Default 1. */
    readonly relief?: number;
    /** Latitude / altitude / moisture driven land palette. Default true. */
    readonly biomes?: boolean;
    /** Turquoise shallows + beaches strength 0..1. Default 0.6. */
    readonly shallows?: number;
    /** Night-side moonlight strength 0..2. Default 1. */
    readonly moonlight?: number;
    /** Height above which land turns to snow, 0..1. Default 0.72. */
    readonly snowLine?: number;
    /** Surface colour saturation multiplier: 1 natural, 0 monochrome. Default from the theme. */
    readonly saturation?: number;
    /** Polar-ice and snow tint. Omitted or empty uses `cinematic.iceColor`. */
    readonly iceColor?: string;
    /** Vegetated-land biome tint. Omitted or empty uses `cinematic.vegetationColor`. */
    readonly vegetationColor?: string;
    /** Dry-land biome tint. Omitted or empty uses `cinematic.desertColor`. */
    readonly desertColor?: string;
    /** Coastal shallow-water tint. Omitted or empty uses `cinematic.shallowWaterColor`. */
    readonly shallowWaterColor?: string;
  };
  /** Solar lighting controller and optional visible sun disc. */
  readonly sun?: CinematicSunConfig;
  /** Cloud shell, procedural cloud field and surface-shadow controls. */
  readonly clouds?: CinematicCloudsConfig;
  /** Animated night-side auroral emission near the poles. */
  readonly aurora?: CinematicAuroraConfig;
  /**
   * Optional Earth texture maps. Pass null to clear loaded texture maps and return to procedural
   * rendering.
   */
  readonly textures?: CinematicTexturesConfig | null;
  /** Cinematic scattering-shell controls, used together with top-level `atmosphere`. */
  readonly atmosphere?: CinematicAtmosphereConfig;
  /** Cinematic country-border emission controls. */
  readonly borders?: {
    /** Show the cinematic country-border layer. Default true. */
    readonly enabled?: boolean;
    /** Border tint. Omitted or empty uses `cinematic.borderColor`. */
    readonly color?: string;
    /** Border brightness. Defaults to `cinematic.borderIntensity`. */
    readonly intensity?: number;
  };
  /** Night-side point lights from the built-in distribution or a custom city dataset. */
  readonly cityLights?: {
    /** Render the city-light point layer. Default true. */
    readonly enabled?: boolean;
    /** Base city-light tint. Omitted or empty uses `cinematic.cityLightColor`. */
    readonly color?: string;
    /** City-light brightness. Defaults to `cinematic.cityLightIntensity`. */
    readonly intensity?: number;
    /**
     * Fallback point count and custom-dataset limit; 0 removes all city points and their density
     * contribution. Default 11500.
     */
    readonly count?: number;
    /** Base city-point size in world units, attenuated by camera distance. Default 0.0058. */
    readonly size?: number;
    /** Animate per-city brightness variation. Default true. */
    readonly twinkle?: boolean;
    /**
     * Custom city-light points used for rendering and the density atlas. Omitted or empty uses the
     * built-in distribution.
     */
    readonly data?: ReadonlyArray<CinematicCityLightDatum>;
  };
  /** Surface connections and moving pulses using built-in or custom routes. */
  readonly network?: {
    /** Render the cinematic route-network layer. Default true. */
    readonly enabled?: boolean;
    /** Base route-network tint. Omitted or empty uses `cinematic.networkColor`. */
    readonly color?: string;
    /** Base network opacity; 0 hides its contribution. Defaults to `cinematic.networkOpacity`. */
    readonly opacity?: number;
    /** Maximum fallback or custom routes; 0 removes all network connections. Default 56. */
    readonly maxConnections?: number;
    /** Global network animation-rate multiplier. Default 0.32. */
    readonly pulseSpeed?: number;
    /**
     * Custom network routes; city-id endpoints resolve against the city dataset. Omitted or empty
     * uses built-in routes.
     */
    readonly routes?: ReadonlyArray<CinematicRouteDatum>;
  };
  /** Warm expanding focus ring controlled by the shared top-level focus-pulse behavior. */
  readonly focusPulse?: {
    /** Primary ring expansion and fade duration in milliseconds. Default 1350. */
    readonly durationMs?: number;
    /** Focus-ring tint. Omitted or empty uses `cinematic.borderColor`. */
    readonly color?: string;
    /** Ring angular radius at scale 1, in radians. Default 0.075. */
    readonly angularRadiusBase?: number;
    /** Ring angular band thickness in radians. Default 0.015. */
    readonly angularBand?: number;
    /** Ring scale at the start of expansion. Default 0.32. */
    readonly scaleMin?: number;
    /** Ring scale at the end of expansion. Default 2.7. */
    readonly scaleMax?: number;
    /** Initial ring opacity multiplier. Default 1.1. */
    readonly peakOpacity?: number;
    /** Number of polygon segments around the ring. Default 96. */
    readonly segments?: number;
    /** Ring radius as a multiplier of the globe radius. Default 1.01. */
    readonly radiusFactor?: number;
  };
}
