import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Points,
  ShaderMaterial,
  Vector3,
  Vector4,
  type Texture,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryFeature, CountryPolygon } from '../../renderer/country-feature';
import { easeHoverBoost } from './effects';

export interface DottedSurfaceLayerOptions {
  readonly features: ReadonlyArray<CountryFeature>;
  readonly color: string;
  readonly size: number;
  readonly density: number;
  readonly opacity: number;
  readonly rippleBoost: number;
  readonly rippleSpeed: number;
  readonly rippleWidth: number;
  readonly rippleEnabled: boolean;
  readonly rippleMaxConcurrent: number;
  /** Empty string = no override (use brightened base color). */
  readonly rippleColor: string;
  readonly flashColor: string;
  readonly flashStrength: number;
  readonly flashDecay: number;
  readonly flashEnabled: boolean;
  readonly driftEnabled: boolean;
  readonly driftAmplitude: number;
  readonly driftSpeed: number;
  readonly driftFreq: number;
  readonly driftAxis: 'ns' | 'ew' | 'both';
  readonly hoverEnabled: boolean;
  readonly hoverScale: number;
  readonly hoverBrightnessBoost: number;
  readonly hoverDuration: number;
  /** Master appearance overrides. Empty color / non-positive size scale → use base. */
  readonly appearanceColor: string;
  readonly appearanceSizeScale: number;
  readonly appearanceOpacity: number;
  /** Cursor wake — ambient ripple following the cursor. */
  readonly cursorWakeEnabled: boolean;
  readonly cursorWakeAmplitude: number;
  readonly cursorWakeFade: number;
  readonly cursorWakeWidth: number;
  /** Latitude band emphasis. */
  readonly latitudeBandsEnabled: boolean;
  readonly equatorBoost: number;
  readonly tropicsBoost: number;
  readonly latitudeBandWidth: number;
  /** Global pulse breath. */
  readonly pulseBreathEnabled: boolean;
  readonly pulseBreathAmplitude: number;
  readonly pulseBreathSpeed: number;
  /** Constellation hover lines. */
  readonly constellationEnabled: boolean;
  readonly constellationColor: string;
  readonly constellationOpacity: number;
  readonly constellationDistanceFactor: number;
}

interface ActiveRipple {
  readonly origin: Vector3;
  age: number;
  readonly duration: number;
}

interface ActiveFlash {
  readonly countryIndex: number;
  age: number;
}

const MAX_RIPPLES = 6;
// One slot per country. WebGL2 / WebGL1 both guarantee >=256 vertex uniform
// vectors; a flat float[256] uniform fits well within that budget.
const MAX_FLASHES = 256;
const MAX_GREAT_CIRCLE = Math.PI;
const TROPIC_LAT = 23.4366; // degrees — Tropic of Cancer / Capricorn

export const pointInRing = (
  ring: ReadonlyArray<readonly [number, number]>,
  point: readonly [number, number]
): boolean => {
  const [x, y] = point;
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const [xi, yi] = a;
    const [xj, yj] = b;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const ringBBox = (
  ring: ReadonlyArray<readonly [number, number]>
): { minLng: number; maxLng: number; minLat: number; maxLat: number } => {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const p of ring) {
    if (p[0] < minLng) minLng = p[0];
    if (p[0] > maxLng) maxLng = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  return { minLng, maxLng, minLat, maxLat };
};

export const samplePolygonInterior = (
  polygon: CountryPolygon,
  density: number
): Array<readonly [number, number]> => {
  return samplePolygonInteriorWithEdges(polygon, density).map(
    ([lng, lat]) => [lng, lat] as const
  );
};

/**
 * Same grid sampling as {@link samplePolygonInterior} but also tags each
 * dot with whether it sits at the country's boundary — i.e. at least one
 * of its 4-neighbours on the lat/lng grid falls outside the polygon
 * (outside the outer ring or inside a hole). The flag drives the
 * "highlight border dots on hover" effect in the dotted kind: rather
 * than emitting a separate boundary layer at sub-degree spacing (which
 * fights the surface grid visually), we just brighten the existing
 * grid dots that already trace the country edge.
 *
 * Edge detection runs in the *shifted* (anti-meridian-aware) coordinate
 * space so a country like Russia or Fiji that wraps around 180° doesn't
 * get its wrap-line misclassified as edge.
 */
export const samplePolygonInteriorWithEdges = (
  polygon: CountryPolygon,
  density: number
): Array<readonly [number, number, boolean]> => {
  if (polygon.length === 0 || density <= 0) return [];
  const outer = polygon[0];
  if (!outer || outer.length < 3) return [];

  const raw = ringBBox(outer);
  const crossesAnti = raw.maxLng - raw.minLng > 180;

  const shift = (
    ring: ReadonlyArray<readonly [number, number]>
  ): ReadonlyArray<readonly [number, number]> =>
    crossesAnti ? ring.map((p) => [p[0] < 0 ? p[0] + 360 : p[0], p[1]] as const) : ring;

  const outerS = shift(outer);
  const holesS = polygon.slice(1).map(shift);
  const bbox = ringBBox(outerS);

  // Snap the sampling grid to a *global* anchor at (lng=0, lat=0)
  // rather than each country's bbox.minLng/minLat. Per-country origins
  // mean Egypt's 22°N row sits at e.g. 21.99°N while Sudan's row sits
  // at 21.69°N — at the shared border the two grids drift by ~0.3°
  // and the user sees curving streaks where one country's row meets
  // another's. With a single global anchor every country puts dots at
  // the same lat/lng multiples of `density`, so adjacent countries
  // line up across their shared border.
  const startLat = Math.ceil(bbox.minLat / density) * density;
  const startLng = Math.ceil(bbox.minLng / density) * density;

  // First pass — collect interior samples in shifted-coord space and
  // remember which grid cells were filled. The second pass uses this
  // set as an O(1) "is the neighbour also inside?" lookup. Cell keys
  // are absolute grid indices (not bbox-relative) so neighbours from
  // adjacent countries' samplings would collide with this country's
  // — used only intra-country here, but keeping the grid global keeps
  // the math consistent with the snap above.
  const filled = new Set<string>();
  const cellKey = (lng: number, lat: number): string => {
    const i = Math.round(lng / density);
    const j = Math.round(lat / density);
    return `${i}|${j}`;
  };

  const interior: Array<readonly [number, number]> = [];
  for (let lat = startLat; lat <= bbox.maxLat; lat += density) {
    for (let lng = startLng; lng <= bbox.maxLng; lng += density) {
      if (!pointInRing(outerS, [lng, lat])) continue;
      let inHole = false;
      for (const hole of holesS) {
        if (pointInRing(hole, [lng, lat])) {
          inHole = true;
          break;
        }
      }
      if (inHole) continue;
      filled.add(cellKey(lng, lat));
      interior.push([lng, lat] as const);
    }
  }

  const result: Array<readonly [number, number, boolean]> = [];
  for (const [lng, lat] of interior) {
    const isEdge =
      !filled.has(cellKey(lng + density, lat)) ||
      !filled.has(cellKey(lng - density, lat)) ||
      !filled.has(cellKey(lng, lat + density)) ||
      !filled.has(cellKey(lng, lat - density));
    const projLng = lng > 180 ? lng - 360 : lng;
    result.push([projLng, lat, isEdge] as const);
  }
  return result;
};

const createGlowTexture = (): CanvasTexture | null => {
  if (typeof document === 'undefined') return null;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.85)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
};

