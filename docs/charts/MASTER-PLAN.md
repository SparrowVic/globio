# Charts — Master Plan

> Plan biznesowo-architektoniczny dla `ChartsDataLayer`. Wyciągnięty z historii commitów (d900e39 → d4d6107, 8 etapów rozwoju), uzupełniony brainstormingiem rzeczy które jeszcze nie istnieją.
>
> **Status:** v1 zbudowany, gotowy do polishu i ekspansji. Plan opisuje **co jest** i **co powinno być**, w 4 horyzontach czasowych (now / next / soon / far).

---

## 1. Wizja

### 1.1 Czym Charts JEST

> Discrete per-anchor data visualisation on a globe. Każda lokalizacja na globie dostaje własny mini-wykres pokazujący strukturę / kompozycję / postęp / porównanie wielowymiarowych danych przypisanych do tego punktu.

**W jednym zdaniu:** *Charts pokazuje DETAIL per lokalizacja, podczas gdy heatmap pokazuje DENSITY a hexbin pokazuje DISTRIBUTION.*

### 1.2 Czym Charts NIE JEST

- **Nie jest** density-field render — to zostawiamy heatmapie
- **Nie jest** spatial-aggregation — to zostawiamy hex-binowi
- **Nie jest** generic charting library (jak Chart.js / D3) — chcemy tylko te formy które **mają sens przyklejone do globe'a** (czyli takie, które nie wymagają osi X/Y)
- **Nie jest** dashboard tool — to nie jest miejsce na tabele, KPI cards itp. (te idą do markerów / HTML overlays)

### 1.3 Use cases (kiedy sięgnąć po Charts)

| Kategoria | Przykład | Najlepszy chartType |
|---|---|---|
| **Composition** | Energy mix per country (renewable / fossil / nuclear / hydro) | `pie` / `donut` / `bars-stacked` |
| **Comparison** | Q1/Q2/Q3/Q4 sales per country | `bars-grouped` / `radial` |
| **Progress** | Renewable target % per country | `gauge` |
| **Magnitude** | Population per country | `extruded` |
| **Hierarchy (2-level)** | Region revenue + sub-category split | `sunburst` |
| **Cyclic** | Months of the year, weekdays | `radial` |
| **Single ranking** | GDP top 20 | `bars-grouped` (1 series) |

### 1.4 Persona docelowy

- **Deweloper aplikacji edu / dashboardu rządowego** — dostaje gotowe API, podstawia data, dostaje globe z wykresami
- **Storyteller** — chce zaprojektować scenes, każda focusująca się na innym kraju z animowanym wykresem
- **Data viz analyst** — chce eksplorować wielowymiarowy dataset, hover/click do drill-downu

---

## 2. Audyt — co już mamy (commit-by-commit)

### 2.1 Foundation (d900e39, ~1034 LOC)
**Wprowadza:** koncepcję data-layer dla wykresów per-anchor.

- 5 chart types: `bars-grouped`, `bars-stacked`, `pie`, `donut`, `radial`
- Anchor: lat/lng albo `id` → centroid kraju (przez `country-bounds`)
- Group rotated do surface tangent frame (`Quaternion.setFromUnitVectors`)
- Pie/donut billboard toward camera (czytelne na wysokich szerokościach)
- Module split: `anchors / bars-builder / pie-builder / charts-layer`
- Animation reuse: `HeatmapAnimationConfig` (33 easings, rise/pop/fade)
- Per-chart stagger (chart_index × stagger)
- CPU-driven dla 10²–10³ instancji (no shader pipeline)

### 2.2 Demo + tests (2e765ce, ~532 LOC)
- Standalone `charts.html` jako live playground
- 3 datasets: G7 energy mix, population age, quarterly sales
- HUD: size / height / inner radius / pad angle / animation
- Unit tests: anchors, bars-builder
- Public type exports

### 2.3 Per-segment animations + interactivity (dbe307d, ~210 LOC)
- `segmentStagger` — stagger w obrębie pojedynczego wykresu
- Per-chart-type behaviour:
  - `bars-grouped`: bars left→right
  - `bars-stacked`: bottom-up + mid-anim re-stacking (rosnące segmenty siedzą na ukończonych)
  - `radial`: clockwise sweep
  - `pie/donut`: alpha wipe + chart group scales on first segment's t
