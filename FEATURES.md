# Globio — Features Catalog

This document describes the implementation as of **2026-09-07**. Sections 1–5c
cover current capabilities and their limits. Section 6 records unimplemented
ideas, without release dates or promised APIs. The numbered sections remain for
references from earlier design plans; those plans describe historical intent.

For exact signatures, defaults and examples, use the demo's `/docs` pages and the
source types: [configuration](packages/core/src/types/globe-config.ts),
[kinds](packages/core/src/types/kinds.ts), [instance methods](packages/core/src/types/instance.ts),
[data layers](packages/core/src/data-layers/types.ts), [themes](packages/core/src/theme/types.ts)
and [stories](packages/core/src/story/types.ts).

## 1. Vision & non-goals

Globio is a browser-based 3D globe library built in TypeScript and Three.js, with
React, Vue and Angular wrappers. It combines six visual kinds, typed theme tokens,
geographic overlays and a scene-based story controller. The host application owns
its data, application state and business logic.

Globio renders a sphere. It is not a GIS analysis platform, a geocoder, a map-tile
service or a simulation engine. Interactive rendering requires a DOM and WebGL;
server-rendered globe snapshots are not implemented. See section 7 for boundaries.

## 2. Use cases

| Use case | Available building blocks | Host application responsibilities |
|---|---|---|
| Marketing and landing pages | Six kinds, themes, atmosphere, rotation, Cinematic effects | Page composition, loading treatment, motion preferences |
| Dashboards and analytics | Country fills, bars, extrusion, heatmaps, hexbin, charts and legends | Data acquisition, filtering, meaningful scale domains |
| Education and storytelling | Country labels, active selection, camera moves, timed scenes and popups | Narrative content, accessible controls and alternatives |
| Travel and logistics | Position-based markers, HTML markers and animated arcs | Routing, travel-time calculations and live data |
| Geographic games and quizzes | Country and marker events, active states, focus effects | Rules, scoring, answer validation and persistence |

Data-layer support depends on the kind (section 5c.2). Wireframe supports surface
and marker interaction but has no country picking or `focusOnCountry()`.

## 3. Globe styles catalog

Select a visual style with `kind`. When omitted, a recognized theme preset selects
its associated kind; otherwise the fallback is Outline. Choosing a kind alone
does not select that kind's preset. Kind and theme are construction settings:
create a new instance, or remount a wrapper, to change them.

### 3.1 Outline

A solid sphere with country borders, hover glow and active-country styling. It is
the broadest data-visualization kind: all six data-layer types are implemented.
Outline also provides optional continent dimming, a focus pulse and a hover
crosshair. Shared fills can show a uniform color, a cyclic palette or country data.

Presets: `outline-dark`, `outline-cyber`, `outline-sunset`, `outline-light` and
`outline-monochrome`. Relevant shared tokens include `globe.surfaceColor`,
`countries.border.color`, `countries.borderHover.color` and `atmosphere.color`.

### 3.2 Dotted

Land is sampled into a field of dots. Optional effects include drift, click
ripples, hover lift and brightness, active-country pulses, emphasized coastlines,
cursor wakes, latitude bands, breathing and constellation links. Latitude bands,
breathing and constellation links are disabled by default. Hover and active
feedback emerge from the dots; the kind skips the standard country-outline layer.

Preset: `dotted-dark`. Dot styling uses `countries.dotted.*` tokens and `dotted.*`
configuration. Theme and palette dot colors work. The declared `dotted.dots.mode:
'data'` does not yet map values onto dots: choropleth colors fill country polygons
beneath the dots, while `setCountryData()` can trigger data-flash feedback.
Dotted supports choropleth, bars, extruded countries and heatmaps.

### 3.3 Wireframe

A latitude/longitude grid with optional major-line hierarchy, front/back emphasis,
equator beam, glitches, pole streams, moving data packets, compass markings and
grid or pole pulses. Grid colors, density and opacity use `wireframe.*` tokens and
configuration. Preset: `wireframe-tron`.

