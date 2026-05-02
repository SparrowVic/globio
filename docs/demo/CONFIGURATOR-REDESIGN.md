# Configurator Redesign — Plan

> Plan przebudowy `examples/vanilla-demo` — z 4 statycznych paneli wciśniętych w okno na **floating glassmorphism panel system z reactive forms**, jeden reusable komponent, logiczne grupowanie funkcji.
>
> **Status:** plan, nie implementacja. Po zatwierdzeniu wchodzi roboczo w 5 fazach.

---

## 1. Co jest nie tak teraz

### 1.1 Fizyczna struktura
```
TopCommandBar    fixed top, 52px, blur:16px, opacity:0.85
FoundationPanel  fixed left, 360px wide, pełna lista kontrolek (~30) bez collapse
LayerInspector   fixed right, 390px wide, conditional na activeLayer
StatusDock       fixed bottom, status + JSON
```

Cztery komponenty, każdy wbudowany pod-od-zera (3 różne style heading/section, każdy panel ma własny układ klas CSS `.panel-surface`, `.panel-section`, `.left-panel`, `.right-panel`).

### 1.2 Problemy

1. **Wszystko widoczne na raz** — `FoundationPanel` ma 4 sekcje × ~7 kontrolek = 28 kontrolek non-stop na ekranie. Brak hierarchii.
2. **Brak collapse** — żaden panel/sekcja nie zwija się. Mała rozdzielczość = panel zasłania 60% widoku.
3. **Brak reaktywności** — `autoRotateSpeed` widoczne nawet gdy `autoRotate: false`. `dome*` widoczne nawet gdy `surfaceMode !== 'country'`. `gaugeMax` zarezerwowane, ale brak ekspozycji w UI. Użytkownik ustawia coś co nie działa, nie wie dlaczego.
4. **Glassmorphism płytki** — `background-opacity: 0.78–0.84` z `blur(16px)` to jedynie lekki efekt, panel czyta się jako solid-dark.
5. **Brak jednego źródła prawdy o panelach** — każdy panel ma własną hierarchię heading/icon/section. Trudno dodać piąty.

---

## 2. Cele redesignu (3 główne)

### 2.1 **Hierarchia visual** — sekcje rozwijane, default-collapsed te najmniej używane
Użytkownik widzi w pierwszej chwili tylko **8–10 najważniejszych kontrolek** (kind, theme, dataset, layer, replay). Reszta jest jeden klik dalej.

### 2.2 **Forma reaktywna** — kontrolki same się ukrywają / wyłączają gdy ich prereq nie jest spełniony
"Disable + tooltip wyjaśniający" zamiast "ukryj completely" (user nie traci orientacji co istnieje, wie co odblokować).

### 2.3 **Jeden komponent panelu** — `<Panel>` + `<PanelSection>` reużywalne, max 3-4 instancje w aplikacji
Zero duplicate'u. Dodanie 5-tego panelu = jedna instancja `<Panel position="bottom-right">…</Panel>`.

---

## 3. Target layout (4 panele)

```
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR (slim 44px)                                           │
│ [Globio]  [Preset ▾]                  [⏵ Replay] [⌂] [⬇] [⟳] │
└──────────────────────────────────────────────────────────────┘
┌──────────────────┐                          ┌──────────────────┐
│ LEFT: STAGE      │                          │ RIGHT: DATA      │
│  ▾ Kind & Theme  │                          │  ▾ Active Layer  │
│  ▸ Surface       │       [GLOBE]            │  ▾ Dataset       │
│  ▸ Camera        │                          │  ▾ Visual        │
│  ▸ Atmosphere    │                          │  ▸ Animation     │
│  ▸ Performance   │                          │  ▸ Interaction   │
└──────────────────┘                          └──────────────────┘
                ┌────────────────────────────────────┐
                │ BOTTOM: STATUS (slim, expandable)  │
                │  60 fps · USA / Fossil: 60         │
                │  ▸ Export JSON                     │
                └────────────────────────────────────┘
```