- Hover + click events (internal Three.js raycaster)
- `ChartsHoverPayload { entry, entryIndex, seriesKey, seriesIndex, value }`
- O(1) hit→(chart, segment) lookup via mesh-uuid index

### 2.4 HTML labels overlay (06a6bb1, ~274 LOC)
- `labels: bool | { mode, format, fontSize, color, ... }`
- 3 visibility modes: `hover`, `always`, `occlusion`
- Pure DOM (no CSS3DRenderer, lekki bundle)
- Tracks `Object3D` (parent transforms apply automatycznie — axisTilt, autoRotate)
- Behind-camera fade

### 2.5 Gauge + sunburst (e3b7240, ~250 LOC)
- `gauge`: 180° arc, `series[0] / gaugeMax`, two segments (background + foreground)
- `sunburst`: concentric rings (outer = series, inner = scale-mapped sum)
- Both auto-billboard
- Demo: `kpi` dataset auto-swap

### 2.6 Per-entry animation override (fd63dd6)
- `ChartsDataEntry.animation`: `delay` (composes with `stagger × index`), `enabled: false`
- Spotlight pattern: jeden kraj startuje natychmiast, reszta czeka

### 2.7 Extruded (d4d6107, ~197 LOC)
- `extruded` jako 8-my chart type
- Bridges do istniejącego `ExtrudedCountriesLayer` (nowe public `setProgress(t)`)
- Per entry: id → polygon, sum(values) → height, scale/series[0].color → top
- Charts orchestrator wyłącza built-in mount layera, drive'uje z własnego timeline

### 2.8 Liczby (po wszystkich commitach)
- **8 chart types** (3 bars-rodzaj + 2 ring-rodzaj + gauge + sunburst + extruded)
- **5 plików** w `data-layers/charts/` + jeden bridging file
- **HeatmapAnimationConfig** w pełni współdzielony
- **Demo:** 4 datasets, full HUD, tooltip, click events, replay
- **Tests:** anchors + bars-builder
- **Decoration:** outline kind only (na razie)

---

## 3. Public API — design principles

### 3.1 Filozofia

> *"You should be able to render charts on a globe in 5 lines of code, and tweak any nuance in the next 50."*

Konkretnie:
1. **Sensible defaults** — animation domyślnie włączone, billboard automatycznie dla flat charts, scale defaultuje do `viridis`, rozmiar do `0.05`
2. **Single `setDataLayer` call** — żadnych `addBarsLayer + addPieLayer` (bo charts to JEDEN sloti per globe)
3. **Type-driven** — discriminated union `ChartType` daje IntelliSense per typ
4. **Composition over configuration** — `series` array + `data` array, nie 5 osobnych pól per series
5. **Progressive disclosure** — minimal config = piękny default, advanced config = pełna kontrola

### 3.2 Minimalny przykład (smoke test API)

```ts
globe.setDataLayer({
  type: 'charts',
  chartType: 'pie',
  series: [
    { key: 'a', color: '#f25c5c' },
    { key: 'b', color: '#5cb8ff' },
  ],
  data: [
    { id: '840', values: { a: 60, b: 40 } },  // USA
    { id: '156', values: { a: 30, b: 70 } },  // China
  ],
});
```

### 3.3 Pełen przykład (demonstracja możliwości)

```ts
globe.setDataLayer({
  type: 'charts',
  chartType: 'bars-stacked',
  series: [
    { key: 'fossil', label: 'Fossil', color: '#f25c5c' },
    { key: 'nuclear', label: 'Nuclear', color: '#ffd700' },
    { key: 'renew', label: 'Renewables', color: '#65d18a' },
  ],
  data: [
    { id: '840', label: 'USA', values: { fossil: 60, nuclear: 19, renew: 21 } },
    { id: '276', label: 'Germany', values: { fossil: 44, nuclear: 6, renew: 50 } },
    // ...
  ],
  size: 0.06,
  height: 0.15,
  segmentStagger: 80,         // 80ms between stack segments
  labels: { mode: 'hover', fontSize: 12 },
  animation: {
    duration: 1200,
    stagger: 35,              // 35ms between countries
    easing: 'ease-out-back',
    style: 'pop',
  },
  events: {
    onHover: (payload) => showTooltip(payload),
    onClick: (payload) => drillDown(payload.entry),
  },
});
```

