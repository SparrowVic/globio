import type { Group, Mesh, PerspectiveCamera, Vector3 } from 'three';
import type { CountryFeature } from '../renderer/country-feature';
import type { ResolvedTokens } from '../theme/types';
import type { CountryDataMap, GlobeConfig, LatLng } from '../types';

/**
 * Globe kinds — the high-level visual identity of the rendered globe.
 * Each kind owns its renderer pipeline + per-kind tokens + per-kind config.
 *
 * - `outline` — vector country borders on a solid sphere (default)
 * - `dotted` — Apple/Stripe-style: glowing dots fill each country, no borders
 * - `wireframe` — Tron-style: pure lat/lng grid, no country geometry
 * - `hologram` — sci-fi command-deck: transparent shell, scanlines, Fresnel rim
 *
 * Future kinds: `paper`, `choropleth`. New kinds get a
 * `kinds/<name>/` folder with their own layer + index.ts exporting a
 * `KindModule`, then a registry entry in `kinds/registry.ts`.
 */
export type GlobeKind =
  | 'outline'
  | 'dotted'
  | 'wireframe'
  | 'paper'
  | 'hologram';

/**
 * Inputs handed to a kind module's `build()`. Kinds get the loaded country
 * features, the resolved theme tokens, the active globe config (so they can
 * pull their per-kind sub-config like `config.wireframe`), and the parent
 * group to add their visible objects to. Anything broader (scene/camera) can
 * be added here later if a future kind needs it.
 */
export interface KindBuildContext {
  readonly globeGroup: Group;
  readonly features: ReadonlyArray<CountryFeature>;
  readonly tokens: ResolvedTokens;
  readonly config: GlobeConfig;
  /**
   * The default opaque sphere mesh that backs `globeMesh.surfaceColor`. Most
   * kinds add their visible geometry on top of it. Kinds that want a fully
   * custom shell (e.g. `hologram`) can hide this on `build()` and restore
   * on `dispose()` — the underlying mesh still serves as the picking target
   * for surface raycasts even when invisible.
   */
  readonly globeSurfaceMesh: Mesh;
}

/**
 * Returned by `KindModule.build()`. The kind owns the lifecycle of whatever
 * objects it adds to `globeGroup`; `dispose()` cleans them up. Optional
 * hooks let the kind animate (`update`) or be hidden temporarily
 * (`setVisible`) without rebuilding.
 */
export interface KindHandle {
  dispose(): void;
  /**
   * Per-frame tick. `delta` = seconds since the previous frame; `elapsed` =
   * cumulative seconds since mount (mirrors what the existing arcs/
   * highlight layers receive).
   */
  update?(delta: number, elapsedSeconds: number): void;
  setVisible?(visible: boolean): void;
  /**
   * Called when the user explicitly focuses a country via
   * `globe.focusOnCountry()`. Useful for spawning kind-specific feedback
   * effects (sonar pulses, particle bursts, …).
   */
  onCountryFocus?(latLng: LatLng, countryId: string): void;
  /**
   * Called on every globe surface click (right after the click is raycast).
   * `point3D` is the surface intersection in globe-local space; `latLng`
   * is the same in lat/lng. Kinds can use this to launch ripples / pulses
   * radiating from the click point.
   */
  onPointerDown?(point3D: Vector3, latLng: LatLng): void;
  /**
   * Streamed on EVERY pointer move with the current surface intersection
   * (country or globe surface). `null` means the pointer left the globe
   * (off-edge or over a marker — markers own their own tooltip). Kinds can
   * drive a follow-cursor reticle, lat/lng HUD, etc.
   */
  onPointerMove?(point3D: Vector3 | null, latLng: LatLng | null): void;
  /**
   * Called when `setCountryData()` lands a new map. Both prev and next are
   * passed so kinds can diff and animate per-country changes (e.g. flash
   * dots whose value moved).
   */
  onCountryDataChange?(next: CountryDataMap | null, prev: CountryDataMap | null): void;
  /**
   * Optional registry of feature decorators. Globe.ts looks here when
   * routing lifecycle events that have a kind-specific visual variant
   * (e.g. focus pulse) — when the kind owns a decorator, it gets the
   * call; otherwise the event is a no-op for that feature.
   */
  readonly decorations?: KindDecorations;
}

