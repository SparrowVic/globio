import { CanvasTexture, LinearFilter, RepeatWrapping } from 'three';
import type { Texture } from 'three';
import {
  pointInShiftedPolygon,
  ringBounds,
  ringBoundsForPolygon,
} from '../../data-layers/heatmap/polygon-utils';
import type { CountryFeature } from '../../renderer/country-feature';
import type { CinematicPreparedData } from './data';

export interface CinematicSurfaceAtlas {
  readonly landTexture: Texture;
  readonly densityTexture: Texture;
  dispose(): void;
}

const LAND_WIDTH = 1024;
const LAND_HEIGHT = 512;

export const buildCinematicSurfaceAtlas = (
  features: ReadonlyArray<CountryFeature>,
  prepared: CinematicPreparedData,
): CinematicSurfaceAtlas => {
  const landTexture = buildLandTexture(features);
  const densityTexture = buildDensityTexture(prepared);
  return {
    landTexture,
    densityTexture,
    dispose() {
      landTexture.dispose();
      densityTexture.dispose();
    },
  };
};

export const buildDensityTexture = (prepared: CinematicPreparedData): Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = prepared.densityWidth;
  canvas.height = prepared.densityHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[globio] unable to allocate cinematic density atlas');
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < prepared.density.length; i++) {
    const value = Math.max(0, Math.min(255, Math.round((prepared.density[i] ?? 0) * 255)));
    image.data[i * 4] = value;
    image.data[i * 4 + 1] = value;
    image.data[i * 4 + 2] = value;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return configureTexture(new CanvasTexture(canvas));
};

const buildLandTexture = (features: ReadonlyArray<CountryFeature>): Texture => {
  const canvas = document.createElement('canvas');
  canvas.width = LAND_WIDTH;
  canvas.height = LAND_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('[globio] unable to allocate cinematic land atlas');
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (const feature of features) {
    for (const polygon of feature.polygons) {
      rasterizePolygon(image, polygon);
    }
  }
  ctx.putImageData(image, 0, 0);
  return configureTexture(new CanvasTexture(canvas));
};

const configureTexture = (texture: Texture): Texture => {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
};

const rasterizePolygon = (
  image: ImageData,
  polygon: ReadonlyArray<ReadonlyArray<readonly [number, number]>>,
): void => {
  const outer = polygon[0];
  if (!outer || outer.length < 3) return;
  const rawBounds = ringBounds(outer);
  const crossesAnti = rawBounds.maxLng - rawBounds.minLng > 180;
  const shiftRing = (ring: ReadonlyArray<readonly [number, number]>) =>
    crossesAnti
      ? ring.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]] as const)
      : ring;
  const shiftedOuter = shiftRing(outer);
  const shiftedHoles = polygon.slice(1).map(shiftRing);
  const bounds = crossesAnti ? ringBounds(shiftedOuter) : ringBoundsForPolygon(outer);
  const yStart = clampPixelY(latToY(bounds.maxLat) - 1);
  const yEnd = clampPixelY(latToY(bounds.minLat) + 1);
  const xStart = crossesAnti ? 0 : clampPixelX(lngToX(bounds.minLng) - 1);
  const xEnd = crossesAnti ? LAND_WIDTH - 1 : clampPixelX(lngToX(bounds.maxLng) + 1);

  for (let y = yStart; y <= yEnd; y++) {
    const lat = yToLat(y + 0.5);
    if (lat < bounds.minLat - 0.25 || lat > bounds.maxLat + 0.25) continue;
    for (let x = xStart; x <= xEnd; x++) {
      const lng = xToLng(x + 0.5);
      const queryLng = crossesAnti && lng < 0 ? lng + 360 : lng;
      if (!pointInShiftedPolygon(shiftedOuter, shiftedHoles, [queryLng, lat])) continue;
      const index = (y * LAND_WIDTH + x) * 4;
      image.data[index] = 255;
      image.data[index + 1] = 255;
      image.data[index + 2] = 255;
      image.data[index + 3] = 255;
    }
  }
};

const lngToX = (lng: number): number => ((lng + 180) / 360) * LAND_WIDTH;

const xToLng = (x: number): number => (x / LAND_WIDTH) * 360 - 180;

const latToY = (lat: number): number => ((90 - lat) / 180) * LAND_HEIGHT;

const yToLat = (y: number): number => 90 - (y / LAND_HEIGHT) * 180;

const clampPixelX = (value: number): number =>
  Math.max(0, Math.min(LAND_WIDTH - 1, Math.floor(value)));

const clampPixelY = (value: number): number =>
  Math.max(0, Math.min(LAND_HEIGHT - 1, Math.floor(value)));
