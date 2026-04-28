# Globio — Features Catalog

> Living document. Decyzje o featurach, ich scope, audytorium i statusie wersji. Każdy feature
> ma jednoznacznie określone tagi — to jest jednocześnie roadmapa, vision i source of truth dla
> API.

---

## Notation

Każdy feature poniżej oznaczany jest tagami w nawiasie kwadratowym:

| Symbol | Znaczenie |
|---|---|
| **Audience** | `A·marketing` `B·dataviz` `C·edu` `D·travel` `F·gry` (v1) — `E·news` `G·sym` `H·universal` (future) |
| **Scope** | `[GLOBAL]` jedna wartość per instancja `·` `[STYLE]` zmienia się z presetem `·` `[LAYER]` per warstwa danych `·` `[EVENT]` interakcja `·` `[INSTANCE]` per integracja frameworkowa |
| **Status** | `[v1]` `[v1.x]` `[v2+]` `[stretch]` |
| **Effort** | `[S]` ≤ kilka dni `·` `[M]` 1-2 tyg. `·` `[L]` 2-6 tyg. `·` `[XL]` > 1.5 mies. |
| 🌟 | **Differentiator** — feature który wyróżnia Globio na tle istniejących bibliotek |

---

## 1. Vision & non-goals

**Vision.** Globio jest interaktywną biblioteką globusa 3D budowaną raz w czystym TS na Three.js,
z pierwszorzędnymi wrapperami React/Angular/Vue. Trzy filary, które wyróżniają ją na tle
istniejących rozwiązań (`globe.gl`, `three-globe`, `react-globe`):

1. **Curated visual styles** — 6 starannie zaprojektowanych presetów (outline, dotted,
   wireframe, choropleth, paper, hologram). Zmiana stylu = jedna linijka.
2. **Theme token system** — wszystkie kolory/efekty wyrażone designerskimi tokenami
   (`globe.surface`, `markers.default`, `atmosphere.color`...). Override 1 tokena albo własny pełny preset.
3. **Story / Narrative engine** — deklaratywny timeline scen kamery + highlight + popup; killer feature dla
   marketing landing pages oraz edukacji.

**Non-goals (dla v1, świadome cięcia).**

- 2D map projections (Mercator/Albers/...) — to jest terytorium `d3-geo`; nie reimplementujemy.
- Precyzja GIS poziomu sub-metr — jesteśmy lib wizualizacyjnym, nie geo-platformą.
- Server-side rendering pełnego interaktywnego globusa — tylko static snapshot.
- Wbudowany geocoder, edytor shapefile, ephemeris satelitów.
- Symulacja fizyczna atmosfery / pogody / orbity (zostaje w `G·sym`, future).
- Game engine — nawet jeśli wspieramy use-case `F·gry`, ograniczamy się do warstwy widoku.

---

## 2. Use cases

| Tag | Use case | Status | Co to znaczy w praktyce |
|---|---|---|---|
| **A·marketing** | Landing pages / hero | v1 | Estetyka, atmosphere glow, subtelna rotacja, snapshot do socials |
| **B·dataviz** | Dashboardy, analityka | v1 | Wiele markerów, arcs, choropleth, klastrowanie, legenda, eksport |
| **C·edu** | Edukacja, story-telling | v1 | Etykiety, popupy, sceny narracyjne, focus-on-country |
| **D·travel** | Travel / logistics | v1 | POI, routy, animowane arcs, klikalne punkty, czasy podróży |
| **F·gry** | Geo-gry / quizy | v1 | "Kliknij Polskę", efekty po dobrej/złej, leaderboard hooks |
| **E·news** | Embed do artykułów | future | Lekka waga, statyczne snapshoty, autoplay scen |
| **G·sym** | Symulacje (pożary, orbity, satelity) | future | Realistyczne tekstury, day/night, time-keyframed data |
| **H·universal** | Uniwersalność jako meta-cel | future | "Każdy use-case obsłużony równo" — strategiczny cel długoterminowy |

---

## 3. Globe styles catalog

### 3.1 Outline (default) `[v1·M·built]` 🎨 `A·B·C·D`

- **Vibe:** ciemna kosmiczna sfera, wektorowe granice, atmosphere glow.
- **Anatomia:** solid sphere + LineSegments per kraj + atmosphere shader.
- **Tokens:** `globe.surface`, `globe.borders`, `borders.width`, `atmosphere.color`,
  `atmosphere.intensity`, `background`.
- **Best for:** uniwersalny default; doskonały do dataviz i marketingu.
- **References:** react-globe.gl default look.
- **Status:** ✅ częściowo zaimplementowany (potrzebuje refinement: hover/click na krajach,
  lepsza typografia atmosphere, dotted/filled subwarianty).

### 3.2 Dotted (Apple/Stripe-style) `[v1·M]` 🎨 `A·B`

