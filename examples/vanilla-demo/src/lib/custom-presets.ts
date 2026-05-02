import type { ConfiguratorState } from '@/configurator/types';

/**
 * User-saved preset — full snapshot of `ConfiguratorState` minus the
 * tracking fields (lastPresetId / dirtySincePreset) so applying a
 * preset doesn't carry a stale "dirty since X" flag with it.
 */
export interface CustomPreset {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly state: Omit<ConfiguratorState, 'lastPresetId' | 'dirtySincePreset'>;
}

const STORAGE_KEY = 'globio-custom-presets';
const ID_PREFIX = 'preset-';

export const loadCustomPresets = (): ReadonlyArray<CustomPreset> => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomPreset);
  } catch {
    return [];
  }
};

const writeAll = (presets: ReadonlyArray<CustomPreset>): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* swallow. */
  }
};

export const saveCustomPreset = (preset: CustomPreset): ReadonlyArray<CustomPreset> => {
  const all = loadCustomPresets().filter((p) => p.id !== preset.id);
  const next = [preset, ...all];
  writeAll(next);
  return next;
};

export const deleteCustomPreset = (id: string): ReadonlyArray<CustomPreset> => {
  const next = loadCustomPresets().filter((p) => p.id !== id);
  writeAll(next);
  return next;
};

/**
 * Build a `CustomPreset` from the current configurator state. Strips
 * lastPresetId / dirtySincePreset tracking fields — when the preset is
 * later applied, those get reset by `applyPreset` itself.
 */
export const presetFromState = (
  name: string,
  state: ConfiguratorState
): CustomPreset => {
  const { lastPresetId: _lastPresetId, dirtySincePreset: _dirty, ...rest } = state;
  return {
    id: idFromName(name),
    name: name.trim(),
    createdAt: Date.now(),
    state: rest,
  };
};

export const idFromName = (name: string): string => {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'preset';
  const taken = new Set(loadCustomPresets().map((p) => p.id));
  if (!taken.has(`${ID_PREFIX}${slug}`)) return `${ID_PREFIX}${slug}`;
  let suffix = 2;
  while (taken.has(`${ID_PREFIX}${slug}-${suffix}`)) suffix += 1;
  return `${ID_PREFIX}${slug}-${suffix}`;
};

const isCustomPreset = (value: unknown): value is CustomPreset => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['name'] === 'string' &&
    typeof v['createdAt'] === 'number' &&
    typeof v['state'] === 'object' &&
    v['state'] !== null
  );
};
