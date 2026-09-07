import {
  AddEquation,
  ClampToEdgeWrapping,
  Color,
  CustomBlending,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NoBlending,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Texture,
  type TextureDataType,
  type WebGLRenderer,
} from 'three';
import type { PostProcessingConfig } from '../../types/postfx';
import {
  BRIGHT_FRAGMENT,
  COMPOSITE_FRAGMENT,
  DOWNSAMPLE_FRAGMENT,
  FULLSCREEN_VERTEX,
  STREAK_FRAGMENT,
  UPSAMPLE_FRAGMENT,
} from './shaders';

/** Number of mips in the bloom chain (level 0 is the bright buffer itself). */
const CHAIN_LEVELS = 5;
/** The streak runs at a quarter of the drawing buffer. */
const STREAK_DIVISOR = 4;
/** Taps per side in `STREAK_FRAGMENT` (its loop is `for (i = 1; i < 8; i++)`). */
const STREAK_TAPS_PER_SIDE = 7;
/**
 * The streak tap step was tuned against a bright buffer at the default
 * `resolutionScale` (0.5) — exactly twice the ¼-res streak target. Dividing by
 * that reference ratio re-expresses the tuned range in streak-target texels, so
 * the default look is unchanged while every other chain resolution now matches
 * it instead of stretching or dashing the streak.
 */
const STREAK_REFERENCE_RATIO = 2;
/**
 * `resolutionScale` bounds. Below 0.05 the chain collapses into 1×1 targets;
 * above 1.5 it burns memory (and fill rate) for no visible gain.
 */
const MIN_RESOLUTION_SCALE = 0.05;
const MAX_RESOLUTION_SCALE = 1.5;
/** Used when a renderer reports no usable `maxTextureSize` (WebGL2 floor). */
const FALLBACK_MAX_TEXTURE_SIZE = 2048;

interface ResolvedPostFx {
  enabled: boolean;
  exposure: number;
  resolutionScale: number;
  bloom: { enabled: boolean; strength: number; threshold: number; radius: number; softKnee: number };
  streak: { enabled: boolean; strength: number; length: number; color: string };
  vignette: { enabled: boolean; strength: number; softness: number };
  chromaticAberration: { enabled: boolean; strength: number };
  grain: { enabled: boolean; strength: number };
}

const DEFAULTS: ResolvedPostFx = {
  enabled: false,
  exposure: 1.0,
  resolutionScale: 0.5,
  bloom: { enabled: true, strength: 0.48, threshold: 0.8, radius: 0.6, softKnee: 0.5 },
  streak: { enabled: true, strength: 0.22, length: 0.55, color: '#9fd4ff' },
  vignette: { enabled: true, strength: 0.32, softness: 0.45 },
  chromaticAberration: { enabled: true, strength: 0.0025 },
  grain: { enabled: true, strength: 0.035 },
};

const mergeConfig = (base: ResolvedPostFx, next: PostProcessingConfig): ResolvedPostFx => ({
  enabled: next.enabled ?? base.enabled,
  exposure: next.exposure ?? base.exposure,
  resolutionScale: resolveScale(next.resolutionScale, base.resolutionScale),
  bloom: { ...base.bloom, ...stripUndefined(next.bloom) },
  streak: { ...base.streak, ...stripUndefined(next.streak) },
  vignette: { ...base.vignette, ...stripUndefined(next.vignette) },
  chromaticAberration: {
    ...base.chromaticAberration,
    ...stripUndefined(next.chromaticAberration),
  },
  grain: { ...base.grain, ...stripUndefined(next.grain) },
});

/** Keeps `resolutionScale` inside the supported range; ignores NaN/Infinity. */
const resolveScale = (next: number | undefined, base: number): number => {
  const value = next ?? base;
  if (!Number.isFinite(value)) return base;
  return Math.min(MAX_RESOLUTION_SCALE, Math.max(MIN_RESOLUTION_SCALE, value));
};

