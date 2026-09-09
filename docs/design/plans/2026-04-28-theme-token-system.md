# Theme Token System Implementation Plan

**Goal:** Build a designerski token system as the colour/style foundation for all current and future GlobioJS styles, then refactor the existing outline rendering to consume tokens (instead of hardcoded config fields).

**Architecture:** Tokens live in a flat namespace with dot-separated keys (`globe.surface`, `borders.color`, `atmosphere.intensity`...). A `resolve(theme?)` function merges user-supplied overrides over `DEFAULT_TOKENS`, producing a frozen `ResolvedTokens` map. `globe.ts` resolves tokens once during `createGlobe()` and passes individual values to renderer layers — layers stay token-unaware. Future plans extend the system: theme presets registry, runtime updates, light/dark variants, custom CSS-var bridge.

**Tech Stack:** TypeScript strict (`exactOptionalPropertyTypes: true`), Vitest (new), Three.js (existing), pnpm/Turborepo monorepo.

---

## Why this scope, not bigger?

This plan covers theme tokens + the existing outline style as proof. It deliberately excludes:

- **Dotted style** — separate plan, builds on this foundation.
- **Theme presets registry** (`'sunset' | 'cyber' | 'paper-classic'`) — separate plan, requires multiple themes' worth of design work.
- **Runtime token updates / animated transitions** — v1.x feature requiring per-layer `updateTokens()` methods.
- **Light/dark variant logic** — needs presets to exist first.

After this plan, every renderer setting that was previously a top-level config field (`globeColor`, `backgroundColor`, `countries.borderColor` etc.) becomes a token. The public API gets a single `theme` entry point; old shortcut fields are removed (acceptable breaking change at v0.x).

---

## File structure

**New files:**

- `packages/core/vitest.config.ts` — Vitest config for the core package
- `packages/core/src/theme/types.ts` — `TokenKey`, `TokenValue`, `TokenSet`, `ThemeConfig`, `ResolvedTokens`
- `packages/core/src/theme/tokens.ts` — `DEFAULT_TOKENS` constant
- `packages/core/src/theme/resolver.ts` — `resolveTheme()` pure function
- `packages/core/src/theme/index.ts` — public re-exports
- `packages/core/src/theme/__tests__/resolver.test.ts` — resolver TDD spec

**Modified files:**

- `packages/core/package.json` — add Vitest devDep + test script
- `packages/core/src/types.ts` — add `theme?: ThemeConfig` to `GlobeConfig`; remove now-token-fied fields (`globeColor`, `textureUrl`, `backgroundColor`; `borderColor`/`borderWidth`/`fillColor`/`hoverColor` from `CountriesConfig`; `color`/`intensity` from `AtmosphereConfig`)
- `packages/core/src/globe.ts` — call `resolveTheme()`, pass token values to layer constructors
- `packages/core/src/index.ts` — export `theme` module surface
- `examples/vanilla-demo/src/main.ts` — switch to `theme` API + 3-button theme switcher
- `FEATURES.md` — mark Theme tokens / Theme override / Built-in theme presets statuses
- (no changes to `renderer/*` files — layers stay token-unaware)

---

## Task 1: Add Vitest to core package

