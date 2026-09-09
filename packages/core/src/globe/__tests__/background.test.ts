import { describe, expect, it } from 'vitest';
import {
  resolveBackgroundEdgeFade,
  resolveCanvasBackground,
  resolveExportBackground,
} from '../background';

describe('globe background resolution', () => {
  it('keeps the legacy transparent flag while giving the explicit canvas mode priority', () => {
    expect(resolveCanvasBackground({}, '#102030')).toBe('#102030');
    expect(resolveCanvasBackground({ transparent: true }, '#102030')).toBeNull();
    expect(resolveCanvasBackground({
      transparent: true,
      background: { canvas: 'theme' },
    }, '#102030')).toBe('#102030');
    expect(resolveCanvasBackground({ background: { canvas: '#ffeedd' } }, '#102030'))
      .toBe('#ffeedd');
  });

  it('resolves export-only backgrounds without changing the current mode', () => {
    expect(resolveExportBackground(undefined, '#102030')).toBeUndefined();
    expect(resolveExportBackground('current', '#102030')).toBeUndefined();
    expect(resolveExportBackground('transparent', '#102030')).toBeNull();
    expect(resolveExportBackground('theme', '#102030')).toBe('#102030');
    expect(resolveExportBackground('rebeccapurple', '#102030')).toBe('rebeccapurple');
  });

  it('clamps backdrop edge fading to its documented shader range', () => {
    expect(resolveBackgroundEdgeFade(undefined)).toBe(0);
    expect(resolveBackgroundEdgeFade(Number.NaN)).toBe(0);
    expect(resolveBackgroundEdgeFade(-1)).toBe(0);
    expect(resolveBackgroundEdgeFade(0.18)).toBe(0.18);
    expect(resolveBackgroundEdgeFade(2)).toBe(0.5);
  });
});