Konwencje:
- `▾` = expanded, `▸` = collapsed
- Top bar zawsze widoczny
- Stage / Data panele można zwinąć całkowicie do paska 36px wysokości (chevron toggle); użyteczne na małych ekranach
- Status dock jest slim by default (jedna linia FPS + hover); rozwija się kliknięciem do JSON view + sample dump

---

## 4. Reusable component contract

### 4.1 `<Panel>` — nadrzędny floating container

```tsx
<Panel
  id="stage"                       // for localStorage persistence
  position="left"                  // 'left' | 'right' | 'top' | 'bottom-right' | 'bottom'
  title="Stage"
  icon={<Globe2 />}
  badge="outline·dark"             // optional kicker shown right of title
  defaultCollapsed={false}
  width={360}                      // px or 'auto'
  maxHeightFraction={0.78}         // 0..1 of viewport height
>
  <PanelSection id="kind-theme" title="Kind & Theme" defaultOpen>
    {/* ... */}
  </PanelSection>
  <PanelSection id="surface" title="Surface" defaultOpen={false}>
    {/* ... */}
  </PanelSection>
</Panel>
```

**Co zapewnia:**
- Glassmorphism surface (przejrzystość 0.55, blur 20px saturate 180%)
- Header z tytułem + chevron do zwinięcia całego panelu (icon-only mode 36×36px gdy collapsed)
- Scroll body gdy zawartość > maxHeight
- LocalStorage persistence dla stanu collapsed (klucz `globio-panel-${id}`)
- Pozycjonowanie zarządzane przez `position` prop (CSS `fixed` + offsets)
- Subtelny inner-shadow + outer-shadow + 1px white-translucent border

### 4.2 `<PanelSection>` — accordion item w panelu

```tsx
<PanelSection
  id="surface"
  title="Surface"
  icon={<Layers />}
  defaultOpen={true}
  meta="3 active"                  // optional right-aligned hint
  hidden={false}                   // hide entire section conditionally
>
  {/* controls */}
</PanelSection>
```

**Co zapewnia:**
- Toggle chevron w prawym-górnym rogu sekcji
- Subtle separator między sekcjami (only when both expanded)
- LocalStorage persistence (klucz `globio-section-${panelId}-${id}`)
- `hidden` ukrywa całą sekcję (nie tylko collapse) — używane gdy active layer się zmienia

### 4.3 `<DependsOn>` — reactive disable wrapper

```tsx
<DependsOn
  when={settings.autoRotate}
  because="Enable Auto rotate first"
  variant="dim"                    // 'dim' (opacity 50% + tooltip) | 'hidden'
>
  <SliderField label="Rotate speed" ... />
</DependsOn>
```

**Co zapewnia:**
- Gdy `when === false`: dim wrapper (`opacity-50 pointer-events-none`) + (i) icon obok labela z tooltipem `because`
- Gdy `variant="hidden"`: zamiast dimowania — całkowicie ukrywa
- Tooltip umieszcza link/CTA jeśli prereq jest jednoznaczny: "Enable Auto rotate" z onClick (przyszła iteracja)

### 4.4 Field components — bezpośrednie wsparcie `disabled` / `disabledReason`

Aktualne `SliderField`, `SwitchField`, `SelectField`, `ToggleField` dostają:
```ts
disabled?: boolean;
disabledReason?: string;  // tooltip text shown when hovering disabled state
```

To prostsze niż wszędzie owijać w `<DependsOn>`. `<DependsOn>` zostaje dla bardziej złożonych przypadków (np. cała sekcja zależy od jednej flagi).

---

## 5. Section grouping — gdzie co ląduje

### 5.1 LEFT PANEL: **Stage** (globe-level)