/**
 * Decorator for a shared semantic feature whose VISUAL implementation differs
 * per kind. The kind module exposes decorators on its `KindHandle` and
 * globe.ts routes lifecycle events into them, so e.g. a focus pulse looks
 * cyan-tron in wireframe, ink-stain in paper, etc.
 */
export interface FocusPulseDecorator {
  /**
   * Spawn a pulse at `latLng`. `source` distinguishes pulses triggered by
   * `globe.focusOnCountry()` (lat/lng = country centroid) from raw surface
   * clicks (lat/lng = exact click point).
   */
  spawn(latLng: LatLng, source: 'focus' | 'click'): void;
  update?(delta: number): void;
  /**
   * Live update for the pulse band's scalar config. Implemented by the
   * shared `FocusPulseBand` underneath — kind-specific decorators
   * forward every field as-is. Optional so decorators that don't
   * support live updates can omit it (the disabled stub does).
   */
  setOptions?(partial: {
    readonly durationSeconds?: number;
    readonly angularRadiusBase?: number;
    readonly angularBand?: number;
    readonly scaleMin?: number;
    readonly scaleMax?: number;
    readonly peakOpacity?: number;
    readonly radiusFactor?: number;
    readonly segments?: number;
    readonly color?: string;
  }): void;
  dispose(): void;
}

/**
 * Builders for kind-specific data-layer decorations. Each builder takes
 * the user-supplied layer config + a build context (globeGroup, features,
 * tokens) and returns a `DataLayerHandle` with dispose / update / setData
 * lifecycle. Globe.ts calls these on `setDataLayer(...)` and disposes the
 * previous handle on swap.
 *
 * If a kind doesn't register a builder for a given data-layer type, that
 * type silently no-ops on that kind (a `console.warn` flags it once).
 */
export interface DataLayerDecorations {
  readonly choropleth?: DataLayerBuilder;
  readonly bars?: DataLayerBuilder;
  readonly extruded?: DataLayerBuilder;
  readonly heatmap?: DataLayerBuilder;
  readonly hexbin?: DataLayerBuilder;
  readonly charts?: DataLayerBuilder;
}

export interface DataLayerBuildContext {
  readonly globeGroup: import('three').Group;
  readonly features: ReadonlyArray<import('../renderer/country-feature').CountryFeature>;
  readonly tokens: import('../theme/types').ResolvedTokens;
  readonly camera: PerspectiveCamera;
  /**
   * The renderer canvas — supplied to layers that need their own pointer
   * raycasting (hexbin cell hover, chart click). Layers that don't take
   * input can ignore this. Optional so older builders keep compiling.
   */
  readonly domElement?: HTMLElement;
}

export type DataLayerBuilder = (
  layer: import('../data-layers/types').DataLayer,
  ctx: DataLayerBuildContext
) => import('../data-layers/types').DataLayerHandle;

export interface KindDecorations {
  readonly focusPulse?: FocusPulseDecorator;
  readonly dataLayers?: DataLayerDecorations;
  // Future: arcs, markers, hoverBorders, htmlMarkers, labels, starfield…
  // See FEATURES.md "Decoration pattern roadmap".
}

/**
 * The contract every kind implements. Pure data + factory. No state lives
 * on the module itself — `build()` returns a fresh handle per globe.
 */
export interface KindModule {
  readonly kind: GlobeKind;
  /**
   * Whether this kind has hoverable / clickable country surface. When true,
   * globe.ts mounts the picking + highlight infrastructure so country events
   * fire. When false (e.g. wireframe shows no country geometry), it skips
   * those layers entirely.
   *
   * NOTE: even when false, marker raycasting still works — markers are a
   * separate target.
   */
  readonly hasCountryInteraction: boolean;
  /**
   * Whether this kind opts in to the *standard* `CountryHighlightLayer` —
   * the LineSegments-based stroke around the hovered + active country. The
   * default (true) is the right call for outline / wireframe / paper /
   * hologram which all read "fine" as a continuous line on top of their
   * surface. Kinds whose visual language fights with continuous strokes
   * (e.g. **dotted**, where a hard outline reads as foreign material on
   * top of the dot field) opt out and provide their own dot-native hover /
   * active feedback inside the kind module.
   */
  readonly usesStandardCountryHighlight?: boolean;
  build(ctx: KindBuildContext): KindHandle;
}
