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

/** Discriminant identifying one of the six data-layer configurations. */
export type DataLayerType =
  | 'choropleth'
  | 'bars'
  | 'extruded'
  | 'heatmap'
  | 'hexbin'
  | 'charts';

/** Optional pointer callbacks. Currently dispatched by hexbin and charts layers only. */
export interface DataLayerEvents<TEntry = unknown> {
  /** Called when the hovered entry changes; null means pointer leave. Implemented by hexbin and charts. */
  readonly onHover?: (entry: TEntry | null) => void;
  /** Called with the clicked entry. Implemented by hexbin and charts. */
  readonly onClick?: (entry: TEntry) => void;
}

/**
 * Per-country values driving choropleth (a dataset keyed by ISO id).
 * 2D fill — colours each country by its scale-mapped value.
 */
export interface ChoroplethDataLayer {
  /** Select the choropleth data-layer renderer. */
  readonly type: 'choropleth';
  /** Country fill entries keyed by ISO numeric country id. */
  readonly data: CountryDataMap;
  /** Optional value-to-color mapping; explicit entry colors take precedence. */
  readonly scale?: ScaleConfig;
  /**
   * Reserved callback configuration; choropleth does not dispatch these callbacks. Use the globe
   * country events.
   */
  readonly events?: DataLayerEvents<{
    /** Country id in the reserved event payload. */
    readonly id: string;
    /** Optional numeric value in the reserved event payload. */
    readonly value?: number;
  }>;
}

/**
 * Bars rising from the sphere surface — boxes / cylinders at lat/lng (or
 * country centroid), height ≈ value-mapped, colour from scale or per-entry.
 * Great for population-per-city, GDP-per-country, sales-per-region.
 */
export interface BarsDataLayer {
  /** Select the bars data-layer renderer. */
  readonly type: 'bars';
  /** Bar samples at explicit coordinates or resolvable country centroids. */
  readonly data: ReadonlyArray<BarsDataEntry>;
  /** Optional color mapping. Bar heights still use the data extent, independently of the scale domain. */
  readonly scale?: ScaleConfig;
  /** Min/max bar height in world units (1.0 = globe radius). Default 0.02 → 0.4. */
  readonly height?: {
    /** Height for the minimum data value, in globe-radius units. Default 0.02. */
    readonly min?: number;
    /** Height for the maximum data value, in globe-radius units. Default 0.4. */
    readonly max?: number;
  };
  /** Bar diameter in world units. Default 0.012. */
  readonly width?: number;
  /**
   * Animation on mount: 'rise' grows bars from 0 → target height over
   * `mountDurationMs` (default 700). 'none' snaps in.
   */
  readonly animateOnMount?: 'rise' | 'none';
  /** Rise-animation duration in milliseconds; 0 shows final heights immediately. Default 700. */
  readonly mountDurationMs?: number;
  /** Reserved callback configuration; the bars layer currently does not dispatch it. */
  readonly events?: DataLayerEvents<BarsDataEntry>;
}

