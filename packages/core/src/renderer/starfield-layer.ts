/**
 * Compatibility re-export. The starfield implementation lives in
 * `kinds/shared/starfield-layer.ts` — one base class that every kind's
 * `<Kind>StarfieldLayer` extends — but `globe/create-globe.ts` still types
 * its starfield slot against this path.
 */
export { StarfieldLayer } from '../kinds/shared/starfield-layer';
export type {
  StarfieldLayerOptions,
  StarfieldTwinkleOptions,
} from '../kinds/shared/starfield-layer';
