import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';

export interface StarfieldTwinkleOptions {
  /** Default false. Twinkle is opt-in — static stars are also fine. */
  readonly enabled?: boolean;
  /**
   * How much each star's brightness varies between trough and peak. 0 = no
   * variation (constant), 1 = full range (drops to zero on the trough).
   * Default 0.45 — perceptible without strobing.
   */
  readonly intensity?: number;
  /**
   * Average twinkle frequency in Hz. Each star is offset by a random phase
   * so the field never pulses in unison. Default 0.55.
   */
  readonly speed?: number;
}

export interface HologramStarfieldLayerOptions {
  readonly count: number;
  readonly color: string;
  readonly size: number;
  /** Sphere radius the stars are placed on. Default 30 (well outside camera). */
  readonly radius?: number;
  /**
   * Optional palette to sample per-star colors from. When provided, each star
   * picks a random entry — useful for blue/white/yellow/red mixed-color skies.
   * When omitted, every star uses the base `color`.
   */
  readonly palette?: ReadonlyArray<string>;
  /**
   * Per-star size multiplier range, expressed as a fraction of the base size.
   * 0 = all stars equal, 1 = sizes range from 0× to 2× base. Default 0.5
   * (sizes in 0.5×..1.5× of `size`).
   */
  readonly sizeVariety?: number;
  /** Twinkle animation knobs. Static when `twinkle.enabled` is false. */
  readonly twinkle?: StarfieldTwinkleOptions;
}

const VERTEX_SHADER = `
attribute float aPhase;
attribute float aSizeScale;
attribute vec3 aColor;
uniform float uTime;
uniform float uBaseSize;
uniform float uTwinkleIntensity;
uniform float uTwinkleSpeed;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vAlpha;
void main() {
  // Per-star sinusoidal pulse with a random per-star phase. Intensity 0 keeps
  // the field static; intensity 1 drops the trough to zero brightness.
  float wave = sin(uTime * uTwinkleSpeed * 6.28318 + aPhase);
  float brightness = 1.0 - uTwinkleIntensity * 0.5 * (1.0 - wave);
  vColor = aColor;
  vAlpha = brightness;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uBaseSize * aSizeScale * uPixelRatio;
}
`;

const FRAGMENT_SHADER = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  // Soft round disc — fade edges via smoothstep so we don't show square sprites.
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  float disc = smoothstep(0.5, 0.18, d);
  if (disc <= 0.001) discard;
  gl_FragColor = vec4(vColor * vAlpha, disc * vAlpha);
}
`;

/**
 * Procedural starfield rendered as a `THREE.Points` cloud on a large sphere
 * surrounding the scene. Stars are uniformly distributed (using inverse-CDF
 * for cos(phi) to avoid pole clustering).
 *
 * Each star carries a random phase + size scale + per-star color (sampled
 * from an optional palette). A custom shader animates a sinusoidal twinkle
 * in screen space and renders the points as soft circular discs rather
 * than aliased squares.
 */
export class HologramStarfieldLayer {
  public readonly object: Points;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;
  // Mutable so setTwinkle() can flip it live — drives the time-uniform
  // accumulation in update() and the intensity-zeroing trick that
  // freezes the field when twinkle is off.
  private twinkleEnabled: boolean;

  public constructor(options: HologramStarfieldLayerOptions) {
    const radius = options.radius ?? 30;
    const sizeVariety = clamp01(options.sizeVariety ?? 0.5);
    const twinkle = options.twinkle;
    this.twinkleEnabled = twinkle?.enabled ?? false;

    const positions = new Float32Array(options.count * 3);
    const phases = new Float32Array(options.count);
    const sizeScales = new Float32Array(options.count);
    const colors = new Float32Array(options.count * 3);

    const palette =
      options.palette && options.palette.length > 0 ? options.palette : [options.color];
    const tmpColor = new Color();
    const baseColors = palette.map((hex) => new Color(hex));
    const tmp = new Vector3();

    for (let i = 0; i < options.count; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      tmp.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
      positions[i * 3] = tmp.x;
      positions[i * 3 + 1] = tmp.y;
      positions[i * 3 + 2] = tmp.z;

      phases[i] = Math.random() * Math.PI * 2;
      // Size scale uniformly in [1 - variety, 1 + variety]. variety=0 ⇒ all
      // identical, variety=1 ⇒ 0..2× spread. With default 0.5 we get a soft
      // distribution that reads as "some bright, some dim".
      sizeScales[i] = 1 + (Math.random() * 2 - 1) * sizeVariety;

      const picked = baseColors[Math.floor(Math.random() * baseColors.length)] ?? baseColors[0]!;
      tmpColor.copy(picked);
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
    this.geometry.setAttribute('aSizeScale', new BufferAttribute(sizeScales, 1));
    this.geometry.setAttribute('aColor', new BufferAttribute(colors, 3));

    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseSize: { value: options.size },
        uTwinkleIntensity: {
          value: this.twinkleEnabled ? clamp01(twinkle?.intensity ?? 0.45) : 0,
        },
        uTwinkleSpeed: { value: twinkle?.speed ?? 0.55 },
        uPixelRatio: {
          value: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    this.object = new Points(this.geometry, this.material);
    this.object.frustumCulled = false;
  }

  /**
   * Tick the twinkle clock. Cheap when disabled — we still need to track time
   * so a later setTwinkle() call doesn't suddenly snap to phase zero. Called
   * once per render frame from `SceneManager.onRender`.
   */
  public update(delta: number): void {
    if (!this.twinkleEnabled) return;
    const uniform = this.material.uniforms['uTime'];
    if (uniform) uniform.value += delta;
  }

  /**
   * Toggle visibility without rebuilding. Cheap (Object3D.visible flip).
   */
  public setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  /**
   * Live update for the base star size uniform. Each star's final size is
   * still per-vertex `uBaseSize * aSizeScale`, so per-star variety is
   * preserved — only the global multiplier shifts.
   */
  public setSize(size: number): void {
    const uniform = this.material.uniforms['uBaseSize'];
    if (uniform) uniform.value = size;
  }

  /**
   * Live update for the twinkle config. Toggling `enabled` drives both the
   * RAF skip in `update()` and the intensity uniform — when disabled we set
   * intensity to 0 so the shader produces a constant brightness wave (i.e.
   * static stars). When re-enabled we restore the requested intensity.
   *
   * Pass `null` to switch back to defaults (intensity 0.45, speed 0.55).
   */
  public setTwinkle(twinkle: StarfieldTwinkleOptions | null): void {
    const enabled = twinkle?.enabled ?? false;
    this.twinkleEnabled = enabled;
    const intensityUniform = this.material.uniforms['uTwinkleIntensity'];
    const speedUniform = this.material.uniforms['uTwinkleSpeed'];
    if (intensityUniform) {
      intensityUniform.value = enabled ? clamp01(twinkle?.intensity ?? 0.45) : 0;
    }
    if (speedUniform) {
      speedUniform.value = twinkle?.speed ?? 0.55;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
