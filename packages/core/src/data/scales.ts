/** Name of a built-in sequential or diverging color palette. */

export type ScalePaletteName =
  | 'blues'
  | 'reds'
  | 'greens'
  | 'oranges'
  | 'purples'
  | 'viridis'
  | 'magma'
  | 'plasma'
  | 'inferno'
  | 'RdBu'
  | 'BrBG'
  | 'PiYG';

/**
 * Built-in palette name or ordered CSS-hex color stops, evenly spaced over the interpolation range.
 * Multi-stop custom palettes use three- or six-digit hex strings.
 */
export type ScalePalette = ScalePaletteName | ReadonlyArray<string>;

/**
 * Continuous palette mapping from a numeric minimum to maximum. Values outside the domain clamp to
 * the endpoint colors.
 */
export interface SequentialScale {
  /** Select continuous sequential mapping. */
  readonly type: 'sequential';
  /** Built-in palette name or ordered hex color stops. */
  readonly palette: ScalePalette;
  /** [min, max] of the input value range. Defaults to data extent. */
  readonly domain?: readonly [number, number];
  /**
   * Fallback for missing or NaN values in layers that support this field. Out-of-domain values clamp
   * to endpoint colors.
   */
  readonly noDataColor?: string;
}

/**
 * Continuous palette mapping with an explicit central value. Each side of the midpoint occupies half
 * of the palette.
 */
export interface DivergingScale {
  /** Select continuous mapping around a central value. */
  readonly type: 'diverging';
  /** Built-in palette or any ordered hex color stops. Default `'RdBu'`. */
  readonly palette?: ScalePalette;
  /** Minimum, midpoint and maximum. Defaults to the data minimum, arithmetic midrange and data maximum. */
  readonly domain?: readonly [number, number, number];
  /** Fallback for missing or NaN values in layers that support this field. */
  readonly noDataColor?: string;
}

/** Discrete numeric buckets defined by sorted boundaries, with a separate color for each bucket. */
export interface ThresholdScale {
  /** Select discrete threshold buckets. */
  readonly type: 'threshold';
  /** Ascending numeric boundaries; equality belongs to the higher bucket. N thresholds define N+1 buckets. */
  readonly thresholds: ReadonlyArray<number>;
  /** N+1 colors, one per bucket. */
  readonly colors: ReadonlyArray<string>;
  /** Fallback for missing or NaN values in layers that support this field. */
  readonly noDataColor?: string;
}

/** Exact lookup from a numeric category value to a color; object keys are stored as strings. */
export interface CategoricalScale {
  /** Select exact numeric-category lookup. */
  readonly type: 'categorical';
  /** Numeric category keys mapped to colors; country value fields accept numbers. */
  readonly colors: Readonly<Record<string | number, string>>;
  /** Fallback for missing values or unmatched categories in layers that support this field. */
  readonly noDataColor?: string;
}

/**
 * Color-scale configuration; the containing data layer determines value interpretation and
 * missing-data fallback.
 */
export type ScaleConfig =
  | SequentialScale
  | DivergingScale
  | ThresholdScale
  | CategoricalScale;

/**
 * Built-in palettes as RGB stops. Sequential palettes go light → dark;
 * perceptual ones (viridis/magma/plasma/inferno) are sampled from the
 * matplotlib originals at 5 stops each. Diverging palettes have a neutral
 * midpoint.
 */
const BUILT_IN_PALETTES: Record<ScalePaletteName, ReadonlyArray<string>> = {
  blues: ['#deebf7', '#9ecae1', '#3182bd', '#08519c'],
  reds: ['#fee5d9', '#fcae91', '#fb6a4a', '#cb181d', '#67000d'],
  greens: ['#edf8e9', '#bae4b3', '#74c476', '#238b45', '#00441b'],
  oranges: ['#feedde', '#fdbe85', '#fd8d3c', '#d94701', '#7f2704'],
  purples: ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#6a51a3', '#3f007d'],
  viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
  magma: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fcfdbf'],
  plasma: ['#0d0887', '#7e03a8', '#cc4778', '#f89441', '#f0f921'],
  inferno: ['#000004', '#420a68', '#932667', '#dd513a', '#fcffa4'],
  RdBu: ['#67001f', '#d6604d', '#f7f7f7', '#4393c3', '#053061'],
  BrBG: ['#543005', '#bf812d', '#f5f5f5', '#35978f', '#003c30'],
  PiYG: ['#8e0152', '#de77ae', '#f7f7f7', '#7fbc41', '#276419'],
};