Wireframe has no country picking, country hover/click events, standard country
fills, hover crosshair or data layers. `setActiveCountry()` can show its dedicated
geodesic active ring. Surface clicks, markers, arcs, labels and coordinate-based
camera moves remain available. It still participates in the globe's geographic
loading lifecycle; it is not a separate offline renderer.

### 3.4 Choropleth — a data layer

Choropleth maps country values or explicit colors onto filled polygons in Outline,
Dotted and Cinematic. It is selected through `setDataLayer()` or the convenience
method `setCountryData()`, not through `kind`. Scales and legends are described in
section 5c.3. Paper's decorative fill is separate from choropleth data support.

### 3.5 Paper

An illustrated globe with procedural paper grain, fibers, stains, watercolor-like
surface treatment and rough country borders. Options include border stippling and
ink bleed, single-color or pastel country fills, a geographic grid, sepia tint,
vignette, compass rose, aging marks and a watermark. Preset: `paper-default`.

Paper supports country picking, active selection and shared overlays. Its country
fill is configured with `paper.fill`; it does not mount the shared `countries.fill`
layer or any data-layer variant. Relevant tokens include `paper.surfaceColor`,
`paper.borderColor` and `paper.fillColor`.

### 3.6 Hologram

An emissive shell with scanlines, rim and outer glow, glitches and optional
chromatic aberration, noise, projector pulses, scanning bands, phase shimmer and
calibration ticks. Preset: `hologram-cyan`; styling combines `hologram.*` tokens and
configuration.

Country picking, active selection, the hover crosshair and shared overlays are
available. Hologram does not mount shared country fills or data layers.

### 3.7 Cinematic

A procedural Earth with relief, biome variation, ice, shallow-water treatment,
specular lighting, clouds and cloud shadows. The atmosphere adds scattering,
twilight color and night-side airglow. Other features include aurora, city lights,
route networks and a Milky Way background when the Cinematic stars are enabled.
Presets: `cinematic-night`, `cinematic-day`, `cinematic-dawn`, `cinematic-noir`.

The sun supports a fixed world-space light vector, real-time solar position or an
orbiting longitude. A visible disc and glare are independent of directional
lighting. Clouds default to coverage `0.42` and shadow strength `0.45`; disabling
the cloud shell and disabling shadows are separate controls.

Optional day, night, normal, specular and cloud textures accept URLs or Three.js
textures. Missing channels retain their procedural fallback; loading can crossfade
from procedural rendering. Procedural mode needs no external Earth texture, but
still uses downloaded country geometry. It is not a geophysical simulation.

`setCinematicData()` supplies city-light and route data independently of the data
layer, markers and arcs. Routes can reference city ids or coordinates. Omitted or
empty arrays use the built-in decorative fallback; `null` restores that fallback.
Use the layer's `enabled: false` setting to hide it. A city-light `count` or network
`maxConnections` of zero also caps custom data at zero. These decorative objects do
not emit the standard marker events.

Cinematic supports country picking, shared fills, choropleth and heatmap. Its
quality setting can adapt shader detail; shared post-processing is enabled by
default for this kind.

## 4. Cross-cutting capabilities

### 4.1 Theme tokens and presets

Themes resolve in this order: base tokens, selected preset, inline token overrides.
Undefined overrides are ignored. Tokens are flat, typed keys such as
`background.color`, `globe.surfaceColor`, `countries.border.color`,
`countries.fill.opacity`, `markers.defaultColor`, `arcs.color` and
`legend.backgroundColor`. They are not nested configuration objects.

There are 13 built-in presets: five Outline, four Cinematic and one for each other
kind. `registerThemePreset()`, `unregisterThemePreset()` and `listCustomPresets()`
manage custom presets; `resolveTheme()` resolves the complete token set. Custom
names can shadow built-in names. A custom name alone does not register a default
kind, so specify `kind` when needed. Presets are resolved at construction; live
theme replacement and animated theme transitions are not implemented.

### 4.2 Camera and controls

- Pointer dragging rotates the globe; the wheel controls distance. Zoom modes are
  `classic`, `repel` and `attract`, with configurable strength and smoothing.
