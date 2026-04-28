import { describe, it, expect } from 'vitest';
import { generateGridSegments } from '../wireframe-grid-layer';

const RADIUS = 1.0005;

describe('generateGridSegments', () => {
  it('higher density produces more segments', () => {
    const sparse = generateGridSegments(0.5, RADIUS);
    const base = generateGridSegments(1, RADIUS);
    const dense = generateGridSegments(2, RADIUS);

    expect(base.segmentCount).toBeGreaterThan(sparse.segmentCount);
    expect(dense.segmentCount).toBeGreaterThan(base.segmentCount);
  });

  it('places every vertex on the requested radius', () => {
    const { positions, segmentCount } = generateGridSegments(1, RADIUS);
    expect(segmentCount).toBeGreaterThan(0);
    expect(positions.length).toBe(segmentCount * 6);

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i] ?? 0;
      const y = positions[i + 1] ?? 0;
      const z = positions[i + 2] ?? 0;
      const r = Math.sqrt(x * x + y * y + z * z);
      expect(r).toBeCloseTo(RADIUS, 5);
    }
  });

  it('density: 1 baseline locks in segment count', () => {
    const { segmentCount } = generateGridSegments(1, RADIUS);
    // 11 parallels × 120 chords + 24 meridians × 60 chords (15° base step,
    // 3° sample step). Future regressions in the generator break this.
    expect(segmentCount).toBe(2760);
  });

  it('returns a Float32Array of length segmentCount × 6', () => {
    const { positions, segmentCount } = generateGridSegments(1.2, RADIUS);
    expect(positions).toBeInstanceOf(Float32Array);
    expect(positions.length).toBe(segmentCount * 6);
  });

  it('non-positive density falls back to default', () => {
    const fallback = generateGridSegments(0, RADIUS);
    const baseline = generateGridSegments(1, RADIUS);
    expect(fallback.segmentCount).toBe(baseline.segmentCount);
  });
});