const stripUndefined = <T extends object>(value: T | undefined): Partial<T> => {
  if (!value) return {};
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (v !== undefined) out[key] = v;
  }
  return out as Partial<T>;
};

export interface PostFxPipelineOptions {
  readonly renderer: WebGLRenderer;
  readonly config?: PostProcessingConfig;
  /** Transparent canvas — the RT is cleared to alpha 0 so the page shows through. */
  readonly transparent: boolean;
  /** Mirrors `performance.antialias`; drives WebGL2 MSAA on the scene target. */
  readonly antialias?: boolean;
}

/**
 * Shared HDR post-processing pipeline: scene → HDR target → bright pass →
 * 5-level dual-Kawase bloom chain + anamorphic streak → composite (chromatic
 * aberration, vignette, grain, exposure, soft-shoulder roll-off) → canvas.
 *
 * Fails closed: any throw from a pass or a target allocation disables the
 * pipeline for good and falls back to a plain `renderer.render()`, so a driver
 * limit can never freeze the host's animation loop.
 *
 * Owns every render target, material and the fullscreen quad; nothing leaks
 * into the caller's scene graph.
 */
export class PostFxPipeline {
  private readonly renderer: WebGLRenderer;
  private readonly transparent: boolean;
  private readonly samples: number;
  private readonly hdrType: TextureDataType;

  private cfg: ResolvedPostFx;

  private bufferWidth = 0;
  private bufferHeight = 0;
  private qualityScale = 1;
  private targetsDirty = true;
  private disposed = false;
  /** Sticky: set once a pass or an allocation threw. Never re-enabled. */
  private failed = false;
  private frame = 0;

  private sceneTarget: WebGLRenderTarget | null = null;
  private chain: WebGLRenderTarget[] = [];
  private streakA: WebGLRenderTarget | null = null;
  private streakB: WebGLRenderTarget | null = null;

  private readonly quadScene = new Scene();
  private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quadGeometry = new PlaneGeometry(2, 2);
  private readonly quad: Mesh;

  private readonly brightUniforms = {
    tDiffuse: { value: null as Texture | null },
    uThreshold: { value: DEFAULTS.bloom.threshold },
    uSoftKnee: { value: DEFAULTS.bloom.softKnee },
  };
  private readonly downUniforms = {
    tDiffuse: { value: null as Texture | null },
    uTexel: { value: new Vector2(1, 1) },
  };
  private readonly upUniforms = {
    tDiffuse: { value: null as Texture | null },
    uTexel: { value: new Vector2(1, 1) },
    uRadius: { value: DEFAULTS.bloom.radius * 2 },
  };
  private readonly streakUniforms = {
    tDiffuse: { value: null as Texture | null },
    uTexel: { value: new Vector2(1, 1) },
    uStride: { value: 1 },
    uDecay: { value: 0.8 },
    uGain: { value: 0.28 },
    uTint: { value: new Color(1, 1, 1) },
  };
  private readonly compositeUniforms = {
    tBase: { value: null as Texture | null },
    tBloom: { value: null as Texture | null },
    tStreak: { value: null as Texture | null },
    uResolution: { value: new Vector2(1, 1) },
    uTime: { value: 0 },
    uExposure: { value: DEFAULTS.exposure },
    uBloomStrength: { value: DEFAULTS.bloom.strength },
    uStreakStrength: { value: DEFAULTS.streak.strength },
    uVignette: { value: DEFAULTS.vignette.strength },
    uVignetteSoftness: { value: DEFAULTS.vignette.softness },
    uChromatic: { value: DEFAULTS.chromaticAberration.strength },
    uGrain: { value: DEFAULTS.grain.strength },
  };

  private readonly brightMaterial: ShaderMaterial;
  private readonly downMaterial: ShaderMaterial;
  private readonly upMaterial: ShaderMaterial;
  private readonly streakMaterial: ShaderMaterial;
  private readonly compositeMaterial: ShaderMaterial;

