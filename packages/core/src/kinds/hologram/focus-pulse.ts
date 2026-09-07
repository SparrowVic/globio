import type { Group } from 'three';
import { FocusPulseBand } from '../shared/focus-pulse-band';
import type { FocusPulseDecorator } from '../types';

export interface HologramFocusPulseBuildOptions {
  readonly globeGroup: Group;
  readonly color: string;
  readonly durationSeconds: number;
  readonly overrides?: FocusPulseOverrides;
}

export type FocusPulseOverrides = {
  readonly angularRadiusBase?: number;
  readonly angularBand?: number;
  readonly scaleMin?: number;
  readonly scaleMax?: number;
  readonly peakOpacity?: number;
  readonly segments?: number;
  readonly radiusFactor?: number;
};

type FocusPulseOptions = Parameters<FocusPulseBand['setOptions']>[0];

const HOLOGRAM_PULSE_DEFAULTS = {
  angularRadiusBase: 0.07,
  angularBand: 0.018,
  scaleMax: 2.6,
  peakOpacity: 1.4,
  radiusFactor: 1.012,
} satisfies FocusPulseOverrides;

/**
 * Hologram-native focus pulse decorator. Unlike the outline pulse's single
 * sonar band, hologram fires a bright projection ring plus a wider, slower
 * echo ring above the shell. Both bands share the same live API so workshop
 * knobs update in place without rebuilding the globe.
 */
export const buildHologramFocusPulse = (
  options: HologramFocusPulseBuildOptions,
): FocusPulseDecorator => {
  const base = {
    ...HOLOGRAM_PULSE_DEFAULTS,
    ...withoutUndefined(options.overrides),
  };
  const primary = new FocusPulseBand({
    color: options.color,
    durationSeconds: options.durationSeconds,
    ...base,
  });
  const echo = new FocusPulseBand({
    color: options.color,
    durationSeconds: options.durationSeconds * 1.32,
    ...echoOptions(base),
  });
  options.globeGroup.add(primary.group, echo.group);

  return {
    spawn(latLng) {
      primary.spawn(latLng);
      echo.spawn(latLng);
    },
    update(delta) {
      primary.update(delta);
      echo.update(delta);
    },
    setOptions(partial) {
      primary.setOptions(partial);
      echo.setOptions(echoOptions(partial));
    },
    dispose() {
      primary.dispose();
      echo.dispose();
      options.globeGroup.remove(primary.group, echo.group);
    },
  };
};

const withoutUndefined = <T extends object>(value: T | undefined): Partial<T> => {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
};

const echoOptions = (partial: FocusPulseOptions): FocusPulseOptions => ({
  ...partial,
  ...(partial.durationSeconds !== undefined && {
    durationSeconds: partial.durationSeconds * 1.32,
  }),
  ...(partial.angularRadiusBase !== undefined && {
    angularRadiusBase: partial.angularRadiusBase * 0.55,
  }),
  ...(partial.angularBand !== undefined && { angularBand: partial.angularBand * 0.58 }),
  ...(partial.scaleMax !== undefined && { scaleMax: partial.scaleMax * 1.18 }),
  ...(partial.peakOpacity !== undefined && { peakOpacity: partial.peakOpacity * 0.38 }),
  ...(partial.radiusFactor !== undefined && { radiusFactor: partial.radiusFactor + 0.006 }),
});