/**
 * Resolve the drift axis vector from the user's choice.
 * - `'ns'` → Y axis (north-south bands ring around equator).
 * - `'ew'` → Z axis (east-west bands).
 * - `'both'` → a normalized 45° diagonal of Y+Z so the wave reads as a
 *   moving diagonal moiré rather than a strict parallel.
 */
const driftAxisVector = (axis: 'ns' | 'ew' | 'both'): Vector3 => {
  if (axis === 'ew') return new Vector3(0, 0, 1);
  if (axis === 'both') return new Vector3(0, 1, 1).normalize();
  return new Vector3(0, 1, 0);
};

const VERT_SHADER = /* glsl */ `
  attribute float aCountryIndex;
  attribute float aLat;
  // 1.0 if the dot sits at the country's outer / hole boundary (any
  // 4-grid-neighbour falls outside the polygon), 0.0 in the interior.
  // Drives the boundary highlight on hover/active — instead of mounting
  // a separate boundary-dots layer at sub-degree spacing (which fights
  // the surface grid visually), we just brighten the existing surface
  // dots that already trace the country edge.
  attribute float aIsEdge;
  // Per-country tint baked at build time. Defaults to uBaseColor for
  // every dot; flipping uHasPerCountryDotColor to 1.0 makes the shader
  // read this attribute instead, so palette / data modes can paint
  // each country its own colour without separate materials.
  attribute vec3 aDotColor;
  uniform float uPointSize;
  uniform float uSizeScale;
  uniform float uPixelRatio;
  uniform int uRippleCount;
  uniform vec4 uRippleOrigin[${MAX_RIPPLES}];
  uniform float uRippleBoost;
  uniform float uRippleWidth;
  uniform float uFlashStrength[${MAX_FLASHES}];
  uniform float uTime;
  uniform vec3 uDriftAxis;
  uniform float uDriftAmp;
  uniform float uDriftFreq;
  uniform float uDriftSpeed;
  uniform int uHoveredCountry;
  uniform float uHoverBoost;
  uniform float uHoverScale;
  uniform float uHoverBrightnessBoost;
  // Active (pinned) country uniforms. The pinned country's dots take a
  // steady brightness boost plus a slow sin pulse driven by uActivePulse
  // (a normalised -1..1 sine updated per-frame in JS, so the shader
  // stays free of extra trig calls beyond the existing drift wave).
  uniform int uActiveCountry;
  uniform float uActivePulse;
  uniform float uActiveBoost;
  uniform float uActiveScale;
  // Hover / active radial lift — pushes the country's dots a few
  // millimetres outward along the surface normal when hovered or
  // pinned. A signature dotted move: the country reads as "rising
  // out of the field" toward the camera rather than just brightening
  // in place. uHoverLift / uActiveLift are fractions of GLOBE_RADIUS
  // (e.g. 0.008 lifts the dot ~0.8% of the radius outward).
  uniform float uHoverLift;
  uniform float uActiveLift;
  // Edge-dot extras — applied on top of the regular hover/active boost,
  // and only to dots whose aIsEdge is 1.0. Lets the rim of the
  // hovered/pinned country read sharper than the interior without
  // emitting any new geometry.
  uniform float uEdgeBoost;
  uniform float uEdgeLift;
  // Per-country deterministic phase offset for the drift wave. With
  // uPerCountryPhase = 1 the wave's phase is offset per-country by a
  // hash of the country index, so adjacent countries breathe at
  // slightly different times instead of strobing in unison. Keeps
  // the dot field organic. Set to 0 for the original synced drift.
  uniform float uPerCountryPhase;
  uniform vec3 uCursorOrigin;
  uniform float uCursorAge;
  uniform float uCursorAmp;
  uniform float uCursorWidth;
  uniform float uCursorActive;
  uniform float uLatBandEnabled;
  uniform float uEquatorBoost;
  uniform float uTropicBoost;
  uniform float uLatBandWidthRad;
  uniform float uTropicLatRad;
  uniform float uBreathEnabled;
  uniform float uBreathAmp;
  uniform float uBreathSpeed;
  // Dot colouring — uBaseColor is the global default; aDotColor is the
  // per-country tint baked at build time / refreshed by setCountryDot
  // Colors. uHasPerCountryDotColor switches between them so the
  // shared theme path doesn't pay the per-vertex attribute fetch
  // when the user hasn't enabled palette / data dot tinting.
  // uHover/Active dot colours layer on top when the dot belongs to
  // the hovered / pinned country and the corresponding flag is set.
  uniform vec3 uBaseColor;
  uniform float uHasPerCountryDotColor;
  uniform vec3 uHoverDotColor;
  uniform vec3 uActiveDotColor;
  uniform float uUseHoverDotColor;
  uniform float uUseActiveDotColor;

  varying float vBrightness;
  varying float vFlashStrength;
  varying float vRippleBrightness;
  varying vec3 vDotColor;

  void main() {
    vec3 dir = normalize(position);
    float ripple = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      if (i >= uRippleCount) break;
      vec4 r = uRippleOrigin[i];
      float d = acos(clamp(dot(dir, r.xyz), -1.0, 1.0));
      float band = (d - r.w) / max(uRippleWidth, 1e-4);
      ripple += exp(-band * band);
    }
    float rippleBrightness = clamp(ripple, 0.0, 1.0) * uRippleBoost;
    vRippleBrightness = rippleBrightness;

    // Cursor wake — single trailing Gaussian centred on the latest cursor
    // position, fading as uCursorActive decays toward 0.
    float wake = 0.0;
    if (uCursorActive > 0.001) {
      float wd = acos(clamp(dot(dir, uCursorOrigin), -1.0, 1.0));
      float wband = wd / max(uCursorWidth, 1e-4);
      wake = exp(-wband * wband) * uCursorAmp * uCursorActive;
    }

    // Per-country phase offset — hash of country index → 0..2π. With
    // uPerCountryPhase active each country's drift wave is rotated by
    // this constant so adjacent countries breathe at slightly different
    // times. Pure shader noise — no per-vertex attribute needed.
    int idxForPhase = int(aCountryIndex + 0.5);
    float countryHash = fract(sin(float(idxForPhase) * 12.9898) * 43758.5453);
    float countryPhase = uPerCountryPhase * countryHash * 6.2831853;
    // Ambient drift wave — bands of equal phase perpendicular to uDriftAxis.
    float driftPhase = dot(dir, uDriftAxis) * uDriftFreq - uDriftSpeed * uTime + countryPhase;
    float driftBrightness = sin(driftPhase) * uDriftAmp;

    // Hover boost — applied when this dot's country matches the active one.
    int idx = int(aCountryIndex + 0.5);
    float hoverActive = (idx == uHoveredCountry) ? uHoverBoost : 0.0;
    float hoverBrightness = hoverActive * uHoverBrightnessBoost;
    float hoverSize = 1.0 + hoverActive * (uHoverScale - 1.0);

    // Active (pinned) boost — persistent steady brightness + slow pulse on
    // the pinned country's dots. Independent from hover so the user can
    // hover other countries without losing the pinned visual cue.
    float activeMatch = (idx == uActiveCountry) ? 1.0 : 0.0;

    // Dot colour resolution. Default = uBaseColor, then optionally
    // overridden by aDotColor (palette / data per-country tint), then
    // by hover / active colour overrides if the corresponding flag is
    // set. Active wins over hover when both target the same country.
    vec3 baseTint = mix(uBaseColor, aDotColor, uHasPerCountryDotColor);
    vec3 finalTint = baseTint;
    if (uUseActiveDotColor > 0.5 && activeMatch > 0.5) {
      finalTint = uActiveDotColor;
    } else if (uUseHoverDotColor > 0.5 && hoverActive > 0.0) {
      finalTint = uHoverDotColor;
    }
    vDotColor = finalTint;
    // Pulse amplitude: 70% steady + 30% sine ([0..1] envelope).
    float activeEnvelope = 0.7 + 0.3 * uActivePulse;
    float activeBrightness = activeMatch * uActiveBoost * activeEnvelope;
    float activeSizeBoost = activeMatch * (uActiveScale - 1.0) * activeEnvelope;

    // Latitude band emphasis — equator + tropics get a brightness boost
    // proportional to a Gaussian falloff around each parallel. aLat is
    // the dot's latitude in radians, baked at build time.
    float latBoost = 0.0;
    if (uLatBandEnabled > 0.5) {
      float halfW = max(uLatBandWidthRad, 1e-4);
      float eq = exp(-(aLat / halfW) * (aLat / halfW));
      float tn = exp(-((aLat - uTropicLatRad) / halfW) * ((aLat - uTropicLatRad) / halfW));
      float ts = exp(-((aLat + uTropicLatRad) / halfW) * ((aLat + uTropicLatRad) / halfW));
      latBoost = eq * uEquatorBoost + (tn + ts) * uTropicBoost;
    }

    // Pulse breath — whole-field global oscillation. Cheap (no per-vertex
    // cost beyond a single sin) and reads as a planetary inhale/exhale.
    float breath = 0.0;
    if (uBreathEnabled > 0.5) {
      breath = sin(uTime * uBreathSpeed * 6.2831853) * uBreathAmp;
    }

    // Edge-dot extra boost. Both hover and active envelopes contribute,
    // so a country that's hovered AND pinned gets the full sum. aIsEdge
    // gates this to dots actually sitting at the country boundary —
    // interior dots see no edge addition.
    float edgeMix = aIsEdge * (
      hoverActive * uEdgeBoost
      + activeMatch * uEdgeBoost * activeEnvelope
    );

    vBrightness = rippleBrightness + driftBrightness + hoverBrightness
      + activeBrightness + wake + latBoost + breath + edgeMix;

    float fs = 0.0;
    for (int i = 0; i < ${MAX_FLASHES}; i++) {
      if (i == idx) { fs = uFlashStrength[i]; break; }
    }
    vFlashStrength = fs;

    // Radial lift — push hovered / active country's dots outward along
    // the surface normal so the country reads as "rising out of the
    // field" toward the camera. Hover lift eases with the existing
    // hover boost; active lift modulates with the active envelope.
    // Edge dots get an extra micro-lift on top, so the rim sits a
    // hair higher than the interior — reads as a sharp silhouette
    // without changing dot size or count.
    float edgeLiftMix = aIsEdge * (
      hoverActive * uEdgeLift
      + activeMatch * uEdgeLift * activeEnvelope
    );
    float liftScale = 1.0
      + hoverActive * uHoverLift
      + activeMatch * uActiveLift * activeEnvelope
      + edgeLiftMix;
    vec3 lifted = position * liftScale;

    vec4 mv = modelViewMatrix * vec4(lifted, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPointSize * uSizeScale * uPixelRatio * (1.0 / -mv.z)
      * hoverSize * (1.0 + activeSizeBoost);
  }
`;

