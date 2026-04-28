import { Group, LineBasicMaterial, LineSegments, BufferGeometry, Float32BufferAttribute } from 'three';
import { latLngToVector3, GLOBE_RADIUS } from '../utils/coordinates';

export interface CountryFeature {
  readonly id: string;
  readonly name: string;
  readonly coordinates: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
}

export interface CountriesLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly borderColor: string;
  readonly borderWidth: number;
  readonly borderOpacity: number;
}

export class CountriesLayer {
  public readonly group: Group;
  private readonly material: LineBasicMaterial;
  private readonly geometries: Array<BufferGeometry> = [];

  public constructor(options: CountriesLayerOptions) {
    this.group = new Group();
    this.material = new LineBasicMaterial({
      color: options.borderColor,
      linewidth: options.borderWidth,
      transparent: true,
      opacity: options.borderOpacity,
    });

    this.buildBorders(options.features);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.material.dispose();
    this.group.clear();
  }

  private buildBorders(features: ReadonlyArray<CountryFeature>): void {
    const surfaceRadius = GLOBE_RADIUS * 1.001;

    features.forEach((feature) => {
      feature.coordinates.forEach((ring) => {
        if (ring.length < 2) return;

        const positions: Array<number> = [];
        for (let i = 0; i < ring.length - 1; i++) {
          const a = ring[i];
          const b = ring[i + 1];
          if (!a || !b) continue;

          const v1 = latLngToVector3([a[1], a[0]], surfaceRadius);
          const v2 = latLngToVector3([b[1], b[0]], surfaceRadius);
          positions.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
        }

        if (positions.length === 0) return;

        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        this.geometries.push(geometry);

        const lines = new LineSegments(geometry, this.material);
        lines.userData['countryId'] = feature.id;
        this.group.add(lines);
      });
    });
  }
}
