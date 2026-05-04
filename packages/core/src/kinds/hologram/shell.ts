import {
  AdditiveBlending,
  BackSide,
  Color,
  FrontSide,
  Group,
  Mesh,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { GLOBE_RADIUS } from '../../utils/coordinates';

/**
 * Shell layer — the heart of the hologram look. Responsible for the
 * translucent shader sphere AND every additive effect that lives "on
 * the projection surface": scanlines, rim Fresnel, chromatic
 * aberration, holographic noise, data feed scan, projector pulse,
 * phase shimmer, calibration ticks. Each effect is a few uniforms +
 * a small contribution to the fragment color so adding/removing
 * features is cheap (no extra meshes).
 *
 * Outer glow is a separate back-side shell mesh so the silhouette
 * halo can scale wider than the inner shell without occluding it.
 *
 * All knobs are mutable post-construction via `setX`-style setters
 * called from the kindHandle's `setHologramConfig` dispatcher.
 */
export interface HologramShellLayerOptions {
  readonly color: string;
  readonly shellOpacity: number;
  readonly rimGlow: number;
  readonly scanlineFreq: number;
  readonly scanlineSpeed: number;
  readonly scanlinesEnabled: boolean;
  readonly scanlineOpacity?: number;
  readonly scanlineDirection?: 'horizontal' | 'vertical' | 'diagonal';
  readonly rimEnabled: boolean;
  readonly rimColor?: string;
  readonly rimWidth?: number;
  readonly outerGlowEnabled: boolean;
  readonly outerGlowColor?: string;
  readonly outerGlowOpacity: number;
  readonly outerGlowSpread?: number;
  readonly chromaticAberrationEnabled?: boolean;
  readonly chromaticAberrationAmount?: number;
  readonly chromaticAberrationMode?: 'rim' | 'global';
  readonly noiseEnabled?: boolean;
  readonly noiseIntensity?: number;
  readonly noiseScale?: number;
  readonly noiseSpeed?: number;
  readonly projectorPulseEnabled?: boolean;
  readonly projectorPulseSpeed?: number;
  readonly projectorPulseAmplitude?: number;
  readonly projectorPulseColor?: string;
  readonly dataScanEnabled?: boolean;
  readonly dataScanSpeed?: number;
  readonly dataScanWidth?: number;
  readonly dataScanOpacity?: number;
  readonly dataScanAxis?: 'horizontal' | 'vertical' | 'radial';
  readonly dataScanColor?: string;
  readonly phaseShimmerEnabled?: boolean;
  readonly phaseShimmerScale?: number;
  readonly phaseShimmerIntensity?: number;
  readonly phaseShimmerSpeed?: number;
  readonly calibrationTicksEnabled?: boolean;
  readonly calibrationTicksCount?: number;
  readonly calibrationTicksLength?: number;
  readonly calibrationTicksOpacity?: number;
}

const SHELL_RADIUS = GLOBE_RADIUS * 1.001;
const DEFAULT_OUTER_FACTOR = 1.02;
const SHELL_SEGMENTS = 96;

const directionId = (
  d: 'horizontal' | 'vertical' | 'diagonal' | undefined
): number => {
  if (d === 'vertical') return 1;
  if (d === 'diagonal') return 2;
  return 0;
};

const dataScanAxisId = (
  d: 'horizontal' | 'vertical' | 'radial' | undefined
): number => {
  if (d === 'vertical') return 1;
  if (d === 'radial') return 2;
  return 0;
};

const SHELL_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;
  varying vec3 vLocalPos;
  void main() {
    vUv = uv;
    vLocalPos = normalize(position);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// One large fragment shader. Each effect is gated by an `*On` uniform
// so the GPU work is only paid when the user actually wants the look.
// Branching on uniforms is essentially free (warp-coherent) and avoids
// shader recompilation churn when the user toggles things in the workshop.
const SHELL_FRAG = /* glsl */ `
  precision mediump float;
  #define PI 3.14159265359

  // Core
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uBaseAlpha;

  // Scanlines
  uniform float uScanlineFreq;
  uniform float uScanlineSpeed;
  uniform float uScanlineOpacity;
  uniform float uScanlinesOn;
  uniform float uScanlineDir;

  // Rim
  uniform vec3 uRimColor;
  uniform float uRimGlow;
  uniform float uRimWidth;
  uniform float uRimOn;

  // Chromatic aberration
  uniform float uCaOn;
  uniform float uCaAmount;
  uniform float uCaRimOnly;

  // Noise
  uniform float uNoiseOn;
  uniform float uNoiseIntensity;
  uniform float uNoiseScale;
  uniform float uNoiseSpeed;

  // Projector pulse
  uniform float uPulseOn;
  uniform float uPulseSpeed;
  uniform float uPulseAmp;
  uniform vec3 uPulseColor;

  // Data scan
  uniform float uScanOn;
  uniform float uScanSpeed;
  uniform float uScanWidth;
  uniform float uScanOpacity;
  uniform float uScanAxis;
  uniform vec3 uScanColor;

  // Phase shimmer
  uniform float uShimmerOn;
  uniform float uShimmerScale;
  uniform float uShimmerIntensity;
  uniform float uShimmerSpeed;

  // Calibration ticks
  uniform float uTicksOn;
  uniform float uTicksCount;
  uniform float uTicksLength;
  uniform float uTicksOpacity;

  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  varying vec2 vUv;
  varying vec3 vLocalPos;

  // Cheap hash → value noise for the grain channel.
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    float ndv = max(dot(normalize(vViewDir), normalize(vWorldNormal)), 0.0);
    float rim = (1.0 - ndv);
    float rimShaped = pow(rim, max(uRimWidth, 0.05));
    float rimContribution = rimShaped * uRimGlow * uRimOn;

    // ------------------------------------------------------------------
    // Scanlines — pick the modulation axis based on uScanlineDir.
    // 0 = horizontal (sweep top-to-bottom; modulate y), 1 = vertical
    // (sweep left-to-right; modulate x), 2 = diagonal (mix both for a
    // moiré drift).
    // ------------------------------------------------------------------
    float axisCoord = vUv.y;
    if (uScanlineDir > 0.5 && uScanlineDir < 1.5) axisCoord = vUv.x;
    if (uScanlineDir > 1.5) axisCoord = vUv.x + vUv.y;
    float stripe = sin(axisCoord * uScanlineFreq + uTime * uScanlineSpeed);
    float scanline = mix(1.0, 1.0 - uScanlineOpacity + uScanlineOpacity * (0.5 + 0.5 * stripe), uScanlinesOn);

    // ------------------------------------------------------------------
    // Holographic noise — value noise + time scrub.
    // ------------------------------------------------------------------
    float grain = 0.0;
    if (uNoiseOn > 0.5) {
      vec2 nUv = vUv * (40.0 / max(uNoiseScale, 0.05));
      float t = floor(uTime * max(uNoiseSpeed, 0.0));
      grain = (hash21(nUv + t) - 0.5) * uNoiseIntensity;
    }

    // ------------------------------------------------------------------
    // Phase shimmer — moiré-style sin² interference along normal axes.
    // ------------------------------------------------------------------
    float shimmer = 0.0;
    if (uShimmerOn > 0.5) {
      float a = sin(vUv.x * uShimmerScale + uTime * uShimmerSpeed);
      float b = sin(vUv.y * uShimmerScale * 1.07 - uTime * uShimmerSpeed * 0.6);
      shimmer = a * b * uShimmerIntensity;
    }

    // ------------------------------------------------------------------
    // Projector pulse — angular sweep around the silhouette. We use the
    // azimuth of the world normal projected to screen-x so the bright
    // arc orbits the camera-facing rim regardless of the user's view.
    // ------------------------------------------------------------------
    vec3 pulseRgb = vec3(0.0);
    if (uPulseOn > 0.5) {
      float ang = atan(vWorldNormal.y, vWorldNormal.x);
      float wave = 0.5 + 0.5 * sin(ang * 2.0 - uTime * uPulseSpeed * 6.2831853);
      float onRim = pow(rim, 1.5);
      pulseRgb = uPulseColor * wave * uPulseAmp * onRim;
    }

    // ------------------------------------------------------------------
    // Data feed scan — a moving Gaussian band along an axis. Horizontal
    // (default) modulates against vUv.y which is latitude-like on a
    // SphereGeometry (UV maps along latitude/longitude). Radial uses the
    // angular distance from a pole computed from the normalised local
    // pos's y component.
    // ------------------------------------------------------------------
    vec3 scanRgb = vec3(0.0);
    if (uScanOn > 0.5) {
      float coord = vUv.y;
      if (uScanAxis > 0.5 && uScanAxis < 1.5) coord = vUv.x;
      if (uScanAxis > 1.5) coord = (vLocalPos.y * 0.5 + 0.5);
      float phase = mod(uTime * uScanSpeed, 1.0);
      float dist = abs(coord - phase);
      // Wrap around so the band re-enters the opposite side smoothly.
      dist = min(dist, 1.0 - dist);
      float band = exp(-(dist * dist) / max(uScanWidth * uScanWidth, 1e-5));
      scanRgb = uScanColor * band * uScanOpacity;
    }

    // ------------------------------------------------------------------
    // Calibration ticks — short bright marks placed every 360°/count
    // around the silhouette. Computed by snapping the rim azimuth to a
    // discrete grid and brightening only when we sit on a tick line and
    // close to the silhouette (rim > 0.55 keeps them off the disk).
    // ------------------------------------------------------------------
    float ticks = 0.0;
    if (uTicksOn > 0.5) {
      float ang = atan(vWorldNormal.y, vWorldNormal.x);
      float seg = max(uTicksCount, 1.0);
      float local = fract((ang / (2.0 * PI)) * seg);
      // Mask the tick to a thin angular slice + a radial band near the
      // silhouette. uTicksLength controls how far inward the tick extends.
      float angularMask = step(local, 0.05) + step(0.95, local);
      angularMask = clamp(angularMask, 0.0, 1.0);
      float radialMask = smoothstep(0.55, 0.95, rim);
      float radialMask2 = smoothstep(1.0 - uTicksLength * 0.6, 0.95, rim);
      ticks = angularMask * max(radialMask, radialMask2) * uTicksOpacity;
    }

    // ------------------------------------------------------------------
    // Compose. Base color blends shell + rim glow, then layered
    // additive effects (pulse, data scan, ticks). Scanline + grain +
    // shimmer multiplicatively modulate the brightness so they read
    // as projection artefacts rather than overlays.
    // ------------------------------------------------------------------
    float modulator = scanline * (1.0 + grain) * (1.0 + shimmer);
    vec3 baseRgb = uColor * uBaseAlpha + uRimColor * rimContribution;
    vec3 rgb = baseRgb * modulator + pulseRgb + scanRgb + uColor * ticks;

    // ------------------------------------------------------------------
    // Chromatic aberration — split RGB by aberration amount along the
    // normal-projected screen direction. In rim mode the split is
    // weighted by Fresnel; in global it applies uniformly.
    // ------------------------------------------------------------------
    if (uCaOn > 0.5) {
      float weight = mix(1.0, pow(rim, 1.5), uCaRimOnly);
      float shift = uCaAmount * 0.6 * weight;
      // Boost red on one side, blue on the other.
      rgb.r += baseRgb.r * shift * 0.7;
      rgb.b += baseRgb.b * shift * 0.7;
      // Drop a hint of green in the middle to fake the cyan-magenta crossover.
      rgb.g -= baseRgb.g * shift * 0.25;
    }

    float alpha = uBaseAlpha * scanline + rimContribution * 1.5 + (scanRgb.r + scanRgb.g + scanRgb.b) * 0.4 + ticks * 0.5;
    gl_FragColor = vec4(rgb, clamp(alpha, 0.0, 1.0));
  }
`;

const OUTER_VERT = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

// Outer glow draws on the back-side of a slightly larger sphere so the
// silhouette halo is amplified without occluding the main shell.
const OUTER_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    float ndv = max(dot(normalize(vViewDir), normalize(vWorldNormal)), 0.0);
    float rim = 1.0 - ndv;
    rim = pow(rim, 1.5);
    gl_FragColor = vec4(uColor, rim * uOpacity);
  }
`;

export class HologramShellLayer {
  public readonly group: Group;
  private readonly shellGeom: SphereGeometry;
  private readonly shellMat: ShaderMaterial;
  // Outer glow is rebuilt when `spread` changes (geometry-baked radius);
  // everything else flows through uniforms.
  private outerGeom: SphereGeometry | null;
  private outerMat: ShaderMaterial | null;
  private outerMesh: Mesh | null;
  private outerEnabled: boolean;
  private outerSpread: number;
  // Cached construction-time defaults so the workshop's "reset" sentinels
  // (empty-string colors, 0 numerics) can restore the original look.
  private readonly defaultColor: string;
  private readonly defaultRimColor: string;
  private readonly defaultRimGlow: number;
  private readonly defaultRimWidth: number;
  private readonly defaultScanlineFreq: number;
  private readonly defaultScanlineSpeed: number;
  private readonly defaultScanlineOpacity: number;
  private readonly defaultOuterColor: string;
  private readonly defaultOuterOpacity: number;

  public constructor(options: HologramShellLayerOptions) {
    this.group = new Group();

    this.defaultColor = options.color;
    this.defaultRimColor = options.rimColor && options.rimColor !== '' ? options.rimColor : options.color;
    this.defaultRimGlow = options.rimGlow;
    this.defaultRimWidth = options.rimWidth ?? 2.0;
    this.defaultScanlineFreq = options.scanlineFreq;
    this.defaultScanlineSpeed = options.scanlineSpeed;
    this.defaultScanlineOpacity = options.scanlineOpacity ?? 0.4;
    this.defaultOuterColor =
      options.outerGlowColor && options.outerGlowColor !== ''
        ? options.outerGlowColor
        : options.color;
    this.defaultOuterOpacity = options.outerGlowOpacity;

    this.shellGeom = new SphereGeometry(SHELL_RADIUS, SHELL_SEGMENTS, SHELL_SEGMENTS);
    this.shellMat = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(options.color) },
        uTime: { value: 0 },
        uBaseAlpha: { value: options.shellOpacity },
        // Scanlines
        uScanlineFreq: { value: options.scanlineFreq },
        uScanlineSpeed: { value: options.scanlineSpeed },
        uScanlineOpacity: { value: options.scanlineOpacity ?? 0.4 },
        uScanlinesOn: { value: options.scanlinesEnabled ? 1 : 0 },
        uScanlineDir: { value: directionId(options.scanlineDirection) },
        // Rim
        uRimColor: { value: new Color(this.defaultRimColor) },
        uRimGlow: { value: options.rimGlow },
        uRimWidth: { value: options.rimWidth ?? 2.0 },
        uRimOn: { value: options.rimEnabled ? 1 : 0 },
        // Chromatic aberration
        uCaOn: { value: options.chromaticAberrationEnabled ? 1 : 0 },
        uCaAmount: { value: options.chromaticAberrationAmount ?? 0.45 },
        uCaRimOnly: { value: options.chromaticAberrationMode === 'global' ? 0 : 1 },
        // Noise
        uNoiseOn: { value: options.noiseEnabled ? 1 : 0 },
        uNoiseIntensity: { value: options.noiseIntensity ?? 0.18 },
        uNoiseScale: { value: options.noiseScale ?? 1.6 },
        uNoiseSpeed: { value: options.noiseSpeed ?? 22 },
        // Projector pulse
        uPulseOn: { value: options.projectorPulseEnabled ? 1 : 0 },
        uPulseSpeed: { value: options.projectorPulseSpeed ?? 0.35 },
        uPulseAmp: { value: options.projectorPulseAmplitude ?? 0.6 },
        uPulseColor: {
          value: new Color(
            options.projectorPulseColor && options.projectorPulseColor !== ''
              ? options.projectorPulseColor
              : options.color
          ),
        },
        // Data scan
        uScanOn: { value: options.dataScanEnabled ? 1 : 0 },
        uScanSpeed: { value: options.dataScanSpeed ?? 0.2 },
        uScanWidth: { value: options.dataScanWidth ?? 0.05 },
        uScanOpacity: { value: options.dataScanOpacity ?? 0.7 },
        uScanAxis: { value: dataScanAxisId(options.dataScanAxis) },
        uScanColor: {
          value: new Color(
            options.dataScanColor && options.dataScanColor !== '' ? options.dataScanColor : options.color
          ),
        },
        // Phase shimmer
        uShimmerOn: { value: options.phaseShimmerEnabled ? 1 : 0 },
        uShimmerScale: { value: options.phaseShimmerScale ?? 60 },
        uShimmerIntensity: { value: options.phaseShimmerIntensity ?? 0.12 },
        uShimmerSpeed: { value: options.phaseShimmerSpeed ?? 0.4 },
        // Calibration ticks
        uTicksOn: { value: options.calibrationTicksEnabled ? 1 : 0 },
        uTicksCount: { value: options.calibrationTicksCount ?? 36 },
        uTicksLength: { value: options.calibrationTicksLength ?? 0.04 },
        uTicksOpacity: { value: options.calibrationTicksOpacity ?? 0.9 },
      },
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: FrontSide,
    });
    const shellMesh = new Mesh(this.shellGeom, this.shellMat);
    shellMesh.renderOrder = 2;
    this.group.add(shellMesh);

    this.outerEnabled = options.outerGlowEnabled;
    this.outerSpread = options.outerGlowSpread && options.outerGlowSpread > 1
      ? options.outerGlowSpread
      : DEFAULT_OUTER_FACTOR;
    this.outerGeom = null;
    this.outerMat = null;
    this.outerMesh = null;
    if (this.outerEnabled) {
      this.buildOuter();
    }
  }

  private buildOuter(): void {
    if (this.outerMesh) {
      this.disposeOuter();
    }
    const radius = GLOBE_RADIUS * this.outerSpread;
    this.outerGeom = new SphereGeometry(radius, SHELL_SEGMENTS, SHELL_SEGMENTS);
    this.outerMat = new ShaderMaterial({
      uniforms: {
        uColor: { value: new Color(this.defaultOuterColor) },
        uOpacity: { value: this.defaultOuterOpacity },
      },
      vertexShader: OUTER_VERT,
      fragmentShader: OUTER_FRAG,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: BackSide,
    });
    this.outerMesh = new Mesh(this.outerGeom, this.outerMat);
    this.outerMesh.renderOrder = 1;
    this.group.add(this.outerMesh);
  }

  private disposeOuter(): void {
    if (this.outerMesh) this.group.remove(this.outerMesh);
    this.outerGeom?.dispose();
    this.outerMat?.dispose();
    this.outerGeom = null;
    this.outerMat = null;
    this.outerMesh = null;
  }

  public update(elapsedSeconds: number): void {
    this.shellMat.uniforms['uTime']!.value = elapsedSeconds;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.shellGeom.dispose();
    this.shellMat.dispose();
    this.disposeOuter();
    this.group.clear();
  }

  // -----------------------------------------------------------------
  // Live setters — flip uniform values in place. Cheap. Empty-string
  // color / 0 numeric inputs reset to construction-time defaults.
  // -----------------------------------------------------------------

  public setColor(color: string): void {
    if (color === '') {
      (this.shellMat.uniforms['uColor']!.value as Color).set(this.defaultColor);
      return;
    }
    (this.shellMat.uniforms['uColor']!.value as Color).set(color);
  }

  public setShellOpacity(opacity: number): void {
    this.shellMat.uniforms['uBaseAlpha']!.value = Math.max(0, opacity);
  }

  // ----- scanlines -----
  public setScanlinesEnabled(enabled: boolean): void {
    this.shellMat.uniforms['uScanlinesOn']!.value = enabled ? 1 : 0;
  }
  public setScanlineDensity(freq: number): void {
    this.shellMat.uniforms['uScanlineFreq']!.value =
      freq > 0 ? freq : this.defaultScanlineFreq;
  }
  public setScanlineSpeed(speed: number): void {
    this.shellMat.uniforms['uScanlineSpeed']!.value =
      speed > 0 ? speed : this.defaultScanlineSpeed;
  }
  public setScanlineOpacity(opacity: number): void {
    this.shellMat.uniforms['uScanlineOpacity']!.value = Math.max(
      0,
      Math.min(1, opacity)
    );
  }
  public setScanlineDirection(d: 'horizontal' | 'vertical' | 'diagonal'): void {
    this.shellMat.uniforms['uScanlineDir']!.value = directionId(d);
  }

  // ----- rim -----
  public setRimEnabled(enabled: boolean): void {
    this.shellMat.uniforms['uRimOn']!.value = enabled ? 1 : 0;
  }
  public setRimColor(color: string): void {
    if (color === '') {
      (this.shellMat.uniforms['uRimColor']!.value as Color).set(this.defaultRimColor);
      return;
    }
    (this.shellMat.uniforms['uRimColor']!.value as Color).set(color);
  }
  public setRimIntensity(intensity: number): void {
    this.shellMat.uniforms['uRimGlow']!.value =
      intensity > 0 ? intensity : this.defaultRimGlow;
  }
  public setRimWidth(width: number): void {
    this.shellMat.uniforms['uRimWidth']!.value =
      width > 0 ? width : this.defaultRimWidth;
  }

  // ----- outer glow (geometry rebuild on spread change) -----
  public setOuterGlowEnabled(enabled: boolean): void {
    if (enabled === this.outerEnabled) return;
    this.outerEnabled = enabled;
    if (enabled) this.buildOuter();
    else this.disposeOuter();
  }
  public setOuterGlowColor(color: string): void {
    if (!this.outerMat) return;
    if (color === '') {
      (this.outerMat.uniforms['uColor']!.value as Color).set(this.defaultOuterColor);
      return;
    }
    (this.outerMat.uniforms['uColor']!.value as Color).set(color);
  }
  public setOuterGlowIntensity(opacity: number): void {
    if (!this.outerMat) return;
    this.outerMat.uniforms['uOpacity']!.value =
      opacity > 0 ? opacity : this.defaultOuterOpacity;
  }
  public setOuterGlowSpread(spread: number): void {
    const next = spread > 1 ? spread : DEFAULT_OUTER_FACTOR;
    if (Math.abs(next - this.outerSpread) < 1e-6) return;
    this.outerSpread = next;
    if (this.outerEnabled) this.buildOuter();
  }

  // ----- chromatic aberration -----
  public setChromaticAberrationEnabled(enabled: boolean): void {
    this.shellMat.uniforms['uCaOn']!.value = enabled ? 1 : 0;
  }
  public setChromaticAberrationAmount(amount: number): void {
    this.shellMat.uniforms['uCaAmount']!.value = Math.max(0, amount);
  }
  public setChromaticAberrationMode(mode: 'rim' | 'global'): void {
    this.shellMat.uniforms['uCaRimOnly']!.value = mode === 'global' ? 0 : 1;
  }

  // ----- noise -----
  public setNoiseEnabled(enabled: boolean): void {
    this.shellMat.uniforms['uNoiseOn']!.value = enabled ? 1 : 0;
  }
  public setNoiseIntensity(value: number): void {
    this.shellMat.uniforms['uNoiseIntensity']!.value = Math.max(0, value);
  }
  public setNoiseScale(scale: number): void {
    this.shellMat.uniforms['uNoiseScale']!.value = Math.max(0.05, scale);
  }
  public setNoiseSpeed(speed: number): void {
    this.shellMat.uniforms['uNoiseSpeed']!.value = Math.max(0, speed);
  }

  // ----- projector pulse -----
  public setProjectorPulseEnabled(enabled: boolean): void {
    this.shellMat.uniforms['uPulseOn']!.value = enabled ? 1 : 0;
  }
  public setProjectorPulseSpeed(speed: number): void {
    this.shellMat.uniforms['uPulseSpeed']!.value = Math.max(0, speed);
  }
  public setProjectorPulseAmplitude(amp: number): void {
    this.shellMat.uniforms['uPulseAmp']!.value = Math.max(0, amp);
  }
  public setProjectorPulseColor(color: string): void {
    if (color === '') {
      (this.shellMat.uniforms['uPulseColor']!.value as Color).set(this.defaultColor);
      return;
    }
    (this.shellMat.uniforms['uPulseColor']!.value as Color).set(color);
  }

  // ----- data scan -----
  public setDataScanEnabled(enabled: boolean): void {
    this.shellMat.uniforms['uScanOn']!.value = enabled ? 1 : 0;
  }
  public setDataScanSpeed(speed: number): void {
    this.shellMat.uniforms['uScanSpeed']!.value = speed;
  }
  public setDataScanWidth(width: number): void {
    this.shellMat.uniforms['uScanWidth']!.value = Math.max(0.005, width);
  }
  public setDataScanOpacity(opacity: number): void {
    this.shellMat.uniforms['uScanOpacity']!.value = Math.max(0, opacity);
  }
  public setDataScanAxis(axis: 'horizontal' | 'vertical' | 'radial'): void {
    this.shellMat.uniforms['uScanAxis']!.value = dataScanAxisId(axis);
  }
  public setDataScanColor(color: string): void {
    if (color === '') {
      (this.shellMat.uniforms['uScanColor']!.value as Color).set(this.defaultColor);
      return;
    }
    (this.shellMat.uniforms['uScanColor']!.value as Color).set(color);
  }

  // ----- phase shimmer -----
  public setPhaseShimmerEnabled(enabled: boolean): void {
    this.shellMat.uniforms['uShimmerOn']!.value = enabled ? 1 : 0;
  }
  public setPhaseShimmerScale(scale: number): void {
    this.shellMat.uniforms['uShimmerScale']!.value = Math.max(1, scale);
  }
  public setPhaseShimmerIntensity(intensity: number): void {
    this.shellMat.uniforms['uShimmerIntensity']!.value = Math.max(0, intensity);
  }
  public setPhaseShimmerSpeed(speed: number): void {
    this.shellMat.uniforms['uShimmerSpeed']!.value = Math.max(0, speed);
  }

  // ----- calibration ticks -----
  public setCalibrationTicksEnabled(enabled: boolean): void {
    this.shellMat.uniforms['uTicksOn']!.value = enabled ? 1 : 0;
  }
  public setCalibrationTicksCount(count: number): void {
    this.shellMat.uniforms['uTicksCount']!.value = Math.max(1, Math.round(count));
  }
  public setCalibrationTicksLength(length: number): void {
    this.shellMat.uniforms['uTicksLength']!.value = Math.max(0, length);
  }
  public setCalibrationTicksOpacity(opacity: number): void {
    this.shellMat.uniforms['uTicksOpacity']!.value = Math.max(0, opacity);
  }
}
