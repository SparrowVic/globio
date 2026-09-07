import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OUTPUT_PATH, extract, parseDefault, serialize } from '../../../scripts/docs-extract.mjs';
import api from '../generated/api.json';

describe('generated/api.json', () => {
  it('matches the current TypeScript sources (run `pnpm docs:extract` to refresh)', () => {
    const committed = readFileSync(OUTPUT_PATH, 'utf8');
    expect(serialize(extract())).toBe(committed);
  }, 60_000);

  it('keeps every config key described and documents inherited option fields', () => {
    expect(api.stats.configKeysDocumented).toBe(api.stats.configKeys);
    expect(api.types.FocusOptions.members.map((entry) => entry.name)).toEqual(expect.arrayContaining(['duration', 'easing', 'elevation', 'padding']));
    expect(api.types).toHaveProperty('HeatmapGridConfig');
  });

  it('extracts actual defaults without mistaking descriptive prose for a value', () => {
    expect(parseDefault('Hover multiplier. Default 1.3.')).toBe('1.3');
    expect(parseDefault('Default angular influence radius.')).toBeUndefined();
    expect(parseDefault('Defaults to the theme `starfield.size` token.')).toBeUndefined();
    expect(parseDefault('Default `starfield.size`.')).toBe('starfield.size');
    expect(parseDefault('Enabled by default; use false to disable.')).toBeUndefined();
    expect(parseDefault('If true (default false), draw the head.')).toBe('false');
  });
});
