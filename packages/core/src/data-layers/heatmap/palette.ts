import { Color } from 'three';
import { colorForValue, type ScaleConfig } from '../../data/scales';
import type { HeatmapDataLayer } from '../types';

/**
 * Resolve a heatmap scale to a colour at normalised position `t ∈ [0, 1]`.
 * Sequential / diverging scales evaluate naturally; threshold and
 * categorical scales fall back by treating `t` as their value directly
 * (palette spans the domain) — fine enough for the heatmap palette band.
 */
const sampleScaleAtT = (scale: ScaleConfig, t: number): string | null => {
  if (scale.type === 'sequential' || scale.type === 'diverging') {
    return colorForValue(scale, t, [0, 1]);
  }
  if (scale.type === 'threshold') {
    let bucket = 0;
    for (const th of scale.thresholds) {
      if (t < th) break;
      bucket++;
    }
    return scale.colors[bucket] ?? scale.colors[scale.colors.length - 1] ?? null;
  }
  // categorical
  const keys = Object.keys(scale.colors);
  if (keys.length === 0) return null;
  const idx = Math.min(keys.length - 1, Math.floor(t * keys.length));
  return scale.colors[keys[idx]!] ?? null;
};

/**
 * Fill the palette texture's `data` (RGBA float strip, `steps` entries) by
 * sampling the layer's `scale` at a regular grid of `t ∈ [0, 1]`. Alpha
 * is set to 1 — the shader multiplies in opacity / curve / threshold.
 */
export const writePalette = (
  data: Float32Array,
  steps: number,
  layer: HeatmapDataLayer,
  fallback: string
): void => {
  const fallbackColor = new Color(fallback);
  const tmp = new Color();
  for (let i = 0; i < steps; i++) {
    const t = i / Math.max(1, steps - 1);
    let resolved: Color;
    if (layer.scale) {
      const sample = sampleScaleAtT(layer.scale, t);
      if (sample) {
        tmp.set(sample);
        resolved = tmp;
      } else {
        resolved = fallbackColor;
      }
    } else {
      resolved = fallbackColor;
    }
    data[i * 4 + 0] = resolved.r;
    data[i * 4 + 1] = resolved.g;
    data[i * 4 + 2] = resolved.b;
    data[i * 4 + 3] = 1;
  }
};
