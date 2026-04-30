import type { HeatmapKernel } from '../types';
import { applyKernelChord } from './kernels';

/**
 * Stamp a single sample's kernel into the density buffer. Iterates only
 * pixels inside the sample's lat/lng bounding box.
 *
 * Hot loop optimisations:
 *  - distance test uses cosine of the angle (dot product) instead of
 *    `Math.acos` — cuts ~70% of the per-pixel cost.
 *  - kernel weights are computed from squared chord length
 *    `c² = 2(1 - cosD)` rather than great-circle arc length, removing
 *    another `acos` from the Gaussian / quartic path. The mapping
 *    `c² ↔ ang²` is monotonic on [0, π], so the kernel curve preserves
 *    its shape — the visual difference is sub-pixel even at huge radii.
 *
 * NB: this is the **radial** painter, used by both arbitrary lat/lng
 * point-cloud heatmaps (earthquakes, cities) and the country-dome
 * fallback path for entries whose polygon couldn't be matched.
 */
export const paintSample = (
  data: Float32Array,
  width: number,
  height: number,
  lat: number,
  lng: number,
  radiusRad: number,
  value: number,
  kernel: HeatmapKernel,
  /** When supplied, every painted pixel gets `pixelDelaySec` written into
   * `delayMap` (smaller value wins when multiple samples overlap, so the
   * earliest scheduled delay always governs that pixel's animation start). */
  delayMap?: Float32Array,
  pixelDelaySec?: number
): void => {
  const cu = ((lng + 180) / 360) * width;
  const cv = ((90 - lat) / 180) * height;
  const radiusDeg = (radiusRad * 180) / Math.PI;

  const dvPx = Math.ceil((radiusDeg / 180) * height);
  const v0 = Math.max(0, Math.floor(cv - dvPx));
  const v1 = Math.min(height - 1, Math.ceil(cv + dvPx));

  const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const duDeg = radiusDeg / cosLat;
  const duPx = Math.ceil((duDeg / 360) * width);

  const sinLat = Math.sin((lat * Math.PI) / 180);
  const cosLatExact = Math.cos((lat * Math.PI) / 180);

  // Chord cutoff — c² when the angle equals radiusRad. Pixels beyond this
  // are skipped without an acos call.
  const cosR = Math.cos(radiusRad);
  const chordSqMax = 2 * (1 - cosR);
  const invChordSqMax = chordSqMax > 0 ? 1 / chordSqMax : 0;

  const degToRad = Math.PI / 180;
  const lngRad = lng * degToRad;

  for (let v = v0; v <= v1; v++) {
    const pixelLat = 90 - ((v + 0.5) / height) * 180;
    const pLatRad = pixelLat * degToRad;
    const sinPL = Math.sin(pLatRad);
    const cosPL = Math.cos(pLatRad);
    const rowOffset = v * width;
    for (let du = -duPx; du <= duPx; du++) {
      let u = Math.floor(cu + du);
      if (u < 0) u += width;
      else if (u >= width) u -= width;
      const pLngRad = ((u + 0.5) / width) * 2 * Math.PI - Math.PI;
      const cosD = sinLat * sinPL + cosLatExact * cosPL * Math.cos(pLngRad - lngRad);
      if (cosD < cosR) continue;
      const chordSq = 2 * (1 - cosD);
      const t2 = chordSq * invChordSqMax;
      const w = applyKernelChord(kernel, t2);
      if (w <= 0) continue;
      const idx = rowOffset + u;
      data[idx]! += value * w;
      if (delayMap !== undefined && pixelDelaySec !== undefined) {
        if (pixelDelaySec < delayMap[idx]!) delayMap[idx] = pixelDelaySec;
      }
    }
  }
};

/**
 * Separable 3-tap box blur applied N times. Three iterations approximate
 * a Gaussian close enough for our taste. Wraps in U (longitude) and
 * clamps in V (latitude), matching the texture's wrap modes.
 */
export const blurDensity = (
  data: Float32Array,
  width: number,
  height: number,
  passes: number
): void => {
  const tmp = new Float32Array(data.length);
  for (let pass = 0; pass < passes; pass++) {
    for (let v = 0; v < height; v++) {
      const row = v * width;
      for (let u = 0; u < width; u++) {
        const um = u === 0 ? width - 1 : u - 1;
        const up = u === width - 1 ? 0 : u + 1;
        tmp[row + u] = (data[row + um]! + data[row + u]! + data[row + up]!) / 3;
      }
    }
    for (let v = 0; v < height; v++) {
      const vm = v === 0 ? 0 : v - 1;
      const vp = v === height - 1 ? height - 1 : v + 1;
      for (let u = 0; u < width; u++) {
        data[v * width + u] =
          (tmp[vm * width + u]! + tmp[v * width + u]! + tmp[vp * width + u]!) / 3;
      }
    }
  }
};
