import { describe, expect, it } from 'vitest';
import {
  glitchEnvelope,
  isInEmphasisBand,
  isInGlitchBand,
  pulseBrightness,
} from '../extras';

describe('pulseBrightness', () => {
  it('peaks (~1.0) when distance == wavefront', () => {
    expect(pulseBrightness(0.5, 0.5, 0.18)).toBeCloseTo(1, 5);
  });

  it('decays to ~0 far from the wavefront', () => {
    expect(pulseBrightness(0, 1.5, 0.1)).toBeLessThan(1e-5);
    expect(pulseBrightness(2, 0.5, 0.1)).toBeLessThan(1e-5);
  });

  it('returns finite, non-negative values for any input', () => {
    const samples = [
      [0, 0, 0.18],
      [3.14, 0, 0.18],
      [-1, 0.5, 0.18],
      [0.5, 0.5, 0],
      [Number.EPSILON, 0, 1],
    ] as const;
    for (const [d, w, width] of samples) {
      const v = pulseBrightness(d, w, width);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('width controls falloff', () => {
    const tight = pulseBrightness(0.6, 0.5, 0.05);
    const wide = pulseBrightness(0.6, 0.5, 0.2);
    expect(wide).toBeGreaterThan(tight);
  });
});

describe('isInEmphasisBand', () => {
  it('classifies the equator', () => {
    expect(isInEmphasisBand(0, 50)).toBe('equator');
    expect(isInEmphasisBand(0.2, -120)).toBe('equator');
  });

  it('classifies the tropics (Cancer + Capricorn)', () => {
    expect(isInEmphasisBand(23.43, 0)).toBe('tropic');
    expect(isInEmphasisBand(-23.43, 45)).toBe('tropic');
  });

  it('classifies prime + anti-meridian', () => {
    expect(isInEmphasisBand(45, 0)).toBe('meridian');
    expect(isInEmphasisBand(45, 180)).toBe('meridian');
    expect(isInEmphasisBand(45, -180)).toBe('meridian');
  });

  it('returns null off-band', () => {
    expect(isInEmphasisBand(45, 90)).toBeNull();
    expect(isInEmphasisBand(10, 60)).toBeNull();
  });

  it('equator wins over meridian at (0, 0)', () => {
    expect(isInEmphasisBand(0, 0)).toBe('equator');
  });
});

describe('isInGlitchBand', () => {
  it('returns true within the half-height window', () => {
    expect(isInGlitchBand(20, 25, 10)).toBe(true);
    expect(isInGlitchBand(35, 25, 10)).toBe(true);
    expect(isInGlitchBand(25, 25, 10)).toBe(true);
  });

  it('returns false outside the half-height window', () => {
    expect(isInGlitchBand(50, 25, 10)).toBe(false);
    expect(isInGlitchBand(0, 25, 10)).toBe(false);
  });

  it('handles negative latitudes', () => {
    expect(isInGlitchBand(-30, -25, 10)).toBe(true);
    expect(isInGlitchBand(-50, -25, 10)).toBe(false);
  });
});

describe('glitchEnvelope', () => {
  it('is 0 at endpoints', () => {
    expect(glitchEnvelope(0)).toBe(0);
    expect(glitchEnvelope(1)).toBe(0);
  });

  it('peaks at t=0.5', () => {
    expect(glitchEnvelope(0.5)).toBeCloseTo(1, 5);
  });

  it('returns 0 outside [0, 1]', () => {
    expect(glitchEnvelope(-0.5)).toBe(0);
    expect(glitchEnvelope(1.5)).toBe(0);
  });
});
