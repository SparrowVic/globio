import { describe, expect, it } from 'vitest';
import { buildIcosphere } from '../icosphere';

describe('buildIcosphere', () => {
  it('returns 20 faces for level 0 (raw icosahedron)', () => {
    const ico = buildIcosphere(0);
    expect(ico.faces.length / 3).toBe(20);
    expect(ico.faceCentroids.length / 3).toBe(20);
    expect(ico.faceLatLng.length / 2).toBe(20);
  });

  it('multiplies face count by 4 per subdivision level', () => {
    expect(buildIcosphere(1).faces.length / 3).toBe(80);
    expect(buildIcosphere(2).faces.length / 3).toBe(320);
    expect(buildIcosphere(3).faces.length / 3).toBe(1280);
    expect(buildIcosphere(4).faces.length / 3).toBe(5120);
  });

  it('clamps subdivision level to [0, 5]', () => {
    expect(buildIcosphere(-2).faces.length / 3).toBe(20);
    expect(buildIcosphere(99).faces.length / 3).toBe(20480); // level 5
  });

  it('produces vertices on the unit sphere within tolerance', () => {
    const ico = buildIcosphere(2);
    for (let i = 0; i < ico.vertices.length / 3; i++) {
      const x = ico.vertices[i * 3]!;
      const y = ico.vertices[i * 3 + 1]!;
      const z = ico.vertices[i * 3 + 2]!;
      const len = Math.sqrt(x * x + y * y + z * z);
      expect(len).toBeCloseTo(1, 5);
    }
  });

  it('produces face centroids on the unit sphere within tolerance', () => {
    const ico = buildIcosphere(3);
    for (let i = 0; i < ico.faceCentroids.length / 3; i++) {
      const x = ico.faceCentroids[i * 3]!;
      const y = ico.faceCentroids[i * 3 + 1]!;
      const z = ico.faceCentroids[i * 3 + 2]!;
      const len = Math.sqrt(x * x + y * y + z * z);
      expect(len).toBeCloseTo(1, 5);
    }
  });

  it('caches builds at module scope (same object on repeat calls)', () => {
    const a = buildIcosphere(2);
    const b = buildIcosphere(2);
    expect(a).toBe(b);
  });

  it('produces face latitudes inside [-90, 90]', () => {
    const ico = buildIcosphere(3);
    for (let i = 0; i < ico.faceLatLng.length / 2; i++) {
      const lat = ico.faceLatLng[i * 2]!;
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
    }
  });
});
