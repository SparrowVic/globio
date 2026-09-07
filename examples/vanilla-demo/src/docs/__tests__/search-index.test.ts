import { describe, expect, it } from 'vitest';
import api from '../generated/api.json';
import type { ApiJson } from '../generated/api-types';
import { findPage } from '../manifest';
import { buildApiIndex, buildStaticIndex, searchEntries } from '../search-index';

const entries = [...buildStaticIndex(), ...buildApiIndex(api as unknown as ApiJson)];

describe('search index', () => {
  it('covers every page, config key, method and event', () => {
    const pages = entries.filter((e) => e.kind === 'page').length;
    expect(pages).toBeGreaterThan(50);
    expect(entries.filter((e) => e.kind === 'key').length).toBe(api.stats.configKeys - 1);
    expect(entries.filter((e) => e.kind === 'method').length).toBe(api.stats.instanceMethods);
    expect(entries.filter((e) => e.kind === 'event').length).toBe(api.stats.events);
  });

  it('links every entry to an existing page', () => {
    for (const e of entries) {
      const slug = e.href.replace(/^\/docs\//, '').split('#')[0] ?? '';
      expect(findPage(slug), `${e.kind} ${e.title} → ${e.href}`).not.toBeNull();
    }
  });

  it('ranks exact keys, methods and events first', () => {
    const top = (q: string) => searchEntries(entries, q)[0]?.items[0];
    expect(top('autoRotate')?.title).toBe('autoRotate');
    expect(top('flyTo')?.title).toBe('flyTo()');
    expect(top('countryClick')?.title).toBe('countryClick');
    expect(top('dotted.clickRipple')?.href).toContain('/docs/kinds/dotted#config-dotted-clickRipple');
    expect(top('Installation')?.title).toBe('Installation');
  });

  it('requires every token to match', () => {
    expect(searchEntries(entries, 'zzzz qqqq')).toEqual([]);
    const groups = searchEntries(entries, 'pause hidden');
    expect(groups.flatMap((g) => g.items).some((e) => e.title === 'performance.pauseWhenHidden')).toBe(true);
  });
});
