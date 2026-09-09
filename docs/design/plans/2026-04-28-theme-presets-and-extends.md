# Theme Presets Registry + `extends` Implementation Plan

**Goal:** Ship 5 named theme presets bundled with the library + `extends` token inheritance + string shorthand `theme: 'outline-sunset'`, so users get a proper preset registry and can build custom themes on top of curated bases.

**Architecture:** A frozen registry `THEME_PRESETS: Record<ThemePresetName, TokenSet>` lives in `theme/presets.ts`. `ThemeConfig` gains optional `extends?: ThemePresetName`; the resolver uses the named preset's tokens as the merge floor (instead of `DEFAULT_TOKENS`) when `extends` is set. The public `theme` config field accepts `ThemeInput = ThemePresetName | ThemeConfig` — a string is shorthand for `{ extends: name }`. Resolver remains pure and frozen-output; presets are deeply immutable.

**Tech Stack:** TypeScript strict (`exactOptionalPropertyTypes: true`), Vitest, no new runtime deps.

---

## Why this scope

After the v0.2 token foundation (just merged to `main`), the demo had to declare `sunset` and `cyber` themes inline because there was no preset registry to draw from. This plan moves those + 3 more curated presets into the library, making them part of the public API. Users will be able to do:

```ts
createGlobe({ container, theme: 'outline-sunset' });

// or extend with overrides
createGlobe({
  container,
  theme: { extends: 'outline-cyber', tokens: { 'borders.width': 3 } },
});
```

Out of scope (separate later plans): light/dark variants per preset, runtime preset switching with smooth transitions, plugin-published preset packages, and presets keyed to specific styles other than outline (those come when their styles are built — dotted, paper, hologram).

---

## File structure

**New files:**

- `packages/core/src/theme/presets.ts` — `ThemePresetName` union + `THEME_PRESETS` registry of 5 frozen TokenSets

**Modified files:**

- `packages/core/src/theme/types.ts` — add `extends?` to `ThemeConfig`; add `ThemeInput` union (`ThemePresetName | ThemeConfig`)
- `packages/core/src/theme/resolver.ts` — accept `ThemeInput`, dispatch on string vs object, resolve floor from preset
- `packages/core/src/theme/__tests__/resolver.test.ts` — add tests for `extends`, string shorthand, preset coverage
- `packages/core/src/theme/index.ts` — re-export `THEME_PRESETS`, `ThemePresetName`, `ThemeInput`
- `packages/core/src/index.ts` — re-export the new symbols from public surface
- `packages/core/src/types.ts` — change `GlobeConfig.theme?: ThemeConfig` → `ThemeInput`
- `packages/core/src/globe.ts` — pass `config.theme` directly to resolver (no signature change in our call site, types just widen)
- `examples/vanilla-demo/src/main.ts` — replace inline theme definitions with shorthand `theme: 'outline-sunset'` etc., add 5 buttons (one per preset)
- `examples/vanilla-demo/index.html` — bump button count to 5
- `FEATURES.md` — flip status flags for built-in presets and `extends`

---

## Task 1: Define preset registry and types

**Files:**
- Create: `packages/core/src/theme/presets.ts`

- [ ] **Step 1: Write `theme/presets.ts`**

Path: `packages/core/src/theme/presets.ts`

