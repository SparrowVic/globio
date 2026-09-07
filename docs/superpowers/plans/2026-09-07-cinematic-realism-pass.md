# Cinematic Realism Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `cinematic` globe kind into a filmic, physically-grounded Earth (relief, biomes, ice, clouds with shadows, scattering atmosphere, sun system, aurora, Milky Way, optional real textures) rendered through a new alpha-preserving HDR post-processing pipeline (bloom, streak, grade).

**Architecture:** A shared `PostFxPipeline` in `renderer/postfx` renders the scene to a half-float target and composites bloom/streak/grade back to the canvas. The cinematic kind gains a cloud shell, a scattering atmosphere shell, a sun controller + sun disc, a magnitude-distributed starfield with Milky Way, a baked terrain atlas + coast distance fields, and an optional texture set — all driven by the existing `CinematicWorld` shared-uniform block so every layer reacts to the same light, moon, camera, time and quality signals.

**Tech Stack:** TypeScript strict, Three.js 0.167 (peer dep, WebGL2), GLSL ES 3.00 via ShaderMaterial, tsup, Vite demo (React 18).

**Spec:** `docs/superpowers/specs/2026-09-07-cinematic-realism-pass-design.md`

**Status:** executed 2026-09-07 via subagent-driven development; committed as `58c1072`. Task 3 tokens landed with Task 4, Task 7's wiring and Task 8's config passthrough were done by the controller, the demo assets for Task 10 were downloaded, and the final review's fix wave (sRGB-correct built-ins in the pipeline, texture-set retention, live-update allowlists, quality-gated clouds) is included.

## Global Constraints

- No new npm dependencies in `packages/core` (three.js remains the only peer dependency).
- No unit tests in this pass (owner deferred them); no git commits (owner holds commits).
- Every effect must be a config switch and live-updatable via `globe.update()`.
- Sentinels: `''` colour = theme default; non-positive number where the domain is positive = default.
- Transparent canvases (hero, Studio) must keep working: post-processing preserves alpha.
- The pipeline must not add an sRGB encode — existing shaders are tuned as display-ready.
- Keep files focused: split new GLSL into chunk modules; keep new files under ~600 lines.
- Verify each task with `pnpm exec tsc --noEmit` in `packages/core` (and `examples/vanilla-demo` when the demo changes), then a browser check at http://localhost:5173 (dev server already runs `tsup --watch` + Vite).

---

## File Structure

