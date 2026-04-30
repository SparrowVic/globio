import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { computeEntryStartRanks } from '../entry-ordering';
import type { ChartsDataEntry } from '../../types';

const makeAnchor = (lat: number, lng: number) => ({
  position: [lat, lng] as const,
  surface: new Vector3(),
  normal: new Vector3(),
  quaternion: new Quaternion(),
});

const wrap = (entry: ChartsDataEntry, lat: number, lng: number) => ({
  entry,
  anchor: makeAnchor(lat, lng),
});

const series = [
  { key: 'a' },
  { key: 'b' },
];

describe('computeEntryStartRanks', () => {
  it('sequential keeps input order', () => {
    const anchors = [
      wrap({ values: { a: 5 } }, 0, 0),
      wrap({ values: { a: 1 } }, 10, 10),
      wrap({ values: { a: 3 } }, 20, 20),
    ];
    expect(computeEntryStartRanks(anchors, series, 'sequential', [0, 0])).toEqual([0, 1, 2]);
  });

  it('value sorts descending — highest sum gets rank 0', () => {
    const anchors = [
      wrap({ values: { a: 1, b: 2 } }, 0, 0), // sum 3
      wrap({ values: { a: 50, b: 50 } }, 10, 10), // sum 100
      wrap({ values: { a: 10 } }, 20, 20), // sum 10
    ];
    const ranks = computeEntryStartRanks(anchors, series, 'value', [0, 0]);
    expect(ranks[1]).toBe(0); // highest sum
    expect(ranks[2]).toBe(1);
    expect(ranks[0]).toBe(2);
  });

  it('reverse-value sorts ascending — lowest sum gets rank 0', () => {
    const anchors = [
      wrap({ values: { a: 50 } }, 0, 0),
      wrap({ values: { a: 1 } }, 10, 10),
      wrap({ values: { a: 20 } }, 20, 20),
    ];
    const ranks = computeEntryStartRanks(anchors, series, 'reverse-value', [0, 0]);
    expect(ranks[1]).toBe(0); // lowest
    expect(ranks[2]).toBe(1);
    expect(ranks[0]).toBe(2);
  });

  it('radial picks closest entry to origin first', () => {
    const anchors = [
      wrap({ values: {} }, 60, 0), // far north
      wrap({ values: {} }, 1, 1),  // near origin
      wrap({ values: {} }, 30, 0), // mid
    ];
    const ranks = computeEntryStartRanks(anchors, series, 'radial', [0, 0]);
    expect(ranks[1]).toBe(0); // closest
    expect(ranks[2]).toBe(1);
    expect(ranks[0]).toBe(2);
  });

  it('random produces a permutation of [0..N-1]', () => {
    const anchors = Array.from({ length: 8 }, (_, i) => wrap({ values: {} }, i, 0));
    const ranks = computeEntryStartRanks(anchors, series, 'random', [0, 0]);
    expect(ranks).toHaveLength(8);
    expect([...ranks].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('random is deterministic — same length → same order', () => {
    const a = Array.from({ length: 5 }, (_, i) => wrap({ values: {} }, i, 0));
    const b = Array.from({ length: 5 }, (_, i) => wrap({ values: {} }, i, 0));
    expect(computeEntryStartRanks(a, series, 'random', [0, 0])).toEqual(
      computeEntryStartRanks(b, series, 'random', [0, 0])
    );
  });

  it('handles empty / single-entry input gracefully', () => {
    expect(computeEntryStartRanks([], series, 'value', [0, 0])).toEqual([]);
    const single = [wrap({ values: { a: 5 } }, 0, 0)];
    expect(computeEntryStartRanks(single, series, 'radial', [0, 0])).toEqual([0]);
  });
});
