# Landing Cinematic Redesign — Design Spec

**Date:** 2026-05-07
**Branch:** redesign/kind-personalities
**Scope:** examples/vanilla-demo home page (`HomeLanding` and all `landing/*` sections)

## Problem

The current vanilla-demo landing was redesigned in commits `a3f2d35` and `846d80d` toward a cinematic, desktop-first product page with real `@globiojs/core` globe instances. The direction is solid (wide hero, central globe, side panels, stat-bar, product board below) but the execution still reads as a strong draft — not as senior-product-design output. Specific issues:

- Hero has six chaotic orbit ellipses with arbitrary rotations; cluttered and not deliberate.
- Hero "city labels" (`New York`, `São Paulo`) are positioned by hard-coded `left: 56% top: 31%`; they don't actually correspond to where those cities are on the camera at runtime.
- Hero floor uses a polygon `clip-path` skyline shape that reads as decorative noise, not premium.
- Stat-bar uses `-mt-20` to overlap the grid; works but feels stuck-on, not integrated.
- KindShowcaseSection crams four conceptually different panels (timeline + 5 kinds gallery + mini-studio + API preview) into one 4-column row — competes for attention.
- `LayerArchitectureSection` builds a layer×kind matrix that's decoratively pretty but not actually informative; rowIndex/colIndex coincidence-colored cells aren't real signal.
- Trust marks (`Caldera`, `spacely`, `Fintek`...) are fake brand names — premium landings don't lie.
- Engine has two big features the landing doesn't surface at all: `setDataLayer` (choropleth, hexbin, charts, …) and `setStory`/Story API (cinematic scene playback with `flyTo`, `focusOnCountry`, popups, eased transitions).
- The 5 kinds and 9 canonical layers are communicated, but per-kind theme presets, runtime update path, and production data-viz capability are weakly represented.

The user — acting as project owner — wants the page to read as senior product-design + senior frontend-engineer output, finalized desktop-first (1440 baseline, 1920 perfect), with no commit until approval, typecheck and build clean, no console errors, no horizontal overflow.

## Goals

1. **Hero must be cinematic and definitive** — premium first impression, real central globe, no fake decorations, no stuck-on overlays.
2. **Restructure section flow** to a 7-chapter cinematic narrative; each chapter has its own art direction.
3. **Surface every product capability** the engine actually ships: 5 kinds, 9 canonical layers with per-kind native implementations, theme presets, Studio + Workshop, runtime update path (`globe.update()`), data layers (`setDataLayer`), Story API (`setStory`), typed config, four framework adapters.
4. **Zero fake content** — drop fake trust-mark brand names; replace with honest production-use chips.
5. **Component decomposition** — keep each section file under 300 lines; share primitives in `landing/atoms/`.
6. **Production-quality micro-detail** — alignment, spacing, contrast, glow, masks, hover/active states, code preview, mini-globes, stat-bar, transitions.
7. **Desktop 1440 and 1920 ship at A-grade** — mobile/tablet deferred (acknowledged in this spec).

## Non-Goals

- Mobile and tablet responsive design — explicitly deferred to a later iteration.
- New globe `kind` types — the 5 existing kinds are enough.
- New theme presets — pick from `THEME_PRESETS` already in core.
- Migrating the demo away from React 18 / current toolchain.
- Any change to the Studio routes or Workshop runtime; the landing only references and showcases them.
- Internationalization of marketing copy — English only.

## High-Level Architecture

The landing is restructured into a **7-chapter cinematic flow**, each chapter rendered by a dedicated component under `examples/vanilla-demo/src/components/home/landing/`. Shared primitives move to `landing/atoms/`.

