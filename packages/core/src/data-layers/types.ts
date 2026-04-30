/**
 * Data Layers — high-level data visualisations layered on top of any kind.
 *
 * The user picks ONE data-layer at a time (`globe.setDataLayer(config)`);
 * the active kind decides HOW that layer renders via per-kind decorators
 * registered on `KindHandle.decorations`. Same dataset, different vibe per
 * kind — outline gets crisp gold bars, hologram cyan glowing bars, paper
 * stamped-ink bars, etc.
 *
 * Architecture: see `FEATURES.md` section 5b "Decoration pattern roadmap"
 * and section 5c "Data layers".
 */

import type { CountryDataMap, LatLng } from '../types';
import type { ScaleConfig } from '../data/scales';

export type DataLayerType = 'choropleth' | 'bars' | 'extruded' | 'heatmap';

export interface DataLayerEvents<TEntry = unknown> {
  readonly onHover?: (entry: TEntry | null) => void;
  readonly onClick?: (entry: TEntry) => void;
}

/**
 * Per-country values driving choropleth (a dataset keyed by ISO id).
 * 2D fill — colours each country by its scale-mapped value.
 */
export interface ChoroplethDataLayer {
  readonly type: 'choropleth';
  readonly data: CountryDataMap;
  readonly scale?: ScaleConfig;
  readonly events?: DataLayerEvents<{ readonly id: string; readonly value?: number }>;
}

/**
 * Bars rising from the sphere surface — boxes / cylinders at lat/lng (or
 * country centroid), height ≈ value-mapped, colour from scale or per-entry.
 * Great for population-per-city, GDP-per-country, sales-per-region.
 */
export interface BarsDataLayer {
  readonly type: 'bars';
  readonly data: ReadonlyArray<BarsDataEntry>;
  readonly scale?: ScaleConfig;
  /** Min/max bar height in world units (1.0 = globe radius). Default 0.02 → 0.4. */
  readonly height?: { readonly min?: number; readonly max?: number };
  /** Bar diameter in world units. Default 0.012. */
  readonly width?: number;
  /**
   * Animation on mount: 'rise' grows bars from 0 → target height over
   * `mountDurationMs` (default 700). 'none' snaps in.
   */
  readonly animateOnMount?: 'rise' | 'none';
  readonly mountDurationMs?: number;
  readonly events?: DataLayerEvents<BarsDataEntry>;
}