### 3.4 Naming conventions

- `chartType` — kind of chart (discriminator)
- `series` — column definition (key, label, color)
- `values` (na entry) — keyed by series.key
- `size` — overall chart footprint (world units, 1 = globe radius)
- `height` — bar / extrusion height
- `*Stagger` — czas w **ms** (zawsze ms, nigdy sekundy w public API)
- `events` — `{ onHover, onClick }` z payloadami discrim-uniony

---

## 4. Hierarchical functionality tree

Legenda:
- ✅ built — działa, jest w API
- 🚧 partial — zaczęte, niepełne
- 🌱 planned — design gotowy, brak implementacji
- 💡 idea — brainstorm, do dyskusji

### 4.1 Główna funkcjonalność: **Chart types**

#### 4.1.1 ✅ `bars-grouped`
- ✅ N parallel bars side-by-side
- ✅ Per-series color
- ✅ Auto-width (size / N)
- ✅ Per-bar animation (segmentStagger)
- ✅ Per-bar hover/click
- 🌱 Per-bar value labels (mini "78" nad słupkiem)
- 💡 Negative values (bary rosnące w dół od baseline)
- 💡 Min-bar visibility (cap 1px na zerowych wartościach żeby były klikalne)

#### 4.1.2 ✅ `bars-stacked`
- ✅ Single column, N coloured segments
- ✅ Heights proporcjonalne do udziału × stackHeight
- ✅ Bottom-up segment reveal animation
- ✅ Mid-anim re-stacking (segments siedzą na sobie podczas wzrostu)
- ✅ Global peak normalisation (komparowalne między krajami)
- 🌱 100% mode (każdy stack = 100%, niezależny od totalu)
- 💡 Negative segments (np. profit/loss above and below zero line)
- 💡 Connector lines między stackami sąsiednich krajów (typu Marimekko)

#### 4.1.3 ✅ `pie`
- ✅ Flat disc, segmenty value-proportional
- ✅ Pad angle (gap między segmentami)
- ✅ Rotation override
- ✅ Auto-billboard
- ✅ Alpha wipe per-segment animation
- 🌱 3D extrusion (każdy segment ma swoją wysokość, np. winning slice odbija się)
- 💡 Exploded pie (klik segmentu odsuwa go od środka)
- 💡 Concentric multi-pie (donut + pie + dot — porównanie 3 timepointów)

#### 4.1.4 ✅ `donut`
- Wszystko z pie
- ✅ Inner radius (0..0.95)
- 🌱 Center label (np. total w środku)
- 💡 Multi-ring donut (osobne rings dla różnych roczników)