| # | Chapter | Component | Direction |
|---|---------|-----------|-----------|
| 1 | Hero | `HeroStage.tsx` (rebuilt) + sub-components | Cinematic sticky scene, ~110vh, central massive globe, theme-bleed, real lat/lng-projected data anchors, stat instrument cluster |
| 2 | Personalities | `KindPersonalitiesSection.tsx` (new, replaces top of `KindShowcaseSection`) | Apple-product-page vertical gallery of 5 kinds, alternating L/R composition, IntersectionObserver-paced auto-rotate |
| 3 | Anatomy | `LayerAnatomySection.tsx` (replaces `LayerArchitectureSection`) | 3×3 grid of 9 canonical layers + full-body diagram globe |
| 4 | Workshop | `StudioWorkflowSection.tsx` (polish) | Cockpit feel, live-log strip, refined dials |
| 5 | Data & Storytelling **(new)** | `DataStorySection.tsx` (new) | Real `setDataLayer` choropleth + Story API timeline (live or visualized) |
| 6 | Developer Surface | `ApiSection.tsx` (polish) | Code playground with line numbers, comprehensive syntax highlighting, copy-button, use-case chips |
| 7 | Final | `FinalCta.tsx` (polish) | Massive globe (90vmin), revised headline, use-case strip, footer minimal |

Routing through `HomeLanding.tsx`:

```
<ClickSpark>
  <main>
    <ScrollProgress />
    <NoiseOverlay />
    <Nav />
    <HeroStage />                      ← chapter 1
    <KindPersonalitiesSection />       ← chapter 2 (new)
    <LayerAnatomySection />            ← chapter 3 (replaces architecture)
    <StudioWorkflowSection />          ← chapter 4
    <DataStorySection />               ← chapter 5 (new)
    <ApiSection />                     ← chapter 6
    <FinalCta />                       ← chapter 7
  </main>
</ClickSpark>
```

The legacy `KindShowcaseSection.tsx` and `LayerArchitectureSection.tsx` are deleted. Their content is repartitioned: 5 kinds gallery → `KindPersonalitiesSection`, 9 layers → `LayerAnatomySection`, mini-studio panel content → folded into `StudioWorkflowSection`, API preview → `ApiSection`, timeline cards (4-step "Built for developers") → repurposed as a sub-band in `ApiSection`.

## Chapter 1 — Hero

### Composition
3-column grid `[~410px | fluid center ≥720px globe | ~410px]`, max-w 1880px. Min-height ~110vh on 1440 (1080 viewport → 1188px hero), tighter ratio on 1920.

**Left rail (`HeroLeftRail`)**:
- Live status pill (emerald + ping) — kept from current
- Eyebrow line "Five visual personalities" — kept
- H1 (rebuilt): **"Five globes. One engine. Zero ceiling."**
- Subhead (tighter): **"A modern WebGL globe library with five visual personalities, nine canonical layers, and a typed runtime that ships in production."** (≤ 22 words)
- CTA pair: primary `Open Studio` (amber) + secondary `Explore kinds` (glass) — current pattern, refined sizing
- Proof bar: `TypeScript first · Tree-shakeable · 60 FPS · 0 deps · MIT`

**Center stage (`HeroCenterStage`)**:
- 2 deliberate orbit rings (one horizontal, one ~−17° tilt). No more.
- 1 trajectory arc above globe (decorative, suggesting routes).
- Massive globe via `DecorationGlobe` with `interactive={true}` (drag-rotate).
- Atmosphere glow tinted by active kind's accent color (CSS var `--hero-accent`).
- Floor reflection: soft radial gradient, no clip-path skyline.
- HUD readout (top-right corner of globe area): mono `lat: 13.0°N · lng: -42.0°W · 60 fps`. Updates from globe state.
- 2 lat/lng-projected data anchors with neutral labels: "LIVE TRACE" + "SIGNAL FEED" with mono coordinate sub-line.
- Hint pill `drag to rotate` shown for first 4s, dismisses after first interaction.

**Right rail (`HeroRightRail`)**:
- Kind switcher: 5 stacked cards each with mini-globe + label + caption. Active kind highlighted with amber border + glow.
- Theme switcher: strip of 3–4 theme swatches for the active kind. Click to live `globe.update({ theme })`.
- Code preview: compact `createGlobe()` snippet that updates as kind/theme change. Tabs: Vanilla / React / Vue (no Angular here — too crowded; full Angular tab lives in chapter 6).