export interface BarsDataEntry {
  /** Country id used to resolve a centroid when position is omitted. Unresolved entries are skipped. */
  readonly id?: string;
  /** Explicit latitude/longitude in degrees, taking precedence over the country id. */
  readonly position?: LatLng;
  /** Numeric value used for the bar height and optional color scale. */
  readonly value: number;
  /** Optional explicit colour overrides the scale lookup. */
  readonly color?: string;
  /** Application metadata retained with the entry; bars currently do not emit entry events. */
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * Extruded countries — each country polygon pushed outward along its
 * surface normal at a value-derived height. 3D variant of choropleth.
 * Side walls connect the surface ring to the elevated top.
 */
export interface ExtrudedDataLayer {
  /** Select the extruded data-layer renderer. */
  readonly type: 'extruded';
  /** Country entries keyed by ISO numeric country id; countries absent from the map are not extruded. */
  readonly data: CountryDataMap;
  /** Optional color mapping; height uses the data extent independently of the scale domain. */
  readonly scale?: ScaleConfig;
  /** Min/max extrusion height in world units. Default 0.005 → 0.18. */
  readonly height?: {
    /** Extrusion for the minimum data value, in globe-radius units. Default 0.005. */
    readonly min?: number;
    /** Extrusion for the maximum data value, in globe-radius units. Default 0.18. */
    readonly max?: number;
  };
  /**
   * Animation on mount: 'rise' grows from 0 → target. 'none' snaps in.
   * Default 'rise', 700ms.
   */
  readonly animateOnMount?: 'rise' | 'none';
  /** Rise-animation duration in milliseconds; 0 shows final geometry immediately. Default 700. */
  readonly mountDurationMs?: number;
  /** Reserved callback configuration; extruded layers do not dispatch it. Use globe country events. */
  readonly events?: DataLayerEvents<{
    /** Country id in the reserved event payload. */
    readonly id: string;
    /** Optional numeric value in the reserved event payload. */
    readonly value?: number;
  }>;
}

/**
 * Radial density-kernel shape. Every kernel, including Gaussian, is evaluated only inside the sample
 * influence radius.
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
 * Per-sample value pre-scaling applied **inside** the country dome bake.
 * Lets the per-country dome gradient stay readable when the dataset spans
 * many orders of magnitude (e.g. populations from 0.001M to 1410M). The
 * pre-scale is applied to `entry.value` BEFORE the dome's interior weight
 * is multiplied in, so the gradient inside one country is linear-in-shape
 * even though cross-country comparison is log-compressed.
 *
 * Use `'log'` (default) when values range over many orders of magnitude,
 * `'sqrt'` for a softer compression, `'linear'` to preserve raw ratios.
 */
export type HeatmapValuePreScale = 'linear' | 'log' | 'sqrt';

/**
 * Country-aware dome bake. When the active kind can provide country
 * polygons and entries include `id` or `name`, each matched sample is
 * rasterized inside that country's polygon instead of spilling as a radial
 * blob over neighbouring countries or oceans.
 *
 * Tuning the dome shape:
 *  - `centerArea` (≈ 0.3–0.95) — fraction of the country that holds the
 *    rounded central crown. Higher = wider plateau, lower = sharper peak.
 *  - `shoulderHeight` (0–1) — height at the crown / wall transition.
 *    1 = crown stays at peak across the entire crown band; 0 = sharp tip.
 *  - `edgeSteepness` (1–5) — exponent applied to the wall falloff.
 *    1 = linear ramp to the boundary, 4+ = sharp cliff just inside the edge.
 *  - `valuePreScale` — see {@link HeatmapValuePreScale}. Default `'log'`.
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
  /** Per-sample value pre-scale — see {@link HeatmapValuePreScale}. Default `'log'`. */
  readonly valuePreScale?: HeatmapValuePreScale;
  /**
   * 0..1 — how spherical/bubble-like the dome is vs how polygon-shaped.
   *  - 0: pure polygon shape. Contours follow the country outline closely
   *    (sharp corners visible, rays reaching toward each polygon vertex).
   *  - 1 (default): pure distance-to-edge field. Contours are smoothly
   *    rounded inside the country shape — looks like an irregular bubble.
   *  - middle: linear blend of both. 0.6 keeps the polygon character but
   *    files the corners off; 0.9 looks bubble-like with a faint hint of
   *    the country's silhouette.
   */
  readonly rounding?: number;
  /**
   * Normalize each country dome to the same peak independently of entry value. Disable to retain
   * value magnitude after pre-scaling. Default true.
   */
  readonly perCountryNormalize?: boolean;
}

/**
 * Animation envelope: rise and pop scale height and opacity, fade scales opacity only, and pulse
 * repeats. Pop uses the selected easing; choose a back or elastic easing for overshoot.
 */
export type HeatmapAnimationStyle = 'rise' | 'pop' | 'fade' | 'pulse';

/**
 * Order in which entries enter the animation when `stagger > 0`:
 *  - `'sequential'` — input array order (default; cheap, deterministic).
 *  - `'radial'`     — distance from `animation.origin` lat/lng. Cells
 *                     near the anchor bloom first; great for "spreading
 *                     wave" effects.
 *  - `'value'`      — descending by aggregated value (top values first).
 *  - `'reverse-value'` — ascending (low values first).
 *  - `'random'`     — shuffled. Looks "spontaneous" / sparkly.
 */
