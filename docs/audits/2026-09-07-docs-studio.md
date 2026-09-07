# Documentation and Studio accuracy audit

Branch: `cbranch/docs-studio-accuracy`, based on `main` at `ec75390`.

## Public API documentation

- All 548 configuration entries now have descriptions, up from 290. Defaults were checked against kind constructors, shader uniforms, globe defaults, controls and theme tokens.
- Kind documentation now distinguishes actual behavior from declared but unused options. Examples include Dotted's disabled-by-default extras, shared crosshairs on five kinds, Cinematic cloud defaults, atmosphere reset sentinels and construction-only settings.
- The extractor now follows nested named references and inherited members. The reference includes 101 named types instead of 60; `FocusOptions` includes inherited flight settings. Default extraction no longer interprets descriptive phrases as values or truncates token paths at a dot.
- All 141 theme token fields have descriptions, displayed alongside resolved values on the tokens page. Existing deprecated cloud opacity is identified with its supported replacement.
- Public data-layer, scale and story types describe implemented callbacks, animation controls, domain handling and unsupported fields.

Sources: [configuration types](../../packages/core/src/types/globe-config.ts), [kind types](../../packages/core/src/types/kinds.ts), [data-layer types](../../packages/core/src/data-layers/types.ts), [scales](../../packages/core/src/data/scales.ts), [story types](../../packages/core/src/story/types.ts), [theme types](../../packages/core/src/theme/types.ts), [extractor](../../examples/vanilla-demo/scripts/docs-extract.mjs), and [generated reference](../../examples/vanilla-demo/src/docs/generated/api.json).

## Confirmed engine bugs fixed

| Problem | Result |
| --- | --- |
| Omitting optional `countries` skipped country loading and the selected kind's construction. | Mount uses the default country settings and builds the kind. |
| Failed country initialization could still emit `ready`; repeated mount rebuilt the scene. | Failed initialization emits an error without readiness. Repeated mounts and mounts after destruction are ignored; asynchronous destruction is respected. |
| Clearing country data or explicitly removing its layer before `ready` could restore a stale choropleth during initialization. | Queued removals are respected. Clearing country data preserves a queued heatmap, and clearing only the layer preserves the bound country-data map. |
| `setRotation()` was an empty implementation. | Immediate and animated rotation work in globe-local coordinates while preserving camera distance. |
| `project()` ignored axial tilt and treated the whole near hemisphere as visible. | Projection uses the globe transform, the perspective horizon and camera clipping. |
| Zero-duration flights could divide by zero during a zero-delta update. | Non-positive-duration flights jump directly to the requested position. |
| PNG export retained its old camera aspect and could leave the renderer resized after an encoding failure. | Export uses the requested aspect and restores the live camera and renderer in `finally`. Partial, non-finite and non-positive sizes reject explicitly. Dimensions remain logical pixels, multiplied by the renderer's pixel ratio. |
| Repeated story playback could leave multiple timers; empty stories reported playback; delayed movement could occur after completion. Completion callbacks could cancel a newly started story. | Playback is idempotent, empty stories remain stopped, and completed scenes cancel delayed movement. Completion and exit fire once; callbacks can safely replace/replay the story, and explicit replay starts at scene zero. |
| Custom Cinematic data treated a zero city or route limit as unlimited. | Zero limits produce no corresponding city lights or routes. |

Sources: [globe lifecycle](../../packages/core/src/globe/create-globe.ts), [camera methods](../../packages/core/src/globe/camera-methods.ts), [image export](../../packages/core/src/globe/image-export.ts), [controls](../../packages/core/src/interaction/controls.ts), [story controller](../../packages/core/src/story/story-controller.ts), and [Cinematic data](../../packages/core/src/kinds/cinematic/data.ts). Regression tests cover these cases.

## Documentation, search and Studio