**Bottom band (`HeroStatInstruments`)**:
- Integrated as last row of hero (no `-mt-20` overlap). 6 stat columns: `5 kinds`, `9 layers`, `4 frameworks`, `60 fps`, `0 deps`, `MIT`. Mono values, slate labels, divided by hairline borders.

### Theme bleed
Active kind sets CSS variable `--hero-accent` on the section root. All accent-using elements (orbit ring strokes, atmosphere glow, code preview accent, primary CTA shadow color) reference `var(--hero-accent)`. Transition: `280ms cubic-bezier(0.4, 0, 0.2, 1)` on color/box-shadow.

### Data anchors implementation
The hero needs real lat/lng → screen projection so anchors line up with globe content. Two layers:

1. **Core extension** (small, isolated): add `project(lat: number, lng: number): [number, number] | null` to `GlobeInstance`. Implementation: convert lat/lng to Vector3 on the sphere using existing geometry helpers, transform by camera, divide by w, map NDC to canvas pixels. Returns `null` when point is on the back hemisphere (dot product test).

2. **DecorationGlobe wrapper**: add `onReady?: (api: { project: (lat, lng) => [x, y] | null }) => void` prop. Hero stores the api in a ref and re-projects every animation frame to keep anchors glued to the spinning globe.

Anchors that fall on the back hemisphere fade out (opacity 0).

If the core extension takes longer than a single iteration to implement cleanly, the fallback is **statically positioned anchors with neutral labels** (no fake city names, just abstract "LIVE TRACE" / "SIGNAL FEED" pills at fixed % positions). This ensures hero ships even if projection is deferred.

### Component decomposition
```
HeroStage.tsx                  — composition root, holds activeKind/activeTheme state
├── HeroLeftRail.tsx           — pill, eyebrow, H1, subhead, CTAs, proof bar
├── HeroCenterStage.tsx        — orbit rings + globe + HUD + anchors + floor
│   ├── HeroOrbitRig.tsx       — 2 orbit rings + 1 trajectory arc (CSS only)
│   ├── HeroDataAnchors.tsx    — list of {lat, lng, label} → projected pills
│   ├── HeroHudReadout.tsx     — mono lat/lng/fps display
│   └── HeroFloorGlow.tsx      — radial gradient floor reflection
├── HeroRightRail.tsx          — kind picker + theme swatches + code preview
│   ├── HeroKindCard.tsx       — single mini-globe item
│   ├── HeroThemeSwatchRow.tsx — swatches strip
│   └── HeroCodePreview.tsx    — live-updating snippet with tabs
└── HeroStatInstruments.tsx    — bottom integrated stat band
```

## Chapter 2 — Personalities

### Composition
Apple-product-page vertical gallery of 5 kinds, alternating left/right composition. Each row ~720px tall.

```
Row 1 (Outline)  : [GLOBE LEFT 600px] | [Title + theme palette + CTA RIGHT]
Row 2 (Dotted)   : [Title + palette LEFT] | [GLOBE RIGHT 600px]
Row 3 (Wireframe): [GLOBE LEFT] | [Title RIGHT]
Row 4 (Hologram) : [Title LEFT] | [GLOBE RIGHT]
Row 5 (Paper)    : [GLOBE LEFT] | [Title RIGHT]
```

### Per-row content
- **Eyebrow**: kind index `01 — outline`
- **H3**: kind label (3rem semibold)
- **Tagline**: 6-word marketing line
- **Description**: 2 sentences (≤ 40 words total)
- **Theme palette**: 3–4 theme swatches with hover-tooltip showing preset name; active swatch outlined
- **CTA**: `Open in Studio →` deep-links to `/studio?kind=<kind>&theme=<preset>`

