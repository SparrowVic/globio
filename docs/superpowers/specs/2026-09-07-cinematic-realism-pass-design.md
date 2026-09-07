# Cinematic Realism Pass — Design Spec

**Date:** 2026-09-07
**Branch:** fix/globe-layer-polish (on top of the uncommitted 2026-05-08 cinematic physics WIP)
**Scope:** `packages/core` cinematic kind + shared renderer post-processing; `examples/vanilla-demo` Studio knobs, presets, hero defaults.
**Status:** approved in chat (2026-09-07). Working file, intentionally not committed — the user holds commits.

## Problem

The `cinematic` kind (introduced 2026-05-08) has a solid reactive engine (shared uniforms,
terminator bands, density atlas, city lights, network, arcs) but the rendered planet still reads
as "shaded sphere with dots": one flat land colour, no relief, no biomes, no ice, a single
Fresnel halo for the atmosphere, clouds baked into the surface shader with no shadows, a static
hand-set light, generic starfield, and no bloom so every bright element is either clipped or
faked with additive halos. The owner's verdict: "nie jest mega kozacki".

## Goals

1. **Filmic Earth with a data layer** — realistic planet (relief, biomes, ice, shallows, clouds
   with shadows, scattering atmosphere, sun, moonlight, aurora) with the existing data accents
   (city lights, network, arcs) as warm glowing highlights. Apple / SpaceX keynote look.
2. **Two modes, one shader** — (a) default fully procedural, zero assets; (b) optional real
   textures (`cinematic.textures`) that upgrade the same scene to photoreal. No new npm
   dependency in either mode (three.js is already the peer dependency).
3. **Real post-processing** — HDR render + bloom + anamorphic streak + grade (vignette,
   chromatic aberration, grain, exposure, ACES). Alpha-preserving (hero and Studio use
   transparent canvases). Opt-in for other kinds, on by default for cinematic.
4. **Sun system** — `fixed` (today), `realtime` (subsolar point from date/time), `orbit`
   (time-lapse). Visible sun disc that blooms when it clears the limb.
5. **Everything live-updatable** through `globe.update({ cinematic, postprocessing })` and
   exposed in Studio Workshop; three new theme presets.
6. **Graceful performance** — `quality: 'auto'` driven by measured FPS; every effect is a
   config switch.

## Non-Goals

- Unit tests (deferred by the owner until the effects are approved).
- Commits / merge (owner decides after review).
- Mobile tuning beyond the auto-quality path.
- Changing other kinds' visuals. They only gain the ability to enable `postprocessing`.
- Bundling three.js into dist (separate decision; today it stays a peer dependency).

## Architecture

```
renderer/
  postfx/pipeline.ts      PostFxPipeline — HDR RT, bloom pyramid, streak, composite/grade
  postfx/shaders.ts       GLSL for bright-pass, dual-Kawase blur, streak, composite
  scene-manager.ts        renderFrame() routes through the pipeline when attached
types/postfx.ts           PostProcessingConfig (top-level GlobeConfig.postprocessing)

kinds/cinematic/
  math.ts                 + GLSL_TERRAIN, GLSL_BIOMES, GLSL_CLOUDS, GLSL_AURORA, GLSL_TANGENT chunks
  atlas.ts                + coast distance field (ocean-side / land-side), baked terrain atlas
                            (height, moisture, ridge mask) via JS FBM
  surface.ts              relief normals, biomes, ice, shallows, moonlight, cloud shadows,
                            aurora band, texture mode, HDR output when postfx is active
  clouds.ts               NEW cloud shell (procedural or texture), lit rims, city glow from below
  atmosphere.ts           REWRITE: single-scattering shell (Rayleigh + Mie, twilight band,
                            night airglow); same public surface as AtmosphereLayer
  sun.ts                  NEW solar math (subsolar point) + CinematicSunController + sun disc
  starfield.ts            REWRITE: magnitude/colour-distributed stars + Milky Way band
  textures.ts             NEW async texture set loader with crossfade
  engine.ts               + FPS EMA for auto quality, + sun/moon direction, + cloud shadow uniforms
  shader-uniforms.ts      + uMoonDirection, uCloudShadow, uReliefStrength, uTextureMix, …
  index.ts                wires clouds / atmosphere / sun / starfield / textures, new setters
theme/                    + tokens for ice / vegetation / desert / shallow / aurora / moon;
                            presets cinematic-day, cinematic-dawn, cinematic-noir
```

### 1. Post-processing pipeline (shared)

`PostFxPipeline` owns:

- **Scene RT** — RGBA `HalfFloatType`, size = canvas × pixelRatio. Cleared with alpha 0 when the
  globe is transparent so page backgrounds keep bleeding through.
