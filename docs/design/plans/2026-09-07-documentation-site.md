# Documentation Site Plan

**Goal:** Replace the `/docs` skeleton with real documentation that is generated wherever the source of truth already exists (types, defaults, wrapper props), hand-written where judgement is needed (guides, recipes, caveats), and organised so a reader can get a globe running in five minutes, find any config key with its type and default, and read one page per capability with a live example in their own framework.

**Second goal:** one description of every feature, shared by the documentation and the Studio help tips, so the two never disagree.

**Status:** skeleton merged to `main` on 2026-09-07 (component library, manifest, route, landing links). Phase 1 executed the same day on `feat/docs-phase-1`: the Vue and Angular wrappers now forward the whole `GlobeConfig` and every event (`GLOBE_CONFIG_KEYS` + `pickGlobeConfig` in the core), `examples/vanilla-demo/scripts/docs-extract.mjs` writes `src/docs/generated/api.json` (548 config keys, 43 methods, 10 events, 60 types, wrapper surfaces) with a vitest that fails when it is stale, the feature registry lives in `src/docs/features/` (44 features, coverage-tested), and every page in the manifest has real content generated from `api.json` or written by hand. Remaining: phase 2 (Studio `FeatureTip`) and phase 3.

---

## 1. What exists after the skeleton

| Layer | Path | Purpose |
| --- | --- | --- |
| Shell | `examples/vanilla-demo/src/components/docs/layout/` | `DocsLayout`, top bar with tab groups, sidebar + mobile drawer, outline column (`DocsToc`), previous/next, ⌘K search, footer |
| Page structure | `components/docs/primitives/` | `DocPage` (breadcrumb, config-path eyebrow, display title, lead, meta pills), `DocSection`/`DocSubsection` (anchors, outline registration), `Prose`, `InlineCode`, `Callout` (note/tip/warning/perf/experimental), `Steps`, `ContentTabs`, `Pill`/`KindBadges`/`KindDot`, `LinkCard`/`CardGrid` |
| Code | `components/docs/code/` | `CodePanel` (Vanilla/React/Vue/Angular tabs synced to the global choice, file name, copy, highlighted lines, container-query header), `FrameworkSwitch`, `FrameworkProvider` (persists to `localStorage`) |
| Reference | `components/docs/reference/` | `ApiTable` + presets `PropsTable`/`EventsTable`/`MethodsTable` (anchored rows), `Signature`, `SupportMatrix` (feature × kind), `TokenSwatches` |
| Preview | `components/docs/preview/LivePreview.tsx` | a real globe next to the code: mounts near the viewport, pauses off-screen, low resolution, 30 fps |
| Content model | `src/docs/manifest.ts` | tabs → groups → pages; stable slugs; `findPage`, `flatPages`, prev/next |
| Pages | `src/docs/pages/` | dedicated pages, `SkeletonPage` fallback, `DocsHome`, `NotFound`; registry in `pages/index.tsx` |
| Highlighter | `src/lib/code-highlight.tsx` | shared by the landing `CodeBlock` and the docs `CodePanel` |

Design rules already applied: palette and type come from `landing.css` (`.landing, .docs` share the tokens), every docs style lives in the `components` cascade layer so Tailwind utilities keep winning, one accent per page (`--page-accent`, kind pages use their swatch), eyebrows are config paths, numbering only where the order is real.

---

## 2. Information architecture

Four tab groups in the top bar. Each answers a different question, so a reader knows where to look before they search.

| Tab | Question it answers | Content type |
| --- | --- | --- |
| **Guide** | "How do I …?" | hand-written prose, live previews, canonical examples, callouts |
| **API** | "What exactly is …?" | generated from types and defaults; one anchor per key |
| **Frameworks** | "What does it look like in my stack?" | generated mapping tables + hand-written integration notes |
| **Studio** | "How do I use the tool?" | hand-written, screenshots, shortcuts |

A fifth tab, **Recipes**, comes in phase 3 (choropleth dashboard, flight routes, story-driven landing, hero globe with markers, live feed).

### 2.1 Guide

