import { describe, expect, it } from 'vitest';
import { jitterRing, seededJitter } from '../paper-jitter';

describe('seededJitter', () => {
  it('is deterministic — same key produces same value across calls', () => {
    const a = seededJitter('paper|10.5,52.3');
    const b = seededJitter('paper|10.5,52.3');
    expect(a).toBe(b);
  });

  it('produces values in [-0.5, 0.5]', () => {
    for (let i = 0; i < 200; i++) {
      const v = seededJitter(`k#${i}`);
      expect(v).toBeGreaterThanOrEqual(-0.5);
      expect(v).toBeLessThanOrEqual(0.5);
    }
  });

  it('produces different values for different keys', () => {
    const a = seededJitter('country-A|0,0');
    const b = seededJitter('country-B|0,0');
    expect(a).not.toBe(b);
  });
});

describe('jitterRing', () => {
  const sampleRing: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];

  it('returns the same ring element-wise when roughness is 0', () => {
    const out = jitterRing(sampleRing, 0, 'seed');
    expect(out.length).toBe(sampleRing.length);
    for (let i = 0; i < out.length; i++) {
      expect(out[i]).toEqual(sampleRing[i]);
    }
  });

  it('produces different output for different seeds at same roughness', () => {
    const a = jitterRing(sampleRing, 0.5, 'A');
    const b = jitterRing(sampleRing, 0.5, 'B');
    let differs = false;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i]!;
      const bi = b[i]!;
      if (ai[0] !== bi[0] || ai[1] !== bi[1]) {
        differs = true;
        break;
      }
    }
    expect(differs).toBe(true);
  });

  it('output length matches input length', () => {
    const out = jitterRing(sampleRing, 0.3, 'seed');
    expect(out.length).toBe(sampleRing.length);
  });

  it('is deterministic for the same (ring, roughness, seed)', () => {
    const a = jitterRing(sampleRing, 0.3, 'seed');
    const b = jitterRing(sampleRing, 0.3, 'seed');
    for (let i = 0; i < a.length; i++) {
      expect(a[i]).toEqual(b[i]);
    }
  });

  it('returns the input when length < 2', () => {
    const single: ReadonlyArray<readonly [number, number]> = [[0, 0]];
    const out = jitterRing(single, 0.5, 'seed');
    expect(out).toBe(single);
  });

  it('keeps jitter magnitude bounded by roughness', () => {
    const roughness = 0.4;
    const out = jitterRing(sampleRing, roughness, 'bound');
    for (let i = 0; i < out.length; i++) {
      const o = out[i]!;
      const s = sampleRing[i]!;
      const dx = o[0] - s[0];
      const dy = o[1] - s[1];
      // Each vertex is offset by jitter * perpendicular(unit). Magnitude of
      // the offset vector is |jitter| <= 0.5 * roughness.
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(roughness * 0.5 + 1e-9);
    }
  });
});