```
▾ Kind & Theme        [icon: Globe2]   default-open
   - Kind toggle (outline / dotted / wireframe / paper / hologram)
   - Theme select (filtered by kind)
   - Country resolution (low/med/high)

▸ Surface             [icon: Layers]   default-closed
   - Country labels switch
   - Label threshold slider     [DependsOn countryLabels]
   - Atmosphere switch
   - Starfield switch
   - Focus pulse switch

▸ Camera              [icon: Compass]  default-closed
   - Axis tilt slider
   - Zoom mode toggle (classic / attract / repel)
   - Zoom strength slider       [disabled when zoomMode='classic']
   - Smooth zoom switch
   - Auto rotate switch
   - Rotate speed slider        [DependsOn autoRotate]

▸ Interaction         [icon: MousePointer]  default-closed
   - Hover enabled switch
   - Hover occlude back side    [DependsOn hoverEnabled]

▸ Performance         [icon: Gauge]    default-closed
   - Pixel ratio select
   - Adaptive quality switch
```

### 5.2 RIGHT PANEL: **Data** (active layer + its config)

```
▾ Active Layer        [icon: Layers3]  default-open, slim
   - Toggle: heatmap / hexbin / charts / none
   - Empty-state message gdy 'none'

▾ Dataset             [icon: Database] default-open
   - Per-layer dataset picker (zmienia się gdy active layer się zmienia)
   - Live status (loading / error / count)

▾ Visual              [icon: Palette]  default-open
   - Per-layer visual config (kernel/curve/palette dla heatmap; chart type dla charts; aggregate/cellInset dla hexbin; etc.)
   - Reactive zależności: jak surfaceMode = 'country' → dome controls visible; chartType = 'gauge' → gaugeMax visible; etc.

▸ Animation           [icon: Sparkles] default-closed
   - Animation enabled switch
   - Style toggle               [DependsOn animationEnabled]
   - Order toggle               [DependsOn animationEnabled]
   - Easing select              [DependsOn animationEnabled]
   - Duration slider            [DependsOn animationEnabled]
   - Stagger slider             [DependsOn animationEnabled]
   - Per-segment stagger        [DependsOn animationEnabled & charts.chartType has segments]

▸ Interaction         [icon: Hand]     default-closed
   - Highlight switch           (charts + hexbin)
   - Borders switch             (charts + hexbin)
   - Border opacity             [DependsOn borders]
   - Labels mode select         (charts only)
```

### 5.3 BOTTOM PANEL: **Status** (slim by default)

```
slim line:  60 fps · ready · USA / Fossil: 60        [▸ details]

expanded:
▾ Runtime
   - FPS counter, ready state, last command
   - Hover info (last hovered entry / segment)
   - Layer + dataset summary
▸ Export JSON
   - Pretty-printed config
   - [Copy] [Download .json] buttons
```

### 5.4 TOP BAR (zostaje, lekki refresh)

```
[⚙ Globio]  [Preset ▾]              [⏵ Replay] [⌂ Home] [⬇ Export] [⟳ Reset]
                                     ^ icon-only buttons z tooltipami
```

Slim 44px (z 52px), bez podtitułu (przeniesiony do panel badges).

---

## 6. Reactive disable matrix

### 6.1 Globe / Stage

| Field                         | Active when                                           |
|-------------------------------|-------------------------------------------------------|
| `theme`                       | always (filtered by kind)                             |
| `labelMinScreenSize`          | `countryLabels`                                       |
| `hoverOccludeBackSide`        | `hoverEnabled`                                        |
| `zoomStrength`                | `zoomMode !== 'classic'`                              |
| `smoothZoom`                  | `zoomMode !== 'classic'`                              |
| `autoRotateSpeed`             | `autoRotate`                                          |
| `pixelRatio`                  | always; `adaptiveQuality` shows hint "auto-overrides" |

### 6.2 Heatmap

| Field                         | Active when                                                |
|-------------------------------|------------------------------------------------------------|
| `domeCenterArea`              | `surfaceMode === 'country'`                                |
| `domeShoulderHeight`          | `surfaceMode === 'country'`                                |
| `domeEdgeSteepness`           | `surfaceMode === 'country'`                                |
| `domePreScale`                | `surfaceMode === 'country'`                                |
| `intensity`                   | `kernel !== 'uniform'`                                     |
| `displacementCurve`           | `maxHeight > 0`                                            |
| `shading`                     | `maxHeight > 0`                                            |
| `blurPasses`                  | always; show 0-warning gdy `kernel === 'uniform'`          |
| `animation*`                  | `animationEnabled`                                         |

