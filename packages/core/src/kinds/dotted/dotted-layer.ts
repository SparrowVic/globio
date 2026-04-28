import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Points,
  ShaderMaterial,
  Vector3,
  Vector4,
  type Texture,
} from 'three';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { CountryFeature, CountryPolygon } from '../../renderer/country-feature';
import { easeHoverBoost } from './dotted-effects';

export interface CountriesDottedLayerOptions {
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
  readonly flashColor: string;
  readonly flashStrength: number;
  readonly flashDecay: number;
  readonly flashEnabled: boolean;
  readonly driftEnabled: boolean;
  readonly driftAmplitude: number;
  readonly driftSpeed: number;
  readonly driftFreq: number;
  readonly driftAxis: 'ns' | 'ew';
  readonly hoverEnabled: boolean;
  readonly hoverScale: number;
  readonly hoverBrightnessBoost: number;
  readonly hoverDuration: number;
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

  const points: Array<readonly [number, number]> = [];
  for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += density) {
    for (let lng = bbox.minLng; lng <= bbox.maxLng; lng += density) {
      if (!pointInRing(outerS, [lng, lat])) continue;
      let inHole = false;
      for (const hole of holesS) {
        if (pointInRing(hole, [lng, lat])) {
          inHole = true;
          break;
        }
      }
      if (inHole) continue;
      const projLng = lng > 180 ? lng - 360 : lng;
      points.push([projLng, lat] as const);
    }
  }
  return points;
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

const VERT_SHADER = /* glsl */ `
  attribute float aCountryIndex;
  uniform float uPointSize;
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

  varying float vBrightness;
  varying float vFlashStrength;

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

    // Ambient drift wave — bands of equal phase perpendicular to uDriftAxis.
    float driftPhase = dot(dir, uDriftAxis) * uDriftFreq - uDriftSpeed * uTime;
    float driftBrightness = sin(driftPhase) * uDriftAmp;

    // Hover boost — applied when this dot's country matches the active one.
    int idx = int(aCountryIndex + 0.5);
    float hoverActive = (idx == uHoveredCountry) ? uHoverBoost : 0.0;
    float hoverBrightness = hoverActive * uHoverBrightnessBoost;
    float hoverSize = 1.0 + hoverActive * (uHoverScale - 1.0);

    vBrightness = rippleBrightness + driftBrightness + hoverBrightness;

    float fs = 0.0;
    for (int i = 0; i < ${MAX_FLASHES}; i++) {
      if (i == idx) { fs = uFlashStrength[i]; break; }
    }
    vFlashStrength = fs;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPointSize * uPixelRatio * (1.0 / -mv.z) * hoverSize;
  }
`;

const FRAG_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uBaseColor;
  uniform vec3 uFlashColor;
  uniform float uOpacity;
  uniform sampler2D uTexture;
  uniform bool uUseTexture;

  varying float vBrightness;
  varying float vFlashStrength;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    float disc = uUseTexture
      ? texture2D(uTexture, gl_PointCoord).a
      : smoothstep(0.5, 0.0, d);
    if (disc < 0.05) discard;

    vec3 base = uBaseColor * (1.0 + vBrightness);
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
 */
export class CountriesDottedLayer {
  public readonly group: Group;
  private readonly material: ShaderMaterial;
  private readonly geometries: Array<BufferGeometry> = [];
  private readonly texture: Texture | null;
  private readonly countryIndex = new Map<string, number>();
  private readonly flashState: Float32Array;
  private readonly rippleOrigin: Array<Vector4>;
  private readonly activeRipples: Array<ActiveRipple> = [];
  private readonly activeFlashes: Array<ActiveFlash> = [];
  private readonly opts: CountriesDottedLayerOptions;
  private elapsed = 0;
  private hoveredId: string | null = null;
  private hoverBoost = 0;
  private hoverTarget = 0;

