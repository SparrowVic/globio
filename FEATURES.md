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

1. **Curated visual styles** — 6 starannie zaprojektowanych kindów (cinematic, outline,
   dotted, wireframe, paper, hologram; choropleth stał się data layerem). Zmiana stylu =
   jedna linijka.
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

### 3.2 Dotted (Apple/Stripe-style) `[v1·M·built]` 🌟 🎨 `A·B`

- **Vibe:** świetlne kropki wypełniające kraje na czarnej kuli (Stripe / Apple
  privacy / OpenAI DALL-E hero).
- **Anatomia:** `CountriesDottedLayer` — `THREE.Points` per kraj, vertices
  sampled na regularnej siatce lat/lng wewnątrz polygon-with-holes (ray-casting
  point-in-polygon, holes subtracted). Antymerydian obsłużony przez running
  +360 shift dla rings z bbox δlng > 180. Dots renderowane z `PointsMaterial`
  (`sizeAttenuation: true`, additive blending) i runtime-generated radial-gradient
  alpha texture — okrągłe, miękkie krawędzie zamiast domyślnych kwadratów.
- **API:** ustawiasz `countries: { style: 'dotted' }` w `GlobeConfig`; layer
  zastępuje borders. Picking layer zostaje, więc hover/click działa normalnie.
- **Tokens:** `countries.dotted.color`, `countries.dotted.size` (world units),
  `countries.dotted.density` (degree step na siatce), `countries.dotted.opacity`.
  Zarejestrowane w `TokenSet` i obecne we wszystkich pre-presetach + nowym
  `dotted-dark`.
- **Preset:** `'dotted-dark'` — czarna sfera (`globe.surfaceColor: #000`),
  cyan dots (`#7fdfff`), borders ukryte (`opacity: 0`), atmosphere `#4a9eff`.
  Przełącznik "Dotted" w demo's theme buttons row.
- **Best for:** premium SaaS hero, B2B marketing, "globalna obecność".
- **References:** stripe.com hero, apple privacy globe, openai DALL-E hero.
- **Sub-warianty (`v1.x`):** dotted-organic (Poisson), dotted-data (gęstość
  zależna od metryki).

### 3.3 Wireframe / Retro Tron `[v1·S·built]` 🌟 🎨 `A·F`