| File | Responsibility | Owner |
|---|---|---|
| `packages/core/src/types/postfx.ts` (new) | `PostProcessingConfig` | Task 1 |
| `packages/core/src/renderer/postfx/shaders.ts` (new) | GLSL: bright-pass, dual-Kawase down/up, streak, composite/grade | Task 1 |
| `packages/core/src/renderer/postfx/pipeline.ts` (new) | `PostFxPipeline` (targets, passes, render, resize, config, dispose) | Task 1 |
| `packages/core/src/renderer/scene-manager.ts` | `setPostFx()`, `renderFrame()` | Task 1 |
| `packages/core/src/globe/create-globe.ts` | build/attach pipeline, `update({ postprocessing })`, `toImage` via `renderFrame`, `KindBuildContext.atmosphereLayer`, starfield `milkyWay` passthrough | Task 1 |
| `packages/core/src/kinds/types.ts` | `KindBuildContext.atmosphereLayer?` | Task 1 |
| `packages/core/src/types/globe-config.ts`, `types/index.ts` | `postprocessing?` field + export | Task 1 |
| `packages/core/src/kinds/cinematic/noise.ts` (new) | deterministic JS value noise + fbm + ridged | Task 2 |
| `packages/core/src/kinds/cinematic/atlas.ts` | RGBA land atlas (land, oceanDist, landDist) + terrain atlas (height, moisture, ridge) | Task 2 |
| `packages/core/src/types/kinds.ts` | new `CinematicConfig` sections (sun, clouds, aurora, textures, atmosphere, surface realism) | Task 3 |
| `packages/core/src/theme/{types,tokens,presets}.ts` | new tokens + presets | Task 3 / Task 12 |
| `packages/core/src/kinds/cinematic/math.ts` | `GLSL_TANGENT`, `GLSL_TERRAIN`, `GLSL_BIOMES`, `GLSL_CLOUDS`, `GLSL_AURORA` | Task 4 / 5 / 9 |
| `packages/core/src/kinds/cinematic/shader-uniforms.ts` | `uMoonDirection`, `uToneMapInShader`, `uCloudShadow*`, `uReliefStrength`, `uTextureMix`, `uSunColor` | Task 4 |
| `packages/core/src/kinds/cinematic/engine.ts` | moon direction, FPS EMA → auto quality, new setters | Task 4 / 11 |
| `packages/core/src/kinds/cinematic/surface.ts` (+ `surface-shader.ts` new) | relief, biomes, ice, shallows, moonlight, cloud shadows, aurora, texture mode, HDR out | Task 4 / 9 / 10 |
| `packages/core/src/kinds/cinematic/clouds.ts` (new) | cloud shell | Task 5 |
| `packages/core/src/kinds/cinematic/atmosphere.ts` | scattering shell (rewrite) | Task 6 |
| `packages/core/src/kinds/cinematic/sun.ts` (new) | `computeSubsolarPoint`, `CinematicSunController`, `CinematicSunDiscLayer` | Task 7 |
| `packages/core/src/kinds/cinematic/starfield.ts` | stars + Milky Way (rewrite) | Task 8 |
| `packages/core/src/types/atmosphere.ts`, `renderer/starfield-layer.ts` | `StarfieldConfig.milkyWay` + options passthrough | Task 8 |
| `packages/core/src/kinds/cinematic/textures.ts` (new) | `CinematicTextureSet` loader | Task 10 |
| `packages/core/src/kinds/cinematic/index.ts` | wire everything, new setters in `setCinematicConfig` | Task 4–11 |
| `examples/vanilla-demo/src/configurator/{types,defaults,builders}.ts` | new settings + mapping | Task 13 |
| `examples/vanilla-demo/src/components/studio/workshop/presets/cinematic-controls.tsx` (new) | Studio knobs | Task 13 |
| `examples/vanilla-demo/src/components/home/landing/{data/kind-themes.ts,hero/HeroCenterStage.tsx}` | presets + hero defaults | Task 13 |
| `examples/vanilla-demo/public/textures/earth/*` | 2k texture set (download pending owner confirmation) | Task 10 |

---

### Task 1: Post-processing pipeline (shared renderer)

**Files:**
- Create: `packages/core/src/types/postfx.ts`, `packages/core/src/renderer/postfx/shaders.ts`, `packages/core/src/renderer/postfx/pipeline.ts`
- Modify: `packages/core/src/renderer/scene-manager.ts`, `packages/core/src/globe/create-globe.ts`, `packages/core/src/kinds/types.ts`, `packages/core/src/types/globe-config.ts`, `packages/core/src/types/index.ts`, `packages/core/src/index.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PostProcessingConfig {
    readonly enabled?: boolean;
    readonly exposure?: number;            // default 1.0
    readonly resolutionScale?: number;     // bloom chain scale, default 0.5
    readonly bloom?: { readonly enabled?: boolean; readonly strength?: number; readonly threshold?: number; readonly radius?: number; readonly softKnee?: number };
    readonly streak?: { readonly enabled?: boolean; readonly strength?: number; readonly length?: number; readonly color?: string };
    readonly vignette?: { readonly enabled?: boolean; readonly strength?: number; readonly softness?: number };
    readonly chromaticAberration?: { readonly enabled?: boolean; readonly strength?: number };
    readonly grain?: { readonly enabled?: boolean; readonly strength?: number };
  }
  export class PostFxPipeline {
    constructor(opts: { renderer: WebGLRenderer; config?: PostProcessingConfig; transparent: boolean });
    render(scene: Scene, camera: Camera): void;
    setSize(width: number, height: number, pixelRatio: number): void;
    setConfig(partial: PostProcessingConfig): void;
    setQualityScale(scale: number): void;   // 1 = full chain, 0.5 = half chain (auto quality)
    readonly enabled: boolean;
    dispose(): void;
  }
  // SceneManager
  setPostFx(pipeline: PostFxPipeline | null): void;
  renderFrame(): void;   // used by tick() and toImage()
  // KindBuildContext
  readonly atmosphereLayer?: Public<AtmosphereLayer>;
  ```
- Defaults when cinematic enables it: bloom strength 0.55, threshold 0.72, radius 0.6, softKnee 0.5; streak strength 0.22, length 0.55, color `#9fd4ff`; vignette 0.32 / softness 0.45; chromatic 0.0025; grain 0.035; exposure 1.0.