  private readonly streakTint = new Color(DEFAULTS.streak.color);
  private readonly prevClearColor = new Color();
  private readonly sizeScratch = new Vector2();

  public constructor(options: PostFxPipelineOptions) {
    this.renderer = options.renderer;
    this.transparent = options.transparent;
    this.samples = options.antialias === true ? 4 : 0;
    this.cfg = mergeConfig(DEFAULTS, options.config ?? {});

    const ext = this.renderer.extensions;
    this.hdrType =
      ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float')
        ? HalfFloatType
        : UnsignedByteType;

    const pass = (fragmentShader: string, uniforms: Record<string, { value: unknown }>) =>
      new ShaderMaterial({
        uniforms,
        vertexShader: FULLSCREEN_VERTEX,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        blending: NoBlending,
      });

    this.brightMaterial = pass(BRIGHT_FRAGMENT, this.brightUniforms);
    this.downMaterial = pass(DOWNSAMPLE_FRAGMENT, this.downUniforms);
    this.upMaterial = pass(UPSAMPLE_FRAGMENT, this.upUniforms);
    // Straight `src + dst` so the chain accumulates on the way back up.
    this.upMaterial.blending = CustomBlending;
    this.upMaterial.blendEquation = AddEquation;
    this.upMaterial.blendSrc = OneFactor;
    this.upMaterial.blendDst = OneFactor;
    this.streakMaterial = pass(STREAK_FRAGMENT, this.streakUniforms);
    this.compositeMaterial = pass(COMPOSITE_FRAGMENT, this.compositeUniforms);

    this.quad = new Mesh(this.quadGeometry, this.compositeMaterial);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);

    this.applyUniformsFromConfig();

