import { describe, it, expect } from 'vitest';
import { resolveTheme } from '../resolver';
import { DEFAULT_TOKENS } from '../tokens';
import { THEME_PRESETS } from '../presets';
import type { PartialTokenSet } from '../types';

describe('resolveTheme', () => {
  it('returns DEFAULT_TOKENS when no theme provided', () => {
    expect(resolveTheme()).toEqual(DEFAULT_TOKENS);
  });

  it('returns DEFAULT_TOKENS when theme has no tokens', () => {
    expect(resolveTheme({})).toEqual(DEFAULT_TOKENS);
  });

  it('overrides individual tokens', () => {
    const result = resolveTheme({ tokens: { 'globe.surface': '#ff0000' } });
    expect(result['globe.surface']).toBe('#ff0000');
    expect(result['background.color']).toBe(DEFAULT_TOKENS['background.color']);
  });

  it('overrides multiple tokens at once', () => {
    const result = resolveTheme({
      tokens: {
        'globe.surface': '#abcdef',
        'borders.width': 3,
        'atmosphere.intensity': 2.5,
      },
    });
    expect(result['globe.surface']).toBe('#abcdef');
    expect(result['borders.width']).toBe(3);
    expect(result['atmosphere.intensity']).toBe(2.5);
  });

  it('returns a frozen object', () => {
    const result = resolveTheme();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('does not mutate DEFAULT_TOKENS when overriding', () => {
    const before = DEFAULT_TOKENS['globe.surface'];
    resolveTheme({ tokens: { 'globe.surface': '#deadbe' } });
    expect(DEFAULT_TOKENS['globe.surface']).toBe(before);
  });

  it('ignores undefined values in overrides', () => {
    // Simulates a user spreading a computed object where a key happens to be undefined.
    const overrides = { 'globe.surface': undefined } as unknown as PartialTokenSet;
    const result = resolveTheme({ tokens: overrides });
    expect(result['globe.surface']).toBe(DEFAULT_TOKENS['globe.surface']);
  });
});

describe('resolveTheme: extends + shorthand', () => {
  it('uses preset tokens as floor when extends is set', () => {
    const result = resolveTheme({ extends: 'outline-sunset' });
    expect(result['borders.color']).toBe(THEME_PRESETS['outline-sunset']['borders.color']);
    expect(result['atmosphere.intensity']).toBe(
      THEME_PRESETS['outline-sunset']['atmosphere.intensity']
    );
  });

  it('overrides preset tokens with user tokens (extends + tokens)', () => {
    const result = resolveTheme({
      extends: 'outline-sunset',
      tokens: { 'borders.width': 3 },
    });
    expect(result['borders.width']).toBe(3);
    expect(result['borders.color']).toBe(THEME_PRESETS['outline-sunset']['borders.color']);
  });

  it('accepts string input as shorthand for { extends: name }', () => {
    const direct = resolveTheme({ extends: 'outline-cyber' });
    const shorthand = resolveTheme('outline-cyber');
    expect(shorthand).toEqual(direct);
  });

  it('every preset has every token key', () => {
    const expectedKeys = Object.keys(THEME_PRESETS['outline-dark']).sort();
    for (const name of Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>) {
      const keys = Object.keys(THEME_PRESETS[name]).sort();
      expect(keys).toEqual(expectedKeys);
    }
  });

  it('THEME_PRESETS is frozen', () => {
    expect(Object.isFrozen(THEME_PRESETS)).toBe(true);
    expect(Object.isFrozen(THEME_PRESETS['outline-dark'])).toBe(true);
  });
});
