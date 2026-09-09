import { resolveTheme, type PartialTokenSet, type ThemeInput, type TokenSet } from '@your-globe/core';

/**
 * New themes retain their entire base, including tokens outside the small editor.
 * Existing themes use the registry's actual DEFAULT_TOKENS + stored-token merge,
 * so editing an older partial save does not change its current appearance.
 */
export const createStudioThemeDraft = (base: ThemeInput, storedTokens?: PartialTokenSet): TokenSet => ({
  ...resolveTheme(storedTokens === undefined ? base : { tokens: storedTokens }),
});
