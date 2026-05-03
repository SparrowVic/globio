import { NormalBlending } from 'three';
import type { Group } from 'three';
import { FocusPulseBand } from './focus-pulse-band';
import type { FocusPulseDecorator } from '../types';
import type { LatLng } from '../../types';

export interface FocusPulseDecoratorBuildOptions {
  readonly globeGroup: Group;
  readonly enabled: boolean;
  readonly color: string;
  readonly durationSeconds: number;
  /**
   * Optional band-geometry overrides forwarded to `FocusPulseBand`. Each
   * kind's `build*FocusPulse` function still applies its own defaults
   * underneath; values passed here take precedence when defined.
   */
  readonly overrides?: {
    readonly angularRadiusBase?: number;
    readonly angularBand?: number;
    readonly scaleMin?: number;
    readonly scaleMax?: number;
    readonly peakOpacity?: number;
    readonly segments?: number;
    readonly radiusFactor?: number;
  };
}

/**
 * Build a focus-pulse decorator wrapping `FocusPulseBand` with kind-specific
 * defaults. Each kind tunes color/timing/blending; the band geometry stays
 * shared so all kinds get the same on-sphere curvature math.
 */
const makeBandDecorator = (
  opts: FocusPulseDecoratorBuildOptions,
  bandOverrides: Partial<{
    angularRadiusBase: number;
    angularBand: number;
    scaleMin: number;
    scaleMax: number;
    radiusFactor: number;
    peakOpacity: number;
    blending: typeof NormalBlending;
  }>
): FocusPulseDecorator => {
  if (!opts.enabled) {
    return {
      spawn: () => undefined,
      update: () => undefined,
      dispose: () => undefined,
    };
  }
  // Caller-supplied overrides win over the kind's defaults. Strip undefined
  // entries so `?? DEFAULT` paths inside FocusPulseBand still kick in for
  // values the caller didn't specify.
  const userOverrides = opts.overrides
    ? Object.fromEntries(
        Object.entries(opts.overrides).filter(([, value]) => value !== undefined),
      )
    : {};
  const band = new FocusPulseBand({
    color: opts.color,
    durationSeconds: opts.durationSeconds,
    ...bandOverrides,
    ...userOverrides,
  });
  opts.globeGroup.add(band.group);
  return {
    spawn(latLng: LatLng) {
      band.spawn(latLng);
    },
    update(delta: number) {
      band.update(delta);
    },
    dispose() {
      band.dispose();
      opts.globeGroup.remove(band.group);
    },
  };
};

/**
 * Outline — gold/white spherical band, additive blending. Crisp, classic.
 */
export const buildOutlineFocusPulse = (
  opts: FocusPulseDecoratorBuildOptions
): FocusPulseDecorator => makeBandDecorator(opts, {});

/**
 * Dotted — slightly faster, brighter cyan band; shorter trail to sit
 * comfortably alongside the dot grid without competing for attention.
 */
export const buildDottedFocusPulse = (
  opts: FocusPulseDecoratorBuildOptions
): FocusPulseDecorator =>
  makeBandDecorator(opts, {
    scaleMax: 2.0,
    angularBand: 0.011,
    peakOpacity: 0.95,
  });

/**
 * Wireframe — thinner band, faster expansion, full additive overdrive
 * for the Tron data-feed feel. Shorter angular base so it reads as a tight
 * "ping" rather than a sweeping wave.
 */
export const buildWireframeFocusPulse = (
  opts: FocusPulseDecoratorBuildOptions
): FocusPulseDecorator =>
  makeBandDecorator(opts, {
    angularRadiusBase: 0.05,
    angularBand: 0.009,
    scaleMax: 2.8,
    peakOpacity: 1.2,
  });

/**
 * Paper — warm-ink band with NormalBlending (no glow), slower expansion,
 * lower opacity. Reads like a gentle ripple in inkwell water spreading
 * across the parchment.
 */
export const buildPaperFocusPulse = (
  opts: FocusPulseDecoratorBuildOptions
): FocusPulseDecorator =>
  makeBandDecorator(opts, {
    angularBand: 0.02,
    scaleMax: 2.2,
    peakOpacity: 0.55,
    blending: NormalBlending,
  });

/**
 * Hologram — wider, brighter cyan band with thicker trail. The pulse
 * mirrors the shell's rim Fresnel feel — like the projector itself
 * reacted to the focus event.
 */
export const buildHologramFocusPulse = (
  opts: FocusPulseDecoratorBuildOptions
): FocusPulseDecorator =>
  makeBandDecorator(opts, {
    angularRadiusBase: 0.07,
    angularBand: 0.018,
    scaleMax: 2.6,
    peakOpacity: 1.4,
    radiusFactor: 1.012,
  });
