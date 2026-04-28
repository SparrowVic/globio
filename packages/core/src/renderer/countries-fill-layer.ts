import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Uint32BufferAttribute,
} from 'three';
import { GLOBE_RADIUS } from '../utils/coordinates';
import { triangulatePolygon } from '../utils/triangulate-ring';
import type { CountryFeature } from './countries-layer';
import type { CountryDataMap } from '../types';
import { colorForValue, dataExtentFor, type ScaleConfig } from '../data/scales';

export interface CountriesFillLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly defaultColor: string;
  readonly defaultOpacity: number;
  /**
   * Layer-wide fade-in / fade-out duration in seconds. Triggered when the
   * data map transitions between null and non-null. 0 disables the tween.
   * Default 0.25s. Per-country color changes within an already-visible data
   * map snap (no inter-color tween — would be visually busy).
   */
  readonly fadeDuration?: number;
}

interface FillEntry {
  readonly mesh: Mesh;
  readonly material: MeshBasicMaterial;
  readonly geometry: BufferGeometry;
}

/**
 * Per-country filled meshes that color individual countries based on a data
 * map. Each country gets its own MeshBasicMaterial — cheap to update per-id.
 * Sits between the visible-borders layer and the picking layer (radius-wise),
 * so borders draw on top of fill and picking still works on click.
 */
export class CountriesFillLayer {
  public readonly group: Group;
  private readonly entries = new Map<string, FillEntry>();
  private readonly defaultColor: string;
  private readonly defaultOpacity: number;
  private readonly fadeDuration: number;
  private targetT = 0;
  private currentT = 0;
  private targetOpacities = new Map<string, number>();

  public constructor(options: CountriesFillLayerOptions) {
    this.group = new Group();
    this.group.name = 'CountriesFillLayer';
    this.defaultColor = options.defaultColor;
    this.defaultOpacity = options.defaultOpacity;
    this.fadeDuration = options.fadeDuration ?? 0.25;
    this.buildMeshes(options.features);
    this.group.visible = false; // hidden until setCountryData is called
  }

  /**
   * Apply a country-data map. Countries listed get their entry's color +
   * opacity; missing countries reset to the default. Pass null to hide the
   * whole layer. Calling with non-null data automatically reveals the layer.
   *
   * When a `scale` is provided, entries' `value` is mapped to a color via the
   * scale; explicit `color` on an entry overrides the scale. Domain defaults
   * to the data extent when not specified on the scale.
   */
  public setData(data: CountryDataMap | null, scale?: ScaleConfig): void {
    if (!data) {
      this.targetT = 0;
      return;
    }
    // First time data is set we want to fade in from invisible. If we're
    // already visible (data → data swap) snap to keep colors lively without
    // a global flash.
    if (this.targetT === 0 && this.currentT === 0) this.currentT = 0;
    this.targetT = 1;
    this.group.visible = true;
    const extent = scale ? dataExtentFor(data) : ([0, 1] as const);
    const noData = scale?.noDataColor ?? this.defaultColor;
    this.targetOpacities.clear();
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
  }

  /** Step the fade tween. Should be called once per render frame. */
  public update(delta: number): void {
    if (this.currentT === this.targetT) return;
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

  private buildMeshes(features: ReadonlyArray<CountryFeature>): void {
    const radius = GLOBE_RADIUS * 1.0008; // just above globe surface, below borders
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
      });
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      geometry.setIndex(new Uint32BufferAttribute(indices, 1));
      const mesh = new Mesh(geometry, material);
      mesh.userData['countryId'] = feature.id;
      mesh.visible = false;
      this.group.add(mesh);
      this.entries.set(feature.id, { mesh, material, geometry });
    }
  }
}
