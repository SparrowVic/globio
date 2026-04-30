import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  HeatmapAnimationConfig,
  HeatmapAnimationOrder,
  HeatmapAnimationStyle,
  HeatmapEasingName,
  HexBinAggregateMode,
  HexBinAnimationConfig,
  HexBinDataLayer,
  HexBinHoverPayload,
  GlobeInstance,
} from '../../../index';

describe('hexbin public API types', () => {
  it('exports named HexBin aggregate and animation types', () => {
    expectTypeOf<HexBinAggregateMode>().toEqualTypeOf<
      'sum' | 'count' | 'mean' | 'min' | 'max' | 'median' | 'p90'
    >();
    expectTypeOf<HexBinAnimationConfig>().toEqualTypeOf<HeatmapAnimationConfig>();
    expectTypeOf<HexBinDataLayer['aggregate']>().toEqualTypeOf<
      HexBinAggregateMode | undefined
    >();
    expectTypeOf<HexBinDataLayer['animation']>().toEqualTypeOf<
      boolean | HexBinAnimationConfig | undefined
    >();
  });

  it('keeps shared animation helper types available from the package root', () => {
    const style: HeatmapAnimationStyle = 'pulse';
    const order: HeatmapAnimationOrder = 'radial';
    const easing: HeatmapEasingName = 'ease-out-cubic';

    expect(style).toBe('pulse');
    expect(order).toBe('radial');
    expect(easing).toBe('ease-out-cubic');
  });

  it('documents the runtime event payload including sampleCount', () => {
    const payload = {
      cellIndex: 4,
      value: 12,
      sampleCount: 3,
      empty: false,
      position: [10, 20],
    } satisfies HexBinHoverPayload;

    expectTypeOf<HexBinHoverPayload>().toMatchTypeOf<{
      readonly sampleCount: number;
    }>();
    expect(payload.sampleCount).toBe(3);
  });

  it('exposes a public data-layer animation replay hook', () => {
    expectTypeOf<GlobeInstance>().toHaveProperty('playDataLayerAnimation');
    expectTypeOf<GlobeInstance['playDataLayerAnimation']>().returns.toEqualTypeOf<boolean>();
  });
});