### Globe behavior
- Each row mounts its own `DecorationGlobe` instance with `interactive={false}`, `framingPadding={0.04}`.
- IntersectionObserver pauses auto-rotate when row is out of viewport (FPS budget; 5 globes × 60fps would otherwise cost ~300fps total).
- Subtle parallax: globe drifts ±8px opposite scroll direction within row (CSS transform via scrollY ratio).
- Per-row background tint: linear-gradient with kind-accent color at ~6% alpha overlaid on `#02050b` base.

### Theme switcher per row
Hover/click a theme swatch → live `globe.update({ theme: preset })` on that row's globe. Need to extend `DecorationGlobe` with an imperative ref so the hero can call `globe.update()` without a remount when only theme changes.

### Component decomposition
```
KindPersonalitiesSection.tsx     — section root with header
├── PersonalityRow.tsx           — single row, alternating composition
│   └── ThemePalette.tsx         — 3–4 theme swatches with active state
```

## Chapter 3 — Anatomy

### Composition
- Section header: `LayerAnatomySection` with eyebrow `canonical layers`, H2 "Nine layers. Owned by every kind.", sub explaining the contract.
- 3×3 grid of 9 layer cards (responsive: 2 cols on smaller desktop, 3 cols on 1440+).
- Below grid: full-bleed "anatomy diagram" — single hologram globe with all 9 layers active, annotated with arrows and labels pointing to each layer's visual contribution.
- Below diagram: code snippet showing same-API per-kind contracts (e.g. `globe.setMarkers([...])` works on all kinds).

### Layer card
Each card displays:
- Layer icon (large duotone, accent-colored)
- `mono name` (e.g. `arcs`, `country-fill`)
- One-line contract description (< 12 words)
- Per-kind native implementation indicator: 5 dots, all colored = "natively implemented in every kind"
- Hover: subtle lift (-translate-y-0.5), accent glow, pointer cursor
- Click: `/studio?layer=<layer>`

### Anatomy diagram
- Single ~600px globe, kind=`hologram`, theme=`hologram-cyan`
- All decoration layers turned on at meaningful values (1 arc, 3 markers, country labels for top-3 countries by area, country-fill, focus-pulse, atmosphere, starfield, crosshair active)
- Annotations: 4 callouts with thin lines pointing to specific decorations on the globe (e.g. "atmosphere → halo at terminator", "arcs → animated route NYC↔Tokyo", "markers → pulsing point with hover", "country-fill → palette mode on Africa")
- Annotations pinned to globe % coords (no projection needed — these are decorative not data-driven)

### Component decomposition
```
LayerAnatomySection.tsx          — root with header + grid + diagram
├── LayerCard.tsx                — single layer cell
└── AnatomyDiagram.tsx           — annotated full-layer globe
```

## Chapter 4 — Workshop (polish)

Keep current `StudioWorkflowSection.tsx` structure and improve:

- **Live-log strip** (new): below the globe, terminal-style strip cycling through 4 lines:
  - `$ globe.update({ markers: { count: 42 } }) → ✔ 4ms`
  - `$ globe.setStory({ scenes }) → ✔ 12ms`
  - `$ workshop.live(arcs.glow, 0.8) → ✔ 1ms`
  - `$ globe.update({ theme: 'hologram-cyan' }) → ✔ 6ms`
  Cycles every ~2.5s with subtle fade.
- **Workshop dials** (refine): replace progress bars with circular gauge visuals (SVG arc) for `arcs`, `markers`, `focus`, `crosshair`. Each dial shows current value + label.
- **Globe**: keep paper-default, framing OK; refine scanline animation rhythm.
- **Bottom row**: keep three-cell explainer (kindHandle.layers, theme tokens, runtime setters). Polish typography only.

### Component decomposition
```
StudioWorkflowSection.tsx        — root (existing, refined)
├── WorkshopDial.tsx (new)       — circular gauge
└── LiveLogStrip.tsx (new)       — terminal-style log cycler
```

## Chapter 5 — Data & Storytelling (new)

