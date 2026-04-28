import { describe, expect, it } from 'vitest';
import { ringRadiusForExtent, stepParticleLat } from '../active-ring-extras';

describe('ringRadiusForExtent', () => {
  it('returns 0 when extent is 0', () => {
    expect(ringRadiusForExtent(0, 1.2, 1)).toBe(0);
  });

  it('returns 0 when globeRadius is 0 or negative', () => {
    expect(ringRadiusForExtent(0.5, 1.2, 0)).toBe(0);
    expect(ringRadiusForExtent(0.5, 1.2, -1)).toBe(0);
  });

  it('produces a sensible chord for a typical small country (extent=0.5)', () => {
    const r = ringRadiusForExtent(0.5, 1.2, 1);
    expect(r).toBeGreaterThan(0.25);
    expect(r).toBeLessThan(0.35);
  });

  it('clamps to globeRadius * sin(π/2) = globeRadius for very large extents', () => {
    const r = ringRadiusForExtent(Math.PI, 1.2, 1);
    expect(r).toBeCloseTo(1, 5);
  });

  it('scales linearly with globeRadius', () => {
    const small = ringRadiusForExtent(0.5, 1.2, 1);
    const large = ringRadiusForExtent(0.5, 1.2, 5);
    expect(large).toBeCloseTo(small * 5, 5);
  });

  it('grows with padding', () => {
    const tight = ringRadiusForExtent(0.4, 1.0, 1);
    const padded = ringRadiusForExtent(0.4, 1.5, 1);
    expect(padded).toBeGreaterThan(tight);
  });

  it('returns finite, non-negative values for sane input', () => {
    const samples = [
      [0.1, 1.2, 1],
      [Math.PI / 2, 1.2, 1],
      [Math.PI, 2.0, 1],
    ] as const;
    for (const [e, p, g] of samples) {
      const v = ringRadiusForExtent(e, p, g);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('stepParticleLat', () => {
  it('decreases lat by speed * delta when in normal range', () => {
    expect(stepParticleLat(80, 10, 1, 89, -89)).toBe(70);
  });

  it('respawns to spawnLat when descending past despawnLat', () => {
    expect(stepParticleLat(-89, 10, 1, 89, -89)).toBe(89);
  });

  it('respawns when next step would cross despawnLat', () => {
    expect(stepParticleLat(-85, 10, 1, 89, -89)).toBe(89);
  });

  it('clamps lats above spawnLat back to spawnLat (no-op style)', () => {
    expect(stepParticleLat(95, 10, 1, 89, -89)).toBe(89);
  });

  it('handles zero delta as a no-op (returns same lat)', () => {
    expect(stepParticleLat(50, 10, 0, 89, -89)).toBe(50);
  });

  it('handles small steps cleanly', () => {
    expect(stepParticleLat(0, 30, 0.5, 89, -89)).toBeCloseTo(-15, 5);
  });
});
