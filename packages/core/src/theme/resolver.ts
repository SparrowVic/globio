import { DEFAULT_TOKENS } from './tokens';
import { THEME_PRESETS } from './presets';
import { getCustomPreset } from './registry';
import type {
  PartialTokenSet,
  ResolvedTokens,
  ThemeConfig,
  ThemeInput,
  TokenSet,
} from './types';

/**
 * Resolve a theme input to a fully populated, frozen TokenSet.
 *
 * Merge order (later wins): DEFAULT_TOKENS < preset overrides < user tokens.
 * Presets are now `Partial<TokenSet>` — they only declare the tokens that
 * matter for their identity, defaults backfill the rest. This keeps preset
 * authors free to ignore tokens belonging to kinds they don't use.
 *
 * String input is shorthand for `{ extends: name }`.
 * `undefined` overrides are ignored (treated as "use floor value").
 */
export const resolveTheme = (input?: ThemeInput): ResolvedTokens => {
  if (input === undefined) return DEFAULT_TOKENS;

  const config: ThemeConfig = typeof input === 'string' ? { extends: input } : input;

  const merged = { ...DEFAULT_TOKENS } as Record<string, TokenSet[keyof TokenSet]>;
  if (config.extends !== undefined) {
    // Custom presets shadow built-ins so apps can rebrand 'outline-dark'
    // without forking the library.
    const fromCustom = getCustomPreset(config.extends);
    const fromBuiltIn = (THEME_PRESETS as Readonly<Record<string, PartialTokenSet | undefined>>)[
      config.extends
    ];
    const presetTokens: PartialTokenSet | undefined = fromCustom ?? fromBuiltIn;
    if (presetTokens) {
      for (const [key, value] of Object.entries(presetTokens)) {
        if (value !== undefined) merged[key] = value as TokenSet[keyof TokenSet];
      }
    }
  }

  const overrides = config.tokens;
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) merged[key] = value;
    }
  }

  return Object.freeze(merged) as unknown as ResolvedTokens;
};
