import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Uint32BufferAttribute,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';
import { triangulatePolygon } from '../../utils/triangulate-ring';
import type { CountryFeature } from '../../renderer/country-feature';
import type { CountryDataMap } from '../../types';
import { colorForValue, dataExtentFor, type ScaleConfig } from '../../data/scales';

/**
 * Mode the layer renders in. Each mode picks a different way of computing
 * the per-country *base* color/opacity; on top of that base, optional
 * hover/active overrides recolor a single country in place.
 *
 *  - `'none'` — every country hidden. The default; matches the legacy
 *    "wait for setData" behaviour.
 *  - `'always'` — every country visible at `defaultColor` × `defaultOpacity`.
 *  - `'palette'` — every country picks a color from `palette` by stable
 *    feature-index modulo. No data needed; pure decorative coloring.
 *  - `'data'` — driven by `setData(map, scale?)` (legacy choropleth).
 */
export type CountryFillMode = 'none' | 'always' | 'palette' | 'data';

export interface HologramCountryFillLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly defaultColor: string;
  readonly defaultOpacity: number;
  /**
   * Layer-wide fade-in / fade-out duration in seconds. Triggered when the
   * mode flips to / from `'none'`, or when the data map flips between null
   * and non-null. 0 disables the tween. Default 0.25s. Per-country color
   * changes within an already-visible layer snap (no inter-color tween).
   */
  readonly fadeDuration?: number;
  /** Initial mode. Default `'none'` — preserves the legacy "hidden until setData" behaviour. */
  readonly mode?: CountryFillMode;
  /**
   * Palette used when `mode === 'palette'`. Each country picks
   * `palette[featureIndex % palette.length]`; the order is the order in
   * the input `features` array, so apps that want stable assignment can
   * sort accordingly. Empty palette + palette mode = falls back to
   * `defaultColor` for every country.
   */
  readonly palette?: ReadonlyArray<string>;
  /**
   * Optional override applied to the hovered country's fill on top of
   * whatever the mode produced. `undefined` = no hover override (the
   * country renders with its base color). Set/clear via `setHoverState`.
   */
  readonly hoverColor?: string;
  readonly hoverOpacity?: number;
  /** Same as `hoverColor`/`hoverOpacity`, but for the pinned/active country. */
  readonly activeColor?: string;
  readonly activeOpacity?: number;
}

interface FillEntry {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly geometry: BufferGeometry;
  /** Stable feature index — drives palette assignment. */
  readonly index: number;
}

/**
 * Per-country filled meshes that color individual countries. Each
 * country owns its own MeshBasicMaterial — cheap to update per-id.
 * Sits between the visible-borders layer and the picking layer
 * (radius-wise), so borders draw on top of fill and picking still
 * works on click.
 *
 * Modes (`mode` option / `setMode()`):
 *  - `'none'` hides the whole layer (legacy default).
 *  - `'always'` paints every country with `defaultColor`.
 *  - `'palette'` cycles a palette across countries by feature order.
 *  - `'data'` is the original choropleth path: `setData(map, scale?)`
 *    drives per-country color from a data map.
 *
 * State overrides (`setHoverState` / `setActiveState`): on top of
 * whatever the mode produced, a single hovered country and a single
 * pinned country can recolor in place. Active wins over hover when
 * both fall on the same country (matches stroke-layer semantics).
 */
export class HologramCountryFillLayer {
  public readonly group: Group;
  private readonly entries = new Map<string, FillEntry>();
  // Mutable so live setters can patch the values that `applyMode` and
  // `refreshEntry` read each frame; `setDefaultColor` / `setDefaultOpacity`
  // re-run `applyMode` so the change is visible without a re-mount.
  private defaultColor: string;
  private defaultOpacity: number;
  private readonly fadeDuration: number;
  private mode: CountryFillMode;
  private palette: ReadonlyArray<string>;
  private dataMap: CountryDataMap | null = null;
  private dataScale: ScaleConfig | undefined = undefined;
  // State-driven overrides. `null` id means "nothing in this slot".
  private hoverId: string | null = null;
  private hoverColor: string | undefined;
  private hoverOpacity: number | undefined;
  private activeId: string | null = null;
  private activeColor: string | undefined;
  private activeOpacity: number | undefined;
  private targetT = 0;
  private currentT = 0;
  private targetOpacities = new Map<string, number>();

