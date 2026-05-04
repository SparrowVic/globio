import { describe, it, expect } from 'vitest';
import { driftBrightness, easeHoverBoost } from '../effects';

describe('driftBrightness', () => {
  it('is ~0 when phase is 0 (elapsed=0, dot=0, freq=1)', () => {
    expect(driftBrightness(0, 1, 1, 0, 0.15)).toBeCloseTo(0, 6);
  });

  it('returns exactly 0 when amplitude is 0', () => {
    expect(driftBrightness(0.5, 3, 0.4, 1.7, 0)).toBe(0);
    expect(driftBrightness(-1, 100, 0.4, 50, 0)).toBe(0);
  });

  it('matches sin(phase) * amplitude with elapsed=0', () => {
    // phase = dot * freq - speed * elapsed = 0.5 * 1 - 0 * 0 = 0.5
    const expected = 0.5 * Math.sin(0.5);
    expect(driftBrightness(0.5, 1, 0, 0, 0.5)).toBeCloseTo(expected, 9);
  });

  it('drifts with elapsed time — phase advances with -speed * elapsed', () => {
    // dot=0, freq=1 → phase = -speed * elapsed
    const v = driftBrightness(0, 1, 0.4, 1.0, 0.5);
    const expected = 0.5 * Math.sin(-0.4);
    expect(v).toBeCloseTo(expected, 9);
  });

  it('is bounded by ±amplitude', () => {
    const amp = 0.15;
    for (const t of [0, 0.5, 1, 2, 5, 10]) {
      const v = driftBrightness(0.7, 3, 0.4, t, amp);
      expect(v).toBeLessThanOrEqual(amp + 1e-9);
      expect(v).toBeGreaterThanOrEqual(-amp - 1e-9);
    }
  });

  it('returns 0 on non-finite inputs', () => {
    expect(driftBrightness(Number.NaN, 1, 1, 0, 0.15)).toBe(0);
    expect(driftBrightness(0, Number.POSITIVE_INFINITY, 1, 0, 0.15)).toBe(0);
    expect(driftBrightness(0, 1, Number.NaN, 0, 0.15)).toBe(0);
    expect(driftBrightness(0, 1, 1, Number.NaN, 0.15)).toBe(0);
    expect(driftBrightness(0, 1, 1, 0, Number.NaN)).toBe(0);
  });
});

describe('easeHoverBoost', () => {
  it('returns ~target when delta == durationSeconds', () => {
    expect(easeHoverBoost(0, 1, 0.25, 0.25)).toBeCloseTo(1, 6);
    expect(easeHoverBoost(1, 0, 0.25, 0.25)).toBeCloseTo(0, 6);
  });

  it('returns current when delta == 0 (no time = no movement)', () => {
    expect(easeHoverBoost(1, 0, 0, 0.25)).toBe(1);
    expect(easeHoverBoost(0, 1, 0, 0.25)).toBe(0);
    expect(easeHoverBoost(0.42, 1, 0, 0.25)).toBe(0.42);
  });

  it('returns current unchanged when target == current', () => {
    expect(easeHoverBoost(0.7, 0.7, 0.016, 0.25)).toBe(0.7);
    expect(easeHoverBoost(0, 0, 0.016, 0.25)).toBe(0);
    expect(easeHoverBoost(1, 1, 0.016, 0.25)).toBe(1);
  });

  it('eases monotonically toward target across many steps', () => {
    let v = 0;
    const target = 1;
    const dt = 0.016;
    for (let i = 0; i < 200; i++) {
      const next = easeHoverBoost(v, target, dt, 0.25);
      expect(next).toBeGreaterThanOrEqual(v - 1e-9);
      expect(next).toBeLessThanOrEqual(target + 1e-9);
      v = next;
    }
    // After 200 frames at 60fps that's 3.2s — well past the 0.25s duration,
    // value should be effectively at target.
    expect(v).toBeCloseTo(1, 3);
  });

  it('overshoot-safe: clamps to target when step >= 1', () => {
    // delta > duration → snap to target instead of overshooting.
    expect(easeHoverBoost(0, 1, 1, 0.25)).toBe(1);
    expect(easeHoverBoost(0, 1, 10, 0.25)).toBe(1);
  });

  it('handles non-finite inputs by returning current', () => {
    expect(easeHoverBoost(0.5, Number.NaN, 0.016, 0.25)).toBe(0.5);
    expect(easeHoverBoost(Number.NaN, 1, 0.016, 0.25)).toBeNaN();
    expect(easeHoverBoost(0.5, 1, Number.NaN, 0.25)).toBe(0.5);
    expect(easeHoverBoost(0.5, 1, 0.016, Number.NaN)).toBe(0.5);
  });

  it('treats non-positive durationSeconds as instant (snap to target)', () => {
    expect(easeHoverBoost(0, 1, 0.016, 0)).toBe(1);
    expect(easeHoverBoost(0.5, 1, 0.016, -0.1)).toBe(1);
  });
});