- `flyTo()` moves toward a latitude/longitude and optional distance, with duration,
  easing and optional midpoint elevation. Defaults are 1500 ms, `easeInOutCubic`
  and no extra elevation.
- `focusOnCountry()` derives a camera position and distance from loaded country
  bounds. It works on the five kinds with country picking, excluding Wireframe.
- `setRotation(position, animate?)` changes orientation while preserving distance;
  omitted or false `animate` applies immediately. Coordinates are `[lat, lng]` in
  degrees, and distances are in globe-radius units.
- Auto-rotation is disabled by default, yields to dragging and camera transitions,
  and has default speed `0.5`. Speed `1` corresponds to about `0.2` radians/second.
  Country focus pauses it by default until the host enables it again.
- Initial position, axis tilt, zoom limits and framing are construction settings.
  Without an initial position, an untilted globe faces `[0, -90]`. Framing uses
  vertical field of view; it does not guarantee horizontal fit in a narrow host.

Dedicated pinch gestures, keyboard globe navigation and momentum-based drag
inertia are not implemented. Smooth zoom interpolation is not drag inertia.

### 4.3 Countries, selection and events

Country geometry uses World Atlas at low (110m), medium (50m, default) or high
(10m) resolution. Source data loads asynchronously; very small countries may be
absent at a given resolution. Numeric ids are normalized to three-digit strings,
for example `32` to `032`; nonnumeric ids are not translated from names or ISO
alpha codes.

Country picking and hover/click events work on Outline, Dotted, Paper, Hologram and
Cinematic. Wireframe skips the picking layer. Active-country state is supported
by all six kinds, with a dedicated ring on Wireframe. Hover crosshairs use the
shared `outline.hoverCrosshair` option on the five picking kinds.

`countryClick` and `countryHover` identify the country and pointer coordinates;
bound values are obtained with `getCountryData()`. `surfaceClick` contains
`{ point: [lat, lng] }`. Shared `countries.fill` modes are `none`, `always`,
`palette` and `data`, supported by Outline, Dotted and Cinematic. Active fill
styling takes precedence over hover styling. Paper instead uses `paper.fill`.

Exported region arrays include continents and groups such as G7, G20, NATO, EU,
BRICS, ASEAN, OECD, EFTA, MERCOSUR and AU. They are static convenience datasets,
not a current geopolitical membership service.

### 4.4 Markers and HTML overlays

Instanced markers accept stable ids, geographic positions, scalar size and color,
labels, hover styling and optional pulses. Methods replace the whole marker set,
add or replace one id, or remove one id. Marker hover and click events are typed.
The default instance capacity is 10,000; this is an allocation limit, not a frame
rate guarantee. Size and color functions or geographic clustering are not built in.

HTML markers anchor trusted HTML strings or DOM factories to coordinates. They
support offsets, anchors and far-side occlusion. The host can attach its own DOM
interaction to factory-created elements. Marker removal and globe destruction
remove the associated overlays.

### 4.5 Arcs and routes

Arcs connect coordinate pairs and remain independent of marker ids. They support
color, width, opacity, solid or dashed styling, fixed or distance-based height,
and animated heads with duration and easing. Removing a marker does not remove an
arc. Application-level routing, multi-stop itineraries and travel times belong to
the host. Cinematic route networks are a separate decorative facility (§3.7).

### 4.6 Data visualization

The six data-layer variants are choropleth, bars, extruded countries, heatmap,
hexbin and charts. One data layer is active per globe, alongside independent
markers, arcs, labels and Cinematic data. Section 5c covers the support matrix,
scales, lifecycle and interaction limits.

### 4.7 Country labels and tooltips

Country labels are DOM overlays at country centroids, disabled by default.
`countryLabels` controls visibility, typography, custom names and minimum apparent
country size (default 60 screen pixels). Labels fade with occlusion and size;
`setCountryLabels()` replaces custom names. Built-in names come from the source
geometry. Marker labels also provide hover tooltip content.

### 4.8 Story / narrative engine

