// CinematicWorld — the central reactive state machine for the cinematic
// kind. Once per frame it samples camera, time, interaction memory and
// the (slowly-recomputed) visible-city-energy aggregate, and writes the
// result into a shared `CinematicUniforms` block that every layer copies
// into its own ShaderMaterial uniforms map.
//
// The world owns four categories of state:
//
//   1. Configurable parameters (quality / reactivity / surface light /
//      terminator / sun colour / moonlight / cloud field / aurora) — set
//      by `setConfig`.
//   2. Per-frame derived state — camera distance, light + moon direction,
//      time, measured frame rate.
//   3. Decay-based state — interaction energy and a 3D "interaction
//      point" that fades over `interactionRadius` seconds. The point is
//      what gives the surface a localised lit echo near where the user
//      last clicked instead of a global, uniform flash.
//   4. The adaptive quality tier (only when `quality: 'auto'`): an FPS
//      moving average drives `uQuality` with hysteresis so shaders can
//      shed noise octaves and the post pipeline can halve its bloom
//      chain when the device struggles.
//
// Cross-layer coupling lives here. Adding a new globally-visible signal
// means: extend `CinematicUniforms`, set the value in `syncUniforms`,
// and every layer picks it up automatically.

import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type {
  CinematicConfig,
  CinematicQuality,
  CinematicReactivityConfig,
} from '../../types/kinds';
import { GLOBE_RADIUS, latLngToVector3 } from '../../utils/coordinates';
import type { LatLng } from '../../types';
import { clamp01 } from './math';
import {
  createCinematicUniforms,
  type CinematicUniforms,
} from './shader-uniforms';

export interface CinematicWorldOptions {
  readonly camera: PerspectiveCamera;
  readonly config?: CinematicConfig | null;
  readonly fallbackLightDirection: readonly [number, number, number];
}

export type CinematicQualityResolved = Exclude<CinematicQuality, 'auto'>;

/** Adaptive tier chosen by the FPS monitor when `quality: 'auto'`. */
export type CinematicQualityTier = 'ultra' | 'high' | 'balanced';

const DEFAULT_REACTIVITY: Required<CinematicReactivityConfig> = {
  lightInfluence: 1,
  cameraInfluence: 1,
  densityInfluence: 1,
  terminatorBoost: 1,
  horizonGlow: 1,
  atmosphericScatter: 1,
  surfaceMicroDetail: 1,
  cityNightResponse: 1,
  orbitalFlow: 1,
};

// Decay rate for the global interaction energy (1 / seconds). At 1.65
// the pulse fades to ~5 % in 1.8 s — long enough to read, short enough
// to feel "responsive" rather than "lingering".
const INTERACTION_DECAY_PER_SEC = 1.65;
// Spatial interaction reaches a usable maximum at ~3 s and is irrelevant
// past 6 s; we use the value below as the "saturation" age in shader land.
const INTERACTION_MAX_AGE_SECONDS = 6;
// Cloud shell height as a fraction of the globe radius (mirrors clouds.ts).
const DEFAULT_CLOUD_ALTITUDE = 0.009;

// Adaptive quality: exponential moving average of the frame rate plus
// dwell timers so a single hitch never flips the tier. Thresholds have a
// gap between "drop" and "raise" (hysteresis).
const FPS_EMA_ALPHA = 0.06;
const TIER_DROP_DWELL_SECONDS = 1.4;
const TIER_RAISE_DWELL_SECONDS = 3.5;
const TIER_SCALARS: Readonly<Record<CinematicQualityTier, number>> = {
  ultra: 1.15,
  high: 0.92,
  balanced: 0.7,
};

export class CinematicWorld {
  public readonly uniforms: CinematicUniforms;
  private readonly camera: PerspectiveCamera;
  private readonly fallbackLightDirection: readonly [number, number, number];
  private readonly light = new Vector3();
  private readonly moon = new Vector3();
  private readonly tmpDir = new Vector3();
  private quality: CinematicQuality;
  private reactivity: Required<CinematicReactivityConfig>;
  private interactionEnergy = 0;
  private interactionAge = INTERACTION_MAX_AGE_SECONDS + 1;
  private terminatorSoftness: number;
  private terminatorContrast: number;
  private exposure: number;
  private moonlight = 1;
  private cloudsEnabled = true;
  private cloudShadowsEnabled = true;
  private cloudShadowStrength = 0.45;
  // Adaptive quality bookkeeping (only consulted when quality === 'auto').
  private fpsEma = 60;
  private tier: CinematicQualityTier = 'ultra';
  private tierDropClock = 0;
  private tierRaiseClock = 0;
  private tierListener: ((tier: CinematicQualityTier) => void) | null = null;

