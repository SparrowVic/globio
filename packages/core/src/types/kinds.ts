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
    readonly enabled?: boolean;
    readonly scale?: number;
    readonly brightnessBoost?: number;
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
   * `CountryHighlightLayer` active stroke (which dotted opts out of).
   * When `globe.setActiveCountry(id)` runs, the pinned country's dots
   * pick up a steady brightness boost + slow sine pulse. Independent
   * from hover so the user can pin one country and hover another.
   */
  readonly activeCountry?: {
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
   * Per-country dot colour overrides — independent of the country
   * fill mesh that sits *behind* the dots (configured via
   * `countries.fill`). Modes mirror the fill layer so the user can
   * tint dots with a palette, drive them from data, or apply
   * hover/active colour overrides without touching the background.
   *
   *  - `'theme'` (default) — every dot uses `countries.dotted.color`.
   *  - `'palette'` — each country picks a colour from `palette` by
   *    feature index modulo, recoloured per-vertex.
   *  - `'data'` — palette index resolved from a data map (see
   *    `countries.fill` doc — same shape, runs through choropleth
   *    flow if you also drive fill from data).
   *
   * Hover / active overrides apply on top of whichever base the
   * mode produced; active wins over hover when both target the same
   * country. Empty-string colour is the universal "no override"
   * sentinel matching the rest of the configurator.
   */
  readonly dots?: {
    readonly mode?: 'theme' | 'palette' | 'data';
    readonly palette?: ReadonlyArray<string>;
    readonly hoverColor?: string;
    readonly activeColor?: string;
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
 *
 * The whole config is "soft-typed" for live updates — every field is a
 * candidate for `globe.update({ wireframe: { ... } })`, sentinel values
 * (empty-string color, non-positive numeric on a clamped knob) reset to
 * theme / construction defaults so the workshop's clear-override flow
 * works uniformly.
 */
export interface WireframeConfig {
  readonly enabled?: boolean;
  /** Override token-driven density (1 = default, lower = sparser). */
  readonly density?: number;
  /** Override token-driven pulse amplitude (0..1, 0 = disabled). */
  readonly pulse?: number;
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
    readonly enabled?: boolean;
    /** Override marker color. Empty string = theme default. */
    readonly color?: string;
    /** Marker text size in pixels. Default 12. */
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
 * Paper kind — vintage-atlas vibe rendered as a 3D globe. Every layer is
 * tunable so callers can dial the parchment from "freshly printed" all
 * the way to "mouldering 17th-century artefact."
 *
 * Sub-sections:
 *  - `surface` — the parchment sphere itself (color, grain, vignette).
 *  - `borders` — hand-drawn ink country outlines (color, width, opacity,
 *    roughness, optional stipple style + ink-bleed glow).
 *  - `fill` — pastel country wash.
 *  - `grid` — atlas registration lat/lng grid (step, major/minor lines).
 *  - `sepia` — warm tint applied over the whole globe.
 *  - `vignette` — corner darkening like an old illustration plate.
 *  - `compassRose` — fixed compass rose watermark on the surface.
 *  - `agingMarks` — tea-stain blotches scattered on the parchment.
 *  - `watermark` — faint DOM text watermark (e.g. "ATLAS").
 *
 * Sentinel reset semantics: empty-string color = use theme default,
 * non-positive numeric where the property only makes sense ≥ 0 = use
 * theme default. The `setPaperConfig` live setter respects them.
 *
 * `borderRoughness` is kept at the top level for back-compat — it now
 * also lives at `borders.roughness`. Either path works.
 */
export interface PaperConfig {
  readonly borderRoughness?: number;
  readonly surface?: {
    readonly color?: string;
    readonly noiseAmount?: number;
    readonly vignette?: number;
  };
  readonly borders?: {
    readonly enabled?: boolean;
    readonly color?: string;
    readonly opacity?: number;
    readonly roughness?: number;
    readonly width?: number;
    readonly stipple?: {
      readonly enabled?: boolean;
      /** Average dot every N world-units along the ring. Lower = denser. */
      readonly density?: number;
      readonly size?: number;
    };
    readonly inkBleed?: {
      readonly enabled?: boolean;
      readonly color?: string;
      readonly opacity?: number;
      /** Outward lift of the bleed pass relative to surface (0..0.01). */
      readonly spread?: number;
    };
  };
  readonly fill?: {
    readonly enabled?: boolean;
    readonly color?: string;
    readonly opacity?: number;
    readonly mode?: 'single' | 'pastel';
  };
  readonly grid?: {
    readonly enabled?: boolean;
    readonly color?: string;
    readonly opacity?: number;
    readonly stepDeg?: number;
    readonly majorEvery?: number;
    readonly majorOpacity?: number;
  };
  readonly sepia?: {
    readonly enabled?: boolean;
    readonly color?: string;
    readonly opacity?: number;
  };
  readonly vignette?: {
    readonly enabled?: boolean;
    readonly color?: string;
    readonly intensity?: number;
    /** Inner radius (0..1) where the vignette starts darkening. */
    readonly radius?: number;
  };
  readonly compassRose?: {
    readonly enabled?: boolean;
    readonly lat?: number;
    readonly lng?: number;
    readonly color?: string;
    readonly opacity?: number;
    readonly size?: number;
  };
  readonly agingMarks?: {
    readonly enabled?: boolean;
    readonly count?: number;
    readonly color?: string;
    readonly intensity?: number;
    /** Deterministic seed so marks don't move on every rebuild. */
    readonly seed?: number;
  };
  readonly watermark?: {
    readonly enabled?: boolean;
    readonly text?: string;
    readonly color?: string;
    readonly opacity?: number;
    readonly size?: number;
    readonly position?: 'center' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  };
}

/**
 * Hologram kind extras — sci-fi cinema in globe form. Every effect is
 * additive on top of the base shell shader; combine knobs to dial from
 * "calm projection" to "chaotic data feed under load". All default-on;
 * toggle individually for the look you want.
 *
 * Existing knobs (scanlines, rimGlow, glitch, outerGlow) are now fully
 * parameterised. Six new effect families layer on top:
 *  - `chromaticAberration` — RGB channel split for the sci-fi cinema rim shimmer.
 *  - `noise` — animated grain texture on the surface.
 *  - `projectorPulse` — slow brightness sweep around the silhouette ("hum").
 *  - `dataScan` — bright band moving across the globe; "live data feed" feel.
 *  - `phaseShimmer` — moiré interference pattern; reads as projector phase drift.
 *  - `calibrationTicks` — tiny ticks pulled around the rim every N degrees;
 *    lends a "scientific instrument" calibration vibe.
 *  - `focusPulse` — layered projection rings fired by focus/click events;
 *    top-level `GlobeConfig.focusPulse` still controls when they spawn.
 *
 * Sentinel reset semantics match other kinds: empty-string color = "use
 * theme default"; `0` for non-zero numeric defaults = "use construction-
 * time value". Every knob is live-updatable via `setHologramConfig`.
 */
export interface HologramConfig {
  readonly scanlines?: {
    readonly enabled?: boolean;
    /** Stripe density (sin frequency along the chosen axis). 0 = use theme default (240). */
    readonly density?: number;
    /** Stripe sweep speed in radians/sec. 0 = use theme default (1.5). */
    readonly speed?: number;
    /** Modulation depth; 0 = invisible, 1 = full theme default (0.4). */
    readonly opacity?: number;
    /** Sweep axis. `'horizontal'` (default) sweeps top-to-bottom; `'vertical'` sweeps left-to-right; `'diagonal'` mixes both axes for a moiré drift. */
    readonly direction?: 'horizontal' | 'vertical' | 'diagonal';
  };
  readonly rimGlow?: {
    readonly enabled?: boolean;
    /** Hex tint for the rim Fresnel glow. Empty string = use theme default. */
    readonly color?: string;
    /** Brightness multiplier. 0 = use theme default (1.4). */
    readonly intensity?: number;
    /** Falloff sharpness — higher = thinner rim. 0 = default 2.0. */
    readonly width?: number;
  };
  readonly glitch?: {
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
  readonly outerGlow?: {
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
    readonly enabled?: boolean;
    /** Sweep speed in cycles/sec. Default 0.2. */
    readonly speed?: number;
    /** Band thickness (0..1, fraction of axis range). Default 0.05. */
    readonly width?: number;
    /** Band brightness boost. Default 0.7. */
    readonly opacity?: number;
    readonly axis?: 'horizontal' | 'vertical' | 'radial';
    /** Hex tint, empty = inherit shell color. */
    readonly color?: string;
  };
  /**
   * Phase shimmer — interference / moiré pattern that drifts across the
   * surface. Subtle; combines with scanlines for a "phase locking" feel.
   */
  readonly phaseShimmer?: {
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
    readonly enabled?: boolean;
    /** Number of ticks around the rim. Default 36. */
    readonly count?: number;
    /** Tick length as a fraction of the visible radius. Default 0.04. */
    readonly length?: number;
    /** Tick brightness multiplier. Default 0.9. */
    readonly opacity?: number;
  };
  readonly focusPulse?: {
    readonly durationMs?: number;
    readonly color?: string;
    readonly angularRadiusBase?: number;
    readonly angularBand?: number;
    readonly scaleMin?: number;
    readonly scaleMax?: number;
    readonly peakOpacity?: number;
    readonly segments?: number;
    readonly radiusFactor?: number;
  };
}