- [x] Step 1: Write `types/postfx.ts` with the config above and export it from `types/index.ts` and `src/index.ts`; add `readonly postprocessing?: PostProcessingConfig` to `GlobeConfig`.
- [x] Step 2: Write `postfx/shaders.ts`: fullscreen vertex; bright pass (`luma = dot(rgb, vec3(.2126,.7152,.0722))`, soft knee `smoothstep(t - knee, t + knee, luma)`); dual-Kawase downsample (13-tap) and upsample (9-tap tent); streak (horizontal 8-tap × 2 iterations at ¼ res); composite: `base + bloom*strength + streak*streakStrength`, chromatic aberration by radial UV offset per channel, vignette `1 - strength*smoothstep(0.35, 1.2, r)`, grain hash noise animated with time, exposure then ACES (Narkowicz), alpha `max(base.a, luma(bloom + streak))`.
- [x] Step 3: Write `postfx/pipeline.ts`: scene RT (`HalfFloatType`, fallback `UnsignedByteType`), 5-level mip chain sized by `resolutionScale × qualityScale`, streak RTs, fullscreen quad (own `OrthographicCamera` + `PlaneGeometry(2,2)`), `render()` = render scene into RT with `renderer.setRenderTarget`, run passes, final pass to `null`; when `enabled === false` just `renderer.render(scene, camera)`.
- [x] Step 4: `scene-manager.ts`: hold `postfx`, `renderFrame()`; `tick` calls `renderFrame()`; `handleResize` and pixel-ratio adjustments call `postfx.setSize(w, h, pixelRatio)`; `destroy` disposes it.
- [x] Step 5: `create-globe.ts`: `const postfxEnabled = config.postprocessing?.enabled ?? (resolvedKind === 'cinematic')`; construct pipeline (try/catch → warn) and `scene.setPostFx(...)`; in `update`: `if (partial.postprocessing !== undefined) { ... pipeline.setConfig(state.config.postprocessing ?? partial.postprocessing) }` creating the pipeline lazily on first enable; `toImage` uses `scene.renderFrame()`; pass `atmosphereLayer` into `kindModule.build({...})`; in `buildStarfieldLayer` add `...(starfield.milkyWay !== undefined && { milkyWay: starfield.milkyWay })` (type comes from Task 8 — until then cast via `as StarfieldLayerOptions`).
- [x] Step 6: `mergeRuntimeConfig` in create-globe: add `assignMergedSection(merged, 'postprocessing', prev.postprocessing, partial.postprocessing)`.
- [x] Step 7: Typecheck core; open http://localhost:5173 — hero globe renders through the pipeline, page background still visible around the globe, city lights bloom.

### Task 2: Atlas distance fields + terrain bake

**Files:**
- Create: `packages/core/src/kinds/cinematic/noise.ts`
- Modify: `packages/core/src/kinds/cinematic/atlas.ts`

**Interfaces:**
- Produces:
  ```ts
  // noise.ts
  export const valueNoise2D(x: number, y: number, seed?: number): number;      // [0,1]
  export const fbm2D(x: number, y: number, octaves: number, seed?: number): number; // [0,1]
  export const ridged2D(x: number, y: number, octaves: number, seed?: number): number; // [0,1], 1 - |2n-1|
  // atlas.ts
  export interface CinematicSurfaceAtlas { landTexture; densityTexture; terrainTexture: Texture; dispose(): void }
  export const LAND_ATLAS_SIZE = { width: 1024, height: 512 } as const;
  export const TERRAIN_ATLAS_SIZE = { width: 1024, height: 512 } as const;
  ```
- Land atlas channels: R = land mask (255/0), G = ocean-side coast distance (0 at coast → 255 at ≥ 28 px), B = land-side distance (same scale), A = 255. Computed with a two-pass chamfer distance transform (3-4 mask) over the mask, wrapping in x.
- Terrain atlas channels: R = height (continent fbm 4 octaves scale 3 + ridged mountains 5 octaves scale 9 × belt mask fbm scale 2.2; multiplied by `landMask` and by `clamp(landDist*1.8, 0.15, 1)` so coasts are low), G = moisture fbm 4 octaves scale 4.5, B = ridge mask, A = 255. Lat/lng sampling in degrees scaled by 1/40 with cos(lat) longitude compression.