export type HeatmapAnimationOrder =
  | 'sequential'
  | 'radial'
  | 'value'
  | 'reverse-value'
  | 'random';

/**
 * Curve applied to the animation `t∈[0,1]` before it drives displacement
 * scaling and alpha. CSS-style names match their `transition-timing-function`
 * counterparts where applicable; the Penner names follow the de-facto
 * Robert Penner library naming.
 */
export type HeatmapEasingName =
  | 'linear'
  | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
  | 'ease-in-quad' | 'ease-out-quad' | 'ease-in-out-quad'
  | 'ease-in-cubic' | 'ease-out-cubic' | 'ease-in-out-cubic'
  | 'ease-in-quart' | 'ease-out-quart' | 'ease-in-out-quart'
  | 'ease-in-quint' | 'ease-out-quint' | 'ease-in-out-quint'
  | 'ease-in-sine' | 'ease-out-sine' | 'ease-in-out-sine'
  | 'ease-in-expo' | 'ease-out-expo' | 'ease-in-out-expo'
  | 'ease-in-circ' | 'ease-out-circ' | 'ease-in-out-circ'
  | 'ease-in-back' | 'ease-out-back' | 'ease-in-out-back'
  | 'ease-in-elastic' | 'ease-out-elastic' | 'ease-in-out-elastic'
  | 'ease-in-bounce' | 'ease-out-bounce' | 'ease-in-out-bounce';

/**
 * Shared optional animation settings for heatmap, hexbin and charts. Enable through the layer
 * animation field; per-entry overrides support delay and opting out.
 */
export interface HeatmapAnimationConfig {
  /** Enable the animation when the containing animation object is supplied. Default true. */
  readonly enabled?: boolean;
  /** Visual style — see {@link HeatmapAnimationStyle}. Default `'rise'`. */
  readonly style?: HeatmapAnimationStyle;
  /** Animation duration in milliseconds. Default 1200. */
  readonly duration?: number;
  /** Initial delay in milliseconds before the timeline starts. Default 0. */
  readonly delay?: number;
  /**
   * Per-entry stagger in milliseconds — each successive entry's effective
   * start time is shifted by `index × stagger`. Only used by per-point
   * animation; ignored when no entries are matched into the delay map.
   * Default 0.
   */
  readonly stagger?: number;
  /** Easing curve — see {@link HeatmapEasingName}. Default `'ease-out-cubic'`. */
  readonly easing?: HeatmapEasingName;
  /**
   * Init resets heatmap playback when baked data changes. Manual does not currently pause initial
   * playback; hexbin and charts ignore this field. Use playDataLayerAnimation() to replay.
   */
  readonly trigger?: 'init' | 'manual';
  /**
   * Stagger ordering for hexbin cells and charts. Heatmap always uses input order. Default
   * `'sequential'`.
   */
  readonly order?: HeatmapAnimationOrder;
  /**
   * Latitude/longitude for radial ordering. Charts default to [0, 0]; hexbin defaults to the
   * dataset's spherical centroid. Heatmap does not use ordering.
   */
  readonly origin?: LatLng;
}

/**
 * Density samples baked into an equirectangular texture and rendered on a latitude/longitude sphere.
 * Color follows a palette texture; maxHeight optionally displaces vertices for relief.
 */
export interface HeatmapDataLayer {
  /** Select the heatmap data-layer renderer. */
  readonly type: 'heatmap';
  /** Positioned density samples with optional country ids, radius, weight and animation delay. */
  readonly data: ReadonlyArray<HeatmapDataEntry>;
  /**
   * Color palette sampled over normalized density from 0 to 1. Use a matching scale domain; raw
   * sample values are not passed directly to this palette.
   */
  readonly scale?: ScaleConfig;

  /** Default sample influence radius in radians. Default 0.1. */
  readonly radius?: number;

  /**
   * Max vertex displacement (world units; 1 = globe radius) at peak
   * density. Default 0. Set to a small value such as 0.04–0.10 for a
   * professional 3D relief; large values quickly dominate the globe.
   */
  readonly maxHeight?: number;

