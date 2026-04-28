import type { Group, Mesh, Vector3 } from 'three';
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
  build(ctx: KindBuildContext): KindHandle;
}