#### 4.1.5 ✅ `radial`
- ✅ N spokes around center, height = value
- ✅ Clockwise sweep animation
- ✅ Auto angle distribution (2π/N)
- 🌱 Per-spoke labels (etykiety przy końcu spoke'a)
- 💡 Polar grid lines (concentric rings za bars dla skali)
- 💡 Closed-loop fill (area chart wokół centrum łączący wierzchołki)

#### 4.1.6 ✅ `gauge`
- ✅ 180° arc, value/gaugeMax → fill ratio
- ✅ Background arc + foreground fill
- ✅ Custom colors
- 🌱 Multi-gauge (3 gauges in one chart, np. CPU/RAM/Disk)
- 💡 Gauge with min/max markers (target zone wyróżnione na arc'u)
- 💡 Animated needle (zegarowa wskazówka zamiast wypełniania)
- 💡 Threshold zones (czerwony/żółty/zielony arc dla wartości)

#### 4.1.7 ✅ `sunburst`
- ✅ 2-level: outer = series, inner = total (scale-mapped)
- 🌱 Multi-level (`series[i].parent` dla hierarchii)
- 🌱 Click drill-down (kliknięcie segmentu zoomuje do jego sub-tree)
- 💡 Coxcomb / rose chart wariant (tj. sunburst gdzie wysokość ≠ kąt)

#### 4.1.8 ✅ `extruded`
- ✅ Per kraj, polygon → 3D prism
- ✅ Height = sum(values)
- ✅ Color from scale or series[0]
- ✅ Layer-wide animation t
- 🌱 Per-entry stagger dla extruded (każdy kraj wstaje osobno)
- 🌱 `extruded-stacked` (warstwy kolorowe per series w słupie)
- 💡 Glow / outline at top edge (świecąca obwódka korony słupa)
- 💡 Wall pattern (gradient od dołu do góry zamiast jednolitego koloru)

#### 4.1.9 💡 PROPOSED new chart types

| Typ | Co pokazuje | Najlepsze użycie |
|---|---|---|
| `treemap` | Hierarchical area | Budget breakdown per country |
| `sparkline` | Mini line chart | Time-series per anchor (last 12 months) |
| `area` | Filled area (radial) | Daily traffic profile per region |
| `flow` | Sankey-like | Trade flows between anchors |
| `bullet` | Compact gauge | KPI vs target with comparison line |
| `waffle` | 10×10 grid of squares | Survey results % |
| `heatmap-grid` | Mini matrix per country | Hour-of-day × day-of-week |
| `connection-bars` | Pair of bars + linking arc | Bilateral data (e.g. trade flows pairs) |

### 4.2 Główna funkcjonalność: **Data binding**

#### 4.2.1 ✅ Anchor resolution
- ✅ Explicit `position: LatLng` wins
- ✅ `id` → country centroid via feature index
- 🌱 `position: { region: 'EU' }` — region anchor (avg of constituent country centroids)
- 💡 City-level resolution (built-in city name → lat/lng table for top 200)
- 💡 Custom resolver callback (`resolvePosition: (entry) => LatLng`)

#### 4.2.2 ✅ Series definition
- ✅ `series: ChartSeries[]` z `key` / `label` / `color`
- 🌱 `series[i].format` (custom value formatter for tooltips/labels)
- 🌱 `series[i].pattern` (stripes / dots / gradients zamiast solid color)
- 💡 Hierarchical series (`series[i].parent` dla sunburst)

#### 4.2.3 ✅ Values
- ✅ `values: Record<key, number>` na entry
- ✅ Missing keys → 0 (segment skipped)
- ✅ Negative → clamped to 0 (geometry assumption)
- 💡 Allow negative (per-chart-type opt-in, np. dla bars over baseline)
- 💡 Time-series values (`values: Record<key, number[]>` + `currentFrame: number`)

#### 4.2.4 ✅ Scale binding
- ✅ Reuses `ScaleConfig` (sequential / diverging / threshold / categorical)
- 🌱 Per-series scale override (`series[i].scale` dla różnych skali per series)
- 💡 Auto-scale picker (analiza danych → sugestia palette)

### 4.3 Główna funkcjonalność: **Animation system**

#### 4.3.1 ✅ Mount animation
- ✅ Reuses `HeatmapAnimationConfig` (lib of 33 easings)
- ✅ Styles: `rise` / `pop` / `fade` / `pulse`
- ✅ Per-chart stagger (chart index × stagger)
- ✅ Per-segment stagger (within chart)
- ✅ `playAnimation()` public reset
- ✅ Per-entry `animation: { delay, enabled }` override
- 🌱 `animation.order` jak w hexbin (radial / value-ordered / random)
- 🌱 `animation.origin` — anchor for radial bloom
- 🌱 Per-segment `style` różne (np. bars rise, but pies pop)

#### 4.3.2 🌱 Story-engine integration
- 🌱 `playAnimation({ trigger: 'enter', target: { id } })` — animate ONE entry
- 🌱 `playAnimation({ trigger: 'leave', target: { id } })` — reverse animation
- 🌱 `setHighlight(entryIndex)` — programmatic highlight (for Storyboard)
- 💡 Scene-driven `dataLayer` override (per scene chart config)

#### 4.3.3 💡 Continuous animations
- 💡 `style: 'pulse'` adopted by charts (segments breathe on a sine wave)
- 💡 `style: 'flow'` — sankey-like animated arrows
- 💡 `style: 'rotate'` — pie/donut spin slowly
- 💡 Data-update transition (smooth crossfade gdy `setData` z nowymi wartościami)

#### 4.3.4 💡 Frame-budget guard
- 💡 Auto-pause animation when below FPS threshold (reduce-motion respect)
- 💡 `prefers-reduced-motion` honour (skip to final state)

### 4.4 Główna funkcjonalność: **Interaction**

#### 4.4.1 ✅ Hover / click events
- ✅ `events.onHover(payload)` — fires on segment enter/leave
- ✅ `events.onClick(payload)` — fires on pointer down
- ✅ `ChartsHoverPayload { entry, entryIndex, seriesKey, seriesIndex, value }`
- ✅ Internal raycaster z mesh-uuid index O(1) lookup
- 🌱 Hover highlight (visual feedback — tinted segment / raised bar)
- 🌱 Selected state (sticky highlight after click)
- 💡 Multi-select (cmd-click adds to selection)
- 💡 `events.onContextMenu` (right-click for menu)

#### 4.4.2 🌱 Visual hover feedback
- 🌱 `ChartsHighlight` overlay (analogiczne do `HexBinHighlight`)
- 🌱 Dim non-hovered (`highlight.dimRest: 0.3`)
- 💡 Connect lines on hover (np. linia łącząca pie segments z legendą po stronie)

#### 4.4.3 💡 Keyboard navigation
- 💡 Arrow keys cycle through entries (focus)
- 💡 Tab through segments within an entry
- 💡 Enter = trigger click
- 💡 Esc = clear selection

#### 4.4.4 💡 Touch gestures
- 💡 Long-press = tooltip (mobile equivalent of hover)
- 💡 Swipe = next entry
- 💡 Pinch on chart = drill-down zoom

### 4.5 Główna funkcjonalność: **Labels + overlays**

#### 4.5.1 ✅ Per-chart label
- ✅ DOM-based, per-frame projection
- ✅ Modes: `hover` / `always` / `occlusion`
- ✅ Tracks Object3D for parent transforms
- ✅ Custom format callback
- 🌱 Per-segment value labels (mini number above each bar)
- 💡 Connect-line label (label off-globe with line pointing to chart)
- 💡 Follow-cursor tooltip (built-in, no need to wire manually)

#### 4.5.2 💡 Legend
- 💡 Auto-built from `series`
- 💡 Position: `top-right` / `bottom-left` / etc
- 💡 Click legend item → highlight that series across all charts
- 💡 Hover legend item → dim other series
- 💡 Already exists `globe.showLegend` — wire `chartsLayer.showLegend()`

#### 4.5.3 💡 Title / subtitle per chart
- 💡 `entry.title?: string` — bigger text above the chart
- 💡 `entry.subtitle?: string` — smaller below

#### 4.5.4 💡 Inline annotations
- 💡 `annotations: [{ position, text, arrow? }]` — point to specific segment with text

### 4.6 Główna funkcjonalność: **Visual styling**

#### 4.6.1 ✅ Layout knobs
- ✅ `size` (overall footprint)
- ✅ `height` (bar / extrusion)
- ✅ `innerRadius` (donut)
- ✅ `padAngle` (segments gap)
- ✅ `rotation` (chart rotation around normal)
- ✅ `gaugeMax` / `gaugeBackgroundColor`
- 🌱 `align: 'center' | 'top' | 'bottom'` (where chart sits relative to anchor)
- 💡 `tilt: number` (rotate chart away from billboard, e.g. 15° tilt for pseudo-3D)

#### 4.6.2 ✅ Colors
- ✅ `series[i].color` per-series override
- ✅ Layer `scale` ColorScale (sequential/diverging/categorical/threshold)
- ✅ Fallback color
- 🌱 Per-entry color override (`entry.color`)
- 💡 Gradient fills (`series[i].gradient: [start, end]`)
- 💡 Pattern fills (`series[i].pattern: 'stripes' | 'dots' | 'crosshatch'`)
- 💡 Theme tokens (`charts.barColor.primary` etc., per-kind tinted)

#### 4.6.3 ✅ Materials
- ✅ Solid `MeshBasicMaterial` (outline kind)
- 🌱 Additive glow (dotted kind decoration — port pending)
- 🌱 Wireframe (wireframe kind decoration)
- 🌱 Stamped ink (paper kind)
- 🌱 Cyan scanline (hologram kind)

#### 4.6.4 ✅ Billboard mode
- ✅ Auto-on for pie/donut/gauge/sunburst
- ✅ Override `faceCamera`
- 🌱 Smooth billboard transition (kąt zamiast snapping)
- 💡 Partial billboard (lock Y axis, rotate only on Z — like text labels)

#### 4.6.5 💡 Borders / strokes
- 💡 `borderWidth` / `borderColor` (already in type, not implemented)
- 💡 Per-segment stroke (każdy slice ma cienką obwódkę, czytelność na słabym kontraście)

#### 4.6.6 💡 Shadows / depth
- 💡 Drop shadow under chart on globe surface
- 💡 Z-shift (raise chart above globe to avoid surface clutter)
- 💡 Glow halo around chart (subtle ambient glow)

### 4.7 Główna funkcjonalność: **Performance**

#### 4.7.1 ✅ CPU-driven model
- ✅ Per-frame transforms scale fine for 10²–10³ instances
- ✅ Pure DOM labels (no CSS3DRenderer)
- 🌱 LOD: collapse small charts to dots when far (camera distance)
- 🌱 Frustum culling per-chart (not visible → skip update)
- 💡 InstancedMesh for bars-grouped (single draw call for all bars)
- 💡 ShaderMaterial path for 10⁴+ charts (move height/color into uniforms)

#### 4.7.2 💡 Memory
- 💡 Geometry pool (reuse one BoxGeometry across all bars)
- 💡 Material atlas (pre-built materials by color, hash lookup)

#### 4.7.3 💡 Bake-key cache
- 💡 Mirror heatmap pattern: skip rebuild when only intensity-like params change
- 💡 Diff-based update: only re-position changed entries

### 4.8 Główna funkcjonalność: **Decoration model (per-kind variants)**

Per `FEATURES.md §5c.2` matrix.

| Kind | Status | Wariant |
|---|---|---|
| outline | ✅ built | Solid MeshBasicMaterial, opaque colours |
| dotted | 🌱 planned | Additive glow segments, neon edges |
| wireframe | 🌱 planned | Charts rendered as wireframe edges only |
| paper | 🌱 planned | Stamped ink, hand-drawn edges, pastel fills |
| hologram | 🌱 planned | Cyan glowing charts, scanline overlay, slight glitch |

Each decoration is a `DataLayerBuilder` factory in the kind's `decorations.dataLayers.charts`.

### 4.9 Główna funkcjonalność: **Storytelling integration**

#### 4.9.1 🌱 Per-scene focus
- 🌱 Story scene defines `dataLayer.focus: { id: 'PL' }` → that chart pops, others dim
- 🌱 `flyTo(country)` → entry's chart auto-replays its mount animation
- 🌱 Inter-scene crossfade (chart shrinks, replays at new focus)

#### 4.9.2 💡 Comparison mode
- 💡 Show two datasets simultaneously (split chart in half — left=2020, right=2025)
- 💡 Diff visualisation (height = delta, color = direction)

#### 4.9.3 💡 Replay controls
- 💡 Layer-level play/pause/seek (timeline scrubber HUD)
- 💡 Per-chart timing override

### 4.10 Główna funkcjonalność: **Export / dev experience**

#### 4.10.1 💡 Snapshot
- 💡 PNG export of the canvas (already three.js trivial)
- 💡 SVG export of label overlay + chart projections
- 💡 Embed code generator (copy-paste config)

#### 4.10.2 💡 Inspector
- 💡 Right-click → reveal chart's resolved internals (final config + scale extent)
- 💡 Headless test mode (skip render, expose layer state for assertions)

#### 4.10.3 💡 Sample data
- 💡 Bundled `import { sampleEnergyMix } from '@your-globe/core/samples/charts'`
- 💡 6-8 curated datasets (energy / population / GDP / KPI / sales / quarterly / climate / migration)

---

## 5. Roadmap (priorytety)

### 5.1 v1.0 — Polish (≤ 1 sprint)

**Cel:** zamknąć wszystkie podejrzane edge'e i ucztę pierwszego testu publikacyjnego.

- ✅ DONE: 8 chart types
- 🌱 Per-bar value labels (najważniejsza brakująca afordancja)
- 🌱 Hover highlight overlay (visual feedback po hover, na razie jest tylko event)
- 🌱 Border / stroke per segment (pole w typie istnieje, brak implementacji)
- 🌱 Animation `order` field uznawany w charts (jak w hexbin)
- 🌱 Theme tokens dla charts colors (`charts.fill.default` etc.)
- 🌱 Per-entry `color` override
- 🌱 Tests: pie-builder, gauge-builder, sunburst-builder, extruded-builder

### 5.2 v1.1 — UX expansion (≤ 2 sprinty)

**Cel:** zrobić Charts pełnym, wygodnym narzędziem.

- 🌱 Auto-built legend (`globe.showLegend(layer.scale)` integration)
- 🌱 Selected-state (sticky after click, multi-select)
- 🌱 Keyboard navigation (arrow + enter)
- 🌱 Reduced-motion respect
- 🌱 LOD (small charts → dots when zoomed out)
- 🌱 `extruded-stacked` chart type (stacked layers in extruded)
- 🌱 Per-entry stagger for extruded
- 🌱 Story-engine bridge (`playAnimation({ trigger, target })`)

### 5.3 v1.5 — Ambitious (1 quarter)

**Cel:** wykraczać poza standard Chart.js — coś czego konkurencja nie ma.

- 💡 Time-series support (multi-frame data + scrub HUD)
- 💡 Linked charts (selecting series in one dimms it across all)
- 💡 Connection arcs between chart pairs (e.g. trade flows)
- 💡 Comparison mode (split chart for two datasets)
- 💡 Drill-down (click → expand to detail chart in same anchor)
- 💡 Multi-level sunburst
- 💡 New chart types: treemap, sparkline, bullet
- 💡 Decoration ports: dotted, hologram

### 5.4 v2 — Research (1+ year)

**Cel:** WOW factor, demos do konferencji.

- 💡 Sankey flow chart między anchorami
- 💡 Time-keyframed data + interactive timeline
- 💡 AR mode (chart popup w AR przed twarzą)
- 💡 Voice query ("show me energy mix in europe") → auto-config
- 💡 Auto-narrative ("USA has the highest fossil share") generated tooltips
- 💡 ML-driven palette + chartType suggestion ("twoje dane lepiej wyglądają jako stacked bars")

---

## 6. Brainstorming — co jeszcze może to robić?

### 6.1 "Charts as a graph"

Co jeśli zamiast traktować Charts jako osobne wykresy, traktować je jako węzły grafu?
- Per-anchor chart = node
- Connection arc = edge (z payload np. flow magnitude)
- Hover node → highlight connected edges
- Click node → focus + zoom + load detail
- **Use case:** trade networks, supply chains, migration flows, social network mapping

### 6.2 "Charts as KPI dashboard"

Każdy chart to mini-dashboard tile.
- Multiple charts per anchor (np. country = 3 charts: energy + population + GDP)
- Auto-layout (charts stack vertically above the country)
- Toggle visibility per "tile"
- **Use case:** government dashboards, Olympic medal tracker

### 6.3 "Charts as time-machine"

- Slider HUD changes the time index
- Charts smoothly morph between frames
- Optionally: leave "ghosts" of past frames (trailing color)
- **Use case:** climate change, COVID spread, demographic shifts

### 6.4 "Charts as game UI"

- Each chart is a game tile (e.g. building production rate)
- Click → action menu
- Hover → preview of next state
- Animated growth / decay
- **Use case:** strategy games, edu games

### 6.5 "Charts as story"

- Story-driven choreography: scene 1 highlights USA's pie, scene 2 zooms to Europe with stacked bars, scene 3 compares both
- Each scene defines its own `chartType` override
- Charts smoothly transform between types (pie → donut → radial)
- **Use case:** journalism interactives, edu courses

### 6.6 Niewidoczne ale ważne integracje

- **HtmlMarkers:** charts mogą współistnieć z markers — chart pokazuje liczby, marker pokazuje city name
- **Arcs:** arcs links between chart anchors (flow data)
- **Country labels:** auto-hide country labels when charts are present (reduce clutter)
- **Atmosphere:** charts colors should respect atmosphere intensity (dimmer night-side)
- **Legend HUD:** auto-build from `series` definitions

---

## 7. Open questions (need user input)

1. **Multi-anchor charts** — czy chcemy aby JEDEN chart mógł reprezentować region (avg of countries) czy zostajemy przy single-anchor?
2. **Time-series priorytet** — jak istotny jest time-axis vs. spread spatially? (Time slider HUD = dużo pracy)
3. **Decoration kinds** — który kind po outline ma dostać port jako pierwszy? Dotted (najczęściej używany) vs Hologram (najbardziej widowiskowy)?
4. **Performance ceiling** — ile chartów chcemy wspierać "bez myślenia"? 100? 1000? 10000? (Wpływa na to czy iść w InstancedMesh / shader path)
5. **Charts vs Bars** — czy `BarsDataLayer` nadal ma sens jako osobny data-layer, czy konsolidujemy w `chartType: 'bars-grouped'` z 1 series? Konsolidacja upraszcza API, łamie back-compat.
6. **`ChartsDataEntry.color` per-entry override** — nie istnieje w typach. Czy dodać? (Wartościowe dla "wybierz kolor zamiast brać ze skali" use-case'u — np. flag colour per kraj.)

---

## 8. Implementation principles (jak rozwijać)

1. **Każdy nowy chartType = nowy plik builder** w `data-layers/charts/`. Nie dosypujemy do istniejących.
2. **Animation reuse** — nigdy nie pisz własnego easing, korzystaj z `heatmap/animation.ts`.
3. **Tests per builder** — każdy builder ma test swojej geometrii (vertex count, position math).
4. **Demo per chartType** — `/charts.html` musi mieć przycisk + dataset dla każdego nowego typu, inaczej user nie odkryje.
5. **FEATURES.md update** — każda nowa funkcjonalność musi mieć update w §4.6.
6. **No silent dropping** — jeśli nie wiemy jak coś animować dla nowego chartType, dodaj `case`-fallback z console.warn, nie zostaw `default` => crash.
7. **TypeScript strict** — wszystkie pola opcjonalne mają domyślne wartości w resolverze, nigdy nie wracaj `undefined` w hot path.

---

## 9. Quick reference: pliki

```
packages/core/src/data-layers/charts/
├── anchors.ts             — lat/lng → surface frame, id resolution
├── bars-builder.ts        — grouped/stacked/radial bar geometry
├── pie-builder.ts         — pie/donut/gauge/sunburst (annulus + arcs)
├── extruded-builder.ts    — bridge to ExtrudedCountriesLayer
├── labels-overlay.ts      — DOM-based labels with 3 visibility modes
└── charts-layer.ts        — orchestrator: build, tick, dispose, raycaster

packages/core/src/data-layers/types.ts
  → ChartsDataLayer, ChartsDataEntry, ChartsHoverPayload,
    ChartType, ChartSeries, ChartsLabelsConfig

packages/core/src/index.ts
  → public exports

examples/vanilla-demo/
├── charts.html            — playground HUD
└── src/charts.ts          — datasets + bindings
```

---

*Plan otwarty — odpowiedzi na §7 open questions zmieniają priorytety. Update'uj ten dokument przy każdej znaczącej zmianie kierunku.*
