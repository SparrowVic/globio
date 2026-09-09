import { describe, expect, it } from 'vitest';
import { studioHomeDistance } from '../studio-camera';

describe('Studio home framing', () => {
  it.each([[1440, 850], [844, 390], [390, 690], [320, 690]])(
    'keeps the whole globe atmosphere inside a %sx%s canvas', (width, height) => {
      const distance = studioHomeDistance(width, height);
      // Perspective projection of a sphere's tangent silhouette, expressed
      // as a fraction of the smaller viewport half-extent.
      const projectedRadius = 1.25 / Math.sqrt(distance ** 2 - 1.25 ** 2);
      const available = Math.tan(Math.PI / 8) * Math.min(1, width / height);
      expect(projectedRadius / available).toBeLessThan(1);
    },
  );

  it('pulls back in portrait and respects user zoom limits', () => {
    expect(studioHomeDistance(390, 690)).toBeGreaterThan(studioHomeDistance(690, 390));
    expect(studioHomeDistance(390, 690, { maxZoom: 4 })).toBe(4);
    expect(studioHomeDistance(1440, 850, { minZoom: 5 })).toBe(5);
  });

  it('returns a finite starting distance before the host has a visible size', () => {
    expect(studioHomeDistance(0, 0)).toBe(studioHomeDistance(1, 1));
  });
});