- Audited all 60 registered pages and corrected examples with invalid country values, scale fields, surface-event payloads, wrapper instance access and camera options. Compiler tests cover shared and recipe Vanilla/React examples and inline Vue/Angular configuration literals; they also reject the former invalid shapes.
- Corrected support matrices: Outline supports all data-layer types; Dotted supports choropleth, bars, extruded and heatmap; Cinematic supports choropleth and heatmap. Crosshair, country hover and focus exclude Wireframe. Dotted uses dot feedback rather than continuous country borders. Paper's fill is separate from `countries.fill`.
- Expanded heatmap, hexbin, chart, Cinematic and story guides. Corrected claims about pinch zoom, live kind/theme updates, pause semantics, rendering cost, SSR and image capture.
- Fixed missing links and duplicate reference anchors. The new integrity test renders every registered page and checks page links, feature links and every search result against actual section IDs. The initial audit detected 72 duplicate IDs and 29 missing targets.
- Added theme tokens to search, exact-token deep links and canonical feature ranking. Searches for `kind`, `theme`, `markers`, `heatmap`, `story`, `pause`, `resolution` and token names have regression coverage.
- Token rows now wrap long names and values without overlap, use the available width, and highlight hash targets. Hash navigation waits for asynchronously loaded tables; scroll behavior respects reduced motion.
- Of 522 Studio controls, 515 now carry precise references: 466 configuration or array-element paths and 49 public type-field paths for imperative methods, up from 75 configuration paths. Seven Studio-only controls retain contextual explanations. Feature ownership distinguishes crosshair, Cinematic sun and data-layer capabilities. Help cards show the relevant field rather than relying only on a generic kind description.
- Help cards support pointer hover, keyboard focus, activation, Escape and navigation to their documentation links. Failed reference or illustration loading no longer creates an unhandled rejection. Controls expose accessible names and values; disabled groups are also inert to keyboard interaction.
- Added arc-height and sun-mode diagrams, corrected the atmosphere equation illustration, and removed nonessential motion from rotation and focus-pulse diagrams. Framing tips describe vertical framing rather than guaranteeing horizontal fit.
- Fixed Classic mode's incorrectly disabled smooth-zoom control and the Studio Home flight's 1 ms duration.
- Live previews now wait for the core `ready` event before setup. Marker, label, data and selection previews have working setup; recipes clean up listeners and use stable identities.
- Updated landing copy and README to match implemented support. Rebuilt FEATURES as an English catalogue of current capabilities and a separate list of unimplemented roadmap ideas.

Sources: [help cards](../../examples/vanilla-demo/src/components/shared/components/FeatureTip.tsx), [Studio path validation](../../examples/vanilla-demo/src/docs/__tests__/studio-tips.test.ts), [support matrix](../../examples/vanilla-demo/src/docs/kind-support.ts), [search index](../../examples/vanilla-demo/src/docs/search-index.ts), [reference tables](../../examples/vanilla-demo/src/components/docs/reference/ConfigTree.tsx), [live previews](../../examples/vanilla-demo/src/components/docs/preview/LivePreview.tsx), [navigation](../../examples/vanilla-demo/src/routes/Docs.tsx), [link tests](../../examples/vanilla-demo/src/docs/__tests__/links.test.tsx), [snippet tests](../../examples/vanilla-demo/src/docs/__tests__/snippet-types.test.ts), [README](../../README.md), and [feature catalog](../../FEATURES.md).

## Decisions left open

These are documented limitations rather than silently expanded APIs:

1. **Construction changes through `update()`.** Decide whether kind, theme, framing, limits and renderer settings should rebuild automatically, or whether the current recreate-instance contract should become explicit in a narrower update type.
2. **Dormant fields.** Decide whether to implement or deprecate flat mode, Dotted data-color mode, `wireframe.enabled`, unused Cinematic per-item color/speed/phase overrides, heatmap `subdivisions`, and the data-layer manual animation trigger. Their current effects are documented.
3. **Data-layer parity.** Decide whether to implement missing kind decorators and the currently unused callbacks on choropleth, bars, extruded and heatmap. Only hexbin and charts currently handle their own pointer callbacks.
4. **Story and framing semantics.** Story pause suspends automatic scene advancement, not an in-progress camera flight, and resumes with a full scene duration. Rendering pause is separate. Framing uses vertical FOV and can crop narrow containers. Changing these behaviors warrants an explicit API decision.

## Verification

The required checks passed before each commit: `tsc --noEmit` in the demo and all four packages; the complete core and demo Vitest suites; and the demo Vite production build. The final suite contains 348 core tests in 41 files and 31 demo tests in seven files. Additional checks cover rendered documentation links, snippet compilation and the new engine regression cases.

Browser checks cover docs search and token navigation/layout, plus Studio hover cards, keyboard activation, Escape, focus return and disabled controls. Vite still reports the existing large application chunk warning. No dependencies were added and nothing was pushed.

## Commit groups

1. `fix(core): restore globe lifecycle, camera and story behavior`
2. `docs(core): document public options and generate complete API metadata`
3. `fix(core): discard cleared country data queued during startup`
4. `fix(docs): correct examples, support tables and reference navigation`
5. `fix(studio): map controls to API help and improve accessibility`
