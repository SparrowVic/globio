import { describe, expect, it } from 'vitest';
import { buildFaceStartTimes } from '../face-ordering';

describe('buildFaceStartTimes', () => {
  it('uses the same longitude convention as latLngToVector3 for radial order', () => {
    const faceLatLng = new Float32Array([
      0, 90,
      0, -90,
      0, 0,
    ]);
    const out = new Float32Array(3);
    buildFaceStartTimes(
      3,
      new Float32Array([1, 1, 1]),
      faceLatLng,
      0,
      1,
      'radial',
      [0, 90],
      out
    );

    expect(out[0]).toBe(0);
    expect(out[1]).toBeGreaterThan(out[2]!);
  });

  it('compacts sequential ranks to included cells only', () => {
    const out = new Float32Array(4);
    buildFaceStartTimes(
      4,
      new Float32Array([Number.NaN, 10, Number.NaN, 20]),
      new Float32Array(8),
      1,
      0.5,
      'sequential',
      [0, 0],
      out,
      new Uint8Array([0, 1, 0, 1])
    );

    expect([...out]).toEqual([1, 1, 1, 1.5]);
  });

  it('value order ranks only included cells', () => {
    const out = new Float32Array(4);
    buildFaceStartTimes(
      4,
      new Float32Array([100, 10, 50, 20]),
      new Float32Array(8),
      0,
      1,
      'value',
      [0, 0],
      out,
      new Uint8Array([0, 1, 1, 1])
    );

    expect(out[2]).toBe(0);
    expect(out[3]).toBe(1);
    expect(out[1]).toBe(2);
    expect(out[0]).toBe(0);
  });
});
