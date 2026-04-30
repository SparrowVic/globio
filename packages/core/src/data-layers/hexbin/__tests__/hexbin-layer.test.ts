import { describe, expect, it } from 'vitest';
import { BufferAttribute, type Object3D } from 'three';
import type { HexBinDataLayer, HexBinHoverPayload } from '../../types';
import { HexBinLayer } from '../hexbin-layer';

const baseLayer = (overrides: Partial<HexBinDataLayer> = {}): HexBinDataLayer => ({
  type: 'hexbin',
  data: [{ position: [0, 0], value: 1 }],
  animation: false,
  ...overrides,
});

const collectAttributeValues = (root: Object3D): number[] => {
  const values: number[] = [];
  root.traverse((obj) => {
    const geometry = (obj as { geometry?: { attributes?: Record<string, BufferAttribute> } })
      .geometry;
    if (!geometry) return;
    for (const attr of Object.values(geometry.attributes ?? {})) {
      values.push(...Array.from(attr.array as ArrayLike<number>));
    }
  });
  return values;
};

describe('HexBinLayer', () => {
  it('sanitises non-finite numeric options before they reach geometry buffers', () => {
    const layer = new HexBinLayer({
      layer: baseLayer({
        resolution: Number.NaN,
        cellInset: Number.NaN,
        opacity: Number.NaN,
        height: { min: Number.NaN, max: Number.NaN },
        cellBorder: { enabled: true, opacity: Number.NaN },
        highlight: { enabled: true, opacity: Number.NaN, liftOffset: Number.NaN },
      } as Partial<HexBinDataLayer>),
    });

    const values = collectAttributeValues(layer.group);
    expect(values.length).toBeGreaterThan(0);
    expect(values.every(Number.isFinite)).toBe(true);
    layer.dispose();
  });

  it('ignores invalid programmatic highlights and clears hover on data replacement', () => {
    const events: Array<HexBinHoverPayload | null> = [];
    const eventsLayer = baseLayer({
      showEmpty: true,
      highlight: true,
      events: {
        onHover: (payload) => events.push(payload),
      },
    });
    const layer = new HexBinLayer({ layer: eventsLayer });

    expect(() => layer.setHighlight(999_999)).not.toThrow();
    expect(events).toHaveLength(0);

    layer.setHighlight(0);
    expect(events[0]?.cellIndex).toBe(0);

    layer.setData(eventsLayer);
    expect(events.at(-1)).toBeNull();
    layer.dispose();
  });
});