| Group | Pages | Notes |
| --- | --- | --- |
| Start | Introduction · Installation · Your first globe · Choosing a kind | the five-minute path; every page ends with the next step |
| Kinds | All kinds · Cinematic · Outline · Dotted · Wireframe · Hologram · Paper | one `KindPage` template; page accent = kind swatch; live preview + kind snippet; kind options table; support matrix restricted to the kind |
| Appearance | Themes and presets · Theme tokens · Atmosphere and sky · Countries · Post-processing | tokens page generated from `TokenSet` + resolved presets |
| Camera and motion | Position and framing · Auto-rotate · flyTo and focusOnCountry · Zoom and controls | |
| Data layers | Country data · Markers · Arcs · Labels · Scales and legends | each with a live preview showing the layer |
| Interaction | Events · Hover and selection · Projection and picking | |
| Story | Story engine | scenes, transitions, playback, events |
| Performance | Performance · Pausing and visibility · Timing marks | measured numbers from the engine's own marks |

Section template for a Guide page (the components already exist for each step):

1. `DocPage` header: config-path eyebrow, title, lead, meta pills (kinds, since).
2. `docs-two-col`: `LivePreview` + `CodePanel` — the canonical example.
3. **How it works** — prose, at most three paragraphs.
4. **Configuration** — `PropsTable` of this feature's keys, rows anchored (`#prop-autoRotate-speed`), fed from the registry (§3).
5. **At runtime** — the instance methods and events that touch the feature (`MethodsTable`, `EventsTable`).
6. **Per kind** — `SupportMatrix` subset or a `Callout` when a kind behaves differently.
7. `Callout tone="perf"` — what it costs, with a number.
8. **Related** — `CardGrid` of `LinkCard`s.

### 2.2 API

| Group | Pages | Source |
| --- | --- | --- |
| Entry point | createGlobe · GlobeConfig | `GlobeConfig` and every sub-config, grouped by the key they hang off |
| Instance | GlobeInstance · Events | `GlobeInstance`, `GlobeEvents` and payload types |
| Types | Markers and arcs · Story types · Scales · Theme types | `MarkerConfig`, `HtmlMarkerConfig`, `ArcConfig`, `StoryConfig`, `SceneConfig`, `ScaleConfig`, `TokenSet`, `ThemeInput`, `ThemePresetName` |
| Utilities | Easing · Country ids · Presets | exported functions and constants |

Every row: name, type (linked to its type page), default, one-sentence description, kinds, since. Every row links back to the Guide page that explains it ("Learn more"), and every Guide configuration table links to the row.

### 2.3 Frameworks

Packages: Vanilla · React · Vue · Angular (one `FrameworkPage` template, code panels pinned). Guides: Server rendering · Bundlers and CDNs. The props/events mapping table is generated from each wrapper's own prop type (`GlobeProps`, the Vue emits map, the Angular inputs/outputs), not written by hand.

### 2.4 Studio

Studio overview · Export code · Presets and snapshots · Keyboard shortcuts. Hand-written; shortcuts table generated from the command palette's registered commands once those are declared as data.

---

## 3. Where feature descriptions live

Question from the brief: annotations in code, or one component per feature shown in a tooltip?

**Decision: three layers, one registry.** Facts that are already in the types stay in the types and get extracted; everything that is prose or UI lives in a registry of typed content modules; the Studio and the docs both read the registry.

### 3.1 Layer A — API facts as JSDoc on the exported types (extracted)

`GlobeConfig`, its sub-configs, `GlobeInstance` and `GlobeEvents` carry one- or two-sentence JSDoc with `@default`, `@since` and `@kinds` tags. A script (`scripts/docs-extract.ts`, run through the `vite-node` that ships with vitest; no new dependency) walks the type declarations with the TypeScript compiler API and writes `examples/vanilla-demo/src/docs/generated/api.json`: for every key its path, type text, default, description, tags. The JSON is committed; a vitest re-runs the extraction and fails when the committed file is stale, so the reference can never lag the code.

What belongs here: the type, the default, the one-line meaning. What does not: how-to prose, comparisons, caveats, anything with markup. Comments cannot hold JSX, previews or animation; long comments bury the code; and the Studio would otherwise have to ship the core's source text.

### 3.2 Layer B — the feature registry (TSX content modules)