- [x] Step 1: Implement `noise.ts` (hash-based value noise, smooth interpolation, deterministic, no `Math.random`).
- [x] Step 2: Extend `buildLandTexture` to produce the RGBA channels; implement `distanceTransform(mask, w, h, maxPx)` with x-wrap.
- [x] Step 3: Implement `buildTerrainTexture(landMask, landDist)` and return it from `buildCinematicSurfaceAtlas`.
- [x] Step 4: Typecheck; time the build (`console.time` in dev, remove after) — must stay under ~250 ms on the dev machine.

### Task 3: Config types + tokens

**Files:**
- Modify: `packages/core/src/types/kinds.ts`, `packages/core/src/theme/types.ts`, `packages/core/src/theme/tokens.ts`, `packages/core/src/types/index.ts`

**Interfaces:** see the `CinematicConfig` additions in `types/kinds.ts` (sun, clouds, aurora, textures, atmosphere, surface realism). New tokens: `cinematic.iceColor` `#dcefff`, `cinematic.vegetationColor` `#2f5a2c`, `cinematic.desertColor` `#c9a266`, `cinematic.shallowWaterColor` `#1f8fa8`, `cinematic.auroraColor` `#4dffa6`, `cinematic.auroraTopColor` `#8d5cff`, `cinematic.moonColor` `#a9c4ff`, `cinematic.sunColor` `#fff1c9`.

- [x] Step 1: Add interfaces + fields to `CinematicConfig`.
- [x] Step 2: Add token names to `TokenName`, `TokenSet`, `DEFAULT_TOKENS`.
- [x] Step 3: Export new types from `types/index.ts` and `src/index.ts`. Typecheck.

### Task 4: Surface realism

**Files:**
- Create: `packages/core/src/kinds/cinematic/surface-shader.ts` (GLSL only)
- Modify: `surface.ts`, `math.ts`, `shader-uniforms.ts`, `engine.ts`, `index.ts`

**Interfaces:**
- `math.ts` chunks: `GLSL_TANGENT` (`cn_tangentFrame(vec3 n, out vec3 east, out vec3 north)`), `GLSL_TERRAIN` (`cn_height(sampler2D terrain, vec2 uv, float detail)`; `cn_reliefNormal(...)`), `GLSL_BIOMES` (`vec3 cn_biome(float T, float M, float h, float ridge, vec3 ice, vec3 veg, vec3 desert, vec3 rock)`).
- Shared uniforms added: `uMoonDirection: Vector3`, `uToneMapInShader: number`, `uReliefStrength`, `uCloudShadowStrength`, `uCloudShadowOffset`, `uCloudCoverage`, `uCloudSpeed`, `uTextureMix`, `uSunColor: Color`.
- Surface layer options gain: `terrainTexture`, `reliefStrength`, `biomes`, `shallows`, `moonlight`, `iceColor`, `vegetationColor`, `desertColor`, `shallowWaterColor`, `snowLine`, plus setters for each.
- `CinematicWorld.setToneMapInShader(flag)`, `setMoonDirection()` derived each frame as `normalize(-light + vec3(0.25, 0.45, -0.2))`.

- [x] Step 1: Move the fragment/vertex GLSL to `surface-shader.ts`; keep `surface.ts` as the layer class.
- [x] Step 2: Relief: sample height at `uv`, `uv + (texel.x, 0)`, `uv + (0, texel.y)`; slopes × `uReliefStrength × 6.0`; perturbed normal for key/fill/specular; smooth normal for terminator.
- [x] Step 3: Biomes: `T = 1.0 - pow(abs(lat)/1.5708, 1.35) - h*0.55 + (moistureNoise-0.5)*0.12`; `M = moisture*0.7 + coastBoost*0.3 - dryBelt`; palette via `cn_biome`; ice where `T < 0.14` with fbm edge; snow above `snowLine`; `uLandColor` as multiplicative tint (`mix(vec3(1), uLandColor/lum(uLandColor), 0.35)`).
- [x] Step 4: Shallows from `oceanDist` (`shallow = 1 - smoothstep(0, 0.32, oceanDist)`), sand from `landDist < 0.05`, wave-normal glint.
- [x] Step 5: Moonlight diffuse + moon glint on night side; ice glow under moon.
- [x] Step 6: HDR path: `if (uToneMapInShader > 0.5) color = cn_exposeAndTone(color, uExposure);`.
- [x] Step 7: Wire in `index.ts` (terrain texture, options from config + tokens, setters in `setCinematicConfig`). Typecheck + browser check.