  public constructor(options: CinematicWorldOptions) {
    this.camera = options.camera;
    this.fallbackLightDirection = options.fallbackLightDirection;
    this.uniforms = createCinematicUniforms();
    this.quality = options.config?.quality ?? 'auto';
    this.reactivity = resolveReactivity(options.config?.reactivity);
    this.terminatorSoftness =
      options.config?.surface?.terminatorSoftness ?? this.uniforms.uTerminatorSoftness.value;
    this.terminatorContrast =
      options.config?.surface?.terminatorContrast ?? this.uniforms.uTerminatorContrast.value;
    this.exposure = 1.05;
    this.setLightDirection(options.config?.surface?.lightDirection);
    if (options.config) this.applyLookConfig(options.config);
    this.syncUniforms(0, 0);
  }

  public update(delta: number, elapsedSeconds: number): void {
    this.interactionEnergy = Math.max(0, this.interactionEnergy - delta * INTERACTION_DECAY_PER_SEC);
    this.interactionAge = Math.min(INTERACTION_MAX_AGE_SECONDS + 1, this.interactionAge + delta);
    this.trackFrameRate(delta);
    this.syncUniforms(delta, elapsedSeconds);
  }

  public setConfig(config: CinematicConfig): void {
    if (config.quality !== undefined) {
      this.quality = config.quality;
      if (config.quality !== 'auto') {
        this.tierDropClock = 0;
        this.tierRaiseClock = 0;
      }
    }
    if (config.reactivity !== undefined) this.reactivity = resolveReactivity(config.reactivity);
    if (config.surface?.lightDirection !== undefined) {
      this.setLightDirection(config.surface.lightDirection);
    }
    if (config.surface?.terminatorSoftness !== undefined && config.surface.terminatorSoftness > 0) {
      this.terminatorSoftness = config.surface.terminatorSoftness;
    }
    if (config.surface?.terminatorContrast !== undefined && config.surface.terminatorContrast > 0) {
      this.terminatorContrast = config.surface.terminatorContrast;
    }
    this.applyLookConfig(config);
    this.syncUniforms(0, this.uniforms.uTime.value);
  }

  /**
   * Sun colour, moonlight, cloud field and aurora parameters live on the
   * shared uniform block so the surface, cloud shell and atmosphere read
   * identical values. Sentinels: `''` colour keeps the current value,
   * non-positive numbers where the domain is positive keep the current
   * value.
   */
  private applyLookConfig(config: CinematicConfig): void {
    const u = this.uniforms;
    if (config.sun?.color !== undefined && config.sun.color !== '') {
      u.uSunColor.value.set(config.sun.color);
    }
    if (config.surface?.moonlight !== undefined && config.surface.moonlight >= 0) {
      this.moonlight = config.surface.moonlight;
    }
    const clouds = config.clouds;
    if (clouds !== undefined) {
      if (clouds.coverage !== undefined && clouds.coverage >= 0) {
        u.uCloudCoverage.value = clamp01(clouds.coverage);
      }
      if (clouds.speed !== undefined && clouds.speed >= 0) u.uCloudSpeed.value = clouds.speed;
      if (clouds.softness !== undefined && clouds.softness >= 0) {
        u.uCloudSoftness.value = clamp01(clouds.softness);
      }
      // Non-positive altitude = default; keep the shadow offset in lockstep
      // with the cloud shell (which resets its geometry the same way).
      if (clouds.altitude !== undefined) {
        u.uCloudAltitude.value = clouds.altitude > 0 ? clouds.altitude : DEFAULT_CLOUD_ALTITUDE;
      }
      // Shadow strength is remembered separately from the uniform so that
      // toggling shadows (or the whole shell) off and on restores the
      // configured value instead of a hard-coded default.
      if (clouds.shadowStrength !== undefined && clouds.shadowStrength >= 0) {
        this.cloudShadowStrength = clamp01(clouds.shadowStrength);
      }
      if (clouds.shadows !== undefined) this.cloudShadowsEnabled = clouds.shadows;
      if (clouds.enabled !== undefined) this.cloudsEnabled = clouds.enabled;
      u.uCloudShadowStrength.value =
        this.cloudShadowsEnabled && this.cloudsEnabled ? this.cloudShadowStrength : 0;
    }
    const aurora = config.aurora;
    if (aurora !== undefined) {
      const enabled = aurora.enabled ?? true;
      if (aurora.intensity !== undefined && aurora.intensity >= 0) {
        u.uAuroraIntensity.value = enabled ? aurora.intensity : 0;
      } else if (!enabled) {
        u.uAuroraIntensity.value = 0;
      }
      if (aurora.speed !== undefined && aurora.speed >= 0) u.uAuroraSpeed.value = aurora.speed;
      if (aurora.latitude !== undefined && aurora.latitude > 0) {
        u.uAuroraLatitude.value = (Math.min(85, aurora.latitude) * Math.PI) / 180;
      }
      if (aurora.color !== undefined && aurora.color !== '') u.uAuroraColor.value.set(aurora.color);
      if (aurora.colorTop !== undefined && aurora.colorTop !== '') {
        u.uAuroraTopColor.value.set(aurora.colorTop);
      }
    }
  }

