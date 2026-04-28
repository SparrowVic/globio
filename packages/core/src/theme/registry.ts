import type { PartialTokenSet } from './types';

/**
 * Mutable registry of user-defined theme presets. Lookup order in
 * `resolveTheme(extends)`: custom presets first, built-in `THEME_PRESETS`
 * second. Names colliding with built-ins effectively shadow them — useful
 * for wholesale rebrand without forking the library.
 */
const customPresets = new Map<string, PartialTokenSet>();

/**
 * Register a custom named theme preset. After registration, the name can be
 * used anywhere a built-in preset name is accepted: `theme: 'my-brand'` or
 * `theme: { extends: 'my-brand', tokens: { ... } }`.
 *
 * Pass any subset of tokens; the resolver merges them on top of
 * `DEFAULT_TOKENS`, so you only declare what differs from defaults.
 */
export const registerThemePreset = (name: string, tokens: PartialTokenSet): void => {
  customPresets.set(name, Object.freeze({ ...tokens }));
};

/** Remove a previously-registered custom preset. No-op if absent. */
export const unregisterThemePreset = (name: string): void => {
  customPresets.delete(name);
};

/** Names of all currently registered custom presets. */
export const listCustomPresets = (): ReadonlyArray<string> =>
  Array.from(customPresets.keys());

/** Internal lookup used by the resolver. */
export const getCustomPreset = (name: string): PartialTokenSet | undefined =>
  customPresets.get(name);