### Task 5: Cloud shell + shadows

**Files:**
- Create: `packages/core/src/kinds/cinematic/clouds.ts`
- Modify: `math.ts` (`GLSL_CLOUDS`: `float cn_clouds(vec3 dir, float time, float coverage, float speed)`), `surface-shader.ts` (shadow term), `index.ts`

**Interfaces:**
- `CinematicCloudsLayer({ color, coverage, opacity, speed, altitude, shadows, shadowStrength, softness, densityTexture })`, `mesh`, `setWorld`, `update(elapsed)`, setters, `setCloudTexture(texture | null)`, `dispose()`.
- Surface shadow: `float shadow = cn_clouds(normalize(local - keyDirLocal * uCloudShadowOffset), ...)` → `dayColor *= 1.0 - shadow * uCloudShadowStrength`.

- [x] Step 1: `GLSL_CLOUDS` chunk: domain-warped fbm on the unit direction (`p = dir * 3.1`, warp with `cn_curl`), ITCZ band `exp(-pow(lat/0.12, 2)) * 0.25`, coverage remap `smoothstep(1 - coverage, 1.0, n)`.
- [x] Step 2: Cloud shell shader: lit by key with terminator softness, silver lining `pow(1 - ndv, 3) * miePhase`, night: moon 0.08 + city glow from density atlas × warm colour; alpha = coverage × opacity × (0.75 + 0.25 × limb); texture mode via `uCloudMap`.
- [x] Step 3: Surface shadow term gated by `uCloudShadowStrength > 0` and quality.
- [x] Step 4: Wire + setters + `update()` order (`clouds.update` after `surface.update`). Typecheck + browser.

### Task 6: Scattering atmosphere

**Files:**
- Modify: `packages/core/src/kinds/cinematic/atmosphere.ts` (rewrite), `index.ts` (`ctx.atmosphereLayer?.setWorld?.(world)`)

**Interfaces:** keeps `OutlineAtmosphereOptions` constructor + every public method of `AtmosphereLayer`; adds `setWorld(world)`, `setScatter({ scatterStrength, mieStrength, dayColor, twilightColor, nightColor, airglow, thickness })`.

- [x] Step 1: Shell geometry `SphereGeometry(GLOBE_RADIUS * radiusScale, 96, 96)`, `FrontSide`, `AdditiveBlending`, `depthWrite: false`, renderOrder 2.
- [x] Step 2: Fragment: ray-sphere intersections for `R_atm` and `R_planet` in world space (camera position uniform), path length, midpoint altitude → density `exp(-alt/H)`, Rayleigh tint `mix(twilight, day, sunElev)`, Mie halo `cn_miePhase(vdl, 0.76)`, night airglow, aurora glow band; intensity × `uIntensity`, breathe pulse kept.
- [x] Step 3: Wire world (light + moon), typecheck, browser: blue day limb, orange terminator band, dark night limb.

### Task 7: Sun controller + sun disc

**Files:**
- Create: `packages/core/src/kinds/cinematic/sun.ts`
- Modify: `index.ts` (wiring), `engine.ts` (`uSunColor`)

**Interfaces:**
```ts
export const computeSubsolarPoint = (date: Date): { lat: number; lng: number };
export class CinematicSunController {
  constructor(opts: { globeGroup: Object3D; world: CinematicWorld; config?: CinematicSunConfig; fallbackDirection: readonly [number, number, number] });
  setConfig(partial: CinematicSunConfig): void;
  update(delta: number): void;          // writes world.setLightDirection in realtime/orbit
  getDirection(): Vector3;              // world-space unit vector
  getSubsolarPoint(): { lat: number; lng: number } | null;
}
export class CinematicSunDiscLayer {
  constructor(opts: { color: string; size: number; glare: number; distance?: number });
  readonly object: Object3D; setDirection(dir: Vector3): void; setColor/setSize/setGlare/setVisible; update(elapsed): void; dispose(): void;
}
```
- Subsolar: `declination = 23.44° · sin(2π (284 + dayOfYear)/365)`, equation of time (Spencer), `lng = -15 · (UTC hours + eot/60 - 12)`.
- Orbit: `lng -= speed · delta` (degrees/s), lat = declination of `date`.

