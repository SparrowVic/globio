// Cinematic surface — GLSL for the physically-derived, multi-band hero
// shader. The TypeScript layer that owns the material lives in
// `surface.ts`; this file is pure shader source so the two can be read
// (and reviewed) independently.
//
// Per-pixel model, in order of evaluation:
//
//   * Geometry:       spherical → equirectangular atlas UV; tangent frame
//                     (east / north / up) passed from the vertex stage.
//   * Atlases:        land mask + signed coast distance fields, baked
//                     terrain (height / moisture / ridge), city density.
//   * Relief:         height-field slopes perturb the shading normal (or
//                     a tangent-space normal map in texture mode). The
//                     smooth normal still drives the terminator bands so
//                     day/night stays clean.
//   * Biomes:         temperature from latitude + altitude, moisture from
//                     the atlas + coastal boost − subtropical dry belts →
//                     ice / tundra / boreal / temperate / rainforest /
//                     steppe / desert / rock / snow.
//   * Ocean:          Beer–Lambert depth, turquoise shallows and beaches
//                     from the coast field, sea ice near the poles,
//                     wave-perturbed Fresnel sun glint.
//   * Lighting:       key (sun-tinted, cloud-shadowed) / fill / rim,
//                     Rayleigh + Mie atmosphere terms.
//   * Night:          moonlight + moon glint, city emission (density atlas
//                     and optional night map), moonlit ice, aurora.
//   * Output:         exposure + ACES filmic curve applied here; the post
//                     pipeline only bloom/streaks and soft-clips on top.

import { GLSL_CINEMATIC_PRELUDE } from './math';