  public constructor(options: CountriesDottedLayerOptions) {
    this.opts = options;
    this.group = new Group();
    this.group.name = 'CountriesDottedLayer';
    this.texture = createGlowTexture();
    this.flashState = new Float32Array(MAX_FLASHES);
    this.rippleOrigin = new Array(MAX_RIPPLES).fill(0).map(() => new Vector4());

    const baseColor = new Color(options.color);
    const flashColor = new Color(options.flashColor);
    const driftAxis = options.driftAxis === 'ew' ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
    const driftAmp = options.driftEnabled ? options.driftAmplitude : 0;
    const hoverScale = options.hoverEnabled ? options.hoverScale : 1;
    const hoverBrightnessBoost = options.hoverEnabled ? options.hoverBrightnessBoost : 0;

    this.material = new ShaderMaterial({
      uniforms: {
        uBaseColor: { value: baseColor },
        uFlashColor: { value: flashColor },
        uOpacity: { value: options.opacity },
        uPointSize: { value: options.size * 1000 },
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
      },
      vertexShader: VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.buildPoints(options.features, options.density);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.material.dispose();
    this.texture?.dispose();
    this.group.clear();
  }

  /** Spawn a ripple originating from a globe-local 3D point. */
  public spawnRipple(point3D: Vector3): void {
    if (!this.opts.rippleEnabled) return;
    const origin = point3D.clone().normalize();
    const speed = this.opts.rippleSpeed > 0 ? this.opts.rippleSpeed : 1;
    const duration = Math.min(MAX_GREAT_CIRCLE / speed, 4);
    this.activeRipples.push({ origin, age: 0, duration });
    while (this.activeRipples.length > this.opts.rippleMaxConcurrent) {
      this.activeRipples.shift();
    }
  }

  /** Trigger / refresh a flash on a country (by id). */
  public spawnFlash(countryId: string): void {
    if (!this.opts.flashEnabled) return;
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
   * Set the currently-hovered country. The shader's hover boost eases
   * smoothly toward 1 when set, toward 0 when cleared. Swapping countries
   * snaps the index instantly but preserves the boost value, so the visual
   * fades from old → new without strobing.
   */
  public setHoveredCountry(id: string | null): void {
    if (!this.opts.hoverEnabled) return;
    if (id === this.hoveredId) return;
    this.hoveredId = id;
    if (id === null) {
      this.hoverTarget = 0;
      return;
    }
    const idx = this.countryIndex.get(id);
    if (idx === undefined) {
      this.hoverTarget = 0;
      return;
    }
    this.material.uniforms['uHoveredCountry']!.value = idx;
    this.hoverTarget = 1;
  }

  /** Per-frame tick. Advances ripple/flash ages and writes uniforms. */
  public update(delta: number, elapsedSeconds?: number): void {
    if (typeof elapsedSeconds === 'number') {
      this.elapsed = elapsedSeconds;
    } else {
      this.elapsed += delta;
    }
    this.material.uniforms['uTime']!.value = this.elapsed;

    if (this.opts.hoverEnabled) {
      this.hoverBoost = easeHoverBoost(
        this.hoverBoost,
        this.hoverTarget,
        delta,
        this.opts.hoverDuration > 0 ? this.opts.hoverDuration : 0.25
      );
      this.material.uniforms['uHoverBoost']!.value = this.hoverBoost;
      // When the boost ramps to ~0 with no active hover, drop the index too
      // so a stale match can't flicker if uniforms drift.
      if (this.hoveredId === null && this.hoverBoost < 1e-4) {
        this.material.uniforms['uHoveredCountry']!.value = -1;
        this.hoverBoost = 0;
        this.material.uniforms['uHoverBoost']!.value = 0;
      }
    }

    const speed = this.opts.rippleSpeed > 0 ? this.opts.rippleSpeed : 1;
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
    const decay = this.opts.flashDecay;
    const peak = this.opts.flashStrength;
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

  private buildPoints(
    features: ReadonlyArray<CountryFeature>,
    density: number
  ): void {
    const radius = GLOBE_RADIUS * 1.001;
    let countryIdx = 0;

    for (const feature of features) {
      const positions: Array<number> = [];
      for (const polygon of feature.polygons) {
        const samples = samplePolygonInterior(polygon, density);
        for (const [lng, lat] of samples) {
          const v = latLngToVector3([lat, lng], radius);
          positions.push(v.x, v.y, v.z);
        }
      }
      if (positions.length === 0) continue;

      // Indices past the cap collapse to the last slot; flashes for those
      // countries silently no-op rather than crash. ~250 countries; cap at 96
      // covers the visually-interesting "data-driven" chunk.
      const idxForShader = countryIdx < MAX_FLASHES ? countryIdx : MAX_FLASHES - 1;
      this.countryIndex.set(feature.id, countryIdx);

      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
      const vertCount = positions.length / 3;
      const idxArr = new Float32Array(vertCount);
      idxArr.fill(idxForShader);
      geometry.setAttribute('aCountryIndex', new Float32BufferAttribute(idxArr, 1));
      this.geometries.push(geometry);

      const points = new Points(geometry, this.material);
      points.userData['countryId'] = feature.id;
      this.group.add(points);
      countryIdx++;
    }
  }
}