const FRAG_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uFlashColor;
  uniform vec3 uRippleColor;
  uniform float uUseRippleColor;
  uniform float uOpacity;
  uniform sampler2D uTexture;
  uniform bool uUseTexture;

  varying float vBrightness;
  varying float vFlashStrength;
  varying float vRippleBrightness;
  // Per-vertex dot colour resolved by the vertex stage — already
  // accounts for the base / per-country / hover / active sources.
  varying vec3 vDotColor;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    float disc = uUseTexture
      ? texture2D(uTexture, gl_PointCoord).a
      : smoothstep(0.5, 0.0, d);
    if (disc < 0.05) discard;

    vec3 base = vDotColor * (1.0 + vBrightness);
    // Ripple color override: tint toward uRippleColor by the ripple's own
    // brightness contribution. Lets users dial a "wave color" distinct
    // from the base dot color.
    if (uUseRippleColor > 0.5) {
      float t = clamp(vRippleBrightness, 0.0, 1.0);
      base = mix(base, uRippleColor * (1.0 + vBrightness), t);
    }
    float fs = clamp(vFlashStrength, 0.0, 1.0);
    vec3 mixed = mix(base, uFlashColor, fs);
    vec3 col = mixed * (1.0 + vFlashStrength);
    gl_FragColor = vec4(col, uOpacity * disc);
  }