`setStory()` accepts ordered scenes with unique ids and durations. Each scene may
move the camera, set an active country, change auto-rotation and show an anchored
HTML popup. Camera movement supports delay, duration, elevation and easing;
`focusOnCountry` takes precedence over `flyTo` when both are supplied. Use `flyTo`
on Wireframe. Scene duration includes transition delay and camera movement.

Playback supports autoplay, looping, an initial `startAt` id, play/pause,
next/previous and jumping by scene id. `startAt` enters immediately even without
autoplay. An omitted active country inherits the previous scene's state; `null`
clears it. Popups are removed on scene exit.

`sceneEnter`, `sceneExit` and `storyComplete` expose timeline events. A completed
non-looping story keeps its last scene available to `getCurrentScene()`; repeated
`nextScene()` calls do not repeat completion. `playStory()` after completion
restarts at scene zero. Completion handlers may start another story or replay.

`pauseStory()` stops automatic scene advancement. It does not stop camera motion
or a scheduled transition; resuming starts a fresh full-duration scene timer.
Rendering pauses and story scheduling are independent. There is no automatic
story-to-data-layer bridge; hosts can use scene events to update a data layer.

### 4.9 Animation and timing

Camera easing, marker pulses, arc heads, focus pulses and per-kind shader effects
are implemented. Bars and extruded countries can animate on construction.
Heatmap, hexbin and chart animation is opt-in and supports replay through
`playDataLayerAnimation()` when the current handle implements it. Each layer has
its own animation options; there is no universal animation controller or global
reduced-motion policy.

### 4.10 Atmosphere, stars and post-processing

Atmosphere is enabled unless explicitly disabled. Starfields require explicit
enabling. Their appearance follows the kind and tokens. Focus pulses have common
controls for enabling, origin and optional feedback on otherwise empty surface
clicks, with per-kind rendering.

Post-processing is available to every kind, enabled by default only for Cinematic.
It combines offscreen rendering, bloom, anamorphic streaks, vignette, chromatic
aberration, grain, exposure and highlight roll-off. It adds render-target memory
and GPU work; a failed post-processing setup falls back to direct rendering.

### 4.11 Updating data and time

The host updates data through instance setters or wrapper props. Same-type data
layers can reuse resources when supported; structural changes may rebuild them.
There is no observable subscription API, shared time axis, built-in feed client
or automatic interpolation between arbitrary datasets. Cinematic solar time is a
lighting feature, not a general data playback engine.

### 4.12 Performance and lifecycle

Globes on a page share a frame scheduler with a per-instance frame-rate ceiling
(default 60). Renderer defaults include antialiasing, adaptive quality and pixel
ratio `min(devicePixelRatio, 2)`. Hidden tabs and offscreen globes pause by default.
`setPaused()` holds the scene and WebGL resources while stopping its frame work;
frame-driven animation does not catch up the entire hidden wall-clock interval.

Geographic fetch/parse results and triangulated geometry are cached across
instances. Resize observation follows the container. `destroy()` tears down
rendering, listeners, layers and overlays. Performance depends on viewport size,
resolution, effects, overlays and hardware; no fixed marker-count/FPS guarantee
is part of the API.

User Timing measurements include `globio:construct`, `globio:countries-load`,
`globio:kind-build`, `globio:shader-compile` and `globio:mount-to-ready`.
`ready` follows geographic loading, kind construction and shader preparation.

### 4.13 Accessibility

The host currently provides accessible controls, meaningful labels, textual or
tabular data alternatives and motion preferences. The core has no keyboard country
selection, screen-reader announcements or centralized reduced-motion setting.
No preset is advertised as an audited contrast or color-vision accessibility
solution. DOM overlays can participate in the host's accessible interface.

### 4.14 Export and projection

`toImage()` returns a PNG of the WebGL canvas. Optional custom dimensions must
provide both positive finite `width` and `height`; these are renderer CSS dimensions
and the current pixel ratio affects output pixels. The renderer size and camera
aspect are restored afterward. HTML markers, labels, tooltips and legends are not
included. External textures remain subject to browser CORS rules.