- **Vibe:** świetlne kropki układające granice państw na czarnej kuli.
- **Anatomia:** czarna sfera + Points cloud sampling kraju (regular grid albo
  Poisson-disc sampling) + atmosphere.
- **Tokens:** `dotted.color`, `dotted.density`, `dotted.size`, `dotted.glow`, `background`.
- **Best for:** premium SaaS hero, B2B marketing, "globalna obecność".
- **References:** stripe.com hero, apple privacy globe, openai DALL-E hero.
- **Sub-warianty (`v1.x`):** dotted-grid (regularna siatka), dotted-organic (Poisson),
  dotted-data (gęstość zależna od metryki).

### 3.3 Wireframe / Retro Tron `[v1·S]` 🎨 `A·F`

- **Vibe:** sama siatka południków/równoleżników, brak kontynentów.
- **Anatomia:** generowane LineSegments dla siatki lat/long + opcjonalne pulsowanie linii.
- **Tokens:** `wireframe.color`, `wireframe.density`, `wireframe.opacity`, `wireframe.pulse`.
- **Best for:** vintage-tech, hacker-look, gry retro, also tryb "bez danych geo" (offline-first).
- **References:** Tron, Mass Effect Galaxy Map, retro Apple ][.

### 3.4 Choropleth Heatmap `[v1·M-L]` 🎨 `B·C`

- **Vibe:** kraje wypełnione kolorem z gradientu wg metryki + wbudowana legenda.
- **Anatomia:** per-country mesh (earcut triangulacja) z dynamic vertex/material colors +
  scale legend HUD.
- **Tokens:** `choropleth.scale` (sequential/diverging/categorical), `choropleth.noData`,
  `legend.bg`, `legend.font`.
- **Best for:** dashboardy ekonomiczne, demograficzne, polityczne; również baza dla edukacyjnych map.
- **References:** datamaps, observable choropleths, kepler.gl.

### 3.5 Paper / Illustrated `[v1·M]` 🎨 `C·D·F`

- **Vibe:** kremowy "pergamin", lekko nierówne hand-drawn granice, pastelowe kontynenty,
  delikatne cienie i tekstura papieru.
- **Anatomia:** textured sphere (procedural paper noise) + custom rough-line shader dla granic +
  filled country meshes z lekko organicznymi kolorami.
- **Tokens:** `paper.bg`, `paper.land`, `paper.border`, `paper.borderRoughness`, `paper.gridLines`.
- **Best for:** edukacja dziecięca, gry geo, Mappa-Mundi-style infographics, story-telling.
- **References:** napkin sketches, infographic atlases, Studio Ghibli maps.

### 3.6 Hologram `[v1·M-L]` 🎨 `A·F`

- **Vibe:** półprzezroczysty turkusowy globus, scanline'y CRT, drobne glitch'e, emisyjna obwódka.
- **Anatomia:** transparent shell mesh + scanline shader + animated glitch displacement +
  atmosphere-emission.
- **Tokens:** `hologram.color`, `hologram.scanlineFreq`, `hologram.glitchAmount`,
  `hologram.flickerRate`.
- **Best for:** sci-fi UI, premiery produktów tech, gry, military/intel mockupy.
- **References:** Anduril, Mass Effect, Westworld console UI.

### 3.7 Topographic / Satellite `[v2+·M]` 🎨 `C·D·G·sym(future)` 🚀 *future*

- **Vibe:** realistyczna tekstura Ziemi (oceany, terrain, lód) + opcjonalne wektorowe obrysy państw.
- **Anatomia:** sphere z Earth equirectangular texture + bump/normal map + opcjonalna warstwa borders.
- **Trade-off:** wymaga licencjonowanej tekstury (Natural Earth, NASA Visible Earth) — kilka MB.
  Bundle albo lazy-load.

### 3.8 Neon Cyberpunk `[v2+·S]` 🎨 `A·F` 🚀 *future*

- **Vibe:** wariant outline'u + bloom + dwukolorowe granice (magenta/cyan) + scanline subtelny.
- **Anatomia:** outline + post-processing bloom pass + dwa style passes dla granic.
- **Trade-off:** prosty technicznie (w gruncie rzeczy outline z post-fx), ale wymaga post-processing
  pipeline który dotąd nie był potrzebny.

---

## 4. Cross-cutting feature catalog

### 4.1 Theming & color system 🌟

> Centralny system designerski — wszystkie kolory, gradienty i parametry estetyczne wyrażone tokenami.

- **Theme tokens** `[v1·GLOBAL·M·built]` 🌟 — **23 tokeny** z hierarchicznym, opisowym nazewnictwem:
  `background.color`, `globe.surfaceColor/surfaceTextureUrl`, `countries.border.{color,width,opacity}`,
  `countries.borderHover.{color,width,opacity}`, `countries.borderActive.{color,width,opacity}`,
  `tooltip.{backgroundColor,textColor,fontSize,fontFamily,padding,borderRadius}`,
  `lights.ambient.{color,intensity}`, `lights.directional.{color,intensity}`, `markers.defaultColor`,
  `atmosphere.{color,intensity}`. Każdy token to string (kolor/URL/CSS) albo number;
  w przyszłości też gradient i function `(value, ctx)`.
- **Theme tokens override** `[v1·GLOBAL·S·built]` — `theme: { tokens: { 'globe.surfaceColor': '#f00' } }`.
- **Built-in theme presets** `[v1·GLOBAL·S·built]` — v0.2.x ships 5 outline-style presets:
  `outline-dark`, `outline-light`, `outline-sunset`, `outline-cyber`, `outline-monochrome`. Presety dla
  pozostałych stylów (dotted, paper, hologram) dochodzą wraz z ich implementacją.
- **Custom theme presets (`registerThemePreset`)** `[v1·GLOBAL·S·built]` 🌟 — `registerThemePreset('my-brand', tokens)`
  rejestruje własny preset jako pełnoprawnego obywatela; działa wszędzie gdzie built-in
  (`theme: 'my-brand'` lub `theme: { extends: 'my-brand', tokens: {...} }`). Custom shadow built-in (rebrand without fork).
- **Theme `extends` (inherit from named preset)** `[v1·GLOBAL·S·built]` — `theme: { extends: 'outline-cyber', tokens: { 'markers.defaultColor': '#f00' } }`. Skrót: `theme: 'outline-cyber'`.
- **Light / dark variants per styl** `[v1.x·GLOBAL·S]` — `theme: { name: 'paper', mode: 'dark' }`.
- **Live theme transition** `[v1.x·GLOBAL·M]` — animacja zmian tokenów (np. day→night switch).
- **CSS variable bridge** `[v2+·GLOBAL·S]` — `theme: 'css-vars'` czyta `--globio-globe-surface` etc.
- **Color-blind safe wariants** `[v1.x·GLOBAL·S]` — zapakowane alternatywy dla choropleth scale.

### 4.2 Camera, navigation & focus

- **Free orbit / drag rotate** `[v1·GLOBAL·S·built]` — bazowe; już mamy.
- **Wheel/pinch zoom** `[v1·GLOBAL·S·built]` — 3 tryby (`classic` / `repel` / `attract`) +
  smooth interpolation. `repel` zachowuje punkt pod kursorem zakotwiczony do tego pixela
  (Google-Maps-style); `attract` przyciąga punkt pod kursorem ku środkowi; `strength` 0..1
  reguluje siłę. `smooth: true` (default) interpoluje radius+kąty po `targetSpherical`.
- **Auto-rotate** `[v1·GLOBAL·S·built]` — z konfigurowalną osią, prędkością i easeOnInteract.
- **Smooth `flyTo(lat, lng, distance)`** `[v1·GLOBAL·M·built]` — `globe.flyTo([lat, lng], distance?, { duration?, easing? })`. Easings exported (`linear`, `easeOutCubic`, `easeInOutCubic`); cancellation on drag/wheel.
- **`focusOnCountry(id)`** `[v1·GLOBAL·M·built]` 🌟 — `globe.focusOnCountry('616', { duration?, padding? })`. Auto-computes camera distance from country bbox + FOV; default padding 15%.
- **`focusOnRegion(bounds)`** `[v1·GLOBAL·S]` — frame dowolny obszar (osobny plan, używa tej samej infrastruktury).
- **Inertia / damping** `[v1·GLOBAL·S]` — momentum po puszczeniu drag.
- **Keyboard navigation** `[v1·GLOBAL·M]` — WASD/strzałki/Tab; bazowe a11y.
- **Camera distance limits** `[v1·GLOBAL·S·built]`.
- **Lock-to-region / sandbox mode** `[v1.x·GLOBAL·M]` — restrykcja navigacji w bounds (np. "globus dziecięcy zamknięty na Europę").
- **Trackpad-aware gestures** `[v1.x·GLOBAL·M]` — pinch, two-finger pan, smart-zoom.
- **Camera preset views** `[v1.x·GLOBAL·S]` — `view: 'globe' | 'arctic' | 'antarctic' | 'pacific' | 'europe'`.
- **Cinematic camera paths** `[v2+·GLOBAL·M]` — Bezier path między punktami zamiast great-circle interpolacji.

### 4.3 Country interaction

- **Hover events** `[v1·EVENT·S·built]` — `countryHover` z `CountryData` + `point: LatLng`.
- **Visual hover indicator** `[v1·EVENT·S·built]` — granice hovered country są przerysowane w `countries.hoverColor` o szerokości `countries.hoverWidth`. Tokeny per-preset (gold/dark-blue/cream/magenta/white).
- **Click events** `[v1·EVENT·S·built]` — `countryClick` z `CountryData` + `point: LatLng`. Markery mają wyższy priorytet w raycaster.
- **Country picking limitations (v0.3)** — drobna część triangulacji ma luki w okolicach: (a) państw przecinających antymerydian (Russia, Fiji), (b) enklaw (Lesotho, Vatican), (c) niektórych skomplikowanych MultiPolygon. Pełny fix wymaga zachowania struktury polygon-with-holes w geo-loaderze — zaplanowane w osobnym v0.3.x.
- **Active / selected state** `[v1·EVENT·M]` — pin kraju (zostaje highlighted nawet po hover-out).
- **Country -> data binding** `[v1·LAYER·M·built]` 🌟 — `globe.setCountryData({ '616': { color: '#1e6fff', value: 38, opacity: 0.85 } })` (id = numeric ISO 3166-1). Driver dla choropleth (population, GDP), set membership (NATO, EU, G7) i custom dataviz. Per-country `MeshBasicMaterial` siedzi pomiędzy globe surface a borders, więc granice rysują się na wierzchu. Dostępne także via `countryData` na `GlobeConfig` i przez `update()`. Kolor i opacity mają fallback na tokeny `countries.fill.defaultColor` / `countries.fill.opacity`.
- **Country labels on hover** `[v1·LAYER·S]` — auto-pop tooltip z nazwą + custom content.
- **Sub-divisions (states/provinces)** `[v1.x·LAYER·L]` — admin-1 GeoJSON, lazy load per kraj (`lazyAdmin1: ['US', 'PL']`).
- **Region groupings** `[v1·LAYER·S·built]` 🌟 — wbudowane importowalne arrays ISO 3166-1: `G7 / G20 / NATO / EU / BRICS / ASEAN / OECD / EFTA / MERCOSUR / AU` + kontynentalne `EUROPE / ASIA / AFRICA / NORTH_AMERICA / SOUTH_AMERICA / OCEANIA`. Aktualne na 2024–2026 (Finland/Sweden NATO, BRICS expansion, brak UK w EU). Wstawiasz prosto: `globe.setCountryData(buildSetMap(NATO, '#1e6fff'))`.
- **Highlight neighbors** `[v2+·LAYER·M]` — auto-find sąsiadów (graph adjacency).
- **Custom border styles per kraj** `[v1·STYLE·S]` — override per ISO.

### 4.4 Markers (POI / pins)

- **Dot marker (instanced)** `[v1·LAYER·S·built]` — InstancedMesh, do 10k+ markerów.
- **Pin marker** `[v1·LAYER·M]` — 3D pin sticking out of surface (Google-Maps-style).
- **HTML overlay marker** `[v1·LAYER·M]` 🌟 — DOM div anchored to lat/lng, rendered above canvas;
  pełna kontrola CSS/own components (React/Angular/Vue overlay komponentów).
- **Image / sprite marker** `[v1.x·LAYER·S]` — texture billboard (logo firm itp.).
- **Custom 3D model marker** `[v1.x·LAYER·M]` — user supplies GLTF (np. samolot).
- **Cluster markers** `[v1.x·LAYER·L]` — auto-cluster przy zoom-out, smooth uncluster przy zoom-in.
- **Marker label / tooltip** `[v1·LAYER·S]` — wbudowany tooltip + auto-placement.
- **Marker pulse / halo animacja** `[v1·LAYER·S]` — radial pulse z konfigurowalnym BPM.
- **Marker hit-zone radius** `[v1·LAYER·S]` — większy hit-zone niż visual size, dla mobile.
- **Bulk add / streaming markers** `[v1·LAYER·M]` — batch updates per frame, real-time perf.
- **Marker size by data** `[v1·LAYER·S]` — `size: (m) => m.data.population / 1e6`.
- **Marker color by data** `[v1·LAYER·S]` — analogicznie.
- **Marker hover state** `[v1·EVENT·S]` — scale-up, glow, callback.

### 4.5 Connections (arcs, paths, routes)

- **Static arc-line (great-circle)** `[v1·LAYER·S]` — A→B, gradient color, width.
- **Animated arc-line** `[v1·LAYER·M]` — głowica linii animowana along path, fade-in/out.
- **Particle flow on arc** `[v1.x·LAYER·M]` — moving dots/sparks along path (np. ruch danych).
- **Multi-stop route** `[v1.x·LAYER·M]` — A→B→C→D z waypointami.
- **Width by data** `[v1·LAYER·S]` — line thickness from value.
- **Color gradient by progress** `[v1·LAYER·S]`.
- **Time-window arcs** `[v1.x·LAYER·M]` — appear/disappear w synchronizacji z time slider.
- **Bezier elevation control** `[v1·LAYER·S]` — kontrola wysokości łuku (0=płasko po globusie, 1=daleko).

### 4.6 Heat & area layers

- **Choropleth (country-scale)** `[v1·LAYER·M]` — opisany w 3.4 jako styl; tu jako data layer.
- **Density heatmap (point cloud)** `[v1.x·LAYER·L]` — np. gęstość zaludnienia, zdarzeń.
- **Hex-bin aggregation** `[v2+·LAYER·L]` — h3-binning, agregacja punktów do hex.
- **Pulse / halo na markerach** `[v1·LAYER·S]` — emphasizing data points.
- **Color scale builder** `[v1·LAYER·S·built]` 🌟 — `setCountryData(map, { type: 'sequential' \| 'diverging' \| 'threshold' \| 'categorical', palette, domain?, noDataColor? })`. Built-in palety: `blues / reds / greens / oranges / purples / viridis / magma / plasma / inferno / RdBu / BrBG / PiYG`, plus własna lista hex-stops. Linear-RGB interpolation między stopami; explicit `color` na entry zawsze wygrywa nad skalą; `domain` defaultuje do data extent.
- **Legend HUD** `[v1·LAYER·S·built]` 🌟 — `globe.showLegend(scale, { title?, format?, tickCount?, position?, width?, style? })` / `globe.hideLegend()`. Auto-renders gradient bar + ticks dla sequential / diverging, swatch list dla threshold (z labelkami `< t0`, `t0 – t1`, `≥ tN`) i categorical. Tokens: `legend.backgroundColor / textColor / titleColor / fontSize / fontFamily / padding / borderRadius`. Przyklejony do containera globusa (4 pozycje), pointer-events disabled (nie blokuje interakcji). Standalone `createLegend({ container, scale, ... })` dla custom umieszczenia.
- **Polygon overlay (custom area)** `[v1.x·LAYER·M]` — własne wielokąty (np. strefy ekonomiczne).
- **Iso-lines / contours** `[v2+·LAYER·L]` — np. linie temperatury.

### 4.7 Labels & overlays

- **Country name labels** `[v1·LAYER·M]` — auto-placement, fade-by-zoom, locale-aware.
- **Marker labels** `[v1·LAYER·S]` — tooltip lub permanent.
- **HTML popup** `[v1·LAYER·M]` — anchored to lat/lng, portal w React/Angular/Vue.
- **Leader-line overlays** `[v1.x·LAYER·M]` — annotation lines z label box.
- **Custom 3D text on globe** `[v1.x·LAYER·M]` — text geometry leżący na powierzchni.
- **Auto-fade by zoom level** `[v1·LAYER·S]` — labels uchodzą/pojawiają się.
- **Collision detection / declutter** `[v1.x·LAYER·M]` — hide overlapping labels.
- **Locale-aware country names** `[v1·GLOBAL·M]` — bundled (EN/PL/DE/FR/ES/JA/ZH) + customizable.

### 4.8 Story / narrative engine 🌟

> Killer feature. Większość bibliotek tego nie ma. Szczególnie wartościowe dla `C·edu` i `A·marketing`.

- **Scene definition (declarative)** `[v1·GLOBAL·M·built]` 🌟 — `globe.setStory({ scenes: [{ id, duration, transitionDuration?, transitionDelay?, transitionElevation?, easing?, autoRotate?, flyTo?, focusOnCountry?, activeCountry?, popup? }] })`.
- **Auto-playback** `[v1·GLOBAL·M·built]` — `autoPlay`, `loop`, `startAt: sceneId`.
- **Manual controls** `[v1·GLOBAL·S·built]` — `playStory()`, `pauseStory()`, `nextScene()`, `prevScene()`, `goToScene(id)`, `getCurrentScene()`, `isStoryPlaying()`.
- **Scene events** `[v1·EVENT·S·built]` — `sceneEnter`, `sceneExit`, `storyComplete` z payload `{ scene, index }`.
- **Easing per transition** `[v1·GLOBAL·S·built]` — `scene.easing: EasingFunction | 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'` (CSS-like).
- **Transition arc + delay + autoRotate per scene** `[v1·GLOBAL·S·built]` — `transitionElevation` (cinematic fly-over arc), `transitionDelay` (popup-first then move), per-scene `autoRotate` toggle, `focusOnCountry` z opcjonalnym `padding` override.
- **Highlight stack** `[v1·GLOBAL·S]` — kraje/markery pokolorowane per scena, smooth restore (single active country wired; multi-highlight stack to do separately).
- **Scrollytelling hook** `[v2+·GLOBAL·M]` — sceny powiązane z scroll position (intersection observer).
- **Branching scenes** `[v2+·GLOBAL·L]` — `scene.branches: [{ if, goTo }]` — interaktywne narracje (great for `F·gry`).
- **Audio narration sync** `[v2+·GLOBAL·M]` — sync popup texts z audio track.
- **Scene editor / WYSIWYG** `[stretch·XL]` — visual builder w devtools.

### 4.9 Animation system

- **Easing primitives** `[v1·GLOBAL·S]` — bundled set easings (cubic-bezier API).
- **Tween manager** `[v1·GLOBAL·S]` — per-instance, cancellable, chainable.
- **Style transition animation** `[v1.x·GLOBAL·L]` — animowana zmiana z stylu A → B (cross-fade albo morph).
- **Marker pulse animation** `[v1·LAYER·S]` — opisana w 4.4.
- **Auto-rotate z custom osią** `[v1·GLOBAL·S]` — np. obrót wokół pochylonej osi (efekt globusa szkolnego).
- **Reduced-motion support** `[v1·GLOBAL·S]` — respect `prefers-reduced-motion`; skipping animacji.
- **Frame-budget primitives** `[v1·GLOBAL·S]` — `requestIdleCallback`-style queue, żeby nie psuć FPS.

### 4.10 Backgrounds & sky

- **Solid color background** `[v1·GLOBAL·S·built]`.
- **Linear/radial gradient background** `[v1·GLOBAL·S]` — z konfigurowalnymi stops.
- **Custom image background** `[v1.x·GLOBAL·S]` — `cover`, `contain`, `tile`.
- **Procedural starfield** `[v1·GLOBAL·M]` — twinkling stars w 3D, gęstość/kolor konfigurowalne.
- **Milky Way skybox** `[v1.x·GLOBAL·S]` — bundled HDR equirectangular.
- **Custom skybox / equirectangular** `[v1.x·GLOBAL·S]` — user image.
- **Day/night terminator** `[v2+·GLOBAL·M]` — sun position + shading; killer for `G·sym`.
- **Sun glare / lens flare** `[v2+·GLOBAL·S]` — opcjonalny post-fx.

### 4.11 Time & data binding

- **Real-time data subscription** `[v1.x·LAYER·M]` — `markers: observable<MarkerConfig[]>`; push-based updates.
- **Time slider component** `[v1.x·LAYER·L]` — wbudowany scrubber HUD.
- **Time-keyframed data** `[v1.x·LAYER·M]` — markers/heat/arcs zmieniają się w czasie.
- **Data update animations** `[v1.x·LAYER·M]` — smooth transitions na zmianę danych.
- **Replay / playback speed** `[v1.x·GLOBAL·S]` — `0.5x`, `2x`, `step`.
- **Event-driven updates** `[v1·LAYER·S]` — imperative API (`addMarker`, `removeMarker`).

### 4.12 Performance

- **InstancedMesh markers** `[v1·LAYER·S·built]`.
- **Adaptive quality (auto-downgrade)** `[v1·GLOBAL·M·partially-built]` — auto-FPS measurement.
- **Pixel-ratio cap** `[v1·GLOBAL·S·built]`.
- **Frustum culling markerów** `[v1·LAYER·M]` — pomocnicze nad InstancedMesh (Three.js sam tego nie umie dla per-instance).
- **Level-of-detail country borders** `[v1.x·LAYER·M]` — switch low/med/high res w zależności od distance.
- **Web worker geo parsing** `[v1.x·LAYER·M]` — offload ciężki TopoJSON parse off main thread.
- **Lazy data loading** `[v1·GLOBAL·S·built]`.
- **Resource caching across instances** `[v1.x·GLOBAL·M]` — wspólny cache parsed geometry.
- **Debug performance overlay** `[v1·GLOBAL·S]` — FPS, draw calls, triangle count.

### 4.13 Accessibility

- **Keyboard navigation** `[v1·GLOBAL·M]` — WASD/strzałki/Tab.
- **Focus indicators** `[v1·GLOBAL·S]` — visible focus outline na klikalnych elementach.
- **Reduced-motion support** `[v1·GLOBAL·S]` — auto-pause auto-rotate, skipping animacji.
- **Screen reader announcements** `[v1.x·GLOBAL·M]` — ARIA live regions na hover/select.
- **High-contrast theme variant** `[v1.x·GLOBAL·S]` — built-in WCAG AA-compliant preset.
- **Color-blind safe palettes** `[v1.x·GLOBAL·S]` — opisane w 4.1.
- **Alt-text dla snapshot eksportu** `[v1.x·GLOBAL·S]`.
- **Touch target size compliance** `[v1·GLOBAL·S]` — markery min 44px hit-zone na mobile.

### 4.14 Export / embed

- **PNG snapshot** `[v1·GLOBAL·S]` — `globe.toImage({ width, height })`.
- **High-resolution snapshot (4K/8K)** `[v1.x·GLOBAL·S]` — temporary upscale renderera.
- **State serialization (URL hash)** `[v1.x·GLOBAL·M]` — share specific view (camera, scena, filtry).
- **Embed iframe wrapper** `[v1.x·GLOBAL·S]` — `<iframe src="https://...">`-friendly distribution.
- **Static SSR snapshot** `[v2+·GLOBAL·L]` — render do PNG na serwerze (Node + headless GL) jako fallback dla SEO.
- **Video / GIF export** `[v2+·GLOBAL·L]` — record N seconds, dump WebM lub frames.
- **Print-friendly mode** `[v2+·GLOBAL·S]` — wysoka kontrastowość, zminimalizowane efekty.

### 4.15 i18n

- **Locale-aware country names** `[v1·GLOBAL·M]` — bundled core (EN), opt-in dla pozostałych.
- **Custom labels per locale** `[v1·LAYER·S]` — user może podać swoje tłumaczenia.
- **RTL layout dla HTML overlays** `[v1.x·LAYER·S]` — dla popup/legend w arabskim/hebrajskim.
- **Date/number formatting w popups** `[v1.x·LAYER·S]` — `Intl` based.
- **Pluralizacja** `[v1.x·LAYER·S]`.

### 4.16 Plugin / extension API 🌟

> Otwartość architektury — każdy może dopisać własny styl, layer, marker.

- **Custom layer registration** `[v1.x·GLOBAL·L]` 🌟 — implement `Layer` interface, add to globe.
- **Custom marker type** `[v1.x·GLOBAL·M]` — register reusable visual marker definition.
- **Theme plugin** `[v1.x·GLOBAL·S]` — publish themes jako separate npm packages (`@globio-themes/sunrise`).
- **Event middleware** `[v1.x·GLOBAL·M]` — intercept events przed propagacją (np. analytics hooks).
- **Custom shader hook** `[v2+·STYLE·L]` — inject GLSL do pipeline.
- **Custom data adapter** `[v1.x·LAYER·M]` — plugin do load custom GeoJSON sources.

### 4.17 Framework integrations

- **Vanilla TS API** `[v1·INSTANCE·M·built]` — `createGlobe()` factory.
- **React wrapper** `[v1·INSTANCE·M·skeleton]` — `<Globe>`, hooks, context, ref imperatives.
- **Angular wrapper** `[v1·INSTANCE·M·skeleton]` — standalone component, OnPush, `runOutsideAngular`.
- **Vue wrapper** `[v1·INSTANCE·M·skeleton]` — Composition API, `<VueGlobe>`.
- **SSR safety** `[v1·INSTANCE·S]` — graceful no-op podczas SSR (Next/Nuxt/Angular Universal).
- **Hot-reload-safe** `[v1·INSTANCE·M]` — clean teardown na unmount, no leaks.
- **TypeScript strict types end-to-end** `[v1·INSTANCE·S·built]`.
- **Svelte wrapper** `[v2+·INSTANCE·M]` — gdy będzie popyt.
- **Web Component wrapper** `[v2+·INSTANCE·M]` — `<globio-globe>` framework-agnostic.

### 4.18 Dev experience

- **Debug overlay** `[v1·GLOBAL·S]` — FPS, draw calls, scene tree.
- **Verbose logger toggle** `[v1·GLOBAL·S]` — `debug: true` → console events.
- **Type-safe events** `[v1·INSTANCE·S·built]`.
- **Source maps + DTS** `[v1·INSTANCE·S·built]`.
- **Error boundary** `[v1·INSTANCE·S]` — graceful runtime fallback w wrapperach.
- **Scene inspector** `[v1.x·GLOBAL·M]` — live list layers/markers, toggle visibility.
- **Storybook integration** `[v1.x·INSTANCE·M]` — gotowe stories per styl + per use-case.
- **Playground / sandbox** `[v1.x·GLOBAL·M]` — embedded codepen-like na docs site.
- **Headless test mode** `[v1.x·GLOBAL·M]` — `headless: true` skips render dla unit testów.

---

## 5. Configuration scope cheat-sheet

Co się gdzie konfiguruje. Kolumny = scope, wiersze = rodzaj opcji.

| Klucz w configu | GLOBAL | STYLE | LAYER | EVENT | INSTANCE |
|---|:-:|:-:|:-:|:-:|:-:|
| `theme.tokens.*` (kolory, gradienty) | ✅ | inherits | inherits | — | — |
| `style: 'outline' \| 'dotted' \| ...` | ✅ | — | — | — | — |
| `mode: 'sphere' \| 'flat'` *(future)* | ✅ | — | — | — | — |
| `countries.*` (style granic) | ✅ | overrides | — | hover-state | — |
| `countriesData[ISO].*` (per-country fill) | — | — | ✅ | — | — |
| `markers[i].*` (per marker) | — | — | ✅ | — | — |
| `arcs[i].*` (per arc) | — | — | ✅ | — | — |
| `scenes[i].*` (narrative engine) | ✅ | — | — | per-scene | — |
| `autoRotate.*` | ✅ | — | — | — | — |
| `atmosphere.*` | ✅ | overrides | — | — | — |
| `background.*` | ✅ | overrides | — | — | — |
| `performance.*` | ✅ | — | — | — | — |
| `accessibility.*` | ✅ | — | — | — | — |
| `i18n.locale` | ✅ | — | — | — | — |
| `i18n.countryNames` | ✅ | — | — | — | — |
| `events.*` callbacks | — | — | — | ✅ | — |
| Framework wrapper props | — | — | — | — | ✅ |

**Reguła kciuka:** Jeśli opcja zmienia się od stylu (kolor granic, gęstość kropek) → `STYLE`.
Jeśli per warstwa danych → `LAYER`. Jeśli reaguje na akcję → `EVENT`. Jeśli całe ustawienie ma sens
raz na cały globus → `GLOBAL`. Wrappery frameworkowe = `INSTANCE`.

---

## 6. Roadmap

| Wersja | Cel główny | Highlights |
|---|---|---|
| **v0.1** *(now)* | Fundament wizualny | Outline style, vanilla demo, 3 framework skeletons, build pipeline |
| **v0.2** | Theme tokens | Token system, 1-2 presety per styl, polished outline + dotted styles |
| **v0.3** | Markery + arcs | Pin/HTML marker, animated arcs, focus-on-country, country labels |
| **v0.4** | Style #3-#4 | Wireframe + Choropleth, country data binding, hover/click events |
| **v0.5** | Style #5-#6 | Paper + Hologram, custom shaders pipeline, easings polish |
| **v0.6** | Story engine v1 | Declarative scenes, autoplay, manual controls, easings |
| **v0.7** | A11y + i18n | Keyboard nav, reduced-motion, locale country names |
| **v0.8** | Wrappery + SSR | React/Angular/Vue dopracowane, SSR safety, error boundaries |
| **v0.9** | Docs site | Examples per use-case (A,B,C,D,F), storybook, playground |
| **v1.0** | **Public release** | All 6 styles, 3 wrappery, narrative engine, a11y, docs, tests |
| **v1.x** | Sub-divisions, time | Admin-1, time slider, density heat, plugin API, region groupings |
| **v2.0** | Topographic + Neon | Future styles, day/night, video export, Svelte/Web-Component wrappers, scrollytelling |
| **stretch** | WYSIWYG, AR/VR | Scene editor, ARView, branching narratives |

**Realistyczny harmonogram dla solo-deva (3-5h/dzień):** v0.5 ~3 mies., v1.0 ~12-15 mies.,
v2.0 +12 mies. To jest pełna prawda, nie marketing.

---

## 7. Non-goals & "won't do" (świadome cięcia)

- **2D map projections (Mercator/Albers/...)** — jest `d3-geo` + `topojson`, nie reimplementujemy.
  *Mode `flat` w typach jest furtką dla minimalistycznego flat-mode w v2+ — nie pełnego GIS.*
- **GIS-grade precision** — pixele, nie sub-meter. Nie jest to PostGIS w przeglądarce.
- **Pełny SSR globusa interaktywnego** — tylko static snapshot.
- **Wbudowany geocoder / reverse-geocoder** — `Nominatim` / `Mapbox` to ich rzecz.
- **Symulacje fizyczne** (chmury, pogoda, prądy oceaniczne) — `G·sym` use-case to "show pre-baked data
  on a globe", nie "simulate".
- **Pełny game engine** — wspieramy `F·gry` jako use-case wizualny, ale collision detection,
  game state, networking — to nie nasz scope.
- **Backend storage / accounts / auth** — to lib frontendowy, nie SaaS.
- **Real-time PubSub server** — dostarczamy `subscribe(observable)` API, ale nie własny WebSocket server.
- **Custom map tile servers** — Topographic używa pre-baked tekstury, nie dynamicznych slippy-map tiles.

---

## 8. Glossary

- **Style** — visual preset bundling renderer config + theme tokens. Jeden z 6 v1: outline, dotted,
  wireframe, choropleth, paper, hologram.
- **Theme** — bundle color tokens + opcjonalnie wybór stylu. Theme = kolory, Style = struktura
  wizualna. Theme może rozszerzać inny theme.
- **Token** — nazwana wartość designerska (kolor, gradient, liczba). Pozwala podmieniać kolory bez
  dotykania renderera.
- **Layer** — data-bearing visual layer: markers, arcs, heat, polygons. Niezależnie konfigurowane,
  niezależnie aktualizowane.
- **Scene** — nazwany stan w narrative engine: pozycja kamery + wybrane highlighty + opcjonalny
  popup + duration + transition.
- **POI (Point of Interest)** — marker z label + popup. Skrót.
- **TopoJSON** — kompaktowy format granic państw, ~5x mniejszy od GeoJSON dzięki współdzieleniu krawędzi.
- **InstancedMesh** — Three.js technika renderująca tysiące obiektów w jednym draw call.
- **Choropleth** — mapa z krajami pokolorowanymi wg metryki (np. PKB na czerwono-żółto-zielonej skali).
- **Great-circle** — najkrótsza ścieżka pomiędzy dwoma punktami na sferze. Domyślny kształt arc-line.
- **Earcut** — algorytm triangulacji wielokątów (potrzebny do renderowania wypełnień państw).
- **Differentiator** (🌟) — feature który wyróżnia Globio na tle istniejących bibliotek.

---

*Ostatnia aktualizacja: początkowa wersja, kolaboracyjny brainstorming. Wersjonujemy w git wraz
z resztą repo. Każdy nowy feature dodawany w PR razem z kodem.*
