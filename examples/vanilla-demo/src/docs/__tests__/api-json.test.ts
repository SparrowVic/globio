import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OUTPUT_PATH, extract, serialize } from '../../../scripts/docs-extract.mjs';

describe('generated/api.json', () => {
  it('matches the current TypeScript sources (run `pnpm docs:extract` to refresh)', () => {
    const committed = readFileSync(OUTPUT_PATH, 'utf8');
    expect(serialize(extract())).toBe(committed);
  }, 60_000);
});