```ts
import type { TokenSet } from './types';

/**
 * Names of built-in theme presets. v0.2.x ships 5 outline-style presets;
 * future plans will add presets for dotted, paper, hologram etc.
 */
export type ThemePresetName =
  | 'outline-dark'
  | 'outline-light'
  | 'outline-sunset'
  | 'outline-cyber'
  | 'outline-monochrome';

/**
 * Frozen registry of built-in presets. Each preset is a complete TokenSet —
 * `resolveTheme()` uses it as the merge floor when `extends` is set.
 */
export const THEME_PRESETS: Readonly<Record<ThemePresetName, TokenSet>> = Object.freeze({
  'outline-dark': Object.freeze({
    'background.color': '#000010',
    'globe.surface': '#0b1d3a',
    'globe.surfaceTexture': '',
    'borders.color': '#4a9eff',
    'borders.width': 1,
    'borders.opacity': 0.85,
    'markers.defaultColor': '#ff4444',
    'atmosphere.color': '#4a9eff',
    'atmosphere.intensity': 1.2,
  }),
  'outline-light': Object.freeze({
    'background.color': '#f0f4f8',
    'globe.surface': '#dde7f0',
    'globe.surfaceTexture': '',
    'borders.color': '#3870b0',
    'borders.width': 1,
    'borders.opacity': 0.9,
    'markers.defaultColor': '#d9534f',
    'atmosphere.color': '#a8c8e8',
    'atmosphere.intensity': 0.8,
  }),
  'outline-sunset': Object.freeze({
    'background.color': '#180a1a',
    'globe.surface': '#3a1f3f',
    'globe.surfaceTexture': '',
    'borders.color': '#ffb070',
    'borders.width': 1,
    'borders.opacity': 0.85,
    'markers.defaultColor': '#ffd166',
    'atmosphere.color': '#ff7e5f',
    'atmosphere.intensity': 1.6,
  }),
  'outline-cyber': Object.freeze({
    'background.color': '#000814',
    'globe.surface': '#0a0a14',
    'globe.surfaceTexture': '',
    'borders.color': '#00f0ff',
    'borders.width': 1,
    'borders.opacity': 1,
    'markers.defaultColor': '#22ee99',
    'atmosphere.color': '#ff2bd6',
    'atmosphere.intensity': 1.4,
  }),
  'outline-monochrome': Object.freeze({
    'background.color': '#0a0a0a',
    'globe.surface': '#1a1a1a',
    'globe.surfaceTexture': '',
    'borders.color': '#cccccc',
    'borders.width': 1,
    'borders.opacity': 0.85,
    'markers.defaultColor': '#ffffff',
    'atmosphere.color': '#888888',
    'atmosphere.intensity': 0.9,
  }),
});
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @globiojs/core typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/theme/presets.ts
git commit -m "feat(core): theme presets registry (5 outline variants)"
```

---

## Task 2: Add `extends` to ThemeConfig and define ThemeInput union

**Files:**
- Modify: `packages/core/src/theme/types.ts`

- [ ] **Step 1: Update `theme/types.ts`**

Append to the file (after the existing `ThemeConfig` and `ResolvedTokens` types):

```ts
import type { ThemePresetName } from './presets';

// ... existing types stay above ...

// Replace the existing ThemeConfig with this version that adds `extends`:
```

Then **replace** the existing `ThemeConfig` block:

```ts
export interface ThemeConfig {
  readonly extends?: ThemePresetName;
  readonly tokens?: PartialTokenSet;
}
```

And **add** a new `ThemeInput` type at the end of the file:

```ts
/**
 * Public theme entry point. Accepts either a preset name (shorthand)
 * or a full ThemeConfig object.
 */
export type ThemeInput = ThemePresetName | ThemeConfig;
```

Final file structure (verify after edit):

```ts
import type { ThemePresetName } from './presets';

export type TokenKey = /* ... unchanged ... */;
export interface TokenSet { /* ... unchanged ... */ }
export type PartialTokenSet = Partial<TokenSet>;

export interface ThemeConfig {
  readonly extends?: ThemePresetName;
  readonly tokens?: PartialTokenSet;
}

export type ResolvedTokens = TokenSet;

export type ThemeInput = ThemePresetName | ThemeConfig;
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @globiojs/core typecheck
```

