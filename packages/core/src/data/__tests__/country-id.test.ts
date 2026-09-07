import { describe, expect, it } from 'vitest';
import { normalizeCountryId, normalizeCountryKeys } from '../country-id';

describe('normalizeCountryId', () => {
  it('pads numeric ids to three characters', () => {
    expect(normalizeCountryId('32')).toBe('032');
    expect(normalizeCountryId('8')).toBe('008');
    expect(normalizeCountryId(76)).toBe('076');
    expect(normalizeCountryId(' 50 ')).toBe('050');
  });

  it('keeps already padded and non-numeric ids as they are', () => {
    expect(normalizeCountryId('840')).toBe('840');
    expect(normalizeCountryId('032')).toBe('032');
    expect(normalizeCountryId('US')).toBe('US');
    expect(normalizeCountryId('')).toBe('');
    // Four digits are not an ISO 3166-1 numeric code; leave them alone.
    expect(normalizeCountryId('1234')).toBe('1234');
  });
});

describe('normalizeCountryKeys', () => {
  it('re-keys a record and preserves values', () => {
    const out = normalizeCountryKeys({ '32': { value: 1 }, '840': { value: 2 } });
    // Integer-like keys ('840') enumerate before string keys ('032'), so compare as sets.
    expect(Object.keys(out).sort()).toEqual(['032', '840']);
    expect(out['032']).toEqual({ value: 1 });
  });

  it('returns the same object when every key is already normalised', () => {
    const input = { '032': 1, '840': 2 };
    expect(normalizeCountryKeys(input)).toBe(input);
  });
});