    const size = this.renderer.getSize(this.sizeScratch);
    this.setSize(size.x, size.y, this.renderer.getPixelRatio());
  }

  public get enabled(): boolean {
    return this.cfg.enabled && !this.failed;
  }

  /** `width`/`height` are CSS pixels; the targets are sized in device pixels. */
  public setSize(width: number, height: number, pixelRatio: number): void {
    const w = Math.max(1, Math.floor(width * pixelRatio));
    const h = Math.max(1, Math.floor(height * pixelRatio));
    if (w === this.bufferWidth && h === this.bufferHeight) return;
    this.bufferWidth = w;
    this.bufferHeight = h;
    this.targetsDirty = true;
  }

  /** 1 = full-resolution bloom chain, 0.5 = half (adaptive-quality fallback). */
  public setQualityScale(scale: number): void {
    const next = scale > 0 ? scale : 1;
    if (next === this.qualityScale) return;
    this.qualityScale = next;
    this.targetsDirty = true;
  }

  public setConfig(partial: PostProcessingConfig): void {
    const prevScale = this.cfg.resolutionScale;
    this.cfg = mergeConfig(this.cfg, partial);
    // A pipeline that already failed stays off — re-enabling it would only hit
    // the same allocation/driver limit again on the next frame.
    if (this.failed) this.cfg.enabled = false;
    if (this.cfg.resolutionScale !== prevScale) this.targetsDirty = true;
    this.applyUniformsFromConfig();
  }

  public render(scene: Scene, camera: Camera): void {
    if (this.disposed || this.failed || !this.cfg.enabled) {
      this.renderer.render(scene, camera);
      return;
    }

    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevAutoClear = r.autoClear;
    const prevClearAlpha = r.getClearAlpha();
    r.getClearColor(this.prevClearColor);
    let fallback = false;

    try {
      // Allocation lives in here on purpose: a target the driver refuses
      // (out of memory, past `MAX_TEXTURE_SIZE`, lost context) must not throw
      // out of the host's requestAnimationFrame callback.
      this.ensureTargets();
      const sceneTarget = this.sceneTarget;
      if (sceneTarget === null) {
        // Zero-sized canvas — transient, so the pipeline stays enabled.
        fallback = true;
      } else {
        this.renderPasses(scene, camera, sceneTarget);
      }
    } catch (err) {
      this.disableAfterFailure(err);
      fallback = true;
    } finally {
      r.setClearColor(this.prevClearColor, prevClearAlpha);
      r.autoClear = prevAutoClear;
      r.setRenderTarget(prevTarget);
    }

    // The frame still has to be drawn: the caller schedules the next tick
    // after `render()` returns, so bailing out silently would stall the globe.
    if (fallback) r.render(scene, camera);
  }

  /**
   * Fail closed. `render()` runs inside the host's RAF callback and
   * `SceneManager.tick()` only schedules the next frame *after* it returns, so
   * a single uncaught throw would freeze the globe permanently. Warn once,
   * switch the pipeline off, free the targets, and let this and every later
   * frame go straight through `renderer.render()`.
   */
  private disableAfterFailure(err: unknown): void {
    if (!this.failed) {
      this.failed = true;
      console.warn('[globio] post-processing disabled after a render failure', err);
    }
    this.cfg.enabled = false;
    try {
      this.disposeTargets();
    } catch {
      // A lost context can make dispose throw too — drop the references anyway.
      this.sceneTarget = null;
      this.chain = [];
      this.streakA = null;
      this.streakB = null;
    }
  }

  /** The pass sequence itself. Renderer state is restored by the caller. */
  private renderPasses(scene: Scene, camera: Camera, sceneTarget: WebGLRenderTarget): void {
    const r = this.renderer;

    // 1 — scene into the HDR target.
    r.autoClear = true;
    if (this.transparent) r.setClearColor(0x000000, 0);
    r.setRenderTarget(sceneTarget);
    r.render(scene, camera);

    // Every fullscreen pass covers its whole target, and the upsample chain
    // deliberately blends onto existing content.
    r.autoClear = false;

    const bloomOn = this.cfg.bloom.enabled && this.cfg.bloom.strength > 0;
    const streakOn = this.cfg.streak.enabled && this.cfg.streak.strength > 0;
    if (bloomOn || streakOn) {
      this.renderBright(sceneTarget.texture);
      if (streakOn) this.renderStreak();
      if (bloomOn) this.renderBloomChain();
    }

    this.compositeUniforms.tBase.value = sceneTarget.texture;
    this.compositeUniforms.tBloom.value = this.chain[0]?.texture ?? null;
    this.compositeUniforms.tStreak.value = this.streakB?.texture ?? null;
    this.compositeUniforms.uBloomStrength.value = bloomOn ? this.cfg.bloom.strength : 0;
    this.compositeUniforms.uStreakStrength.value = streakOn ? this.cfg.streak.strength : 0;
    this.compositeUniforms.uResolution.value.set(this.bufferWidth, this.bufferHeight);
    this.frame = (this.frame + 1) % 1024;
    this.compositeUniforms.uTime.value = this.frame;
    this.renderPass(this.compositeMaterial, null);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeTargets();
    this.quadGeometry.dispose();
    this.brightMaterial.dispose();
    this.downMaterial.dispose();
    this.upMaterial.dispose();
    this.streakMaterial.dispose();
    this.compositeMaterial.dispose();
    this.quadScene.remove(this.quad);
  }

  // ---------------------------------------------------------------- passes

  private renderBright(source: Texture): void {
    const target = this.chain[0];
    if (!target) return;
    this.brightUniforms.tDiffuse.value = source;
    this.renderPass(this.brightMaterial, target);
  }

  private renderBloomChain(): void {
    for (let i = 1; i < this.chain.length; i++) {
      const src = this.chain[i - 1];
      const dst = this.chain[i];
      if (!src || !dst) continue;
      this.downUniforms.tDiffuse.value = src.texture;
      this.downUniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      this.renderPass(this.downMaterial, dst);
    }
    for (let i = this.chain.length - 1; i > 0; i--) {
      const src = this.chain[i];
      const dst = this.chain[i - 1];
      if (!src || !dst) continue;
      this.upUniforms.tDiffuse.value = src.texture;
      this.upUniforms.uTexel.value.set(1 / src.width, 1 / src.height);
      this.renderPass(this.upMaterial, dst);
    }
  }

  /**
   * Two horizontal passes into the fixed-size (¼ drawing buffer) streak
   * targets. Pass 1 reads the bright buffer, whose size follows
   * `resolutionScale × qualityScale` — so the tap step is expressed in *output*
   * texels and converted through the real source/target ratio. That keeps the
   * streak the same length on screen at any chain resolution; hard-coding the
   * step in source texels (the old behaviour) only lined up when the ratio
   * happened to be exactly 2.
   *
   * Pass 2 then strides one full pass-1 kernel width (both sides, `2 × 7`
   * taps), so its taps tile pass 1's coverage edge to edge — no gaps (dashes),
   * no heavy double-coverage.
   */
  private renderStreak(): void {
    const bright = this.chain[0];
    const a = this.streakA;
    const b = this.streakB;
    if (!bright || !a || !b) return;
    // Distance between two pass-1 taps, in streak-target texels.
    const step =
      (0.5 + Math.max(0, Math.min(1, this.cfg.streak.length))) / STREAK_REFERENCE_RATIO;

    this.streakUniforms.tDiffuse.value = bright.texture;
    this.setStreakStep(bright, a, step);
    this.streakUniforms.uTint.value.setRGB(1, 1, 1);
    this.renderPass(this.streakMaterial, a);

    this.streakUniforms.tDiffuse.value = a.texture;
    this.setStreakStep(a, b, step * STREAK_TAPS_PER_SIDE * 2);
    this.streakUniforms.uTint.value.copy(this.streakTint);
    this.renderPass(this.streakMaterial, b);
  }

  /**
   * `STREAK_FRAGMENT` offsets by `uTexel.x * uStride` (source texels), so a
   * step given in target texels is scaled by `source.width / target.width`.
   */
  private setStreakStep(
    source: WebGLRenderTarget,
    target: WebGLRenderTarget,
    stepInTargetTexels: number,
  ): void {
    this.streakUniforms.uTexel.value.set(1 / source.width, 1 / source.height);
    this.streakUniforms.uStride.value = stepInTargetTexels * (source.width / target.width);
  }

  private renderPass(material: ShaderMaterial, target: WebGLRenderTarget | null): void {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  // --------------------------------------------------------------- targets

  private applyUniformsFromConfig(): void {
    const c = this.cfg;
    this.brightUniforms.uThreshold.value = c.bloom.threshold;
    this.brightUniforms.uSoftKnee.value = c.bloom.softKnee;
    this.upUniforms.uRadius.value = Math.max(0, c.bloom.radius) * 2;
    this.streakTint.set(c.streak.color);
    this.compositeUniforms.uExposure.value = c.exposure;
    this.compositeUniforms.uBloomStrength.value = c.bloom.enabled ? c.bloom.strength : 0;
    this.compositeUniforms.uStreakStrength.value = c.streak.enabled ? c.streak.strength : 0;
    this.compositeUniforms.uVignette.value = c.vignette.enabled ? c.vignette.strength : 0;
    this.compositeUniforms.uVignetteSoftness.value = c.vignette.softness;
    this.compositeUniforms.uChromatic.value = c.chromaticAberration.enabled
      ? c.chromaticAberration.strength
      : 0;
    this.compositeUniforms.uGrain.value = c.grain.enabled ? c.grain.strength : 0;
  }

  private ensureTargets(): void {
    if (!this.targetsDirty && this.sceneTarget !== null) return;
    this.targetsDirty = false;
    this.disposeTargets();
    if (this.bufferWidth <= 0 || this.bufferHeight <= 0) return;

    // Everything is sized off the clamped scene target, so the chain keeps its
    // ratios even when the drawing buffer is larger than the driver allows.
    const width = this.clampDimension(this.bufferWidth);
    const height = this.clampDimension(this.bufferHeight);
    this.sceneTarget = new WebGLRenderTarget(width, height, {
      ...this.baseTargetOptions(),
      depthBuffer: true,
      samples: this.samples,
    });
    markAsDisplayReferredTarget(this.sceneTarget, this.hdrType === UnsignedByteType);

    const scale = this.cfg.resolutionScale * this.qualityScale;
    let w = this.clampDimension(width * scale);
    let h = this.clampDimension(height * scale);
    this.chain = [];
    for (let i = 0; i < CHAIN_LEVELS; i++) {
      this.chain.push(this.createTarget(w, h));
      w = Math.max(1, w >> 1);
      h = Math.max(1, h >> 1);
    }

    const sw = width / STREAK_DIVISOR;
    const sh = height / STREAK_DIVISOR;
    this.streakA = this.createTarget(sw, sh);
    this.streakB = this.createTarget(sw, sh);
  }

  /**
   * Keeps a target inside what the driver can actually allocate — a request
   * past `MAX_TEXTURE_SIZE` throws (or silently produces an incomplete
   * framebuffer) on the first frame it is used.
   */
  private clampDimension(value: number): number {
    const max = this.renderer.capabilities.maxTextureSize;
    const limit = Number.isFinite(max) && max > 0 ? max : FALLBACK_MAX_TEXTURE_SIZE;
    return Math.max(1, Math.min(limit, Math.floor(value)));
  }

  private createTarget(width: number, height: number): WebGLRenderTarget {
    return new WebGLRenderTarget(this.clampDimension(width), this.clampDimension(height), {
      ...this.baseTargetOptions(),
      depthBuffer: false,
    });
  }

  private baseTargetOptions() {
    return {
      format: RGBAFormat,
      type: this.hdrType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
      generateMipmaps: false,
      stencilBuffer: false,
    } as const;
  }

  private disposeTargets(): void {
    this.sceneTarget?.dispose();
    this.sceneTarget = null;
    for (const target of this.chain) target.dispose();
    this.chain = [];
    this.streakA?.dispose();
    this.streakA = null;
    this.streakB?.dispose();
    this.streakB = null;
  }
}