**Files:**
- Modify: `packages/core/package.json`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/theme/__tests__/smoke.test.ts` (temporary, will be replaced in Task 4)

- [ ] **Step 1: Add Vitest as devDep + `test` script**

Edit `packages/core/package.json`. In `scripts`, change `test` (or add) to `vitest run`. In `devDependencies`, add `"vitest": "^1.6.0"`. Final scripts and devDeps section excerpt:

```json
"scripts": {
  "build": "tsup",
  "dev": "tsup --watch",
  "test": "vitest run",
  "typecheck": "tsc --noEmit",
  "clean": "rm -rf dist .turbo"
},
"devDependencies": {
  "@types/d3-geo": "^3.1.0",
  "@types/earcut": "^2.1.4",
  "@types/three": "^0.160.0",
  "@types/topojson-client": "^3.1.4",
  "three": "^0.160.0",
  "tsup": "^8.0.1",
  "typescript": "^5.3.3",
  "vitest": "^1.6.0"
}
```

- [ ] **Step 2: Create `vitest.config.ts`**

Path: `packages/core/vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    typecheck: { enabled: false },
  },
});
```

- [ ] **Step 3: Install Vitest**

Run from repo root:

```bash
pnpm install
```

Expected: pnpm resolves `vitest@^1.6.0`, downloads ~10 packages, no errors.

- [ ] **Step 4: Add a smoke test to verify Vitest runs**

Path: `packages/core/src/theme/__tests__/smoke.test.ts`

```ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke test', () => {
  it('runs', () => {
    expect(2 + 2).toBe(4);
  });
});
```

- [ ] **Step 5: Run the test suite**

```bash
pnpm --filter @globiojs/core test
```

Expected output (excerpt):

```
 ✓ src/theme/__tests__/smoke.test.ts (1)
   ✓ vitest smoke test (1)
     ✓ runs

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/package.json packages/core/vitest.config.ts packages/core/src/theme/__tests__/smoke.test.ts pnpm-lock.yaml
git commit -m "chore(core): add Vitest test runner"
```

---

## Task 2: Define theme types and default tokens

**Files:**
- Create: `packages/core/src/theme/types.ts`
- Create: `packages/core/src/theme/tokens.ts`

(No tests in this task — types are compile-time only; default tokens are exercised by Task 3 resolver tests.)

- [ ] **Step 1: Write `theme/types.ts`**

Path: `packages/core/src/theme/types.ts`

```ts
/**
 * Token keys are dot-namespaced for grouping. v0.2 ships the minimum set
 * needed to retrofit the existing outline renderer.
 */
export type TokenKey =
  | 'background.color'
  | 'globe.surface'
  | 'globe.surfaceTexture'
  | 'borders.color'
  | 'borders.width'
  | 'borders.opacity'
  | 'markers.defaultColor'
  | 'atmosphere.color'
  | 'atmosphere.intensity';

/**
 * All tokens are either a string (color hex/rgb or texture URL) or a number.
 * Texture token uses '' to mean "no texture" — keeps the type simple.
 */
export interface TokenSet {
  readonly 'background.color': string;
  readonly 'globe.surface': string;
  readonly 'globe.surfaceTexture': string;
  readonly 'borders.color': string;
  readonly 'borders.width': number;
  readonly 'borders.opacity': number;
  readonly 'markers.defaultColor': string;
  readonly 'atmosphere.color': string;
  readonly 'atmosphere.intensity': number;
}

export type PartialTokenSet = Partial<TokenSet>;

/**
 * User-supplied theme. v0.2 supports only direct token overrides;
 * `extends` and named presets ship in a future plan.
 */
export interface ThemeConfig {
  readonly tokens?: PartialTokenSet;
}

/** Output of `resolveTheme()` — every key present, deeply readonly. */
export type ResolvedTokens = TokenSet;
```

- [ ] **Step 2: Write `theme/tokens.ts`**

Path: `packages/core/src/theme/tokens.ts`

These defaults match the colors currently hardcoded in `globe.ts` so visual regression is zero.

```ts
import type { TokenSet } from './types';

/**
 * Built-in default tokens. Used as the merge floor by `resolveTheme()`.
 * Values mirror the original hardcoded defaults from globe.ts.
 */
