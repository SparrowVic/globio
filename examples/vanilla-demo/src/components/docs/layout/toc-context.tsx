import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';

export interface TocEntry {
  readonly id: string;
  readonly title: string;
  readonly level: 2 | 3;
}

interface TocContextValue {
  readonly entries: ReadonlyArray<TocEntry>;
  readonly register: (entry: TocEntry) => () => void;
}

const TocContext = createContext<TocContextValue | null>(null);

/**
 * Sections announce themselves here as they mount; the "On this page"
 * column reads the list. Entries are sorted by document position when
 * rendered, so nesting order does not matter at registration time.
 */
export function TocProvider({ children }: { readonly children: ReactNode }) {
  const [entries, setEntries] = useState<ReadonlyArray<TocEntry>>([]);
  const register = useCallback((entry: TocEntry) => {
    setEntries((prev) => [...prev.filter((e) => e.id !== entry.id), entry]);
    return () => setEntries((prev) => prev.filter((e) => e.id !== entry.id));
  }, []);
  const value = useMemo(() => ({ entries, register }), [entries, register]);
  return <TocContext.Provider value={value}>{children}</TocContext.Provider>;
}

export function useToc(): ReadonlyArray<TocEntry> {
  return useContext(TocContext)?.entries ?? [];
}

/** Register a heading for the page outline. No-op outside a provider. */
export function useTocEntry(entry: TocEntry): void {
  const ctx = useContext(TocContext);
  const register = ctx?.register;
  useLayoutEffect(() => {
    if (!register) return undefined;
    return register(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [register, entry.id, entry.title, entry.level]);
}