### Composition
Two-column layout, sticky-left for chapter intro:

- **Left (sticky)**: section header "From dataset to scene." + 3 stacked cards:
  - **Data layers** — list 6 types (choropleth, hexbin, bars, extruded, heatmap, charts) with one-line description each
  - **Story API** — describe `setStory({ scenes })` with `flyTo`, `focusOnCountry`, `popup`, `transitionElevation`, `easing`
  - **Real-time updates** — emphasize that `setDataLayer`, `setStory`, and per-kind setters all run without scene rebuild

- **Right**: control room composition
  - **Top**: timeline strip with 4 scene markers (Tokyo, NYC, Cairo, São Paulo). Each marker is a small thumbnail with country flag emoji + city + lat/lng. Active scene highlighted. Play / pause / step controls.
  - **Middle**: full-bleed globe area, ~520px. Globe is a real `DecorationGlobe` with extended capability to call `setDataLayer({ type: 'choropleth' })` on mount with mock continent population data. Legend HUD bottom-right.
  - **Bottom**: code snippet showing the call (`globe.setStory({ scenes: [...] }); globe.playStory();`).

### Story playback (real)
The timeline is functional: clicking a scene marker calls `globe.flyTo(scene.position)` on the inner globe. Auto-play cycles through scenes every ~6s.

This requires `DecorationGlobe` to expose an imperative ref so the section can call `flyTo`. Add `onReady` callback (same one used for hero projection) that hands back the full `GlobeInstance`.

### Stretch goal: full Story API
If time permits, replace the simplified flyTo cycler with a real `globe.setStory({ scenes })` + `playStory()` invocation, using the engine's built-in scene controller (with eased transitions, popups, transitionElevation arc). Visually superior. Falls back to the simple flyTo cycler if the data-layer + story setup interaction is more complex than budgeted.

### Mock data
- **Choropleth**: 7 continents → mock population values, mapped through a sequential cyan-to-magenta scale.
- **Story scenes**: 4 cities, each with `{ position: [lat, lng], duration: 5500, transitionDuration: 2200, transitionElevation: 0.4, popup: { content: '<city name>' } }`.

### Component decomposition
```
DataStorySection.tsx             — section root, two-col layout
├── StoryTimeline.tsx            — scene markers strip + controls
└── ChoroplethStage.tsx          — globe + legend + code snippet
```

## Chapter 6 — Developer Surface (polish)

Keep current `ApiSection.tsx` structure with these refinements:

- **Code playground polish**:
  - Comprehensive syntax highlighting via a single regex pass (keywords, strings, comments, numbers, properties, types). Color tokens: cyan-200=keyword, amber-200=string, slate-500=comment, emerald-300=type, slate-200=identifier.
  - Line numbers in left gutter (mono, slate-600, no padding overhead).
  - Copy button top-right of code pane with confirmation toast (1.5s).
- **Highlight cards**: keep 4 cards, refine spacing.
- **CTA pair**: keep StarBorder + GitHub link.
- **Use-case chips strip** (new, replaces fake trust marks):
  - 5 chips: `Dashboards · Command Centers · Editorial · Education · Storytelling`
  - Each chip is a `rounded-2xl border` pill with a small accent icon (faChartArea, faRadar, faNewspaper, faBookOpen, faFilm)
  - Sits between API section content and ScrollVelocity ticker
- **ScrollVelocity ticker**: kept (good transition into Final).

### Component decomposition
```
ApiSection.tsx                   — root (existing, refined)
├── CodePlayground.tsx (new)     — code block with line numbers, copy, syntax
└── UseCaseChips.tsx (new)       — chip strip replacing trust marks
```

## Chapter 7 — Final CTA (polish)

Keep current `FinalCta.tsx` structure with refinements:

- Globe scaled up: `size-[min(90vmin,820px)]` (was 78vmin / 720px).
- Headline change: **"Now ship a globe."** (was "Open the studio and make the globe impossible to ignore.") — short, declarative.
- Subhead refined to 1 sentence, max 22 words.
- Magnet primary CTA kept.
- Replace `ctaFeatureBadges` (current `9 layers / routes / pulses`) with use-case strip (5 chips, same set as chapter 6) — but visually different: bigger, more breathing room, sits below the CTA pair.
- Aurora background kept.

### Component decomposition
```
FinalCta.tsx                     — root (existing, refined)
└── (uses UseCaseChips from chapter 6)
```

## Cross-cutting

### Shared atoms folder
New folder `examples/vanilla-demo/src/components/home/landing/atoms/` for primitives shared across chapters:

- `Panel.tsx` — glass panel with accent radial bg (extracted from current local helper in `KindShowcaseSection`)
- `OrbitRing.tsx` — single SVG orbit ring with rotation prop
- `KindBadge.tsx` — small kind chip with mini-globe + label
- `ThemeSwatch.tsx` — single theme swatch button
- `StatChip.tsx` — single stat (icon + value + label)
- `CodeBlock.tsx` — mono pre with optional line numbers + copy button + syntax highlighting
- `index.ts` barrel export

### Theme presets data
New module `examples/vanilla-demo/src/components/home/landing/data/kind-themes.ts` exporting:

```ts
export const KIND_THEME_PRESETS: Record<GlobeKind, ReadonlyArray<{
  preset: ThemePresetName;
  label: string;
  swatch: string;  // single hex for swatch color
}>> = {
  outline:   [...3-4 entries...],
  dotted:    [...],
  wireframe: [...],
  hologram:  [...],
  paper:     [...],
};
```

Picked from existing `THEME_PRESETS` in core. 3 per kind minimum, 4 if a strong fourth exists.

### Motion & animation
- **No GSAP, no Framer Motion timelines** — Tailwind transitions + CSS keyframes (existing `home-scan-x`, new `breathe` for atmosphere intensity, new `slow-spin` for orbit rings).
- **IntersectionObserver hook** in `examples/vanilla-demo/src/components/home/landing/hooks/use-in-viewport.ts` for play/pause control.
- **Scroll parallax**: ScrollProgress already exists; add a `useScrollParallax(ref, factor)` hook that listens to scroll and applies `transform: translateY(${scrollY * factor}px)`. Used by hero orbit rings and personality rows.
- **Theme bleed**: CSS variable `--hero-accent` set on `HeroStage` root. All accent-using elements use `var(--hero-accent)`. Transition: `transition-colors transition-shadow duration-300`.

### Typography
Use Geist Variable (already installed via `@fontsource-variable/geist`).

| Element | Size | Weight | Tracking | Leading |
|---------|------|--------|----------|---------|
| H1 hero | `clamp(5rem, 5vw, 6.5rem)` | 600 | `-0.02em` | 0.92 |
| H2 section | `clamp(3rem, 3.6vw, 5rem)` | 600 | `-0.02em` | 1 |
| H3 row | `2.25rem` | 600 | `-0.01em` | 1.05 |
| Subhead | `1.125rem` | 400 | normal | 1.6 |
| Body | `0.875rem` | 400 | normal | 1.5 |
| Eyebrow / live pill | `0.6875rem` | 600 | `0.18em` (uppercase) | 1 |
| Mono code / HUD | `0.75rem` | 500 | `0.04em` | 1.4 |
| Stat value | `1.625rem` | 600 | `-0.01em` | 1 |

### Color system
| Token | Value | Use |
|-------|-------|-----|
| `--bg-deepest` | `#02030a` | Section bg outer |
| `--bg-deep` | `#03060c` | Hero bg base |
| `--bg-mid` | `#050812` | Card bg |
| `--bg-shell` | `#07111c` | Panel bg |
| `--accent-amber` | `#fbbf24` | Brand / outline kind accent |
| `--accent-cyan` | `#22d3ee` | Hologram / dotted kind accent |
| `--accent-violet` | `#a78bfa` | Wireframe kind accent |
| `--accent-paper` | `#f2c15b` | Paper kind accent |
| `--accent-rose` | `#f472b6` | Highlight / focus accents |
| `--text-white` | `#ffffff` | Headlines |
| `--text-slate-200` | `#e2e8f0` | Subheads |
| `--text-slate-400` | `#94a3b8` | Body |
| `--text-slate-500` | `#64748b` | Captions / muted |