export interface BarsDataEntry {
  /** Either `id` (resolves to country centroid) OR explicit `position`. */
  readonly id?: string;
  readonly position?: LatLng;
  readonly value: number;
  /** Optional explicit colour overrides the scale lookup. */
  readonly color?: string;
  /** Free-form payload available in events. */
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * Extruded countries — each country polygon pushed outward along its
 * surface normal at a value-derived height. 3D variant of choropleth.
 * Side walls connect the surface ring to the elevated top.
 */
export interface ExtrudedDataLayer {
  readonly type: 'extruded';
  readonly data: CountryDataMap;
  readonly scale?: ScaleConfig;
  /** Min/max extrusion height in world units. Default 0.005 → 0.18. */
  readonly height?: { readonly min?: number; readonly max?: number };
  /**
   * Animation on mount: 'rise' grows from 0 → target. 'none' snaps in.
   * Default 'rise', 700ms.
   */
  readonly animateOnMount?: 'rise' | 'none';
  readonly mountDurationMs?: number;
  readonly events?: DataLayerEvents<{ readonly id: string; readonly value?: number }>;
}

/**
 * Kernel function used to spread each sample's value into a continuous
 * density field. Different kernels give different visual characters:
 *  - `gaussian` — soft, infinite tail. The classical heatmap look.
 *  - `epanechnikov` — bell-curve with a hard edge at the radius. Tight peaks.
 *  - `quartic` — smoother edge than epanechnikov, broader plateau at peak.
 *  - `dome` — rounded crown with a steep wall near the radius cutoff.
 *  - `uniform` — flat disk; binary inside / outside the kernel.
 */
export type HeatmapKernel = 'gaussian' | 'epanechnikov' | 'quartic' | 'dome' | 'uniform';

/**
 * How accumulated density gets mapped to the [0, 1] range that drives
 * displacement and color:
 *  - `peak` — divide by the maximum density. Always saturates to 1 at the
 *    hottest pixel. Good for relative comparisons.
 *  - `absolute` — caller's `absoluteMax` value is treated as the saturation
 *    point. Lets you keep a stable visual reference across data updates.
 *  - `log` — `log1p(d) / log1p(peak)`. Compresses wide-range data so small
 *    clusters stay visible next to extreme outliers.
 */
export type HeatmapNormalize = 'peak' | 'absolute' | 'log';

/**
 * Curve applied to the normalised density before sampling colour /
 * displacement. Lets you bend the visual response without changing the
 * data: `smoothstep` softens, `cubic` sharpens peaks, `sqrt` brightens
 * mids, `linear` is raw.
 */
export type HeatmapCurve = 'linear' | 'smoothstep' | 'cubic' | 'sqrt';

/**
 * Optional procedural latitude/longitude grid blended inside the heatmap
 * shader. It adds topographic scale cues without allocating extra line
 * geometry or z-fighting with country borders.
 */
export interface HeatmapGridConfig {
  /** Defaults to true when the object is supplied. Pass `false` on `grid` to disable. */
  readonly enabled?: boolean;
  /** Minor grid spacing in degrees. Default 8. */
  readonly stepDeg?: number;
  /** Line width in degrees before shader anti-aliasing. Default 0.16. */
  readonly widthDeg?: number;
  /** Minor grid opacity. Default 0.14. */
  readonly opacity?: number;
  /** Major line every N minor steps. Default 4. */
  readonly majorEvery?: number;
  /** Major grid opacity. Default 0.24. */
  readonly majorOpacity?: number;
  /** Grid colour. Defaults to the heatmap fallback colour. */
  readonly color?: string;
  /** Density value where grid reaches full strength. Default 0.28. */
  readonly densityFade?: number;
}

/**
 * Optional contour/isoline overlay derived from the same density field as
 * heatmap colour and displacement. This gives 3D heatmaps a topographic
 * reading: users can see connected density bands instead of only isolated
 * domes.
 */
export interface HeatmapContourConfig {
  /** Defaults to true when the object is supplied. Pass `false` on `contours` to disable. */
  readonly enabled?: boolean;
  /** Density interval between minor contour lines in [0..1]. Default 0.08. */
  readonly interval?: number;
  /** Line width in density units before shader anti-aliasing. Default 0.006. */
  readonly width?: number;
  /** Minor contour opacity. Default 0.22. */
  readonly opacity?: number;
  /** Major line every N minor intervals. Default 4. */
  readonly majorEvery?: number;
  /** Major contour opacity. Default 0.38. */
  readonly majorOpacity?: number;
  /** Contour colour. Defaults to the heatmap fallback colour. */
  readonly color?: string;
  /** Contours below this shaped density fade out. Default 0.04. */
  readonly densityFade?: number;
}

/**
 * View-dependent shader scaling. The baked geographic density stays stable;
 * only displacement, opacity, threshold and grid contrast are adjusted so
 * the layer does not look oversized when the user zooms in.
 */
export interface HeatmapZoomScalingConfig {
  /** Defaults to true when the object is supplied. Pass `false` on `zoomScaling` to disable. */
  readonly enabled?: boolean;
  /** Camera distance where close-up scaling is fully applied. Default 1.45. */
  readonly closeDistance?: number;
  /** Camera distance where the far/default scale is restored. Default 3.2. */
  readonly farDistance?: number;
  /** Height multiplier at close distance. Default 0.55. */
  readonly closeHeightScale?: number;
  /** Height multiplier at far distance. Default 1. */
  readonly farHeightScale?: number;
  /** Opacity multiplier at close distance. Default 0.86. */
  readonly closeOpacityScale?: number;
  /** Opacity multiplier at far distance. Default 1. */
  readonly farOpacityScale?: number;
  /** Extra threshold added at close distance. Default 0.04. */
  readonly thresholdBoost?: number;
  /** Grid opacity multiplier added at close distance. Default 0.45. */
  readonly gridBoost?: number;
  /** Contour opacity multiplier added at close distance. Default 0.35. */
  readonly contourBoost?: number;
}

/**
 * Country-aware dome bake. When the active kind can provide country
 * polygons and entries include `id` or `name`, each matched sample is
 * rasterized inside that country's polygon instead of spilling as a radial
 * blob over neighbouring countries or oceans.
 */
export interface HeatmapCountryDomeConfig {
  /** Defaults to true when the object is supplied. Pass `false` on `countryDomes` to disable. */
  readonly enabled?: boolean;
  /** Approximate area fraction of the country kept as the rounded central crown. Default 0.55. */
  readonly centerArea?: number;
  /** Height at the edge of the central crown before the wall falls down. Default 0.36. */
  readonly shoulderHeight?: number;
  /** Extra steepness applied to the falling wall. Default 2.6. */
  readonly edgeSteepness?: number;
}

/**
 * Volumetric heatmap — many lat/lng samples accumulate into a continuous
 * density field. The density is rendered both as a colour band over the
 * globe AND as a vertical displacement of a high-resolution sphere.
 *
 * Implementation: density is **pre-baked into an equirectangular texture**
 * (default 2048×1024) so the GPU samples it per-pixel. Vertex shader
 * displaces the surface; fragment shader picks colour from a 1D palette
 * texture built from the layer's `scale`. Pixel-perfect smoothness — no
 * triangulation artifacts even at low subdivisions.
 *
 * Good for crime density, cell-tower coverage, earthquake aggregations,
 * population pressure, internet usage — anything that feels "continuous".
 */
export interface HeatmapDataLayer {
  readonly type: 'heatmap';
  readonly data: ReadonlyArray<HeatmapDataEntry>;
  readonly scale?: ScaleConfig;