`project()` converts a coordinate to canvas-relative pixels, accounting for camera
position and axis tilt, and returns `null` for hidden or clipped points. It can
help the host position its own overlays. Server snapshots, video export and
shareable URL state are not implemented.

### 4.15 Localization

Custom country-label maps and host-provided marker or popup content can be
localized. Legends accept formatting callbacks. Core does not bundle a locale
catalog, translation service or general date/number formatting layer.

### 4.16 Extension points

Public extension points include custom theme registration, typed instance events,
HTML marker factories and data/configuration setters. Kind constructors and layer
decorations are internal architecture, not a supported public plugin-registration
API. Section 5b separates the current mechanism from future decoration ideas.

### 4.17 Framework integrations

Vanilla uses `createGlobe()`. React, Vue and Angular expose typed configuration
props, forward all ten core events and provide `getInstance()`. React uses callback
props and a ref handle; Vue exposes the instance through its component ref; Angular
uses a standalone OnPush component with rendering outside Angular's zone. Angular
names the core error output `globeError`.

Wrappers create the renderer at browser mount and destroy it on unmount. Direct
`createGlobe()` requires browser APIs. A ref can return `null` before mount;
`ready` signals completion of asynchronous setup. Construction-setting changes
require remounting, because wrapper prop updates forward to `update()` rather than
recreating the globe. Wrapper error-boundary UI and server snapshots are absent.

### 4.18 Developer experience

The monorepo includes core and wrapper packages, TypeScript declarations, tests,
a demo landing page, Studio and a searchable documentation site. Docs include
source-generated configuration, method, event and type references, live examples
and recipes. Shared runnable snippets are checked against the public types.

Studio provides kind/theme selection, grouped controls, help linked to docs,
data-layer configuration, local presets and code/config export. Its controls do
not expose every core field. JSON export contains globe configuration and a
separate data-layer value; functions cannot be serialized. A custom theme name
requires matching registration or token data in the consuming application. Studio
has no JSON-import or shared-URL workflow.

## 5. Configuration scope cheat-sheet

| Scope | Configuration or API | Update behavior |
|---|---|---|
| Construction | Kind, theme, country resolution, axis tilt, initial position, framing, zoom limits, transparency and renderer/performance options | Create a new instance to apply changes reliably |
| Shared visual layers | Country styles, atmosphere, markers, arcs, labels and supported post-processing fields | Use documented setters or supported `update()` fields |
| Kind appearance | `outline`, `dotted`, `wireframe`, `paper`, `hologram`, `cinematic` | Read by the selected kind; structural options may need a rebuild |
| Country data | `countryData`, `setCountryData(map, scale?)` | Selects choropleth; map entries are objects with value/color/opacity |
| Data layer | `setDataLayer(config)` | One slot; reusable handles update in place, structural changes rebuild |
| Cinematic data | `setCinematicData(dataset)` | Independent city-light/network dataset |
| Camera and playback | Camera setters, auto-rotation and story methods | Imperative runtime controls |
| Application behavior | `on()`/`off()` and wrapper event handlers | Host-owned listeners and state |

There is no top-level `scale` configuration field. `mode: 'flat'` is declared but
currently still renders a sphere. `update()` merging a field into stored config
does not imply that every construction setting is reapplied to rendering.

## 5b. Decoration pattern roadmap

The current internal kind contract combines a constructor registry for shared
layers with optional `focusPulse` and `dataLayers` decorations. Focus pulses have
per-kind implementations; data-layer builders define the matrix below. Kind-local
classes also style shared markers, arcs, labels, atmosphere and selection.
A registered class does not mean its layer is mounted: Wireframe and Hologram do
not mount their registered country-fill classes.

Further decorator interfaces for arcs, markers, hover borders, HTML overlays,
labels and starfields remain architectural ideas. Possible visual directions
include ink trails for Paper, particle arcs for Dotted and scanning highlights for
Hologram. Existing effects described in section 3 do not imply that these proposed
interfaces are public or implemented. Any future generalization should preserve
common interaction semantics and explicit per-kind support.

## 5c. Data layers

### 5c.1 Lifecycle and country data