Per-kind accent map (used by hero theme bleed and personality row tints):

```ts
const KIND_ACCENT: Record<GlobeKind, string> = {
  outline:   '#fbbf24',
  dotted:    '#67e8f9',
  wireframe: '#a78bfa',
  hologram:  '#22d3ee',
  paper:     '#f2c15b',
};
```

### Spacing rhythm
- Section vertical padding: `py-24` (1440) → `py-32` (1920) via `lg:py-32` or container query.
- Hero max width: `1880px`. Chapters max width: `1480px`.
- Grid gaps: `gap-6` (1440) → `gap-8` (1920).
- Section eyebrow margin: `mb-3` to title.
- Title to subhead: `mt-4`.
- Subhead to content: `mt-10`.

### Core extension — `globe.project()`
Add to `GlobeInstance`:

```ts
readonly project: (lat: number, lng: number) => readonly [number, number] | null;
```

Implementation in `create-globe.ts`:
1. Convert lat/lng to a unit Vector3 (use existing helper from `core/src/utils` if present, otherwise inline `latLngToVector3`).
2. Project via `vector.project(camera)` (Three.js NDC).
3. If z > 0 (back hemisphere) or NDC out of range, return `null`.
4. Map NDC `[-1, 1]` to canvas pixels, return `[x, y]`.

Wired through `DecorationGlobe` via new `onReady?: (api: { project; flyTo; instance }) => void` prop. The hero stores the api in a ref and uses it both for data anchors (every-frame projection) and for theme-bleed (calling `instance.update({ theme })` instead of remounting).

### DecorationGlobe extensions

Three small additions:
1. `onReady?: (api: { instance: GlobeInstance; project; flyTo }) => void` — exposes inner instance imperatively without breaking the existing declarative API.
2. Allow theme to update without remount: track previous `theme` prop; on change call `instance.update({ theme })` instead of triggering the effect's full teardown. Only kind change still remounts.
3. Allow `dataLayer?: DataLayer | null` prop to mount a data layer on init (used by `DataStorySection`).

These are additive and backwards compatible.

### Removed assets / content
- `LayerArchitectureSection.tsx` — deleted; content moved into `LayerAnatomySection.tsx`.
- `KindShowcaseSection.tsx` — deleted; content split across `KindPersonalitiesSection.tsx`, `StudioWorkflowSection.tsx`, `ApiSection.tsx`.
- `trustMarks` array (fake brand names) — deleted.
- `focusLabels` array (hard-coded city pills at hardcoded screen %) — deleted; replaced with neutral `LIVE TRACE` / `SIGNAL FEED` anchors that use real projection.
- 4 of 6 hero orbit ellipses — deleted; only 2 deliberate rings + 1 trajectory arc remain.
- Hero floor `clip-path` polygon skyline — deleted; replaced with radial floor gradient.

## Implementation Phasing

Phasing optimizes for: (a) hero ships first since user named it priority #1, (b) breaking changes (folder structure, atoms extraction) early, (c) stretch goals last.

