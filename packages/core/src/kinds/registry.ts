import type { ThemePresetName } from '../theme/presets';
import { dottedKind } from './dotted';
import { outlineKind } from './outline';
import { wireframeKind } from './wireframe';
import type { GlobeKind, KindModule } from './types';

/**
 * Lookup table from kind id to its module. New kinds added here become
 * dispatchable from `globe.ts` without touching the dispatcher itself.
 */
export const KIND_MODULES: Readonly<Record<GlobeKind, KindModule>> = Object.freeze({
  outline: outlineKind,
  dotted: dottedKind,
  wireframe: wireframeKind,
});

/**
 * Default kind for each built-in preset. When the user picks a preset like
 * `'dotted-dark'` without setting `kind` explicitly, this map decides which
 * kind module to mount. Missing entries fall through to `'outline'`.
 */
export const PRESET_DEFAULT_KIND: Readonly<Record<ThemePresetName, GlobeKind>> = Object.freeze({
  'outline-dark': 'outline',
  'outline-light': 'outline',
  'outline-sunset': 'outline',
  'outline-cyber': 'outline',
  'outline-monochrome': 'outline',
  'dotted-dark': 'dotted',
  'wireframe-tron': 'wireframe',
});