- [x] Step 1: Implement solar math + controller + disc (camera-facing `PlaneGeometry`, shader with HDR core `4.0`, corona `pow(1-d, 6)`, rays via `cos(atan(uv)*6+time)`, depthTest true).
- [x] Step 2: Wire into `index.ts`: `sun.update(delta)` before `world.update`, disc added to `scene`-level group (via `globeGroup.parent` or the ctx `globeGroup` — disc position in world space, so add to `globeGroup` and set position with inverse group rotation), `setCinematicConfig({ sun })`.
- [x] Step 3: Typecheck + browser: `mode: 'orbit'` sweeps the terminator; disc blooms when it clears the limb.

### Task 8: Starfield + Milky Way

**Files:**
- Modify: `packages/core/src/kinds/cinematic/starfield.ts` (rewrite), `packages/core/src/types/atmosphere.ts`, `packages/core/src/renderer/starfield-layer.ts` (optional `milkyWay` in options)

**Interfaces:** `StarfieldConfig.milkyWay?: { enabled?: boolean; intensity?: number; tilt?: number }`; `CinematicStarfieldLayer` keeps `StarfieldLayerOptions` + `milkyWay` and the `object` / `update` / `setVisible` / `setSize` / `setTwinkle` / `dispose` contract (`object` is a `Group` holding stars + band).

- [x] Step 1: Stars: magnitude `m = -2.5·log10(1 - u)` style exponential (`size = base · (0.35 + 1.4·exp(-1.8·u))`), colour classes weighted [white 0.55, warm 0.25, blue 0.12, orange/red 0.08], deterministic hash seeding, soft disc + tiny cross for the brightest 2 %.
- [x] Step 2: Milky Way band: `SphereGeometry(radius·0.97)` BackSide, fbm band around a great circle tilted `tilt` (default 62°), dust lanes (`1 - smoothstep(0.55, 0.8, fbm)`), warm tint `#d9c9b0`, additive, intensity knob.
- [x] Step 3: Typecheck + browser (Studio → starfield on).

### Task 9: Aurora

**Files:**
- Modify: `math.ts` (`GLSL_AURORA`), `surface-shader.ts`, `atmosphere.ts`, `index.ts`

- [x] Step 1: `float cn_aurora(vec3 dir, float time, float speed, float latCenter)`: geomagnetic tilt (rotate dir by 11° toward lng −72°), band `exp(-pow((abs(lat) - latCenter)/0.07, 2))`, curtains `fbm(vec2(lng·9 + time·speed·0.15, lat·22))` sharpened `pow(n, 3)`.
- [x] Step 2: Surface: `night += mix(auroraColor, auroraTop, verticalNoise) · aurora · intensity · (1 - tb.day)`; atmosphere: same band near the limb.
- [x] Step 3: Config `aurora: { enabled, intensity, color, colorTop, speed, latitude }` wired + setters.

### Task 10: Texture set + texture mode + demo assets

**Files:**
- Create: `packages/core/src/kinds/cinematic/textures.ts`
- Modify: `surface-shader.ts`, `surface.ts`, `clouds.ts`, `index.ts`
- Demo: `examples/vanilla-demo/public/textures/earth/{earth_atmos_2048.jpg, earth_lights_2048.png, earth_normal_2048.jpg, earth_specular_2048.jpg, earth_clouds_1024.png}` (download from `https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/` — only after owner confirmation)

**Interfaces:**
```ts
export class CinematicTextureSet {
  constructor(opts: { onChange: () => void });
  load(config: CinematicTexturesConfig | null): void;   // async, keeps last good set
  readonly day: Texture | null; night; normal; specular; clouds;
  readonly mix: number;   // animated 0→1 by update(delta)
  update(delta: number): void; dispose(): void;
}
```
- Surface uniforms: `uDayMap`, `uNightMap`, `uNormalMap`, `uSpecMap`, `uHasDay`, `uHasNight`, `uHasNormal`, `uHasSpec`, `uTextureMix`; clouds `uCloudMap`, `uHasCloudMap`.

- [x] Step 1: Loader with `TextureLoader`, sRGB for day/night/clouds, `RepeatWrapping`, anisotropy, warn-once on failure.
- [x] Step 2: Surface texture branches: albedo `mix(procedural, dayMap, mix·hasDay)`, ocean mask from spec map, night lights `+ nightMap.rgb · 1.6 · (1 - tb.day)`, normal map perturbation in the tangent frame.
- [x] Step 3: Clouds texture branch + shadows from the same map.
- [x] Step 4: Demo: download set (if confirmed) and expose `cinematicTextures: 'none' | 'earth-2k'` (Task 13 wires the UI).