/**
 * three.js applies the renderer's sRGB output encode only when drawing to
 * the canvas (or to an XR render target); ordinary render targets are
 * treated as linear working space. Our cinematic shaders are
 * display-referred and never include the colorspace chunk, so they are
 * unaffected — but three's built-in materials (arc contact dots, markers,
 * hover outlines, country fills, data layers) do include it, and without
 * this they would land in the frame darker and more saturated than on the
 * direct path, i.e. toggling post-processing would recolour layers it was
 * never meant to touch. Flagging the scene target as XR-style makes
 * `WebGLPrograms.getParameters` (three r167) compile built-ins with the
 * same encode the canvas gets. The half-float target is linear storage
 * regardless of colour space (RGBA16F has no sRGB variant). On the 8-bit
 * fallback three would pick SRGB8_ALPHA8 for the sampled attachment and
 * blend in decoded linear space — unlike the canvas path — so the internal
 * format is pinned to RGBA8 there; `getInternalFormat` honours the explicit
 * name for both the texture and the MSAA renderbuffer. If a future three
 * release drops the flag, built-ins simply fall back to linear again —
 * nothing breaks, the colours just shift.
 */
const markAsDisplayReferredTarget = (target: WebGLRenderTarget, eightBit: boolean): void => {
  (target as WebGLRenderTarget & { isXRRenderTarget?: boolean }).isXRRenderTarget = true;
  target.texture.colorSpace = SRGBColorSpace;
  if (eightBit) target.texture.internalFormat = 'RGBA8';
};
