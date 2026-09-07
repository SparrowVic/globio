import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  Points,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import type {
  StarfieldLayerOptions,
  StarfieldTwinkleOptions,
} from '../../renderer/starfield-layer';

export interface CinematicMilkyWayOptions {
  /** Default true for the cinematic kind. */
  readonly enabled?: boolean;
  /** Overall band brightness multiplier. Default 0.55 (soft glow). */
  readonly intensity?: number;
  /** Galactic plane tilt in degrees relative to the globe's equator. Default 62. */
  readonly tilt?: number;
}

export interface CinematicStarfieldLayerOptions extends StarfieldLayerOptions {
  readonly milkyWay?: CinematicMilkyWayOptions;
}

const DEFAULT_RADIUS = 30;
const DEFAULT_SIZE_VARIETY = 0.5;
const DEFAULT_TWINKLE_INTENSITY = 0.45;
const DEFAULT_TWINKLE_SPEED = 0.55;
const DEFAULT_MILKY_WAY_INTENSITY = 0.55;
const DEFAULT_MILKY_WAY_TILT_DEG = 62;

/**
 * Spectral classes with their share of a real naked-eye sky: mostly white,
 * a quarter warm, a sprinkle of blue-white B/A stars and a few orange/red
 * giants. Weights are cumulative-sampled below.
 */
const STAR_CLASSES: ReadonlyArray<readonly [hex: string, weight: number]> = [
  ['#ffffff', 0.55],
  ['#ffe4b5', 0.25],
  ['#bcd4ff', 0.12],
  ['#ffb07a', 0.08],
];

/** How far each class colour is pulled toward the theme's `starfield.color`. */
const THEME_TINT = 0.35;
/** Fraction of stars that get the 4-point diffraction cross. */
const SPIKE_FRACTION = 0.02;
/**
 * Spiked stars are drawn slightly larger than the magnitude curve alone
 * would give them — the cross is 6 % of the sprite width, so it only
 * resolves once the sprite clears a handful of pixels.
 */
const SPIKE_SIZE_BOOST = 1.5;

const STAR_VERTEX_SHADER = `
attribute float aPhase;
attribute float aSizeScale;
attribute vec3 aColor;
attribute float aSpike;
uniform float uTime;
uniform float uBaseSize;
uniform float uTwinkleIntensity;
uniform float uTwinkleSpeed;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
varying float vSpike;
void main() {
  // Same twinkle contract as the shared StarfieldLayer: per-star sinusoid
  // with a deterministic phase. Intensity 0 ⇒ constant brightness.
  float wave = sin(uTime * uTwinkleSpeed * 6.28318 + aPhase);
  float brightness = 1.0 - uTwinkleIntensity * 0.5 * (1.0 - wave);
  vColor = aColor;
  vAlpha = brightness;
  vSpike = aSpike;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uBaseSize * aSizeScale * uPixelRatio;
}
`;

const STAR_FRAGMENT_SHADER = `
varying vec3 vColor;
varying float vAlpha;
varying float vSpike;
void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  // Soft disc with a tighter, brighter core — the core keeps small stars
  // from dissolving into mush once the disc falloff eats the outer pixels.
  float disc = smoothstep(0.5, 0.1, d);
  float core = smoothstep(0.17, 0.0, d);
  float mask = max(disc * 0.8, core);
  if (vSpike > 0.5) {
    float vertical = smoothstep(0.03, 0.0, abs(uv.x)) * smoothstep(0.5, 0.05, abs(uv.y));
    float horizontal = smoothstep(0.03, 0.0, abs(uv.y)) * smoothstep(0.5, 0.05, abs(uv.x));
    mask = max(mask, max(vertical, horizontal) * 0.35);
  }
  if (mask <= 0.001) discard;
  gl_FragColor = vec4(vColor * vAlpha, mask * vAlpha);
}
`;

const BAND_VERTEX_SHADER = `
varying vec3 vDir;
void main() {
  // Local direction, so the band is defined in the shell's own frame and
  // stays put while the camera orbits.
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const BAND_FRAGMENT_SHADER = `
uniform float uIntensity;
uniform float uTilt;
uniform vec3 uWarm;
uniform vec3 uCool;
varying vec3 vDir;

