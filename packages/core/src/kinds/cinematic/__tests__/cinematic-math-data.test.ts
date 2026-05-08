import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import {
  endpointFade,
  smoothstep,
  terminatorFactors,
} from '../math';
import {
  buildDensityGrid,
  normalizeRoutes,
  prepareCinematicData,
} from '../data';

describe('cinematic math', () => {
  it('computes a smooth endpoint fade for tapered arcs', () => {
    expect(endpointFade(0)).toBe(0);
    expect(endpointFade(1)).toBe(0);
    expect(endpointFade(0.5)).toBeCloseTo(1, 3);
  });

  it('keeps smoothstep clamped', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });

  it('splits day, night and twilight around the light terminator', () => {
    const light = new Vector3(1, 0, 0);
    const day = terminatorFactors(new Vector3(1, 0, 0), light, 0.35, 1.2);
    const night = terminatorFactors(new Vector3(-1, 0, 0), light, 0.35, 1.2);
    const edge = terminatorFactors(new Vector3(0, 1, 0), light, 0.35, 1.2);
    expect(day.day).toBeGreaterThan(0.95);
    expect(night.night).toBeGreaterThan(0.95);
    expect(edge.twilight).toBeGreaterThan(0.95);
  });
});

describe('cinematic data preparation', () => {
  it('normalizes density into a stable 0..1 grid', () => {
    const grid = buildDensityGrid(
      [
        {
          id: 'a',
          lat: 0,
          lng: 0,
          value: 1,
          radius: 2,
          temperature: 0.5,
          importance: 4,
        },
      ],
      16,
      8,
    );
    expect(grid.maxDensity).toBe(1);
    expect(Math.max(...grid.density)).toBeLessThanOrEqual(1);
    expect(Math.max(...grid.density)).toBeGreaterThan(0);
  });

  it('resolves route endpoints from city ids and coordinate tuples', () => {
    const routes = normalizeRoutes(
      [
        {
          id: 'a-b',
          from: 'a',
          to: [20, 30],
          value: 2,
        },
      ],
      [
        {
          id: 'a',
          lat: 10,
          lng: 11,
          value: 1,
          radius: 1,
          temperature: 0.5,
          importance: 1,
        },
      ],
      10,
    );
    expect(routes).toHaveLength(1);
    expect(routes[0]?.from).toEqual([10, 11]);
    expect(routes[0]?.to).toEqual([20, 30]);
    expect(routes[0]?.width).toBeGreaterThan(0);
  });

  it('uses synthetic fallback data when no cinematic dataset is supplied', () => {
    const prepared = prepareCinematicData(null, {
      cityCount: 128,
      maxRoutes: 12,
    });
    expect(prepared.cityPoints).toHaveLength(128);
    expect(prepared.routes.length).toBeGreaterThan(0);
    expect(prepared.density.length).toBe(256 * 128);
  });
});
