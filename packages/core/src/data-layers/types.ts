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
 * Volumetric heatmap — many lat/lng samples accumulate into a continuous
 * density field that displaces a high-resolution sphere along normals.
 * Peaks rise where many high-value samples cluster. Good for crime
 * density, cell-tower coverage, natural-disaster aggregations.
 */
export interface HeatmapDataLayer {
  readonly type: 'heatmap';
  readonly data: ReadonlyArray<HeatmapDataEntry>;
  readonly scale?: ScaleConfig;
  /** Angular radius of each sample's influence (radians). Default 0.06 (~3.4°). */
  readonly radius?: number;
  /** Max displacement in world units at peak density. Default 0.25. */
  readonly maxHeight?: number;
  /**
   * Sphere subdivision level — higher = smoother, costs vertices.
   * Default 5 (icosphere ~10k verts). 6 is silky, 4 chunkier.
   */
  readonly subdivisions?: number;
}

export interface HeatmapDataEntry {
  readonly position: LatLng;
  readonly value: number;
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