  /**
   * Default angular influence radius (radians) when an entry doesn't
   * specify its own. Default 0.12 (~6.9°).
   */
  readonly radius?: number;

  /**
   * Max vertex displacement (world units; 1 = globe radius) at peak
   * density. Default 0. Set to a small value such as 0.04–0.10 for a
   * professional 3D relief; large values quickly dominate the globe.
   */
  readonly maxHeight?: number;

  /**
   * Icosphere subdivision driving the displacement mesh. Colour is
   * pixel-perfect via the shader regardless. Default 6 (≈40k verts).
   * 7 (≈160k) is hero-shot quality; 5 (≈10k) is fine for big-picture.
   */
  readonly subdivisions?: number;

  /** Kernel shape — see {@link HeatmapKernel}. Default `'gaussian'`. */
  readonly kernel?: HeatmapKernel;

  /**
   * Resolution of the density texture (equirectangular). Higher = sharper
   * detail in tight clusters; costs more bake time + GPU memory. Default
   * 2048×1024 (~8MB). 4096×2048 for hero shots, 1024×512 for live updates.
   */
  readonly textureResolution?: {
    readonly width: number;
    readonly height: number;
  };

  /**
   * How the heatmap composites with the underlying globe surface.
   *  - `'normal'` (default) — opaque-style alpha blend; vivid, professional.
   *    Looks like deck.gl HeatmapLayer / Mapbox heatmaps.
   *  - `'additive'` — adds onto the surface; produces glow / neon look,
   *    great for night-style globes and hotspot reveals.
   */
  readonly blendMode?: 'normal' | 'additive';

  /**
   * Post-bake blur passes applied to the density texture (3×3 box blur,
   * separable). Smooths over pixel-level discontinuities at high
   * subdivisions or low texture resolutions. Default 2. 0 disables.
   */
  readonly blurPasses?: number;

  /** Density normalisation — see {@link HeatmapNormalize}. Default `'peak'`. */
  readonly normalize?: HeatmapNormalize;

  /** Required when `normalize: 'absolute'`. Density value treated as 1.0. */
  readonly absoluteMax?: number;

  /**
   * Cutoff fraction of peak density (0..1). Pixels below this threshold
   * render fully transparent — sharpens the hotspots and reveals the
   * underlying globe in cooler regions. Default 0.
   */
  readonly threshold?: number;

  /**
   * Multiplier on normalised density before the curve. >1 pushes mids
   * toward saturation; <1 dampens. Default 1.
   */
  readonly intensity?: number;

