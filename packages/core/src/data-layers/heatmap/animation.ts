import type {
  HeatmapAnimationStyle,
  HeatmapDataLayer,
  HeatmapEasingName,
} from '../types';
import { clampCpu } from './polygon-utils';

/**
 * Heatmap animation — one timeline `t∈[0,1]` per layer, with optional
 * per-entry start-delay baked into a delay map for staggered country-by-country
 * blooms. Easings are resolved CPU-side for the layer-wide path and
 * pre-baked into a 256-sample LUT for the per-pixel path so the shader
 * can apply any easing curve via a single texture read.
 */

export type HeatmapEasingFn = (t: number) => number;

export interface ResolvedHeatmapAnimationConfig {
  readonly enabled: boolean;
  readonly style: HeatmapAnimationStyle;
  /** Duration in seconds (input ms / 1000, clamped). */
  readonly duration: number;
  /** Initial delay in seconds. */
  readonly delay: number;
  /** Per-entry stagger in seconds. */
  readonly stagger: number;
  readonly easing: HeatmapEasingName;
  readonly trigger: 'init' | 'manual';
}

export const DISABLED_ANIMATION: ResolvedHeatmapAnimationConfig = {
  enabled: false,
  style: 'rise',
  duration: 1.2,
  delay: 0,
  stagger: 0,
  easing: 'ease-out-cubic',
  trigger: 'init',
};

const DEFAULT_ANIMATION: ResolvedHeatmapAnimationConfig = {
  enabled: true,
  style: 'rise',
  duration: 1.2,
  delay: 0,
  stagger: 0,
  easing: 'ease-out-cubic',
  trigger: 'init',
};

export const resolveAnimationConfig = (
  input: HeatmapDataLayer['animation']
): ResolvedHeatmapAnimationConfig => {
  if (input === undefined || input === false) return DISABLED_ANIMATION;
  if (input === true) return DEFAULT_ANIMATION;
  if (input.enabled === false) return DISABLED_ANIMATION;
  return {
    enabled: true,
    style: input.style ?? DEFAULT_ANIMATION.style,
    duration: clampCpu((input.duration ?? 1200) / 1000, 0.001, 30),
    delay: clampCpu((input.delay ?? 0) / 1000, 0, 30),
    stagger: clampCpu((input.stagger ?? 0) / 1000, 0, 5),
    easing: input.easing ?? DEFAULT_ANIMATION.easing,
    trigger: input.trigger ?? DEFAULT_ANIMATION.trigger,
  };
};

/** Hash for the bake-key — re-bake delay map when these change. */
export const animationBakeTag = (input: HeatmapDataLayer['animation']): string => {
  const r = resolveAnimationConfig(input);
  if (!r.enabled) return 'off';
  return `${r.style}|${r.duration}|${r.delay}|${r.stagger}`;
};

/**
 * Resolve a per-entry animation override. Only `delay` and `enabled: false`
 * change behaviour today — the per-layer easing/duration is the source of
 * truth so a single LUT covers the whole layer.
 */
export const entryAnimationDelaySec = (
  entryAnimation: HeatmapDataLayer['animation'] | boolean | undefined,
  layerStaggerSec: number,
  entryIndex: number
): { readonly enabled: boolean; readonly delay: number } => {
  if (entryAnimation === false) return { enabled: false, delay: 0 };
  const baseStagger = layerStaggerSec * entryIndex;
  if (entryAnimation === undefined || entryAnimation === true) {
    return { enabled: true, delay: baseStagger };
  }
  if (entryAnimation.enabled === false) return { enabled: false, delay: 0 };
  const explicit = (entryAnimation.delay ?? 0) / 1000;
  return { enabled: true, delay: baseStagger + explicit };
};

// ---------------------------------------------------------------------------
// Easing library — broad set of CSS-style + Penner curves. Every function
// receives normalised `t∈[0,1]` and must return a value in (roughly) [0,1].
// `back`, `elastic`, `bounce` overshoot/undershoot by design; the shader
// path clamps via the LUT range, the CPU path passes the value through.
// ---------------------------------------------------------------------------

const PI = Math.PI;
const HALF_PI = Math.PI / 2;
const C1 = 1.70158;
const C2 = C1 * 1.525;
const C3 = C1 + 1;
const C4 = (2 * Math.PI) / 3;
const C5 = (2 * Math.PI) / 4.5;
const N1 = 7.5625;
const D1 = 2.75;

const easeOutBounceFn: HeatmapEasingFn = (t) => {
  if (t < 1 / D1) return N1 * t * t;
  if (t < 2 / D1) {
    const u = t - 1.5 / D1;
    return N1 * u * u + 0.75;
  }
  if (t < 2.5 / D1) {
    const u = t - 2.25 / D1;
    return N1 * u * u + 0.9375;
  }
  const u = t - 2.625 / D1;
  return N1 * u * u + 0.984375;
};