  /**
   * Reserved legacy subdivision option; the current renderer ignores it. Use meshResolution to
   * control displacement geometry.
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
    /** Density-texture width in pixels. Default 2048. */
    readonly width: number;
    /** Density-texture height in pixels. Default 1024. */
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

  /**
   * Saturation density for absolute normalization. Omitted falls back to the current peak; supply a
   * fixed positive value for comparisons across updates.
   */
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
  readonly meshResolution?: {
    /** Longitudinal mesh segments. Defaults to 1024 with positive maxHeight, otherwise 256. */
    readonly width: number;
    /** Latitudinal mesh segments. Defaults to 512 with positive maxHeight, otherwise 128. */
    readonly height: number;
  };

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

  /**
   * Optional mount animation; omitted or false shows the final state immediately. True enables a
   * 1200 ms rise; an object customizes timing and easing.
   */
  readonly animation?: boolean | HeatmapAnimationConfig;

  /** Reserved callback configuration; continuous heatmaps currently do not dispatch sample pointer events. */
  readonly events?: DataLayerEvents<HeatmapDataEntry>;
}

export interface HeatmapDataEntry {
  /** Sample latitude and longitude in degrees, also used when no country polygon matches. */
  readonly position: LatLng;
  /** Sample density contribution before weight and optional country-dome pre-scaling. */
  readonly value: number;
  /** Optional country id used by country-aware heatmap modes. */
  readonly id?: string;
  /** Optional country name used by country-aware heatmap modes. */
  readonly name?: string;
  /** Per-sample influence radius (rad) override. Falls back to layer radius. */
  readonly radius?: number;
  /** Per-sample weight multiplier. Default 1. */
  readonly weight?: number;
  /**
   * Per-entry animation override. Only `delay` (relative shift in ms,
   * combined with the layer's `stagger`) and `enabled: false` (skip this
   * entry from the animation entirely) are honoured today; `style`,
   * `easing`, `duration` come from the layer-level config so the GPU LUT
   * stays per-layer. Pass `false` to opt this entry out of animation.
   */
  readonly animation?: boolean | HeatmapAnimationConfig;
}

/**
 * How samples within one triangular icosphere cell combine into its value: sum, count, mean,
 * minimum, maximum, median or 90th percentile.
 */
export type HexBinAggregateMode = 'sum' | 'count' | 'mean' | 'min' | 'max' | 'median' | 'p90';

/**
 * Shared layer-animation settings; radial ordering defaults to the dataset's spherical centroid when
 * origin is omitted.
 */
export type HexBinAnimationConfig = HeatmapAnimationConfig;

/**
 * Per-cell border line overlay drawn on top of the hex-bin cells. Useful
 * when `cellInset = 1` (no gap between cells) and you still want a clear
 * cell separation, or for "wireframe-look" presets where the border IS
 * the visualisation.
 */
export interface HexBinCellBorderConfig {
  /** Defaults to true when the object is supplied. */
  readonly enabled?: boolean;
  /** Line colour. Default '#ffffff'. */
  readonly color?: string;
  /** Line opacity. Default 0.35. */
  readonly opacity?: number;
}

/**
 * Pointer-driven highlight on hover. Disabled by default; enable by
 * passing `true` for the default look or an object to tune. Adds a
 * second mesh on top of the hovered cell — same triangle but lifted
 * slightly outward and tinted with `color`.
 */
export interface HexBinHighlightConfig {
  /** Show the hovered-cell overlay when the containing highlight object is supplied. Default true. */
  readonly enabled?: boolean;
  /** Highlight tint blended over the cell colour. Default '#ffffff'. */
  readonly color?: string;
  /** Extra outward lift on top of the cell's own height. Default 0.012. */
  readonly liftOffset?: number;
  /** Highlight mesh opacity. Default 0.55. */
  readonly opacity?: number;
}

/**
 * Bin-level event payload passed through `HexBinDataLayer.events`. Carries
 * the index of the hovered/clicked icosphere face plus the aggregated
 * value (NaN for empty cells) and a snapshot of the per-face state so
 * tooltip implementations don't need to reach into the layer internals.
 */