- **Bright pass** — soft-knee luminance threshold at `resolutionScale` (default 0.5).
- **Blur pyramid** — 5 levels of dual-Kawase downsample / tent upsample, additive upsample.
- **Streak** — horizontal-only multi-tap blur of the bright pass at ¼ res, slight blue tint.
- **Composite / grade** — `base + bloom·strength + streak·strength`, chromatic aberration
  (radial UV offset per channel), vignette, animated grain, exposure, ACES. **No extra sRGB
  encode** — the existing shaders were tuned as display-ready, and the pipeline must not shift
  their look. Output alpha = `max(base.a, luminance(bloom))` so halos show over the page.
- Resize + pixel-ratio changes rebuild targets; `dispose()` releases them.

`SceneManager` gains `setPostFx(pipeline | null)` and `renderFrame()`; `tick` and `toImage`
both call `renderFrame()`. `create-globe` builds the pipeline when
`config.postprocessing?.enabled ?? (kind === 'cinematic')` and routes `globe.update({
postprocessing })` to `pipeline.setConfig()`.

```ts
interface PostProcessingConfig {
  enabled?: boolean;
  exposure?: number;                       // default 1.0
  resolutionScale?: number;                // bloom chain scale, default 0.5
  bloom?: { enabled?; strength?; threshold?; radius?; softKnee? };
  streak?: { enabled?; strength?; length?; color? };
  vignette?: { enabled?; strength?; softness? };
  chromaticAberration?: { enabled?; strength? };
  grain?: { enabled?; strength? };
}
```

When the pipeline is attached the cinematic surface stops tone-mapping itself
(`uToneMapInShader = 0`) and writes linear HDR; additive layers (city lights, arcs, network,
sun disc) then bloom naturally.

### 2. Surface realism (procedural)

- **Atlas** (`atlas.ts`): land mask (R), ocean-side coast distance (G, 0 at coast → 1 at ≥ 28 px
  offshore), land-side distance (B). Chamfer distance transform, two passes. Plus a baked
  1024×512 terrain atlas: R = height (continent FBM + ridged-noise mountain belts, lowered
  near coasts), G = moisture noise, B = ridge mask. Built once per globe with the JS noise in
  `math.ts`; the shader adds 2–3 octaves of fine detail on top for close-ups.
- **Relief**: normal perturbation from the height atlas (forward differences in the sphere's
  tangent frame; `reliefStrength` knob). Diffuse and specular use the perturbed normal; the
  terminator bands keep the smooth normal so day/night stays clean.
- **Biomes**: temperature `T` from latitude, altitude lapse and noise; moisture `M` from atlas +
  coastal boost − subtropical dry belts. Palette: ice (T low, noisy edge, Antarctica /
  Greenland / high peaks), tundra, boreal, temperate forest / grassland / steppe, rainforest,
  desert, bare rock above the snowline. `landColor` becomes a global tint; new tokens
  `cinematic.iceColor`, `cinematic.vegetationColor`, `cinematic.desertColor`,
  `cinematic.shallowWaterColor`.
- **Ocean**: turquoise shallows and sand from the coast distance field, curl-noise wave normals
  feeding the sun glint, deep-water Beer–Lambert kept.
- **Night**: moonlight (cool diffuse from `uMoonDirection`, opposite-ish the sun, plus ocean moon
  glint), ice caps glowing under moonlight, city emission kept.
- **Aurora**: emissive curtains at |lat| 62–76° (geomagnetic offset) modulated by FBM along
  longitude and time, green core / violet top, night side only, `cinematic.aurora`.

### 3. Cloud shell

`CinematicCloudsLayer` — sphere at `GLOBE_RADIUS · 1.009`, `NormalBlending`, `depthWrite: false`,
renderOrder 3. Coverage = domain-warped FBM + ITCZ equatorial band + curl swirls, animated by
`speed`. Lighting: N·L with the shared terminator, silver-lining forward scatter near the limb,
night side lit faintly by the moon and warmed from below by the density atlas (cities glow
through clouds). Alpha thickens slightly at the limb. Texture mode samples `uCloudMap`.

Cloud shadows: the surface shader evaluates the same `cn_clouds()` chunk at the point displaced
along `-lightDir` by the cloud altitude and darkens the day colour by `shadowStrength`.

### 4. Scattering atmosphere

`CinematicAtmosphereLayer` (front-side shell at `radiusScale`, default 1.075). Per fragment:
ray/shell and ray/planet intersections → path length clipped by the planet, midpoint height →
optical depth; sunlight at the midpoint via the terminator; Rayleigh colour blends to twilight
orange as the sun lowers; Mie forward-scatter halo when looking toward the sun; faint night
airglow; aurora glow at auroral latitudes. AdditiveBlending so the halo shows on transparent
canvases. Keeps the `AtmosphereLayer` public surface (color → tint, intensity → strength,
radiusScale → shell radius, power → falloff steepness, pulse → breathe) so `create-globe`
wiring is untouched; `setWorld()` lets the kind feed light / moon directions.

### 5. Sun system

