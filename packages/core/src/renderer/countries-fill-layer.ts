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
}

interface FillEntry {
  readonly meshes: ReadonlyArray<Mesh>;
  readonly material: MeshBasicMaterial;
  readonly geometries: ReadonlyArray<BufferGeometry>;
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

  public constructor(options: CountriesFillLayerOptions) {
    this.group = new Group();
    this.group.name = 'CountriesFillLayer';
    this.defaultColor = options.defaultColor;
    this.defaultOpacity = options.defaultOpacity;
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
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const extent = scale ? dataExtentFor(data) : ([0, 1] as const);
    const noData = scale?.noDataColor ?? this.defaultColor;
    this.entries.forEach((entry, id) => {
      const datum = data[id];
      const visible = datum !== undefined;
      const explicit = datum?.color;
      const scaled = scale && datum ? colorForValue(scale, datum.value, extent) : null;
      const color = explicit ?? scaled ?? (datum ? noData : this.defaultColor);
      const opacity = datum?.opacity ?? this.defaultOpacity;
      entry.material.color.set(color);
      entry.material.opacity = opacity;
      entry.meshes.forEach((m) => (m.visible = visible));
    });
  }

  public dispose(): void {
    this.entries.forEach((entry) => {
      entry.material.dispose();
      entry.geometries.forEach((g) => g.dispose());
    });
    this.entries.clear();
    this.group.clear();
  }

  private buildMeshes(features: ReadonlyArray<CountryFeature>): void {
    const radius = GLOBE_RADIUS * 1.0008; // just above globe surface, below borders
    for (const feature of features) {
      const meshes: Mesh[] = [];
      const geometries: BufferGeometry[] = [];
      const material = new MeshBasicMaterial({
        color: new Color(this.defaultColor),
        transparent: true,
        opacity: this.defaultOpacity,
        side: DoubleSide,
        depthWrite: false,
      });
      for (const polygon of feature.polygons) {
        const tri = triangulatePolygon(polygon, radius);
        if (!tri) continue;
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(tri.positions, 3));
        geometry.setIndex(new Uint32BufferAttribute(tri.indices, 1));
        geometries.push(geometry);
        const mesh = new Mesh(geometry, material);
        mesh.userData['countryId'] = feature.id;
        mesh.visible = false;
        this.group.add(mesh);
        meshes.push(mesh);
      }
      if (meshes.length > 0) {
        this.entries.set(feature.id, { meshes, material, geometries });
      } else {
        material.dispose();
      }
    }
  }
}