`examples/vanilla-demo/src/docs/features/<feature-id>.tsx`, one module per feature, each exporting a `FeatureDoc`:

```ts
interface FeatureDoc {
  id: FeatureId;                 // 'auto-rotate'
  title: string;
  configPath?: string;           // 'autoRotate' — joins layer A rows to this feature
  summary: string;               // ≤ 160 chars, plain text: tooltips, search, cards
  kinds: ReadonlyArray<GlobeKind> | 'all';
  docs: { slug: DocSlug; anchor?: string };   // the long form: one Guide page section
  example?: FrameworkCode;       // canonical snippet, all four frameworks
  preview?: LivePreviewProps;    // what the LivePreview shows for it
  tip?: () => Promise<{ default: ComponentType }>;  // rich tooltip body, lazy
  related?: ReadonlyArray<FeatureId>;
  studio?: { panel: string; control: string };      // which Studio control it decorates
}
```

Why a registry and not one component per feature scattered through the Studio: a single list can be enumerated (coverage report, search index, sitemap), validated (every `docs.slug` exists, every config key is claimed by exactly one feature), and read by both consumers without the docs importing Studio code. Why TSX and not JSON/Markdown: `tip` and `example` need components, animation and live previews; TypeScript checks the ids, slugs and kinds at compile time.

Roughly forty features: the six kinds, themes, tokens, atmosphere, starfield, post-processing, countries (resolution, fills, borders, hover, labels), position and framing, auto-rotate, zoom, flyTo, focus, country data, scales, legends, markers, HTML markers, arcs, events, selection, projection, story, performance (antialias, pixel ratio, max fps, adaptive quality, pause when hidden), pausing, timing marks, export, and the four wrappers.

### 3.3 Layer C — Studio help tips read the registry

- `Field` (and the row-shaped controls) gain `feature?: FeatureId`.
- `ControlLabel` renders the `?` glyph when a feature is set; the new shared `FeatureTip` component shows the registry `summary`, the config path with its type and default from layer A, the kinds pills, and a "Read more" link to `/docs/<slug>#<anchor>`.
- Rich tips (`tip`) load lazily on first hover so the Studio bundle does not grow. A rich tip may contain an animated SVG diagram, a 160 px paused `LivePreview`, a before/after pair, or a small table. Use a hover card with an open delay rather than the plain tooltip so the content can be read and clicked.
- Tests: every `feature` referenced in Studio exists in the registry; every registry entry points at an existing docs page; every config key in `api.json` is claimed by a feature (a report lists the unclaimed ones).

Locale support later: the registry can be keyed by locale per feature; layer A stays English.

---

## 4. Generation and search

- **API pages** become one `ConfigReferencePage` iterating `api.json` groups; **Frameworks** pages one `FrameworkPage` iterating the wrapper prop maps; **Guide** pages a `FeaturePage` that renders a `FeatureDoc` plus hand-written sections.
- **Search index**: manifest pages + registry summaries + `api.json` keys (path, type, default) + instance methods + events. The ⌘K dialog gets groups "Pages", "Config keys", "Methods", "Events"; results deep-link to anchors. Substring ranking with a small boost for exact key matches (cmdk's fuzzy default is too loose for identifiers).
- **Previews**: at most one live globe visible per section, `resolution: 'low'`, paused off-screen (the `LivePreview` component already does this). A page with more than three previews should switch the extra ones to `toImage()` snapshots generated at build time.

---

## 5. Phases

| Phase | Deliverable | Replaces |
| --- | --- | --- |
| 1 | `docs-extract` script + committed `api.json` + staleness test; registry with ids, summaries, slugs for all ~40 features; generated API and Frameworks pages; real text for Start, Kinds, Data layers, Interaction | every `SkeletonPage`, the hand-typed `PropsTable`s |
| 2 | `FeatureTip` in the Studio wired to the registry for every control; rich tips for the ten most misunderstood controls; coverage tests | nothing in the docs; adds help to the Studio |
| 3 | Recipes tab; search index with keys, methods and events; build-time `toImage()` snapshots; edit-on-GitHub links; per-version docs when the package version changes | search over page titles only |

Each phase is independently shippable and keeps the current URLs.
