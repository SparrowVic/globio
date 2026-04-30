import type { HeatmapDataLayer } from '../types';

/**
 * Bake-key — hashes every layer field that affects the density texture
 * contents. If two consecutive `setData` calls produce the same key, the
 * (expensive) paint loop is skipped and the existing texture is reused.
 * Slider drags on intensity / threshold / curve / palette / displacement
 * stay buttery: only shader uniforms are touched.
 *
 * `data` is compared by reference identity via a `WeakMap`-backed id —
 * heavy datasets (USGS-30k) are usually the same array between slider
 * ticks, so reference equality is the right unit.
 */
const sampleArrayIds = new WeakMap<ReadonlyArray<HeatmapDataLayer['data'][number]>, number>();
let nextSampleArrayId = 1;

const getSampleArrayId = (
  samples: ReadonlyArray<HeatmapDataLayer['data'][number]>
): number => {
  const existing = sampleArrayIds.get(samples);
  if (existing !== undefined) return existing;
  const id = nextSampleArrayId++;
  sampleArrayIds.set(samples, id);
  return id;
};

const stringifyPalette = (p: unknown): string =>
  Array.isArray(p) ? p.join(',') : String(p ?? '');

const asLatLngTag = (p: readonly [number, number]): string =>
  `${p[0].toFixed(3)},${p[1].toFixed(3)}`;

const countryDomeKey = (input: HeatmapDataLayer['countryDomes']): string => {
  if (!input) return 'off';
  if (input === true) return 'on';
  return [
    input.enabled === false ? 'off' : 'on',
    input.centerArea ?? '',
    input.shoulderHeight ?? '',
    input.edgeSteepness ?? '',
    input.valuePreScale ?? '',
    input.rounding ?? '',
    input.perCountryNormalize === false ? 'mag' : 'norm',
  ].join(',');
};

export const computeBakeKey = (layer: HeatmapDataLayer): string => {
  const samplesId =
    `id=${getSampleArrayId(layer.data)}|len=${layer.data.length}` +
    (layer.data.length > 0
      ? `|first=${asLatLngTag(layer.data[0]!.position)}|last=${asLatLngTag(
          layer.data[layer.data.length - 1]!.position
        )}|sum0=${layer.data[0]!.value}`
      : '');
  return [
    samplesId,
    `r=${layer.radius ?? ''}`,
    `k=${layer.kernel ?? ''}`,
    `cd=${countryDomeKey(layer.countryDomes)}`,
    `b=${layer.blurPasses ?? ''}`,
    `n=${layer.normalize ?? ''}`,
    `m=${layer.absoluteMax ?? ''}`,
    `tw=${layer.textureResolution?.width ?? ''}`,
    `th=${layer.textureResolution?.height ?? ''}`,
  ].join('|');
};

export const computePaletteKey = (layer: HeatmapDataLayer): string => {
  const s = layer.scale;
  if (!s) return 'none';
  if (s.type === 'sequential' || s.type === 'diverging') {
    return `${s.type}|${stringifyPalette(s.palette)}`;
  }
  if (s.type === 'threshold') {
    return `threshold|${s.thresholds.join(',')}|${s.colors.join(',')}`;
  }
  return `categorical|${Object.keys(s.colors).join(',')}|${Object.values(s.colors).join(',')}`;
};
