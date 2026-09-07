import { FEATURES } from './features';
import type { ApiEntry, ApiJson } from './generated/api-types';
import { DOCS_TABS, pageHref } from './manifest';

export type SearchKind = 'page' | 'feature' | 'key' | 'method' | 'event';

export interface SearchEntry {
  readonly kind: SearchKind;
  readonly title: string;
  readonly subtitle: string;
  readonly href: string;
  /** Extra text that counts for matching but is not shown. */
  readonly keywords: string;
}

export const SEARCH_GROUPS: ReadonlyArray<{ readonly kind: SearchKind; readonly label: string; readonly limit: number }> = [
  { kind: 'page', label: 'Pages', limit: 6 },
  { kind: 'feature', label: 'Features', limit: 5 },
  { kind: 'key', label: 'Config keys', limit: 8 },
  { kind: 'method', label: 'Methods', limit: 5 },
  { kind: 'event', label: 'Events', limit: 4 },
];

const KIND_KEYS = new Set(['outline', 'dotted', 'wireframe', 'hologram', 'paper', 'cinematic']);

const firstSentence = (text: string): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  const m = /^(.*?[.!?])(\s|$)/.exec(flat);
  return (m ? m[1] : flat).slice(0, 140);
};

/** Pages and features: always available, no data to load. */
export const buildStaticIndex = (): ReadonlyArray<SearchEntry> => {
  const pages = DOCS_TABS.flatMap((tab) =>
    tab.groups.flatMap((group) =>
      group.pages.map<SearchEntry>((p) => ({
        kind: 'page',
        title: p.title,
        subtitle: p.summary,
        href: pageHref(p.slug),
        keywords: `${tab.label} ${group.label} ${p.eyebrow ?? ''} ${p.slug}`,
      })),
    ),
  );
  const features = FEATURES.map<SearchEntry>((f) => ({
    kind: 'feature',
    title: f.title,
    subtitle: f.summary,
    href: pageHref(f.docs.slug) + (f.docs.anchor ? `#${f.docs.anchor}` : ''),
    keywords: [...(f.configPaths ?? []), ...(f.methods ?? []), ...(f.events ?? []), f.id].join(' '),
  }));
  return [...pages, ...features];
};

/** Where a config key is documented: kind keys on their kind page, the rest on the GlobeConfig page. */
export const keyHref = (entry: ApiEntry): string => {
  const top = entry.path.split('.')[0] ?? entry.path;
  const anchor = `config-${entry.path.replace(/\./g, '-')}${entry.children ? '' : '-row'}`;
  return KIND_KEYS.has(top) ? `${pageHref(`kinds/${top}`)}#${anchor}` : `${pageHref('api/globe-config')}#${anchor}`;
};

/** Config keys, methods and events from api.json. */
export const buildApiIndex = (api: ApiJson): ReadonlyArray<SearchEntry> => {
  const keys: SearchEntry[] = [];
  const walk = (entries: ReadonlyArray<ApiEntry>) => {
    for (const e of entries) {
      if (e.name !== 'container') {
        keys.push({
          kind: 'key',
          title: e.path,
          subtitle: e.description ? firstSentence(e.description) : e.type,
          href: keyHref(e),
          keywords: `${e.type} ${e.default ?? ''}`,
        });
      }
      if (e.children) walk(e.children);
    }
  };
  walk(api.config);
  const methods = api.instance.map<SearchEntry>((m) => ({
    kind: 'method',
    title: `${m.name}()`,
    subtitle: m.description ? firstSentence(m.description) : m.signature,
    href: `${pageHref('api/globe-instance')}#method-${m.name}`,
    keywords: m.signature,
  }));
  const events = api.events.map<SearchEntry>((e) => ({
    kind: 'event',
    title: e.name,
    subtitle: e.description ? firstSentence(e.description) : e.payload,
    href: `${pageHref('api/events')}#event-${e.name}`,
    keywords: e.payload,
  }));
  return [...keys, ...methods, ...events];
};

const score = (entry: SearchEntry, tokens: ReadonlyArray<string>, query: string): number => {
  const title = entry.title.toLowerCase();
  const subtitle = entry.subtitle.toLowerCase();
  const keywords = entry.keywords.toLowerCase();
  const all = `${title} ${subtitle} ${keywords}`;
  if (!tokens.every((t) => all.includes(t))) return 0;
  let s = 0;
  if (title === query) s += 100;
  else if (title.replace(/\(\)$/, '') === query) s += 95;
  else if (title.startsWith(query)) s += 70;
  else if (title.includes(query)) s += 45;
  else if (title.split(/[.\s]/).some((part) => part.startsWith(query))) s += 40;
  if (keywords.includes(query)) s += 20;
  if (subtitle.includes(query)) s += 12;
  s += Math.max(0, 10 - Math.floor(title.length / 8));
  return s;
};

/** Ranked results for a query, grouped by kind and capped per group. */
export const searchEntries = (entries: ReadonlyArray<SearchEntry>, rawQuery: string): ReadonlyArray<{ readonly kind: SearchKind; readonly label: string; readonly items: ReadonlyArray<SearchEntry> }> => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];
  const tokens = query.split(/\s+/).filter(Boolean);
  const scored = entries
    .map((e) => ({ e, s: score(e, tokens, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.title.length - b.e.title.length);
  // Groups are ordered by their best hit, so an exact key or method match leads
  // even though pages come first when the scores tie.
  return SEARCH_GROUPS.map((g) => {
    const hits = scored.filter((x) => x.e.kind === g.kind).slice(0, g.limit);
    return { kind: g.kind, label: g.label, best: hits[0]?.s ?? 0, items: hits.map((x) => x.e) };
  })
    .filter((g) => g.items.length > 0)
    .sort((a, b) => b.best - a.best)
    .map(({ kind, label, items }) => ({ kind, label, items }));
};