export interface HexBinHoverPayload {
  /** Stable triangular face index for the current subdivision resolution. */
  readonly cellIndex: number;
  /** Aggregated value in this cell; NaN for a cell without samples. */
  readonly value: number;
  /** Number of input samples that landed in this cell. */
  readonly sampleCount: number;
  /** Whether the cell contains no input samples. */
  readonly empty: boolean;
  /** Cell centroid lat/lng in degrees. */
  readonly position: LatLng;
}

/**
 * Point aggregation into triangular icosphere cells with optional extrusion, animation and pointer
 * interaction.
 */
export interface HexBinDataLayer {
  /** Select the hexbin data-layer renderer. */
  readonly type: 'hexbin';
  /** Positioned samples aggregated into the nearest icosphere-face centroid. */
  readonly data: ReadonlyArray<HexBinDataEntry>;
  /** Optional aggregated-value color mapping; noDataColor also styles visible empty cells. */
  readonly scale?: ScaleConfig;
  /** Icosphere subdivision level (0–5). Default 3. */
  readonly resolution?: number;
  /**
   * How multiple samples landing in the same cell combine. See {@link HexBinAggregateMode}. Default
   * 'sum'.
   */
  readonly aggregate?: HexBinAggregateMode;
  /** Min/max cell extrusion in world units (1 = globe radius). Default { min: 0, max: 0.06 }. */
  readonly height?: {
    /** Cell height at the low end of the aggregated-value extent. Default 0. */
    readonly min?: number;
    /** Cell height at the high end of the aggregated-value extent. Default 0.06. */
    readonly max?: number;
  };
  /** Render cells with no samples using `scale.noDataColor` or the layer default. Default false. */
  readonly showEmpty?: boolean;
  /** Layer opacity multiplier. Default 1. */
  readonly opacity?: number;
  /**
   * 0..1 — how much each cell keeps its original footprint after shrinking
   * toward its centroid. `1` means contiguous cells; lower values create
   * larger gaps. Default 0.94 (≈3% gap on each edge).
   */
  readonly cellInset?: number;
  /**
   * Optional border lines drawn along each cell's edges. Useful for
   * topographic-style maps where the cell boundary itself is informative,
   * or when `cellInset = 1` (no gap) and you still want grid lines.
   */
  readonly cellBorder?: boolean | HexBinCellBorderConfig;
  /** Pointer-hover highlight overlay. Default disabled. */
  readonly highlight?: boolean | HexBinHighlightConfig;
  /**
   * Optional cell animation; omitted or false shows final cells immediately. True enables the
   * default rise animation.
   */
  readonly animation?: boolean | HexBinAnimationConfig;
  /**
   * Pointer hover/click events. `entry` is a `HexBinHoverPayload`; the
   * cellIndex is stable across re-bakes for the same `resolution`.
   */
  readonly events?: DataLayerEvents<HexBinHoverPayload>;
}

export interface HexBinDataEntry {
  /** Sample latitude and longitude in degrees. */
  readonly position: LatLng;
  /** Aggregated as `value` — defaults to 1 (so `aggregate: 'count'` works). */
  readonly value?: number;
}

/**
 * Chart geometry at each anchor: grouped or stacked bars, pie, donut, radial bars, gauge, sunburst
 * or country-polygon extrusion.
 */
export type ChartType =
  | 'bars-grouped'
  | 'bars-stacked'
  | 'pie'
  | 'donut'
  | 'radial'
  | 'gauge'
  | 'sunburst'
  | 'extruded';

/**
 * One series of a multi-series chart. `key` indexes into each entry's
 * `values` map; `color` overrides the layer-level `scale` for this series
 * specifically.
 */
export interface ChartSeries {
  /** Key read from each entry's values map. */
  readonly key: string;
  /** Optional application-facing series name; it does not create a legend automatically. */
  readonly label?: string;
  /** Series color override for point charts. Extruded country charts prefer the layer scale when present. */
  readonly color?: string;
}

/**
 * Per-location chart data. `id` resolves to a country centroid via the
 * active kind's feature map; `position` overrides that and works for any
 * lat/lng anchor (cities, sensors, custom POIs).
 */