### 6.3 Hexbin

| Field                         | Active when                                       |
|-------------------------------|---------------------------------------------------|
| `cellInset`                   | always                                            |
| `borderOpacity`               | `borders`                                         |
| `aggregate: 'mean'/'median'/'p90'` | dataset has `value` field (not just count)   |
| `animation*`                  | `animationEnabled`                                |
| `animation.origin`            | `animation.order === 'radial'`                    |

### 6.4 Charts

| Field                         | Active when                                                              |
|-------------------------------|--------------------------------------------------------------------------|
| `innerRadius`                 | `chartType ∈ {donut, gauge, sunburst}`                                   |
| `padAngle`                    | `chartType ∈ {pie, donut, gauge, sunburst}`                              |
| `gaugeMax`                    | `chartType === 'gauge'`                                                  |
| `gaugeBackgroundColor`        | `chartType === 'gauge'`                                                  |
| `valuePreScale`               | `chartType === 'extruded'`                                               |
| `segmentStaggerMs`            | `chartType !== 'extruded'` (extruded has no segments)                    |
| `borderOpacity`               | `borders`                                                                |
| `labels`                      | dataset has `entry.label` field                                          |
| `dataset` ↔ `chartType` couples | gauge → kpi / single-series datasets · extruded → world-* datasets     |

### 6.5 Cross-layer

| Field                         | Active when                                                              |
|-------------------------------|--------------------------------------------------------------------------|
| Layer-specific Visual section | `activeLayer !== 'none'`                                                 |
| Animation panel               | active layer is heatmap / hexbin / charts (none → animation panel hidden)|
| Heatmap dome controls         | `surfaceMode === 'country'` AND `activeLayer === 'heatmap'`              |

---

## 7. Glassmorphism polish — konkretne wartości

### 7.1 Panel surface

```css
.panel-surface {
  background:
    linear-gradient(180deg,
      rgba(15, 23, 35, 0.55),
      rgba(7, 11, 18, 0.45));
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 18px 38px rgba(0, 0, 0, 0.42),
    0 2px 6px rgba(0, 0, 0, 0.18);
}

.panel-surface:hover {
  border-color: rgba(255, 255, 255, 0.14);
}
```

### 7.2 Panel section (header)

```css
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px;
  cursor: pointer;
  user-select: none;
  border-radius: 6px;
  transition: background 120ms ease;
}
.section-header:hover {
  background: rgba(255, 255, 255, 0.04);
}
.section-chevron {
  transition: transform 180ms ease;
}
.section-chevron[data-open='false'] {
  transform: rotate(-90deg);
}
```

### 7.3 Top bar

Obecny już prawie idealny — zmniejszyć opacity z 0.88 → 0.55, zostawić blur 16px, przepisać na te same tokeny `--panel-bg-*`.

---

## 8. Implementation phases

### Phase 1 — Foundation (1 commit)
- Stwórz `components/panels/Panel.tsx` (reusable surface + header + collapse)
- Stwórz `components/panels/PanelSection.tsx` (accordion item)
- Stwórz `components/DependsOn.tsx` (disable wrapper)
- Dodaj `disabled` + `disabledReason` props do `SliderField`/`SwitchField`/`SelectField`/`ToggleField`
- Hook `usePanelState(id)` — localStorage persistence
- Update `index.css` z nowym glassmorphism tokens

### Phase 2 — Stage panel (1 commit)
- Przepisz `FoundationPanel.tsx` → używa `<Panel position="left" id="stage">` z 5 sekcjami (Kind & Theme / Surface / Camera / Interaction / Performance)
- Dodaj `<DependsOn>` dla wszystkich reactive fields z §6.1

### Phase 3 — Data panel (1 commit)
- Przepisz `LayerInspector.tsx` → `<Panel position="right" id="data">` z 4–5 sekcjami (Active Layer / Dataset / Visual / Animation / Interaction)
- Reactive disable rules z §6.2-6.4
- Per-layer Visual content factored into Hexbin/Heatmap/ChartsVisualSection components