/**
 * 1D cubic-bezier solver for the four CSS keyword easings. Both endpoints
 * are pinned at (0,0) and (1,1); only the two middle control points x/y
 * coordinates matter. Newton-Raphson on `x(t)` to find the parametric
 * `t` for the input progress, then evaluates `y(t)`.
 */
const cubicBezier = (x1: number, y1: number, x2: number, y2: number): HeatmapEasingFn => {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleDerivX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-6) break;
      const slope = sampleDerivX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= dx / slope;
    }
    return sampleY(t);
  };
};

const EASINGS: Record<HeatmapEasingName, HeatmapEasingFn> = {
  linear: (t) => t,
  ease: cubicBezier(0.25, 0.1, 0.25, 1),
  'ease-in': cubicBezier(0.42, 0, 1, 1),
  'ease-out': cubicBezier(0, 0, 0.58, 1),
  'ease-in-out': cubicBezier(0.42, 0, 0.58, 1),
  'ease-in-quad': (t) => t * t,
  'ease-out-quad': (t) => 1 - (1 - t) * (1 - t),
  'ease-in-out-quad': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'ease-in-cubic': (t) => t * t * t,
  'ease-out-cubic': (t) => 1 - Math.pow(1 - t, 3),
  'ease-in-out-cubic': (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'ease-in-quart': (t) => t * t * t * t,
  'ease-out-quart': (t) => 1 - Math.pow(1 - t, 4),
  'ease-in-out-quart': (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
  'ease-in-quint': (t) => t * t * t * t * t,
  'ease-out-quint': (t) => 1 - Math.pow(1 - t, 5),
  'ease-in-out-quint': (t) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  'ease-in-sine': (t) => 1 - Math.cos(t * HALF_PI),
  'ease-out-sine': (t) => Math.sin(t * HALF_PI),
  'ease-in-out-sine': (t) => -(Math.cos(PI * t) - 1) / 2,
  'ease-in-expo': (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
  'ease-out-expo': (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  'ease-in-out-expo': (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  'ease-in-circ': (t) => 1 - Math.sqrt(1 - t * t),
  'ease-out-circ': (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  'ease-in-out-circ': (t) =>
    t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  'ease-in-back': (t) => C3 * t * t * t - C1 * t * t,
  'ease-out-back': (t) => 1 + C3 * Math.pow(t - 1, 3) + C1 * Math.pow(t - 1, 2),
  'ease-in-out-back': (t) =>
    t < 0.5
      ? (Math.pow(2 * t, 2) * ((C2 + 1) * 2 * t - C2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((C2 + 1) * (t * 2 - 2) + C2) + 2) / 2,
  'ease-in-elastic': (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * C4);
  },
  'ease-out-elastic': (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * C4) + 1;
  },
  'ease-in-out-elastic': (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * C5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * C5)) / 2 + 1;
  },
  'ease-in-bounce': (t) => 1 - easeOutBounceFn(1 - t),
  'ease-out-bounce': easeOutBounceFn,
  'ease-in-out-bounce': (t) =>
    t < 0.5
      ? (1 - easeOutBounceFn(1 - 2 * t)) / 2
      : (1 + easeOutBounceFn(2 * t - 1)) / 2,
};

export const easingFunctionFor = (name: HeatmapEasingName): HeatmapEasingFn =>
  EASINGS[name] ?? EASINGS.linear;

/**
 * Build a 1×N RGBA Float32 LUT (R = eased value, G/B = 0, A = 1) for
 * shader-side easing of per-pixel `localT`. Sized 256 by default —
 * generous enough that even bouncy/elastic curves read smoothly under
 * linear filtering.
 */
export const buildEasingLut = (
  easingName: HeatmapEasingName,
  size: number = 256
): Float32Array => {
  const fn = easingFunctionFor(easingName);
  const out = new Float32Array(size * 4);
  const inv = 1 / Math.max(1, size - 1);
  for (let i = 0; i < size; i++) {
    const t = i * inv;
    out[i * 4 + 0] = fn(t);
    out[i * 4 + 1] = 0;
    out[i * 4 + 2] = 0;
    out[i * 4 + 3] = 1;
  }
  return out;
};

/** Encode {`rise`:0, `pop`:1, `fade`:2} for the shader. */
export const encodeAnimationStyle = (style: HeatmapAnimationStyle): number => {
  switch (style) {
    case 'rise':
      return 0;
    case 'pop':
      return 1;
    case 'fade':
      return 2;
  }
};
