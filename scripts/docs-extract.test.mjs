import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDefault } from './docs-extract.mjs';
test('defaults distinguish literal values from descriptive prose', () => {
  assert.equal(parseDefault('Hover multiplier. Default 1.3.'), '1.3');
  assert.equal(parseDefault('Default angular influence radius.'), undefined);
  assert.equal(parseDefault('Defaults to the theme `starfield.size` token.'), undefined);
  assert.equal(parseDefault('Default `starfield.size`.'), 'starfield.size');
  assert.equal(parseDefault('Enabled by default; use false to disable.'), undefined);
  assert.equal(parseDefault('If true (default false), draw the head.'), 'false');
});
