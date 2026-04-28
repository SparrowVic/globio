import { interpolatePalette, type ScaleConfig } from './scales';

export type LegendPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface LegendStyle {
  readonly background: string;
  readonly textColor: string;
  readonly titleColor: string;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly padding: string;
  readonly borderRadius: string;
}

export interface LegendOptions {
  readonly title?: string;
  /**
   * Format raw domain values into tick labels. Default `String(v)`. Useful
   * for unit suffixes (`v => v + ' M'`) or rounding.
   */
  readonly format?: (value: number) => string;
  /** Number of ticks for sequential / diverging scales. Default 5. */
  readonly tickCount?: number;
  /** Width of the gradient bar in pixels. Default 200. */
  readonly width?: number;
  /** Where to anchor the legend inside the host. Default 'bottom-left'. */
  readonly position?: LegendPosition;
  /**
   * Style overrides — usually fed from the resolved theme so the legend
   * matches the rest of the HUD. Falls back to a dark-tooltip-ish default.
   */
  readonly style?: Partial<LegendStyle>;
}

export interface LegendInstance {
  readonly element: HTMLElement;
  /** Re-render the legend with a new scale and/or options. */
  update(scale: ScaleConfig, options?: LegendOptions): void;
  /** Remove from DOM and detach. */
  dispose(): void;
}

const DEFAULT_STYLE: LegendStyle = {
  background: 'rgba(10, 14, 30, 0.85)',
  textColor: '#cfd8e3',
  titleColor: '#ffffff',
  fontSize: 11,
  fontFamily: 'system-ui, sans-serif',
  padding: '8px 10px',
  borderRadius: '6px',
};

/**
 * Generate evenly-spaced tick values for a [min, max] domain, inclusive of
 * both endpoints. Used by sequential and diverging scales. Exposed for tests.
 */
export const computeLegendTicks = (
  domain: readonly [number, number],
  count: number
): ReadonlyArray<number> => {
  const safeCount = Math.max(2, Math.floor(count));
  const [min, max] = domain;
  if (max === min) return [min];
  const ticks: Array<number> = [];
  for (let i = 0; i < safeCount; i++) {
    ticks.push(min + ((max - min) * i) / (safeCount - 1));
  }
  return ticks;
};

const positionStyles = (pos: LegendPosition): Partial<CSSStyleDeclaration> => {
  switch (pos) {
    case 'top-left':
      return { top: '12px', left: '12px' };
    case 'top-right':
      return { top: '12px', right: '12px' };
    case 'bottom-right':
      return { bottom: '12px', right: '12px' };
    default:
      return { bottom: '12px', left: '12px' };
  }
};