  public setLightDirection(direction?: readonly [number, number, number]): void {
    const next = direction ?? this.fallbackLightDirection;
    this.light.set(next[0], next[1], next[2]);
    if (this.light.lengthSq() < 1e-6) this.light.set(-0.62, 0.55, 0.55);
    this.light.normalize();
    this.uniforms.uLightDirection.value.copy(this.light);
    this.updateMoonDirection();
  }

  /** World-space unit vector toward the sun (the shared light). */
  public getLightDirection(): Vector3 {
    return this.light;
  }

  public setExposure(exposure: number): void {
    this.exposure = Math.max(0.2, Math.min(2.4, exposure));
    this.uniforms.uExposure.value = this.exposure;
  }

  public setMoonColor(color: string): void {
    if (color !== '') this.uniforms.uMoonColor.value.set(color);
  }

  public setAuroraColors(color: string, top: string): void {
    if (color !== '') this.uniforms.uAuroraColor.value.set(color);
    if (top !== '') this.uniforms.uAuroraTopColor.value.set(top);
  }

  /**
   * Bump the global interaction energy. Used by hover/click handlers in
   * the kind index to flash the rim and the terminator slightly.
   */
  public pulseInteraction(amount = 1): void {
    this.interactionEnergy = Math.max(this.interactionEnergy, clamp01(amount));
  }

  /**
   * Record where on the globe the user just touched. Subsequent shader
   * passes use `uInteractionPoint` + `uInteractionAge` to bloom that
   * specific region. Pass `null` to dissociate the point.
   */
  public registerInteractionPoint(point: Vector3 | LatLng | null): void {
    if (point === null) {
      this.interactionAge = INTERACTION_MAX_AGE_SECONDS + 1;
      return;
    }
    if (Array.isArray(point)) {
      latLngToVector3([point[0], point[1]], GLOBE_RADIUS, this.uniforms.uInteractionPoint.value);
    } else {
      this.uniforms.uInteractionPoint.value.copy(point as Vector3).setLength(GLOBE_RADIUS);
    }
    this.interactionAge = 0;
  }

  /**
   * Apply the most recent visible-city-energy aggregate. Computing this
   * on every frame is wasteful — the cinematic kind index calls this at
   * roughly 6 Hz from a slow tick.
   */
  public setVisibleCityEnergy(value: number): void {
    this.uniforms.uVisibleCityEnergy.value = clamp01(value * 1.2);
  }

  /** Current adaptive tier (meaningful for `quality: 'auto'`; else derived from the mode). */
  public getQualityTier(): CinematicQualityTier {
    if (this.quality === 'auto') return this.tier;
    return this.quality;
  }

  /** Smoothed frames-per-second estimate. */
  public getFps(): number {
    return this.fpsEma;
  }

  /** Subscribe to adaptive tier changes (post pipeline resolution, cloud shadows…). */
  public onQualityTier(listener: ((tier: CinematicQualityTier) => void) | null): void {
    this.tierListener = listener;
  }

