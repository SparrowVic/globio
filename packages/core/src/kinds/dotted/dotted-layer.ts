import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Group,
  Points,
  PointsMaterial,
  type Texture,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryFeature, CountryPolygon } from '../../renderer/country-feature';

export interface CountriesDottedLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly size: number;
  readonly density: number;
  readonly opacity: number;
}

/**
 * Ray-casting point-in-polygon for a closed ring in lng/lat. The ring may or
 * may not be explicitly closed (last point == first); both work because we
 * iterate edge pairs `(prev, curr)` modulo length.
 */
export const pointInRing = (
  ring: ReadonlyArray<readonly [number, number]>,
  point: readonly [number, number]
): boolean => {
  const [x, y] = point;
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const [xi, yi] = a;
    const [xj, yj] = b;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const ringBBox = (
  ring: ReadonlyArray<readonly [number, number]>
): { minLng: number; maxLng: number; minLat: number; maxLat: number } => {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of ring) {
    if (p[0] < minLng) minLng = p[0];
    if (p[0] > maxLng) maxLng = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  return { minLng, maxLng, minLat, maxLat };
};

/**
 * Sample a regular lat/lng grid across the polygon's interior. Returns
 * [lng, lat] pairs that lie inside the outer ring and outside every hole.
 *
 * Antimeridian-crossing rings (Russia, Fiji) are handled by shifting any
 * negative longitudes by +360 so the iteration stays continuous; samples are
 * wrapped back into [-180, 180] before being returned to the caller.
 */
export const samplePolygonInterior = (
  polygon: CountryPolygon,
  density: number
): Array<readonly [number, number]> => {
  if (polygon.length === 0 || density <= 0) return [];
  const outer = polygon[0];
  if (!outer || outer.length < 3) return [];

  const raw = ringBBox(outer);
  const crossesAnti = raw.maxLng - raw.minLng > 180;

  const shift = (
    ring: ReadonlyArray<readonly [number, number]>
  ): ReadonlyArray<readonly [number, number]> =>
    crossesAnti ? ring.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]] as const) : ring;

  const outerS = shift(outer);
  const holesS = polygon.slice(1).map(shift);
  const bbox = ringBBox(outerS);

  const points: Array<readonly [number, number]> = [];
  for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += density) {
    for (let lng = bbox.minLng; lng <= bbox.maxLng; lng += density) {
      if (!pointInRing(outerS, [lng, lat])) continue;
      let inHole = false;
      for (const hole of holesS) {
        if (pointInRing(hole, [lng, lat])) {
          inHole = true;
          break;
        }
      }
      if (inHole) continue;
      const projLng = lng > 180 ? lng - 360 : lng;
      points.push([projLng, lat] as const);
    }
  }
  return points;
};

const createGlowTexture = (): CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
};

/**
 * Renders each country as a Points cloud sampled on a regular lat/lng grid
 * inside its polygon. One Points object per feature, one merged geometry per
 * feature; ~250 draw calls total — fine for v1.
 */
export class CountriesDottedLayer {
  public readonly group: Group;
  private readonly material: PointsMaterial;
  private readonly geometries: Array<BufferGeometry> = [];
  private readonly texture: Texture | null;

  public constructor(options: CountriesDottedLayerOptions) {
    this.group = new Group();
    this.group.name = 'CountriesDottedLayer';
    this.texture = createGlowTexture();

    this.material = new PointsMaterial({
      color: options.color,
      size: options.size,
      sizeAttenuation: true,
      transparent: true,
      opacity: options.opacity,
      depthWrite: false,
      alphaTest: 0.1,
      blending: AdditiveBlending,
      ...(this.texture !== null && { map: this.texture }),
    });

    this.buildPoints(options.features, options.density);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.material.dispose();
    this.texture?.dispose();
    this.group.clear();
  }

  private buildPoints(
    features: ReadonlyArray<CountryFeature>,
    density: number
  ): void {
    const radius = GLOBE_RADIUS * 1.001;

    for (const feature of features) {
      const positions: Array<number> = [];
      for (const polygon of feature.polygons) {
        const samples = samplePolygonInterior(polygon, density);
        for (const [lng, lat] of samples) {
          const v = latLngToVector3([lat, lng], radius);
          positions.push(v.x, v.y, v.z);
        }
      }
      if (positions.length === 0) continue;

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      this.geometries.push(geometry);

      const points = new Points(geometry, this.material);
      points.userData['countryId'] = feature.id;
      this.group.add(points);
    }
  }
}