export const DEFAULT_TOKENS: TokenSet = Object.freeze({
  'background.color': '#000010',
  'globe.surface': '#0b1d3a',
  'globe.surfaceTexture': '',
  'borders.color': '#4a9eff',
  'borders.width': 1,
  'borders.opacity': 0.85,
  'markers.defaultColor': '#ff4444',
  'atmosphere.color': '#4a9eff',
  'atmosphere.intensity': 1.2,
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @globiojs/core typecheck
```

Expected: no errors. (No imports yet from the rest of the codebase.)

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/theme/types.ts packages/core/src/theme/tokens.ts
git commit -m "feat(core): theme types and default tokens"
```

---

## Task 3: Implement and test the theme resolver

**Files:**
- Create: `packages/core/src/theme/resolver.ts`
- Create: `packages/core/src/theme/__tests__/resolver.test.ts`
- Delete: `packages/core/src/theme/__tests__/smoke.test.ts` (no longer needed)

- [ ] **Step 1: Write the failing tests**

Path: `packages/core/src/theme/__tests__/resolver.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { resolveTheme } from '../resolver';
import { DEFAULT_TOKENS } from '../tokens';

describe('resolveTheme', () => {
  it('returns DEFAULT_TOKENS when no theme provided', () => {
    expect(resolveTheme()).toEqual(DEFAULT_TOKENS);
  });

  it('returns DEFAULT_TOKENS when theme has no tokens', () => {
    expect(resolveTheme({})).toEqual(DEFAULT_TOKENS);
  });

  it('overrides individual tokens', () => {
    const result = resolveTheme({ tokens: { 'globe.surface': '#ff0000' } });
    expect(result['globe.surface']).toBe('#ff0000');
    expect(result['background.color']).toBe(DEFAULT_TOKENS['background.color']);
  });

  it('overrides multiple tokens at once', () => {
    const result = resolveTheme({
      tokens: {
        'globe.surface': '#abcdef',
        'borders.width': 3,
        'atmosphere.intensity': 2.5,
      },
    });
    expect(result['globe.surface']).toBe('#abcdef');
    expect(result['borders.width']).toBe(3);
    expect(result['atmosphere.intensity']).toBe(2.5);
  });

  it('returns a frozen object', () => {
    const result = resolveTheme();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('does not mutate DEFAULT_TOKENS when overriding', () => {
    const before = DEFAULT_TOKENS['globe.surface'];
    resolveTheme({ tokens: { 'globe.surface': '#deadbe' } });
    expect(DEFAULT_TOKENS['globe.surface']).toBe(before);
  });

  it('ignores undefined values in overrides', () => {
    const result = resolveTheme({
      tokens: { 'globe.surface': undefined },
    });
    expect(result['globe.surface']).toBe(DEFAULT_TOKENS['globe.surface']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

First delete the smoke test so output is clean:

```bash
rm packages/core/src/theme/__tests__/smoke.test.ts
pnpm --filter @globiojs/core test
```

Expected: All 7 tests fail with "Cannot find module '../resolver'" (or similar).

- [ ] **Step 3: Implement the resolver**

Path: `packages/core/src/theme/resolver.ts`

```ts
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
  return Object.freeze(next) as ResolvedTokens;
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @globiojs/core test
```

Expected: all 7 tests pass.

- [ ] **Step 5: Run typecheck**

```bash
pnpm --filter @globiojs/core typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/theme/resolver.ts packages/core/src/theme/__tests__/resolver.test.ts
git rm packages/core/src/theme/__tests__/smoke.test.ts
git commit -m "feat(core): resolveTheme merges user tokens over defaults"
```

---

## Task 4: Public theme module exports

**Files:**
- Create: `packages/core/src/theme/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Create theme barrel export**

Path: `packages/core/src/theme/index.ts`

```ts
export { resolveTheme } from './resolver';
export { DEFAULT_TOKENS } from './tokens';
export type {
  PartialTokenSet,
  ResolvedTokens,
  ThemeConfig,
  TokenKey,
  TokenSet,
} from './types';
```

- [ ] **Step 2: Re-export theme module from core public surface**

Modify `packages/core/src/index.ts`. Append (after existing type exports):

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

- [ ] **Step 3: Build to verify exports compile**

```bash
pnpm --filter @globiojs/core build
```

Expected: clean build, `dist/index.d.ts` mentions `ThemeConfig`, `resolveTheme`, etc.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/theme/index.ts packages/core/src/index.ts
git commit -m "feat(core): export theme module from core public surface"
```

---

## Task 5: Wire tokens through `globe.ts` (replace hardcoded defaults)

**Files:**
- Modify: `packages/core/src/globe.ts`
- Modify: `packages/core/src/types.ts`

This is the biggest task. We replace per-config-field fallbacks with one call to `resolveTheme()` and read every color/size from the resolved token set.

- [ ] **Step 1: Update `types.ts` — strip token-fied fields, add `theme`**

Modify `packages/core/src/types.ts`. Apply ALL of the following in one edit:

1. **Add at the top (after the existing `import` statements section, before `export type LatLng`):**

```ts
import type { ThemeConfig } from './theme/types';
```

2. **In `CountriesConfig`** — REMOVE these fields: `borderColor`, `borderWidth`, `fillColor`, `hoverColor`. Final shape:

```ts
export interface CountriesConfig {
  readonly resolution?: ResolutionLevel;
  readonly style?: CountryStyle;
  readonly hoverEnabled?: boolean;
}
```

3. **In `AtmosphereConfig`** — REMOVE `color` and `intensity`. Final shape:

```ts
export interface AtmosphereConfig {
  readonly enabled?: boolean;
}
```

4. **In `GlobeConfig`** — REMOVE `backgroundColor`, `globeColor`, `textureUrl`. ADD `theme?: ThemeConfig`. Final shape:

```ts
export interface GlobeConfig {
  readonly container: HTMLElement;
  readonly mode?: GlobeMode;
  readonly theme?: ThemeConfig;
  readonly countries?: CountriesConfig;
  readonly markers?: ReadonlyArray<MarkerConfig>;
  readonly atmosphere?: AtmosphereConfig;
  readonly autoRotate?: AutoRotateConfig;
  readonly performance?: PerformanceConfig;
  readonly initialPosition?: LatLng;
  readonly minZoom?: number;
  readonly maxZoom?: number;
}
```

- [ ] **Step 2: Update `globe.ts` — resolve tokens, replace defaults**

Modify `packages/core/src/globe.ts`. Apply ALL changes:

1. **Update imports section** at the top:

```ts
import { AmbientLight, DirectionalLight } from 'three';
import { SceneManager } from './renderer/scene-manager';
import { GlobeMesh } from './renderer/globe-mesh';
import { MarkersLayer } from './renderer/markers-layer';
import { CountriesLayer, type CountryFeature } from './renderer/countries-layer';
import { AtmosphereLayer } from './renderer/atmosphere-layer';
import { GlobeControls } from './interaction/controls';
import { PointerRaycaster } from './interaction/raycaster';
import { GlobeEventEmitter } from './interaction/events';
import { loadCountries } from './data/geo-loader';
import { resolveTheme } from './theme/resolver';
import type {
  CountriesConfig,
  GlobeConfig,
  GlobeEventName,
  GlobeEvents,
  GlobeInstance,
  LatLng,
  MarkerConfig,
  PerformanceConfig,
} from './types';
```

2. **Update `DEFAULT_COUNTRIES`** — strip token-fied fields:

```ts
const DEFAULT_COUNTRIES: Required<CountriesConfig> = {
  resolution: 'medium',
  style: 'borders',
  hoverEnabled: true,
};
```

3. **Inside `createGlobe`** — at the very top (right after `const emitter = new GlobeEventEmitter();`), add:

```ts
const tokens = resolveTheme(config.theme);
```

4. **Replace `SceneManager` construction** so it uses tokens for background:

```ts
const scene = new SceneManager({
  container: config.container,
  backgroundColor: tokens['background.color'],
  performance,
  onRender: (delta) => state.controls.update(delta),
});
```

5. **Replace `GlobeMesh` construction**:

```ts
const globeMesh = new GlobeMesh({
  color: tokens['globe.surface'],
  ...(tokens['globe.surfaceTexture'] !== '' && {
    textureUrl: tokens['globe.surfaceTexture'],
  }),
});
```

6. **Replace `MarkersLayer` construction**:

```ts
const markersLayer = new MarkersLayer({ defaultColor: tokens['markers.defaultColor'] });
```

7. **Replace `AtmosphereLayer` construction**:

```ts
const atmosphereLayer = config.atmosphere?.enabled
  ? new AtmosphereLayer({
      color: tokens['atmosphere.color'],
      intensity: tokens['atmosphere.intensity'],
    })
  : null;
```

8. **Inside `initCountries`** — replace the `CountriesLayer` construction so it derives border styling from tokens (the `countries` resolved config no longer carries colors):

```ts
const initCountries = async (): Promise<void> => {
  if (!config.countries) return;
  try {
    const features = await loadCountries({ resolution: countries.resolution });
    if (state.destroyed) return;
    const layer = new CountriesLayer({
      features: features as ReadonlyArray<CountryFeature>,
      borderColor: tokens['borders.color'],
      borderWidth: tokens['borders.width'],
      borderOpacity: tokens['borders.opacity'],
    });
    scene.scene.add(layer.group);
    state.countriesLayer = layer;
  } catch (error) {
    emitter.emit('error', error instanceof Error ? error : new Error(String(error)));
  }
};
```

9. **Inside `instance.update`** — REMOVE the now-impossible `partial.globeColor` and `partial.atmosphere.color` / `partial.atmosphere.intensity` branches. The `update` body becomes:

```ts
update: (partial) => {
  state.config = { ...state.config, ...partial };
  if (partial.markers) markersLayer.setMarkers(partial.markers);
  if (partial.autoRotate) {
    controls.setAutoRotate(partial.autoRotate.enabled ?? false, partial.autoRotate.speed);
  }
},
```

(Live-updating tokens at runtime is a v1.x feature — out of scope here.)

- [ ] **Step 3: Update `CountriesLayer` constructor signature**

Modify `packages/core/src/renderer/countries-layer.ts`. The current `CountriesLayerOptions` takes `config: Required<CountriesConfig>` which used to carry colors. Replace it so the layer takes the few values it actually needs:

```ts
export interface CountriesLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly borderColor: string;
  readonly borderWidth: number;
  readonly borderOpacity: number;
}
```

Update the constructor body to read from new fields:

```ts
public constructor(options: CountriesLayerOptions) {
  this.group = new Group();
  this.material = new LineBasicMaterial({
    color: options.borderColor,
    linewidth: options.borderWidth,
    transparent: true,
    opacity: options.borderOpacity,
  });

  this.buildBorders(options.features);
}
```

Remove the `import type { CountriesConfig }` line if present.

- [ ] **Step 4: Update `MarkersLayer` constructor to require `defaultColor`**

Modify `packages/core/src/renderer/markers-layer.ts`. Change `MarkersLayerOptions.defaultColor` from optional to required:

```ts
export interface MarkersLayerOptions {
  readonly maxMarkers?: number;
  readonly defaultColor: string;
  readonly defaultSize?: number;
}
```

Inside the constructor remove the `?? '#ff4444'` fallback for `defaultColor`:

```ts
public constructor(options: MarkersLayerOptions) {
  this.maxMarkers = options.maxMarkers ?? 10000;
  this.defaultColor = options.defaultColor;
  this.defaultSize = options.defaultSize ?? 0.012;
  // ... rest unchanged
}
```

- [ ] **Step 5: Verify `AtmosphereOptions` and `GlobeMeshOptions` shapes (no change expected)**

Open `packages/core/src/renderer/atmosphere-layer.ts` and `packages/core/src/renderer/globe-mesh.ts`. Confirm that `color` (and `intensity` for atmosphere) are already declared `readonly color: string` (no `?`). If they are — no change. If for some reason they're optional, drop the `?`. As of plan-writing time, both are already required; this step is a 30-second sanity check.

- [ ] **Step 6: Build and verify the whole core compiles**

```bash
pnpm --filter @globiojs/core build
```

Expected: clean build, ESM + CJS + DTS produced.

- [ ] **Step 7: Run tests**

```bash
pnpm --filter @globiojs/core test
```

Expected: all 7 resolver tests still pass.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/globe.ts packages/core/src/renderer/countries-layer.ts packages/core/src/renderer/markers-layer.ts
git commit -m "refactor(core): wire renderer through resolved theme tokens

Replace per-field config fallbacks with token resolution. Public API
gains a single 'theme' entry point; old shortcut fields (globeColor,
backgroundColor, countries.borderColor etc.) are removed. Renderer
layers stay token-unaware — globe.ts is the only consumer of resolved
tokens."
```

---

## Task 6: Strip dead config refs from Angular & Vue wrapper skeletons

**Files:**
- Modify: `packages/angular/src/globe.component.ts`
- Modify: `packages/vue/src/VueGlobe.ts`

The Angular and Vue wrapper skeletons (from the earlier monorepo bootstrap) still expose `backgroundColor`, `globeColor`, and `textureUrl` as `@Input`/`prop`. After Task 5 those fields no longer exist on `GlobeConfig` so workspace typecheck breaks. Strip the dead refs now — wrappers get a proper `theme` input/prop in a future plan when we redesign them.

React's `Globe.tsx` does not reference any of these — confirmed by grep — so it needs no change.

- [ ] **Step 1: Patch `globe.component.ts`**

In `packages/angular/src/globe.component.ts`:

- Remove the three `@Input` declarations for `backgroundColor`, `globeColor`, `textureUrl` (around lines 43-45).
- Remove the three matching lines from the config object passed to `createGlobe` (around lines 119-121).

After the patch, the `@Input` block carries only the props that map to fields still in `GlobeConfig` (e.g. `countries`, `markers`, `atmosphere`, `autoRotate`).

- [ ] **Step 2: Patch `VueGlobe.ts`**

In `packages/vue/src/VueGlobe.ts`:

- Remove the three `props` definitions for `backgroundColor`, `globeColor`, `textureUrl` (around lines 29-31).
- Remove the three matching lines from the config object passed to `createGlobe` (around lines 55-57).

- [ ] **Step 3: Typecheck the workspace**

```bash
pnpm typecheck
```

Expected: zero errors across all packages.

- [ ] **Step 4: Commit**

```bash
git add packages/angular/src/globe.component.ts packages/vue/src/VueGlobe.ts
git commit -m "chore(wrappers): drop dead config refs after token migration

Angular and Vue skeletons referenced backgroundColor/globeColor/textureUrl which no longer exist on GlobeConfig. Strip them to keep workspace typecheck green; wrappers get a proper 'theme' input/prop when we redesign them in a future plan."
```

---

## Task 7: Update vanilla demo to use the theme API

**Files:**
- Modify: `examples/vanilla-demo/src/main.ts`
- Modify: `examples/vanilla-demo/index.html`

The demo currently uses removed fields like `backgroundColor` and `globeColor`. Migrate it AND add 3 buttons that swap themes at runtime — proving the system works end-to-end. Note: live-update of theme is out of scope (Task 5 step 2.9 removed that path), so the buttons recreate the globe instance.

- [ ] **Step 1: Update `index.html` to add theme switcher UI**

Modify `examples/vanilla-demo/index.html`. Inside `#hud`, replace the existing `<span id="status">` block with the following so HUD shows status + 3 theme buttons:

```html
<b>Globe Core demo</b><br />
Drag — obrót · Scroll — zoom<br />
<span id="status">Ładowanie granic państw…</span>
<div style="margin-top: 10px; display: flex; gap: 6px;">
  <button data-theme="default" style="padding: 4px 8px; cursor: pointer;">Default</button>
  <button data-theme="sunset" style="padding: 4px 8px; cursor: pointer;">Sunset</button>
  <button data-theme="cyber" style="padding: 4px 8px; cursor: pointer;">Cyber</button>
</div>
```

- [ ] **Step 2: Rewrite `main.ts` to use theme API + theme switching**

Replace the entire contents of `examples/vanilla-demo/src/main.ts` with:

```ts
import { createGlobe, type GlobeInstance, type ThemeConfig } from '@globiojs/core';

const container = document.getElementById('app');
const status = document.getElementById('status');
if (!container) throw new Error('#app not found');

const themes: Record<string, ThemeConfig> = {
  default: {},
  sunset: {
    tokens: {
      'background.color': '#180a1a',
      'globe.surface': '#3a1f3f',
      'borders.color': '#ffb070',
      'atmosphere.color': '#ff7e5f',
      'atmosphere.intensity': 1.6,
      'markers.defaultColor': '#ffd166',
    },
  },
  cyber: {
    tokens: {
      'background.color': '#000814',
      'globe.surface': '#0a0a14',
      'borders.color': '#00f0ff',
      'borders.opacity': 1,
      'atmosphere.color': '#ff2bd6',
      'atmosphere.intensity': 1.4,
      'markers.defaultColor': '#22ee99',
    },
  },
};

let globe: GlobeInstance | undefined;

const buildGlobe = (themeName: keyof typeof themes): void => {
  globe?.destroy();
  globe = createGlobe({
    container,
    theme: themes[themeName],
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

buildGlobe('default');

document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset['theme'] as keyof typeof themes;
    buildGlobe(name);
  });
});

window.addEventListener('beforeunload', () => globe?.destroy());
```

- [ ] **Step 3: Rebuild core (the demo consumes `dist/`)**

```bash
pnpm --filter @globiojs/core build
```

Expected: clean build.

- [ ] **Step 4: Start dev server and verify visually**

```bash
pnpm --filter vanilla-demo dev
```

Open http://localhost:5173/. Verify:

- Default theme matches the previous-commit look (dark blue globe + blue borders)
- "Sunset" button → globe becomes purple-violet, borders orange, atmosphere warm
- "Cyber" button → black globe, neon cyan borders, magenta atmosphere
- No console errors; globe rebuilds smoothly between clicks

If the visuals don't match, the most likely culprit is a mistyped token key — TypeScript catches most of them, but token *values* (hex colors) need a manual look.

- [ ] **Step 5: Commit**

```bash
git add examples/vanilla-demo/src/main.ts examples/vanilla-demo/index.html
git commit -m "feat(demo): theme switcher (default/sunset/cyber) using new theme API"
```

---

## Task 8: Update FEATURES.md status flags

**Files:**
- Modify: `FEATURES.md`

Three feature lines now ship — update their tags so the doc stays truthful.

- [ ] **Step 1: Mark Theme tokens as built**

In `FEATURES.md`, find the line:

```
- **Theme tokens** `[v1·GLOBAL·M]` 🌟 — ~30 nazwanych tokenów (`globe.surface`,
```

Change tag to `[v1·GLOBAL·M·built]`. Also the description currently says "~30 nazwanych tokenów" — adjust to honest count: "~9 tokenów w v0.2 (background, globe.surface, borders.*, atmosphere.*, markers.defaultColor); rozszerzane wraz z kolejnymi stylami".

- [ ] **Step 2: Mark Theme override / extension as built**

Find:

```
- **Theme override / extension** `[v1·GLOBAL·S]` — `theme: { extends: 'dotted-blue', tokens: { 'markers.default': '#f00' } }`.
```

The override-via-tokens part ships now; `extends` (named preset inheritance) does NOT yet — it requires a presets registry. Split honestly:

```
- **Theme tokens override** `[v1·GLOBAL·S·built]` — `theme: { tokens: { 'globe.surface': '#f00' } }`.
- **Theme `extends` (inherit from named preset)** `[v1·GLOBAL·S]` — `theme: { extends: 'dotted-blue', tokens: { ... } }`. Wymaga presets registry.
```

- [ ] **Step 3: Commit**

```bash
git add FEATURES.md
git commit -m "docs: mark theme token system features as built in v0.2"
```

---

## Task 9: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite from the repo root**

```bash
pnpm test
```

Expected: all packages run their tests, only `@globiojs/core` has any (7 resolver tests, all pass).

- [ ] **Step 2: Run the full build from the repo root**

```bash
pnpm build
```

Expected: every package builds clean. Core ships dist/ with theme types in `index.d.ts`.

- [ ] **Step 3: Run typecheck across the workspace**

```bash
pnpm typecheck
```

Expected: zero TS errors.

- [ ] **Step 4: Manual visual verification of the demo**

```bash
pnpm --filter vanilla-demo dev
```

Cycle through Default → Sunset → Cyber → Default. Confirm globe rebuilds correctly, no console errors, markers visible on each theme.

- [ ] **Step 5: Confirm `git status` is clean and push**

```bash
git status
git log --oneline -10
git push
```

The branch should be ahead of origin/main by ~7 commits (one per task; Tasks 5 and 8 are single commits).

---

## Self-review notes (already applied)

1. **Spec coverage:** Plan covers FEATURES.md §4.1 *Theme tokens* `[v1]` and *Theme tokens override* `[v1]` — the rest of §4.1 (presets registry, extends, light/dark, CSS bridge, color-blind) is explicitly deferred. No spec gaps for v0.2 foundation.
2. **Placeholder scan:** No "TBD"/"implement later"/"add error handling". Every code block is the literal content to write.
3. **Type consistency:** `TokenKey`, `TokenSet`, `ThemeConfig`, `ResolvedTokens`, `resolveTheme()` names appear identically in Tasks 2, 3, 4, 5. `CountriesLayerOptions` updated in Task 5 with new fields (`borderColor`, `borderWidth`, `borderOpacity`) consistently used in `globe.ts` Task 5 step 2.8.
4. **Scope check:** Single subsystem (theme tokens) with one consumer (existing outline rendering). Dotted style is a separate plan. Plan length: ~8 tasks ≈ 7-10 working days for a focused solo dev.
