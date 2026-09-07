import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { FrameworkProvider } from '@/components/docs/code/framework-context';
import { describe, expect, it, vi } from 'vitest';
import api from '../generated/api.json';
import { FEATURES } from '../features';
import { DOCS_TABS, findPage, pageHref } from '../manifest';
import { hasDedicatedPage, resolvePage } from '../pages';
import { buildApiIndex, buildStaticIndex } from '../search-index';
import type { ApiJson } from '../generated/api-types';

vi.mock('../api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api')>(),
  useApi: () => api,
}));
vi.mock('@/components/docs/layout/toc-context', () => ({ useTocEntry: () => undefined }));

const slugs = DOCS_TABS.flatMap((tab) => tab.groups.flatMap((group) => group.pages.map((page) => page.slug)));
const pages = new Map(slugs.map((slug) => {
  const location = findPage(slug)!;
  const markup = renderToStaticMarkup(createElement(StaticRouter, {
    location: pageHref(slug),
    children: createElement(FrameworkProvider, { children: createElement(resolvePage(slug), location) }),
  }));
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const links = [...markup.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);
  return [slug, { ids, links }];
}));

const missingTarget = (href: string, currentSlug = ''): string | null => {
  if (!href.startsWith('/docs/') && !href.startsWith('#')) return null;
  const [pathname, anchor] = href.split('#');
  const slug = pathname ? pathname.replace(/^\/docs\//, '') : currentSlug;
  const page = pages.get(slug);
  if (!page) return `Missing page: ${href}`;
  if (anchor && !page.ids.includes(decodeURIComponent(anchor))) return `Missing anchor: ${pageHref(slug)}#${anchor}`;
  return null;
};

describe('rendered documentation links', () => {
  it('renders every manifest page with unique anchors', () => {
    const duplicates: string[] = [];
    for (const [slug, page] of pages) {
      expect(hasDedicatedPage(slug), slug).toBe(true);
      const seen = new Set<string>();
      for (const id of page.ids) {
        if (seen.has(id)) duplicates.push(`${slug}#${id}`);
        seen.add(id);
      }
    }
    expect(duplicates).toEqual([]);
  });

  it('resolves page links, feature tips and search results to rendered sections', () => {
    const missing = new Set<string>();
    const check = (href: string, slug?: string) => {
      const failure = missingTarget(href, slug);
      if (failure) missing.add(failure);
    };
    for (const [slug, page] of pages) for (const href of page.links) check(href, slug);
    for (const feature of FEATURES) check(pageHref(feature.docs.slug) + (feature.docs.anchor ? `#${feature.docs.anchor}` : ''));
    for (const entry of [...buildStaticIndex(), ...buildApiIndex(api as unknown as ApiJson)]) check(entry.href);
    expect([...missing]).toEqual([]);
  });
});
