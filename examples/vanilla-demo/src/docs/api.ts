import { useEffect, useState } from 'react';
import type { ApiEntry, ApiJson, ApiType } from './generated/api-types';

let loaded: ApiJson | null = null;
let pending: Promise<ApiJson> | null = null;

/**
 * `api.json` is a separate chunk: the guide pages that only show prose do
 * not pay for the reference data. Loaded once, then served from memory.
 */
export const loadApi = (): Promise<ApiJson> => {
  if (loaded) return Promise.resolve(loaded);
  pending ??= import('./generated/api.json').then((m) => {
    loaded = m.default as unknown as ApiJson;
    return loaded;
  }).catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
};

export function useApi(): ApiJson | null {
  const [api, setApi] = useState<ApiJson | null>(loaded);
  useEffect(() => {
    if (api) return undefined;
    let alive = true;
    void loadApi().then((a) => {
      if (alive) setApi(a);
    }).catch(() => { /* The reference loading placeholder displays the failure. */ });
    return () => {
      alive = false;
    };
  }, [api]);
  return api;
}

/** Find a config entry by dot path (`countries.fill.mode`). */
export const findEntry = (entries: ReadonlyArray<ApiEntry>, path: string): ApiEntry | undefined => {
  const [head, ...rest] = path.split('.');
  const entry = entries.find((e) => e.name === head);
  if (!entry) return undefined;
  if (rest.length === 0) return entry;
  return entry.children ? findEntry(entry.children, rest.join('.')) : undefined;
};

export const getType = (api: ApiJson, name: string): ApiType | undefined => api.types[name];

export const configAnchor = (path: string, prefix = 'config'): string => `${prefix}-${path.replace(/\./g, '-')}`;

export const tokenAnchor = (path: string): string => `token-${path.replace(/\./g, '-')}`;

export const countKeys = (entries: ReadonlyArray<ApiEntry>): number => entries.reduce((n, e) => n + 1 + (e.children ? countKeys(e.children) : 0), 0);