### Phase 4 — Status dock + Top bar (1 commit)
- Slim status dock z expand-to-details
- Top bar shrink do 44px, icon-only buttons z tooltipami
- Kicker pod tytułem do panel badges

### Phase 5 — Polish + persistence (1 commit)
- localStorage persistence (collapsed states)
- Test: refresh → panel state restored
- Test: small viewport → panels collapse to icons, kliknij = expand
- Test: każdy reactive field ma poprawny disabled state

---

## 9. Files (delete / create / modify)

### Delete
- `components/panels/FoundationPanel.tsx` (zastąpione przez kompozycję Stage)
- `components/panels/LayerInspector.tsx` (zastąpione przez kompozycję Data)

### Create
- `components/panels/Panel.tsx` — reusable surface
- `components/panels/PanelSection.tsx` — accordion item
- `components/DependsOn.tsx` — disable wrapper
- `components/sections/StageKindTheme.tsx` — section content
- `components/sections/StageSurface.tsx`
- `components/sections/StageCamera.tsx`
- `components/sections/StageInteraction.tsx`
- `components/sections/StagePerformance.tsx`
- `components/sections/DataActiveLayer.tsx`
- `components/sections/DataDataset.tsx`
- `components/sections/HeatmapVisual.tsx` / `HexbinVisual.tsx` / `ChartsVisual.tsx`
- `components/sections/AnimationSection.tsx` (shared)
- `components/sections/InteractionSection.tsx` (shared)
- `hooks/usePanelState.ts` — localStorage persistence

### Modify
- `App.tsx` — replace 4 panel imports z 3 (Top + Stage + Data + Status), pass state down
- `components/controls.tsx` — add `disabled` / `disabledReason` props
- `components/panels/StatusDock.tsx` — slim mode + expand
- `components/panels/TopCommandBar.tsx` — slim height + icon buttons
- `index.css` — new glassmorphism tokens, remove obsolete `.panel-surface` variants

---

## 10. Open questions (potrzeba decyzji)

1. **Persistence default** — czy collapsed states resetują się przy `Reset configurator`? *Sugeruję TAK* — reset to fresh slate.
2. **Mobile / narrow viewport** — czy panele zwijają się automatycznie pod 768px? *Sugeruję TAK* — auto-collapse to icons, click = expand z overlay (nie push).
3. **`<DependsOn>` wariant** — domyślnie `dim` czy `hidden`? *Sugeruję `dim`* — user widzi co istnieje. `hidden` rezerwujemy dla "ta sekcja nie istnieje dla tego layera" (np. dome controls dla nie-country surfaceMode).
4. **Theme filtering by kind** — czy `theme` select pokazuje wszystkie 9 themes zawsze, czy filtrowane przez `kind`? *Sugeruję filtrowane* (outline-* tylko gdy kind=outline) — mniej confusion.
5. **Panel drag handles** — czy chcemy w przyszłości pozycjonowanie drag-and-drop? *Out of scope* — fixed positions starczą.
6. **Collapsed-to-icon panels** — gdy panel zwijasz całkowicie (nie sekcje, ale cały panel), czy zostaje 36×36 ikona w tej samej pozycji, czy znika? *Sugeruję 36×36 ikona* — łatwo otworzyć z powrotem.

---

## 11. Success criteria (po Phase 5 musi być prawda)

- [ ] Każdy panel rozwija/zwija (cały + każda sekcja niezależnie)
- [ ] Stan collapse persistowany w localStorage między reloadami
- [ ] Wszystkie reactive fields z §6 mają poprawne disable states z tooltipami
- [ ] Glassmorphism: panel widzi rozmyty glob za sobą (test: pochyl glob, kolory powinny prześwitywać)
- [ ] Top bar 44px, panele 360px szerokości, status dock slim 36px
- [ ] Brak duplikacji kodu paneli — wszystkie 3 (Stage / Data / Status) są instancjami `<Panel>`
- [ ] FoundationPanel.tsx + LayerInspector.tsx usunięte
- [ ] Typecheck + tests + build clean