  private trackFrameRate(delta: number): void {
    if (delta <= 0 || delta > 1) return;
    const fps = 1 / delta;
    this.fpsEma += (fps - this.fpsEma) * FPS_EMA_ALPHA;
    if (this.quality !== 'auto') return;
    const next = this.pickTier();
    if (next === this.tier) {
      this.tierDropClock = 0;
      this.tierRaiseClock = 0;
      return;
    }
    const lowering = TIER_SCALARS[next] < TIER_SCALARS[this.tier];
    if (lowering) {
      this.tierDropClock += delta;
      this.tierRaiseClock = 0;
      if (this.tierDropClock < TIER_DROP_DWELL_SECONDS) return;
    } else {
      this.tierRaiseClock += delta;
      this.tierDropClock = 0;
      if (this.tierRaiseClock < TIER_RAISE_DWELL_SECONDS) return;
    }
    this.tier = next;
    this.tierDropClock = 0;
    this.tierRaiseClock = 0;
    this.tierListener?.(next);
  }

  private pickTier(): CinematicQualityTier {
    const fps = this.fpsEma;
    // Hysteresis: the thresholds to fall are lower than the thresholds
    // to climb, so the tier never oscillates on a borderline device.
    if (this.tier === 'ultra') {
      if (fps < 36) return 'balanced';
      if (fps < 50) return 'high';
      return 'ultra';
    }
    if (this.tier === 'high') {
      if (fps < 34) return 'balanced';
      if (fps > 57) return 'ultra';
      return 'high';
    }
    if (fps > 52) return 'high';
    return 'balanced';
  }

  private updateMoonDirection(): void {
    // The moon sits roughly opposite the sun, nudged off the anti-solar
    // axis so night-side surfaces get a raking cool fill instead of a
    // flat one, and so the ocean moon-glint lands away from the centre.
    this.moon
      .copy(this.light)
      .multiplyScalar(-1)
      .add(this.tmpDir.set(0.32, 0.5, -0.18))
      .normalize();
    this.uniforms.uMoonDirection.value.copy(this.moon);
  }

  private syncUniforms(_delta: number, elapsedSeconds: number): void {
    this.uniforms.uTime.value = elapsedSeconds;
    this.uniforms.uLightDirection.value.copy(this.light);
    this.uniforms.uMoonDirection.value.copy(this.moon);
    this.uniforms.uCameraDistance.value = this.camera.position.length();
    this.tmpDir.copy(this.camera.position).normalize();
    this.uniforms.uCameraDirection.value.copy(this.tmpDir);

    this.uniforms.uLightInfluence.value = this.reactivity.lightInfluence;
    this.uniforms.uCameraInfluence.value = this.reactivity.cameraInfluence;
    this.uniforms.uDensityInfluence.value = this.reactivity.densityInfluence;
    this.uniforms.uTerminatorBoost.value = this.reactivity.terminatorBoost;
    this.uniforms.uHorizonGlow.value = this.reactivity.horizonGlow;
    this.uniforms.uAtmosphericScatter.value = this.reactivity.atmosphericScatter;
    this.uniforms.uSurfaceMicroDetail.value = this.reactivity.surfaceMicroDetail;
    this.uniforms.uCityNightResponse.value = this.reactivity.cityNightResponse;
    this.uniforms.uOrbitalFlow.value = this.reactivity.orbitalFlow;

    this.uniforms.uInteractionEnergy.value = this.interactionEnergy;
    this.uniforms.uInteractionAge.value = this.interactionAge;
    // Dataset-driven energy already lives on the uniform from setVisibleCityEnergy.

    this.uniforms.uTerminatorSoftness.value = this.terminatorSoftness;
    this.uniforms.uTerminatorContrast.value = this.terminatorContrast;

    this.uniforms.uQuality.value = qualityToScalar(this.getQualityTier());
    this.uniforms.uExposure.value = this.exposure;
    this.uniforms.uMoonlight.value = this.moonlight;
  }
}

const resolveReactivity = (
  input: CinematicReactivityConfig | undefined,
): Required<CinematicReactivityConfig> => {
  const pick = (key: keyof CinematicReactivityConfig): number =>
    input?.[key] !== undefined && (input[key] as number) >= 0
      ? (input[key] as number)
      : DEFAULT_REACTIVITY[key];
  return {
    lightInfluence: pick('lightInfluence'),
    cameraInfluence: pick('cameraInfluence'),
    densityInfluence: pick('densityInfluence'),
    terminatorBoost: pick('terminatorBoost'),
    horizonGlow: pick('horizonGlow'),
    atmosphericScatter: pick('atmosphericScatter'),
    surfaceMicroDetail: pick('surfaceMicroDetail'),
    cityNightResponse: pick('cityNightResponse'),
    orbitalFlow: pick('orbitalFlow'),
  };
};

const qualityToScalar = (tier: CinematicQualityTier): number => TIER_SCALARS[tier];
