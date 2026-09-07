import { describe, expect, it } from 'vitest';
import { continentOf } from '../continent-of';

describe('continentOf', () => {
  it('Germany (276) → EUROPE', () => {
    expect(continentOf('276')).toBe('EUROPE');
  });

  it('China (156) → ASIA', () => {
    expect(continentOf('156')).toBe('ASIA');
  });

  it('USA (840) → NORTH_AMERICA', () => {
    expect(continentOf('840')).toBe('NORTH_AMERICA');
  });

  it('Brazil (076) → SOUTH_AMERICA', () => {
    expect(continentOf('076')).toBe('SOUTH_AMERICA');
  });

  it('South Africa (710) → AFRICA', () => {
    expect(continentOf('710')).toBe('AFRICA');
  });

  it('Australia (036) → OCEANIA', () => {
    expect(continentOf('036')).toBe('OCEANIA');
  });

  it('unknown id → null', () => {
    expect(continentOf('unknown_id')).toBeNull();
    expect(continentOf('99999')).toBeNull();
    expect(continentOf('')).toBeNull();
  });

  it('Russia (643) lands in EUROPE bucket (matches data/regions placement)', () => {
    expect(continentOf('643')).toBe('EUROPE');
  });
});