export interface ChartsDataEntry {
  /** Country id used for centroid lookup and required to resolve country geometry for extruded charts. */
  readonly id?: string;
  /** Explicit latitude/longitude anchor, taking precedence over the country centroid for point charts. */
  readonly position?: LatLng;
  /**
   * Per-series values keyed by `ChartSeries.key`. Missing keys are treated
   * as 0 (segment not drawn). Negative values are clamped to 0 — chart
   * geometry assumes non-negative semantics.
   */
  readonly values: Readonly<Record<string, number>>;
  /** Display text used by the built-in chart labels unless a custom formatter is provided. */
  readonly label?: string;
  /**
   * Per-entry animation override. Same shape as the layer-level
   * `animation` config; today only `delay` (relative shift in ms,
   * combined with the layer's `stagger × index` formula) and
   * `enabled: false` (skip this entry) are honoured. Use to highlight
   * a specific country's chart by giving it a delay of 0 while the
   * rest stagger in.
   */
  readonly animation?: boolean | HeatmapAnimationConfig;
  /** Free-form payload available in events. */
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * Pointer payload identifying the hit chart entry and series. Aggregate-only geometry uses null
 * seriesKey and seriesIndex -1.
 */
export interface ChartsHoverPayload {
  /** Original data row represented by the hit chart. */
  readonly entry: ChartsDataEntry;
  /** Index in the original `ChartsDataLayer.data` array. */
  readonly entryIndex: number;
  /** Hit series key, or null for aggregate-only geometry. */
  readonly seriesKey: string | null;
  /** Index in `ChartsDataLayer.series`; `-1` for aggregate-only segments such as sunburst core. */
  readonly seriesIndex: number;
  /** Numeric value represented by the hit segment or aggregate geometry. */
  readonly value: number;
}

/**
 * Labels overlay anchored above each chart. Renders as DOM nodes (CSS
 * positioned, projected per frame from the 3D anchor) so labels stay
 * crisp at any zoom and respect device pixel ratio without GPU text.
 */
export interface ChartsLabelsConfig {
  /** Show labels when the containing labels object is supplied. Default true. */
  readonly enabled?: boolean;
  /** Label text. Default: `entry.label ?? entry.id ?? ''`. */
  readonly format?: (entry: ChartsDataEntry) => string;
  /** Pixel size. Default 12. */
  readonly fontSize?: number;
  /** Text colour. Default '#ffd700'. */
  readonly color?: string;
  /** Background pill colour. Default 'rgba(8,12,24,0.78)'. */
  readonly backgroundColor?: string;
  /**
   * Visibility:
   *  - 'always' — every chart's label is on screen all the time (legible
   *    at low entry counts; clutters fast above ~20 charts)
   *  - 'hover'  — hidden until the chart is hovered (default; dense)
   *  - 'occlusion' — visible only when the chart's anchor is on the visible
   *    hemisphere (occluded by the globe → hidden)
   */
  readonly mode?: 'always' | 'hover' | 'occlusion';
  /** Vertical offset in pixels above the projected chart centre. Default -28. */
  readonly offsetPx?: number;
}

/**
 * Multi-series charts anchored to coordinates or country centroids. Each layer uses one chartType,
 * shared series definitions and optional animation, labels and pointer callbacks.
 */
export interface ChartsDataLayer {
  /** Select the charts data-layer renderer. */
  readonly type: 'charts';
  /** Per-location rows containing values keyed by the shared series definitions. */
  readonly data: ReadonlyArray<ChartsDataEntry>;
  /** Geometry used for every entry in the layer. */
  readonly chartType: ChartType;
  /** Ordered series definitions; keys select values and colors can override the layer scale. */
  readonly series: ReadonlyArray<ChartSeries>;
  /** Optional mapping from chart values to colors when a series has no explicit color. */
  readonly scale?: ScaleConfig;
  /** Chart footprint size in world units, where 1 is the globe radius. Default 0.05. */
  readonly size?: number;
  /**
   * Maximum column height in globe-radius units. Defaults to 0.08 for bar/radial charts and 0.12 for
   * extruded charts.
   */
  readonly height?: number;
  /** Donut-hole radius as a fraction of outer radius. Default 0.45. */
  readonly innerRadius?: number;
  /** For `chartType: 'gauge'` — the value that fills the full 180° arc. Default 100. */
  readonly gaugeMax?: number;
  /** For `chartType: 'gauge'` — colour of the empty arc behind the fill. Default 'rgba(255,255,255,0.15)'. */
  readonly gaugeBackgroundColor?: string;
  /**
   * For `chartType: 'extruded'` — compress per-entry value before the
   * scale-to-height mapping. Power-law data (GDP, CO₂, population) puts
   * 95% of countries near zero height under linear scaling, while USA /
   * China / India tower above. `'sqrt'` (default) gives visible mid-tier
   * heights without flattening the giants; `'log'` compresses harder;
   * `'linear'` preserves raw ratios.
   */
  readonly valuePreScale?: 'linear' | 'sqrt' | 'log';
  /** Gap between pie or donut segments in radians. Default 0. */
  readonly padAngle?: number;
  /** Rotation about the chart anchor normal in radians. Default 0. */
  readonly rotation?: number;
  /**
   * Billboard flat charts toward the camera. Defaults to true for pie, donut, gauge and sunburst;
   * false for bar and radial charts.
   */
  readonly faceCamera?: boolean;
  /**
   * Per-segment outline colour. When set together with non-zero
   * `borderWidth` (or `borderWidth` omitted), each bar / pie / donut
   * segment gets `LineSegments` along its edges in this colour. Skipped
   * entirely when omitted — no allocation, no draw call.
   */
  readonly borderColor?: string;
  /**
   * 0..1 outline opacity. Default 0.55. (WebGL caps line thickness at 1px
   * on most browsers; "width" is opacity-driven instead.) Set to 0 to
   * disable borders even if `borderColor` is supplied.
   */
  readonly borderWidth?: number;
  /** HTML label overlay anchored above each chart. */
  readonly labels?: boolean | ChartsLabelsConfig;
  /** Chart-material opacity multiplier. Default 1. */
  readonly opacity?: number;
  /**
   * Optional chart animation; omitted or false shows final geometry immediately. True enables the
   * default rise animation.
   */
  readonly animation?: boolean | HeatmapAnimationConfig;
  /**
   * Extra delay applied per-series within each chart, in ms. With `0`
   * (default) every segment of one chart animates together; with `>0`
   * the series reveal one after another (e.g. stacked bars grow
   * bottom-up, radial spokes sweep clockwise).
   */
  readonly segmentStagger?: number;
  /**
   * Pointer-driven highlight on hover — same idea as hex-bin's. When
   * enabled, the hit bar/segment fades up to `color` opacity (default
   * white tint) while the rest dim a touch.
   */
  readonly highlight?: boolean | {
    /** Color blended into the hovered segment. Default `#ffffff`. */
    readonly color?: string;
    /** Blend strength toward the highlight color, from 0 to 1. Default 0.55. */
    readonly opacity?: number;
    /** Multiplier used to dim non-hovered segment colors. Default 0.5. */
    readonly dimRest?: number;
  };
  /** Chart hover and click callbacks carrying the data row and hit series. */
  readonly events?: DataLayerEvents<ChartsHoverPayload>;
}

/** Configuration for the single active data-visualization slot, passed to setDataLayer(). */
export type DataLayer =
  | ChoroplethDataLayer
  | BarsDataLayer
  | ExtrudedDataLayer
  | HeatmapDataLayer
  | HexBinDataLayer
  | ChartsDataLayer;

/**
 * Returned by a kind's data-layer decoration. The decoration owns the
 * underlying Three.js objects; calling `dispose()` tears them down.
 * Most decorations are static (no per-frame work) but `update` is exposed
 * for those that animate (mount-rise, particle flows in heatmap, …).
 */
export interface DataLayerHandle {
  /** Type of the mounted data-layer decoration. */
  readonly type: DataLayerType;
  /** Replace the layer's data (typically with smooth transition). */
  setData?(layer: DataLayer): void;
  /** Restart the layer's mount animation when supported. Returns false when disabled. */
  playAnimation?(): boolean;
  /** Advance animation using frame delta and elapsed scene time in seconds. */
  update?(delta: number, elapsedSeconds: number): void;
  /** Remove the decoration's objects and release its resources. */
  dispose(): void;
}
