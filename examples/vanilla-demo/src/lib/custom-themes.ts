import {
  registerThemePreset,
  unregisterThemePreset,
  type PartialTokenSet,
  type ThemePresetName,
} from '@your-globe/core';

/**
 * User-saved custom theme. Stored in localStorage as JSON, registered
 * with the core's theme system on app boot so the rest of the demo can
 * select them by `id` like any other built-in preset.
 *
 * `extends` is the built-in preset the user based their custom on; the
 * demo passes BOTH (extends + tokens) into core via `registerThemePreset`
 * — extends is informational metadata for the UI, the actual rendering
 * uses tokens layered onto DEFAULT_TOKENS by the resolver.
 */
export interface CustomTheme {
  /** Unique id, also used as the `theme: ThemePresetName` value. */
  readonly id: string;
  /** Display name shown in dropdowns. */
  readonly name: string;
  /** Built-in preset the custom is based on (informational). */
  readonly extends: ThemePresetName;
  /** Token overrides. */
  readonly tokens: PartialTokenSet;
  /** Created-at timestamp (sort newest first in dropdown). */
  readonly createdAt: number;
}

const STORAGE_KEY = 'globio-custom-themes';
const ID_PREFIX = 'custom-';

/**
 * Read every saved custom theme from localStorage. Returns [] if the
 * key is missing, the JSON is malformed, or storage is unavailable
 * (private mode etc.) — never throws.
 */
export const loadCustomThemes = (): ReadonlyArray<CustomTheme> => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCustomTheme);
  } catch {
    return [];
  }
};

/** Persist the full list to localStorage. */
const writeAll = (themes: ReadonlyArray<CustomTheme>): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
  } catch {
    /* swallow — persistence is best-effort. */
  }
};

/**
 * Add or replace a theme by id. Returns the new full list so callers
 * can re-render dropdowns immediately without round-tripping.
 */
export const saveCustomTheme = (theme: CustomTheme): ReadonlyArray<CustomTheme> => {
  const all = loadCustomThemes().filter((t) => t.id !== theme.id);
  const next = [theme, ...all];
  writeAll(next);
  registerThemePreset(theme.id, theme.tokens);
  return next;
};

export const deleteCustomTheme = (id: string): ReadonlyArray<CustomTheme> => {
  const next = loadCustomThemes().filter((t) => t.id !== id);
  writeAll(next);
  unregisterThemePreset(id);
  return next;
};

/**
 * Register every previously-saved custom theme with the core's theme
 * system. Call once at app boot before any `setTheme` call so saved
 * themes are visible to the resolver from the first paint.
 */
export const bootstrapCustomThemes = (): ReadonlyArray<CustomTheme> => {
  const all = loadCustomThemes();
  for (const theme of all) registerThemePreset(theme.id, theme.tokens);
  return all;
};

/** Generate a fresh unique id from the user-supplied name. */
export const idFromName = (name: string): string => {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'theme';
  // Avoid collisions by appending a short suffix when the slug already
  // exists in storage. Keeps ids stable for the typical "create once"
  // flow but doesn't trip when users name two themes "dark".
  const taken = new Set(loadCustomThemes().map((t) => t.id));
  if (!taken.has(`${ID_PREFIX}${slug}`)) return `${ID_PREFIX}${slug}`;
  let suffix = 2;
  while (taken.has(`${ID_PREFIX}${slug}-${suffix}`)) suffix += 1;
  return `${ID_PREFIX}${slug}-${suffix}`;
};

const isCustomTheme = (value: unknown): value is CustomTheme => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['id'] === 'string' &&
    typeof v['name'] === 'string' &&
    typeof v['extends'] === 'string' &&
    typeof v['tokens'] === 'object' &&
    v['tokens'] !== null &&
    typeof v['createdAt'] === 'number'
  );
};