const resolvePalette = (palette: ScalePalette): ReadonlyArray<string> => {
  if (typeof palette === 'string') {
    const built = BUILT_IN_PALETTES[palette as ScalePaletteName];
    if (built) return built;
    // Unknown name → degrade to a single-color array so callers still
    // produce *some* output rather than crashing.
    return [palette];
  }
  return palette;
};

const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const v = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const num = parseInt(v, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const toHex = (r: number, g: number, b: number): string => {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
};

/**
 * Sample a palette at fractional position t ∈ [0,1]. Linear RGB interpolation
 * between adjacent stops. Out-of-range t clamps to the endpoints.
 */
export const interpolatePalette = (palette: ScalePalette, t: number): string => {
  const stops = resolvePalette(palette);
  if (stops.length === 0) return '#000000';
  if (stops.length === 1) return stops[0]!;
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const i = Math.floor(scaled);
  const frac = scaled - i;
  if (i >= stops.length - 1) return stops[stops.length - 1]!;
  const a = parseHex(stops[i]!);
  const b = parseHex(stops[i + 1]!);
  return toHex(
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    a[2] + (b[2] - a[2]) * frac
  );
};

/**
 * Compute [min, max] of a numeric set. Used to default the domain when the
 * caller doesn't specify one.
 */
const dataExtent = (values: ReadonlyArray<number>): readonly [number, number] => {
  if (values.length === 0) return [0, 1];
  let min = values[0]!;
  let max = values[0]!;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return [min, max];
};

/**
 * Resolve a scale for a given value. Returns null when the value is missing
 * or outside the categorical domain — the caller can then fall back to the
 * scale's `noDataColor` (or the layer's default).
 */
export const colorForValue = (
  scale: ScaleConfig,
  value: number | undefined,
  extent: readonly [number, number]
): string | null => {
  if (value === undefined || Number.isNaN(value)) return null;

  if (scale.type === 'sequential') {
    const [min, max] = scale.domain ?? extent;
    if (max === min) return interpolatePalette(scale.palette, 0.5);
    const t = (value - min) / (max - min);
    return interpolatePalette(scale.palette, t);
  }

  if (scale.type === 'diverging') {
    const palette = scale.palette ?? 'RdBu';
    const [min, mid, max] = scale.domain ?? [extent[0], (extent[0] + extent[1]) / 2, extent[1]];
    if (value <= mid) {
      const t = mid === min ? 0 : (value - min) / (mid - min);
      // Map low half to t ∈ [0, 0.5].
      return interpolatePalette(palette, Math.max(0, Math.min(0.5, t * 0.5)));
    }
    const t = max === mid ? 1 : (value - mid) / (max - mid);
    return interpolatePalette(palette, Math.max(0.5, Math.min(1, 0.5 + t * 0.5)));
  }

  if (scale.type === 'threshold') {
    let bucket = 0;
    for (const t of scale.thresholds) {
      if (value < t) break;
      bucket++;
    }
    return scale.colors[bucket] ?? scale.colors[scale.colors.length - 1] ?? null;
  }

  // categorical
  return scale.colors[String(value)] ?? scale.colors[value] ?? null;
};

/**
 * Internal helper: collect numeric values from a country-data map so a scale
 * can default its domain to the data extent.
 */
export const collectScaleValues = (
  data: Readonly<Record<string, { readonly value?: number }>>
): ReadonlyArray<number> => {
  const values: Array<number> = [];
  for (const id in data) {
    const v = data[id]?.value;
    if (typeof v === 'number' && !Number.isNaN(v)) values.push(v);
  }
  return values;
};

export const dataExtentFor = (
  data: Readonly<Record<string, { readonly value?: number }>>
): readonly [number, number] => dataExtent(collectScaleValues(data));