  /** Response curve for COLOUR — see {@link HeatmapCurve}. Default `'smoothstep'`. */
  readonly curve?: HeatmapCurve;

  /**
   * Response curve for DISPLACEMENT only. Decoupled from `curve` so the
   * 3D shape can read smoothly (bell-like) even when colour uses a sharp
   * curve (cubic) for crisp hotspots. Defaults to whatever `curve` is set
   * to. For pro-grade 3D peaks set this to `'smoothstep'` or `'sqrt'` to
   * avoid plateaus where many density values saturate to 1.
   */
  readonly displacementCurve?: HeatmapCurve;

  /**
   * Override the displacement mesh subdivision (longitudinal × latitudinal
   * segments). Higher = smoother peaks at zoom-in, costs vertex shader
   * work. Auto-promoted from 256×128 → 1024×512 when `maxHeight > 0`
   * unless explicitly set here. For hero 3D shots try 2048×1024.
   */
  readonly meshResolution?: { readonly width: number; readonly height: number };

  /**
   * Light source direction in world space (normalised, doesn't have to
   * sum to 1). Drives the analytical Lambert shading on the displaced
   * surface. Default `[1, 0.6, 0.7]`. Only matters when `maxHeight > 0`.
   */
  readonly lightDirection?: readonly [number, number, number];

  /**
   * Strength of Lambert shading on the displaced surface. 0 = unlit
   * (flat colour), 1 = full directional shading. Default 0.6 — keeps
   * colour vivid while giving peaks visible volume.
   */
  readonly shading?: number;

  /**
   * Palette texture resolution — controls colour banding. Default 256.
   * Bump to 512 for very smooth gradients; drop to 16/32 for stepped/topo.
   */
  readonly paletteSteps?: number;

  /**
   * Procedural lat/lng grid drawn inside the heatmap shader. Useful for
   * high-density 3D views where the colour field needs surface texture and
   * perspective cues. `false` disables it explicitly.
   */
  readonly grid?: boolean | HeatmapGridConfig;

  /**
   * Topographic contour lines drawn from the shaped density field. `false`
   * disables them explicitly.
   */
  readonly contours?: boolean | HeatmapContourConfig;

  /**
   * Fade width near the visible limb, expressed as radial facing dot range
   * [0..1]. Values around 0.12–0.20 hide exaggerated horizon silhouettes
   * while preserving the centre of the globe. Default 0.
   */
  readonly rimFade?: number;

  /**
   * View-dependent relief scaling. This does not rebake density; it only
   * adjusts shader uniforms each frame. `false` disables it explicitly.
   */
  readonly zoomScaling?: false | HeatmapZoomScalingConfig;

  /**
   * Rasterize matching `HeatmapDataEntry.id` / `.name` samples inside
   * country polygons as bounded domes. If the active globe kind cannot
   * provide country geometry, or an entry cannot be matched, the layer falls
   * back to the normal radial kernel for that entry.
   */
  readonly countryDomes?: boolean | HeatmapCountryDomeConfig;

  readonly events?: DataLayerEvents<HeatmapDataEntry>;
}

export interface HeatmapDataEntry {
  readonly position: LatLng;
  readonly value: number;
  /** Optional country id used by country-aware heatmap modes. */
  readonly id?: string;
  /** Optional country name used by country-aware heatmap modes. */
  readonly name?: string;
  /** Per-sample influence radius (rad) override. Falls back to layer radius. */
  readonly radius?: number;
  /** Per-sample weight multiplier. Default 1. */
  readonly weight?: number;
}

export type DataLayer =
  | ChoroplethDataLayer
  | BarsDataLayer
  | ExtrudedDataLayer
  | HeatmapDataLayer;

/**
 * Returned by a kind's data-layer decoration. The decoration owns the
 * underlying Three.js objects; calling `dispose()` tears them down.
 * Most decorations are static (no per-frame work) but `update` is exposed
 * for those that animate (mount-rise, particle flows in heatmap, …).
 */
export interface DataLayerHandle {
  readonly type: DataLayerType;
  /** Replace the layer's data (typically with smooth transition). */
  setData?(layer: DataLayer): void;
  update?(delta: number, elapsedSeconds: number): void;
  dispose(): void;
}