  public constructor(options: HologramCountryFillLayerOptions) {
    this.group = new Group();
    this.group.name = 'HologramCountryFillLayer';
    this.defaultColor = options.defaultColor;
    this.defaultOpacity = options.defaultOpacity;
    this.fadeDuration = options.fadeDuration ?? 0.25;
    this.mode = options.mode ?? 'none';
    this.palette = options.palette ?? [];
    this.hoverColor = options.hoverColor;
    this.hoverOpacity = options.hoverOpacity;
    this.activeColor = options.activeColor;
    this.activeOpacity = options.activeOpacity;
    this.buildMeshes(options.features);
    // Initial visibility derived from mode — legacy `'none'` keeps the
    // layer hidden until something flips it on; non-`none` reveals it
    // and applies the mode-driven colors immediately.
    if (this.mode === 'none') {
      this.group.visible = false;
    } else {
      this.group.visible = true;
      this.targetT = 1;
      this.currentT = 1;
      this.applyMode();
    }
  }

  /**
   * Apply a country-data map. Countries listed get their entry's color +
   * opacity; missing countries reset to the default. Pass null to hide the
   * whole layer. Calling with non-null data automatically reveals the layer.
   *
   * When a `scale` is provided, entries' `value` is mapped to a color via the
   * scale; explicit `color` on an entry overrides the scale. Domain defaults
   * to the data extent when not specified on the scale.
   *
   * Implicitly switches the layer into `'data'` mode (and back to `'none'`
   * when called with `null`) so call sites don't need a separate setMode.
   */
  public setData(data: CountryDataMap | null, scale?: ScaleConfig): void {
    if (!data) {
      this.dataMap = null;
      this.dataScale = undefined;
      this.mode = 'none';
      this.targetT = 0;
      return;
    }
    this.dataMap = data;
    this.dataScale = scale;
    this.mode = 'data';
    if (this.targetT === 0 && this.currentT === 0) this.currentT = 0;
    this.targetT = 1;
    this.group.visible = true;
    this.applyMode();
  }

