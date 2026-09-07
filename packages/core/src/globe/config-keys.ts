import type { GlobeConfig } from '../types';

/** Everything a caller can pass to `createGlobe()` except the container. */
export type GlobeConfigInput = Omit<GlobeConfig, 'container'>;

/**
 * Every `GlobeConfig` key except `container`, in declaration order. The
 * framework wrappers iterate this list to forward their props, and the
 * type check below fails the build when a key is added to `GlobeConfig`
 * without being added here.
 */
export const GLOBE_CONFIG_KEYS = [
  'mode',
  'kind',
  'theme',
  'countries',
  'countryLabels',
  'countryData',
  'markers',
  'htmlMarkers',
  'arcs',
  'atmosphere',
  'focusPulse',
  'outline',
  'cinematic',
  'dotted',
  'wireframe',
  'paper',
  'hologram',
  'starfield',
  'postprocessing',
  'axisTilt',
  'autoRotate',
  'performance',
  'initialPosition',
  'minZoom',
  'maxZoom',
  'zoom',
  'transparent',
  'framing',
] as const satisfies ReadonlyArray<keyof GlobeConfigInput>;

export type GlobeConfigKey = (typeof GLOBE_CONFIG_KEYS)[number];

type MissingKeys = Exclude<keyof GlobeConfigInput, GlobeConfigKey>;
type AssertNever<T extends never> = T;
// Compile-time guard: adding a key to `GlobeConfig` without listing it above is an error.
export type _GlobeConfigKeysAreComplete = AssertNever<MissingKeys>;

/**
 * Copy the defined config keys off an arbitrary props object. Undefined
 * values are skipped so `update()` receives only the keys that changed.
 */
export const pickGlobeConfig = (source: Readonly<Record<string, unknown>>): GlobeConfigInput => {
  const config: Record<string, unknown> = {};
  for (const key of GLOBE_CONFIG_KEYS) {
    const value = source[key];
    if (value !== undefined) config[key] = value;
  }
  return config as GlobeConfigInput;
};
