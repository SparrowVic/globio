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
import { GLOBE_RADIUS } from '../../utils/coordinates';
import { triangulatePolygon } from '../../utils/triangulate-ring';
import type { CountryFeature } from '../../renderer/country-feature';

export interface PaperFillLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly opacity: number;
}

const FILL_RADIUS = GLOBE_RADIUS * 0.9994;

/**
 * Default-on pastel wash for every country. A single shared material so the
 * whole continent reads as one warm tint — like cream printer ink dabbed
 * over the parchment. Hover/active highlights from the shared infrastructure
 * still draw on top.
 */
export class PaperFillLayer {
  public readonly group: Group;
  private readonly geometries: Array<BufferGeometry> = [];
  private readonly material: MeshBasicMaterial;

  public constructor(options: PaperFillLayerOptions) {
    this.group = new Group();
    this.group.name = 'PaperFillLayer';
    this.material = new MeshBasicMaterial({
      color: new Color(options.color),
      transparent: true,
      opacity: options.opacity,
      side: DoubleSide,
      depthWrite: false,
    });

    options.features.forEach((feature) => {
      feature.polygons.forEach((polygon) => {
        const tri = triangulatePolygon(polygon, FILL_RADIUS);
        if (!tri) return;
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(tri.positions, 3));
        geometry.setIndex(new Uint32BufferAttribute(tri.indices, 1));
        this.geometries.push(geometry);
        const mesh = new Mesh(geometry, this.material);
        mesh.userData['countryId'] = feature.id;
        this.group.add(mesh);
      });
    });
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.material.dispose();
    this.group.clear();
  }
}
