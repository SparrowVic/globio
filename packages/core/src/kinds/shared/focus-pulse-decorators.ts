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
    setOptions(partial) {
      band.setOptions(partial);
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
 * Cinematic — broad warm shockwave with a lifted radius so it reads as a
 * luminous atmosphere ripple rather than a flat UI ring.
 */
export const buildCinematicFocusPulse = (
  opts: FocusPulseDecoratorBuildOptions
): FocusPulseDecorator =>
  makeBandDecorator(opts, {
    angularRadiusBase: 0.075,
    angularBand: 0.015,
    scaleMin: 0.32,
    scaleMax: 2.7,
    peakOpacity: 1.1,
    radiusFactor: 1.01,
  });