### Task 11: Auto quality

**Files:**
- Modify: `engine.ts`, `index.ts`, `pipeline.ts` (`setQualityScale`)

- [x] Step 1: `CinematicWorld` keeps `fpsEma` (`ema = mix(ema, 1/delta, 0.05)`), tiers with hysteresis: ≥ 54 → 1.15, 38–54 → 0.9, < 38 → 0.7; only when `quality === 'auto'`.
- [x] Step 2: Shaders read `uQuality`: octave count `int oct = uQuality > 1.0 ? 5 : (uQuality > 0.8 ? 4 : 3)` in fbm loops (`if (i >= oct) break;`), cloud shadows off below 0.8.
- [x] Step 3: `index.ts` forwards the tier to `pipeline.setQualityScale(tier < 0.8 ? 0.5 : 1)` via a callback passed from create-globe (`ctx.onQualityTier?`) — or simpler: the kind handle exposes `getQualityTier()` and create-globe polls it once per second.

### Task 12: Presets

**Files:**
- Modify: `packages/core/src/theme/presets.ts`, `packages/core/src/kinds/registry.ts`, `examples/vanilla-demo/src/components/home/landing/data/kind-themes.ts`

- [x] Step 1: Retune `cinematic-night`; add `cinematic-day` (light `[0.35, 0.42, 0.85]`, key 1.9, rim `#bfe6ff`, city lights 0.9), `cinematic-dawn` (light `[-0.95, 0.18, 0.25]`, terminator softness 0.55, warm rim `#ffc48a`, network `#ffd18a`), `cinematic-noir` (ocean `#050608`, land tint grey, vegetation/desert desaturated, rim `#cfd8e3`, city lights `#fff4d6`, network `#e8eef5`, aurora off).
- [x] Step 2: `ThemePresetName` union + `PRESET_DEFAULT_KIND` + demo swatches.

### Task 13: Studio knobs + hero defaults

**Files:**
- Create: `examples/vanilla-demo/src/components/studio/workshop/presets/cinematic-controls.tsx`
- Modify: `examples/vanilla-demo/src/configurator/{types,defaults,builders}.ts`, `.../presets/atmosphere.tsx` (render `<CinematicControls />` inside the cinematic branch), `.../hero/HeroCenterStage.tsx`

- [x] Step 1: `GlobeSettings` fields: `cinematicSunMode`, `cinematicSunSpeed`, `cinematicSunTimeScale`, `cinematicSunVisible`, `cinematicSunGlare`, `cinematicClouds`, `cinematicCloudCoverage`, `cinematicCloudOpacity`, `cinematicCloudSpeed`, `cinematicCloudShadows`, `cinematicRelief`, `cinematicBiomes`, `cinematicShallows`, `cinematicMoonlight`, `cinematicAurora`, `cinematicAuroraIntensity`, `cinematicScatter`, `cinematicMie`, `cinematicTextures` (`'none' | 'earth-2k'`), `cinematicMilkyWay`, `postfxEnabled`, `postfxExposure`, `postfxBloomStrength`, `postfxBloomThreshold`, `postfxBloomRadius`, `postfxStreak`, `postfxVignette`, `postfxChromatic`, `postfxGrain`.
- [x] Step 2: Defaults + `builders.ts` mapping (`cinematic.*` + top-level `postprocessing` + `starfield.milkyWay`).
- [x] Step 3: Controls component with sections Sun / Clouds / Surface / Aurora / Sky / Textures / Post-processing using `SliderField`, `SwitchField`, `ToggleField`, `ColorField`.
- [x] Step 4: Hero: enable clouds, orbit-free `fixed` sun, textures when available. Typecheck demo + browser.

### Task 14: Verification

- [x] Typecheck core + demo; `pnpm --filter @your-globe/core build`; vitest still green.
- [x] Browser: landing hero (transparent background intact, bloom halo), Studio cinematic-night / day / dawn / noir, textures on/off, sun orbit, console clean, HUD FPS ≥ 55.
- [x] `globe.toImage()` from the console returns a bloomed PNG.
- [x] Report to the owner with screenshots; no commit.