// Hash / value noise / 4-octave fbm. Cheap enough for a full-screen shell
// and deterministic, so the galaxy is the same on every reload.
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * valueNoise(p);
    p *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  // Rotate into galactic coordinates: tilt around X, then a fixed 25° yaw
  // so the band never lines up with the globe's own axis.
  float ct = cos(uTilt);
  float st = sin(uTilt);
  vec3 r = vec3(vDir.x, vDir.y * ct - vDir.z * st, vDir.y * st + vDir.z * ct);
  float cy = cos(0.43633);
  float sy = sin(0.43633);
  r = vec3(r.x * cy + r.z * sy, r.y, -r.x * sy + r.z * cy);

  float bandLat = asin(clamp(r.y, -1.0, 1.0));
  float bandLng = atan(r.z, r.x);

  // Gaussian falloff away from the galactic plane.
  float band = exp(-pow(bandLat / 0.22, 2.0));
  if (band < 0.002) discard;

  float clouds = fbm(vec2(bandLng * 3.0, bandLat * 9.0));
  // Galactic core: a broad brightening on one side of the sky.
  float core = exp(-pow((bandLng - 0.6) / 0.9, 2.0)) * 0.6;
  // Dark dust lanes cutting across the brightest parts.
  float dust = 1.0 - 0.75 * smoothstep(0.5, 0.78, fbm(vec2(bandLng * 6.0 + 3.1, bandLat * 14.0)));

  float intensity = band * (clouds + core) * dust;
  // Sparse unresolved stars inside the band. Cell-quantised so the speckle
  // is stable under camera motion rather than per-pixel fizz.
  float speckle = step(0.995, hash21(floor(r.xy * 400.0)));
  intensity += speckle * band * dust * 0.35;

  vec3 tint = mix(uWarm, uCool, smoothstep(0.3, 0.85, intensity));
  float lum = intensity * uIntensity;
  if (lum <= 0.001) discard;
  gl_FragColor = vec4(tint * lum, lum);
}
`;

/**
 * Cinematic night sky: a deterministic magnitude-weighted star cloud plus a
 * soft Milky Way band on a slightly smaller inward-facing shell.
 *
 * Structure — `object` is the `Points` cloud (the kind registry types the
 * layer's `object` as `Points`), and the band mesh rides along as its child
 * so a single `scene.add(layer.object)` mounts both and `setVisible()`
 * hides both.
 *
 * Everything random is derived from an integer hash of the star index, so
 * the sky is byte-identical across rebuilds (config edits in the studio
 * don't reshuffle the constellations).
 */
export class CinematicStarfieldLayer {
  public readonly object: Points;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly bandGeometry: SphereGeometry;
  private readonly bandMaterial: ShaderMaterial;
  private readonly bandMesh: Mesh;
  // Mutable so setTwinkle() can flip it live — drives the time-uniform
  // accumulation in update() and the intensity-zeroing that freezes the
  // field when twinkle is off.
  private twinkleEnabled: boolean;
  private milkyWayEnabled: boolean;

  public constructor(options: CinematicStarfieldLayerOptions) {
    const radius = options.radius ?? DEFAULT_RADIUS;
    const sizeVariety = clamp01(options.sizeVariety ?? DEFAULT_SIZE_VARIETY);
    const twinkle = options.twinkle;
    this.twinkleEnabled = twinkle?.enabled ?? false;

    const count = Math.max(0, Math.floor(options.count));
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizeScales = new Float32Array(count);
    const spikes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const palette = options.palette && options.palette.length > 0 ? options.palette : null;
    const paletteColors = palette ? palette.map((hex) => new Color(hex)) : null;
    const classColors = STAR_CLASSES.map(([hex]) => new Color(hex));
    const themeColor = new Color(options.color);
    const tmpColor = new Color();

    for (let i = 0; i < count; i++) {
      // Uniform sphere sampling (inverse CDF on cos φ so poles don't clump).
      const theta = hash01(i * 8 + 1) * Math.PI * 2;
      const cosPhi = 2 * hash01(i * 8 + 2) - 1;
      const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
      positions[i * 3] = radius * sinPhi * Math.cos(theta);
      positions[i * 3 + 1] = radius * cosPhi;
      positions[i * 3 + 2] = radius * sinPhi * Math.sin(theta);

      // Magnitude-like distribution: most stars faint, a long thin tail of
      // bright ones. u ~ U(0,1) ⇒ b = exp(-1.8u) ∈ (0.165, 1].
      const u = hash01(i * 8 + 3);
      const brightness = Math.exp(-1.8 * u);
      const jitter = 1 + (hash01(i * 8 + 4) * 2 - 1) * sizeVariety;
      const spiked = u < SPIKE_FRACTION;
      spikes[i] = spiked ? 1 : 0;
      sizeScales[i] =
        (0.35 + 1.4 * brightness) * jitter * (spiked ? SPIKE_SIZE_BOOST : 1);

      phases[i] = hash01(i * 8 + 5) * Math.PI * 2;

      const pick = hash01(i * 8 + 6);
      if (paletteColors) {
        // A caller-supplied palette wins over the spectral classes — the
        // theme author has already decided what the sky should look like.
        const index = Math.min(paletteColors.length - 1, Math.floor(pick * paletteColors.length));
        tmpColor.copy(paletteColors[index] ?? paletteColors[0]!);
      } else {
        tmpColor.copy(classColors[pickClass(pick)] ?? classColors[0]!);
        tmpColor.lerp(themeColor, THEME_TINT);
      }
      // Faint stars are dimmer as well as smaller, otherwise the field
      // reads as one uniform sheet of white pinpricks.
      tmpColor.multiplyScalar(0.55 + 0.45 * brightness);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
    this.geometry.setAttribute('aSizeScale', new BufferAttribute(sizeScales, 1));
    this.geometry.setAttribute('aSpike', new BufferAttribute(spikes, 1));
    this.geometry.setAttribute('aColor', new BufferAttribute(colors, 3));

    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseSize: { value: options.size },
        uTwinkleIntensity: {
          value: this.twinkleEnabled ? clamp01(twinkle?.intensity ?? DEFAULT_TWINKLE_INTENSITY) : 0,
        },
        uTwinkleSpeed: { value: twinkle?.speed ?? DEFAULT_TWINKLE_SPEED },
        uPixelRatio: {
          value: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        },
      },
      vertexShader: STAR_VERTEX_SHADER,
      fragmentShader: STAR_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.object = new Points(this.geometry, this.material);
    this.object.frustumCulled = false;

    const milkyWay = options.milkyWay;
    this.milkyWayEnabled = milkyWay?.enabled ?? true;
    this.bandGeometry = new SphereGeometry(radius * 0.97, 48, 32);
    this.bandMaterial = new ShaderMaterial({
      uniforms: {
        uIntensity: { value: Math.max(0, milkyWay?.intensity ?? DEFAULT_MILKY_WAY_INTENSITY) },
        uTilt: { value: degToRad(milkyWay?.tilt ?? DEFAULT_MILKY_WAY_TILT_DEG) },
        uWarm: { value: new Color('#d9c9b0') },
        uCool: { value: new Color('#c8d6ec') },
      },
      vertexShader: BAND_VERTEX_SHADER,
      fragmentShader: BAND_FRAGMENT_SHADER,
      side: BackSide,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.bandMesh = new Mesh(this.bandGeometry, this.bandMaterial);
    this.bandMesh.frustumCulled = false;
    this.bandMesh.visible = this.milkyWayEnabled;
    this.object.add(this.bandMesh);
  }

  /**
   * Tick the twinkle clock. No-op when twinkle is off — the band is static
   * by design, so nothing else needs a per-frame update.
   */
  public update(delta: number): void {
    if (!this.twinkleEnabled) return;
    const uniform = this.material.uniforms['uTime'];
    if (uniform) uniform.value += delta;
  }

  /** Toggle stars + band together (cheap `Object3D.visible` flip). */
  public setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  /**
   * Live update for the base star size uniform. Per-star magnitude scaling
   * lives in `aSizeScale`, so only the global multiplier shifts.
   */
  public setSize(size: number): void {
    const uniform = this.material.uniforms['uBaseSize'];
    if (uniform) uniform.value = size;
  }

  /**
   * Live update for the twinkle config — same contract as the shared
   * `StarfieldLayer`. Disabling zeroes the intensity uniform so the shader
   * produces a constant brightness (static stars). `null` restores the
   * defaults (intensity 0.45, speed 0.55, disabled).
   */
  public setTwinkle(twinkle: StarfieldTwinkleOptions | null): void {
    const enabled = twinkle?.enabled ?? false;
    this.twinkleEnabled = enabled;
    const intensityUniform = this.material.uniforms['uTwinkleIntensity'];
    const speedUniform = this.material.uniforms['uTwinkleSpeed'];
    if (intensityUniform) {
      intensityUniform.value = enabled ? clamp01(twinkle?.intensity ?? DEFAULT_TWINKLE_INTENSITY) : 0;
    }
    if (speedUniform) {
      speedUniform.value = twinkle?.speed ?? DEFAULT_TWINKLE_SPEED;
    }
  }

  /**
   * Live update for the Milky Way band. Visibility and brightness are both
   * uniform/flag flips — no rebuild. `null` restores the defaults (enabled,
   * intensity 0.55). Tilt is baked into the geometry-space rotation at
   * construction time and is not adjusted here.
   */
  public setMilkyWay(options: { enabled?: boolean; intensity?: number } | null): void {
    this.milkyWayEnabled = options?.enabled ?? true;
    this.bandMesh.visible = this.milkyWayEnabled;
    const intensityUniform = this.bandMaterial.uniforms['uIntensity'];
    if (intensityUniform) {
      intensityUniform.value = Math.max(0, options?.intensity ?? DEFAULT_MILKY_WAY_INTENSITY);
    }
  }

  public dispose(): void {
    this.object.remove(this.bandMesh);
    this.bandGeometry.dispose();
    this.bandMaterial.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/** Cumulative-weight sampling over `STAR_CLASSES`. */
const pickClass = (draw: number): number => {
  let acc = 0;
  for (let i = 0; i < STAR_CLASSES.length; i++) {
    acc += STAR_CLASSES[i]![1];
    if (draw < acc) return i;
  }
  return STAR_CLASSES.length - 1;
};

/**
 * Deterministic integer hash → [0, 1). Chris Wellons' `lowbias32` mix: good
 * avalanche, so consecutive seeds (`i*8+1`, `i*8+2`, …) decorrelate into
 * independent-looking streams. Replaces `Math.random()` so the star field
 * is identical on every rebuild.
 */
const hash01 = (seed: number): number => {
  let x = seed | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = x ^ (x >>> 16);
  return (x >>> 0) / 4294967296;
};