export const SURFACE_VERTEX_SHADER = /* glsl */ `
  precision highp float;
  uniform vec3 uLightDirection;
  uniform vec3 uMoonDirection;
  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldEast;
  varying vec3 vWorldNorth;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec3 vKeyLocal;
  varying vec3 vMoonLocal;

  // For a pure rotation the inverse is the transpose: dot against columns.
  vec3 toLocal(mat3 m, vec3 v) {
    return vec3(dot(m[0], v), dot(m[1], v), dot(m[2], v));
  }

  void main() {
    vec3 local = normalize(position);
    vLocalNormal = local;
    // Tangent frame on the sphere: east = d/dlng, north = d/dlat.
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), local) + vec3(1e-5, 0.0, 0.0));
    vec3 north = normalize(cross(local, east));
    mat3 m = mat3(modelMatrix);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(m * local);
    vWorldEast = normalize(m * east);
    vWorldNorth = normalize(m * north);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    vKeyLocal = normalize(toLocal(m, normalize(uLightDirection)));
    vMoonLocal = normalize(toLocal(m, normalize(uMoonDirection)));
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const SURFACE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;
  ${GLSL_CINEMATIC_PRELUDE}

  uniform vec3 uOceanColor;
  uniform vec3 uOceanDeepColor;
  uniform vec3 uLandColor;
  uniform vec3 uLandHighColor;
  uniform vec3 uNightColor;
  uniform vec3 uRimColor;
  uniform vec3 uIceColor;
  uniform vec3 uVegetationColor;
  uniform vec3 uDesertColor;
  uniform vec3 uShallowWaterColor;
  uniform vec3 uLightDirection;
  uniform float uLightingMode;
  uniform float uTerminatorSoftness;
  uniform float uTerminatorContrast;
  uniform float uKeyIntensity;
  uniform float uFillIntensity;
  uniform float uRimIntensity;
  uniform float uRimPower;
  uniform float uSpecularIntensity;
  uniform float uOceanSheen;
  uniform float uReliefStrength;
  uniform float uBiomes;
  uniform float uShallows;
  uniform float uSnowLine;
  uniform float uSaturation;
  uniform float uTime;
  uniform float uHorizonGlow;
  uniform float uAtmosphericScatter;
  uniform float uSurfaceMicroDetail;
  uniform float uCityNightResponse;
  uniform float uInteractionEnergy;
  uniform vec3  uInteractionPoint;
  uniform float uInteractionAge;
  uniform float uInteractionRadius;
  uniform float uVisibleCityEnergy;
  uniform float uQuality;
  uniform float uExposure;
  uniform vec3  uSunColor;
  uniform vec3  uMoonDirection;
  uniform vec3  uMoonColor;
  uniform float uMoonlight;
  uniform float uCloudCoverage;
  uniform float uCloudSpeed;
  uniform float uCloudSoftness;
  uniform float uCloudAltitude;
  uniform float uCloudShadowStrength;
  uniform float uAuroraIntensity;
  uniform float uAuroraSpeed;
  uniform float uAuroraLatitude;
  uniform vec3  uAuroraColor;
  uniform vec3  uAuroraTopColor;
  uniform sampler2D uLandAtlas;
  uniform sampler2D uTerrainAtlas;
  uniform sampler2D uDensityAtlas;
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uNormalMap;
  uniform sampler2D uSpecMap;
  uniform sampler2D uCloudMap;
  uniform float uHasDay;
  uniform float uHasNight;
  uniform float uHasNormal;
  uniform float uHasSpec;
  uniform float uHasCloudMap;
  uniform float uTextureMix;
  uniform vec2  uLandTexel;

  varying vec3 vLocalNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldEast;
  varying vec3 vWorldNorth;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  varying vec3 vKeyLocal;
  varying vec3 vMoonLocal;

  const float PI = 3.14159265359;
  const float TWO_PI = 6.28318530718;
  const float HALF_PI = 1.57079632679;

  // Physical-ish constants (perceptual targets, not literally Earth):
  const float OCEAN_F0 = 0.020;          // water reflectance at normal incidence
  const float MIE_G    = 0.78;           // forward-scatter anisotropy for halo
  const float OCEAN_EXTINCTION = 3.6;    // Beer–Lambert "depth absorption" rate

  // Fixed biome swatches. The tunable ones (ice / vegetation / desert /
  // shallow water) come in as uniforms so themes can restyle the planet.
  const vec3 RAINFOREST = vec3(0.14, 0.38, 0.16);
  const vec3 BOREAL     = vec3(0.18, 0.32, 0.19);
  const vec3 TUNDRA     = vec3(0.56, 0.57, 0.47);
  const vec3 STEPPE     = vec3(0.70, 0.63, 0.40);
  const vec3 GRASS      = vec3(0.50, 0.56, 0.27);
  const vec3 ROCK       = vec3(0.48, 0.44, 0.38);
  const vec3 SNOW       = vec3(0.94, 0.96, 1.00);
  const vec3 SAND       = vec3(0.85, 0.77, 0.58);
  const vec3 COAST_GOLD = vec3(1.00, 0.62, 0.28);

  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  // Cloud coverage in the direction dir — procedural field or the
  // optional cloud texture (which must use the same UV convention as
  // the surface).
  float texturedCloudCover(vec3 dir) {
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    float lng = atan(dir.z, -dir.x) - PI;
    if (lng < -PI) lng += TWO_PI;
    lng += uTime * uCloudSpeed * 0.0035;
    vec2 uv = vec2(fract((lng + PI) / TWO_PI), (lat + HALF_PI) / PI);
    // Cloud maps carry a lot of low-value haze; keep the masses, drop the
    // veil so the day map underneath stays readable.
    return smoothstep(0.14, 0.92, texture2D(uCloudMap, uv).r) * 0.9;
  }
  float cloudCoverAt(vec3 dir) {
    // Fully textured ⇒ skip the expensive procedural field entirely.
    if (uHasCloudMap > 0.5 && uTextureMix > 0.999) return texturedCloudCover(dir);
    float procedural = cn_clouds(dir, uTime, uCloudCoverage, uCloudSpeed, uCloudSoftness, uQuality);
    if (uHasCloudMap < 0.5) return procedural;
    return mix(procedural, texturedCloudCover(dir), uTextureMix);
  }

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 east = normalize(vWorldEast);
    vec3 north = normalize(vWorldNorth);
    vec3 local = normalize(vLocalNormal);
    vec3 viewDir = normalize(vViewDir);
    vec3 keyDir = normalize(uLightDirection);
    vec3 moonDir = normalize(uMoonDirection);

    // ── Spherical → atlas UV ────────────────────────────────────────────
    float lat = asin(clamp(local.y, -1.0, 1.0));
    float lng = atan(local.z, -local.x) - PI;
    if (lng < -PI) lng += TWO_PI;
    vec2 uv = vec2((lng + PI) / TWO_PI, (lat + HALF_PI) / PI);
    float cosLat = max(cos(lat), 0.15);

    // ── Atlases ─────────────────────────────────────────────────────────
    vec4 landTex = texture2D(uLandAtlas, uv);
    float landMask = smoothstep(0.42, 0.58, landTex.r);
    float oceanDist = landTex.g;   // 0 at coast → 1 offshore
    float landDist = landTex.b;    // 0 at coast → 1 inland
    vec4 terrain = texture2D(uTerrainAtlas, uv);
    float density = cn_sampleDensity(uDensityAtlas, uv);
    float texMix = uTextureMix;
    if (uHasSpec > 0.5) {
      float texLand = 1.0 - texture2D(uSpecMap, uv).r;
      landMask = mix(landMask, smoothstep(0.35, 0.65, texLand), texMix);
    }

    // ── Lit / view geometry (smooth normal) ─────────────────────────────
    float ndv = max(dot(viewDir, n), 0.0);
    float vdl = dot(viewDir, keyDir);
    cn_TerminatorBands tb = cn_terminator(n, keyDir, uTerminatorSoftness, uTerminatorContrast);

    // ── Relief: height-field slopes → shading normal ────────────────────
    float h = terrain.r;
    float hE = texture2D(uTerrainAtlas, uv + vec2(uLandTexel.x, 0.0)).r;
    float hN = texture2D(uTerrainAtlas, uv + vec2(0.0, uLandTexel.y)).r;
    float relief = uReliefStrength * 5.5;
    float dhE = (hE - h) * relief / cosLat;
    float dhN = (hN - h) * relief;
    vec3 nRelief = normalize(n - east * dhE - north * dhN);
    if (uHasNormal > 0.5) {
      vec3 nm = texture2D(uNormalMap, uv).xyz * 2.0 - 1.0;
      vec3 nTex = normalize(east * nm.x * uReliefStrength + north * nm.y * uReliefStrength + n * max(nm.z, 0.2));
      nRelief = normalize(mix(nRelief, nTex, texMix));
    }
    nRelief = normalize(mix(n, nRelief, landMask));

    // ── Seamless detail noise (3D, on the unit sphere) ─────────────────
    float micro = clamp(uSurfaceMicroDetail, 0.0, 2.5);
    int detailOctaves = uQuality > 1.0 ? 4 : 3;
    float fine = cn_fbm3d(local * (28.0 + micro * 10.0) + 4.0, detailOctaves);
    float grit = cn_fbm3d(local * 70.0 + vec3(2.3, -1.7, 5.1), 2);
    float climate = cn_fbm3d(local * 6.0 + 11.0, 3);

    // ── Biomes ──────────────────────────────────────────────────────────
    float latN = abs(lat) / HALF_PI;
    float T = 1.0 - pow(latN, 1.35) * 1.05 - h * 0.55 + (climate - 0.5) * 0.16;
    float coastal = 1.0 - smoothstep(0.0, 0.5, landDist);
    float dryBelt = 0.38 * exp(-pow((latN - 0.27) / 0.09, 2.0));
    float M = clamp(
      terrain.g * 0.72 + coastal * 0.28 - dryBelt - terrain.b * 0.12 + (fine - 0.5) * 0.08,
      0.0, 1.0
    );
    vec3 warmVeg = mix(uVegetationColor * 1.25, RAINFOREST, smoothstep(0.62, 0.92, T));
    vec3 vegetation = mix(BOREAL, warmVeg, smoothstep(0.18, 0.55, T));
    vec3 arid = mix(TUNDRA, mix(STEPPE, uDesertColor, smoothstep(0.42, 0.78, T)), smoothstep(0.12, 0.4, T));
    vec3 biome = mix(arid, mix(GRASS, vegetation, smoothstep(0.45, 0.7, M)), smoothstep(0.26, 0.62, M));
    float rockiness = smoothstep(0.5, 0.85, h) * (0.35 + 0.65 * terrain.b);
    biome = mix(biome, ROCK, rockiness);
    float snowLine = uSnowLine - (1.0 - T) * 0.42;
    float snowAmt = smoothstep(snowLine - 0.06, snowLine + 0.06, h + (fine - 0.5) * 0.08);
    biome = mix(biome, SNOW, snowAmt);
    float iceCap = smoothstep(0.17, 0.05, T + (climate - 0.5) * 0.10);
    biome = mix(biome, uIceColor, iceCap);
    float beach = smoothstep(0.04, 0.0, landDist) * (1.0 - iceCap) * (1.0 - smoothstep(0.35, 0.6, h));
    biome = mix(biome, SAND, beach * 0.55);

    // Legacy single-colour land (biomes off) keeps the pre-realism look.
    vec3 legacyLand = mix(uLandColor, uLandHighColor, h);
    vec3 land = mix(legacyLand, biome, uBiomes);
    // Theme tint: a fraction of the land colour's hue so presets can
    // still push the palette (sepia, noir) without repainting biomes.
    vec3 tint = uLandColor / max(luma(uLandColor), 0.05);
    land *= mix(vec3(1.0), tint, 0.16 * uBiomes);
    land *= (0.86 + fine * 0.28) * (1.0 + 0.18 * uBiomes);
    land += vec3(0.045, 0.030, 0.018) * grit * 0.35 * clamp(uQuality, 0.65, 1.25);
    // Relief self-shading in the albedo domain: cavities darken slightly
    // even before lighting so valleys read at grazing sun angles.
    land *= 1.0 - clamp((dhE + dhN) * 0.18, -0.12, 0.18);
    if (uHasDay > 0.5) land = mix(land, texture2D(uDayMap, uv).rgb, texMix);

    // ── Ocean: depth, shallows, sea ice, waves ─────────────────────────
    vec3 flowP = local * 9.0 + vec3(uTime * 0.02, -uTime * 0.013, uTime * 0.008);
    float wavesA = cn_fbm3d(flowP, detailOctaves);
    float wavesB = cn_fbm3d(local * 23.0 - flowP * 0.35 + 7.0, 3);
    // Coast field is normalised over ~28 atlas texels (~10° at the
    // equator); real shelves are a fraction of that, so the shallows band
    // uses only the first few texels and deep water starts right after.
    float deep = smoothstep(0.02, 0.22, oceanDist) * (0.72 + 0.28 * cn_fbm3d(local * 3.7 + 1.0, 3));
    vec3 oceanShallowBase = uOceanColor * (0.82 + wavesA * 0.16 + wavesB * 0.05);
    vec3 ocean = cn_oceanDepth(oceanShallowBase, uOceanDeepColor, mix(0.35, 1.0, deep), OCEAN_EXTINCTION);
    float shallow = (1.0 - smoothstep(0.0, 0.075, oceanDist)) * uShallows * (1.0 - landMask);
    ocean = mix(ocean, uShallowWaterColor * (0.8 + wavesA * 0.25), shallow * 0.7);
    float seaIce = smoothstep(0.05, -0.04, T + (climate - 0.5) * 0.12);
    ocean = mix(ocean, uIceColor * 0.92, seaIce * 0.9);
    if (uHasDay > 0.5) ocean = mix(ocean, texture2D(uDayMap, uv).rgb, texMix * 0.85);

    // Wave-perturbed normal for the glint; Schlick Fresnel + tight Blinn
    // lobe (sun) with a broad sheen underneath.
    vec3 nWave = normalize(n + (east * (wavesA - 0.5) + north * (wavesB - 0.5)) * 0.09);
    vec3 halfV = normalize(keyDir + viewDir);
    float ndh = max(dot(nWave, halfV), 0.0);
    float oceanFresnel = cn_fresnel(ndv, OCEAN_F0);
    float glint = pow(ndh, 180.0) * 1.6 + pow(ndh, 32.0) * 0.05;
    vec3 specColor = mix(vec3(1.0), uSunColor, 0.5);
    vec3 oceanSpec = specColor * glint * oceanFresnel * uSpecularIntensity * uOceanSheen
                   * (1.0 - seaIce) * tb.day;

    // Coast warmth: thin gold band exactly along the coastline, popping
    // at sunrise / sunset.
    float coast = exp(-pow(max(oceanDist, landDist) / 0.045, 2.0));
    vec3 coastTint = COAST_GOLD * coast * (0.05 + tb.warmShift * 0.45);

    vec3 base = mix(ocean + oceanSpec, land, landMask) + coastTint;

    // ── Three-light rig with mode trims ─────────────────────────────────
    vec3 fillDir = normalize(vec3(-keyDir.x * 0.65, keyDir.y * 0.30 + 0.18, -keyDir.z * 0.50));
    float heroMode    = 1.0 - step(0.5, abs(uLightingMode - 0.0));
    float naturalMode = 1.0 - step(0.5, abs(uLightingMode - 1.0));
    float eclipseMode = 1.0 - step(0.5, abs(uLightingMode - 2.0));
    float modeKey  = heroMode * 1.10 + naturalMode * 0.90 + eclipseMode * 0.62;
    float modeFill = heroMode * 0.85 + naturalMode * 1.10 + eclipseMode * 0.30;
    float modeRim  = heroMode * 1.55 + naturalMode * 0.82 + eclipseMode * 1.95;

    float ndlRelief = dot(nRelief, keyDir);
    float keyWrap = clamp((ndlRelief + 0.06) / 1.06, 0.0, 1.0);
    float keyLight = keyWrap * uKeyIntensity * modeKey;
    float fillLight = max(dot(nRelief, fillDir), 0.0) * uFillIntensity * modeFill;

    // Cloud shadow: sample the cloud field where the sun ray through
    // this surface point crosses the cloud shell.
    float cloudShadow = 0.0;
    if (uCloudShadowStrength > 0.001 && uQuality > 0.8) {
      float t = uCloudAltitude / max(dot(local, vKeyLocal), 0.25);
      vec3 shadowDir = normalize(local + vKeyLocal * t);
      cloudShadow = cloudCoverAt(shadowDir) * uCloudShadowStrength * tb.day;
    }

    // ── Atmospheric scattering (Rayleigh + Mie) ────────────────────────
    float rayleigh = cn_rayleighPhase(vdl) * tb.day;
    float mie      = cn_miePhase(vdl, MIE_G) * tb.warmShift;
    float rim      = cn_rim(ndv, uRimPower);
    float atmosphereOpticalDepth = pow(1.0 - ndv, 3.2);
    vec3 atmosphereColor = cn_atmosphereTint(tb.day, tb.twilight, tb.warmShift);
    vec3 atmosphere = atmosphereColor * (rayleigh * 0.18 + mie * 0.45) * atmosphereOpticalDepth
                    * uAtmosphericScatter * uHorizonGlow;
    vec3 rimGlow = uRimColor * rim * uRimIntensity * (0.46 + tb.day * 0.4) * modeRim * uHorizonGlow * 0.55;

    vec3 dayColor = base * (0.16 + keyLight * uSunColor * (1.0 - cloudShadow) + fillLight * (0.85 - tb.day * 0.18));
    dayColor += rimGlow * (0.4 + tb.day * 0.6);
    dayColor += atmosphere * (0.7 + tb.day * 0.6);
    // Subtle warmth over visible megacity hubs by day — extremely small,
    // just enough to read "inhabited continents".
    dayColor += vec3(1.0, 0.72, 0.36) * density * landMask * 0.05 * (0.30 + tb.warmShift);

    // ── Night side ─────────────────────────────────────────────────────
    vec3 nightOcean = mix(uNightColor, uOceanDeepColor, 0.34);
    vec3 night = mix(nightOcean * (0.86 + wavesA * 0.08), uNightColor, landMask * 0.42);
    // Moonlight: cool raking fill + a soft glint on open water; ice caps
    // pick it up strongest.
    float moonDiffuse = max(dot(nRelief, moonDir), 0.0);
    vec3 moonAlbedo = mix(ocean * 0.9, land, landMask);
    night += moonAlbedo * uMoonColor * moonDiffuse * 0.16 * uMoonlight;
    night += uIceColor * uMoonColor * moonDiffuse * (iceCap * landMask + seaIce * (1.0 - landMask)) * 0.10 * uMoonlight;
    vec3 moonHalf = normalize(moonDir + viewDir);
    float moonGlint = pow(max(dot(nWave, moonHalf), 0.0), 140.0) * (1.0 - landMask) * (1.0 - seaIce);
    night += uMoonColor * moonGlint * cn_fresnel(ndv, OCEAN_F0) * 0.9 * uMoonlight;
    // City emission: gamma-curved by density so cluster cores burn while
    // outskirts merely glow. Reads as "lights of cities", not as "stains".
    float cityEmit = pow(density, 1.15) * landMask * uCityNightResponse;
    night += vec3(1.0, 0.72, 0.30) * cityEmit * (0.26 + tb.twilight * 0.30);
    if (uHasNight > 0.5) {
      vec3 lights = texture2D(uNightMap, uv).rgb;
      night += lights * vec3(1.0, 0.86, 0.62) * 1.35 * texMix * uCityNightResponse;
    }
    night += vec3(0.30, 0.58, 0.95) * coast * 0.018 * (1.0 - tb.day);   // moonlit coast
    night += rimGlow * 0.32;
    night += atmosphere * 0.22;
    // Aurora curtains, night side only.
    if (uAuroraIntensity > 0.001) {
      vec2 au = cn_aurora(local, uTime, uAuroraSpeed, uAuroraLatitude);
      vec3 auroraColor = mix(uAuroraColor, uAuroraTopColor, au.y);
      night += auroraColor * au.x * uAuroraIntensity * 0.9;
    }

    // ── Composite + terminator-warm wash ───────────────────────────────
    vec3 color = mix(night, dayColor, tb.day);
    color += vec3(1.0, 0.50, 0.22) * tb.warmShift * 0.085 * (0.55 + landMask * 0.45);

    // ── Spatial interaction echo: localised lit Gaussian ───────────────
    if (uInteractionAge < 4.0) {
      vec3 interactionDir = normalize(uInteractionPoint);
      float arc = acos(clamp(dot(local, interactionDir), -1.0, 1.0));
      float intensity = exp(-pow(arc / max(uInteractionRadius, 0.001), 2.0));
      float decay = exp(-uInteractionAge * 0.85);
      color += vec3(1.0, 0.78, 0.42) * intensity * decay * 0.18;
    }
    color += uRimColor * uInteractionEnergy * tb.warmShift * 0.045;
    color += vec3(1.0, 0.72, 0.34) * tb.day * uVisibleCityEnergy * 0.025;

    // ── Output ─────────────────────────────────────────────────────────
    color = mix(vec3(luma(color)), color, uSaturation);
    color = cn_exposeAndTone(color, uExposure);
    gl_FragColor = vec4(color, 1.0);
  }
`;