`;

/**
 * Renders each country as a Points cloud sampled on a regular lat/lng grid
 * inside its polygon. The custom shader computes per-vertex brightness from
 * any active ripples plus a per-country flash term — all on the GPU, so no
 * per-frame attribute uploads even with tens of thousands of dots.
 *
 * Every visual emerges from the same dot field: ripples brighten, flashes
 * recolor, drift waves, latitude bands emphasise parallels, breath
 * oscillates the whole grid, hover rebuilds star-chart constellation
 * lines from nearest-neighbour pairs. No separate borders, no fills —
 * the dots ARE the canvas.
 */
export class DottedSurfaceLayer {
  public readonly group: Group;
  private readonly material: ShaderMaterial;
  private readonly geometries: Array<BufferGeometry> = [];
  private readonly texture: Texture | null;
  private readonly countryIndex = new Map<string, number>();
  /** Per-country dot positions (Vector3, on the same lifted radius), used
   *  to lazily build constellation lines on hover. */
  private readonly countryDots = new Map<string, Array<Vector3>>();
  private readonly flashState: Float32Array;
  private readonly rippleOrigin: Array<Vector4>;
  private readonly activeRipples: Array<ActiveRipple> = [];
  private readonly activeFlashes: Array<ActiveFlash> = [];
  private readonly opts: DottedSurfaceLayerOptions;
  /** Live mutable opts — setters write here so render loop reads latest. */
  private rippleEnabled: boolean;
  private rippleSpeed: number;
  private rippleMaxConcurrent: number;
  private flashEnabled: boolean;
  private flashStrength: number;
  private flashDecay: number;
  private hoverEnabled: boolean;
  private hoverDuration: number;
  private driftEnabled: boolean;
  private driftAmplitude: number;
  private cursorWakeEnabled: boolean;
  private cursorWakeFade: number;
  private elapsed = 0;
  private hoveredId: string | null = null;
  private hoverBoost = 0;
  private hoverTarget = 0;
  /**
   * Active (pinned) country state — independent from hover. The id
   * tracks who's pinned; `activePulseSpeed` drives the per-frame sine
   * so the pinned country's dots breathe gently in/out.
   */
  private activeId: string | null = null;
  private activePulseSpeed = 0.65;
  /** Cursor wake state — origin & age live as uniforms; we just clamp. */
  private cursorAge = Infinity; // > fade → invisible
  private readonly cursorOrigin = new Vector3(1, 0, 0);
  /** Theme-default values cached so reset semantics work. */
  private readonly defaultBaseColor: Color;
  private readonly defaultPointSize: number;
  private readonly defaultOpacity: number;
  /** Constellation lines layer — separate group, shown on hover. */
  private readonly constellationGroup: Group;
  private readonly constellationMaterial: LineBasicMaterial;
  private constellationVisible = false;
  private constellationCurrentId: string | null = null;
  private constellationEnabled: boolean;
  private constellationColorOverride: string;
  private constellationDistanceFactor: number;
  /** Density used at build time — neighbour distance threshold derives from this. */
  private readonly density: number;

  public constructor(options: DottedSurfaceLayerOptions) {
    this.opts = options;
    this.density = options.density;
    this.group = new Group();
    this.group.name = 'DottedSurfaceLayer';
    this.texture = createGlowTexture();
    this.flashState = new Float32Array(MAX_FLASHES);
    this.rippleOrigin = new Array(MAX_RIPPLES).fill(0).map(() => new Vector4());

    this.rippleEnabled = options.rippleEnabled;
    this.rippleSpeed = options.rippleSpeed;
    this.rippleMaxConcurrent = options.rippleMaxConcurrent;
    this.flashEnabled = options.flashEnabled;
    this.flashStrength = options.flashStrength;
    this.flashDecay = options.flashDecay;
    this.hoverEnabled = options.hoverEnabled;
    this.hoverDuration = options.hoverDuration;
    this.driftEnabled = options.driftEnabled;
    this.driftAmplitude = options.driftAmplitude;
    this.cursorWakeEnabled = options.cursorWakeEnabled;
    this.cursorWakeFade = options.cursorWakeFade;
    this.constellationEnabled = options.constellationEnabled;
    this.constellationColorOverride = options.constellationColor;
    this.constellationDistanceFactor = options.constellationDistanceFactor;

    const baseColorHex =
      options.appearanceColor && options.appearanceColor !== ''
        ? options.appearanceColor
        : options.color;
    const baseColor = new Color(baseColorHex);
    this.defaultBaseColor = new Color(options.color);
    this.defaultPointSize = options.size * 1000;
    this.defaultOpacity = options.opacity;

    const flashColor = new Color(options.flashColor);
    const rippleColor = new Color(
      options.rippleColor && options.rippleColor !== ''
        ? options.rippleColor
        : options.color
    );
    const useRippleColor = options.rippleColor && options.rippleColor !== '' ? 1 : 0;
    const driftAxis = driftAxisVector(options.driftAxis);
    const driftAmp = options.driftEnabled ? options.driftAmplitude : 0;
    const hoverScale = options.hoverEnabled ? options.hoverScale : 1;
    const hoverBrightnessBoost = options.hoverEnabled ? options.hoverBrightnessBoost : 0;

    const sizeScale =
      options.appearanceSizeScale > 0 ? options.appearanceSizeScale : 1;
    const opacityNow =
      options.appearanceOpacity > 0 ? options.appearanceOpacity : options.opacity;

    const tropicLatRad = (TROPIC_LAT * Math.PI) / 180;
    const latBandWidthRad = (Math.max(0.1, options.latitudeBandWidth) * Math.PI) / 180;

    this.material = new ShaderMaterial({
      uniforms: {
        uBaseColor: { value: baseColor },
        // Per-country dot tinting — `aDotColor` per-vertex attribute
        // is read when this flag is 1.0; otherwise the shader falls
        // back to `uBaseColor`. Off by default, no perf cost on the
        // theme path.
        uHasPerCountryDotColor: { value: 0 },
        uHoverDotColor: { value: new Color() },
        uActiveDotColor: { value: new Color() },
        uUseHoverDotColor: { value: 0 },
        uUseActiveDotColor: { value: 0 },
        uFlashColor: { value: flashColor },
        uRippleColor: { value: rippleColor },
        uUseRippleColor: { value: useRippleColor },
        uOpacity: { value: opacityNow },
        uPointSize: { value: this.defaultPointSize },
        uSizeScale: { value: sizeScale },
        uPixelRatio: {
          value: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        },
        uRippleCount: { value: 0 },
        uRippleOrigin: { value: this.rippleOrigin },
        uRippleBoost: { value: options.rippleBoost },
        uRippleWidth: { value: options.rippleWidth },
        uFlashStrength: { value: this.flashState },
        uTexture: { value: this.texture },
        uUseTexture: { value: this.texture !== null },
        uTime: { value: 0 },
        uDriftAxis: { value: driftAxis },
        uDriftAmp: { value: driftAmp },
        uDriftFreq: { value: options.driftFreq },
        uDriftSpeed: { value: options.driftSpeed },
        uHoveredCountry: { value: -1 },
        uHoverBoost: { value: 0 },
        uHoverScale: { value: hoverScale },
        uHoverBrightnessBoost: { value: hoverBrightnessBoost },
        uActiveCountry: { value: -1 },
        uActivePulse: { value: 1 },
        // Default active boost / scale chosen so the visual cue reads
        // as "this country is selected" without overpowering hover.
        uActiveBoost: { value: 0.65 },
        uActiveScale: { value: 1.18 },
        // Lift defaults — modest by design so the effect reads as a
        // gentle "rising platform" rather than a hard pop.
        uHoverLift: { value: 0.008 },
        uActiveLift: { value: 0.012 },
        // Edge-dot defaults — boost ~80% of hover/active brightness
        // multiplier reads as a clear rim; lift 50% above the regular
        // hover lift makes the silhouette pop a hair higher than the
        // interior. Both tunable from `dotted.edge.{boost,lift}`.
        uEdgeBoost: { value: 0.55 },
        uEdgeLift: { value: 0.004 },
        // Per-country phase default-on — gives the dot field its
        // organic "every country has its own breath" personality.
        uPerCountryPhase: { value: 1 },
        uCursorOrigin: { value: this.cursorOrigin },
        uCursorAge: { value: 0 },
        uCursorAmp: { value: options.cursorWakeAmplitude },
        uCursorWidth: { value: options.cursorWakeWidth },
        uCursorActive: { value: 0 },
        uLatBandEnabled: { value: options.latitudeBandsEnabled ? 1 : 0 },
        uEquatorBoost: { value: options.equatorBoost },
        uTropicBoost: { value: options.tropicsBoost },
        uLatBandWidthRad: { value: latBandWidthRad },
        uTropicLatRad: { value: tropicLatRad },
        uBreathEnabled: { value: options.pulseBreathEnabled ? 1 : 0 },
        uBreathAmp: { value: options.pulseBreathAmplitude },
        uBreathSpeed: { value: options.pulseBreathSpeed },
      },
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.buildPoints(options.features, options.density);

    // Constellation group sits above the dot field. Single LineBasicMaterial
    // shared across all hovered-country lines — geometry rebuilds in place
    // each hover (small per-country mesh: a few hundred segments at most).
    const constellationColorHex =
      options.constellationColor && options.constellationColor !== ''
        ? options.constellationColor
        : baseColorHex;
    this.constellationMaterial = new LineBasicMaterial({
      color: new Color(constellationColorHex),
      transparent: true,
      opacity: options.constellationOpacity,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.constellationGroup = new Group();
    this.constellationGroup.name = 'CountriesDottedConstellation';
    this.constellationGroup.renderOrder = 12;
    this.constellationGroup.visible = false;
    this.group.add(this.constellationGroup);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.material.dispose();
    this.texture?.dispose();
    this.constellationMaterial.dispose();
    this.disposeConstellationGeometry();
    this.group.clear();
  }

  /** Spawn a ripple originating from a globe-local 3D point. */
  public spawnRipple(point3D: Vector3, ageOffsetSeconds = 0): void {
    if (!this.rippleEnabled) return;
    const origin = point3D.clone().normalize();
    const speed = this.rippleSpeed > 0 ? this.rippleSpeed : 1;
    const duration = Math.min(MAX_GREAT_CIRCLE / speed, 4);
    this.activeRipples.push({
      origin,
      age: Math.max(0, Math.min(duration * 0.9, ageOffsetSeconds)),
      duration,
    });
    while (this.activeRipples.length > this.rippleMaxConcurrent) {
      this.activeRipples.shift();
    }
  }

  /** Trigger / refresh a flash on a country (by id). */
  public spawnFlash(countryId: string): void {
    if (!this.flashEnabled) return;
    const idx = this.countryIndex.get(countryId);
    if (idx === undefined || idx >= MAX_FLASHES) return;
    const existing = this.activeFlashes.find((f) => f.countryIndex === idx);
    if (existing) {
      existing.age = 0;
    } else {
      this.activeFlashes.push({ countryIndex: idx, age: 0 });
    }
  }

  /**
   * Refresh the cursor wake's origin. Each call resets `cursorAge` to 0 so
   * the trailing Gaussian rides the cursor; the per-frame update lets it
   * fade back out over `cursorWakeFade` seconds.
   */
  public setCursorPosition(point3D: Vector3 | null): void {
    if (!this.cursorWakeEnabled || point3D === null) {
      // Don't reset age — let the wake fade naturally if cursor leaves.
      return;
    }
    this.cursorOrigin.copy(point3D).normalize();
    this.cursorAge = 0;
    this.material.uniforms['uCursorOrigin']!.value = this.cursorOrigin;
  }

  /**
   * Read-only access to the country-id → instance-index map. Sibling
   * dotted-kind layers (border dots, future constellation, …) read
   * the same indexing so a single uniform can drive both interior
   * dots and border dots in lockstep.
   */
  public getCountryIndex(): ReadonlyMap<string, number> {
    return this.countryIndex;
  }

  /**
   * Pin a country as "active" — independent from the transient hover.
   * The pinned country's dots get a steady brightness boost + slow
   * sine pulse driven from the per-frame `update()` tick. Pass `null`
   * to clear. Hover continues to work over any country regardless of
   * the active state.
   */
  public setActiveCountry(id: string | null): void {
    if (id === this.activeId) return;
    this.activeId = id;
    if (id === null) {
      this.material.uniforms['uActiveCountry']!.value = -1;
      this.material.uniforms['uActivePulse']!.value = 1;
      return;
    }
    const idx = this.countryIndex.get(id);
    this.material.uniforms['uActiveCountry']!.value = idx === undefined ? -1 : idx;
  }

  /** Adjust the steady brightness boost added to active-country dots. */
  public setActiveBoost(value: number): void {
    this.material.uniforms['uActiveBoost']!.value = value;
  }

  /** Adjust the active-country dot scale multiplier. */
  public setActiveScale(value: number): void {
    this.material.uniforms['uActiveScale']!.value = value;
  }

  /** Active-country sine speed (Hz). Tick happens in update(). */
  public setActivePulseSpeed(value: number): void {
    this.activePulseSpeed = value;
  }

  /** Hover-only radial lift (fraction of GLOBE_RADIUS). 0 disables. */
  public setHoverLift(value: number): void {
    this.material.uniforms['uHoverLift']!.value = value;
  }

  /** Active-only radial lift (fraction of GLOBE_RADIUS). 0 disables. */
  public setActiveLift(value: number): void {
    this.material.uniforms['uActiveLift']!.value = value;
  }

  /**
   * Brightness multiplier added to edge-dots on hover / active. Edge
   * dots are the surface dots whose 4-grid-neighbours include at least
   * one outside-the-country cell — i.e. the dots that already trace
   * the country's silhouette. 0 disables the rim highlight (only the
   * regular hover/active brightness lifts the country).
   */
  public setEdgeBoost(value: number): void {
    this.material.uniforms['uEdgeBoost']!.value = value;
  }

  /**
   * Extra radial lift applied only to edge dots on hover / active
   * (fraction of GLOBE_RADIUS, on top of `uHoverLift`/`uActiveLift`).
   * 0 disables — edge dots ride at the same height as interior.
   */
  public setEdgeLift(value: number): void {
    this.material.uniforms['uEdgeLift']!.value = value;
  }

  /**
   * Toggle the per-country phase offset on the drift wave. When on,
   * each country's drift is rotated by a deterministic hash of its
   * index so adjacent countries don't pulse in unison — keeps the dot
   * field organic. When off, the wave is globally synced.
   */
  public setPerCountryPhase(enabled: boolean): void {
    this.material.uniforms['uPerCountryPhase']!.value = enabled ? 1 : 0;
  }

  /**
   * Set the currently-hovered country. The shader's hover boost eases
   * smoothly toward 1 when set, toward 0 when cleared. Swapping countries
   * snaps the index instantly but preserves the boost value, so the visual
   * fades from old → new without strobing.
   */
  public setHoveredCountry(id: string | null): void {
    if (this.hoverEnabled) {
      if (id !== this.hoveredId) {
        this.hoveredId = id;
        if (id === null) {
          this.hoverTarget = 0;
        } else {
          const idx = this.countryIndex.get(id);
          if (idx === undefined) {
            this.hoverTarget = 0;
          } else {
            this.material.uniforms['uHoveredCountry']!.value = idx;
            this.hoverTarget = 1;
          }
        }
      }
    }
    // Constellation lines run independently of the hover-brightness boost
    // so a user can disable hover dot expansion but keep the lines (or
    // vice versa).
    this.refreshConstellation(id);
  }

  /** Per-frame tick. Advances ripple/flash ages and writes uniforms. */
  public update(delta: number, elapsedSeconds?: number): void {
    if (typeof elapsedSeconds === 'number') {
      this.elapsed = elapsedSeconds;
    } else {
      this.elapsed += delta;
    }
    this.material.uniforms['uTime']!.value = this.elapsed;

    if (this.hoverEnabled) {
      this.hoverBoost = easeHoverBoost(
        this.hoverBoost,
        this.hoverTarget,
        delta,
        this.hoverDuration > 0 ? this.hoverDuration : 0.25
      );
      this.material.uniforms['uHoverBoost']!.value = this.hoverBoost;
      // When the boost ramps to ~0 with no active hover, drop the index too
      // so a stale match can't flicker if uniforms drift.
      if (this.hoveredId === null && this.hoverBoost < 1e-4) {
        this.material.uniforms['uHoveredCountry']!.value = -1;
        this.hoverBoost = 0;
        this.material.uniforms['uHoverBoost']!.value = 0;
      }
    } else {
      // When hover is disabled mid-flight, snap uniforms off so old halos
      // don't linger on the next frame.
      this.material.uniforms['uHoverBoost']!.value = 0;
      this.material.uniforms['uHoveredCountry']!.value = -1;
      this.hoverBoost = 0;
      this.hoverTarget = 0;
    }

    // Active-country pulse — drive uActivePulse with a sine that maps
    // to [0..1] so the shader's envelope stays well-behaved.
    if (this.activeId !== null) {
      const phase = this.elapsed * this.activePulseSpeed * 2 * Math.PI;
      this.material.uniforms['uActivePulse']!.value = 0.5 + 0.5 * Math.sin(phase);
    } else {
      // Idle state — ensure no stale value lingers if id was just cleared.
      this.material.uniforms['uActivePulse']!.value = 1;
    }

    if (this.cursorWakeEnabled) {
      this.cursorAge += delta;
      const fade = this.cursorWakeFade > 0 ? this.cursorWakeFade : 0.45;
      const t = 1 - Math.min(1, this.cursorAge / fade);
      // Quadratic falloff reads softer than linear and keeps the wake from
      // strobing on rapid cursor jitter.
      this.material.uniforms['uCursorActive']!.value = t * t;
    } else {
      this.material.uniforms['uCursorActive']!.value = 0;
    }

    const speed = this.rippleSpeed > 0 ? this.rippleSpeed : 1;
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const r = this.activeRipples[i];
      if (!r) continue;
      r.age += delta;
      if (r.age >= r.duration) this.activeRipples.splice(i, 1);
    }
    const limit = Math.min(this.activeRipples.length, MAX_RIPPLES);
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const slot = this.rippleOrigin[i];
      if (!slot) continue;
      if (i < limit) {
        const r = this.activeRipples[i];
        if (!r) continue;
        slot.set(r.origin.x, r.origin.y, r.origin.z, r.age * speed);
      } else {
        slot.set(0, 0, 0, 0);
      }
    }
    this.material.uniforms['uRippleCount']!.value = limit;

    this.flashState.fill(0);
    const decay = this.flashDecay;
    const peak = this.flashStrength;
    for (let i = this.activeFlashes.length - 1; i >= 0; i--) {
      const f = this.activeFlashes[i];
      if (!f) continue;
      f.age += delta;
      const v = decay > 0 ? peak * Math.exp(-f.age * decay) : peak;
      if (v < 0.01) {
        this.activeFlashes.splice(i, 1);
        continue;
      }
      if (f.countryIndex < MAX_FLASHES) this.flashState[f.countryIndex] = v;
    }
  }

  // ---------------------------------------------------------------------
  // Live setters — every knob the kindHandle can update at runtime.
  // ---------------------------------------------------------------------

  /** Master dot color. Empty string = restore theme default. */
  public setBaseColor(hex: string): void {
    const target = this.material.uniforms['uBaseColor']!.value as Color;
    if (hex === '') target.copy(this.defaultBaseColor);
    else target.set(hex);
    // Constellation defaults to follow the base color when no override —
    // keeps the dot field + lines reading as a single palette unless a
    // user explicitly diverges them.
    if (this.constellationColorOverride === '' || this.constellationColorOverride === undefined) {
      this.constellationMaterial.color.copy(target);
    }
  }

  /** Multiplicative scale on the base point size. */
  public setSizeScale(scale: number): void {
    this.material.uniforms['uSizeScale']!.value = scale > 0 ? scale : 1;
  }

  /** Master opacity. ≤0 = restore theme default. */
  public setOpacity(opacity: number): void {
    this.material.uniforms['uOpacity']!.value = opacity > 0 ? opacity : this.defaultOpacity;
  }

  public setRippleEnabled(enabled: boolean): void {
    this.rippleEnabled = enabled;
    if (!enabled) this.activeRipples.length = 0;
  }

  public setRippleBoost(value: number): void {
    this.material.uniforms['uRippleBoost']!.value = value;
  }

  public setRippleSpeed(value: number): void {
    this.rippleSpeed = value;
  }

  public setRippleWidth(value: number): void {
    this.material.uniforms['uRippleWidth']!.value = value;
  }

  public setRippleMaxConcurrent(value: number): void {
    this.rippleMaxConcurrent = Math.max(1, Math.min(MAX_RIPPLES, value));
    while (this.activeRipples.length > this.rippleMaxConcurrent) {
      this.activeRipples.shift();
    }
  }

  /** Empty string = no override (use base color brightened). */
  public setRippleColor(hex: string): void {
    const useOverride = hex !== '';
    this.material.uniforms['uUseRippleColor']!.value = useOverride ? 1 : 0;
    if (useOverride) {
      const target = this.material.uniforms['uRippleColor']!.value as Color;
      target.set(hex);
    }
  }

  public setFlashEnabled(enabled: boolean): void {
    this.flashEnabled = enabled;
    if (!enabled) this.activeFlashes.length = 0;
  }

  public setFlashStrength(value: number): void {
    this.flashStrength = value;
  }

  public setFlashDecay(value: number): void {
    this.flashDecay = value;
  }

  /** Empty string = restore default flash color from tokens (white-ish). */
  public setFlashColor(hex: string): void {
    const target = this.material.uniforms['uFlashColor']!.value as Color;
    target.set(hex === '' ? this.opts.flashColor : hex);
  }

  public setDriftEnabled(enabled: boolean): void {
    this.driftEnabled = enabled;
    // Toggle by zeroing amplitude — fast and reversible.
    this.material.uniforms['uDriftAmp']!.value = enabled ? this.driftAmplitude : 0;
  }

  public setDriftAmplitude(value: number): void {
    this.driftAmplitude = value;
    if (this.driftEnabled) {
      this.material.uniforms['uDriftAmp']!.value = value;
    }
  }

  public setDriftSpeed(value: number): void {
    this.material.uniforms['uDriftSpeed']!.value = value;
  }

  public setDriftFreq(value: number): void {
    this.material.uniforms['uDriftFreq']!.value = value;
  }

  public setDriftAxis(axis: 'ns' | 'ew' | 'both'): void {
    const v = driftAxisVector(axis);
    (this.material.uniforms['uDriftAxis']!.value as Vector3).copy(v);
  }

  public setHoverEnabled(enabled: boolean): void {
    this.hoverEnabled = enabled;
    if (!enabled) {
      this.hoverBoost = 0;
      this.hoverTarget = 0;
      this.material.uniforms['uHoverBoost']!.value = 0;
      this.material.uniforms['uHoveredCountry']!.value = -1;
    }
  }

  public setHoverScale(scale: number): void {
    this.material.uniforms['uHoverScale']!.value = scale;
  }

  public setHoverBrightnessBoost(boost: number): void {
    this.material.uniforms['uHoverBrightnessBoost']!.value = boost;
  }

  public setHoverDuration(duration: number): void {
    this.hoverDuration = duration;
  }

  public setCursorWakeEnabled(enabled: boolean): void {
    this.cursorWakeEnabled = enabled;
    if (!enabled) this.material.uniforms['uCursorActive']!.value = 0;
  }

  public setCursorWakeAmplitude(value: number): void {
    this.material.uniforms['uCursorAmp']!.value = value;
  }

  public setCursorWakeFade(value: number): void {
    this.cursorWakeFade = value;
  }

  public setCursorWakeWidth(value: number): void {
    this.material.uniforms['uCursorWidth']!.value = value;
  }

  public setLatitudeBandsEnabled(enabled: boolean): void {
    this.material.uniforms['uLatBandEnabled']!.value = enabled ? 1 : 0;
  }

  public setEquatorBoost(value: number): void {
    this.material.uniforms['uEquatorBoost']!.value = value;
  }

  public setTropicsBoost(value: number): void {
    this.material.uniforms['uTropicBoost']!.value = value;
  }

  public setLatitudeBandWidth(deg: number): void {
    const rad = (Math.max(0.1, deg) * Math.PI) / 180;
    this.material.uniforms['uLatBandWidthRad']!.value = rad;
  }

  public setPulseBreathEnabled(enabled: boolean): void {
    this.material.uniforms['uBreathEnabled']!.value = enabled ? 1 : 0;
  }

  public setPulseBreathAmplitude(value: number): void {
    this.material.uniforms['uBreathAmp']!.value = value;
  }

  public setPulseBreathSpeed(value: number): void {
    this.material.uniforms['uBreathSpeed']!.value = value;
  }

  /**
   * Apply per-country dot colours. Pass a map `{ countryId: hex }` and
   * each matching country's dots get the supplied colour; missing
   * ids fall back to the layer's base colour. Switches the shader
   * into `aDotColor` mode (sets `uHasPerCountryDotColor` to 1.0)
   * so the per-vertex attribute is actually consulted. Pass an
   * empty map / call `clearCountryDotColors` to revert.
   */
  public setCountryDotColors(colors: Readonly<Record<string, string>>): void {
    const fallback = this.material.uniforms['uBaseColor']!.value as Color;
    const tmp = new Color();
    let touched = false;
    for (const [id, idx] of this.countryIndex.entries()) {
      const geom = this.geometries[idx];
      if (!geom) continue;
      const attr = geom.getAttribute('aDotColor') as Float32BufferAttribute | null;
      if (!attr) continue;
      const hex = colors[id];
      if (hex !== undefined && hex !== '') tmp.set(hex);
      else tmp.copy(fallback);
      const len = attr.count;
      const arr = attr.array as Float32Array;
      for (let v = 0; v < len; v++) {
        arr[v * 3] = tmp.r;
        arr[v * 3 + 1] = tmp.g;
        arr[v * 3 + 2] = tmp.b;
      }
      attr.needsUpdate = true;
      touched = true;
    }
    if (touched) {
      this.material.uniforms['uHasPerCountryDotColor']!.value = 1;
    }
  }

  /** Reset every dot's colour to the current `uBaseColor` and disable per-country tinting. */
  public clearCountryDotColors(): void {
    this.material.uniforms['uHasPerCountryDotColor']!.value = 0;
  }

  /**
   * Override the hovered country's dot colour. Empty string clears
   * the override (dots fall back to their per-country / base colour).
   */
  public setHoverDotColor(hex: string): void {
    if (hex === '') {
      this.material.uniforms['uUseHoverDotColor']!.value = 0;
      return;
    }
    (this.material.uniforms['uHoverDotColor']!.value as Color).set(hex);
    this.material.uniforms['uUseHoverDotColor']!.value = 1;
  }

  /** Same as `setHoverDotColor`, for the pinned/active slot. Empty string disables. */
  public setActiveDotColor(hex: string): void {
    if (hex === '') {
      this.material.uniforms['uUseActiveDotColor']!.value = 0;
      return;
    }
    (this.material.uniforms['uActiveDotColor']!.value as Color).set(hex);
    this.material.uniforms['uUseActiveDotColor']!.value = 1;
  }

  public setConstellationEnabled(enabled: boolean): void {
    this.constellationEnabled = enabled;
    if (!enabled) this.hideConstellation();
    else if (this.hoveredId !== null) this.refreshConstellation(this.hoveredId);
  }

  /** Empty string = follow the base dot color. */
  public setConstellationColor(hex: string): void {
    this.constellationColorOverride = hex;
    if (hex === '') {
      this.constellationMaterial.color.copy(
        this.material.uniforms['uBaseColor']!.value as Color,
      );
    } else {
      this.constellationMaterial.color.set(hex);
    }
  }

  public setConstellationOpacity(value: number): void {
    this.constellationMaterial.opacity = Math.max(0, Math.min(1, value));
  }

  public setConstellationDistanceFactor(value: number): void {
    this.constellationDistanceFactor = value;
    if (this.constellationVisible && this.constellationCurrentId !== null) {
      // Rebuild current country's lines with the new threshold.
      const id = this.constellationCurrentId;
      this.constellationCurrentId = null; // force refresh
      this.refreshConstellation(id);
    }
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  private buildPoints(
    features: ReadonlyArray<CountryFeature>,
    density: number
  ): void {
    const radius = GLOBE_RADIUS * 1.001;
    let countryIdx = 0;

    for (const feature of features) {
      const positions: Array<number> = [];
      const lats: Array<number> = [];
      const edgeFlags: Array<number> = [];
      const dotCache: Array<Vector3> = [];
      for (const polygon of feature.polygons) {
        const samples = samplePolygonInteriorWithEdges(polygon, density);
        for (const [lng, lat, isEdge] of samples) {
          const v = latLngToVector3([lat, lng], radius);
          positions.push(v.x, v.y, v.z);
          lats.push((lat * Math.PI) / 180);
          edgeFlags.push(isEdge ? 1 : 0);
          dotCache.push(v);
        }
      }
      if (positions.length === 0) continue;

      // Indices past the cap collapse to the last slot; flashes for those
      // countries silently no-op rather than crash. ~250 countries; cap at 96
      // covers the visually-interesting "data-driven" chunk.
      const idxForShader = countryIdx < MAX_FLASHES ? countryIdx : MAX_FLASHES - 1;
      this.countryIndex.set(feature.id, countryIdx);
      this.countryDots.set(feature.id, dotCache);

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      const vertCount = positions.length / 3;
      const idxArr = new Float32Array(vertCount);
      idxArr.fill(idxForShader);
      geometry.setAttribute('aCountryIndex', new Float32BufferAttribute(idxArr, 1));
      geometry.setAttribute('aLat', new Float32BufferAttribute(lats, 1));
      geometry.setAttribute('aIsEdge', new Float32BufferAttribute(edgeFlags, 1));
      // Per-country dot tint — initialised to the base colour. The
      // shader ignores this attribute until uHasPerCountryDotColor
      // is set to 1.0 by setCountryDotColors / palette / data flows.
      const baseHexColor = (this.material.uniforms['uBaseColor']!.value as Color);
      const dotColors = new Float32Array(vertCount * 3);
      for (let v = 0; v < vertCount; v++) {
        dotColors[v * 3] = baseHexColor.r;
        dotColors[v * 3 + 1] = baseHexColor.g;
        dotColors[v * 3 + 2] = baseHexColor.b;
      }
      geometry.setAttribute('aDotColor', new Float32BufferAttribute(dotColors, 3));
      this.geometries.push(geometry);

      const points = new Points(geometry, this.material);
      points.userData['countryId'] = feature.id;
      this.group.add(points);
      countryIdx++;
    }
  }

  /**
   * Rebuild the constellation LineSegments mesh for the hovered country.
   * Connects each dot to neighbours within a configurable multiple of the
   * grid step. The result is a star-chart-like mesh that *visually
   * derives from the dot field itself* — no separate borders, no fills.
   */
  private refreshConstellation(id: string | null): void {
    if (!this.constellationEnabled) {
      this.hideConstellation();
      return;
    }
    if (id === null) {
      this.hideConstellation();
      return;
    }
    if (id === this.constellationCurrentId) return;
    const dots = this.countryDots.get(id);
    if (!dots || dots.length < 2) {
      this.hideConstellation();
      return;
    }

    this.disposeConstellationGeometry();

    // Density is in degrees of lat/lng; convert to chord length on the
    // sphere as a robust threshold. distanceFactor scales it — 1.6 reads
    // as "connect to the immediate ring of grid neighbours".
    const stepRad = (this.density * Math.PI) / 180;
    const chord = 2 * GLOBE_RADIUS * Math.sin(stepRad / 2);
    const threshold = chord * this.constellationDistanceFactor;
    const t2 = threshold * threshold;

    const positions: Array<number> = [];
    const n = dots.length;
    // O(n²) is fine — country dots are typically <= ~3000, and we only
    // rebuild on hover changes (user-initiated, low frequency).
    for (let i = 0; i < n; i++) {
      const a = dots[i];
      if (!a) continue;
      for (let j = i + 1; j < n; j++) {
        const b = dots[j];
        if (!b) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > 0 && d2 <= t2) {
          positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
    if (positions.length === 0) {
      this.hideConstellation();
      return;
    }
    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const mesh = new LineSegments(geom, this.constellationMaterial);
    this.constellationGroup.add(mesh);
    this.constellationGroup.visible = true;
    this.constellationVisible = true;
    this.constellationCurrentId = id;
  }

  private hideConstellation(): void {
    this.disposeConstellationGeometry();
    this.constellationGroup.visible = false;
    this.constellationVisible = false;
    this.constellationCurrentId = null;
  }

  private disposeConstellationGeometry(): void {
    while (this.constellationGroup.children.length > 0) {
      const child = this.constellationGroup.children[0]!;
      const seg = child as LineSegments;
      if (seg.geometry) seg.geometry.dispose();
      this.constellationGroup.remove(child);
    }
  }
}