`setDataLayer()` installs a supported layer or replaces the active slot. Calls made
before geographic loading completes queue the latest request. Passing `null`
clears the installed layer and any queued request. An unsupported type removes
the old layer and warns; `getDataLayer()` returns `null` when nothing is installed,
including while an initial request is pending.

Same-type updates can use the handle's `setData()` path when structural settings
permit it. Texture resolution, mesh construction and other structural fields can
require rebuilding. Independent markers, arcs, HTML overlays and Cinematic data
can remain visible alongside the slot.

`setCountryData(map, scale?)` normalizes ids, stores country data and selects the
choropleth slot, replacing any other active data-layer type. Each entry is an
object with optional numeric `value`, `color` and `opacity`; explicit color wins
over the scale. `setCountryData(null)` clears that data and removes an active or
queued choropleth while preserving another data-layer type. Countries absent from
a data map are hidden in data fill mode. Fill visibility can fade, but color
updates do not perform an automatic color tween.

### 5c.2 Support matrix

| Data layer | Outline | Dotted | Cinematic | Wireframe | Hologram | Paper |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Choropleth | Yes | Yes | Yes | No | No | No |
| Bars | Yes | Yes | No | No | No | No |
| Extruded countries | Yes | Yes | No | No | No | No |
| Heatmap | Yes | Yes | Yes | No | No | No |
| Hexbin | Yes | No | No | No | No | No |
| Charts | Yes | No | No | No | No | No |

### 5c.3 Scales and legends

Sequential scales require a `palette` and use a two-value domain. Diverging scales
use minimum, midpoint and maximum; the inferred midpoint is the arithmetic
midrange, not necessarily zero. Threshold scales use ascending cutpoints and one
more color than cutpoints. Categorical scales map numeric category values to
colors. Out-of-domain continuous values clamp to endpoint colors; missing-data
behavior depends on the layer.

The 12 built-in palettes are `blues`, `reds`, `greens`, `oranges`, `purples`,
`viridis`, `magma`, `plasma`, `inferno`, `RdBu`, `BrBG` and `PiYG`. Custom continuous
palettes accept ordered hex color stops.

`showLegend()` adds a theme-styled DOM legend. Standalone
`createLegend({ container, scale, ...options })` also works without a globe. Legends can
show gradients or swatches, titles and formatted values. They cannot infer a
separate dataset's extent: use the same explicit domain for the layer and legend.

### 5c.4 Layer behavior

| Layer | Data and rendering | Important limits |
|---|---|---|
| Choropleth | Country-id map of values or explicit colors, rendered as polygon fills | Dotted colors fill beneath its dots; it does not color the dots themselves |
| Bars | Numeric entries anchored to country ids or explicit positions, rendered as cylinders | Heights and widths use globe-relative dimensions; position entries need no country id |
| Extruded countries | Country values raise polygon tops and side walls | Requires loaded country geometry; no arbitrary extruded GeoJSON input |
| Heatmap | Position/value samples baked into a density texture on a globe mesh | Radius is in radians, default `0.10`; even Gaussian contributions are bounded by that radius |
| Hexbin | Position samples aggregated into subdivided icosphere cells | Current cells are triangular faces despite the API name |
| Charts | Per-location series values rendered as compact multiseries graphics | Entries use a country id or explicit position; extruded charts require a country polygon |

Heatmap supports Gaussian, Epanechnikov, quartic, dome and uniform kernels; peak,
absolute and logarithmic normalization; response curves; grid and contour overlays;
zoom scaling; and country-confined domes. Texture resolution and `meshResolution`
control different allocations. The legacy `subdivisions` field is currently
ignored. `absoluteMax` controls saturation for absolute normalization.

Hexbin supports `sum`, `count`, `mean`, `min`, `max`, `median` and `p90`
aggregation. Resolution ranges from 0 to 5 (20 to 20,480 faces), default 3 (1,280
faces). Options control cell inset, empty cells, height, borders and highlighting.

