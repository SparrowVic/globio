import { describe, it, expect } from 'vitest';
import {
  colorForValue,
  interpolatePalette,
  type ScaleConfig,
} from '../scales';

describe('interpolatePalette', () => {
  it('returns the first stop at t=0 and last stop at t=1', () => {
    expect(interpolatePalette(['#000000', '#ffffff'], 0)).toBe('#000000');
    expect(interpolatePalette(['#000000', '#ffffff'], 1)).toBe('#ffffff');
  });

  it('blends linearly between stops in RGB space', () => {
    expect(interpolatePalette(['#000000', '#ffffff'], 0.5)).toBe('#808080');
  });

  it('clamps t < 0 to first stop and t > 1 to last stop', () => {
    expect(interpolatePalette(['#112233', '#aabbcc'], -1)).toBe('#112233');
    expect(interpolatePalette(['#112233', '#aabbcc'], 2)).toBe('#aabbcc');
  });

  it('walks multi-stop palettes by t-segment', () => {
    // 3-stop palette: t=0 → red, t=0.5 → green, t=1 → blue
    expect(interpolatePalette(['#ff0000', '#00ff00', '#0000ff'], 0)).toBe('#ff0000');
    expect(interpolatePalette(['#ff0000', '#00ff00', '#0000ff'], 0.5)).toBe('#00ff00');
    expect(interpolatePalette(['#ff0000', '#00ff00', '#0000ff'], 1)).toBe('#0000ff');
  });

  it('resolves built-in palette names', () => {
    // Endpoints of the viridis palette as defined in BUILT_IN_PALETTES.
    expect(interpolatePalette('viridis', 0)).toBe('#440154');
    expect(interpolatePalette('viridis', 1)).toBe('#fde725');
  });
});

describe('colorForValue: sequential', () => {
  const scale: ScaleConfig = {
    type: 'sequential',
    palette: ['#000000', '#ffffff'],
    domain: [0, 100],
  };

  it('maps the min of the domain to the first palette stop', () => {
    expect(colorForValue(scale, 0, [0, 100])).toBe('#000000');
  });

  it('maps the max of the domain to the last palette stop', () => {
    expect(colorForValue(scale, 100, [0, 100])).toBe('#ffffff');
  });

  it('maps the middle of the domain to the palette midpoint', () => {
    expect(colorForValue(scale, 50, [0, 100])).toBe('#808080');
  });

  it('returns null for an undefined value', () => {
    expect(colorForValue(scale, undefined, [0, 100])).toBeNull();
  });

  it('uses the provided extent when no scale.domain is given', () => {
    const extentScale: ScaleConfig = {
      type: 'sequential',
      palette: ['#000000', '#ffffff'],
    };
    expect(colorForValue(extentScale, 50, [0, 100])).toBe('#808080');
  });
});

describe('colorForValue: diverging', () => {
  it('maps below-mid to the low half of the palette and above-mid to the high half', () => {
    const scale: ScaleConfig = {
      type: 'diverging',
      palette: ['#ff0000', '#ffffff', '#0000ff'],
      domain: [-100, 0, 100],
    };
    // At the midpoint we get exactly the central stop.
    expect(colorForValue(scale, 0, [-100, 100])).toBe('#ffffff');
    // Endpoints land on the outer stops.
    expect(colorForValue(scale, -100, [-100, 100])).toBe('#ff0000');
    expect(colorForValue(scale, 100, [-100, 100])).toBe('#0000ff');
  });
});

describe('colorForValue: threshold', () => {
  it('selects the bucket whose threshold the value first falls under', () => {
    const scale: ScaleConfig = {
      type: 'threshold',
      thresholds: [10, 50, 100],
      colors: ['#000000', '#444444', '#888888', '#ffffff'],
    };
    expect(colorForValue(scale, 0, [0, 100])).toBe('#000000');
    expect(colorForValue(scale, 25, [0, 100])).toBe('#444444');
    expect(colorForValue(scale, 75, [0, 100])).toBe('#888888');
    expect(colorForValue(scale, 200, [0, 100])).toBe('#ffffff');
  });
});

describe('colorForValue: categorical', () => {
  it('looks up colors by exact key match', () => {
    const scale: ScaleConfig = {
      type: 'categorical',
      colors: { NATO: '#1e6fff', EU: '#ffd700' },
    };
    expect(colorForValue(scale, 'NATO' as unknown as number, [0, 0])).toBe('#1e6fff');
    expect(colorForValue(scale, 'EU' as unknown as number, [0, 0])).toBe('#ffd700');
  });

  it('returns null for keys not in the categorical map', () => {
    const scale: ScaleConfig = {
      type: 'categorical',
      colors: { A: '#000000' },
    };
    expect(colorForValue(scale, 'B' as unknown as number, [0, 0])).toBeNull();
  });
});