```ts
sun?: {
  mode?: 'fixed' | 'realtime' | 'orbit';   // default 'fixed'
  direction?: [number, number, number];    // fixed mode (falls back to surface.lightDirection)
  date?: Date | string | number;           // realtime / orbit epoch, default now
  timeScale?: number;                      // realtime speed multiplier, default 1
  speed?: number;                          // orbit: degrees of longitude per second, default 6
  visible?: boolean;                       // sun disc + glare, default true
  color?: string; size?: number;
}
```

`computeSubsolarPoint(date)` → declination + equation of time. `CinematicSunController` turns
the subsolar lat/lng into a globe-local vector, transforms it by `globeGroup` (axis tilt) and
pushes it to `CinematicWorld.setLightDirection` every frame in `realtime` / `orbit` mode.
Sun disc: camera-facing quad far along the light direction (inside the starfield radius),
depth-tested against the planet, HDR core so it blooms; `uSunScreenPosition` also feeds a soft
glare term in the composite pass.

### 6. Starfield

`CinematicStarfieldLayer` keeps the `StarfieldLayerOptions` contract. Stars: exponential
magnitude distribution, temperature classes (blue → white → yellow → orange → red) weighted to
white / yellow, size from magnitude × `sizeVariety`, opt-in twinkle. Milky Way: second sphere
with an FBM band along a tilted great circle, dust lanes, warm dusty tint;
`starfield.milkyWay?: { enabled?, intensity?, tilt? }` (ignored by other kinds).

### 7. Optional textures

```ts
textures?: {
  day?: string | Texture; night?: string | Texture; normal?: string | Texture;
  specular?: string | Texture; clouds?: string | Texture; anisotropy?: number;
}
```

`CinematicTextureSet` loads URLs with `TextureLoader` (sRGB for day / night / clouds, linear for
normal / specular), sets repeat wrap + anisotropy, and drives `uTextureMix` 0 → 1 over 800 ms.
Texture mode: day map = albedo (biomes off), specular map = ocean mask, night map added to
density emission, normal map replaces procedural relief, cloud map replaces procedural clouds
and their shadows. The country atlas still drives coast fields and borders. Demo: the 2k
planet set from the three.js repository (NASA-derived) under
`examples/vanilla-demo/public/textures/earth/`, Studio toggle `Textures: none / Earth 2k`,
download only with the owner's confirmation.

### 8. Presets, Studio, hero, quality

- Presets: `cinematic-night` retuned; new `cinematic-day` (Blue-Marble daylight, side sun),
  `cinematic-dawn` (terminator-centred, warm), `cinematic-noir` (desaturated, high contrast,
  monochrome data accents). Registry `PRESET_DEFAULT_KIND` + demo `KIND_THEMES` swatches.
- Studio Workshop (`presets/cinematic-controls.tsx`, imported by `atmosphere.tsx`): Sun, Clouds,
  Surface realism, Aurora, Textures, Post-processing sections; matching `GlobeSettings` fields,
  defaults and `builders.ts` mapping (`cinematic.*` + top-level `postprocessing`).
- Hero (`HeroCenterStage`) and Studio defaults adopt the new look.
- `quality: 'auto'`: `CinematicWorld` keeps an FPS EMA and maps it to `uQuality` with hysteresis;
  shaders scale noise octaves, the pipeline halves the bloom chain, cloud shadows switch off
  below the low tier.

## Data flow

`GlobeConfig.cinematic` → `cinematicKind.build()` → `CinematicWorld` (per-frame uniforms: light,
moon, camera, time, quality, interaction) → every layer copies the shared block. Sun controller
writes into the world before `world.update`. `globe.update()` → `setCinematicConfig(partial)` →
per-layer setters. `GlobeConfig.postprocessing` → `PostFxPipeline.setConfig`.

## Error handling

- Texture load failure: console.warn once, stay procedural (`uTextureMix` stays 0).
- Half-float render targets unsupported: pipeline falls back to `UnsignedByteType` (LDR bloom).
- Any post-processing failure at construction: warn and render without the pipeline.
- Config sentinels follow the engine convention: `''` colour = theme default, non-positive
  number where the domain is positive = default.

## Verification

Typecheck core + demo, `tsup` build, browser screenshots of landing hero and Studio
(cinematic-night + the three new presets, textures on/off), console clean, HUD FPS ≥ 55 on the
dev machine, transparent hero background intact, `toImage()` returns a bloomed frame, existing
vitest suite still green.

## Implementation phases

1. PostFX pipeline + HDR path + `postprocessing` config.
2. Atlas distance fields + terrain bake; surface relief, biomes, ice, shallows, moonlight.
3. Cloud shell + cloud shadows; scattering atmosphere.
4. Sun controller + sun disc; starfield + Milky Way; aurora.
5. Texture set loader + demo assets (pending confirmation) + Studio toggle.
6. Tokens, presets, Studio knobs, hero defaults, auto quality.
7. Verification pass and report.
