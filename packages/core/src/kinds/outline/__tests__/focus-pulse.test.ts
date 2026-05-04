import { describe, it, expect } from 'vitest';
import { computePulseFrame } from '../focus-pulse';

const DURATION = 1.4;

describe('computePulseFrame', () => {
  it('t=0 returns minimum scale and full opacity', () => {
    const frame = computePulseFrame(0, DURATION);
    expect(frame).not.toBeNull();
    expect(frame!.opacity).toBeCloseTo(1, 5);
    // SCALE_MIN baseline (see focus-pulse-layer constants).
    expect(frame!.scale).toBeCloseTo(0.4, 5);
  });

  it('t=1 returns null (pulse expired)', () => {
    expect(computePulseFrame(DURATION, DURATION)).toBeNull();
  });

  it('age past duration returns null', () => {
    expect(computePulseFrame(DURATION + 0.01, DURATION)).toBeNull();
    expect(computePulseFrame(99, DURATION)).toBeNull();
  });

  it('mid-life has higher scale and lower opacity than start', () => {
    const start = computePulseFrame(0, DURATION);
    const mid = computePulseFrame(DURATION / 2, DURATION);
    expect(start).not.toBeNull();
    expect(mid).not.toBeNull();
    expect(mid!.scale).toBeGreaterThan(start!.scale);
    expect(mid!.opacity).toBeLessThan(start!.opacity);
  });

  it('opacity is quadratic — mid-life ≈ 0.25', () => {
    const mid = computePulseFrame(DURATION / 2, DURATION);
    expect(mid).not.toBeNull();
    expect(mid!.opacity).toBeCloseTo(0.25, 5);
  });

  it('scale grows monotonically across the lifetime', () => {
    const samples = [0, 0.25, 0.5, 0.75, 0.99].map((t) => computePulseFrame(t * DURATION, DURATION));
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).not.toBeNull();
      expect(samples[i]!.scale).toBeGreaterThan(samples[i - 1]!.scale);
    }
  });

  it('non-positive duration returns null', () => {
    expect(computePulseFrame(0, 0)).toBeNull();
    expect(computePulseFrame(0.5, -1)).toBeNull();
  });

  it('negative age returns null', () => {
    expect(computePulseFrame(-0.001, DURATION)).toBeNull();
  });
});