  /**
   * Switch render mode without going through `setData`. Useful for the
   * decorative paths (`'always'`, `'palette'`) that don't need a data
   * argument; toggling to `'none'` fades the whole layer out.
   */
  public setMode(mode: CountryFillMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'none') {
      this.targetT = 0;
      return;
    }
    this.group.visible = true;
    this.targetT = 1;
    this.applyMode();
  }

  /**
   * Replace the palette used in `'palette'` mode. Snaps colours
   * (no per-country tween — would be visually busy) and re-runs the
   * mode pass so the change is immediately visible.
   */
  public setPalette(palette: ReadonlyArray<string>): void {
    this.palette = palette;
    if (this.mode === 'palette') this.applyMode();
  }

  /**
   * Replace the default fill color. Empty string is a no-op sentinel.
   * Re-runs the mode pass so `'always'` (and palette/data fallbacks)
   * pick up the new colour immediately.
   */
  public setDefaultColor(color: string): void {
    if (color === '') return;
    this.defaultColor = color;
    if (this.mode !== 'none') this.applyMode();
  }

  /**
   * Replace the default fill opacity. ≤ 0 is a no-op sentinel
   * (matches the configurator's "leave as theme" pattern). Re-runs
   * the mode pass + immediately patches every country's targetOpacity
   * so the fade tween reflects the new value on the next frame.
   */
  public setDefaultOpacity(opacity: number): void {
    if (opacity <= 0) return;
    this.defaultOpacity = opacity;
    if (this.mode !== 'none') this.applyMode();
  }

  /**
   * Mark `id` as hovered with optional override colour/opacity. `null`
   * clears the hover. Re-applies on top of the current base so the
   * effect is in-place — no need to wait for `update()`.
   */
  public setHoverState(id: string | null, color?: string, opacity?: number): void {
    const prev = this.hoverId;
    this.hoverId = id;
    this.hoverColor = color;
    this.hoverOpacity = opacity;
    // Re-render the country that *was* hovered (back to base) and the
    // newly-hovered one (with override). Cheap — just two materials.
    if (prev) this.refreshEntry(prev);
    if (id) this.refreshEntry(id);
  }

  /** Same shape as `setHoverState`, for the pinned/active slot. */
  public setActiveState(id: string | null, color?: string, opacity?: number): void {
    const prev = this.activeId;
    this.activeId = id;
    this.activeColor = color;
    this.activeOpacity = opacity;
    if (prev) this.refreshEntry(prev);
    if (id) this.refreshEntry(id);
  }

  /**
   * Update *only* the hover override colour / opacity, preserving the
   * current `hoverId`. Lets a workshop knob change colour mid-hover
   * without the layer briefly clearing the visual selection. Pass
   * `undefined` to mean "no override" (renders with base mode colour).
   */
  public setHoverOverride(color: string | undefined, opacity: number | undefined): void {
    this.hoverColor = color;
    this.hoverOpacity = opacity;
    if (this.hoverId) this.refreshEntry(this.hoverId);
  }

  /** Same shape as `setHoverOverride`, for the pinned/active slot. */
  public setActiveOverride(color: string | undefined, opacity: number | undefined): void {
    this.activeColor = color;
    this.activeOpacity = opacity;
    if (this.activeId) this.refreshEntry(this.activeId);
  }

  /** Step the fade tween. Should be called once per render frame. */
  public update(delta: number): void {
    if (this.currentT === this.targetT) {
      if (this.currentT === 0) this.group.visible = false;
      return;
    }
    if (this.fadeDuration <= 0) {
      this.currentT = this.targetT;
    } else {
      const step = delta / this.fadeDuration;
      const dir = this.targetT > this.currentT ? 1 : -1;
      this.currentT = Math.max(0, Math.min(1, this.currentT + dir * step));
    }
    this.entries.forEach((entry, id) => {
      const target = this.targetOpacities.get(id) ?? this.defaultOpacity;
      entry.material.opacity = target * this.currentT;
    });
    if (this.currentT === 0) this.group.visible = false;
  }

  public dispose(): void {
    this.entries.forEach((entry) => {
      entry.material.dispose();
      entry.geometry.dispose();
    });
    this.entries.clear();
    this.group.clear();
  }

  /**
   * Recompute per-country base color/opacity for every country based on
   * the current `mode`. Called when mode/palette/data change. State
   * overrides (hover/active) layer on top via `refreshEntry`.
   */
  private applyMode(): void {
    this.targetOpacities.clear();
    if (this.mode === 'none') return;
    if (this.mode === 'data' && this.dataMap) {
      const extent = this.dataScale ? dataExtentFor(this.dataMap) : ([0, 1] as const);
      const noData = this.dataScale?.noDataColor ?? this.defaultColor;
      const data = this.dataMap;
      const scale = this.dataScale;
      this.entries.forEach((entry, id) => {
        const datum = data[id];
        const visible = datum !== undefined;
        const explicit = datum?.color;
        const scaled = scale && datum ? colorForValue(scale, datum.value, extent) : null;
        const color = explicit ?? scaled ?? (datum ? noData : this.defaultColor);
        const opacity = datum?.opacity ?? this.defaultOpacity;
        entry.material.color.set(color);
        this.targetOpacities.set(id, opacity);
        entry.mesh.visible = visible;
      });
    } else {
      // 'always' or 'palette' — every country visible.
      const useThemed = this.mode === 'palette' && this.palette.length > 0;
      this.entries.forEach((entry, id) => {
        const color = useThemed
          ? this.palette[entry.index % this.palette.length] ?? this.defaultColor
          : this.defaultColor;
        entry.material.color.set(color);
        this.targetOpacities.set(id, this.defaultOpacity);
        entry.mesh.visible = true;
      });
    }
    // After base pass, re-apply current state overrides so hover/active
    // colors aren't clobbered by the mode change.
    if (this.hoverId) this.refreshEntry(this.hoverId);
    if (this.activeId) this.refreshEntry(this.activeId);
  }

  /**
   * Recompute one country's color/opacity from base (mode-driven) +
   * state overrides. Active wins over hover so a pinned country still
   * reads as pinned even while the cursor is on it.
   */
  private refreshEntry(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    // Base color/opacity derived from mode.
    let baseColor = this.defaultColor;
    let baseOpacity = this.defaultOpacity;
    let baseVisible = this.mode !== 'none';
    if (this.mode === 'palette' && this.palette.length > 0) {
      baseColor = this.palette[entry.index % this.palette.length] ?? this.defaultColor;
    } else if (this.mode === 'data' && this.dataMap) {
      const datum = this.dataMap[id];
      baseVisible = datum !== undefined;
      if (datum) {
        const extent = this.dataScale ? dataExtentFor(this.dataMap) : ([0, 1] as const);
        const noData = this.dataScale?.noDataColor ?? this.defaultColor;
        const explicit = datum.color;
        const scaled =
          this.dataScale ? colorForValue(this.dataScale, datum.value, extent) : null;
        baseColor = explicit ?? scaled ?? noData;
        baseOpacity = datum.opacity ?? this.defaultOpacity;
      }
    }

    // State overrides — active beats hover when both target this country.
    let color = baseColor;
    let opacity = baseOpacity;
    let visible = baseVisible;
    if (
      this.activeId === id &&
      (this.activeColor !== undefined || this.activeOpacity !== undefined)
    ) {
      color = this.activeColor ?? baseColor;
      opacity = this.activeOpacity ?? baseOpacity;
      visible = true;
    } else if (
      this.hoverId === id &&
      (this.hoverColor !== undefined || this.hoverOpacity !== undefined)
    ) {
      color = this.hoverColor ?? baseColor;
      opacity = this.hoverOpacity ?? baseOpacity;
      visible = true;
    }

    entry.material.color.set(color);
    this.targetOpacities.set(id, opacity);
    entry.mesh.visible = visible;
  }

  private buildMeshes(features: ReadonlyArray<CountryFeature>): void {
    const radius = GLOBE_RADIUS * 1.0008; // just above globe surface, below borders
    let index = 0;
    for (const feature of features) {
      // Merge every polygon of the feature into a single BufferGeometry —
      // one draw call per country, and consistent fragment blending across
      // shared sub-triangle edges (avoids hairline raster artefacts that
      // showed up between separately-uploaded meshes).
      const positions: Array<number> = [];
      const indices: Array<number> = [];
      let vertOffset = 0;
      for (const polygon of feature.polygons) {
        const tri = triangulatePolygon(polygon, radius);
        if (!tri) continue;
        for (let i = 0; i < tri.positions.length; i++) positions.push(tri.positions[i]!);
        for (let i = 0; i < tri.indices.length; i++) indices.push(tri.indices[i]! + vertOffset);
        vertOffset = positions.length / 3;
      }
      if (positions.length === 0) continue;

      const material = new MeshBasicMaterial({
        color: new Color(this.defaultColor),
        transparent: true,
        opacity: this.defaultOpacity,
        side: DoubleSide,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setIndex(new Uint32BufferAttribute(indices, 1));
      const mesh = new Mesh(geometry, material);
      mesh.userData['countryId'] = feature.id;
      mesh.visible = false;
      this.group.add(mesh);
      this.entries.set(feature.id, { mesh, material, geometry, index });
      index++;
    }
  }
}
