import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { loadApi } from '@/docs/api';
import type { ApiJson } from '@/docs/generated/api-types';
import { DOCS_TABS, pageHref } from '@/docs/manifest';
import { buildApiIndex, buildStaticIndex, searchEntries, type SearchEntry, type SearchKind } from '@/docs/search-index';

export interface DocsSearchProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

const KIND_LABEL: Readonly<Record<SearchKind, string>> = {
  page: 'page',
  feature: 'feature',
  key: 'key',
  method: 'method',
  event: 'event',
  token: 'token',
};

let staticIndex: ReadonlyArray<SearchEntry> | null = null;
let apiIndex: ReadonlyArray<SearchEntry> | null = null;

/**
 * ⌘K search over pages, features, config keys, instance methods and
 * events. The API part of the index is built from api.json the first time
 * the dialog opens; results deep-link to the row or section they name.
 */
export function DocsSearch({ open, onOpenChange }: DocsSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [api, setApi] = useState<ApiJson | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open || api) return undefined;
    setLoadFailed(false);
    let alive = true;
    void loadApi().then((a) => {
      if (alive) setApi(a);
    }).catch(() => {
      if (alive) setLoadFailed(true);
    });
    return () => {
      alive = false;
    };
  }, [open, api]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const entries = useMemo(() => {
    staticIndex ??= buildStaticIndex();
    if (api && !apiIndex) apiIndex = buildApiIndex(api);
    return apiIndex ? [...staticIndex, ...apiIndex] : staticIndex;
  }, [api]);

  const groups = useMemo(() => searchEntries(entries, query), [entries, query]);
  const starters = useMemo(() => DOCS_TABS[0]?.groups[0]?.pages ?? [], []);

  const go = (href: string) => {
    onOpenChange(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search documentation" description="Pages, features, config keys, methods, events and theme tokens" className="docs-search-dialog" shouldFilter={false}>
      <CommandInput placeholder="Search docs — a page, a config key, a method…" value={query} onValueChange={setQuery} />
      <CommandList className="docs-search-list">
        {query.trim() === '' ? (
          <CommandGroup heading="Start here">
            {starters.map((p) => (
              <CommandItem key={p.slug} value={p.slug} onSelect={() => go(pageHref(p.slug))} className="docs-search-item">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{p.title}</span>
                  <span className="truncate text-[0.74rem] opacity-60">{p.summary}</span>
                </span>
                <span className="docs-search-kind">page</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : (
          <>
            <CommandEmpty>No matches. Try a config key such as autoRotate, a method such as flyTo, or a kind such as dotted.</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g.kind} heading={g.label}>
                {g.items.map((item) => (
                  <CommandItem key={`${g.kind}:${item.href}:${item.title}`} value={`${g.kind}:${item.href}:${item.title}`} onSelect={() => go(item.href)} className="docs-search-item">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={g.kind === 'page' || g.kind === 'feature' ? 'truncate' : 'docs-search-code truncate'}>{item.title}</span>
                      <span className="truncate text-[0.74rem] opacity-60">{item.subtitle}</span>
                    </span>
                    <span className="docs-search-kind">{KIND_LABEL[g.kind]}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            {!api && <p className="docs-search-loading" role="status">{loadFailed ? 'API search could not load. Pages and theme tokens are still available; reopen search to retry.' : 'Loading config keys, methods and events…'}</p>}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
