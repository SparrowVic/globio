import { NormalBlending, type Group } from 'three';
import { FocusPulseBand } from '../shared/focus-pulse-band';
import type { FocusPulseDecorator } from '../types';

export interface PaperFocusPulseBuildOptions {
  readonly globeGroup: Group;
  readonly color: string;
  readonly durationSeconds: number;
  readonly overrides?: PaperFocusPulseOverrides;
}

export type PaperFocusPulseOverrides = {
  readonly angularRadiusBase?: number;
  readonly angularBand?: number;
  readonly scaleMin?: number;
  readonly scaleMax?: number;
  readonly peakOpacity?: number;
  readonly segments?: number;
  readonly radiusFactor?: number;
};

type FocusPulseOptions = Parameters<FocusPulseBand['setOptions']>[0];

const PAPER_PULSE_DEFAULTS = {
  angularRadiusBase: 0.065,
  angularBand: 0.022,
  scaleMin: 0.28,
  scaleMax: 2.35,
  peakOpacity: 0.62,
  radiusFactor: 1.006,
  segments: 112,
} satisfies PaperFocusPulseOverrides;

/**
 * Paper-native focus pulse: a crisp ink contour plus a broader transparent
 * watercolor stain that trails behind it. The effect is deliberately
 * non-additive so it feels printed into the parchment rather than projected
 * above it.
 */
export const buildPaperFocusPulse = (
  options: PaperFocusPulseBuildOptions,
): FocusPulseDecorator => {
  const base = {
    ...PAPER_PULSE_DEFAULTS,
    ...withoutUndefined(options.overrides),
  };
  const ink = new FocusPulseBand({
    color: options.color,
    durationSeconds: options.durationSeconds,
    blending: NormalBlending,
    ...base,
  });
  const wash = new FocusPulseBand({
    color: options.color,
    durationSeconds: options.durationSeconds * 1.18,
    blending: NormalBlending,
    ...washOptions(base),
  });
  options.globeGroup.add(wash.group, ink.group);

  return {
    spawn(latLng) {
      wash.spawn(latLng);
      ink.spawn(latLng);
    },
    update(delta) {
      wash.update(delta);
      ink.update(delta);
    },
    setOptions(partial) {
      ink.setOptions(partial);
      wash.setOptions(washOptions(partial));
    },
    dispose() {
      wash.dispose();
      ink.dispose();
      options.globeGroup.remove(wash.group, ink.group);
    },
  };
};

const washOptions = (partial: FocusPulseOptions): FocusPulseOptions => ({
  ...partial,
  ...(partial.durationSeconds !== undefined && {
    durationSeconds: partial.durationSeconds * 1.18,
  }),
  ...(partial.angularRadiusBase !== undefined && {
    angularRadiusBase: partial.angularRadiusBase * 0.78,
  }),
  ...(partial.angularBand !== undefined && { angularBand: partial.angularBand * 2.35 }),
  ...(partial.scaleMin !== undefined && { scaleMin: partial.scaleMin * 0.75 }),
  ...(partial.scaleMax !== undefined && { scaleMax: partial.scaleMax * 1.18 }),
  ...(partial.peakOpacity !== undefined && { peakOpacity: partial.peakOpacity * 0.32 }),
  ...(partial.radiusFactor !== undefined && {
    radiusFactor: Math.max(1.0005, partial.radiusFactor - 0.001),
  }),
});

const withoutUndefined = <T extends object>(value: T | undefined): Partial<T> => {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
};