Charts support eight variants: `bars-grouped`, `bars-stacked`, `pie`, `donut`,
`radial`, `gauge`, `sunburst` and `extruded`. Series keys select entry values;
missing values become zero and negative values are clamped to zero. Styling,
animation, hover highlighting and DOM labels are configurable; labels can appear
on hover or remain visible subject to occlusion.

### 5c.5 Animation and interaction limits

Heatmap, hexbin and charts enable animation only when requested; omitted or false
`animation` disables it. Their replayable handles support
`playDataLayerAnimation()`. Bars and extruded countries instead offer construction
animations. The declared `trigger: 'manual'` option does not currently hold the
initial animation; it must not be used as a promise of manual-only playback.

All six data-layer types declare event fields, but pointer callbacks are currently
implemented only for hexbin and charts. Hexbin events identify the cell, aggregate
value and sample count; chart events identify the entry and series segment. Use
core country events for country interaction on the other supported kinds. There
are no built-in scene-entry/exit hooks or country-targeted replay for data layers.

## 6. Planned and unimplemented ideas

The following are design directions, not available features or scheduled releases.
Earlier version labels and effort estimates have been retired because they mixed
shipped work with speculative milestones. This section records useful intent
without proposing callable APIs.

| Area | Future work |
|---|---|
| Geographic representation | Flat projections, administrative subdivisions, custom geographic sources, adjacency-aware country highlighting |
| Additional visual kinds | Dedicated topographic, satellite, neon, hollow-earth or map-tile styles; true hexagonal polygon aggregation |
| Camera | Momentum, keyboard navigation, dedicated pinch/two-finger gestures, arbitrary-region framing, named views and authored paths |
| Markers and routes | Automatic clustering, image/3D-model markers, configurable hit areas, richer particle flows, multi-stop routes and route gradients |
| Stories | Multiple simultaneous country highlights, scroll-driven playback, branching, audio synchronization and a scene editor |
| Data animation | Explicit story/layer lifecycle hooks, targeted country replay, dataset interpolation and a shared time axis |
| Accessibility | Keyboard country selection, announcements, reduced-motion policy, accessible snapshot descriptions and audited visual presets |
| Localization | Optional translated country-name catalogs, shared locale formatting and richer RTL overlay support |
| Performance | Worker-based geographic preparation, camera-dependent country detail, per-marker visibility optimization and a public diagnostic overlay |
| Export and sharing | URL state, a distributable iframe wrapper, server snapshots, video/GIF recording and print-oriented output |
| Extensions | Supported public registration for custom kinds, layers, shaders and data adapters |
| Frameworks and tooling | Svelte/Web Component wrappers, wrapper fallback UI, a public headless test mode and richer interactive authoring tools |

These ideas must account for current support limits instead of assuming every kind
can render every data layer. In particular, a future decoration or plugin system
must define lifecycle, disposal, interaction and compatibility contracts.

### 6b. Pre-built feature presets

Potential application presets could package curated data with markers, arcs,
scale suggestions and theme choices: world cities/population, airline networks,
disaster monitoring or a solar clock. They are not published preset modules.
Cinematic's built-in decorative city and route distributions are already available;
curated application datasets and external-feed integrations would be additional
work. Hosts currently load and transform those datasets themselves.

## 7. Boundaries

Globio does not provide geocoding, route solving, satellite ephemerides, precise
GIS measurements, physical weather/orbit simulation, authentication, persistence
or a real-time backend. It can visualize data produced by those systems. Its
browser PNG export does not constitute an SSR rendering service, and host-provided
HTML content must be prepared for insertion into the application's DOM.

## 8. Glossary

| Term | Meaning |
|---|---|
| Kind | One of the six rendering identities, selected at construction |
| Theme | Resolved flat token values from defaults, a preset and optional overrides |
| Data layer | The single supported quantitative visualization slot |
| Decoration | An internal per-kind implementation of shared behavior |
| Country id | Usually a zero-padded ISO numeric id from the loaded geometry |
| Position | A `[latitude, longitude]` tuple in degrees |
| Globe unit | A distance relative to a sphere of radius 1 |
| Scene | One timed story step with optional camera, selection and popup changes |
| Ready | Geographic loading, kind construction and shader preparation have completed |
