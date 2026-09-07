import type { ApiEntry, ApiJson } from '@/docs/generated/api-types';

const typeMembers = (api: ApiJson, name: string, seen = new Set<string>()): ReadonlyArray<ApiEntry> => {
  if (seen.has(name)) return [];
  seen.add(name);
  const type = api.types[name];
  if (type?.kind === 'alias') {
    return (type.type.match(/\b[A-Z]\w*\b/g) ?? []).flatMap((reference) => typeMembers(api, reference, seen));
  }
  if (type?.kind !== 'interface') return [];
  return [...type.members, ...type.extends.flatMap((base) => typeMembers(api, base, seen))];
};

const findMember = (api: ApiJson, entries: ReadonlyArray<ApiEntry>, segments: ReadonlyArray<string>): ApiEntry | undefined => {
  const [head, ...rest] = segments;
  if (!head) return undefined;
  const array = head.endsWith('[]');
  const entry = entries.find((candidate) => candidate.name === (array ? head.slice(0, -2) : head));
  if (!entry || (array && !entry.items)) return undefined;
  if (rest.length === 0) return entry;
  if (array) return findMember(api, typeMembers(api, entry.items!), rest);
  if (entry.children) return findMember(api, entry.children, rest);
  const names = entry.ref ? [entry.ref] : entry.type.match(/\b[A-Z]\w*\b/g) ?? [];
  for (const name of names) {
    const found = findMember(api, typeMembers(api, name), rest);
    if (found) return found;
  }
  return undefined;
};

/** Resolve GlobeConfig fields, including array elements such as `arcs[].height`. */
export const findConfigTipEntry = (api: ApiJson, path: string): ApiEntry | undefined =>
  findMember(api, api.config, path.split('.'));

/** Resolve an imperative API option such as `FocusOptions.padding`. */
export const findTypeTipEntry = (api: ApiJson, path: string): ApiEntry | undefined => {
  const [name, ...rest] = path.split('.');
  return name ? findMember(api, typeMembers(api, name), rest) : undefined;
};
