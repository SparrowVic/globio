import { DEFAULT_TOKENS } from './tokens';
import type { ResolvedTokens, ThemeConfig, TokenSet } from './types';

/**
 * Resolve a theme config to a fully populated, frozen TokenSet.
 *
 * Merge order: DEFAULT_TOKENS  <  themeConfig.tokens
 *
 * `undefined` overrides are ignored (treated as "use default").
 */
export const resolveTheme = (themeConfig?: ThemeConfig): ResolvedTokens => {
  const overrides = themeConfig?.tokens;
  if (!overrides) return DEFAULT_TOKENS;

  const next = { ...DEFAULT_TOKENS } as Record<string, TokenSet[keyof TokenSet]>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) next[key] = value;
  }
  return Object.freeze(next) as unknown as ResolvedTokens;
};
