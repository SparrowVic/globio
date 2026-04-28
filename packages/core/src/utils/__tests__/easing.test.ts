import { describe, it, expect } from 'vitest';
import { linear, easeOutCubic, easeInOutCubic } from '../easing';

describe('easing functions', () => {
  it('linear is identity at 0, 0.5, 1', () => {
    expect(linear(0)).toBe(0);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(1)).toBe(1);
  });

  it('easeOutCubic starts fast, slows down', () => {
    expect(easeOutCubic(0)).toBeCloseTo(0, 6);
    expect(easeOutCubic(1)).toBeCloseTo(1, 6);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });

  it('easeInOutCubic is symmetric around t=0.5', () => {
    expect(easeInOutCubic(0)).toBeCloseTo(0, 6);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
    expect(easeInOutCubic(1)).toBeCloseTo(1, 6);
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
  });
});