Expected: zero errors. (Resolver will still typecheck because its existing param type `ThemeConfig` remains valid; we'll widen it in Task 3.)

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/theme/types.ts
git commit -m "feat(core): theme types support extends + ThemeInput shorthand"
```

---

## Task 3: Extend `resolveTheme()` to handle `extends` and string shorthand (TDD)

**Files:**
- Modify: `packages/core/src/theme/__tests__/resolver.test.ts`
- Modify: `packages/core/src/theme/resolver.ts`

- [ ] **Step 1: Add failing tests for `extends` and shorthand**

Append to `packages/core/src/theme/__tests__/resolver.test.ts` (after the existing `describe('resolveTheme', ...)` block) — the new cases live in their own `describe` block for clarity:

```ts
import { THEME_PRESETS } from '../presets';

describe('resolveTheme: extends + shorthand', () => {
  it('uses preset tokens as floor when extends is set', () => {
    const result = resolveTheme({ extends: 'outline-sunset' });
    expect(result['borders.color']).toBe(THEME_PRESETS['outline-sunset']['borders.color']);
    expect(result['atmosphere.intensity']).toBe(
      THEME_PRESETS['outline-sunset']['atmosphere.intensity']
    );
  });

  it('overrides preset tokens with user tokens (extends + tokens)', () => {
    const result = resolveTheme({
      extends: 'outline-sunset',
      tokens: { 'borders.width': 3 },
    });
    // override applied:
    expect(result['borders.width']).toBe(3);
    // preset value preserved for non-overridden token:
    expect(result['borders.color']).toBe(THEME_PRESETS['outline-sunset']['borders.color']);
  });

  it('accepts string input as shorthand for { extends: name }', () => {
    const direct = resolveTheme({ extends: 'outline-cyber' });
    const shorthand = resolveTheme('outline-cyber');
    expect(shorthand).toEqual(direct);
  });

  it('every preset has every token key', () => {
    const expectedKeys = Object.keys(THEME_PRESETS['outline-dark']).sort();
    for (const name of Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>) {
      const keys = Object.keys(THEME_PRESETS[name]).sort();
      expect(keys).toEqual(expectedKeys);
    }
  });

  it('THEME_PRESETS is frozen', () => {
    expect(Object.isFrozen(THEME_PRESETS)).toBe(true);
    expect(Object.isFrozen(THEME_PRESETS['outline-dark'])).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

```bash
pnpm --filter @globiojs/core test
```

Expected: 3 of the 5 new tests fail (extends/shorthand can't work yet because resolver doesn't accept string and doesn't read presets); 2 pass (frozen check + key-coverage check, since those only depend on the registry).

- [ ] **Step 3: Update resolver implementation**

Replace the contents of `packages/core/src/theme/resolver.ts` with:

```ts
import { DEFAULT_TOKENS } from './tokens';
import { THEME_PRESETS } from './presets';
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
  const floor: TokenSet = config.extends !== undefined ? THEME_PRESETS[config.extends] : DEFAULT_TOKENS;

  const overrides = config.tokens;
  if (!overrides) return floor;

  const next = { ...floor } as Record<string, TokenSet[keyof TokenSet]>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) next[key] = value;
  }
  return Object.freeze(next) as unknown as ResolvedTokens;
};
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
pnpm --filter @globiojs/core test
```

Expected: all 12 tests pass (7 existing + 5 new).

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @globiojs/core typecheck
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/theme/resolver.ts packages/core/src/theme/__tests__/resolver.test.ts
git commit -m "feat(core): resolveTheme handles extends + string shorthand"
```

---

## Task 4: Public exports — `theme/index.ts` and core `index.ts`

**Files:**
- Modify: `packages/core/src/theme/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Update `theme/index.ts`**

Replace the entire contents of `packages/core/src/theme/index.ts` with:

```ts
export { resolveTheme } from './resolver';
export { DEFAULT_TOKENS } from './tokens';
export { THEME_PRESETS } from './presets';
export type { ThemePresetName } from './presets';
export type {
  PartialTokenSet,
  ResolvedTokens,
  ThemeConfig,
  ThemeInput,
  TokenKey,
  TokenSet,
} from './types';
```

- [ ] **Step 2: Update core `index.ts`**

In `packages/core/src/index.ts`, find the existing theme re-export block:

```ts
export {
  DEFAULT_TOKENS,
  resolveTheme,
  type PartialTokenSet,
  type ResolvedTokens,
  type ThemeConfig,
  type TokenKey,
  type TokenSet,
} from './theme';
```

Replace with:

```ts
export {
  DEFAULT_TOKENS,
  THEME_PRESETS,
  resolveTheme,
  type PartialTokenSet,
  type ResolvedTokens,
  type ThemeConfig,
  type ThemeInput,
  type ThemePresetName,
  type TokenKey,
  type TokenSet,
} from './theme';
```

- [ ] **Step 3: Build to verify exports**

```bash
pnpm --filter @globiojs/core build
```

Expected: clean build, `dist/index.d.ts` mentions `ThemePresetName`, `ThemeInput`, `THEME_PRESETS`.

Quick check:

```bash
grep -c "ThemePresetName\|THEME_PRESETS\|ThemeInput" packages/core/dist/index.d.ts
```

Expected: at least 3 hits.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/theme/index.ts packages/core/src/index.ts
git commit -m "feat(core): export THEME_PRESETS, ThemePresetName, ThemeInput"
```

---

## Task 5: Update `GlobeConfig.theme` to accept `ThemeInput`

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Widen `GlobeConfig.theme` type**

In `packages/core/src/types.ts`:

1. Replace the import line:

```ts
import type { ThemeConfig } from './theme/types';
```

with:

```ts
import type { ThemeInput } from './theme/types';
```

2. In the `GlobeConfig` interface, change:

```ts
readonly theme?: ThemeConfig;
```

to:

```ts
readonly theme?: ThemeInput;
```

- [ ] **Step 2: Verify `globe.ts` still compiles (no change expected)**

`globe.ts` calls `resolveTheme(config.theme)`. Since the resolver now accepts `ThemeInput | undefined` (Task 3), it auto-handles the wider type. No edits to globe.ts.

```bash
pnpm --filter @globiojs/core typecheck
```

Expected: zero errors.

- [ ] **Step 3: Build**

```bash
pnpm --filter @globiojs/core build
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat(core): GlobeConfig.theme accepts string preset shorthand"
```

---

## Task 6: Update vanilla demo to use built-in presets

**Files:**
- Modify: `examples/vanilla-demo/src/main.ts`
- Modify: `examples/vanilla-demo/index.html`

- [ ] **Step 1: Bump button count in `index.html`**

Replace the existing 3-button row inside `#hud` with 5 buttons:

```html
<div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">
  <button data-theme="outline-dark" style="padding: 4px 8px; cursor: pointer;">Dark</button>
  <button data-theme="outline-light" style="padding: 4px 8px; cursor: pointer;">Light</button>
  <button data-theme="outline-sunset" style="padding: 4px 8px; cursor: pointer;">Sunset</button>
  <button data-theme="outline-cyber" style="padding: 4px 8px; cursor: pointer;">Cyber</button>
  <button data-theme="outline-monochrome" style="padding: 4px 8px; cursor: pointer;">Mono</button>
</div>
```

- [ ] **Step 2: Replace `main.ts` to use shorthand**

Replace the entire contents of `examples/vanilla-demo/src/main.ts` with:

```ts
import {
  createGlobe,
  type GlobeInstance,
  type ThemePresetName,
} from '@globiojs/core';

const container = document.getElementById('app');
const status = document.getElementById('status');
if (!container) throw new Error('#app not found');

let globe: GlobeInstance | undefined;

const buildGlobe = (themeName: ThemePresetName): void => {
  globe?.destroy();
  globe = createGlobe({
    container,
    theme: themeName,
    countries: {
      resolution: 'low',
      style: 'borders',
      hoverEnabled: true,
    },
    atmosphere: { enabled: true },
    autoRotate: { enabled: true, speed: 0.4 },
    markers: [
      { id: 'waw', position: [52.2297, 21.0122] },
      { id: 'nyc', position: [40.7128, -74.006] },
      { id: 'tyo', position: [35.6762, 139.6503] },
      { id: 'syd', position: [-33.8688, 151.2093] },
    ],
  });

  globe.on('ready', () => {
    if (status) status.textContent = `Theme: ${themeName}`;
  });
  globe.on('error', (err) => {
    if (status) status.textContent = `Błąd: ${err.message}`;
  });
  globe.on('markerClick', ({ marker }) => {
    if (status) status.textContent = `Kliknięto marker: ${marker.id}`;
  });

  globe.mount();
};

buildGlobe('outline-dark');

document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset['theme'] as ThemePresetName;
    buildGlobe(name);
  });
});

window.addEventListener('beforeunload', () => globe?.destroy());
```

- [ ] **Step 3: Rebuild core (demo consumes `dist/`)**

```bash
pnpm --filter @globiojs/core build
```

Expected: clean build.

- [ ] **Step 4: Manual visual verification**

The dev server should already be running on http://localhost:5173/ (otherwise: `pnpm --filter vanilla-demo dev`). Hard-reload the page (⌘⇧R). Verify:

- Default load: dark theme (matches v0.2 baseline)
- "Light" → bright pale-blue globe, dark-blue borders, soft pink atmosphere
- "Sunset" → matches the sunset look from v0.2
- "Cyber" → matches the cyber look from v0.2
- "Mono" → black globe, light-grey borders, neutral atmosphere
- HUD status text updates with the preset name on each click
- No console errors

- [ ] **Step 5: Commit**

```bash
git add examples/vanilla-demo/src/main.ts examples/vanilla-demo/index.html
git commit -m "feat(demo): use built-in theme presets via shorthand syntax"
```

---

## Task 7: Update FEATURES.md status flags

**Files:**
- Modify: `FEATURES.md`

- [ ] **Step 1: Mark presets registry built**

In `FEATURES.md` find the line:

```
- **Built-in theme presets** `[v1·GLOBAL·S]` — 6 nazwanych zestawów (po 1-2 per styl):
  `outline-dark`, `outline-light`, `dotted-blue`, `dotted-monochrome`, `paper-classic`, `hologram-teal`...
```

Replace with:

```
- **Built-in theme presets** `[v1·GLOBAL·S·built]` — v0.2.x ships 5 outline-style presets:
  `outline-dark`, `outline-light`, `outline-sunset`, `outline-cyber`, `outline-monochrome`. Presety dla
  pozostałych stylów (dotted, paper, hologram) dochodzą wraz z ich implementacją.
```

- [ ] **Step 2: Mark `extends` built**

Find:

```
- **Theme `extends` (inherit from named preset)** `[v1·GLOBAL·S]` — `theme: { extends: 'dotted-blue', tokens: { 'markers.defaultColor': '#f00' } }`. Wymaga presets registry.
```

Replace with:

```
- **Theme `extends` (inherit from named preset)** `[v1·GLOBAL·S·built]` — `theme: { extends: 'outline-cyber', tokens: { 'markers.defaultColor': '#f00' } }`. Skrót: `theme: 'outline-cyber'`.
```

- [ ] **Step 3: Commit**

```bash
git add FEATURES.md
git commit -m "docs: mark theme presets + extends as built in v0.2.x"
```

---

## Task 8: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Workspace tests**

```bash
pnpm test
```

Expected: 12 tests pass in `@globiojs/core` (7 from v0.2 + 5 added in Task 3).

- [ ] **Step 2: Workspace build**

```bash
pnpm build
```

Expected: 5/5 packages build clean.

- [ ] **Step 3: Workspace typecheck**

```bash
pnpm typecheck
```

Expected: 5/5 packages clean.

- [ ] **Step 4: Branch summary**

```bash
git log --oneline main..HEAD
```

Expected: ~7 commits (one per task except Task 8).

---

## Self-review notes (already applied)

1. **Spec coverage:** Plan covers FEATURES.md §4.1 *Built-in theme presets* and *Theme `extends`* — both flip to `[built]`. Light/dark variants (`v1.x`) and live transition (`v1.x`) remain deferred.
2. **Placeholder scan:** No "TBD"/"implement later"/"add error handling". Every code block is the literal content to write.
3. **Type consistency:** `ThemePresetName` defined in Task 1, used in Tasks 2, 3, 4, 5, 6. `ThemeInput` defined in Task 2, used in Tasks 3, 4, 5. `THEME_PRESETS` defined in Task 1, used in Tasks 3 (resolver + tests) and 4 (exports). All names match across tasks.
4. **Scope check:** Single subsystem (theme presets registry as natural extension of v0.2 token foundation). 8 tasks, ~3-5 working days for solo dev.
