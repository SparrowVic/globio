import { describe, expect, it } from 'vitest';
import { buildIcosphere } from '../icosphere';
import { HexBinMesh } from '../hexbin-mesh';

const makeMesh = (): HexBinMesh =>
  new HexBinMesh({
    icosphere: buildIcosphere(0),
    cellInset: 0.95,
    opacity: 1,
    heightRange: { min: 0, max: 0.1 },
    lift: 1.001,
  });

describe('HexBinMesh', () => {
  it('collapses hidden empty cells to a non-raycastable zero-area triangle', () => {
    const mesh = makeMesh();
    const values = new Float32Array(mesh.faceCount_);
    values.fill(Number.NaN);
    values[0] = 1;

    mesh.update(
      values,
      [1, 1],
      undefined,
      '#ffffff',
      false,
      { min: 0, max: 0.1 },
      '#111111'
    );

    const hidden = new Float32Array(9);
    mesh.getFaceCorners(1, hidden);
    expect(mesh.isFaceVisible(1)).toBe(false);
    expect(hidden[0]).toBeCloseTo(hidden[3]!, 6);
    expect(hidden[1]).toBeCloseTo(hidden[4]!, 6);
    expect(hidden[2]).toBeCloseTo(hidden[5]!, 6);
    expect(hidden[0]).toBeCloseTo(hidden[6]!, 6);
    expect(hidden[1]).toBeCloseTo(hidden[7]!, 6);
    expect(hidden[2]).toBeCloseTo(hidden[8]!, 6);

    const visible = new Float32Array(9);
    mesh.getFaceCorners(0, visible);
    expect(mesh.isFaceVisible(0)).toBe(true);
    expect(Math.abs(visible[0]! - visible[3]!)).toBeGreaterThan(1e-4);
    mesh.dispose();
  });

  it('gives finite equal-valued cells full height instead of flattening them', () => {
    const mesh = makeMesh();
    const values = new Float32Array(mesh.faceCount_);
    values.fill(Number.NaN);
    values[0] = 5;
    values[1] = 5;

    mesh.update(
      values,
      [5, 5],
      undefined,
      '#ffffff',
      false,
      { min: 0, max: 0.1 },
      '#111111'
    );

    const visible = new Float32Array(9);
    mesh.getFaceCorners(0, visible);
    const r = Math.hypot(visible[0]!, visible[1]!, visible[2]!);
    expect(r).toBeGreaterThan(1.05);
    mesh.dispose();
  });

  it('uses scale.noDataColor for visible empty cells', () => {
    const mesh = makeMesh();
    const values = new Float32Array(mesh.faceCount_);
    values.fill(Number.NaN);

    mesh.update(
      values,
      [0, 0],
      { type: 'sequential', palette: ['#ffffff'], noDataColor: '#ff0000' },
      '#ffffff',
      true,
      { min: 0, max: 0.1 },
      '#111111'
    );

    const colors = (mesh.mesh.geometry.getAttribute('color') as { array: Float32Array }).array;
    expect(colors[0]).toBeCloseTo(1, 6);
    expect(colors[1]).toBeCloseTo(0, 6);
    expect(colors[2]).toBeCloseTo(0, 6);
    mesh.dispose();
  });

  it('uses scale.noDataColor when a finite value cannot be mapped', () => {
    const mesh = makeMesh();
    const values = new Float32Array(mesh.faceCount_);
    values.fill(Number.NaN);
    values[0] = 7;

    mesh.update(
      values,
      [7, 7],
      { type: 'categorical', colors: {}, noDataColor: '#00ff00' },
      '#ffffff',
      false,
      { min: 0, max: 0.1 },
      '#111111'
    );

    const colors = (mesh.mesh.geometry.getAttribute('color') as { array: Float32Array }).array;
    expect(colors[0]).toBeCloseTo(0, 6);
    expect(colors[1]).toBeCloseTo(1, 6);
    expect(colors[2]).toBeCloseTo(0, 6);
    mesh.dispose();
  });

  it('clamps invalid animation scales before writing geometry', () => {
    const mesh = makeMesh();
    const values = new Float32Array(mesh.faceCount_);
    values.fill(Number.NaN);
    values[0] = 5;
    mesh.update(
      values,
      [5, 5],
      undefined,
      '#ffffff',
      false,
      { min: 0, max: 0.1 },
      '#111111'
    );

    const scales = new Float32Array(mesh.faceCount_);
    scales.fill(1);
    scales[0] = Number.NaN;
    scales[1] = -1;
    mesh.applyAnimation(scales, { min: 0, max: 0.1 });

    const corners = new Float32Array(9);
    mesh.getFaceCorners(0, corners);
    expect(Array.from(corners).every(Number.isFinite)).toBe(true);
    expect(Math.hypot(corners[0]!, corners[1]!, corners[2]!)).toBeGreaterThan(1);
    mesh.dispose();
  });
});