const buildGradientCss = (
  scale: ScaleConfig,
  steps: number
): string => {
  // Walk t from 0..1 sampling the palette; 16 stops is enough that linear-RGB
  // interpolation by the browser between them looks identical to the actual
  // palette curve.
  const palette =
    scale.type === 'sequential'
      ? scale.palette
      : scale.type === 'diverging'
        ? (scale.palette ?? 'RdBu')
        : 'blues';
  const stops: Array<string> = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    stops.push(`${interpolatePalette(palette, t)} ${(t * 100).toFixed(1)}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
};

const renderGradientLegend = (
  scale: ScaleConfig,
  options: Required<Pick<LegendOptions, 'tickCount' | 'width'>> & LegendOptions,
  style: LegendStyle
): HTMLElement => {
  const wrap = document.createElement('div');

  if (options.title) {
    const title = document.createElement('div');
    title.textContent = options.title;
    Object.assign(title.style, {
      color: style.titleColor,
      fontWeight: '600',
      marginBottom: '6px',
    });
    wrap.appendChild(title);
  }

  const bar = document.createElement('div');
  Object.assign(bar.style, {
    width: `${options.width}px`,
    height: '10px',
    borderRadius: '2px',
    background: buildGradientCss(scale, 16),
  } satisfies Partial<CSSStyleDeclaration>);
  wrap.appendChild(bar);

  // Tick row beneath the bar.
  const domain: readonly [number, number] =
    scale.type === 'sequential'
      ? (scale.domain ?? [0, 1])
      : scale.type === 'diverging'
        ? [
            (scale.domain ?? [0, 0.5, 1])[0],
            (scale.domain ?? [0, 0.5, 1])[2],
          ]
        : [0, 1];
  const ticks = computeLegendTicks(domain, options.tickCount);
  const fmt = options.format ?? ((v: number) => String(v));

  const row = document.createElement('div');
  Object.assign(row.style, {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
    color: style.textColor,
  });
  for (const t of ticks) {
    const span = document.createElement('span');
    span.textContent = fmt(t);
    row.appendChild(span);
  }
  wrap.appendChild(row);
  return wrap;
};

const renderThresholdLegend = (
  scale: Extract<ScaleConfig, { type: 'threshold' }>,
  options: Required<Pick<LegendOptions, 'width'>> & LegendOptions,
  style: LegendStyle
): HTMLElement => {
  const wrap = document.createElement('div');

  if (options.title) {
    const title = document.createElement('div');
    title.textContent = options.title;
    Object.assign(title.style, {
      color: style.titleColor,
      fontWeight: '600',
      marginBottom: '6px',
    });
    wrap.appendChild(title);
  }

  // One row per bucket: swatch + label "< t0", "t0 – t1", ..., "≥ tN".
  const fmt = options.format ?? ((v: number) => String(v));
  const labelFor = (i: number): string => {
    if (i === 0) return `< ${fmt(scale.thresholds[0]!)}`;
    if (i === scale.colors.length - 1) {
      return `≥ ${fmt(scale.thresholds[scale.thresholds.length - 1]!)}`;
    }
    return `${fmt(scale.thresholds[i - 1]!)} – ${fmt(scale.thresholds[i]!)}`;
  };

  for (let i = 0; i < scale.colors.length; i++) {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: i === 0 ? '0' : '2px',
      color: style.textColor,
    });
    const swatch = document.createElement('span');
    Object.assign(swatch.style, {
      display: 'inline-block',
      width: '14px',
      height: '14px',
      background: scale.colors[i]!,
      borderRadius: '2px',
      flexShrink: '0',
    } satisfies Partial<CSSStyleDeclaration>);
    const label = document.createElement('span');
    label.textContent = labelFor(i);
    row.appendChild(swatch);
    row.appendChild(label);
    wrap.appendChild(row);
  }
  return wrap;
};

const renderCategoricalLegend = (
  scale: Extract<ScaleConfig, { type: 'categorical' }>,
  options: LegendOptions,
  style: LegendStyle
): HTMLElement => {
  const wrap = document.createElement('div');

  if (options.title) {
    const title = document.createElement('div');
    title.textContent = options.title;
    Object.assign(title.style, {
      color: style.titleColor,
      fontWeight: '600',
      marginBottom: '6px',
    });
    wrap.appendChild(title);
  }

  for (const key of Object.keys(scale.colors)) {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginTop: '2px',
      color: style.textColor,
    });
    const swatch = document.createElement('span');
    Object.assign(swatch.style, {
      display: 'inline-block',
      width: '14px',
      height: '14px',
      background: scale.colors[key]!,
      borderRadius: '2px',
      flexShrink: '0',
    } satisfies Partial<CSSStyleDeclaration>);
    const label = document.createElement('span');
    label.textContent = key;
    row.appendChild(swatch);
    row.appendChild(label);
    wrap.appendChild(row);
  }
  return wrap;
};

export interface CreateLegendOptions extends LegendOptions {
  readonly container: HTMLElement;
  readonly scale: ScaleConfig;
}

/**
 * Create a legend element for a given scale and append it to the container.
 * Returns a handle with `update(scale, options?)` so callers can swap the
 * scale (e.g., when toggling between dataset views) without rebuilding the
 * whole HUD, and `dispose()` to remove the legend cleanly.
 */
export const createLegend = (opts: CreateLegendOptions): LegendInstance => {
  const root = document.createElement('div');
  root.setAttribute('data-globio-legend', '');
  Object.assign(root.style, {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: '9',
  } satisfies Partial<CSSStyleDeclaration>);
  opts.container.appendChild(root);

  let currentScale: ScaleConfig = opts.scale;
  let currentOptions: LegendOptions = opts;

  const render = (): void => {
    const style: LegendStyle = { ...DEFAULT_STYLE, ...currentOptions.style };
    Object.assign(root.style, {
      background: style.background,
      color: style.textColor,
      fontFamily: style.fontFamily,
      fontSize: `${style.fontSize}px`,
      padding: style.padding,
      borderRadius: style.borderRadius,
      lineHeight: '1.2',
      ...positionStyles(currentOptions.position ?? 'bottom-left'),
    });

    const tickCount = currentOptions.tickCount ?? 5;
    const width = currentOptions.width ?? 200;

    let body: HTMLElement;
    if (currentScale.type === 'sequential' || currentScale.type === 'diverging') {
      body = renderGradientLegend(
        currentScale,
        { ...currentOptions, tickCount, width },
        style
      );
    } else if (currentScale.type === 'threshold') {
      body = renderThresholdLegend(currentScale, { ...currentOptions, width }, style);
    } else {
      body = renderCategoricalLegend(currentScale, currentOptions, style);
    }
    root.replaceChildren(body);
  };

  render();

  return {
    element: root,
    update(scale, options) {
      currentScale = scale;
      if (options) currentOptions = { ...currentOptions, ...options };
      render();
    },
    dispose() {
      root.remove();
    },
  };
};
