import { describe, expect, it } from 'vitest';
import {
  fresnelFactor,
  nextGlitchTime,
  scanlineMod,
} from '../hologram-extras';

describe('fresnelFactor', () => {
  it('returns ~0 when looking straight at the surface (viewDotNormal = 1)', () => {
    expect(fresnelFactor(1)).toBeCloseTo(0, 6);
  });

  it('returns ~1 at the silhouette (viewDotNormal = 0)', () => {
    expect(fresnelFactor(0)).toBeCloseTo(1, 6);
  });

  it('clamps negative (back-facing) inputs to 0', () => {
    expect(fresnelFactor(-0.5)).toBe(0);
    expect(fresnelFactor(-1)).toBe(0);
  });

  it('returns the squared rim — 0.25 at viewDotNormal = 0.5', () => {
    expect(fresnelFactor(0.5)).toBeCloseTo(0.25, 6);
  });

  it('is monotonically decreasing as viewDotNormal goes 0 → 1', () => {
    let prev = Infinity;
    for (let v = 0; v <= 1.01; v += 0.1) {
      const f = fresnelFactor(v);
      expect(f).toBeLessThanOrEqual(prev + 1e-9);
      prev = f;
    }
  });
});

describe('scanlineMod', () => {
  it('locks the known baseline at uvY = 0, time = 0 → 0.6', () => {
    expect(scanlineMod(0, 240, 0, 1.5)).toBeCloseTo(0.6, 6);
  });

  it('output range stays within [0.2, 1.0]', () => {
    for (let i = 0; i < 50; i++) {
      const v = scanlineMod(i * 0.137, 240, i * 0.31, 1.5);
      expect(v).toBeGreaterThanOrEqual(0.2 - 1e-9);
      expect(v).toBeLessThanOrEqual(1.0 + 1e-9);
    }
  });

  it('is periodic in the combined phase (uvY * freq + time * speed)', () => {
    const phaseShift = 2 * Math.PI;
    // Holding speed = 0 and shifting uvY by a full period in the freq * uvY
    // combined argument should match the original.
    const a = scanlineMod(0, 240, 0, 1.5);
    const b = scanlineMod(phaseShift / 240, 240, 0, 1.5);
    expect(b).toBeCloseTo(a, 5);
  });

  it('time advances the phase the same as uvY would', () => {
    // Combined arg(uvY=0.5, t=0) = 0.5 * freq.
    // Combined arg(uvY=0,   t=0.5*freq/speed) = 0.5 * freq.
    const freq = 240;
    const speed = 1.5;
    const a = scanlineMod(0.5, freq, 0, speed);
    const b = scanlineMod(0, freq, (0.5 * freq) / speed, speed);
    expect(b).toBeCloseTo(a, 5);
  });
});

describe('nextGlitchTime', () => {
  it('returns exactly now + intervalMin when min === max', () => {
    expect(nextGlitchTime(10, 5, 5, () => Math.random())).toBe(15);
  });

  it('returns now + intervalMin when rng returns 0', () => {
    expect(nextGlitchTime(0, 4, 9, () => 0)).toBe(4);
  });

  it('approaches now + intervalMax as rng → 1', () => {
    const v = nextGlitchTime(0, 4, 9, () => 1 - 1e-9);
    expect(v).toBeGreaterThan(8.999);
    expect(v).toBeLessThanOrEqual(9);
  });

  it('respects current `now` offset', () => {
    expect(nextGlitchTime(100, 4, 9, () => 0.5)).toBeCloseTo(106.5, 6);
  });

  it('clamps a negative intervalMin to 0', () => {
    expect(nextGlitchTime(0, -3, 5, () => 0)).toBe(0);
  });

  it('handles inverted bounds gracefully (max < min collapses to min)', () => {
    expect(nextGlitchTime(0, 5, 3, () => 0.7)).toBe(5);
  });
});
