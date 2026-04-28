import { DEFAULT_TOKENS } from './tokens';
import { THEME_PRESETS } from './presets';
import { getCustomPreset } from './registry';
import type { ResolvedTokens, ThemeConfig, ThemeInput, TokenSet } from './types';

/**
 * Resolve a theme input to a fully populated, frozen TokenSet.
 *
 * Merge order: floor < user tokens
 *   floor = THEME_PRESETS[extends]  if `extends` is set
 *   floor = DEFAULT_TOKENS          otherwise
 *
 * String input is shorthand for `{ extends: name }`.
 * `undefined` overrides are ignored (treated as "use floor value").
 */
export const resolveTheme = (input?: ThemeInput): ResolvedTokens => {
  if (input === undefined) return DEFAULT_TOKENS;

  const config: ThemeConfig = typeof input === 'string' ? { extends: input } : input;
  let floor: TokenSet = DEFAULT_TOKENS;
  if (config.extends !== undefined) {
    // Custom presets shadow built-ins so apps can rebrand 'outline-dark'
    // without forking the library.
    const fromCustom = getCustomPreset(config.extends);
    const fromBuiltIn = (THEME_PRESETS as Readonly<Record<string, TokenSet | undefined>>)[
      config.extends
    ];
    floor = fromCustom ?? fromBuiltIn ?? DEFAULT_TOKENS;
  }

  const overrides = config.tokens;
  if (!overrides) return floor;

  const next = { ...floor } as Record<string, TokenSet[keyof TokenSet]>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) next[key] = value;
  }
  return Object.freeze(next) as unknown as ResolvedTokens;
};