- **Vibe:** sama siatka południków/równoleżników, brak kontynentów.
- **Anatomia:** generowane LineSegments dla siatki lat/long + opcjonalne pulsowanie linii.
- **Tokens:** `wireframe.color`, `wireframe.density`, `wireframe.opacity`, `wireframe.pulse`.
- **Best for:** vintage-tech, hacker-look, gry retro, also tryb "bez danych geo" (offline-first).
- **References:** Tron, Mass Effect Galaxy Map, retro Apple ][.
- **Status:** ✅ shipped. Preset `wireframe-tron` (cyan `#22d3ee` na pure black, density 1.2,
  pulse 0.15) renderuje sferyczną siatkę lat/lng jako pojedynczy `LineSegments` (jeden draw call),
  z opcjonalnym sin-wave pulsowaniem opacity. `CountryStyle = 'none'` ukrywa geometrię państw,
  pozostawiając picking layer aktywną — hover/click nadal działa. API: `wireframe?: { enabled?,
  density?, pulse?, pulseSpeed? }` w `GlobeConfig`. Auto-enable, gdy aktywny preset ma
  `wireframe.opacity > 0`. Demo: nowy przycisk "Wireframe" obok 5 outline'owych presetów.

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

### 3.7 Cinematic — filmowa Ziemia z warstwą danych `[v1·L·built]` 🌟 🎨 `A·B·G`

- **Vibe:** keynote'owa planeta (Apple / SpaceX): fizycznie oświetlony ocean, relief, biomy,
  lód, chmury z cieniami, atmosfera z rozpraszaniem, zorza, tarcza słońca, Droga Mleczna —
  plus ciepłe akcenty danych (sieć połączeń, łuki, opcjonalnie światła miast).
- **Dwa tryby:** (a) w pełni proceduralny, zero assetów (domyślny); (b) `cinematic.textures`
  z URL-ami map day / night / normal / specular / clouds — ten sam shader, crossfade po
  załadowaniu. Demo ma zestaw Earth 2k (mapy planet z repo three.js) pod
  `examples/vanilla-demo/public/textures/earth`, przełącznik w Studio.
- **Anatomia:** `kinds/cinematic/` — `surface-shader.ts` (relief z wypiekanego atlasu terenu,
  biomy z szerokości/wysokości/wilgotności, pole odległości od wybrzeża → płycizny i plaże,
  glint, księżyc, cienie chmur, zorza, saturacja), `clouds.ts` (powłoka chmur, to samo pole
  co cienie), `atmosphere.ts` (single scattering Rayleigh/Mie, pas zmierzchu, airglow),
  `sun.ts` (tryby `fixed` / `realtime` / `orbit`, punkt podsłoneczny z daty, tarcza słońca),
  `starfield.ts` (rozkład jasności, klasy barwne, pas Drogi Mlecznej), `textures.ts`,
  `atlas.ts` (scanline rasterizer + chamfer distance transform + terrain bake, ~150 ms),
  `engine.ts` (wspólny blok uniformów, auto-quality po FPS).
- **Post-processing:** wspólny `GlobeConfig.postprocessing` (bloom, anamorficzny streak,
  aberracja, winieta, ziarno, ekspozycja, miękkie ramię świateł); domyślnie włączony tylko dla
  cinematic, alpha-safe na przezroczystym canvasie, fail-closed do zwykłego renderu.
- **Tokens:** `cinematic.*` (ocean / land / cloud / night / rim / city / network / border,
  `iceColor`, `vegetationColor`, `desertColor`, `shallowWaterColor`, `auroraColor`,
  `auroraTopColor`, `moonColor`, `sunColor`, `saturation`, kierunek światła, terminator).
- **Presety:** `cinematic-night`, `cinematic-day`, `cinematic-dawn`, `cinematic-noir`.
- **Config:** `cinematic.surface` (relief, biomes, shallows, moonlight, snowLine, saturation,
  kolory), `cinematic.clouds`, `cinematic.atmosphere`, `cinematic.sun`, `cinematic.aurora`,
  `cinematic.textures`, `cinematic.cityLights`, `cinematic.network`, `cinematic.reactivity`,
  `cinematic.quality` (`auto` = tiery po zmierzonym FPS). Wszystko live przez `globe.update()`.
- **Status:** ✅ shipped 2026-09-07 (commit 58c1072). Światła miast są w demo wyłączone
  (`cityLights.enabled: false`, `reactivity.cityNightResponse: 0`) do czasu ponownego
  strojenia — efekt zostaje dostępny w API. Bez testów jednostkowych (odłożone).

### 3.8 Topographic / Satellite `[v2+·M]` 🎨 `C·D·G·sym(future)` 🚀 *future*

> Częściowo pokryte przez tryb tekstur kindu cinematic (§3.7): własne mapy day/night/normal
> dają realistyczną Ziemię bez nowego kindu. Ta pozycja zostaje dla pełnego satellite look
> z kafelkami / wysoką rozdzielczością.

- **Vibe:** realistyczna tekstura Ziemi (oceany, terrain, lód) + opcjonalne wektorowe obrysy państw.
- **Anatomia:** sphere z Earth equirectangular texture + bump/normal map + opcjonalna warstwa borders.
- **Trade-off:** wymaga licencjonowanej tekstury (Natural Earth, NASA Visible Earth) — kilka MB.
  Bundle albo lazy-load.
- **Inspiracje (globe.gl screenshots):** "Daytime/Nighttime", "Realistic Earth", "Satellite View".
- **API kierunek:** nowy `kind: 'satellite'` z opcjonalnym day/night terminator (§4.10) jako global effect, nie cześć kindu.

### 3.9 Neon Cyberpunk `[v2+·S]` 🎨 `A·F` 🚀 *future*

- **Vibe:** wariant outline'u + bloom + dwukolorowe granice (magenta/cyan) + scanline subtelny.
- **Anatomia:** outline + post-processing bloom pass + dwa style passes dla granic.
- **Trade-off:** prosty technicznie (w gruncie rzeczy outline z post-fx), ale wymaga post-processing
  pipeline który dotąd nie był potrzebny.

### 3.10 Hollow Globe `[v2+·M]` 🎨 `A·F` 🚀 *future*

- **Vibe:** brak wypełnionej kuli — same kraje jako "wycięte" wektorowe sylwetki w pustce. Wnętrze widoczne (back-side wystaje).
- **Anatomia:** brak globe surface mesh; tylko `CountriesLayer` z DoubleSide rendering, depthWrite off.
  Picking layer pozostaje jako invisible mesh.
- **Inspiracja (globe.gl):** "Hollow Globe".
- **Best for:** futurystyczne UI, info-graphics, marketing teasery.

### 3.11 Tiled / Map-tile Globe `[v2+·L]` 🎨 `B·D` 🚀 *future*

- **Vibe:** prawdziwe slippy-map tiles (OSM / Mapbox) zwinięte na sferze — z możliwością zoom-in do poziomu street.
- **Anatomia:** sphere z dynamic tile loader (XYZ → spherical UV mapping), level-of-detail per zoom.
- **Inspiracja (globe.gl):** "Map tiles".
- **Trade-off:** wymaga tile servera (zewnętrzny lub bundle podstawowych); spore complexity.

### 3.12 Hex Polygons Globe `[v2+·L]` 🎨 `B·D` 🚀 *future*

- **Vibe:** glob pokryty siatką hexagonalną (h3-grid); kraje wypełnione kolorem heksów.
- **Anatomia:** generowany h3 hex tessellation; każdy hex to mały Three.js mesh; kolor per-hex z data binding.
- **Inspiracja (globe.gl):** "Hexed Polygons", "Polygons Per Capita".
- **Best for:** dataviz dashboardy, density z naturalnym binningiem.

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
- **Camera distance limits** `[v1·GLOBAL·S·built]` — `minZoom` / `maxZoom` albo `framing.lockZoom`.
  Gdy zoom jest zablokowany (min == max), kółko myszy nad canvasem NIE jest przechwytywane —
  strona przewija się dalej, więc dekoracyjny globus nie łapie kursora.
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
- **Marker pulse / halo animacja** `[v1·LAYER·S·built]` 🌟 — `marker.pulse: true | { speed?, amplitude? }`. Marker rytmicznie oscyluje rozmiarem (sin wave); `speed` w cyklach na sekundę (default 1.5), `amplitude` jako frakcja base size dodawana w peaku (default 0.4). Działa na InstancedMesh — brak narzutu rendering, animacja przez per-frame matrix update.
- **Marker hit-zone radius** `[v1·LAYER·S]` — większy hit-zone niż visual size, dla mobile.
- **Bulk add / streaming markers** `[v1·LAYER·M]` — batch updates per frame, real-time perf.
- **Marker size by data** `[v1·LAYER·S]` — `size: (m) => m.data.population / 1e6`.
- **Marker color by data** `[v1·LAYER·S]` — analogicznie.
- **Marker hover state** `[v1·EVENT·S·built]` 🌟 — auto scale-up hovered markera (default 1.5×, konfigurowalne via layer option `hoverScale`), eased 150ms. Plus `MarkerTooltip` (DOM, follows cursor, fade 80ms) pokazujący `marker.label ?? marker.id`. Eventy `markerHover` / `markerClick` z payloadem `{ marker }`.

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

> Wszystkie 4 cztery typy z tej sekcji wchodzą jeden-spod-drugiego przez wspólne API `globe.setDataLayer(layer)` — patrz §5c "Data layers" po szczegóły architektoniczne i tabelę dekoracji per kind.

- **Choropleth (country-scale)** `[v1·LAYER·M·built]` 🌟 — `globe.setDataLayer({ type: 'choropleth', data, scale? })`. Per-country fill (`CountryFillLayer`), value-mapped color via `scale`, fade-in tween 250ms. Legacy `setCountryData(map, scale?)` routes through this same pipeline. Decorations: outline (solid fill).
- **Bars (lat/lng or country centroid)** `[v1·LAYER·M·built]` 🌟 — `globe.setDataLayer({ type: 'bars', data: [{ id?, position?, value, color? }], scale?, height?, width?, animateOnMount? })`. Per-bar `CylinderGeometry`, anchored at sphere surface, oriented along normal, height `value`-mapped to `[height.min, height.max]`. Mount animation: `'rise'` grows from 0 over `mountDurationMs` (default 700, easeOutCubic). Decorations: outline (solid `MeshBasicMaterial`), dotted (additive glow blending).
- **Extruded countries (3D choropleth)** `[v1·LAYER·M·built]` 🌟 — `globe.setDataLayer({ type: 'extruded', data, scale?, height?, animateOnMount? })`. Each country polygon lifted along surface normal at value-mapped height; side walls connect surface ring to elevated cap. Per-vertex `directions` array drives rise animation by pushing only the elevated set outward. Decorations: outline (opaque `DoubleSide`), dotted (additive glow).
- **Density heatmap (volumetric, shader-based)** `[v1·LAYER·L·built]` 🌟 — `globe.setDataLayer({ type: 'heatmap', data: [{ position, value, id?, name?, radius?, weight?, animation? }], scale?, ... })`. **Architektura:** equirectangular density texture (default 2048×1024 Float32 R) bake'owana CPU-side, `SphereGeometry` (auto 256² flat / 1024² displaced / 2048² hero), shader robi displacement w vertexie i palette-lookup w fragmencie. Per-fragment UV liczone z 3D direction (omija seam na antymerydianie). Pełna kontrola wizualna:
  - **Kernels** (`kernel: 'gaussian' | 'epanechnikov' | 'quartic' | 'dome' | 'uniform'`) — różne kształty rozmycia. Hot loop optimized: `cosD` zamiast `acos`, kernel weights z `chord²` zamiast great-circle arc.
  - **Country-aware domes** (`countryDomes: { centerArea, shoulderHeight, edgeSteepness, valuePreScale: 'log'|'sqrt'|'linear', rounding, perCountryNormalize }`) — entry z `id`/`name` raster'uje się w polygonie kraju (distance-to-edge field via 16×N spatial-hash edge grid + opcjonalny ray-cast blend dla polygon-shape vs bubble). Pole-of-inaccessibility jako anchor, `accumulate=max` przy enclave overlap. Demo presetuje `surface: 'country'` jako landing view.
  - **Normalize** (`'peak' | 'absolute' | 'log'` + `absoluteMax`) — globalna kontrola kontrastu.
  - **Curves** (`curve` dla koloru, `displacementCurve` osobno: `'linear'|'smoothstep'|'cubic'|'sqrt'`) — decoupled żeby 3D miało gładki bell-curve nawet gdy kolor używa cubic dla ostrych hotspotów.
  - **Intensity** (`pow(d, 1/intensity)` gamma — boost'uje midy bez plateau saturacji).
  - **Threshold** — pixele poniżej fraction-of-peak są transparent.
  - **Grid + contours** (`grid: { stepDeg, widthDeg, opacity, majorEvery, color }`, `contours: { interval, width, opacity, majorEvery, color }`) — proceduralne in-shader, anti-aliased przez `fwidth`, `densityFade` ukrywa je w cool regions. Bez extra geometrii / z-fightingu z borderami.
  - **Zoom scaling** (`zoomScaling: { closeDistance, farDistance, closeHeightScale, farHeightScale, closeOpacityScale, farOpacityScale, thresholdBoost, gridBoost, contourBoost }`) — view-dependent shader uniformy bez re-bake. Layer nie wygląda wielki przy zoom-in.
  - **Animation system** (`animation: { style: 'rise'|'pop'|'fade', duration, delay, stagger, easing, trigger: 'init'|'manual' }`) — init mount: domeny "wyrastają z wnętrza globu" (vertex skaluje displacement przez `t∈[0,1]`, fragment skaluje alpha). 33 krzywe easing (CSS keyword cubic-bezier + pełen Penner: `linear / ease(-in/-out/-in-out) / quad / cubic / quart / quint / sine / expo / circ / back / elastic / bounce`). Per-warstwa **lub** per-rekord (`HeatmapDataEntry.animation: { delay?, enabled? }`) — bake'uje delay map (Float32 R, taka sama jak density) gdy `stagger > 0` lub jakikolwiek entry ma `delay`; shader sampluje delay → liczy `localT = (timeSec - pixelDelay) / duration` → easing przez 256-binową LUT. Bez delay'i mapa nie jest alokowana (1×1 stub, zero kosztu). `playAnimation()` jako publiczny hook reset'uje timeline (story-ready, patrz §4.9.1).
  - **Bake-key cache** — `setData(layer)` z tym samym `samples` reference + bake-affecting params (kernel/radius/blur/normalize/absoluteMax/animation timing) skip'uje re-bake i tylko refresh'uje shader uniformy. Slidery intensity/threshold/curve/duration/easing są shader-only (instant). Bake jest in-place (Float32Array re-fill, jedna `DataTexture` cały czas).
  - **Demo** — `examples/vanilla-demo/heatmap.html` ma 5 surface presetów (country / topographic / smooth / peaks), 8 datasetów (countries+population, megacities, worldcities, earthquakes, random, +3 live USGS feeds), pełny HUD z slider'ami radius / height / intensity / threshold / blur / texture-resolution / dome-shape / animation.
  - **Modularna struktura:** `data-layers/heatmap/` jest 11 plików (`heatmap-layer.ts` orchestrator + `shaders / kernels / polygon-utils / palette / bake-keys / config / radial-baker / edge-grid / country-features / country-dome / animation`).
  - **Decorations:** outline (built — pełna funkcjonalność), dotted (legacy additive glow displaced sphere — czeka na port na shader-based pipeline). Inne kindy = future.
  - **TODO / potencjał:** per-record easing/style (dziś tylko delay per-entry — wymaga 2D LUT z entryEasingRow), `playAnimation({ trigger: 'enter'|'leave', target: { id } })` faktyczna implementacja dla story-tellingu, smooth data-update crossfade przy zmianie datasetu, hex-bin agregacja (§4.6 niżej), particle-flow over density field, time-keyframed heat (§4.11).
- **Hex-bin aggregation** `[v1·LAYER·M·built]` 🌟 — `globe.setDataLayer({ type: 'hexbin', data, resolution?, aggregate?, height?, scale?, cellBorder?, highlight?, animation?, events? })`. Lat/lng point samples binned into faces of a subdivided icosphere — visually triangular cells (the "hex" name follows the geographic-binning convention; goldberg-polyhedron real-hexagon variant is a future upgrade). Subdivision levels 0..5 (20 → 20480 cells, default 3 = 1280); **7 aggregate modes** (`sum / count / mean / min / max / median / p90`); per-face value drives both colour (via `scale`) and outward extrusion (`height: { min, max }`). Cells render as vertex-coloured `BufferGeometry` triangles, each face with its own 3 unshared vertices so colours don't bleed into neighbours.
  - **Animation system** — reuses the heatmap easing library (33 curves). 4 visual styles: `'rise' / 'pop' / 'fade' / 'pulse'` (pulse is a continuous heartbeat that loops). 5 stagger orders: `'sequential' / 'radial' / 'value' / 'reverse-value' / 'random'` — radial auto-defaults its origin to the data's spherical centroid when none is provided. Per-face stagger drives a visible wave bloom across the globe (cell-index → start-time mapping in `face-ordering.ts`).
  - **Interaction** — pointer hover/click via internal Three.js raycaster; `events.onHover/onClick` receive `HexBinHoverPayload { cellIndex, value, empty, position }`. Optional triangle-overlay `highlight` overlay sits on top of the hovered cell, lifted along the radial normal (`HexBinHighlight` module). Optional `cellBorder` LineSegments draw the cell edges for topographic-map look.
  - **Visual fidelity** — per-face vertex RGB scales with the per-face `t` so cells visibly fade in (not just rise) during the bloom; layer-wide opacity stays at the slider value.
  - **Module:** `data-layers/hexbin/` split into `icosphere / aggregator / hexbin-mesh / hexbin-layer / hexbin-highlight / face-ordering`.
  - **Demo:** `examples/vanilla-demo/hexbin.html` — 4 datasets (random 2k/10k, 3-region clusters, latitude bands), full HUD (resolution / aggregate / cellInset / opacity / borders / highlight / animation style+order+easing+duration+stagger), floating tooltip on hover.
  - **TODO / potencjał:** smooth dataset crossfade (lerp colours+heights between sets), goldberg-polyhedron real hex tiles, time-keyframed bins (samples have `timestamp`), streaming `addSamples()`, port decoration to dotted/wireframe/paper/hologram kinds.
- **Charts (multi-series, anchored)** `[v1·LAYER·M·built]` 🌟 — `globe.setDataLayer({ type: 'charts', data, chartType, series, scale?, size?, height?, innerRadius?, padAngle?, gaugeMax?, segmentStagger?, labels?, animation?, events? })`. **7 sub-types**: `'bars-grouped'` (parallel bars side-by-side), `'bars-stacked'` (single column with composition segments), `'pie'`, `'donut'` (pie with hollow centre), `'radial'` (bars in a circle), `'gauge'` (180° progress arc reading `series[0]/gaugeMax`), `'sunburst'` (two concentric rings — outer = series segments, inner = total mapped through `scale`). Each chart anchored at lat/lng or country centroid (resolved via `id` matching the active kind's feature index — same pattern as Bars). Per-series colour wins over the layer-level `scale`; pie/donut/gauge/sunburst billboard toward the camera so they stay readable at high latitudes.
  - **Per-segment animations** — `segmentStagger` (ms) staggers within-chart segment reveals: stacked grows bottom-up (with mid-anim re-stacking so growing segments sit on top of finished ones), radial sweeps clockwise, pie/donut wipes alpha around the ring, grouped reveals bars left→right. Per-entry `animation` override (delay + enabled) composes with the layer-level stagger.
  - **Interaction** — pointer hover/click via internal raycaster (`ChartsHoverPayload { entry, entryIndex, seriesKey, seriesIndex, value }`); mesh-uuid index built at applyData() resolves a hit triangle back to its (chart, segment) pair in O(1).
  - **HTML labels overlay** — `labels: bool | { mode, format, fontSize, color, ... }`. Pure DOM (no CSS3DRenderer); container appended next to the renderer canvas; per-frame Vector3.project() per label tracks its anchor including parent globeGroup transforms (axisTilt, autoRotate). Three modes: `'hover'` (only the hovered chart's label shown — default), `'always'` (all labels with limb-fade), `'occlusion'` (visible hemisphere only).
  - **Module:** `data-layers/charts/` split into `anchors / bars-builder / pie-builder / charts-layer / labels-overlay`.
  - **Demo:** `examples/vanilla-demo/charts.html` — 4 datasets (G7 energy mix, population age brackets, quarterly sales, renewables-% KPI for gauge), full HUD (chart type / dataset / size / height / inner radius / pad angle / labels mode / easing / duration / stagger / segment stagger), floating tooltip on hover, click logs payload to console.
  - **TODO / potencjał:** per-bar value labels (today: only entry-level label), arbitrary-depth sunburst (today: 2-level), link arcs between chart anchors when sharing a series key, declarative "highlight series" (dim everything except chosen key), port to dotted/hologram kinds (additive glow / scanline variants), 3D extrusion on pie segments (currently flat).
- **Pulse / halo na markerach** `[v1·LAYER·S]` — emphasizing data points.
- **Color scale builder** `[v1·LAYER·S·built]` 🌟 — wspólny dla wszystkich data-layerów (choropleth/bars/extruded/heatmap). `{ type: 'sequential' \| 'diverging' \| 'threshold' \| 'categorical', palette, domain?, noDataColor? }`. Built-in palety: `blues / reds / greens / oranges / purples / viridis / magma / plasma / inferno / RdBu / BrBG / PiYG`, plus własna lista hex-stops. Linear-RGB interpolation między stopami; explicit `color` na entry zawsze wygrywa nad skalą; `domain` defaultuje do data extent.
- **Legend HUD** `[v1·LAYER·S·built]` 🌟 — `globe.showLegend(scale, { title?, format?, tickCount?, position?, width?, style? })` / `globe.hideLegend()`. Auto-renders gradient bar + ticks dla sequential / diverging, swatch list dla threshold (z labelkami `< t0`, `t0 – t1`, `≥ tN`) i categorical. Tokens: `legend.backgroundColor / textColor / titleColor / fontSize / fontFamily / padding / borderRadius`. Przyklejony do containera globusa (4 pozycje), pointer-events disabled (nie blokuje interakcji). Standalone `createLegend({ container, scale, ... })` dla custom umieszczenia.
- **Polygon overlay (custom area)** `[v1.x·LAYER·M]` — własne wielokąty (np. strefy ekonomiczne).
- **Iso-lines / contours** `[v2+·LAYER·L]` — np. linie temperatury.

### 4.7 Labels & overlays

- **Country name labels** `[v1·LAYER·M·built]` 🌟 — `globe.setCountryLabelsEnabled(true)` + `globe.setCountryLabels({ '276': 'Niemcy' })` lub config `{ countryLabels: { enabled: true, labels?, minScreenSize? } }`. HTML overlays na centroid (przez `boundsCenter` z polar-cap heuristic), occlusion fade na drugiej stronie globusa, smoothstep fade-by-zoom (małe kraje znikają przy oddaleniu — próg `minScreenSize` w pikselach, default 60). Tokens: `countries.label.color / fontSize / fontFamily / fontWeight / textShadow`. `pointer-events: none` żeby nie blokować klików.
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

- **Easing primitives** `[v1·GLOBAL·S·partially-built]` — `utils/easing.ts` ma `linear / easeIn / easeOut / easeInOut` + `resolveEasing()` (używane przez story engine i flyTo). Heatmap-specific biblioteka 33 krzywych (CSS keyword cubic-bezier + pełen Penner: `quad/cubic/quart/quint/sine/expo/circ/back/elastic/bounce` × `in/out/in-out`) leży w `data-layers/heatmap/animation.ts` — kandydat na promocję do globalnego `utils/easings.ts` jak inne layery zaczną tego potrzebować.
- **Heatmap mount animation** `[v1·LAYER·M·built]` 🌟 — `HeatmapDataLayer.animation: { style: 'rise'|'pop'|'fade', duration, delay, stagger, easing, trigger: 'init'|'manual' }`. Domeny "wyrastają z wnętrza globu" przy `setData()`; per-warstwa LUB per-rekord (`HeatmapDataEntry.animation`). Shader-side easing przez 1D LUT (256 sampli), per-pixel delay map (Float32 R, alokowana lazy gdy `stagger > 0` lub jakikolwiek entry ma `delay`). `HeatmapLayer.tick(deltaSec)` wpięte w `kindHandle.update()` → globe `onRender` loop. `playAnimation()` publiczny hook reset'uje timeline. Patrz §4.6 po pełną listę pól.
- **Bars / extruded mount animation** `[v1·LAYER·S·built]` — `animateOnMount: 'rise' | 'none'` + `mountDurationMs`. Bars: `easeOutCubic` od `height=0`. Extruded: per-vertex `directions` array push'uje tylko elevated set outward.
- **Tween manager** `[v1·GLOBAL·S]` — per-instance, cancellable, chainable.
- **Style transition animation** `[v1.x·GLOBAL·L]` — animowana zmiana z stylu A → B (cross-fade albo morph).
- **Marker pulse animation** `[v1·LAYER·S]` — opisana w 4.4.
- **Auto-rotate z custom osią** `[v1·GLOBAL·S]` — np. obrót wokół pochylonej osi (efekt globusa szkolnego).
- **Reduced-motion support** `[v1·GLOBAL·S]` — respect `prefers-reduced-motion`; skipping animacji + animation timeline'y skacze do końcowego stanu.
- **Frame-budget primitives** `[v1·GLOBAL·S]` — `requestIdleCallback`-style queue, żeby nie psuć FPS.

### 4.9.1 Data-layer lifecycle hooks (planned) 🌟

> **Cel:** spiąć animation system z story enginem (§4.8) tak, żeby `scene.focusOnCountry: 'PL'` mógł odpalać per-country bloom na heatmapie (`onEnter`) i fade'ować przy wyjściu (`onLeave`), bez wiedzy story-engine'u o specyfice każdego data layera.
>
> **Inspiracja:** Angularowy lifecycle (`ngOnInit / ngOnDestroy / ngOnChanges`) — deklaratywne hooki na konkretnych momentach flow'u globe'a, każdy data layer może je opcjonalnie zaimplementować.

- **Lifecycle interface** `[v1.x·LAYER·M]` 🚀 *future* — rozszerzyć `DataLayerHandle` o:
  ```ts
  interface DataLayerHandle {
    onMount?(ctx: LayerContext): void;          // raz, po build (dziś = constructor)
    onEnter?(ctx: LayerContext, target?: { id: string }): void;  // story focus enter
    onLeave?(ctx: LayerContext, target?: { id: string }): void;  // story focus leave
    onSceneChange?(ctx: LayerContext, scene: Scene): void;  // dowolna zmiana sceny
    onDispose?(ctx: LayerContext): void;        // przed teardown
  }
  ```
  Każdy hook może zwrócić `{ playUntil: number }` żeby story engine poczekał na zakończenie animacji przed `transitionDelay`. Domyślne implementacje są no-op'em.
- **Heatmap.playAnimation({ trigger, target })** `[v1.x·LAYER·M]` 🚀 — dziś `playAnimation()` resetuje całą warstwę. Future: `target.id` przerysuje delay map maskując tylko piksele wskazanego kraju (reszta zostaje w `t=1`), `trigger: 'leave'` puszcza animację w odwrotną stronę (alpha + displacement od 1→0).
- **Story → heatmap bridge** `[v1.x·GLOBAL·M]` 🚀 — w `setStory()` payload sceny może zawierać `dataLayer: { animation: HeatmapAnimationConfig }` override'ujący globalny config przy wejściu do sceny. Story engine wywoła `handle.onEnter(ctx, { id: scene.focusOnCountry })` po flyTo settle.
- **Reverse / chained animations** `[v2+·LAYER·M]` 🚀 — `animation.chain: [{ at: 0.5, animation: {...} }]` — sekwencjonowanie wielu pulsów / kolorów na timeline.
- **Loop / heartbeat mode** `[v2+·LAYER·S]` 🚀 — `animation.style: 'pulse'` z `period` zamiast `duration`; pulsuje wartość w zakresie `[shoulder, peak]` w nieskończoność (dobre do live-data flagging'u: każdy nowy earthquake "tętni" przez kilka sekund).

### 4.10 Backgrounds & sky

- **Solid color background** `[v1·GLOBAL·S·built]`.
- **Linear/radial gradient background** `[v1·GLOBAL·S]` — z konfigurowalnymi stops.
- **Custom image background** `[v1.x·GLOBAL·S]` — `cover`, `contain`, `tile`.
- **Procedural starfield** `[v1·GLOBAL·M·built]` — twinkling stars w 3D, gęstość/kolor konfigurowalne;
  kind cinematic ma własną wersję z rozkładem jasności i klasami barwnymi gwiazd.
- **Milky Way band** `[v1·GLOBAL·S·built]` — proceduralny pas (`starfield.milkyWay`) w kindzie
  cinematic; bundled HDR skybox nadal `[v1.x]`.
- **Custom skybox / equirectangular** `[v1.x·GLOBAL·S]` — user image.
- **Day/night terminator** `[v1·STYLE·M·built]` — w kindzie cinematic: `cinematic.sun` z trybami
  `fixed` / `realtime` (punkt podsłoneczny z daty) / `orbit` (time-lapse); inne kindy `[v2+]`.
- **Sun glare / lens flare** `[v1·STYLE·S·built]` — tarcza słońca cinematic + bloom/streak z
  post-processingu; generyczny lens flare dla innych kindów `[v2+]`.

### 4.11 Time & data binding

- **Real-time data subscription** `[v1.x·LAYER·M]` — `markers: observable<MarkerConfig[]>`; push-based updates.
- **Time slider component** `[v1.x·LAYER·L]` — wbudowany scrubber HUD.
- **Time-keyframed data** `[v1.x·LAYER·M]` — markers/heat/arcs zmieniają się w czasie.
- **Data update animations** `[v1.x·LAYER·M]` — smooth transitions na zmianę danych.
- **Replay / playback speed** `[v1.x·GLOBAL·S]` — `0.5x`, `2x`, `step`.
- **Event-driven updates** `[v1·LAYER·S]` — imperative API (`addMarker`, `removeMarker`).

### 4.12 Performance

- **InstancedMesh markers** `[v1·LAYER·S·built]`.
- **Adaptive quality (auto-downgrade)** `[v1·GLOBAL·M·partially-built]` — auto-FPS measurement
  (pixel ratio); kind cinematic dodatkowo `quality: 'auto'` = tiery ultra/high/balanced po
  zmierzonym FPS (mniej oktaw noise, bloom w połowie rozdzielczości, cienie chmur off).
- **Post-processing pipeline** `[v1·GLOBAL·M·built]` — `GlobeConfig.postprocessing`: HDR target,
  bloom, anamorficzny streak, aberracja, winieta, ziarno, ekspozycja; domyślnie on tylko dla
  cinematic, fail-closed do bezpośredniego renderu.
- **Pixel-ratio cap** `[v1·GLOBAL·S·built]`.
- **Shared frame scheduler + pausing** `[v1·GLOBAL·M·built]` — jeden `requestAnimationFrame`
  dla wszystkich instancji na stronie (`performance.maxFps` per instancja), pauza poza
  viewportem i w ukrytej karcie (`performance.pauseWhenHidden`, default on) oraz ręczna pauza
  `globe.setPaused(true|false)` — instancja trzyma scenę i kontekst WebGL, ale nie kosztuje
  klatek (globusy „na ciepło” za cross-fade'em, nieaktywne zakładki).
- **User Timing marks** `[v1·GLOBAL·S·built]` — `performance.measure` dla `globio:construct`
  (renderer + warstwy), `globio:countries-load`, `globio:kind-build` (synchroniczna budowa kindu
  po załadowaniu krajów), `globio:shader-compile` i `globio:mount-to-ready`; widoczne w DevTools
  i przez `performance.getEntriesByType('measure')`.
  Budowa kindu to jedyny długi task — `countries.resolution: 'low'` skraca ją ~2-3×.
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
- **Type-safe events** `[v1·INSTANCE·S·built]` — `ready` odpala się dopiero po załadowaniu krajów,
  zbudowaniu kindu i skompilowaniu shaderów (host może wtedy bezpiecznie zrobić cross-fade).
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
| `cinematic.*` (surface / clouds / sun / aurora / textures / …) | — | ✅ | — | — | — |
| `postprocessing.*` (bloom, streak, grade) | ✅ | default per kind | — | — | — |
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

## 5b. Decoration pattern roadmap 🌟

Niektóre featury są **shared semantically** (każdy rodzaj globu je MA), ale ich **wygląd / animacja / styl** powinny żyć **per rodzaj globu** — outline'owy arc świeci złotem, hologramowy migocze cyanem ze scanlinem, paperowy jest ledwo widocznym tuszem na pergaminie. Rozwiązaniem jest **decoration pattern**: kind module deklaruje opcjonalne `decorations: { focusPulse?, arcs?, markers?, … }`, które nadpisują domyślne shared rendery konkretnym stylem dla aktywnego kindu. Presety nadal sterują tokenami; decorations sterują strukturą rendering pipeline.

**Kandydaci do migracji** (od najpilniejszych do najmniej):

| Feature | Status dziś | Wariacje per kind (pomysły) |
|---|---|---|
| **Focus pulse** | shipped via decorations (5 kindów) | outline: spherical band gold; dotted: cyan band + dot brightness wave; wireframe: cyan band + grid pulse propagation; paper: warm-ink band fading slowly; hologram: cyan band + scanline rim sync |
| **Animated arcs** | shared `ArcsLayer`, tylko tokeny | wireframe: arc as glitching scanline; hologram: dashed cyan with glitch transient on segments; paper: hand-drawn dashed ink trail; dotted: arc-as-flowing-particles; outline: existing |
| **Country borders on hover** | shared `SelectionLayer` + tokens | paper: ink-bleed thicker edge; hologram: cyan edge glow + scanline overlay; dotted: edge-ring of brighter dots; wireframe: pulse along grid towards country |
| **Country active/click state** | shared `CountryActiveLayer` (separate) | wireframe: spinning geodesic ring (already shipped as kind-extra); paper: stamped ink seal; hologram: rotating bracket targeting reticle; dotted: persistent dot brightness |
| **Markers (instanced dots)** | shared `MarkersLayer` | paper: stamped ink dots with slight rotation; hologram: cyan diamond with halo; wireframe: small intersection cross; dotted: integrated with existing dot grid |
| **HTML overlay markers** | shared `HtmlMarkersLayer` | paper: serif label box on cream background; hologram: bracketed terminal label "[ Tokyo ]"; wireframe: monospace coords + bracket frame; dotted: rounded soft pill |
| **Country labels on globe** | shared `LabelsLayer` | paper: serif italic, atlas-style; hologram: monospace cyan with bracket prefix; wireframe: monospace cyan; dotted: clean sans; outline: existing |
| **Starfield background** | shared `StarfieldLayer` | hologram: scanline dim across stars; paper: faint pencil-dot constellation lines; wireframe: brighter cyan stars; dotted: more density; outline: existing |
| **Tooltip / legend** | shared DOM, theme-driven | paper: parchment-style border + serif; hologram: terminal-style frame; wireframe: ASCII-bracket frame + monospace |
| **Hover crosshair + cursor readout** | outline-only today (`HoverCrosshairLayer` — 3D reticle on surface + DOM label with lat/lng + country name following cursor) | outline: existing minimal cyan reticle; wireframe: monospace `[ 47.50°N, 12.34°E ]` + bracketed crosshair; hologram: bracketed terminal label `[ TARGET → POL ]` + scanline-tinted reticle; paper: pencil-tick on parchment + cursive serif coords (`47.5°N · 12.3°E`); dotted: ring of brighter dots around cursor + soft rounded pill label |
| **Atmosphere outer glow** | shared `AtmosphereLayer` | per-kind already partially — but could become a decorator with custom shaders (paper: vignette; hologram: scanline-cut halo) |
| **Click feedback on water** | not shipped yet | tied to focus-pulse `pulseOnSurfaceClick` option; per-kind variant naturally inherits style from above |

**Mechanika:** każdy decorator to mała klasa z `dispose / update? / spawn?` (depending on the feature). Kind module wystawia je przez `KindHandle.decorations`. Globe.ts dispatcher kieruje wywołania (`onCountryFocus → decorations.focusPulse.spawn`, etc.) do aktywnego kindu. Kindy które nie mają decoratora dla danego feature'a fall-backują do shared default lub po prostu nie reagują.

**Order of work:** focus-pulse jako pierwszy ✅ (shipped). Następne: arcs (high-impact wizualnie + już często widoczne w demach), potem country hover/active borders, potem markers, html overlay, country labels, starfield, tooltip/legend.

---

## 5c. Data layers 🌟

> **Architektura.** "Data layer" to wysokopoziomowa wizualizacja danych nakładana na **dowolny kind** (outline, dotted, …). Użytkownik aktywuje **jeden** data layer na raz przez `globe.setDataLayer(config | null)`; aktywny kind decyduje **jak** ten layer się rysuje, przez per-kind dekoratory zarejestrowane w `KindHandle.decorations.dataLayers`. Dzięki temu **te same dane** wyglądają inaczej w outline (solidne) vs dotted (additive glow) vs (przyszłość) hologram (cyan + scanline) bez dotykania kodu konsumenta.
>
> Patrz też §5b "Decoration pattern roadmap" — to ten sam pattern, ale dla featurów semantycznych (focus pulse, hover crosshair) zamiast danych.

### 5c.1 Public API

```ts
globe.setDataLayer({ type: 'choropleth' | 'bars' | 'extruded' | 'heatmap', ... });
globe.setDataLayer(null);          // teardown — disposes the previous handle
globe.getDataLayer();              // current config | null

// Backward-compatible shortcut for the most common case:
globe.setCountryData({ '616': { value: 38, color: '#1e6fff' } }); // routes to setDataLayer({ type: 'choropleth', data })
```

Konfiguracje per-typ są w `data-layers/types.ts` (`ChoroplethDataLayer`, `BarsDataLayer`, `ExtrudedDataLayer`, `HeatmapDataLayer`). Pojedynczy slot — kolejne `setDataLayer(...)` tear-down'uje poprzedni handle i buduje nowy.

### 5c.2 Per-kind matrix (Phase 1–4 deliverables)

| Data layer | outline | dotted | wireframe | paper | hologram |
|---|:---:|:---:|:---:|:---:|:---:|
| **choropleth** | ✅ solid fill | — | — *(no surface)* | future *(stamped ink)* | future *(scanline tint)* |
| **bars** | ✅ solid cylinders | ✅ additive glow | future *(monospace tower)* | future *(ink stack stamps)* | future *(cyan beam + scanline)* |
| **extruded** | ✅ opaque pillars (DoubleSide) | ✅ additive glow pillars | future | future | future |
| **heatmap** | ✅ opaque displaced sphere | ✅ additive glow displaced sphere | future | future *(pencil shading)* | future *(scanline tint)* |
| **hexbin** | ✅ vertex-coloured cells | future *(additive cells)* | future *(grid-aligned cells)* | future *(stamped ink cells)* | future *(scanline tint cells)* |
| **charts** | ✅ solid bars/pies/donuts | future *(additive glow segments)* | future *(wireframe charts)* | future *(stamped ink charts)* | future *(cyan glowing charts)* |

Brakująca dekoracja per kind = silent no-op (jednorazowy `console.warn` "kind X has no Y decoration"). Konsument nie crash'uje przy zmianie kindu.

### 5c.3 Mechanika dekoratorów

Każda dekoracja to fabryka:

```ts
type DataLayerBuilder = (
  layer: DataLayer,
  ctx: { globeGroup: Group; features: ReadonlyArray<CountryFeature>; tokens: ResolvedTokens }
) => DataLayerHandle; // { type, setData?, update?, dispose }
```

Kind module wystawia komplet w `decorations.dataLayers`:

```ts
return {
  decorations: {
    focusPulse,
    dataLayers: {
      choropleth: choroplethBuilder,
      bars: barsBuilder,
      extruded: extrudedBuilder,
      heatmap: heatmapBuilder,
      hexbin: hexbinBuilder,
      charts: chartsBuilder,
    },
  },
  ...
};
```

`globe.ts` w `setDataLayer(layer)`:
1. Tear-down poprzedniego `state.dataLayer.handle` przez `dispose()`.
2. Lookup `state.kindHandle.decorations.dataLayers[layer.type]`.
3. Brak buildera → warn + no-op (zachowujemy poprzednio sclear'owany slot).
4. Build → `state.dataLayer = { config, handle }`.
5. Per-frame tick `handle.update?.(delta, elapsedSeconds)` w głównej pętli rendererowej (obok `kindHandle.update`).

`setDataLayer` wywołane **przed** załadowaniem features (czyli przed `kindHandle`) wpada do `pendingDataLayer` — drainowane w `initCountries` po zbudowaniu kindu. Pozwala konsumentowi wystawić dane już w `GlobeConfig` lub od razu po `createGlobe(...)` bez czekania na `ready`.

### 5c.4 Co nie jest data layerem (a mogłoby się wydawać)

Świadome cięcia, żeby utrzymać API klarowne:

- **Markers, HtmlMarkers, Arcs** — to są **layery niezależne od data-layer slot'u**. Można je używać jednocześnie z dowolnym data layerem (np. choropleth + markers + arcs naraz). Patrz §4.4, §4.5, §4.7. To są features zarządzane bezpośrednio przez `setMarkers / setArcs / setHtmlMarkers`, każdy z własnym slotem.
- **Country labels, focus pulse, hover crosshair** — to są **decorations dekoracyjne** semantyczne (§5b), nie data layery. Inne API (`setCountryLabelsEnabled`, lifecycle hook'i kindu).
- **Atmosphere, starfield** — to są **global effects** (§4.10). Włączane raz w configu, nie zmieniane runtime per data layer.

Reguła kciuka: **data layer = zbiór wartości z jednym dominującym sposobem wizualizacji, który zmienia look całego globusa**. Jeśli to "punkty na powierzchni które masz dodać do tego co już jest" → markers/arcs.

---

## 6. Roadmap

| Wersja | Cel główny | Highlights |
|---|---|---|
| **v0.1** *(now)* | Fundament wizualny | Outline style, vanilla demo, 3 framework skeletons, build pipeline |
| **v0.2** | Theme tokens | Token system, 1-2 presety per styl, polished outline + dotted styles |
| **v0.3** | Markery + arcs | Pin/HTML marker, animated arcs, focus-on-country, country labels |
| **v0.4** | Style #3-#4 | Wireframe + Choropleth, country data binding, hover/click events |
| **v0.5** | Style #5-#6 | Paper + Hologram, custom shaders pipeline, easings polish |
| **v0.55** *(in progress)* | Data layers polish | Shader-based heatmap (5 kernels, country domes, grid+contour overlays, animation system with 33 easings + per-pixel delay map), **multi-series charts (7 sub-types: grouped/stacked bars, pie, donut, radial, gauge, sunburst) with per-segment animations + HTML label overlay + click events**, **hex-bin spatial aggregation (icosphere binning, 7 aggregate modes, 5 stagger orders, pulse-style heartbeat animation, hover highlight + cell borders + click events)**, 4 standalone demo pages |
| **v0.57** *(done 2026-09-07)* | Cinematic realism pass | Kind cinematic (§3.7): HDR post-processing pipeline, relief/biomy/lód/płycizny, chmury z cieniami, atmosfera scattering, słońce fixed/realtime/orbit + tarcza, zorza, Droga Mleczna, opcjonalne tekstury (Earth 2k w demo), presety night/day/dawn/noir, Studio knobs, scanline rasterizer atlasu (9 s → 10 ms) |
| **v0.6** | Story engine v1 | Declarative scenes, autoplay, manual controls, easings |
| **v0.65** | Story ↔ data-layer bridge | **Lifecycle hooks** (§4.9.1) na `DataLayerHandle` (`onEnter / onLeave / onSceneChange`), `heatmap.playAnimation({ trigger, target })` z per-country masking, story scene config może override'ować animation per scena |
| **v0.7** | A11y + i18n | Keyboard nav, reduced-motion (heatmap timeline'y skaczą do końca), locale country names |
| **v0.8** | Wrappery + SSR | React/Angular/Vue dopracowane, SSR safety, error boundaries |
| **v0.9** | Docs site | Examples per use-case (A,B,C,D,F), storybook, playground |
| **v1.0** | **Public release** | All 6 styles, 3 wrappery, narrative engine, a11y, docs, tests |
| **v1.x** | Sub-divisions, time | Admin-1, time slider, time-keyframed heat, plugin API, region groupings, heatmap heartbeat/pulse mode, smooth data-update crossfade |
| **v2.0** | Topographic + Neon | Future styles, day/night, video export, Svelte/Web-Component wrappers, scrollytelling, hex-bin agregacja, particle flow over heat field |
| **stretch** | WYSIWYG, AR/VR | Scene editor, ARView, branching narratives |

**Realistyczny harmonogram dla solo-deva (3-5h/dzień):** v0.5 ~3 mies., v1.0 ~12-15 mies.,
v2.0 +12 mies. To jest pełna prawda, nie marketing.

---

## 6b. Pre-built feature presets (future) 🚀

> Specjalizowane "out-of-the-box" presety które pakują kombinacje data layerów + markers + arcs + opinionated tokens jako jedną instalację. Konsument płaci za to convenience, my płacimy za to spójność wizualną.

### 6b.1 World Cities preset `[v1.x·LAYER·M]` 🚀 *future*

- **Co dostarcza:** zestaw ~1000 największych miast jako `MarkerConfig[]` z `size = log(population)`, always-on `HtmlMarker` labels (declutter na zoom-out), opcjonalny `setDataLayer({ type: 'bars' })` dla per-city populacji.
- **Inspiracja (globe.gl):** "World Cities", "Population Bars".
- **API kierunek:** `import { worldCitiesPreset } from '@your-globe/core/presets/world-cities'` → `worldCitiesPreset({ minPopulation: 500_000 })` returns the marker config + suggested data layer.
- **Decyzja:** wbudowany dataset (lazy-loaded JSON, ~50KB), nie hardcoded.

### 6b.2 Airline Routes preset `[v1.x·LAYER·L]` 🚀 *future*

- **Co dostarcza:** najpopularniejsze airline routes jako `ArcConfig[]` (animated, particle flow), pakiet airport markerów, opcjonalny live-flight feed via `subscribe()`.
- **Inspiracja (globe.gl):** "Airline Routes".
- **API kierunek:** `import { airlineRoutesPreset } from '@your-globe/core/presets/airline-routes'` → `airlineRoutesPreset({ source: 'openflights', topN: 1000 })`.
- **Decyzja:** opt-in, dataset pobierany z CDN (zbyt duży na bundle).

### 6b.3 Earthquakes / Disasters preset `[v2+·LAYER·M]` 🚀 *future*

- **Co dostarcza:** ostatnie trzęsienia ziemi (USGS feed) jako pulse markers + heatmap intensywności + time slider scrubber dla replay.
- **Inspiracja (globe.gl):** "Recent Earthquakes", "Geographic Heatmap".

### 6b.4 Solar Terminator + Clock preset `[v2+·GLOBAL·M]` 🚀 *future*

- **Co dostarcza:** bieżąca pozycja słońca, global day/night shading (§4.10 jako global effect), zegar UTC HUD, rotacja sceny w czasie rzeczywistym.
- **Inspiracja (globe.gl):** "Day-Night Cycle".

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

- **Style / kind** — visual preset bundling renderer config + theme tokens. Jeden z 6 v1:
  cinematic, outline, dotted, wireframe, paper, hologram (choropleth jest data layerem).
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