1. **Atoms + folder restructure** — create `landing/atoms/` with shared primitives. Create `landing/data/kind-themes.ts`. Add `landing/hooks/use-in-viewport.ts` and `use-scroll-parallax.ts`.
2. **Core `globe.project()` extension** — implement in `create-globe.ts`, expose on `GlobeInstance`. Test with a stub call.
3. **DecorationGlobe extensions** — `onReady`, theme live-update, optional `dataLayer` prop.
4. **Hero rebuild** — split `HeroStage.tsx` into sub-components, integrate atoms, theme-bleed, real anchors, drag-rotate, integrated stat band.
5. **Personalities chapter** — new `KindPersonalitiesSection.tsx` + `PersonalityRow.tsx`.
6. **Anatomy chapter** — new `LayerAnatomySection.tsx` replacing `LayerArchitectureSection.tsx`. `LayerCard` + `AnatomyDiagram`.
7. **Workshop polish** — `WorkshopDial`, `LiveLogStrip`, integrate.
8. **Data & Storytelling chapter** — new `DataStorySection.tsx`, `StoryTimeline`, `ChoroplethStage`. Real `setDataLayer` call. Real `flyTo` cycler (with stretch upgrade to full `setStory`).
9. **Developer Surface polish** — `CodePlayground` with line numbers + syntax + copy. Use-case chips. Delete fake trust marks.
10. **Final CTA polish** — bigger globe, revised copy, use-case chips, integration.
11. **Wire into `HomeLanding.tsx`** — replace removed sections with new ones.
12. **Verification** — `pnpm --filter vanilla-demo typecheck` + `pnpm --filter vanilla-demo build`. Browser at 1440x900 + 1920x1080. Console clean. No horizontal overflow. All sections render without console errors. Theme-bleed works. Drag-rotate works. Anchors line up with globe. Story timeline plays.
13. **Reporting** — summarize changes, list any deferred stretch goals, ask user for commit approval.

## Risks & Mitigations

- **`globe.project()` correctness**: easy to get back-hemisphere culling wrong. Mitigation: add `console.debug` flag during dev; visually verify with two known reference points (NYC + Tokyo at `initialLat: 13, initialLng: -42` — NYC should be visible upper-left, Tokyo should be back-hemi → null).
- **Multi-globe FPS budget**: 5 globes in chapter 2 + 1 in hero + 1 in workshop + 1 in data + 1 in final = 9 globe instances. Mitigation: IntersectionObserver pause auto-rotate when out of viewport; `adaptiveQuality: true` (already on); profile if FPS drops on first build.
- **Theme live-update without remount**: depends on `globe.update({ theme })` actually working live. Mitigation: verified path in `create-globe.ts:706` exists for theme tokens; if blocked, fall back to remount with crossfade.
- **Story API integration**: setStory + playStory may have edge cases not yet hit. Mitigation: stretch goal — fall back to simpler `flyTo` cycler that doesn't depend on Story controller.
- **Real lat/lng anchors flickering during rotation**: anchor pills re-projecting every frame might jitter. Mitigation: throttle to 30fps and use `transform: translate3d` for hardware acceleration.
- **Section file growth**: each section already has many sub-components. Mitigation: enforce <300 lines per file; split aggressively.
- **Mobile collateral damage**: not a goal, but if existing mobile breakpoints regress badly, document as known issue.

## Verification Acceptance Criteria

- `pnpm --filter vanilla-demo typecheck` exits 0.
- `pnpm --filter vanilla-demo build` exits 0.
- At 1440x900 desktop:
  - Hero centerpiece globe is ≥ 660px wide.
  - No horizontal scrollbar.
  - Theme-bleed visibly tints orbit rings + atmosphere + code preview when switching kinds.
  - Drag-rotate works on hero globe.
  - Stat band shows 6 columns evenly.
  - All chapter sections render without console errors.
  - Personality rows alternate L/R correctly.
  - Anatomy 3×3 grid plus full-body diagram render.
  - Workshop live-log strip cycles.
  - Data & Storytelling globe renders with choropleth (or fallback flat globe if data layer fails to mount with neutral handling — no broken console error).
  - Code playground tabs switch and copy works.
  - Final CTA globe is large and Magnet CTA hovers.
- At 1920x1080 desktop: all of the above plus larger spacing/typography looks deliberate, no awkward gaps.

## Out of scope (this spec)

- Mobile / tablet redesign.
- Backend wiring (this is a static landing).
- Analytics events.
- A/B testing harness.
- Real GitHub stars / npm download fetch.
- Localization.
