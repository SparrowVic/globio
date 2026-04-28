import {
  BufferGeometry,
  Float32BufferAttribute,
  FrontSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Uint32BufferAttribute,
} from 'three';
import { GLOBE_RADIUS } from '../utils/coordinates';
import { triangulateRing } from '../utils/triangulate-ring';
import { computeBounds, type LatLngBounds } from '../utils/country-bounds';
import type { CountryFeature } from './countries-layer';
import type { CountryData } from '../types';

export interface CountriesPickingLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
}

/**
 * Invisible-but-raycastable meshes — one per outer ring per country —
 * used solely as a hit target for pointer events. Borders remain in
 * the visible CountriesLayer; this layer is purely behind-the-scenes.
 */
export class CountriesPickingLayer {
  public readonly group: Group;
  private readonly material: MeshBasicMaterial;
  private readonly geometries: Array<BufferGeometry> = [];
  private readonly countriesById = new Map<string, CountryData>();
  private readonly boundsById = new Map<string, LatLngBounds>();

  public constructor(options: CountriesPickingLayerOptions) {
    this.group = new Group();
    this.group.name = 'CountriesPickingLayer';

    // FrontSide is critical: it ensures the raycaster only intersects mesh
    // triangles whose outward normal faces the camera. Without it (DoubleSide),
    // a ray cast over a front-side ocean gap would continue through the globe
    // and pick up back-facing triangles of countries on the far side, causing
    // ghost-hover events for countries the cursor isn't actually over.
    //
    // After our CW-reversal in triangulateRing, all input rings reach earcut
    // as CCW; resulting triangles wind CCW from outside the sphere, which
    // Three.js treats as front-facing. So FrontSide picks up front-side
    // countries correctly and ignores back-side ones.
    this.material = new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
      side: FrontSide,
    });

    // Lift just slightly above visible borders (which sit at GLOBE_RADIUS * 1.001)
    // so picks land here rather than on the globe sphere.
    this.buildMeshes(options.features, GLOBE_RADIUS * 1.0015);
  }

  public getCountry(id: string): CountryData | null {
    return this.countriesById.get(id) ?? null;
  }

  public getCountryBounds(id: string): LatLngBounds | null {
    return this.boundsById.get(id) ?? null;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.material.dispose();
    this.group.clear();
    this.countriesById.clear();
    this.boundsById.clear();
  }

  private buildMeshes(features: ReadonlyArray<CountryFeature>, radius: number): void {
    for (const feature of features) {
      this.countriesById.set(feature.id, { id: feature.id, name: feature.name });
      this.boundsById.set(feature.id, computeBounds(feature.coordinates));
      for (const ring of feature.coordinates) {
        const tri = triangulateRing(ring, radius);
        if (!tri) continue;

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(tri.positions, 3));
        geometry.setIndex(new Uint32BufferAttribute(tri.indices, 1));
        this.geometries.push(geometry);

        const mesh = new Mesh(geometry, this.material);
        mesh.userData['countryId'] = feature.id;
        this.group.add(mesh);
      }
    }
  }
}
